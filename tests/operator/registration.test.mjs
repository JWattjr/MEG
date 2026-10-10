// Synthetic unit-test inputs only. Never usable as verified live fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abi } from '../../web/node_modules/genlayer-js/dist/index.js';
import { NETWORK } from '../../scripts/operator-common.mjs';
import { checkGameRecord, checkRegistrationProof, checkResolverRecord, registerRound, resolverArguments, validateFixture } from '../../scripts/register-round-common.mjs';
import { checkLeagueRound, checkLeague, leagueSmoke } from '../../scripts/league-smoke.mjs';

const now = Date.parse('2030-01-01T00:00:00Z');
const spec = {
  verified: true, game: NETWORK.game, resolver: NETWORK.valorant, round_id: 'synthetic-unit-round', resolution_id: 'synthetic-unit-resolution',
  lock_at: '2030-01-03T00:00:00Z', kickoff_at: '2030-01-03T01:00:00Z', resolve_not_before: '2030-01-03T06:00:00Z', resolve_deadline: '2030-01-04T00:00:00Z', refund_at: '2030-01-04T01:00:00Z',
  metadata: { match_id: 'synthetic-unit-match', team_a: 'Synthetic A', team_b: 'Synthetic B', competition: 'Synthetic test only', match_date: '2030-01-03', format_name: 'BEST_OF_3', map_1: 'Opening map (veto pending)', source_urls: ['https://www.vlr.gg/synthetic-unit-test', 'https://www.thespike.gg/synthetic-unit-test'] },
};
const resolverRecord = { ...spec.metadata, resolution_id: spec.resolution_id, settlement_target: spec.game, settlement_round_id: spec.round_id, resolve_not_before: spec.resolve_not_before, resolve_deadline: spec.resolve_deadline };
const gameRecord = { ...spec, match_id: spec.metadata.match_id, resolver_address: spec.resolver, resolver_resolution_id: spec.resolution_id, status: 'OPEN', minimum_stake: '1000000000000000000', minimum_participants: 2, minimum_total_stake: '2000000000000000000', minimum_unique_grids: 2 };
test('fixture validation enforces confirmation, 48h, network, format and dates', () => {
  assert.doesNotThrow(() => validateFixture(spec, 'valorant', now));
  for (const change of [{ verified: false }, { game: NETWORK.leagues }, { resolver: NETWORK.cod }, { kickoff_at: '2030-01-01T01:00:00Z' }, { refund_at: '2030-01-02T00:00:00Z' }]) {
    assert.throws(() => validateFixture({ ...spec, ...change }, 'valorant', now));
  }
  for (const change of [{ match_date: '2030-01-04' }, { format_name: 'BEST_OF_1' }, { team_b: 'Synthetic A' }, { invented_field: 'unsupported' }]) {
    assert.throws(() => validateFixture({ ...spec, metadata: { ...spec.metadata, ...change } }, 'valorant', now));
  }
});
test('publisher policy matches deployed origins and rejects same-publisher evidence', () => {
  for (const sources of [[], ['https://www.vlr.gg/a', 'https://www.vlr.gg/b'], ['https://vlr.gg/a', 'https://www.thespike.gg/b'], ['https://www.vlr.gg@evil.test/a', 'https://www.thespike.gg/b'], ['https://www.vlr.gg/', 'https://www.thespike.gg/b']]) {
    assert.throws(() => validateFixture({ ...spec, metadata: { ...spec.metadata, source_urls: sources } }, 'valorant', now));
  }
});
test('resolver registration arguments match the deployed Valorant signature', () => {
  const args = resolverArguments(spec, 'valorant');
  assert.equal(args.length, 13);
  assert.equal(args[0], spec.resolution_id);
  assert.equal(args[8], JSON.stringify(spec.metadata.source_urls));
  assert.equal(args[10], spec.round_id);
  assert.doesNotThrow(() => checkResolverRecord(resolverRecord, spec, 'valorant'));
  for (const change of [{ resolution_id: 'wrong' }, { team_a: 'wrong' }, { map_1: 'wrong' }, { settlement_round_id: 'wrong' }]) assert.throws(() => checkResolverRecord({ ...resolverRecord, ...change }, spec, 'valorant'));
});
test('game binding includes IDs, timing and all economic thresholds', () => {
  assert.doesNotThrow(() => checkGameRecord(gameRecord, spec));
  for (const change of [{ round_id: 'wrong' }, { resolver_address: NETWORK.cod }, { minimum_unique_grids: 1 }, { minimum_stake: '2' }, { status: 'SCORING' }]) assert.throws(() => checkGameRecord({ ...gameRecord, ...change }, spec));
});
test('existing Valorant sources require exact finalized registration calldata', () => {
  const tx = { statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN', recipient: spec.resolver, txDataDecoded: { callData: abi.calldata.makeCalldataObject('register_round', resolverArguments(spec, 'valorant')) } };
  assert.doesNotThrow(() => checkRegistrationProof(tx, spec, 'valorant'));
  const base64 = Buffer.from(abi.calldata.encode(tx.txDataDecoded.callData)).toString('base64');
  assert.doesNotThrow(() => checkRegistrationProof({ ...tx, txDataDecoded: undefined, data: { calldata: { base64 } } }, spec, 'valorant'));
  assert.doesNotThrow(() => checkRegistrationProof({ ...tx, txDataDecoded: undefined, data: { calldata: base64 } }, spec, 'valorant'));
  assert.throws(() => checkRegistrationProof({ ...tx, txDataDecoded: undefined }, spec, 'valorant'));
  assert.throws(() => checkRegistrationProof({ ...tx, recipient: NETWORK.game }, spec, 'valorant'));
  const wrong = structuredClone(spec); wrong.metadata.source_urls[0] = 'https://www.vlr.gg/wrong';
  assert.throws(() => checkRegistrationProof(tx, wrong, 'valorant'));
});
test('registration dry-run does not construct a signer or write', async () => {
  const calls = [];
  const client = { request: async () => NETWORK.chainId, readContract: async ({ functionName }) => {
    calls.push(functionName);
    return functionName === 'get_protocol_balances' ? { paused: false, owner: NETWORK.game } : functionName === 'get_version' ? '1.0.0-meg' : functionName === 'get_resolution_count' ? 0n : {};
  } };
  await registerRound('valorant', ['synthetic-unit-only.json', '--dry-run'], { client, load: () => spec, signer: () => assert.fail('key accessed') });
  assert.ok(calls.includes('get_round') && calls.includes('get_round_resolution'));
});
test('league preflight refuses absent, locked or non-OPEN rounds', () => {
  assert.doesNotThrow(() => checkLeagueRound(gameRecord, spec.round_id, now));
  for (const record of [{}, { ...gameRecord, status: 'SCORING' }, { ...gameRecord, lock_at: '2029-01-01T00:00:00Z' }]) assert.throws(() => checkLeagueRound(record, spec.round_id, now));
});
const wallet1 = NETWORK.game.toLowerCase();
const wallet2 = NETWORK.valorant.toLowerCase();
const leagueId = 'synthetic-unit-league';
const name = 'MEG live verification';
test('league dry-run uses public addresses and never touches keys', async () => {
  const client = { request: async () => NETWORK.chainId, readContract: async ({ functionName }) => functionName === 'get_round' ? gameRecord : {} };
  await leagueSmoke([leagueId, spec.round_id, '--dry-run', '--wallet-1', wallet1, '--wallet-2', wallet2], { client, signer: () => assert.fail('key accessed') });
});
test('league resumes require the exact host, season and game', () => {
  const league = { league_id: leagueId, host: wallet1, name, game_address: NETWORK.game, round_ids: [spec.round_id], scoring: 'correct-cells-v1', members: [wallet1] };
  assert.doesNotThrow(() => checkLeague(league, leagueId, spec.round_id, wallet1, name));
  for (const change of [{ host: wallet2 }, { round_ids: ['wrong'] }, { game_address: NETWORK.cod }, { members: [] }]) assert.throws(() => checkLeague({ ...league, ...change }, leagueId, spec.round_id, wallet1, name));
});

function registrationClient({ existingRound = {}, execution = 'FINISHED_WITH_RETURN' } = {}) {
  const writes = [];
  let resolution = {};
  let round = existingRound;
  return {
    writes,
    request: async () => NETWORK.chainId,
    estimateTransactionFees: async () => ({ feeValue: 0n, distribution: {} }),
    waitForTransactionReceipt: async () => ({ statusName: 'FINALIZED', txExecutionResultName: execution }),
    readContract: async ({ functionName }) => ({
      get_protocol_balances: { owner: wallet1, paused: false }, get_version: '1.0.0-meg', get_resolution_count: 0n,
      get_round_resolution: resolution, get_round: round,
    })[functionName],
    writeContract: async ({ functionName }) => {
      writes.push(functionName);
      if (functionName === 'register_round') resolution = resolverRecord;
      if (functionName === 'create_round') round = gameRecord;
      return 'synthetic-unit-only-not-a-real-transaction';
    },
  };
}
test('registration finalizes resolver before game creation and verifies both', async (t) => {
  t.mock.method(console, 'log', () => {});
  const client = registrationClient();
  await registerRound('valorant', ['synthetic-unit-only.json'], { client, load: () => spec, signer: () => ({ wallet: wallet1, client }) });
  assert.deepEqual(client.writes, ['register_round', 'create_round']);
});
test('a finalized resolver failure prevents the game write', async (t) => {
  t.mock.method(console, 'log', () => {});
  const client = registrationClient({ execution: 'FINISHED_WITH_ERROR' });
  await assert.rejects(() => registerRound('valorant', ['synthetic-unit-only.json'], { client, load: () => spec, signer: () => ({ wallet: wallet1, client }) }));
  assert.deepEqual(client.writes, ['register_round']);
});
test('conflicting existing game is rejected before signer access or any write', async (t) => {
  t.mock.method(console, 'log', () => {});
  const client = registrationClient({ existingRound: { ...gameRecord, match_id: 'conflicting-id' } });
  await assert.rejects(() => registerRound('valorant', ['synthetic-unit-only.json'], { client, load: () => spec, signer: () => assert.fail('key accessed') }));
  assert.deepEqual(client.writes, []);
});
test('wrong registration owner never writes', async (t) => {
  t.mock.method(console, 'log', () => {});
  const client = registrationClient();
  await assert.rejects(() => registerRound('valorant', ['synthetic-unit-only.json'], { client, load: () => spec, signer: () => ({ wallet: wallet2, client }) }));
  assert.deepEqual(client.writes, []);
});
test('league smoke creates, invites and joins using the corresponding wallets', async (t) => {
  t.mock.method(console, 'log', () => {});
  const writes = [];
  let current = {};
  let invitation = false;
  const reader = {
    request: async () => NETWORK.chainId,
    readContract: async ({ functionName }) => functionName === 'get_round' ? gameRecord : functionName === 'is_invited' ? invitation : current,
  };
  const signer = (variable) => {
    const wallet = variable === 'GENLAYER_PRIVATE_KEY_2' ? wallet2 : wallet1;
    return { wallet, client: {
      ...reader,
      estimateTransactionFees: async () => ({ feeValue: 0n, distribution: {} }),
      waitForTransactionReceipt: async () => ({ statusName: 'FINALIZED', txExecutionResultName: 'FINISHED_WITH_RETURN' }),
      writeContract: async ({ functionName }) => {
        writes.push([wallet, functionName]);
        if (functionName === 'create_league') current = { league_id: leagueId, host: wallet1, name, game_address: NETWORK.game, round_ids: [spec.round_id], members: [wallet1], scoring: 'correct-cells-v1', join_before: spec.lock_at };
        if (functionName === 'invite_member') invitation = true;
        if (functionName === 'join_league') current.members.push(wallet2);
        return 'synthetic-unit-only-not-a-real-transaction';
      },
    } };
  };
  const argv = [leagueId, spec.round_id, '--wallet-1', wallet1, '--wallet-2', wallet2];
  await leagueSmoke(argv, { client: reader, signer });
  assert.deepEqual(writes, [[wallet1, 'create_league'], [wallet1, 'invite_member'], [wallet2, 'join_league']]);
  // An exact resumption skips every completed write.
  await leagueSmoke(argv, { client: reader, signer });
  assert.equal(writes.length, 3);
});
