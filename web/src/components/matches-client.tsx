"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { genLayerGameConfig, readGameRounds, readGameRoundResolution, type GameRoundRecord } from "@/lib/genlayer-game";
import { roundMarketPack } from "@/lib/round-pack";
import type { MarketPack } from "@meg/scoring";

export function MatchesClient() {
  const [records, setRecords] = useState<Array<{ round: GameRoundRecord; pack: MarketPack | null }>>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const load = useCallback(async () => {
    await Promise.resolve();
    setNow(Date.now());
    setLoading(true); setError("");
    try {
      const rounds = await readGameRounds();
      const next = await Promise.all(rounds.map(async (round) => {
        try {
          const resolution = await readGameRoundResolution(round.round_id, round);
          return { round, pack: roundMarketPack(round, resolution) };
        } catch { return { round, pack: null }; }
      }));
      setRecords(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load matches. Try refreshing."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); const timer = window.setInterval(() => setNow(Date.now()), 15_000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [load]);
  const visible = records.filter(({ pack }) => filter === "all" || pack?.id === filter);
  return <section>
    <div className="feature-toolbar"><Link className="feature-button" href="/?game=call-of-duty">Try the Call of Duty board</Link><Link className="feature-button" href="/leagues">Community leagues</Link><button className="feature-button" disabled={loading} onClick={() => void load()}><RefreshCw size={14} />Refresh matches</button></div>
    <div className="feature-tabs" aria-label="Filter matches by game">{[["all", "All games"], ["valorant", "Valorant"], ["call-of-duty", "Call of Duty"]].map(([id, label]) => <button className="feature-button" aria-pressed={filter === id} key={id} onClick={() => setFilter(id)}>{label}</button>)}</div>
    {loading && <p role="status">Reading registered matches…</p>}{error && <p className="notice-strip" role="alert">{error}</p>}
    {!loading && !error && visible.length === 0 && <p className="notice-strip">{genLayerGameConfig.enabled ? "No registered matches for this selection yet. The practice board lets you explore the rules without staking." : "The game contract is not connected in this build. Practice boards remain available."}</p>}
    <div className="round-list">{visible.map(({ round, pack }) => {
      const open = round.status === "OPEN" && now < Date.parse(round.lock_at);
      return <article className="round-card" key={round.round_id}><header><span className="status-tag">{open ? "OPEN" : round.status === "OPEN" ? "LOCKED" : round.status}</span><span>{pack?.name ?? "Unverified pack"}</span></header><h2>{pack?.fixture.seriesName ?? round.match_id}</h2><p>{pack ? pack.fixture.format.replace("BEST_OF_", "Best of ") + " · " + String(round.participant_count) + " entries" : "Market definitions need verification before new entries are enabled."}</p><p>Locks {new Date(round.lock_at).toLocaleString()}</p><div className="match-actions"><Link className="text-link" href={"/?round=" + encodeURIComponent(round.round_id)}>{open && pack ? "Make your calls" : "View round"}</Link><Link className="text-link" href={"/receipts/" + encodeURIComponent(round.round_id)}>Settlement receipt</Link></div></article>;
    })}</div>
    <p className="feature-note">Only contract-registered matches appear here. Practice boards are synthetic and cannot accept a stake.</p>
  </section>;
}
