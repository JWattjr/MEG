"use client";

import { ChevronDown } from "lucide-react";

export type PlayableGame = "valorant" | "call-of-duty";
export type GameFilter = PlayableGame | "all";

export function GameSelector({ value, onChange, disabled = false, includeAll = false }: {
  value: GameFilter;
  onChange: (value: GameFilter) => void;
  disabled?: boolean;
  includeAll?: boolean;
}) {
  return <label className="game-selector">
    <span>{includeAll ? "Filter matches by game" : "Game"}</span>
    <span className="game-selector-input">
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as GameFilter)}>
        {includeAll && <option value="all">All games</option>}
        <option value="valorant">Valorant</option>
        <option value="call-of-duty">Call of Duty</option>
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </span>
  </label>;
}
