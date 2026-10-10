// Synthetic transport fixtures only. These tests never deploy or sign anything.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NETWORK } from '../../scripts/operator-common.mjs';
import { deployValorant, newResolverAddress, sourceSha256, verifyValorantSource } from '../../scripts/deploy-valorant-resolver.mjs';

const source = readFileSync(new URL('../../contracts/valorant_match_resolver.py', import.meta.url));
const target = '0x2222222222222222222222222222222222222222';
function reader() {
  return { request: async () => NETWORK.chainId, getContractSchemaForCode: async () => ({ methods: {} }),
    getContractCode: async () => source.toString('utf8'),
    readContract: async ({ functionName }) => functionName === 'get_protocol_balances' ? { owner: NETWORK.game } : functionName === 'get_owner' ? NETWORK.game : 'valorant-bo3-v2' };
}
test('deploy dry-run never reads keys or submits a deployment', async (t) => {
  t.mock.method(console, 'log', () => {});
  await deployValorant(['--dry-run'], { client: reader(), signer: () => assert.fail('key accessed'), source });
});
test('deployed source verification requires exact bytes, rule version and new address', async () => {
  assert.equal(await verifyValorantSource(reader(), target, source), sourceSha256(source));
  await assert.rejects(() => verifyValorantSource({ ...reader(), getContractCode: async () => 'different source' }, target, source), /SHA256/);
  await assert.rejects(() => verifyValorantSource({ ...reader(), readContract: async () => 'old-version' }, target, source), /valorant-bo3-v2/);
  for (const address of [NETWORK.game, NETWORK.valorant, NETWORK.leagues, NETWORK.cod]) assert.throws(() => newResolverAddress(address), /NEW address/);
});
test('verify-address stays read-only and checks owner', async (t) => {
  t.mock.method(console, 'log', () => {});
  await deployValorant(['--dry-run', '--verify-address', target], { client: reader(), signer: () => assert.fail('key accessed'), source });
  await assert.rejects(() => deployValorant(['--verify-address', target], { client: reader(), source }), /read-only/);
});
test('a finalized failure is never reported as a verified deployment', async (t) => {
  t.mock.method(console, 'log', () => {});
  const signed = { ...reader(), estimateTransactionFees: async () => ({ feeValue: 0n, distribution: {} }),
    deployContract: async () => 'synthetic-only-not-a-real-hash',
    waitForTransactionReceipt: async () => ({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_ERROR', to_address: target }) };
  await assert.rejects(() => deployValorant([], { client: reader(), signer: () => ({ wallet: NETWORK.game.toLowerCase(), client: signed }), source }), /did not execute successfully/);
});
test('deployment finalizes, verifies bytes and checks its owner before completion', async (t) => {
  t.mock.method(console, 'log', () => {});
  const signed = { ...reader(), estimateTransactionFees: async () => ({ feeValue: 0n, distribution: {} }),
    deployContract: async ({ code, args }) => { assert.equal(code, source.toString('utf8')); assert.deepEqual(args, []); return 'synthetic-only-not-a-real-hash'; },
    waitForTransactionReceipt: async () => ({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN', data: { contract_address: target } }) };
  await deployValorant([], { client: reader(), signer: () => ({ wallet: NETWORK.game.toLowerCase(), client: signed }), source });
});
