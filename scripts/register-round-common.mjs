import { readFileSync } from 'node:fs';
import { abi } from '../web/node_modules/genlayer-js/dist/index.js';
import { NETWORK, address, argumentsFor, checkChain, checkFinalized, identifier, json, publicAddress, read, readClient, requireThat, signingClient, submit, timestamp } from './operator-common.mjs';
import { VALORANT_VERSION, newResolverAddress, verifyValorantSource } from './deploy-valorant-resolver.mjs';

const POLICIES = {
  valorant: ['https://valorantesports.com/', 'https://www.vlr.gg/', 'https://www.thespike.gg/'],
  cod: ['https://callofdutyleague.com/', 'https://www.callofdutyleague.com/', 'https://breakingpoint.gg/', 'https://www.breakingpoint.gg/', 'https://liquipedia.net/callofduty/'],
};
const BASE_FIELDS = ['match_id', 'team_a', 'team_b', 'competition', 'match_date', 'format_name'];
function resolverFor(kind) {
  if (kind === 'cod') return NETWORK.cod;
  const configured = process.env.NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS;
  requireThat(Boolean(configured), 'Set NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS to the NEW source-verified v2 deployment address; no v2 deployment is assumed.');
  newResolverAddress(configured);
  return configured;
}
const metadataFields = (kind) => [...BASE_FIELDS, 'player_a', 'player_b', ...(kind === 'valorant' ? ['map_1', 'game_type', 'rule_version'] : [])];
export function validateFixture(spec, kind, now = Date.now()) {
  requireThat(spec && typeof spec === 'object', 'Fixture JSON must be an object.');
  requireThat(publicAddress(spec.game) === NETWORK.game.toLowerCase() && publicAddress(spec.resolver) === publicAddress(resolverFor(kind)), 'Fixture must bind the live MEG game and correct resolver.');
  identifier(spec.round_id, 'round_id'); identifier(spec.resolution_id, 'resolution_id');
  const dates = ['lock_at', 'kickoff_at', 'resolve_not_before', 'resolve_deadline', 'refund_at'].map((key) => timestamp(spec[key], key));
  requireThat(now < dates[0] && dates[0] < dates[1] && dates[1] <= dates[2] && dates[2] < dates[3] && dates[3] <= dates[4], 'Fixture windows must be future and ordered.');
  if (kind === 'valorant') requireThat(dates[1] - now >= 48 * 3600000, 'Valorant kickoff must be at least 48 hours away.');
  const meta = spec.metadata;
  const fields = metadataFields(kind);
  requireThat(Object.keys(meta ?? {}).every((key) => [...fields, 'source_urls'].includes(key)), 'Unexpected metadata field; deployed resolver cannot verify it.');
  for (const key of fields) requireThat(typeof meta?.[key] === 'string' && meta[key].trim() === meta[key] && meta[key].length > 0 && meta[key].length <= 160, `Missing or malformed metadata ${key}.`);
  requireThat(meta.match_date === spec.kickoff_at.slice(0, 10), 'UTC match date differs from kickoff.');
  requireThat(meta.format_name === (kind === 'cod' ? 'BEST_OF_5' : 'BEST_OF_3'), 'Unexpected BO format.');
  if (kind === 'valorant') requireThat(meta.game_type === 'valorant' && meta.rule_version === VALORANT_VERSION, 'Valorant v2 game_type and rule_version required.');
  requireThat(meta.team_a.toLowerCase() !== meta.team_b.toLowerCase(), 'Teams must be distinct.');
  requireThat(meta.player_a.toLowerCase() !== meta.player_b.toLowerCase(), 'Players must be distinct.');
  requireThat(Array.isArray(meta.source_urls) && meta.source_urls.length >= 2 && meta.source_urls.length <= 3, 'Two or three approved match-specific sources required.');
  const groups = meta.source_urls.map((value) => {
    requireThat(typeof value === 'string' && value.length <= 500 && POLICIES[kind].some((origin) => value.startsWith(origin)), 'Evidence URL is outside the deployed publisher policy.');
    let url;
    try { url = new URL(value); } catch { requireThat(false, 'Malformed evidence URL.'); }
    requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.hash && url.pathname !== '/', 'Use credential-free match-specific HTTPS pages.');
    return url.hostname.replace(/^www\./, '');
  });
  requireThat(new Set(groups).size >= 2 && new Set(meta.source_urls).size === meta.source_urls.length, 'Evidence must include distinct URLs from at least two publishers.');
  requireThat(new Set(groups).size === groups.length, 'Every source must use a different approved publisher.');
  requireThat(spec.verified === true, 'Fixture is not verified. Check the official schedule and match pages before setting verified: true.');
  return spec;
}
export function resolverArguments(spec, kind) {
  const m = spec.metadata;
  return [spec.resolution_id, JSON.stringify(m), address(spec.game), spec.round_id, spec.resolve_not_before, spec.resolve_deadline];
}
export function checkResolverRecord(record, spec, kind) {
  requireThat(record.resolution_id === spec.resolution_id, 'Resolver ID mismatch.');
  const fields = metadataFields(kind);
  requireThat(fields.every((key) => record[key] === spec.metadata[key]), 'Resolver match metadata mismatch.');
  requireThat(publicAddress(record.settlement_target) === publicAddress(spec.game) && record.settlement_round_id === spec.round_id, 'Resolver settlement binding mismatch.');
  requireThat(record.resolve_not_before === spec.resolve_not_before && record.resolve_deadline === spec.resolve_deadline, 'Resolver timing mismatch.');
  requireThat(JSON.stringify(record.source_urls) === JSON.stringify(spec.metadata.source_urls), 'Resolver sources mismatch.');
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
  // Studio returns base64 calldata (wrapped by decodeLocalnetTransaction),
  // while the train SDK returns txDataDecoded.callData. Support both formats.
  const calldata = tx.data?.calldata;
  const base64 = typeof calldata === 'string' ? calldata : calldata?.base64;
  const bytes = actual ? Buffer.from(abi.calldata.encode(actual))
    : typeof base64 === 'string' ? Buffer.from(base64, 'base64') : undefined;
  requireThat(bytes && bytes.equals(Buffer.from(expected)), 'Registration proof calldata differs from fixture, including sources.');
}
export async function registerRound(kind, argv, { client = readClient(), signer = signingClient, load = (path) => JSON.parse(readFileSync(path, 'utf8')) } = {}) {
  // With no fixture, --dry-run is deployment inspection only and exits 2.
  const hasFixture = argv.some((item) => !item.startsWith('--'));
  const options = argumentsFor(argv, hasFixture ? 1 : 0);
  requireThat(hasFixture || options.dryRun, 'A verified local fixture JSON is required.');
  await checkChain(client);
  const target = resolverFor(kind);
  const [game, version, count] = await Promise.all([
    read(client, NETWORK.game, 'get_protocol_balances'), read(client, target, 'get_version'),
    read(client, target, 'get_resolution_count'),
  ]);
  requireThat(version === (kind === 'cod' ? 'cod-bo5-v1' : VALORANT_VERSION), 'Unexpected deployed resolver version.');
  if (kind === 'valorant') {
    await verifyValorantSource(client, target);
    requireThat(publicAddress(await read(client, target, 'get_owner')) === publicAddress(game.owner), 'v2 owner differs from game owner.');
  }
  requireThat(game.paused === false, 'Game is paused.');
  console.log(json({ chain: NETWORK.chainId, game: NETWORK.game, resolver: target, version, registrations: count }));
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
  }
  if (round.round_id) {
    checkGameRecord(round, spec);
    requireThat(Boolean(resolution.resolution_id), 'Game round exists without the matching resolver registration.');
  }
  console.log(json({ round_id: spec.round_id, resolution_id: spec.resolution_id, metadata: spec.metadata,
    resolver_action: resolution.resolution_id ? 'already matches' : 'register_round', game_action: round.round_id ? 'already matches' : 'create_round',
    owner: game.owner, kickoff_at: spec.kickoff_at, lock_at: spec.lock_at }));
  if (options.dryRun) {
    console.log('DRY RUN: fixture and binding checks passed; resolver first, then game. Signing-wallet authorization is not checked. No key read or write.');
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
  if (kind === 'valorant') console.log('Website entries require the SAME source-verified v2 address configured in the Vercel build; verify both named players before signing.');
}
