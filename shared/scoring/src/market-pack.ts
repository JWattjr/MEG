export const GRID_CELLS = 9;
export const OPTIONS_PER_CELL = 3;

export const MARKET_OPTION_IDS = [
  "CELL_0_OPTION_0", "CELL_0_OPTION_1", "CELL_0_OPTION_2",
  "CELL_1_OPTION_0", "CELL_1_OPTION_1", "CELL_1_OPTION_2",
  "CELL_2_OPTION_0", "CELL_2_OPTION_1", "CELL_2_OPTION_2",
  "CELL_3_OPTION_0", "CELL_3_OPTION_1", "CELL_3_OPTION_2",
  "CELL_4_OPTION_0", "CELL_4_OPTION_1", "CELL_4_OPTION_2",
  "CELL_5_OPTION_0", "CELL_5_OPTION_1", "CELL_5_OPTION_2",
  "CELL_6_OPTION_0", "CELL_6_OPTION_1", "CELL_6_OPTION_2",
  "CELL_7_OPTION_0", "CELL_7_OPTION_1", "CELL_7_OPTION_2",
  "CELL_8_OPTION_0", "CELL_8_OPTION_1", "CELL_8_OPTION_2",
] as const;

export type MarketPackId = "valorant" | "league-of-legends" | "call-of-duty";
export type MarketStatus = "OPEN" | "LOCKED" | "RESOLVING" | "SETTLED" | "REFUNDABLE" | "CANCELLED";
export type CellResolutionStatus = "RESOLVED" | "INVALID";
export type MarketRow = "COMMON" | "MEDIUM" | "RARE";
export type MarketColumn = "TEAM" | "MAP" | "PLAYER";
export type FixtureMode = "SYNTHETIC" | "VERIFIED";
export type MarketOptionId = (typeof MARKET_OPTION_IDS)[number];

export type MarketOption = {
  id: MarketOptionId;
  label: string;
  shortLabel: string;
};

export type CellResolution = {
  cellId: string;
  cellIndex: number;
  outcomeOptionIndex: number | null;
  status: CellResolutionStatus;
  evidenceSummary: string;
  sourceReferences: string[];
  reasonCode: string;
};

export type MarketCellDefinition = {
  id: string;
  cellIndex: number;
  row: MarketRow;
  rowIndex: 0 | 1 | 2;
  column: MarketColumn;
  columnIndex: 0 | 1 | 2;
  rarityLabel: string;
  question: string;
  explanation: string;
  options: readonly [MarketOption, MarketOption, MarketOption];
  resolutionRule: string;
  approvedEvidenceSources: readonly string[];
  mapDependent: boolean;
  status: MarketStatus;
  finalOutcome: number | null;
  invalidReason: string | null;
};

export type ValorantFixture = {
  matchId: string;
  seriesName: string;
  teamA: string;
  teamB: string;
  teamAShort: string;
  teamBShort: string;
  map1: string;
  playerA: string;
  playerB: string;
  format: "BEST_OF_3" | "BEST_OF_5";
  scheduledAt: string;
  mode: FixtureMode;
  sourceUrls: readonly string[];
};

export type MarketPack = {
  id: "valorant";
  name: "Valorant";
  expandedName: "Moment Esports Grid";
  tagline: string;
  rows: readonly MarketRow[];
  columns: readonly MarketColumn[];
  cells: readonly [
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
    MarketCellDefinition,
  ];
  fixture: ValorantFixture;
};

export const ROWS: readonly MarketRow[] = ["COMMON", "MEDIUM", "RARE"];
export const COLUMNS: readonly MarketColumn[] = ["TEAM", "MAP", "PLAYER"];
export const ROW_PERCENTAGES = { COMMON: 5, MEDIUM: 10, RARE: 15 } as const;

export const SYNTHETIC_VALORANT_FIXTURE: ValorantFixture = {
  matchId: "synthetic-meg-valorant-series-001",
  seriesName: "Northstar Wolves vs Arcforge",
  teamA: "Northstar Wolves",
  teamB: "Arcforge",
  teamAShort: "NSW",
  teamBShort: "ARC",
  map1: "Synthetic map 01",
  playerA: "Kestrel",
  playerB: "Morrow",
  format: "BEST_OF_3",
  scheduledAt: "2026-10-03T18:00:00Z",
  mode: "SYNTHETIC",
  sourceUrls: ["https://valorantesports.com/", "https://www.vlr.gg/"],
};

