"use client";

import { ExternalLink, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VALORANT_MARKET_PACK, type CellResolution } from "@meg/scoring";
import { genLayerGameConfig, readGameRoundResolution, type GameRoundResolutionRecord } from "@/lib/genlayer-game";

type RawCell = { cell_id?: string; cell_index?: number; outcome_option_index?: number | null; status?: "RESOLVED" | "INVALID"; evidence_summary?: string; source_references?: string[]; reason_code?: string };

export function GenLayerProofClient() {
  const [record, setRecord] = useState<GameRoundResolutionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!genLayerGameConfig.enabled) return;
    setLoading(true);
    setError("");
    try {
      setRecord(await readGameRoundResolution());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read the MEG resolver state.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const cells = useMemo(() => parseCells(record), [record]);
  const sources = useMemo(() => { try { return record ? JSON.parse(record.source_references_json) as string[] : VALORANT_MARKET_PACK.fixture.sourceUrls as string[]; } catch { return []; } }, [record]);
  if (!genLayerGameConfig.enabled) return <div className="proof-stack"><div className="proof-status"><ShieldCheck size={22} /><div><strong>Proof surface is ready.</strong><p>No resolver address is configured, so there is no on-chain state to display. Synthetic fixture cells below remain pending by design.</p></div></div><CellProofList cells={[]} /><div className="notice-strip"><TriangleAlert size={15} />Configure a fresh MEG resolver and game contract before calling this a live proof view.</div></div>;
  return <div className="proof-stack"><div className="proof-status"><ShieldCheck size={22} /><div><strong>{record?.status === "SETTLED" ? "Consensus persisted." : "Awaiting consensus."}</strong><p>{record ? `${record.match_status} · ${record.reason_code || "No reason recorded yet"} · ${record.evidence_summary || "The resolver has not produced a cell result."}` : "Reading the registered MEG resolution from StudioNet."}</p></div><button className="icon-button" type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh proof state"><RefreshCw size={15} /></button></div>{error && <div className="notice-strip" role="alert"><TriangleAlert size={15} />{error}</div>}<CellProofList cells={cells} /><div className="source-list">{sources.map((source) => <a href={source} key={source} target="_blank" rel="noreferrer">{new URL(source).hostname}<ExternalLink size={11} /></a>)}</div>{record && <details className="technical-details"><summary>Resolver record / contract data</summary><pre>{JSON.stringify(record, null, 2)}</pre></details>}</div>;
}

function parseCells(record: GameRoundResolutionRecord | null): CellResolution[] {
  if (!record?.cell_results_json) return [];
  try {
    return (JSON.parse(record.cell_results_json) as RawCell[]).map((entry, index) => ({ cellId: entry.cell_id ?? `MEG-${String((entry.cell_index ?? index) + 1).padStart(2, "0")}`, cellIndex: entry.cell_index ?? index, outcomeOptionIndex: entry.outcome_option_index ?? null, status: entry.status ?? "INVALID", evidenceSummary: entry.evidence_summary ?? "No evidence summary recorded.", sourceReferences: entry.source_references ?? [], reasonCode: entry.reason_code ?? "UNKNOWN" }));
  } catch { return []; }
}

function CellProofList({ cells }: { cells: CellResolution[] }) {
  return <div className="cell-proof-list">{VALORANT_MARKET_PACK.cells.map((definition) => { const result = cells.find((candidate) => candidate.cellIndex === definition.cellIndex); const label = result?.status === "RESOLVED" && result.outcomeOptionIndex !== null ? definition.options[result.outcomeOptionIndex]?.label ?? "Resolved option" : result?.status === "INVALID" ? "Invalid · refundable" : "Pending registration"; const tone = result?.status === "RESOLVED" ? "" : result?.status === "INVALID" ? "invalid" : "pending"; return <article className="cell-proof" key={definition.id}><span>{definition.id}<br />{definition.row}</span><div><strong>{definition.question}</strong><small>{result?.evidenceSummary ?? "The resolver will expose a strict cell result after persisted consensus."}</small></div><b className={`proof-pill ${tone}`}>{label}</b></article>; })}</div>;
}
