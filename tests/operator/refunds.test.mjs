import test from 'node:test';
import assert from 'node:assert/strict';
import { activateRefunds, checkRefundEligibility } from '../../scripts/activate-refunds.mjs';
import { checkFinalized, argumentsFor } from '../../scripts/operator-common.mjs';

const id = 'meg-champions-2026-group-c-tl-prx';
const round = { round_id: id, status: 'OPEN', refund_at: '2026-10-02T15:00:00Z' };
test('refund boundary is inclusive; OPEN and SCORING only', () => {
  const boundary = Date.parse(round.refund_at);
  assert.doesNotThrow(() => checkRefundEligibility(round, id, boundary));
  assert.doesNotThrow(() => checkRefundEligibility({ ...round, status: 'SCORING' }, id, boundary));
  assert.throws(() => checkRefundEligibility(round, id, boundary - 1));
  for (const status of ['SETTLED', 'REFUNDING', 'VOID', '']) assert.throws(() => checkRefundEligibility({ ...round, status }, id, boundary));
  assert.throws(() => checkRefundEligibility({}, id, boundary));
  assert.throws(() => checkRefundEligibility({ ...round, round_id: 'wrong' }, id, boundary));
  assert.throws(() => checkRefundEligibility({ ...round, refund_at: 'invalid' }, id, boundary));
});
test('dry-run only reads and never constructs a signer', async () => {
  const methods = [];
  const client = {
    request: async ({ method }) => { methods.push(method); return '0xf22d'; },
    readContract: async ({ functionName }) => { methods.push(functionName); return round; },
  };
  await activateRefunds(id, { dryRun: true, client, signer: () => assert.fail('dry-run read a key') });
  assert.deepEqual(methods, ['eth_chainId', 'get_round']);
});
test('finality is not execution success', () => {
  assert.doesNotThrow(() => checkFinalized({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN' }));
  assert.throws(() => checkFinalized({ statusName: 'ACCEPTED', txExecutionResultName: 'FINISHED_WITH_RETURN' }));
  assert.throws(() => checkFinalized({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_ERROR', consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } }));
  assert.throws(() => checkFinalized({ statusName: 'FINALIZED' }));
});
test('CLI rejects unknown options and missing arguments', () => {
  assert.deepEqual(argumentsFor(['--dry-run', id], 1), { positional: [id], dryRun: true });
  assert.throws(() => argumentsFor([id, '--unexpected'], 1));
  assert.throws(() => argumentsFor([], 1));
});
