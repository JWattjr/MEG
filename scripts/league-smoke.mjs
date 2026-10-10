import { NETWORK, address, argumentsFor, checkChain, cli, identifier, json, publicAddress, read, readClient, requireThat, signingClient, submit, timestamp } from './operator-common.mjs';

export function checkLeagueRound(round, roundId, now = Date.now()) {
  requireThat(round?.round_id === roundId, 'League round is not registered or ID differs.');
  requireThat(round.status === 'OPEN' && now < timestamp(round.lock_at, 'lock_at'), 'League round must be OPEN and unlocked.');
}
export function checkLeague(league, leagueId, roundId, wallet1, name) {
  requireThat(league.league_id === leagueId && league.host === wallet1 && league.name === name, 'League ID, host or name mismatch.');
  requireThat(publicAddress(league.game_address) === NETWORK.game.toLowerCase() && JSON.stringify(league.round_ids) === JSON.stringify([roundId]), 'League game or season mismatch.');
  requireThat(league.scoring === 'correct-cells-v1' && Array.isArray(league.members) && league.members.includes(wallet1), 'League rules or host membership mismatch.');
}
export async function leagueSmoke(argv, { client = readClient(), signer = signingClient } = {}) {
  const options = argumentsFor(argv, 2, ['--wallet-1', '--wallet-2', '--name']);
  const [leagueId, roundId] = options.positional;
  identifier(roundId, 'round_id'); identifier(leagueId, 'league_id');
  requireThat(leagueId.length >= 8 && leagueId.length <= 64, 'League ID must contain 8–64 lowercase letters, digits or hyphens.');
  const name = options.name ?? 'MEG live verification';
  requireThat(name.trim() === name && name.length >= 3 && name.length <= 60, 'League name must contain 3–60 characters.');
  await checkChain(client);
  const [round, league] = await Promise.all([
    read(client, NETWORK.game, 'get_round', [roundId]), read(client, NETWORK.leagues, 'get_league', [leagueId]),
  ]);
  console.log(json({ round, league }));
  checkLeagueRound(round, roundId);
  // Public addresses are REQUIRED in dry-run: do not derive them by reading keys.
  const wallet1 = publicAddress(options['wallet-1']);
  const wallet2 = publicAddress(options['wallet-2']);
  requireThat(wallet1 !== wallet2, 'Use two distinct wallets.');
  if (league.league_id) {
    checkLeague(league, leagueId, roundId, wallet1, name);
    requireThat(Date.now() < timestamp(league.join_before, 'join_before'), 'League membership has locked.');
    requireThat(league.members.includes(wallet2) || league.members.length < 100, 'League is full.');
  }
  const invited = league.league_id ? await read(client, NETWORK.leagues, 'is_invited', [leagueId, address(wallet2)]) : false;
  console.log(json({ wallet_1: wallet1, wallet_2: wallet2, create: !league.league_id, invite: !invited, join: !league.members?.includes(wallet2) }));
  if (options.dryRun) {
    console.log('DRY RUN: public state checks passed. No key read, signing or write. Membership alone does not prove paid entries.');
    return;
  }
  const signed1 = signer();
  const signed2 = signer('GENLAYER_PRIVATE_KEY_2');
  requireThat(signed1.wallet === wallet1 && signed2.wallet === wallet2, 'Local signing wallets differ from preflight public addresses.');
  const guard = async () => checkLeagueRound(await read(client, NETWORK.game, 'get_round', [roundId]), roundId);
  let current = league;
  if (!league.league_id) {
    await guard();
    await submit(signed1.client, NETWORK.leagues, 'create_league', [leagueId, name, JSON.stringify([roundId])]);
    current = await read(client, NETWORK.leagues, 'get_league', [leagueId]);
    checkLeague(current, leagueId, roundId, wallet1, name);
  }
  if (!invited && !current.members.includes(wallet2)) {
    await guard();
    await submit(signed1.client, NETWORK.leagues, 'invite_member', [leagueId, address(wallet2)]);
    requireThat(await read(client, NETWORK.leagues, 'is_invited', [leagueId, address(wallet2)]) === true, 'Invitation not reflected on-chain.');
  }
  if (!current.members.includes(wallet2)) {
    await guard();
    await submit(signed2.client, NETWORK.leagues, 'join_league', [leagueId]);
  }
  current = await read(client, NETWORK.leagues, 'get_league', [leagueId]);
  checkLeague(current, leagueId, roundId, wallet1, name);
  requireThat(current.members.includes(wallet2), 'Second wallet membership not reflected on-chain.');
  console.log('get_league:', json(current));
}
cli(import.meta.url, () => leagueSmoke(process.argv.slice(2)));
