import type { Metadata } from "next";
import { EntriesClient } from "@/components/entries-client";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "My entries · MEG", description: "Inspect MEG entries, settlement state, claims, and refunds." };

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const { round } = await searchParams;
  return <PrototypeShell title="Your grid stays yours." intro="Read your selected round’s entry, claim or refund. Choose another round from Matches."><EntriesClient key={round ?? "default"} roundId={round} /></PrototypeShell>;
}
