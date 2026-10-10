"use client";

import type { MarketOptionId } from "@meg/scoring";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import {
  activateGameRefunds,
  claimGamePayout,
  dispatchGameResolution,
  enterGameRound,
  genLayerGameConfig,
  parseStake,
  processGameSettlement,
  readGameEntry,
  readGameRound,
  readGameRoundResolution,
  resolveGameRound,
  type GameEntryRecord,
  type GameRoundRecord,
  type GameRoundResolutionRecord,
  waitForGameTransactionFinality,
} from "./genlayer-game";
import type { GenLayerProvider } from "./genlayer-game";
import { roundMarketPack } from "./round-pack";

export type OnchainGameAction = "IDLE" | "ENTERING" | "RESOLVING" | "DISPATCHING" | "PROCESSING" | "REFUNDING" | "CLAIMING" | "ACCEPTED" | "FINALIZED" | "ERROR";
export type TransactionStage = "IDLE" | "SUBMITTED" | "CONSENSUS" | "ACCEPTED" | "FINALIZED" | "FAILED";
type Operation = (account: `0x${string}`, provider: GenLayerProvider, onSubmitted: (hash: `0x${string}`) => void) => Promise<`0x${string}`>;

function explainTransactionError(caught: unknown, fallback: string): string {
  const message = caught instanceof Error ? caught.message : typeof caught === "string" ? caught : "";
  if (/nonce is not consistent|tx nonce/i.test(message)) {
    return "Studio Next rejected a stale wallet nonce. No entry was created. Remove and re-add Studio Next with RPC https://studio-dev.genlayer.com/api, reconnect, and retry once.";
  }
  return message || fallback;
}