const option = (cellIndex: number, optionIndex: number, label: string, shortLabel = label): MarketOption => ({
  id: MARKET_OPTION_IDS[cellIndex * OPTIONS_PER_CELL + optionIndex],
  label,
  shortLabel,
});

const cell = (
  cellIndex: number,
  row: MarketRow,
  column: MarketColumn,
  question: string,
  explanation: string,
  options: readonly [MarketOption, MarketOption, MarketOption],
  resolutionRule: string,
  fixture: ValorantFixture,
  mapDependent = false,
): MarketCellDefinition => ({
  id: `MEG-${String(cellIndex + 1).padStart(2, "0")}`,
  cellIndex,
  row,
  rowIndex: ROWS.indexOf(row) as 0 | 1 | 2,
  column,
  columnIndex: COLUMNS.indexOf(column) as 0 | 1 | 2,
  rarityLabel: row === "COMMON" ? "Read the shape" : row === "MEDIUM" ? "Read the swing" : "Read the edge",
  question,
  explanation,
  options,
  resolutionRule,
  approvedEvidenceSources: fixture.sourceUrls,
  mapDependent,
  status: "OPEN",
  finalOutcome: null,
  invalidReason: null,
});

export function createValorantMarketPack(fixture: ValorantFixture = SYNTHETIC_VALORANT_FIXTURE): MarketPack {
  const a = fixture.teamA;
  const b = fixture.teamB;
  const as = fixture.teamAShort;
  const bs = fixture.teamBShort;
  return {
    id: "valorant",
    name: "Valorant",
    expandedName: "Moment Esports Grid",
    tagline: "Nine calls. One series. Prove your read.",
    rows: ROWS,
    columns: COLUMNS,
    fixture,
    cells: [
      cell(0, "COMMON", "TEAM", "Who wins the series?", "Pick the team that takes the registered series.", [option(0, 0, a, as), option(0, 1, b, bs), option(0, 2, "No series winner", "VOID")], "Use the final series score. A cancelled or unplayed series is invalid.", fixture),
      cell(1, "COMMON", "MAP", `Who wins ${fixture.map1}?`, "A clean early read on the first map.", [option(1, 0, a, as), option(1, 1, b, bs), option(1, 2, "Map not played", "VOID")], "Use the final Map 1 result. If Map 1 was not played, mark this cell INVALID.", fixture, true),
      cell(2, "COMMON", "PLAYER", "Which team has the match top fragger?", "Team-level read on the highest kill total in the series.", [option(2, 0, a, as), option(2, 1, b, bs), option(2, 2, "Tie / not published", "OTHER")], "Compare published player kill totals across the completed series; ties or missing totals use option 2 only when supported.", fixture),
      cell(3, "MEDIUM", "TEAM", "What is the exact series score?", "Choose the best-of-three finish before the veto begins.", [option(3, 0, `${as} 2–0`, `${as} 2–0`), option(3, 1, `${as} 2–1`, `${as} 2–1`), option(3, 2, `${bs} 2–1`, `${bs} 2–1`)], "Read the final map score and map count. A different format or incomplete series is invalid.", fixture),
      cell(4, "MEDIUM", "MAP", `How many total rounds on ${fixture.map1}?`, "Round volume is the pressure signal.", [option(4, 0, "19 or fewer", "≤19"), option(4, 1, "20–24 rounds", "20–24"), option(4, 2, "25 or more", "25+")], "Count completed regulation and overtime rounds on Map 1. If Map 1 was not played, mark this cell INVALID.", fixture, true),
      cell(5, "MEDIUM", "PLAYER", "Who is the match top fragger?", "Call the player, not just the team, with the highest series kill total.", [option(5, 0, fixture.playerA, fixture.playerA), option(5, 1, fixture.playerB, fixture.playerB), option(5, 2, "Other / not published", "OTHER")], "Compare the completed series’ published kill totals. Missing or conflicting player totals are INVALID.", fixture),
      cell(6, "RARE", "TEAM", "Does the series contain a reverse sweep?", "The rarest comeback line on a best-of-three board.", [option(6, 0, "No reverse sweep", "NO"), option(6, 1, `${as} reverse sweeps`, `${as} SWEEP`), option(6, 2, `${bs} reverse sweeps`, `${bs} SWEEP`)], "Use the ordered map results. A reverse sweep requires the eventual winner to lose the first map and win the next two.", fixture),
      cell(7, "RARE", "MAP", "Does any map reach overtime?", "One round can turn the entire board.", [option(7, 0, "No map reaches overtime", "NO OT"), option(7, 1, "At least one map reaches overtime", "OT"), option(7, 2, "Overtime not published", "UNKNOWN")], "Inspect map-by-map round scores. Missing overtime data is INVALID, not FALSE.", fixture, true),
      cell(8, "RARE", "PLAYER", "What is the top fragger kill range?", "A high-variance player ceiling call.", [option(8, 0, "35 kills or fewer", "≤35"), option(8, 1, "36–45 kills", "36–45"), option(8, 2, "46 kills or more", "46+")], "Use the highest published player kill total for the completed series; absent totals are INVALID.", fixture),
    ],
  };
}

