import { NETWORK, argumentsFor, checkChain, cli, identifier, json, read, readClient, requireThat, signingClient, submit, timestamp } from './operator-common.mjs';

export function checkRefundEligibility(round, roundId, now = Date.now()) {
  requireThat(round?.round_id === roundId, 'Round not found or ID mismatch.');
  requireThat(['OPEN', 'SCORING'].includes(round.status), 'Refund activation requires OPEN or SCORING.');
  requireThat(now >= timestamp(round.refund_at, 'refund_at'), 'The refund deadline has not passed.');
}
export async function activateRefunds(roundId, { dryRun = false, client = readClient(), signer = signingClient } = {}) {
  identifier(roundId, 'round_id');
  await checkChain(client);
  const round = await read(client, NETWORK.game, 'get_round', [roundId]);
  checkRefundEligibility(round, roundId);
  console.log(json({ chain: NETWORK.chainId, game: NETWORK.game, round_id: roundId, status: round.status, refund_at: round.refund_at }));
  if (dryRun) {
    console.log('DRY RUN: eligible; would call activate_refunds. No key read, fee estimate, signing or write.');
    return round;
  }
  const signed = signer();
  // Recheck immediately before signing, including when another operator races us.
  checkRefundEligibility(await read(signed.client, NETWORK.game, 'get_round', [roundId]), roundId);
  await submit(signed.client, NETWORK.game, 'activate_refunds', [roundId]);
  const updated = await read(client, NETWORK.game, 'get_round', [roundId]);
  requireThat(updated.round_id === roundId && updated.status === 'REFUNDING', 'Post-transaction round is not REFUNDING; inspect before proceeding.');
  console.log('New round status:', updated.status);
  return updated;
}
cli(import.meta.url, async () => {
  const options = argumentsFor(process.argv.slice(2), 1);
  await activateRefunds(options.positional[0], options);
});
