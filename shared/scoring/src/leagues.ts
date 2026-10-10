export type LeagueScoringEntry = { player?: string; marked_mask: bigint; completed_lines: bigint; jackpot_qualified: boolean; joined_at: string };
export type LeagueScore = { address: string; points: number; correctCalls: number; roundsPlayed: number; rank: number };

/** Equal weight per correct call. Only final, settled rounds contribute. Stakes never buy league points. */
export function scoreLeague(members: string[], rounds: Array<{ status: string; entries: LeagueScoringEntry[] }>, excluded: string[] = []): LeagueScore[] {
  const excludedSet = new Set(excluded.map((address) => address.toLowerCase()));
  const scores = new Map<string, LeagueScore>();
  for (const member of members) {
    const address = member.toLowerCase();
    if (!excludedSet.has(address)) scores.set(address, { address, points: 0, correctCalls: 0, roundsPlayed: 0, rank: 0 });
  }
  for (const round of rounds) {
    if (round.status !== "SETTLED") continue;
    const seen = new Set<string>();
    for (const entry of round.entries) {
      const address = entry.player?.toLowerCase() ?? "";
      const score = scores.get(address);
      if (!score || seen.has(address)) continue;
      seen.add(address);
      const correct = Number(entry.marked_mask & 511n).toString(2).replace(/0/g, "").length;
      score.correctCalls += correct;
      score.points += correct;
      score.roundsPlayed += 1;
    }
  }
  const ordered = [...scores.values()].sort((a, b) => b.points - a.points || a.address.localeCompare(b.address));
  ordered.forEach((score, index) => { score.rank = index > 0 && score.points === ordered[index - 1].points ? ordered[index - 1].rank : index + 1; });
  return ordered;
}
