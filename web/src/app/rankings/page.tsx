import type { Metadata } from "next";
import { RankingsClient } from "@/components/rankings-client";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "Rankings · MEG", description: "Human rankings indexed from settled MEG entries." };

export default function RankingsPage() { return <PrototypeShell title="Best reads rise." intro="Rankings use contract-indexed human entries only. Disclosed liquidity bots never appear as organic players."><RankingsClient /></PrototypeShell>; }
