import type { Metadata } from "next";
import { EntriesClient } from "@/components/entries-client";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "My entries · MEG", description: "Inspect MEG entries, settlement state, claims, and refunds." };

export default function EntriesPage() { return <PrototypeShell title="Your grid stays yours." intro="Return to the contract-backed position view to see whether an entry is accepted, final, claimable, or refundable."><EntriesClient /></PrototypeShell>; }
