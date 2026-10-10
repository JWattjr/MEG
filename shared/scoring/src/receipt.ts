import { allocateStake } from "./economics";
import { unpackGrid, optionIndexForId, type MarketPack } from "./market-pack";

type Entry = { packed_grid: bigint; stake_amount: bigint; claimed: boolean; claimable: bigint };
type Round = { status: string; window_0_bitmap: bigint; window_1_bitmap: bigint; window_2_bitmap: bigint; window_0_valid_bitmap?: bigint; window_1_valid_bitmap?: bigint; window_2_valid_bitmap?: bigint };
type Pool = { cell: bigint; total_pool: bigint; winning_stake: bigint; refundable_stake?: bigint };
export type ReceiptCell = { cell: number; question: string; choice: string; result: "WON" | "LOST" | "REFUND" | "PENDING" | "UNAVAILABLE"; stakeWei: string; estimatedReturnWei: string | null; reason: string };

/** Read-only explanation. The contract's claimable amount is always authoritative, including final-claim rounding. */
export function explainEntry(pack: MarketPack, round: Round, entry: Entry, pools: Pool[]): ReceiptCell[] {
  const grid = unpackGrid(entry.packed_grid);
  const allocation = allocateStake(entry.stake_amount);
  const stakes = [allocation.commonPerCell, allocation.mediumPerCell, allocation.rarePerCell];
  const winners = [round.window_0_bitmap, round.window_1_bitmap, round.window_2_bitmap];
  const valid = [round.window_0_valid_bitmap, round.window_1_valid_bitmap, round.window_2_valid_bitmap];
  return grid.map((choice, cell) => {
    const stake = stakes[Math.floor(cell / 3)];
    const base = { cell, question: pack.cells[cell].question, choice: pack.cells[cell].options[optionIndexForId(choice)].label, stakeWei: stake.toString() };
    if (round.status === "REFUNDING") return { ...base, result: "REFUND", estimatedReturnWei: stake.toString(), reason: "Full-round refund; jackpot and platform allocations are also returned by the contract." };
    if (round.status !== "SETTLED") return { ...base, result: "PENDING", estimatedReturnWei: null, reason: "Settlement is not complete." };
    const pool = pools.find((item) => Number(item.cell) === cell);
    const validBitmap = valid[cell % 3];
    if (!pool || validBitmap === undefined) return { ...base, result: "UNAVAILABLE", estimatedReturnWei: null, reason: "Pool or validity state could not be verified." };
    const bit = 1n << BigInt(cell * 3 + optionIndexForId(choice) + 1);
    if ((validBitmap & bit) === 0n || pool.winning_stake === 0n) return { ...base, result: "REFUND", estimatedReturnWei: stake.toString(), reason: (validBitmap & bit) === 0n ? "The selected outcome is invalid; its stake is refundable." : "No winning stake backs this cell; its stake is refundable." };
    if ((winners[cell % 3] & bit) === 0n) return { ...base, result: "LOST", estimatedReturnWei: "0", reason: "This valid prediction did not match the outcome." };
    const payout = (pool.total_pool - (pool.refundable_stake ?? 0n)) * stake / pool.winning_stake;
    return { ...base, result: "WON", estimatedReturnWei: payout.toString(), reason: "Your share of this cell’s distributable pool. Final-claim rounding can change the last wei." };
  });
}
