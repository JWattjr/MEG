"use client";

import { ArrowRight, LockKeyhole, ShieldCheck, TriangleAlert, WalletCards } from "lucide-react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { formatGen, genLayerGameConfig } from "@/lib/genlayer-game";
import { useOnchainGame } from "@/lib/use-onchain-game";

export function EntriesClient() {
  const { address } = useAccount();
  const game = useOnchainGame();
  if (!address) return <div className="empty-state"><WalletCards size={20} /><strong>Connect a wallet to inspect your entry.</strong><span>MEG never asks for a private key. Your wallet address is only used to read its registered StudioNet position.</span></div>;
  if (!genLayerGameConfig.activeRoundEnabled) return <div className="empty-state"><ShieldCheck size={20} /><strong>No MEG round is connected.</strong><span>This build has no fresh StudioNet game address and round id configured yet.</span><Link className="text-link" href="/matches">Review match setup <ArrowRight size={15} /></Link></div>;
  if (game.error) return <div className="notice-strip" role="alert"><TriangleAlert size={15} />{game.error}</div>;
  if (!game.entry) return <div className="empty-state"><LockKeyhole size={20} /><strong>No entry for this round.</strong><span>Build a nine-call grid, review the GEN allocation, and sign only when the wallet request matches your intent.</span><Link className="text-link" href="/">Build a grid <ArrowRight size={15} /></Link></div>;
  const status = game.round?.status ?? "OPEN";
  return <div className="entries-stack"><article className="entry-card"><header><span className={`status-tag ${status === "REFUNDING" ? "warning" : status === "SETTLED" ? "" : "pending"}`}>{status}</span><span className="section-code">WALLET POSITION</span></header><h2>{status === "SETTLED" ? "Settlement is ready to read." : status === "REFUNDING" ? "Refund is available." : "Your grid is locked."}</h2><p>{game.config.entryAcceptedNote} The contract is authoritative; local previews do not alter this state.</p><div className="data-grid"><div><span>Stake</span><strong>{formatGen(game.entry.stake_amount)} GEN</strong></div><div><span>Correct cells</span><strong>{game.entry.marked_mask.toString(2).replace(/0/g, "").length} / 9</strong></div><div><span>Claimable</span><strong>{formatGen(game.entry.claimable)} GEN</strong></div></div>{game.entry.claimable > 0n && <button className="primary-control" type="button" onClick={() => void game.claim()} disabled={game.busy}>Claim {status === "REFUNDING" ? "refund" : "payout"}<WalletCards size={15} /></button>}<details className="technical-details"><summary>Entry transaction state</summary><p className="mono">{game.transactionHash ?? "Entry hash is available from the connected wallet"}</p></details></article></div>;
}
