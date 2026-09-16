"use client";

import { Check, X } from "lucide-react";

export type GuideStep = "pick" | "choose" | "fill" | "review" | "stake" | "sign" | "secured" | "complete";

const GUIDE_STEPS: Record<GuideStep, { title: string; copy: string; position: number; target?: string }> = {
  pick: { title: "Start with one call", copy: "Pick any highlighted cell. Every square is a separate pool with its own outcome.", position: 1, target: "pick-cell" },
  choose: { title: "Choose an outcome", copy: "Select the option you trust. The guide waits for you; it never signs or chooses for you.", position: 2, target: "prediction-option" },
  fill: { title: "Complete all nine", copy: "Fill the remaining cells, or use Quick fill to make a draft you can still inspect.", position: 3, target: "quick-fill" },
  review: { title: "Read your grid", copy: "Check all nine calls and confirm the stake ledger before moving to the wallet step.", position: 4, target: "review-grid" },
  stake: { title: "Read the ledger", copy: "The entry is split across nine isolated pools, the jackpot, and platform revenue. Nothing moves between cells.", position: 5, target: "stake-ledger" },
  sign: { title: "Sign when ready", copy: "Open your wallet, review the exact GEN amount, and decide whether to approve or reject it.", position: 6, target: "sign-entry" },
  secured: { title: "Track the series", copy: "Your accepted entry is fixed. Follow lifecycle state and return when GenLayer consensus is complete.", position: 7, target: "entry-secured" },
  complete: { title: "Guided Play complete", copy: "You can restart this walkthrough anytime from the question-mark button.", position: 7 },
};

export function GuidedPlay({ step, onExit, onPause }: { step: GuideStep; onExit: () => void; onPause: () => void }) {
  const definition = GUIDE_STEPS[step];
  return (
    <aside className="guided-play" aria-live="polite" aria-label="Guided Play instructions">
      <div className="guide-pointer" aria-hidden="true" />
      <section className="guided-play-card">
        <header><span>Guided Play · {definition.position} / 7</span><button type="button" onClick={onExit} aria-label="Dismiss Guided Play"><X size={14} /> Dismiss</button></header>
        <div className="guide-heading"><span className="guide-step-dot"><Check size={12} /></span><h2>{definition.title}</h2></div>
        <p>{definition.copy}</p>
        {definition.target && <small>Next control is marked on the board.</small>}
        <button className="guide-pause" type="button" onClick={onPause}>Pause walkthrough</button>
      </section>
    </aside>
  );
}
