import { describe, expect, it } from "vitest";
import { MARKET_OPTION_IDS, VALORANT_MARKET_PACK, assertFullGrid, cellIndexForOptionId, createValorantMarketPack, optionIdForCell, optionIndexForId, packGrid, unpackGrid } from "./market-pack";

describe("MEG market pack", () => {
  it("defines nine cells across the three broadcast columns", () => {
    expect(VALORANT_MARKET_PACK.cells).toHaveLength(9);
    expect(VALORANT_MARKET_PACK.cells.map((entry) => entry.column)).toEqual(["TEAM", "MAP", "PLAYER", "TEAM", "MAP", "PLAYER", "TEAM", "MAP", "PLAYER"]);
    expect(VALORANT_MARKET_PACK.cells.every((entry) => entry.options.length === 3)).toBe(true);
  });

  it("keeps labels fixture-configurable without changing cell identity", () => {
    const pack = createValorantMarketPack({ ...VALORANT_MARKET_PACK.fixture, teamA: "Blue Unit", teamB: "Red Unit", teamAShort: "BLU", teamBShort: "RED" });
    expect(pack.cells[0].id).toBe("MEG-01");
    expect(pack.cells[0].options[0].label).toBe("Blue Unit");
    expect(pack.cells[0].options[1].label).toBe("Red Unit");
  });

  it("round-trips a row-major grid through contract serialization", () => {
    const grid = MARKET_OPTION_IDS.filter((_, index) => index % 3 === 1);
    assertFullGrid(grid);
    expect(unpackGrid(packGrid(grid))).toEqual(grid);
    expect(optionIndexForId(optionIdForCell(8, 2))).toBe(2);
    expect(cellIndexForOptionId(optionIdForCell(4, 1))).toBe(4);
  });
});
