"use client";

import { CircleDot, HelpCircle, Radio, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";

const NAV_ITEMS = [
  { href: "/", label: "Play" },
  { href: "/matches", label: "Matches" },
  { href: "/entries", label: "My entries" },
  { href: "/rankings", label: "Rankings" },
] as const;

export function MomentHeader({ onOpenGuide }: { onOpenGuide?: () => void }) {
  return (
    <header className="app-header">
      <Link className="wordmark" href="/" aria-label="MEG home">
        <span className="wordmark-mark"><CircleDot size={17} /></span>
        <span>MEG</span>
        <small>Moment Esports Grid</small>
      </Link>
      <div className="header-actions">
        <span className="network-chip"><Radio size={12} /> Studio Next only</span>
        {onOpenGuide && <button className="icon-button" type="button" onClick={onOpenGuide} aria-label="Open Guided Play" title="Guided Play"><HelpCircle size={16} /></button>}
        <WalletButton />
      </div>
    </header>
  );
}

export function MomentNav() {
  const pathname = usePathname();
  return (
    <nav className="moment-nav" aria-label="MEG pages">
      <div className="nav-primary">
        {NAV_ITEMS.map((item, index) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <Link className={active ? "is-active" : ""} href={item.href} key={item.href}><span>0{index + 1}</span>{item.label}</Link>;
        })}
      </div>
      <div className="trust-links">
        <Link href="/rules"><ShieldCheck size={12} /> Rules</Link>
        <Link href="/genlayer"><WalletCards size={12} /> GenLayer proof</Link>
      </div>
    </nav>
  );
}
