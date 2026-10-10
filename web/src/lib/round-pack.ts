import { COD_RULE_VERSION, VERIFIED_VALORANT_FIXTURE, createCallOfDutyMarketPack, createValorantMarketPack, type MarketPack, type ValorantFixture } from "@meg/scoring";
import type { GameRoundRecord, GameRoundResolutionRecord } from "./genlayer-game";

export function roundMarketPack(round: GameRoundRecord | null, record: GameRoundResolutionRecord | null): MarketPack | null {
  if (!round || !record || !record.team_a || !record.team_b) return null;
  if (record.game_type === "call-of-duty") {
    if (record.rule_version !== COD_RULE_VERSION || record.format_name !== "BEST_OF_5" || !record.player_a || !record.player_b) return null;
    const sources = safeEvidenceUrls(record.source_references_json);
    const fixture: ValorantFixture = {
      matchId: round.match_id, seriesName: `${record.team_a} vs ${record.team_b}`, teamA: record.team_a, teamB: record.team_b,
      teamAShort: record.team_a, teamBShort: record.team_b, playerA: record.player_a, playerB: record.player_b,
      map1: record.map_1 ?? "Opening Hardpoint", scheduledAt: round.kickoff_at ?? "", format: "BEST_OF_5", mode: "VERIFIED", sourceUrls: sources,
    };
    return createCallOfDutyMarketPack(fixture);
  }
  // Legacy Valorant registrations do not include player/rule metadata. Only
  // the known accepted pack can be displayed without guessing those inputs.
  if (round.match_id !== VERIFIED_VALORANT_FIXTURE.matchId || record.team_a !== VERIFIED_VALORANT_FIXTURE.teamA || record.team_b !== VERIFIED_VALORANT_FIXTURE.teamB) return null;
  return createValorantMarketPack({ ...VERIFIED_VALORANT_FIXTURE, scheduledAt: round.kickoff_at ?? VERIFIED_VALORANT_FIXTURE.scheduledAt, map1: record.map_1 ?? VERIFIED_VALORANT_FIXTURE.map1 });
}

export function safeEvidenceUrls(raw?: string): string[] {
  try {
    const list: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(list)) return [];
    return list.filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value)).filter((value) => { try { return !new URL(value).username && !new URL(value).password; } catch { return false; } });
  } catch { return []; }
}
