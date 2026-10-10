import { COLUMNS, ROWS, MARKET_OPTION_IDS, type MarketPack, type MarketCellDefinition, type ValorantFixture } from "./market-pack";

export const COD_RULE_VERSION = "cod-bo5-v1";
export const COD_PREVIEW_FIXTURE: ValorantFixture = {
  matchId: "synthetic-cod-preview", seriesName: "Northstar vs Arcforge", teamA: "Northstar", teamB: "Arcforge",
  teamAShort: "NS", teamBShort: "ARC", playerA: "Kestrel", playerB: "Morrow", map1: "Opening Hardpoint",
  format: "BEST_OF_5", scheduledAt: "", mode: "SYNTHETIC", sourceUrls: [],
};

/** Indices and thresholds are the public ABI of cod_match_resolver.py. */
export function createCallOfDutyMarketPack(fixture: ValorantFixture = COD_PREVIEW_FIXTURE): MarketPack {
  if (fixture.format !== "BEST_OF_5") throw new Error("The Call of Duty pack supports best-of-five series only.");
  const { teamA: a, teamB: b, playerA, playerB } = fixture;
  const definitions: Array<[string, [string, string, string], string]> = [
    ["Who wins the series?", [a, b, "No winner / void"], "Final BO5 series winner. Cancelled, forfeited or unplayed series are refunded."],
    ["Who wins the opening map?", [a, b, "Map not played"], "Winner of the first completed map. Unplayed or unsupported maps are invalid."],
    ["Which team has the top fragger?", [a, b, "Tie across teams"], "Compare complete individual kill totals over all played maps. Missing totals are invalid."],
    ["How many maps are played?", ["Three maps", "Four maps", "Five maps"], "Count completed maps in a fully played BO5. A forfeit is invalid."],
    ["Opening Hardpoint total score?", ["349 or fewer", "350–449", "450 or more"], "Sum both teams’ final scores on map 1. Map 1 must be Hardpoint; otherwise invalid."],
    ["Who is the series top fragger?", [playerA, playerB, "Other player / tie"], "Unique highest kill total across all maps. A proven tie or another winner uses option 3; missing data is invalid."],
    ["Who completes a reverse sweep?", ["No reverse sweep", a, b], "A reverse sweep means losing maps 1 and 2, then winning maps 3, 4 and 5."],
    ["First Search & Destroy round count?", ["Seven or fewer", "Eight to ten", "Eleven or more"], "Sum both scores in the first completed Search & Destroy map. No published map is invalid."],
    ["Top fragger’s total kills?", ["79 or fewer", "80–99", "100 or more"], "Highest player kill total across the full series. Incomplete player statistics are invalid."],
  ];
  const cells = definitions.map(([question, labels, resolutionRule], index): MarketCellDefinition => ({
    id: `COD-${String(index + 1).padStart(2, "0")}`, cellIndex: index,
    row: ROWS[Math.floor(index / 3)], rowIndex: Math.floor(index / 3) as 0 | 1 | 2,
    column: COLUMNS[index % 3], columnIndex: index % 3 as 0 | 1 | 2,
    rarityLabel: ["Read the shape", "Read the swing", "Read the edge"][Math.floor(index / 3)],
    question, explanation: resolutionRule, resolutionRule,
    options: labels.map((label, option) => ({ id: MARKET_OPTION_IDS[index * 3 + option], label, shortLabel: label })) as unknown as MarketCellDefinition["options"],
    approvedEvidenceSources: fixture.sourceUrls, mapDependent: index % 3 === 1,
    status: "OPEN", finalOutcome: null, invalidReason: null,
  })) as unknown as MarketPack["cells"];
  return { id: "call-of-duty", name: "Call of Duty", expandedName: "Moment Esports Grid", tagline: "Nine calls. Five maps. Prove your read.", rows: ROWS, columns: COLUMNS, cells, fixture };
}
