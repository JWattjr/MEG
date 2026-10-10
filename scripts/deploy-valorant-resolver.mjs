import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NETWORK, argumentsFor, checkChain, checkFinalized, cli, json, publicAddress, read, readClient, requireThat, signingClient } from './operator-common.mjs';

export const VALORANT_VERSION = 'valorant-bo3-v2';
const sourceFile = new URL('../contracts/valorant_match_resolver.py', import.meta.url);
export const sourceSha256 = (source) => createHash('sha256').update(source).digest('hex');
export function newResolverAddress(value) {
  const target = publicAddress(value);
  requireThat(![NETWORK.game, NETWORK.valorant, NETWORK.cod, NETWORK.leagues].some((existing) => publicAddress(existing) === target), 'v2 must be a NEW address; existing contracts must not be redeployed or reconfigured.');
  return target;
}
export async function verifyValorantSource(client, target, source = readFileSync(sourceFile)) {
  newResolverAddress(target);
  const expected = sourceSha256(source);
  const actual = sourceSha256(await client.getContractCode(target));
  requireThat(actual === expected, 'Deployed v2 source SHA256 differs from the repository file. Do not configure the website.');
  requireThat(await read(client, target, 'get_version') === VALORANT_VERSION, 'Deployed resolver is not valorant-bo3-v2.');
  return expected;
}
export async function deployValorant(argv, { client = readClient(), signer = signingClient, source = readFileSync(sourceFile) } = {}) {
  const options = argumentsFor(argv, 0, ['--verify-address']);
  await checkChain(client);
  const game = await read(client, NETWORK.game, 'get_protocol_balances');
  publicAddress(game.owner);
  requireThat(source.toString('utf8').includes('"Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"'), 'Source runner is not the reviewed concrete pin.');
  console.log(json({ chain: NETWORK.chainId, rpc: NETWORK.rpc, existing_game: NETWORK.game,
    game_owner: game.owner, rule_version: VALORANT_VERSION, source_sha256: sourceSha256(source), source_bytes: source.length }));
  if (options['verify-address']) {
    requireThat(options.dryRun, '--verify-address is read-only; use it with --dry-run.');
    const target = options['verify-address'];
    await verifyValorantSource(client, target, source);
    requireThat(publicAddress(await read(client, target, 'get_owner')) === publicAddress(game.owner), 'v2 owner differs from the existing game owner.');
    console.log('Verified v2 source SHA256, version and owner:', target);
    return;
  }
  // Ask the LIVE read-only schema endpoint to validate the exact source before signing.
  const schema = await client.getContractSchemaForCode(new Uint8Array(source));
  requireThat(schema && typeof schema === 'object', 'Studio Next did not return a contract schema.');
  if (options.dryRun) {
    console.log('DRY RUN: chain, existing game owner and live source schema checked. No key accessed, no contract deployed, no address invented.');
    return;
  }
  const signed = signer();
  requireThat(signed.wallet === publicAddress(game.owner), 'Deploy with the existing game-owner wallet so it can register new rounds.');
  await checkChain(signed.client);
  const fee = await signed.client.estimateTransactionFees();
  requireThat(typeof fee.feeValue === 'bigint' && fee.feeValue >= 0n && fee.feeValue <= 200000000000000000n, 'Fee deposit is invalid or exceeds 0.2 test GEN.');
  const hash = await signed.client.deployContract({ code: source.toString('utf8'), args: [], fees: { distribution: fee.distribution, feeValue: fee.feeValue } });
  console.log('Submitted deployment (not yet evidence):', hash);
  const receipt = await signed.client.waitForTransactionReceipt({ hash, waitUntil: 'finalized', interval: 3000, retries: 240 });
  checkFinalized(receipt);
  const target = receipt.data?.contract_address ?? receipt.contractAddress ?? receipt.to_address;
  newResolverAddress(target);
  const sha256 = await verifyValorantSource(client, target, source);
  requireThat(publicAddress(await read(client, target, 'get_owner')) === signed.wallet, 'New resolver owner mismatch. Do not configure the website.');
  console.log(json({ status: 'FINALIZED + SUCCESS + SOURCE VERIFIED', address: target, transaction_hash: hash,
    source_sha256: sha256, explorer: `https://explorer-studio-dev.genlayer.com/tx/${hash}` }));
}

cli(import.meta.url, () => deployValorant(process.argv.slice(2)));
