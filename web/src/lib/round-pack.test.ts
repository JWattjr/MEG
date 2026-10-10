import { describe, expect, it } from "vitest";
import { VERIFIED_VALORANT_FIXTURE } from "@meg/scoring";
import { roundMarketPack, safeEvidenceUrls } from "./round-pack";
import type { GameRoundRecord, GameRoundResolutionRecord } from "./genlayer-game";

const resolver = "0x1111111111111111111111111111111111111111";
const round = { match_id: "synthetic-only", resolver_address: resolver, kickoff_at: "2030-01-03T01:00:00Z" } as GameRoundRecord;
const record = {
  game_type: "valorant", rule_version: "valorant-bo3-v2", format_name: "BEST_OF_3",
  team_a: "Synthetic A", team_b: "Synthetic B", player_a: "Kestrel", player_b: "Morrow",
  map_1: "Not yet announced", source_references_json: '["https://www.vlr.gg/synthetic-only"]',
} as GameRoundResolutionRecord;

describe("round-specific market packs", () => {
  it("builds v2 from named on-chain metadata, not the accepted fixture", () => {
    const pack = roundMarketPack(round, record, resolver)!;
    expect(pack.id).toBe("valorant");
    expect(pack.fixture.matchId).toBe(round.match_id);
    expect(pack.fixture.scheduledAt).toBe(round.kickoff_at);
    expect(pack.cells[5].options.map((option) => option.label)).toEqual(["Kestrel", "Morrow", "Other / not published"]);
    expect(pack.cells[0].options[0].label).toBe("Synthetic A");
  });
  it.each([
    { rule_version: "unknown" }, { player_a: "" }, { player_b: undefined }, { player_b: "Kestrel" },
    { format_name: "BEST_OF_5" }, { map_1: "" }, { team_b: "Synthetic A" },
  ])("fails closed for unsupported v2 metadata %j", (change) => {
    expect(roundMarketPack(round, { ...record, ...change }, resolver)).toBeNull();
  });
  it("keeps v2 inactive until the correct deployed address is configured", () => {
    expect(roundMarketPack(round, record, "")).toBeNull();
    expect(roundMarketPack(round, record, "0x2222222222222222222222222222222222222222")).toBeNull();
  });
  it("preserves the original legacy fixture without v2 configuration", () => {
    const legacy = { team_a: VERIFIED_VALORANT_FIXTURE.teamA, team_b: VERIFIED_VALORANT_FIXTURE.teamB } as GameRoundResolutionRecord;
    expect(roundMarketPack({ ...round, match_id: VERIFIED_VALORANT_FIXTURE.matchId }, legacy, "")?.fixture.playerA).toBe(VERIFIED_VALORANT_FIXTURE.playerA);
    expect(roundMarketPack(round, legacy, "")).toBeNull();
  });
  it("builds the existing COD branch and rejects unknown COD rules", () => {
    const cod = { ...record, game_type: "call-of-duty", rule_version: "cod-bo5-v1", format_name: "BEST_OF_5" };
    expect(roundMarketPack(round, cod, "")?.id).toBe("call-of-duty");
    expect(roundMarketPack(round, { ...cod, rule_version: "unknown" }, "")).toBeNull();
  });
  it("never falls through unknown metadata into the legacy branch", () => {
    expect(roundMarketPack(round, { ...record, game_type: "unknown" }, resolver)).toBeNull();
    expect(roundMarketPack(null, record, resolver)).toBeNull();
    expect(roundMarketPack(round, null, resolver)).toBeNull();
  });
  it("filters malformed and credential-bearing evidence URLs", () => {
    expect(safeEvidenceUrls('["https://www.vlr.gg/a","http://bad.test","https://u:p@bad.test","https://"]')).toEqual(["https://www.vlr.gg/a"]);
    expect(safeEvidenceUrls("not json")).toEqual([]);
  });
});
