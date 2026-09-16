import type { Metadata } from "next";
import { MatchesClient } from "@/components/matches-client";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "Matches · MEG", description: "Review synthetic and registered Valorant series for Moment Esports Grid." };

export default function MatchesPage() { return <PrototypeShell title="Choose the series." intro="Start with the clearly labeled local fixture, or inspect a real MEG round only after it has been registered on StudioNet."><MatchesClient /></PrototypeShell>; }
