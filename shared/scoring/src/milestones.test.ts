import { describe, expect, it } from "vitest";
import { createCallOfDutyMarketPack } from "./call-of-duty";
import { MARKET_OPTION_IDS, optionIdForCell, packGrid } from "./market-pack";
import { scoreLeague } from "./leagues";
import { explainEntry } from "./receipt";
import { contractInteger, normalizeContractIntegers } from "./contract-values";

const pack = createCallOfDutyMarketPack();
const gen = 10n ** 18n;
const grid = Array.from({ length: 9 }, (_, cell) => optionIdForCell(cell, 0));
const entry = { packed_grid: packGrid(grid), stake_amount: gen, claimed: false, claimable: 0n };
const score = (player: string, mask: bigint) => ({ player, marked_mask: mask, completed_lines: 0n, jackpot_qualified: false, joined_at: "" });

describe("live contract JSON integers", () => {
  it("keeps exact large stake/grid values and normalizes small score values", () => {
    expect(normalizeContractIntegers({ packed_grid: "481205978662324077571", stake_amount: "1000000000000000000", marked_mask: 0, claimed: false }, ["packed_grid", "stake_amount", "marked_mask"])).toEqual({ packed_grid: 481205978662324077571n, stake_amount: gen, marked_mask: 0n, claimed: false });
  });
  it("rejects already rounded, fractional, negative or malformed amounts", () => {
    for (const value of [Number.MAX_SAFE_INTEGER + 1, -1, -1n, 1.5, "1e18", "NaN", true, undefined]) expect(() => contractInteger(value, "stake")).toThrow();
  });
});

describe("community league scoring", () => {
  it("counts settled calls once per wallet and round, excluding bots and refunded rounds", () => {
    const rows = scoreLeague(["0xA", "0xB", "0xBOT"], [
      { status: "SETTLED", entries: [score("0xa", 3n), score("0xA", 511n), score("0xb", 1025n), score("0xbot", 511n)] },
      { status: "SCORING", entries: [score("0xb", 511n)] },
      { status: "REFUNDING", entries: [score("0xb", 511n)] },
    ], ["0xbot"]);
    expect(rows.map((row) => [row.address, row.points, row.roundsPlayed])).toEqual([["0xa", 2, 1], ["0xb", 1, 1]]);
  });
  it("shares rank for tied scores across the fixed roster", () => {
    expect(scoreLeague(["0xB", "0xA"], []).map((row) => row.rank)).toEqual([1, 1]);
  });
});

describe("Call of Duty and settlement explanations", () => {
  it("uses all 27 existing option IDs without changing the game ABI", () => {
    expect(pack.cells.flatMap((cell) => cell.options.map((option) => option.id))).toEqual(MARKET_OPTION_IDS);
    expect(pack.fixture.mode).toBe("SYNTHETIC");
    expect(pack.fixture.scheduledAt).toBe("");
  });
  it("does not estimate payouts while settlement is in progress", () => {
    const cells = explainEntry(pack, { status: "SCORING", window_0_bitmap: 2n, window_1_bitmap: 0n, window_2_bitmap: 0n }, entry, []);
    expect(cells.every((cell) => cell.result === "PENDING" && cell.estimatedReturnWei === null)).toBe(true);
  });
  it("subtracts refundable stakes from a winning pool and distinguishes loss and invalidity", () => {
    const result = explainEntry(pack, { status: "SETTLED", window_0_bitmap: 2n, window_1_bitmap: 32n, window_2_bitmap: 0n, window_0_valid_bitmap: 14n, window_1_valid_bitmap: 112n, window_2_valid_bitmap: 0n }, entry, [
      { cell: 0n, total_pool: gen / 5n, refundable_stake: gen / 20n, winning_stake: gen / 10n },
      { cell: 1n, total_pool: gen / 10n, winning_stake: gen / 20n },
      { cell: 2n, total_pool: gen / 10n, winning_stake: 0n },
    ]);
    expect(result[0]).toMatchObject({ result: "WON", estimatedReturnWei: (gen * 75n / 1000n).toString() });
    expect(result[1].result).toBe("LOST");
    expect(result[2]).toMatchObject({ result: "REFUND", estimatedReturnWei: (gen / 20n).toString() });
    expect(result[3].result).toBe("UNAVAILABLE");
  });
  it("explains a full refund while leaving the complete amount authoritative on-chain", () => {
    const result = explainEntry(pack, { status: "REFUNDING", window_0_bitmap: 0n, window_1_bitmap: 0n, window_2_bitmap: 0n }, entry, []);
    expect(result.every((cell) => cell.result === "REFUND")).toBe(true);
    expect(result.reduce((sum, cell) => sum + BigInt(cell.estimatedReturnWei!), 0n)).toBe(gen * 90n / 100n);
  });
});
