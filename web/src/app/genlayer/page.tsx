import type { Metadata } from "next";
import { ReceiptClient } from "@/components/receipt-client";
import { genLayerGameConfig } from "@/lib/genlayer-game";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "GenLayer proof · MEG", description: "Inspect MEG’s nine-cell resolver results and evidence references." };

export default async function GenLayerPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const { round } = await searchParams;
  return <PrototypeShell title="See what consensus decides." intro="Read this round’s evidence, predictions and settlement amounts directly from its contracts."><ReceiptClient roundId={round ?? genLayerGameConfig.roundId} /></PrototypeShell>;
}
