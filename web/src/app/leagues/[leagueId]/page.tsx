import { LeaguesClient } from "@/components/leagues-client";
import { PrototypeShell } from "@/components/prototype-shell";
export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  return <PrototypeShell title="The season desk." intro="Track your roster, matches and settled predictions in one place."><LeaguesClient key={leagueId} leagueId={leagueId} /></PrototypeShell>;
}
