import { LeaguesClient } from "@/components/leagues-client";
import { PrototypeShell } from "@/components/prototype-shell";
export default function LeaguesPage() {
  return <PrototypeShell title="Your squad. One season." intro="Invite your friends and compete across registered matches. Correct calls decide the standings."><LeaguesClient /></PrototypeShell>;
}
