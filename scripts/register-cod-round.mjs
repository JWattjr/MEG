// Operator utility. Input must describe a verified, upcoming real BO5 fixture.
import { readFileSync } from "node:fs";
import { createAccount, createClient } from "../web/node_modules/genlayer-js/dist/index.js";
import { studioDevnet } from "../web/node_modules/genlayer-js/dist/chains/index.js";
import { CalldataAddress, ExecutionResult } from "../web/node_modules/genlayer-js/dist/types/index.js";

const specPath = process.argv[2];
if (!specPath || !process.env.GENLAYER_PRIVATE_KEY) throw new Error("Usage: GENLAYER_PRIVATE_KEY set locally, node scripts/register-cod-round.mjs fixture.json");
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const account = createAccount(process.env.GENLAYER_PRIVATE_KEY);
const client = createClient({ chain: studioDevnet, account });
const address = (value) => {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error('Invalid contract address.');
  return new CalldataAddress(Buffer.from(value.slice(2), 'hex'));
};
address(spec.game); address(spec.resolver);
if (Number(await client.request({ method: 'eth_chainId' })) !== 61997) throw new Error('Expected Studio Next chain 61997.');
const game = await client.readContract({ address: spec.game, functionName: 'get_protocol_balances', args: [] });
if (game.owner.toLowerCase() !== account.address.toLowerCase()) throw new Error('The signing account does not own this game.');
if (await client.readContract({ address: spec.resolver, functionName: 'get_version', args: [] }) !== 'cod-bo5-v1') throw new Error('Unexpected resolver rules.');
const dates = ['lock_at', 'kickoff_at', 'resolve_not_before', 'resolve_deadline', 'refund_at'].map((key) => {
  const value = spec[key];
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().replace('.000Z', 'Z') !== value) throw new Error(`Invalid ${key}.`);
  return Date.parse(value);
});
if (!(Date.now() < dates[0] && dates[0] < dates[1] && dates[1] <= dates[2] && dates[2] < dates[3] && dates[3] <= dates[4])) throw new Error('Fixture timing is not a future, ordered evidence/refund window.');
if (spec.metadata.match_date !== spec.kickoff_at.slice(0, 10) || spec.metadata.format_name !== 'BEST_OF_5') throw new Error('Fixture date or BO5 format mismatch.');
const required = ['match_id', 'team_a', 'team_b', 'player_a', 'player_b', 'competition'];
for (const key of required) if (typeof spec.metadata[key] !== 'string' || !spec.metadata[key].trim()) throw new Error(`Missing ${key}.`);
if (!Array.isArray(spec.metadata.source_urls) || spec.metadata.source_urls.length < 2) throw new Error('Two approved publishers are required.');
const publishers = spec.metadata.source_urls.map((value) => { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid evidence URL.'); return url.hostname.replace(/^www\./, ''); });
if (new Set(publishers).size !== publishers.length || publishers.some((host) => !['callofdutyleague.com', 'breakingpoint.gg', 'liquipedia.net'].includes(host))) throw new Error('Sources require distinct approved publishers.');
if (spec.verified !== true) throw new Error('Confirm the fixture identity and schedule against the source pages, then set verified: true.');
const submit = async (target, functionName, args) => {
  const fee = await client.estimateTransactionFees();
  if (fee.feeValue > 200000000000000000n) throw new Error('Fee deposit exceeds 0.2 test GEN.');
  const hash = await client.writeContract({ address: target, functionName, args, value: 0n, fees: { distribution: fee.distribution, feeValue: fee.feeValue } });
  console.log(functionName, hash);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: 'finalized', interval: 3000, retries: 240 });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN && receipt.consensus_data?.leader_receipt?.[0]?.execution_result !== 'SUCCESS') throw new Error(`${functionName} failed.`);
};
const record = await client.readContract({ address: spec.resolver, functionName: 'get_round_resolution', args: [spec.resolution_id] });
if (!record.resolution_id) await submit(spec.resolver, 'register_round', [spec.resolution_id, JSON.stringify(spec.metadata), address(spec.game), spec.round_id, spec.resolve_not_before, spec.resolve_deadline]);
else if (record.settlement_target.toLowerCase() !== spec.game.toLowerCase() || record.settlement_round_id !== spec.round_id || record.match_id !== spec.metadata.match_id || required.some((key) => record[key] !== spec.metadata[key]) || JSON.stringify(record.source_urls) !== JSON.stringify(spec.metadata.source_urls) || record.resolve_not_before !== spec.resolve_not_before || record.resolve_deadline !== spec.resolve_deadline) throw new Error('Existing resolver registration differs from the fixture specification.');
const round = await client.readContract({ address: spec.game, functionName: 'get_round', args: [spec.round_id] });
if (!round.round_id) await submit(spec.game, 'create_round', [spec.round_id, spec.metadata.match_id, address(spec.resolver), spec.resolution_id, spec.lock_at, spec.kickoff_at, spec.resolve_not_before, spec.refund_at, 1000000000000000000n, 2, 2000000000000000000n, 2]);
else if (round.resolver_address.toLowerCase() !== spec.resolver.toLowerCase() || round.resolver_resolution_id !== spec.resolution_id || round.match_id !== spec.metadata.match_id || ['lock_at', 'kickoff_at', 'resolve_not_before', 'refund_at'].some((key) => round[key] !== spec[key])) throw new Error('Existing game round differs from the fixture specification.');
console.log('Registered fixture:', spec.round_id, '/?round=' + encodeURIComponent(spec.round_id));