export function useOnchainGame(selectedRoundId = genLayerGameConfig.roundId) {
  const { address, connector } = useAccount();
  const [round, setRound] = useState<GameRoundRecord | null>(null);
  const [entry, setEntry] = useState<GameEntryRecord | null>(null);
  const [resolution, setResolution] = useState<GameRoundResolutionRecord | null>(null);
  const [action, setAction] = useState<OnchainGameAction>("IDLE");
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("IDLE");
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const [now, setNow] = useState(0);
  const mounted = useRef(true);
  const readGeneration = useRef(0);
  const readContext = useRef("");

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, []);

  const refresh = useCallback(async () => {
    const generation = ++readGeneration.current;
    const context = `${address ?? ""}:${selectedRoundId}`;
    if (readContext.current !== context) {
      readContext.current = context;
      setRound(null); setEntry(null); setResolution(null);
      setTransactionHash(null); setTransactionStage("IDLE"); setAction("IDLE");
    }
    if (!genLayerGameConfig.enabled || !selectedRoundId) return;
    const [nextRound, nextEntry] = await Promise.all([
      readGameRound(selectedRoundId),
      address ? readGameEntry(address, selectedRoundId) : Promise.resolve(null),
    ]);
    const nextResolution = await readGameRoundResolution(selectedRoundId, nextRound);
    if (!mounted.current || readGeneration.current !== generation) return;
    setRound(nextRound);
    setEntry(nextEntry);
    setResolution(nextResolution);
    setNow(Date.now());
    setError("");
  }, [address, selectedRoundId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await refresh();
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to read the on-chain game round.");
      }
    };
    void load();
    // One refresh reads only the state used by the current UI. A one-minute
    // cadence keeps the complete entry view courteous to public RPC limits on
    // Studio Next.
    const timer = window.setInterval(() => void load(), 60_000);
    // This counter invalidates pending RPC responses; it is not a DOM ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { active = false; readGeneration.current++; window.clearInterval(timer); };
  }, [refresh]);

  const provider = useCallback(async (): Promise<GenLayerProvider> => {
    if (!address) throw new Error("Connect a wallet before signing the on-chain transaction.");
    const nextProvider = await connector?.getProvider();
    if (!nextProvider) throw new Error("The connected wallet did not expose a signing provider.");
    return nextProvider as GenLayerProvider;
  }, [address, connector]);

  const run = useCallback(async (
    nextAction: Exclude<OnchainGameAction, "IDLE" | "ACCEPTED" | "FINALIZED" | "ERROR">,
    operation: Operation,
  ): Promise<boolean> => {
    const context = `${address ?? ""}:${selectedRoundId}`;
    const current = () => mounted.current && readContext.current === context;
    setAction(nextAction);
    setTransactionStage("IDLE");
    setError("");
    try {
      if (!address) throw new Error("Connect a wallet before signing the on-chain transaction.");
      const hash = await operation(address, await provider(), (submittedHash) => {
        if (!current()) return;
        setTransactionHash(submittedHash);
        setTransactionStage("SUBMITTED");
        window.setTimeout(() => { if (current()) setTransactionStage((stage) => stage === "SUBMITTED" ? "CONSENSUS" : stage); }, 700);
      });
      if (!current()) return false;
      setTransactionHash(hash);
      setTransactionStage("FINALIZED");
      setAction("FINALIZED");
      await refresh();
      return true;
    } catch (caught) {
      if (!current()) return false;
      setAction("ERROR");
      setTransactionStage("FAILED");
      setError(explainTransactionError(caught, "The GenLayer transaction failed."));
      return false;
    }
  }, [address, provider, refresh, selectedRoundId]);

  const runAcceptedEntry = useCallback(async (
    operation: Operation,
  ): Promise<boolean> => {
    const context = `${address ?? ""}:${selectedRoundId}`;
    const current = () => mounted.current && readContext.current === context;
    setAction("ENTERING");
    setTransactionStage("IDLE");
    setError("");
    try {
      if (!address) throw new Error("Connect a wallet before signing the on-chain transaction.");
      const hash = await operation(address, await provider(), (submittedHash) => {
        if (!current()) return;
        setTransactionHash(submittedHash);
        setTransactionStage("SUBMITTED");
        window.setTimeout(() => { if (current()) setTransactionStage((stage) => stage === "SUBMITTED" ? "CONSENSUS" : stage); }, 700);
      });
      if (!current()) return false;
      setTransactionHash(hash);
      setTransactionStage("ACCEPTED");
      setAction("ACCEPTED");
      await refresh();
      void waitForGameTransactionFinality(hash).then(async () => {
        if (!current()) return;
        setTransactionStage("FINALIZED");
        setAction("FINALIZED");
        await refresh();
      }).catch(() => {
        // Acceptance remains visible and authoritative as provisional state.
        // A later page load or manual refresh can recover from an interrupted
        // browser-side finality watcher without resubmitting the entry.
      });
      return true;
    } catch (caught) {
      if (!current()) return false;
      setAction("ERROR");
      setTransactionStage("FAILED");
      setError(explainTransactionError(caught, "The GenLayer transaction failed."));
      return false;
    }
  }, [address, provider, refresh, selectedRoundId]);

  const enter = useCallback(async (grid: MarketOptionId[], stakeInput: string) => {
    try {
      if (!roundMarketPack(round, resolution)) throw new Error("This round’s market rules could not be verified. Refresh before signing.");
      if (!round || round.status !== "OPEN" || Date.now() >= Date.parse(round.lock_at)) throw new Error("This round is locked. Choose an upcoming match.");
      const stake = parseStake(stakeInput, round?.minimum_stake, round?.maximum_stake);
      return runAcceptedEntry((account, signingProvider, onSubmitted) => (
        enterGameRound(account, signingProvider, grid, stake, selectedRoundId, onSubmitted)
      ));
    } catch (caught) {
      setAction("ERROR");
      setTransactionStage("FAILED");
      setError(caught instanceof Error ? caught.message : "The stake amount is invalid.");
      return false;
    }
  }, [round, resolution, runAcceptedEntry, selectedRoundId]);

  const resolutionId = round?.resolver_resolution_id ?? selectedRoundId;
  return {
    configured: genLayerGameConfig.enabled && Boolean(selectedRoundId) && Boolean(roundMarketPack(round, resolution)),
    pack: roundMarketPack(round, resolution),
    canEnter: Boolean(round && round.status === "OPEN" && now > 0 && now < Date.parse(round.lock_at)),
    config: { ...genLayerGameConfig, roundId: selectedRoundId },
    round,
    entry,
    resolution,
    action,
    transactionStage,
    error,
    transactionHash,
    busy: ["ENTERING", "RESOLVING", "DISPATCHING", "PROCESSING", "REFUNDING", "CLAIMING"].includes(action),
    refresh,
    enter,
    resolve: () => run("RESOLVING", (account, signingProvider, onSubmitted) => resolveGameRound(account, signingProvider, resolutionId, onSubmitted, round?.resolver_address)),
    dispatch: () => run("DISPATCHING", (account, signingProvider, onSubmitted) => dispatchGameResolution(account, signingProvider, resolutionId, onSubmitted, round?.resolver_address)),
    process: () => run("PROCESSING", (account, signingProvider, onSubmitted) => processGameSettlement(account, signingProvider, selectedRoundId, onSubmitted)),
    activateRefunds: () => run("REFUNDING", (account, signingProvider, onSubmitted) => activateGameRefunds(account, signingProvider, selectedRoundId, onSubmitted)),
    claim: () => run("CLAIMING", (account, signingProvider, onSubmitted) => claimGamePayout(account, signingProvider, selectedRoundId, onSubmitted)),
  };
}
