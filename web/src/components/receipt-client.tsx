"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { allocateStake, explainEntry, type MarketPack } from "@meg/scoring";
import { formatGen, genLayerGameConfig, readGameRound, readGameEntry, readCellPools, readGameRoundResolution, type GameRoundRecord, type GameEntryRecord, type GameCellPool, type GameRoundResolutionRecord } from "@/lib/genlayer-game";
import { roundMarketPack, safeEvidenceUrls } from "@/lib/round-pack";

type Snapshot = { round: GameRoundRecord; entry: GameEntryRecord | null; pools: GameCellPool[]; resolution: GameRoundResolutionRecord | null; pack: MarketPack | null; observedAt: string };
const explorer = "https://explorer-studio-dev.genlayer.com/address/";

export function ReceiptClient({ roundId, wallet }: { roundId: string; wallet?: `0x${string}` }) {
  const { address } = useAccount();
  const player = wallet ?? address;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const read = ++generation.current;
    await Promise.resolve();
    setLoading(true); setError(""); setSnapshot(null);
    try {
      if (!genLayerGameConfig.enabled) throw new Error("This build is not connected to a MEG game contract.");
      const [round, entry] = await Promise.all([readGameRound(roundId), player ? readGameEntry(player, roundId) : Promise.resolve(null)]);
      if (!round) throw new Error("Round not found. Choose a registered match.");
      const [resolution, pools] = await Promise.all([
        readGameRoundResolution(roundId, round),
        round.status === "SETTLED" && entry ? readCellPools(roundId) : Promise.resolve([]),
      ]);
      if (read !== generation.current) return;
      setSnapshot({ round, entry, pools, resolution, pack: roundMarketPack(round, resolution), observedAt: new Date().toISOString() });
    } catch (caught) { if (read === generation.current) setError(caught instanceof Error ? caught.message : "Could not read this receipt. Try refreshing."); }
    finally { if (read === generation.current) setLoading(false); }
  }, [roundId, player]);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(initial); }, [load]);
  const cells = snapshot?.pack && snapshot.entry ? explainEntry(snapshot.pack, snapshot.round, snapshot.entry, snapshot.pools) : [];
  const allocation = snapshot?.entry ? allocateStake(snapshot.entry.stake_amount) : null;
  const sources = safeEvidenceUrls(snapshot?.resolution?.source_references_json);
  let evidence: Array<{ cell_index: number; outcome_option_index: number | null; status: string; reason_code: string }> = [];
  try {
    const parsed: unknown = JSON.parse(snapshot?.resolution?.cell_results_json ?? "[]");
    if (Array.isArray(parsed)) evidence = parsed.filter((row) => row && typeof row === "object" && Number.isInteger(row.cell_index) && row.cell_index >= 0 && row.cell_index < 9 && (row.outcome_option_index === null || (Number.isInteger(row.outcome_option_index) && row.outcome_option_index >= 0 && row.outcome_option_index < 3)));
  } catch { /* Only verified structured evidence is displayed. */ }
  const download = () => {
    if (!snapshot) return;
    const body = JSON.stringify({ format: "meg-settlement-explanation-v1", chainId: genLayerGameConfig.chainId, gameContract: genLayerGameConfig.contractAddress, wallet: player ?? null, ...snapshot, cells, note: "Read-only explanation of observed contract state. Per-cell returns are estimates; claimable is authoritative. This export is not a signed transaction receipt." }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "meg-settlement.json"; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="receipt-view">
    <div className="feature-toolbar"><Link className="text-link" href="/matches">All matches</Link><button className="feature-button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} />{loading ? "Reading contract…" : "Refresh receipt"}</button><button className="feature-button" onClick={download} disabled={!snapshot}><Download size={15} />Export JSON</button></div>
    {error && <p className="notice-strip" role="alert">{error}</p>}
    {snapshot && <>
      <div className="receipt-summary"><div><h2>{snapshot.pack?.fixture.seriesName ?? snapshot.round.match_id}</h2><p className="wrap-anywhere">{roundId}</p><span className="status-tag">{snapshot.round.status}</span></div><div><span>{snapshot.entry?.claimed ? "Claim already recorded" : "Available to claim"}</span><strong>{snapshot.entry ? `${formatGen(snapshot.entry.claimable)} GEN` : "No wallet entry selected"}</strong><small>Read from the game contract</small></div></div>
      <p>{snapshot.resolution?.evidence_summary || "The resolver has not published an outcome yet."}</p>
      {snapshot.pack && evidence.length > 0 && <details className="technical-details"><summary>All nine consensus outcomes</summary><div className="table-scroll" role="region" aria-label="Consensus outcomes" tabIndex={0}><table className="feature-table"><thead><tr><th scope="col">Market</th><th scope="col">Consensus outcome</th><th scope="col">Evidence decision</th></tr></thead><tbody>{snapshot.pack.cells.map((definition) => {
        const cell = evidence.find((row) => row.cell_index === definition.cellIndex);
        return <tr key={definition.id}><th scope="row">{definition.question}<small>{definition.resolutionRule}</small></th><td>{cell?.status === "RESOLVED" && cell.outcome_option_index !== null ? definition.options[cell.outcome_option_index].label : cell?.status ?? "Not available"}</td><td>{cell?.reason_code?.replaceAll("_", " ").toLowerCase() ?? "No evidence recorded"}</td></tr>;
      })}</tbody></table></div></details>}
      {!player && <p className="notice-strip">Connect a wallet to include your predictions and payout breakdown. The round’s public evidence is available below.</p>}
      {player && !snapshot.entry && <p className="notice-strip">No entry was found for this wallet in this round.</p>}
      {snapshot.entry && !snapshot.pack && <p className="notice-strip">The market definitions for this round could not be verified. No prediction labels or per-cell amounts are inferred.</p>}
      {allocation && <dl className="receipt-allocation"><div><dt>Original stake</dt><dd>{formatGen(allocation.stake)} GEN</dd></div><div><dt>Nine cell pools</dt><dd>{formatGen(allocation.common + allocation.medium + allocation.rare)} GEN</dd></div><div><dt>Jackpot contribution</dt><dd>{formatGen(allocation.jackpot)} GEN</dd></div><div><dt>Platform allocation</dt><dd>{formatGen(allocation.platform)} GEN</dd></div></dl>}
      {cells.length > 0 && <><div className="table-scroll" role="region" aria-label="Per-cell settlement" tabIndex={0}><table className="feature-table"><thead><tr><th scope="col">Your call</th><th scope="col">Result</th><th scope="col">Cell stake</th><th scope="col">Estimated return</th></tr></thead><tbody>{cells.map((cell) => <tr key={cell.cell}><th scope="row"><strong>{cell.question}</strong><span>{cell.choice}</span><small>{cell.reason}</small></th><td><span className={`result-label result-${cell.result.toLowerCase()}`}>{cell.result}</span></td><td>{formatGen(BigInt(cell.stakeWei))} GEN</td><td>{cell.estimatedReturnWei === null ? "Pending" : `${formatGen(BigInt(cell.estimatedReturnWei))} GEN`}</td></tr>)}</tbody></table></div><p className="feature-note">Cell estimates exclude any jackpot payout. The contract’s claimable total includes all entitlements and rounding. For full-round refunds, the jackpot and platform allocations are returned too. After a claim, historical cell estimates are explanations, not another payout.</p></>}
      <section className="receipt-evidence"><h2>Evidence and contract record</h2><dl><dt>Rule version</dt><dd>{snapshot.resolution?.rule_version ?? "Legacy Valorant v1"}</dd><dt>Resolution</dt><dd className="wrap-anywhere">{snapshot.round.resolver_resolution_id}</dd><dt>Resolver status</dt><dd>{snapshot.resolution?.status ?? "Not available"} · {snapshot.resolution?.reason_code ?? "No decision recorded"}</dd><dt>Observed</dt><dd>{snapshot.observedAt}</dd></dl><div className="source-list"><a href={explorer + genLayerGameConfig.contractAddress} target="_blank" rel="noreferrer">Game contract <ExternalLink size={13} /></a><a href={explorer + snapshot.round.resolver_address} target="_blank" rel="noreferrer">Round resolver <ExternalLink size={13} /></a>{sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">Source {index + 1}: {new URL(url).hostname}<ExternalLink size={13} /></a>)}</div><p className="feature-note">This is a snapshot of reported contract state, not proof that a particular transaction has finalized.</p></section>
      <Link className="feature-button" href={`/?round=${encodeURIComponent(roundId)}`}>Open round and claim</Link>
    </>}
  </section>;
}