export const VALORANT_MARKET_PACK = createValorantMarketPack();

export function optionIdForCell(cellIndex: number, optionIndex: number): MarketOptionId {
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= GRID_CELLS || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= OPTIONS_PER_CELL) throw new Error("Market option is outside the MEG grid.");
  return MARKET_OPTION_IDS[cellIndex * OPTIONS_PER_CELL + optionIndex];
}

export function optionIndexForId(id: MarketOptionId): number {
  const index = MARKET_OPTION_IDS.indexOf(id);
  if (index < 0) throw new Error(`Unknown MEG market option ${id}.`);
  return index % OPTIONS_PER_CELL;
}

export function cellIndexForOptionId(id: MarketOptionId): number {
  const index = MARKET_OPTION_IDS.indexOf(id);
  if (index < 0) throw new Error(`Unknown MEG market option ${id}.`);
  return Math.floor(index / OPTIONS_PER_CELL);
}

export function assertFullGrid(grid: MarketOptionId[]): void {
  if (grid.length !== GRID_CELLS || grid.some((id, index) => cellIndexForOptionId(id) !== index)) throw new Error("A MEG grid must contain one option from each of the nine cells.");
}

export function packGrid(grid: MarketOptionId[]): bigint {
  assertFullGrid(grid);
  return grid.reduce((packed, id, cellIndex) => packed | (BigInt(cellIndex * OPTIONS_PER_CELL + optionIndexForId(id) + 1) << BigInt(cellIndex * 8)), 0n);
}

export function unpackGrid(packedGrid: bigint): MarketOptionId[] {
  const grid: MarketOptionId[] = [];
  for (let cellIndex = 0; cellIndex < GRID_CELLS; cellIndex += 1) {
    const optionId = Number((packedGrid >> BigInt(cellIndex * 8)) & 0xffn);
    if (optionId < 1 || optionId > MARKET_OPTION_IDS.length) throw new Error(`Packed MEG grid contains unknown option ${optionId}.`);
    const id = MARKET_OPTION_IDS[optionId - 1];
    if (cellIndexForOptionId(id) !== cellIndex) throw new Error("Packed MEG grid contains an option in the wrong cell.");
    grid.push(id);
  }
  if (packedGrid >> 72n) throw new Error("Packed MEG grid contains extra data.");
  return grid;
}

export function optionBitmap(cellIndex: number, optionIndex: number): bigint {
  return 1n << BigInt(cellIndex * OPTIONS_PER_CELL + optionIndex + 1);
}

export function cellPoolPercentage(cellIndex: number): number {
  return [ROW_PERCENTAGES.COMMON, ROW_PERCENTAGES.MEDIUM, ROW_PERCENTAGES.RARE][Math.floor(cellIndex / 3)];
}
