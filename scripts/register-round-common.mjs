import { readFileSync } from 'node:fs';
import { abi } from '../web/node_modules/genlayer-js/dist/index.js';
import { NETWORK, address, argumentsFor, checkChain, checkFinalized, identifier, json, publicAddress, read, readClient, requireThat, signingClient, submit, timestamp } from './operator-common.mjs';

const POLICIES = {
  valorant: ['https://valorantesports.com/', 'https://www.vlr.gg/', 'https://www.thespike.gg/'],
  cod: ['https://callofdutyleague.com/', 'https://www.callofdutyleague.com/', 'https://breakingpoint.gg/', 'https://www.breakingpoint.gg/', 'https://liquipedia.net/callofduty/'],
};
const BASE_FIELDS = ['match_id', 'team_a', 'team_b', 'competition', 'match_date', 'format_name'];
export function validateFixture(spec, kind, now = Date.now()) {
  requireThat(spec && typeof spec === 'object', 'Fixture JSON must be an object.');
  requireThat(publicAddress(spec.game) === NETWORK.game.toLowerCase() && publicAddress(spec.resolver) === NETWORK[kind].toLowerCase(), 'Fixture must bind the live MEG game and correct resolver.');
  identifier(spec.round_id, 'round_id'); identifier(spec.resolution_id, 'resolution_id');
  const dates = ['lock_at', 'kickoff_at', 'resolve_not_before', 'resolve_deadline', 'refund_at'].map((key) => timestamp(spec[key], key));
  requireThat(now < dates[0] && dates[0] < dates[1] && dates[1] <= dates[2] && dates[2] < dates[3] && dates[3] <= dates[4], 'Fixture windows must be future and ordered.');
  if (kind === 'valorant') requireThat(dates[1] - now >= 48 * 3600000, 'Valorant kickoff must be at least 48 hours away.');
  const meta = spec.metadata;
  const fields = [...BASE_FIELDS, ...(kind === 'cod' ? ['player_a', 'player_b'] : ['map_1'])];
  requireThat(Object.keys(meta ?? {}).every((key) => [...fields, 'source_urls'].includes(key)), 'Unexpected metadata field; deployed resolver cannot verify it.');
  for (const key of fields) requireThat(typeof meta?.[key] === 'string' && meta[key].trim() === meta[key] && meta[key].length > 0 && meta[key].length <= 160, `Missing or malformed metadata ${key}.`);
  requireThat(meta.match_date === spec.kickoff_at.slice(0, 10), 'UTC match date differs from kickoff.');
  requireThat((kind === 'cod' ? ['BEST_OF_5'] : ['BEST_OF_3', 'BEST_OF_5']).includes(meta.format_name), 'Unexpected BO format.');
  requireThat(meta.team_a.toLowerCase() !== meta.team_b.toLowerCase(), 'Teams must be distinct.');
  if (kind === 'cod') requireThat(meta.player_a.toLowerCase() !== meta.player_b.toLowerCase(), 'Players must be distinct.');
  requireThat(Array.isArray(meta.source_urls) && meta.source_urls.length >= 2 && meta.source_urls.length <= 3, 'Two or three approved match-specific sources required.');
  const groups = meta.source_urls.map((value) => {
    requireThat(typeof value === 'string' && value.length <= 500 && POLICIES[kind].some((origin) => value.startsWith(origin)), 'Evidence URL is outside the deployed publisher policy.');
    let url;
    try { url = new URL(value); } catch { requireThat(false, 'Malformed evidence URL.'); }
    requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.hash && url.pathname !== '/', 'Use credential-free match-specific HTTPS pages.');
    return url.hostname.replace(/^www\./, '');
  });
  requireThat(new Set(groups).size >= 2 && new Set(meta.source_urls).size === meta.source_urls.length, 'Evidence must include distinct URLs from at least two publishers.');
  if (kind === 'cod') requireThat(new Set(groups).size === groups.length, 'COD requires every source to use a different publisher.');
  requireThat(spec.verified === true, 'Fixture is not verified. Check the official schedule and match pages before setting verified: true.');
  return spec;
}
export function resolverArguments(spec, kind) {
  const m = spec.metadata;
  return kind === 'cod'
    ? [spec.resolution_id, JSON.stringify(m), address(spec.game), spec.round_id, spec.resolve_not_before, spec.resolve_deadline]
    : [spec.resolution_id, m.match_id, m.team_a, m.team_b, m.competition, m.match_date, m.format_name, m.map_1, JSON.stringify(m.source_urls), address(spec.game), spec.round_id, spec.resolve_not_before, spec.resolve_deadline];
}
export function checkResolverRecord(record, spec, kind) {
  requireThat(record.resolution_id === spec.resolution_id, 'Resolver ID mismatch.');
  const fields = [...BASE_FIELDS, ...(kind === 'cod' ? ['player_a', 'player_b'] : ['map_1'])];
  requireThat(fields.every((key) => record[key] === spec.metadata[key]), 'Resolver match metadata mismatch.');
  requireThat(publicAddress(record.settlement_target) === publicAddress(spec.game) && record.settlement_round_id === spec.round_id, 'Resolver settlement binding mismatch.');
  requireThat(record.resolve_not_before === spec.resolve_not_before && record.resolve_deadline === spec.resolve_deadline, 'Resolver timing mismatch.');
  if (kind === 'cod') requireThat(JSON.stringify(record.source_urls) === JSON.stringify(spec.metadata.source_urls), 'Resolver sources mismatch.');
}
export function checkGameRecord(record, spec) {
  requireThat(record.round_id === spec.round_id && record.match_id === spec.metadata.match_id, 'Game round or match ID mismatch.');
  requireThat(publicAddress(record.resolver_address) === publicAddress(spec.resolver) && record.resolver_resolution_id === spec.resolution_id, 'Game resolver binding mismatch.');
  requireThat(['lock_at', 'kickoff_at', 'resolve_not_before', 'refund_at'].every((key) => record[key] === spec[key]), 'Game timing mismatch.');
  requireThat(BigInt(record.minimum_stake) === 10n ** 18n && BigInt(record.minimum_participants) === 2n
    && BigInt(record.minimum_total_stake) === 2n * 10n ** 18n && BigInt(record.minimum_unique_grids) === 2n, 'Game economic thresholds mismatch.');
  requireThat(record.status === 'OPEN', 'Existing game round is not OPEN.');
}
export function checkRegistrationProof(tx, spec, kind) {
  checkFinalized(tx);
  requireThat(publicAddress(tx.recipient ?? tx.to_address) === publicAddress(spec.resolver), 'Registration proof targets another resolver.');
  const expected = abi.calldata.encode(abi.calldata.makeCalldataObject('register_round', resolverArguments(spec, kind)));
  const actual = tx.txDataDecoded?.callData;
  requireThat(actual && Buffer.from(abi.calldata.encode(actual)).equals(Buffer.from(expected)), 'Registration proof calldata differs from fixture, including sources.');
}
export async function registerRound(kind, argv, { client = readClient(), signer = signingClient, load = (path) => JSON.parse(readFileSync(path, 'utf8')) } = {}) {
  // With no fixture, --dry-run is deployment inspection only and exits 2.
  const hasFixture = argv.some((item) => !item.startsWith('--'));
  const options = argumentsFor(argv, hasFixture ? 1 : 0, ['--registration-tx']);
  requireThat(hasFixture || options.dryRun, 'A verified local fixture JSON is required.');
  await checkChain(client);
  const [game, version, count] = await Promise.all([
    read(client, NETWORK.game, 'get_protocol_balances'), read(client, NETWORK[kind], 'get_version'),
    read(client, NETWORK[kind], 'get_resolution_count'),
  ]);
  requireThat(version === (kind === 'cod' ? 'cod-bo5-v1' : '1.0.0-meg'), 'Unexpected deployed resolver version.');
  requireThat(game.paused === false, 'Game is paused.');
  console.log(json({ chain: NETWORK.chainId, game: NETWORK.game, resolver: NETWORK[kind], version, registrations: count }));
  if (!hasFixture) {
    console.log('DRY RUN: contracts readable. Fixture verification/registration NOT checked; supply a verified local JSON. No key read or write.');
    process.exitCode = 2;
    return;
  }
  const spec = validateFixture(load(options.positional[0]), kind);
  // Check BOTH existing records before the first write.
  const [resolution, round] = await Promise.all([
    read(client, spec.resolver, 'get_round_resolution', [spec.resolution_id]), read(client, spec.game, 'get_round', [spec.round_id]),
  ]);
  if (resolution.resolution_id) {
    checkResolverRecord(resolution, spec, kind);
    if (kind === 'valorant') {
      // The deployed view omits source_urls_json. Never assume they match.
      requireThat(/^0x[0-9a-fA-F]{64}$/.test(options['registration-tx'] ?? ''), 'Existing Valorant registration omits sources in its view. Supply --registration-tx with its successful finalized register_round hash.');
      checkRegistrationProof(await client.getTransaction({ hash: options['registration-tx'] }), spec, kind);
    }
  }
  if (round.round_id) {
    checkGameRecord(round, spec);
    requireThat(Boolean(resolution.resolution_id), 'Game round exists without the matching resolver registration.');
  }
  console.log(json({ round_id: spec.round_id, resolution_id: spec.resolution_id, metadata: spec.metadata,
    resolver_action: resolution.resolution_id ? 'already matches' : 'register_round', game_action: round.round_id ? 'already matches' : 'create_round',
    owner: game.owner, kickoff_at: spec.kickoff_at, lock_at: spec.lock_at }));
  if (options.dryRun) {
    console.log('DRY RUN: fixture checks passed; resolver first, then game. Owner authorization and resolver pause state cannot be proven without signing/simulation. No key read or write.');
    return;
  }
  const signed = signer();
  requireThat(signed.wallet === publicAddress(game.owner), 'Signing wallet is not the game owner.');
  validateFixture(spec, kind);
  if (!resolution.resolution_id) {
    await submit(signed.client, spec.resolver, 'register_round', resolverArguments(spec, kind));
    checkResolverRecord(await read(client, spec.resolver, 'get_round_resolution', [spec.resolution_id]), spec, kind);
  }
  if (!round.round_id) {
    validateFixture(spec, kind);
    await submit(signed.client, spec.game, 'create_round', [spec.round_id, spec.metadata.match_id, address(spec.resolver), spec.resolution_id,
      spec.lock_at, spec.kickoff_at, spec.resolve_not_before, spec.refund_at, 10n ** 18n, 2, 2n * 10n ** 18n, 2]);
  }
  checkGameRecord(await read(client, spec.game, 'get_round', [spec.round_id]), spec);
  console.log('Verified on-chain round:', spec.round_id);
  console.log(`https://moment-grid-genlayer.vercel.app/?round=${encodeURIComponent(spec.round_id)}`);
  if (kind === 'valorant') console.log('WARNING: current website only supports the original Valorant pack. New-fixture website entries require a separately authorized frontend update.');
}
