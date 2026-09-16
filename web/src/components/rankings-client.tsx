"use client";

import { Medal, ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { disclosedBotLabel, genLayerGameConfig, readGameRounds, readRoundEntries } from "@/lib/genlayer-game";

type Rank = { address: string; score: number; lines: number; entries: number };

export function RankingsClient() {
  const [rankings, setRankings] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!genLayerGameConfig.enabled) return;
    const timer = window.setTimeout(() => {
      void readGameRounds().then(async (rounds) => {
        const entries = (await Promise.all(rounds.map((round) => readRoundEntries(round.round_id, round.participant_count)))).flat();
        const humanEntries = entries.filter((entry) => !disclosedBotLabel(entry.player));
        const byWallet = new Map<string, Rank>();
        humanEntries.forEach((entry) => {
          const key = entry.player ?? "unknown";
          const current = byWallet.get(key) ?? { address: key, score: 0, lines: 0, entries: 0 };
          current.score += Number(entry.completed_lines) * 10 + (entry.jackpot_qualified ? 25 : 0);
          current.lines += Number(entry.completed_lines);
          current.entries += 1;
          byWallet.set(key, current);
        });
        setRankings([...byWallet.values()].sort((left, right) => right.score - left.score).slice(0, 20));
      }).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to read human rankings.")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!genLayerGameConfig.enabled) return <div className="empty-state"><Trophy size={20} /><strong>Rankings wait for settled rounds.</strong><span>No live leaderboard is fabricated in preview mode. Configure a fresh MEG StudioNet game to index human entries.</span></div>;
  if (loading) return <div className="empty-state"><ShieldCheck size={20} /><strong>Reading settled entries…</strong><span>Only contract-indexed entries are considered.</span></div>;
  if (error) return <div className="notice-strip" role="alert"><ShieldCheck size={15} />{error}</div>;
  if (rankings.length === 0) return <div className="empty-state"><Medal size={20} /><strong>No human entries yet.</strong><span>Disclosed automated liquidity is excluded from this list by design.</span></div>;
  return <div className="ranking-stack">{rankings.map((rank, index) => <article className="ranking-card" key={rank.address}><span className="ranking-place">{String(index + 1).padStart(2, "0")}</span><div><strong>{shortAddress(rank.address)}</strong><small>{rank.entries} entry{rank.entries === 1 ? "" : "ies"} · {rank.lines} completed line{rank.lines === 1 ? "" : "s"}</small></div><b className="ranking-score">{rank.score}</b></article>)}</div>;
}

function shortAddress(address: string): string { return address.length > 13 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address; }
