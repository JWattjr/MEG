import type { Metadata } from "next";
import { MatchesClient } from "@/components/matches-client";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "Matches · MEG", description: "Valorant and Call of Duty rounds, results and settlement receipts." };

export default function MatchesPage() { return <PrototypeShell title="Choose the series." intro="Make your calls on registered Valorant and Call of Duty matches, or inspect the evidence behind completed rounds."><MatchesClient /></PrototypeShell>; }
