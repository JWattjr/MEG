"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, FileCheck2, Grid3X3, Info, LockKeyhole, RefreshCw, ShieldCheck, Ticket, TriangleAlert, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VALORANT_MARKET_PACK, cellPoolPercentage, createValorantMarketPack, optionIdForCell, unpackGrid, type MarketCellDefinition, type MarketOptionId } from "@meg/scoring";
import { formatGen, MINIMUM_STAKE_GEN, stakeAllocation } from "@/lib/genlayer-game";
import { useOnchainGame } from "@/lib/use-onchain-game";
import { GuidedPlay, type GuideStep } from "./guided-play";
import { MomentHeader, MomentNav } from "./moment-chrome";

type Grid = Array<MarketOptionId | null>;
type PlayStage = "BUILD" | "REVIEW";
type OnchainGame = ReturnType<typeof useOnchainGame>;

const GUIDE_KEY = "meg-guided-play-v1";

export function GameShell({ roundId }: { roundId?: string }) {
  const game = useOnchainGame(roundId);
  const pack = VALORANT_MARKET_PACK;
  const fixturePack = createValorantMarketPack(pack.fixture);
  const [grid, setGrid] = useState<Grid>(() => Array(9).fill(null));
  const [stage, setStage] = useState<PlayStage>("BUILD");
  const [stakeInput, setStakeInput] = useState(MINIMUM_STAKE_GEN);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState<GuideStep>("pick");
  const [notice, setNotice] = useState("");
  const entryGrid = useMemo(() => {
    if (!game.entry) return null;
    try {
      return unpackGrid(game.entry.packed_grid);
    } catch {
      return null;
    }
  }, [game.entry]);
  const viewGrid = entryGrid ?? grid;
  const complete = viewGrid.every((option): option is MarketOptionId => option !== null);
  const chosenCount = viewGrid.filter(Boolean).length;
  const locked = Boolean(game.entry);
  const allocation = useMemo(() => {
    try {
      return stakeAllocation(stakeInput, game.round?.minimum_stake, game.round?.maximum_stake);
    } catch {
      return null;
    }
  }, [game.round?.maximum_stake, game.round?.minimum_stake, stakeInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(GUIDE_KEY);
      if (!saved) {
        setGuideOpen(true);
        return;
      }
      try {
        const parsed = JSON.parse(saved) as { step?: GuideStep; status?: string };
        if (parsed.step) setGuideStep(parsed.step);
        setGuideOpen(parsed.status === "active");
      } catch {
        setGuideOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const updateGuide = useCallback((step: GuideStep, status: "active" | "paused" | "complete" = "active") => {
    setGuideStep(step);
    setGuideOpen(status === "active");
    window.localStorage.setItem(GUIDE_KEY, JSON.stringify({ version: 1, step, status }));
  }, []);

  const openGuide = useCallback(() => {
    const next = locked ? "secured" : complete ? "review" : chosenCount ? "fill" : "pick";
    updateGuide(next);
  }, [chosenCount, complete, locked, updateGuide]);

  const updateCell = (cellIndex: number, value: string) => {
    if (locked) return;
    const next = value as MarketOptionId;
    setGrid((current) => current.map((entry, index) => index === cellIndex ? next : entry));
    if (guideStep === "pick" || guideStep === "choose") updateGuide("fill");
  };

  const quickFill = () => {
    if (locked) return;
    const nextGrid = Array.from({ length: 9 }, (_, cellIndex) => optionIdForCell(cellIndex, Math.floor(Math.random() * 3)));
    setGrid(nextGrid);
    updateGuide("review");
  };

  const reviewGrid = () => {
    if (!complete) return;
    setStage("REVIEW");
    updateGuide("stake");
  };

  const returnToGrid = () => {
    setStage("BUILD");
    if (guideStep === "stake") updateGuide("review");
  };

  const lockEntry = async () => {
    setNotice("");
    if (!complete || !allocation || locked) return;
    if (!game.configured) {
      setNotice("This is a local preview. Add the fresh Studio Next MEG game and resolver addresses to enable the wallet transaction.");
      return;
    }
    updateGuide("sign");
    const accepted = await game.enter(grid as MarketOptionId[], stakeInput);
    if (accepted) updateGuide("secured");
  };

  return (
    <main className="meg-app">
      <section className="desk-frame play-frame">
        <MomentHeader onOpenGuide={openGuide} />
        <MomentNav />
        <div className="play-content">
          <header className="play-hero">
            <div className="signal-line"><span className="signal-dot" /> MEG / VALORANT MARKET PACK <span className="synthetic-stamp">{fixturePack.fixture.mode === "SYNTHETIC" ? "SYNTHETIC FIXTURE" : "VERIFIED FIXTURE"}</span></div>
            <h1>Nine calls.<br /><span>One series.</span></h1>
            <p>Read the board, make your nine calls, and stake one signed grid. Every square stands alone until GenLayer settles the series.</p>
          </header>

          <FixtureStrip game={game} pack={fixturePack} />
          <StatusRail status={game.round?.status} entry={game.entry} />
          <SummaryBoard />

          <section className="grid-zone" aria-labelledby="grid-title">
            <div className="zone-heading">
              <div><span className="section-code">01 / MAKE THE READ</span><h2 id="grid-title">Choose one option in every cell.</h2></div>
              <div className="grid-count"><strong>{chosenCount}</strong><span>/ 09 calls made</span></div>
            </div>
            <MarketGrid pack={fixturePack} grid={viewGrid} locked={locked} guideStep={guideStep} onChange={updateCell} />
            <div className="grid-actions">
              <button className={`secondary-control ${guideStep === "fill" ? "is-guide-target" : ""}`} type="button" onClick={quickFill} disabled={locked} data-guide="quick-fill">Quick fill a draft <RefreshCw size={14} /></button>
              <span>Draft only · review every call before signing.</span>
            </div>
            <div className="grid-footnote"><Info size={14} /><span>Rows set pool weight. Columns set the kind of evidence: TEAM, MAP, PLAYER. Rarity changes the pool share, not the chance of resolution.</span></div>
          </section>

          <section className="control-deck" aria-label="Entry controls">
            <StakeLedger allocation={allocation} stakeInput={stakeInput} locked={locked} guideStep={guideStep} onStakeInput={setStakeInput} />
            <EntryAction game={game} allocation={allocation} complete={complete} stage={stage} locked={locked} guideStep={guideStep} notice={notice || (game.entry && !entryGrid ? "The wallet entry was found, but its packed grid could not be read by this build." : "")} error={game.error} onReview={reviewGrid} onBack={returnToGrid} onLock={lockEntry} />
          </section>

          <ProofTeaser game={game} />
        </div>
        <footer className="play-footer"><span>MEG · Moment Esports Grid</span><span>Independent product · not affiliated with Riot Games or the Valorant Champions Tour</span></footer>
      </section>
      {guideOpen && <GuidedPlay step={guideStep} onExit={() => updateGuide(guideStep, "paused")} onPause={() => updateGuide(guideStep, "paused")} />}
    </main>
  );
}

function FixtureStrip({ game, pack }: { game: OnchainGame; pack: ReturnType<typeof createValorantMarketPack> }) {
  const fixture = pack.fixture;
  return (
    <section className="fixture-strip" aria-label="Selected Valorant series">
      <div className="fixture-main"><span className="fixture-kicker">{game.configured ? game.config.deploymentLabel : "Local market preview"}</span><strong>{fixture.teamAShort}<i>vs</i>{fixture.teamBShort}</strong><span>{fixture.seriesName} · {fixture.format.replace("BEST_OF_", "BO")}</span></div>
      <div className="fixture-meta"><span><Clock3 size={13} /> {formatDate(game.round?.kickoff_at ?? fixture.scheduledAt)}</span><span><Grid3X3 size={13} /> 9 markets</span></div>
    </section>
  );
}

function StatusRail({ status, entry }: { status?: string; entry: OnchainGame["entry"] }) {
  const active = entry ? status === "SETTLED" || status === "REFUNDING" ? 3 : 1 : 0;
  const states = [
    ["OPEN", "Build", "Grid accepts calls"],
    ["LOCKED", "Track", "Entry is immutable"],
    ["RESOLVING", "Verify", "Validators read evidence"],
    [status === "REFUNDING" ? "REFUNDABLE" : "SETTLED", status === "REFUNDING" ? "Refund" : "Claim", status === "REFUNDING" ? "Recovery is available" : "Payout is on-chain"],
  ];
  return <div className="status-rail" aria-label="MEG round lifecycle">{states.map(([code, label, copy], index) => <div className={`${index <= active ? "is-active" : ""} ${status === "REFUNDING" && index === 3 ? "is-refund" : ""}`} key={code}><span>{index < active ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span><b>{label}</b><small>{index === 0 && status ? status : copy}</small></div>)}</div>;
}

function SummaryBoard() {
  return <div className="summary-board" aria-label="MEG game summary"><div><strong>09</strong><span>calls</span></div><div><strong>09</strong><span>separate pools</span></div><div><strong>01</strong><span>signed grid</span></div><div><strong>∞</strong><span>proof trail</span></div></div>;
}

function MarketGrid({ pack, grid, locked, guideStep, onChange }: { pack: ReturnType<typeof createValorantMarketPack>; grid: Grid; locked: boolean; guideStep: GuideStep; onChange: (cellIndex: number, value: string) => void }) {
  return (
    <div className="market-grid-wrap">
      <div className="grid-column-heads"><span aria-hidden="true" />{pack.columns.map((column) => <span key={column}>{column}</span>)}</div>
      <div className="market-grid" data-testid="meg-grid">
        {pack.cells.map((marketCell) => <MarketCell key={marketCell.id} definition={marketCell} value={grid[marketCell.cellIndex]} locked={locked} guideStep={guideStep} onChange={onChange} />)}
      </div>
    </div>
  );
}

function MarketCell({ definition, value, locked, guideStep, onChange }: { definition: MarketCellDefinition; value: MarketOptionId | null; locked: boolean; guideStep: GuideStep; onChange: (cellIndex: number, value: string) => void }) {
  const isFirstEmpty = definition.cellIndex === 0 && !value;
  return (
    <article className={`market-cell tier-${definition.row.toLowerCase()} ${value ? "is-chosen" : ""} ${locked ? "is-locked" : ""} ${isFirstEmpty && guideStep === "pick" ? "is-guide-target" : ""}`} data-cell={definition.id}>
      <div className="cell-meta"><span>{String(definition.cellIndex + 1).padStart(2, "0")}</span><em>{definition.row}</em><b>{cellPoolPercentage(definition.cellIndex)}%</b></div>
      <h3>{definition.question}</h3>
      <p>{definition.explanation}</p>
      <label className={guideStep === "choose" && definition.cellIndex === 0 ? "is-guide-target" : ""}>
        <span className="sr-only">Choose an outcome for {definition.question}</span>
        <select value={value ?? ""} onChange={(event) => onChange(definition.cellIndex, event.target.value)} disabled={locked} data-guide={definition.cellIndex === 0 ? "prediction-option" : undefined}>
          <option value="" disabled>Choose call…</option>
          {definition.options.map((marketOption) => <option key={marketOption.id} value={marketOption.id}>{marketOption.label}</option>)}
        </select>
        <ArrowRight size={14} aria-hidden="true" />
      </label>
    </article>
  );
}

function StakeLedger({ allocation, stakeInput, locked, guideStep, onStakeInput }: { allocation: ReturnType<typeof stakeAllocation> | null; stakeInput: string; locked: boolean; guideStep: GuideStep; onStakeInput: (value: string) => void }) {
  return (
    <aside className={`stake-ledger ${guideStep === "stake" ? "is-guide-target" : ""}`} data-guide="stake-ledger">
      <div className="panel-label"><span>02 / READ THE LEDGER</span><Ticket size={16} /></div>
      <div className="stake-heading"><div><h2>One stake. Nine lanes.</h2><p>Your GEN is distributed before the signature. Each cell keeps its own pool.</p></div><span className="stake-total">{stakeInput || "0"}<small>GEN</small></span></div>
      <label className="stake-input"><span>Entry stake</span><span className="stake-input-box"><input inputMode="decimal" type="number" min="1" step="0.1" value={stakeInput} disabled={locked} onChange={(event) => onStakeInput(event.target.value)} aria-label="Entry stake in GEN" /><b>GEN</b></span></label>
      <div className="allocation-table" aria-label="Exact pool allocation">
        <div className="allocation-head"><span>Destination</span><span>Per cell</span><span>Share</span></div>
        {allocation ? <>
          <AllocationRow tone="common" label="COMMON · 3 pools" perCell={allocation.commonPerCell} total={allocation.common} share="15%" />
          <AllocationRow tone="medium" label="MEDIUM · 3 pools" perCell={allocation.mediumPerCell} total={allocation.medium} share="30%" />
          <AllocationRow tone="rare" label="RARE · 3 pools" perCell={allocation.rarePerCell} total={allocation.rare} share="45%" />
          <AllocationRow tone="jackpot" label="JACKPOT" total={allocation.jackpot} share="5%" />
          <AllocationRow tone="platform" label="PLATFORM REVENUE" total={allocation.platform} share="5%" />
        </> : <div className="allocation-empty">Enter at least 1 test GEN to see the exact split.</div>}
      </div>
      <p className="ledger-note"><ShieldCheck size={14} /> Invalid cells refund their cell stake. A cancelled, underfilled, or timed-out round can refund the full entry. Platform revenue never enters a cell pool.</p>
    </aside>
  );
}

function AllocationRow({ tone, label, perCell, total, share }: { tone: string; label: string; perCell?: bigint; total: bigint; share: string }) {
  return <div className="allocation-row"><span><i className={`allocation-swatch ${tone}`} />{label}</span><strong>{perCell === undefined ? "—" : `${formatGen(perCell)} GEN`}</strong><b>{formatGen(total)} <small>GEN</small></b><em>{share}</em></div>;
}

function EntryAction({ game, allocation, complete, stage, locked, guideStep, notice, error, onReview, onBack, onLock }: { game: OnchainGame; allocation: ReturnType<typeof stakeAllocation> | null; complete: boolean; stage: PlayStage; locked: boolean; guideStep: GuideStep; notice: string; error: string; onReview: () => void; onBack: () => void; onLock: () => Promise<void> }) {
  if (locked) return <LockedEntry game={game} guideStep={guideStep} />;
  const disabled = !complete || !allocation || game.busy;
  return (
    <section className="entry-action">
      <div className="panel-label"><span>03 / ACCEPT THE GRID</span><LockKeyhole size={16} /></div>
      <h2>{stage === "BUILD" ? "Ready to test your read?" : "Review before the lock."}</h2>
      <p>{stage === "BUILD" ? "Fill all nine cells first. Your next step is a plain-English review of the stake and proof policy." : "Acceptance fixes the grid. The wallet request opens only after you choose to continue."}</p>
      {stage === "BUILD" ? <button className={`primary-control ${guideStep === "review" ? "is-guide-target" : ""}`} type="button" onClick={onReview} disabled={!complete} data-guide="review-grid">Review my nine calls <ArrowRight size={16} /></button> : <>
        <div className="immutable-note"><FileCheck2 size={15} /><span><strong>After acceptance, this grid cannot change.</strong><small>One transaction stores all nine options and the full stake on the MEG game contract.</small></span></div>
        <div className="action-row"><button className="secondary-control" type="button" onClick={onBack}><ArrowLeft size={15} /> Edit calls</button><button className={`primary-control ${guideStep === "sign" ? "is-guide-target" : ""}`} type="button" onClick={() => void onLock()} disabled={disabled} data-guide="sign-entry">{game.configured ? `Lock & sign ${allocation ? formatGen(allocation.stake) : "0"} GEN` : "Studio Next lock unavailable"}<LockKeyhole size={15} /></button></div>
      </>}
      {notice && <p className="inline-notice" role="status"><TriangleAlert size={15} />{notice}</p>}
      {error && <p className="inline-error" role="alert"><TriangleAlert size={15} />{error} <span>Check your wallet network and retry; no entry is confirmed until the contract state updates.</span></p>}
      <TransactionState game={game} />
    </section>
  );
}

function TransactionState({ game }: { game: OnchainGame }) {
  const label = game.transactionStage === "SUBMITTED" ? "Transaction submitted" : game.transactionStage === "CONSENSUS" ? "Waiting for validator acceptance" : game.transactionStage === "ACCEPTED" ? "Transaction accepted · waiting for finality" : game.transactionStage === "FINALIZED" ? "Entry confirmed" : game.action === "ENTERING" ? "Wallet request opened" : game.transactionStage === "FAILED" ? "Wallet rejected or transaction failed" : "No transaction started";
  const copy = game.transactionStage === "ACCEPTED" ? "Your entry is visible as accepted. Finality continues; the chain remains authoritative." : game.transactionStage === "FINALIZED" ? game.config.entryAcceptedNote : game.transactionStage === "FAILED" ? "Nothing is locked unless the MEG contract shows the entry. Review the wallet message and try again." : game.transactionStage === "IDLE" ? "Studio Next state will appear here after a real wallet action." : "We are reading the real GenLayer transaction state.";
  return <div className={`transaction-state ${game.transactionStage === "FAILED" ? "is-error" : game.transactionStage === "FINALIZED" ? "is-good" : ""}`}><span className="state-led"><span /></span><div><strong>{label}</strong><small>{copy}</small></div>{game.transactionHash && <code>{game.transactionHash.slice(0, 10)}…</code>}</div>;
}

function LockedEntry({ game, guideStep }: { game: OnchainGame; guideStep: GuideStep }) {
  const roundStatus = game.round?.status ?? "LOCKED";
  const claimable = game.entry?.claimable ?? 0n;
  const isRefund = roundStatus === "REFUNDING";
  return <section className={`entry-action entry-locked ${guideStep === "secured" ? "is-guide-target" : ""}`} data-guide="entry-secured"><div className="panel-label"><span>{isRefund ? "RECOVERY AVAILABLE" : "ENTRY SECURED"}</span>{isRefund ? <RefreshCw size={16} /> : <Check size={17} />}</div><h2>{isRefund ? "Your refund is ready." : roundStatus === "SETTLED" ? "The series is settled." : "Your grid is on the board."}</h2><p>{isRefund ? "The round is refundable. Claiming returns the full entry stake." : roundStatus === "SETTLED" ? "Only settled contract state decides winning cells and payout. The preview never changes this result." : "Your nine calls are immutable. Wait for the series to complete, then follow the GenLayer proof through settlement."}</p><div className="locked-facts"><span><b>Round</b><strong>{roundStatus}</strong></span><span><b>Stake</b><strong>{game.entry ? formatGen(game.entry.stake_amount) : "—"} GEN</strong></span><span><b>Claimable</b><strong>{formatGen(claimable)} GEN</strong></span></div>{claimable > 0n && <button className={`primary-control ${guideStep === "secured" ? "is-guide-target" : ""}`} type="button" onClick={() => void game.claim()} disabled={game.busy} data-guide="claim-payout">{isRefund ? "Claim refund" : "Claim payout"}<WalletCards size={15} /></button>}{game.error && <p className="inline-error" role="alert"><TriangleAlert size={15} />{game.error}</p>}<TransactionState game={game} /></section>;
}

function ProofTeaser({ game }: { game: OnchainGame }) {
  const hasResolution = Boolean(game.resolution);
  return <section className="proof-teaser"><div className="proof-icon"><ShieldCheck size={20} /></div><div><span className="section-code">GENLAYER / PROOF TRAIL</span><h2>{hasResolution ? "Resolution state is registered." : "The grid waits for evidence."}</h2><p>{hasResolution ? `${game.resolution?.match_status ?? "Series"} · ${game.resolution?.reason_code || "Awaiting final result"} · ${game.resolution?.evidence_summary || "Open the proof view for cell-by-cell state."}` : "Approved public sources are registered before lock. After the series completes, validators return nine structured cell outcomes. Missing or conflicting evidence becomes INVALID and refundable."}</p></div><a className="text-link" href="/genlayer">Open proof view <ArrowRight size={15} /></a></section>;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(parsed) + " UTC";
}
