import type { Metadata } from "next";
import { GenLayerProofClient } from "@/components/genlayer-proof-client";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "GenLayer proof · MEG", description: "Inspect MEG’s nine-cell resolver results and evidence references." };

export default function GenLayerPage() { return <PrototypeShell title="See what consensus decides." intro="The resolver reads approved public text after the series completes. It exposes one strict result for every cell; deterministic contract code then settles balances."><GenLayerProofClient /></PrototypeShell>; }
