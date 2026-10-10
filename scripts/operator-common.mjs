import { createAccount, createClient } from '../web/node_modules/genlayer-js/dist/index.js';
import { studioDevnet } from '../web/node_modules/genlayer-js/dist/chains/index.js';
import { CalldataAddress, ExecutionResult, TransactionStatus } from '../web/node_modules/genlayer-js/dist/types/index.js';
import { pathToFileURL } from 'node:url';

export const NETWORK = Object.freeze({
  chainId: 61997, rpc: 'https://studio-dev.genlayer.com/api',
  game: '0x3Dc2e4Bc192f0C39bA3930BB584342906d30e75a',
  valorant: '0x54EfF381f3DE7809653ddbaCdCF40f1f6bcF4d97',
  cod: '0x03dfc444cb9963D59B146b94e8a062f3B0D498D5',
  leagues: '0x5E1f8CdDab9c0301E3C4a05988d9e29723d0d8d4',
});
export class OperatorError extends Error {}
export function requireThat(condition, message) {
  if (!condition) throw new OperatorError(message);
}
export const json = (value) => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2);
export function publicAddress(value) {
  requireThat(typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value), 'Invalid or zero public address.');
  return value.toLowerCase();
}
export const address = (value) => new CalldataAddress(Buffer.from(publicAddress(value).slice(2), 'hex'));
export function timestamp(value, label) {
  requireThat(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z', 'Z') === value, `Invalid UTC ${label}.`);
  return Date.parse(value);
}
export function identifier(value, label) {
  requireThat(typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,159}$/.test(value), `Invalid ${label}.`);
  return value;
}
export function argumentsFor(argv, positionalCount, allowedOptions = []) {
  const positional = [];
  const options = { dryRun: false };
  for (let index = 0; index < argv.length; index++) {
    const item = argv[index];
    if (item === '--dry-run') options.dryRun = true;
    else if (allowedOptions.includes(item)) {
      requireThat(index + 1 < argv.length && !argv[index + 1].startsWith('--'), `Missing value for ${item}.`);
      options[item.slice(2)] = argv[++index];
    } else {
      requireThat(!item.startsWith('--'), 'Unknown option.');
      positional.push(item);
    }
  }
  requireThat(positional.length === positionalCount, `Expected ${positionalCount} positional arguments; see docs/LIVE_USAGE_RUNBOOK.md.`);
  return { positional, ...options };
}
export function readClient() {
  // No account and no key access in any dry-run.
  return createClient({ chain: studioDevnet, endpoint: NETWORK.rpc });
}
export function signingClient(variable = 'GENLAYER_PRIVATE_KEY') {
  const secret = process.env[variable];
  requireThat(typeof secret === 'string' && /^0x[0-9a-fA-F]{64}$/.test(secret), `Set ${variable} in your local process environment; never paste it into output or files.`);
  // Never propagate an SDK account-construction error containing its input.
  let account;
  try { account = createAccount(secret); } catch { throw new OperatorError('Invalid local signing account.'); }
  return { client: createClient({ chain: studioDevnet, endpoint: NETWORK.rpc, account }), wallet: account.address.toLowerCase() };
}
export async function checkChain(client) {
  requireThat(Number(await client.request({ method: 'eth_chainId' })) === NETWORK.chainId, 'Expected Studio Next chain 61997.');
}
export const read = (client, target, functionName, args = []) => client.readContract({ address: target, functionName, args });
export function checkFinalized(receipt) {
  requireThat((receipt.statusName ?? receipt.status) === TransactionStatus.FINALIZED, 'Transaction is not FINALIZED; do not record it as successful.');
  const result = receipt.txExecutionResultName;
  // Prefer the train execution result. A legacy success cannot override a failure.
  requireThat(result ? result === ExecutionResult.FINISHED_WITH_RETURN
    : receipt.consensus_data?.leader_receipt?.[0]?.execution_result === 'SUCCESS', 'Finalized transaction did not execute successfully.');
}
export async function submit(client, target, functionName, args) {
  await checkChain(client);
  const fee = await client.estimateTransactionFees();
  requireThat(typeof fee.feeValue === 'bigint' && fee.feeValue >= 0n && fee.feeValue <= 200000000000000000n, 'Fee deposit is invalid or exceeds 0.2 test GEN.');
  const hash = await client.writeContract({ address: target, functionName, args, value: 0n, fees: { distribution: fee.distribution, feeValue: fee.feeValue } });
  // Public hash helps recover a timeout without blindly sending a duplicate.
  console.log('Submitted (not yet evidence):', functionName, hash);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: 'finalized', interval: 3000, retries: 240 });
  checkFinalized(receipt);
  console.log('FINALIZED + SUCCESS:', functionName, hash);
  console.log(`https://explorer-studio-dev.genlayer.com/tx/${hash}`);
  return hash;
}
export function cli(metaUrl, main) {
  if (process.argv[1] && metaUrl === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
      // Do not print raw SDK errors, stacks, account objects or environment.
      console.error(error instanceof OperatorError ? error.message : 'RPC/SDK or input-file operation failed. No secrets were printed. Check the public transaction hash before retrying.');
      process.exitCode = 1;
    });
  }
}
