import { isAddress } from "viem";
import { ReceiptClient } from "@/components/receipt-client";
import { PrototypeShell } from "@/components/prototype-shell";

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ roundId: string }>; searchParams: Promise<{ wallet?: string }> }) {
  const { roundId } = await params;
  const { wallet } = await searchParams;
  return <PrototypeShell title="Every call, accounted for." intro="Follow the evidence from the match outcome to your share of each pool."><ReceiptClient roundId={roundId} wallet={wallet && isAddress(wallet) ? wallet : undefined} /></PrototypeShell>;
}
