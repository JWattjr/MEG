"use client";

import { ArrowRight, CalendarClock, CircleDot, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VERIFIED_VALORANT_FIXTURE } from "@meg/scoring";
import { disclosedBotLabel, formatGen, genLayerGameConfig, readGameRounds, readRoundEntries, type GameRoundRecord } from "@/lib/genlayer-game";

export function MatchesClient() {
  const [rounds, setRounds] = useState<GameRoundRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void readGameRounds().then(setRounds).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read registered Studio Next rounds.")); }, []);

  return <div className="round-list">
    <article className="round-card featured-round">
      <header><span className="status-tag pending">VERIFIED · UPCOMING</span><span className="section-code">VALORANT / BO3</span></header>
      <h2>{VERIFIED_VALORANT_FIXTURE.seriesName}</h2>
      <p>Verified upcoming Valorant Champions fixture. Map 1 remains pending veto; entries unlock through the registered Studio Next round.</p>
      <div className="data-grid"><div><span>Map 1</span><strong>{VERIFIED_VALORANT_FIXTURE.map1}</strong></div><div><span>Starts</span><strong>{formatDate(VERIFIED_VALORANT_FIXTURE.scheduledAt)}</strong></div><div><span>State</span><strong>Awaiting lock</strong></div></div>
      <Link className="text-link" href="/">Open verified board <ArrowRight size={15} /></Link>
    </article>
    {error && <div className="notice-strip" role="alert"><CircleDot size={15} />{error}</div>}
    {genLayerGameConfig.enabled && rounds.length > 0 && rounds.map((round) => <OnchainRoundCard key={round.round_id} round={round} />)}
    {genLayerGameConfig.enabled && !error && rounds.length === 0 && <div className="empty-state"><strong>No registered MEG rounds yet.</strong><span>Fresh Studio Next rounds appear here after a deployer registers the market and evidence policy.</span></div>}
    {!genLayerGameConfig.enabled && <div className="notice-strip"><ShieldCheck size={15} /><span>No MEG Studio Next contract is configured in this local build. Add the fresh addresses from `.env.local` to read real rounds.</span></div>}
  </div>;
}

function OnchainRoundCard({ round }: { round: GameRoundRecord }) {
  const [botLabels, setBotLabels] = useState<string[]>([]);
  useEffect(() => { void readRoundEntries(round.round_id, round.participant_count).then((entries) => setBotLabels(entries.flatMap((entry) => { const label = disclosedBotLabel(entry.player); return label ? [label] : []; }))).catch(() => setBotLabels([])); }, [round.participant_count, round.round_id]);
  return <article className="round-card"><header><span className={`status-tag ${round.status === "OPEN" ? "" : round.status === "REFUNDING" ? "warning" : "pending"}`}>{round.status}</span><span className="section-code">STUDIO NEXT / REGISTERED</span></header><h2>{round.match_id}</h2><p>Contract-registered Valorant market. The round name is shown exactly as stored on-chain.</p><div className="data-grid"><div><span><Users size={11} /> Entries</span><strong>{String(round.participant_count)}</strong></div><div><span><ShieldCheck size={11} /> Jackpot</span><strong>{formatGen(round.jackpot_pool)} GEN</strong></div><div><span><CalendarClock size={11} /> Locks</span><strong>{formatDate(round.lock_at)}</strong></div></div>{botLabels.length > 0 && <p className="notice-strip"><ShieldCheck size={13} />Disclosed automated liquidity: {botLabels.join(" + ")}. Excluded from human rankings.</p>}<Link className="text-link" href={`/?round=${encodeURIComponent(round.round_id)}`}>{round.status === "OPEN" ? "Open registered round" : "View registered state"} <ArrowRight size={15} /></Link></article>;
}

function formatDate(value: string): string { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(parsed) + " UTC"; }
