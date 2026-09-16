import type { Metadata } from "next";
import { Coins, FileCheck2, Grid3X3, LockKeyhole, Scale, ShieldCheck, Trophy } from "lucide-react";
import { PrototypeShell } from "@/components/prototype-shell";

export const metadata: Metadata = { title: "Rules · MEG", description: "How the Moment Esports Grid nine-pool game works." };

const STEPS = [
  ["01", "Choose one Valorant series", "Use a registered series or the clearly labeled synthetic fixture. No invented live match data enters the game.", Grid3X3],
  ["02", "Make nine calls", "Fill TEAM, MAP, and PLAYER cells across COMMON, MEDIUM, and RARE rows. Each cell has its own question and evidence rule.", FileCheck2],
  ["03", "Review one signed stake", "Stake from 1 test GEN. At 1 GEN, common cells receive 0.05 each, medium 0.10 each, rare 0.15 each, 0.05 funds the jackpot, and 0.05 is revenue.", Coins],
  ["04", "Lock before the series", "Your packed grid and stake enter the game contract in one transaction. Acceptance makes the grid immutable.", LockKeyhole],
  ["05", "Resolve and claim", "After completion, validators compare approved sources. Correct predictors share only their cell pool; invalid cells refund their cell stake.", Scale],
] as const;

export default function RulesPage() { return <PrototypeShell title="Call. Lock. Reveal." intro="Prediction-market tension for one Valorant series: nine independent pools, one progressive jackpot, and a proof trail that stays honest when evidence is incomplete."><section className="rules-list">{STEPS.map(([number, title, copy, Icon]) => <article key={number}><span>{number}</span><div className="rule-icon"><Icon size={17} /></div><div><strong>{title}</strong><p>{copy}</p></div></article>)}</section><section className="rules-callout"><Trophy size={19} /><div><strong>Jackpot qualification</strong><p>Complete at least one horizontal row and one diagonal in the same grid. Qualifiers share the jackpot pro rata by gross stake; without a qualifier, it rolls forward.</p></div></section><section className="rules-callout"><ShieldCheck size={19} /><div><strong>Evidence can say INVALID</strong><p>Missing, conflicting, postponed, cancelled, or unplayed map evidence does not become FALSE. The affected cell becomes refundable, and the contract does the payout math.</p></div></section></PrototypeShell>; }
