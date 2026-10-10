---
version: 1
slug: "web-src-components-game-shell-tsx"
primary_target: "web/src/components/game-shell.tsx"
related_targets: ["web/src/components/game-selector.tsx"]
---

# Game selector

Scope: local extension of the existing Play surface, visitor mode Operate. The user confirmed normal Call of Duty, not Call of Duty Mobile. Preserve wallet onboarding, contract binding, and the established MEG board.

## Direction contract

THESIS: Make the two shipped games discoverable before a visitor fills a grid; do not replace MEG with two competing product layouts.

OWN-WORLD: Inherit the paper board, Archivo Black display type, squared controls and lime action/status semantics. Call of Duty alone uses charcoal framing and olive evidence accents; Valorant keeps cobalt.

STORY: Pick a game, inspect its nine questions, and follow the matching registered-series link. Synthetic practice stays explicitly non-staking. Confirm before discarding an unsigned draft; changing games must not reinterpret an existing entry.

FIRST VIEWPORT: A labeled native dropdown sits above the existing Play hero, opposite a game-specific match link. On mobile the row wraps without shrinking the 44px control. Switching updates the URL, questions and theme together; no decorative animation delays the board.

FORM: Precisely scoped, code-led extension of the incumbent surface. No concept seed or approved comp is required for this local addition.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Safety and verification

- Only Valorant and normal Call of Duty are selectable. No COD Mobile placeholder.
- Preview URLs remove the round ID and cannot accept stakes. Registered round packs remain authoritative.
- The switch is disabled during an in-progress contract action. Canceling the native discard dialog preserves the current draft.
- Match browsing can start filtered to the selected game; all-game browsing remains available.
- Verify both game themes at desktop/mobile sizes, round-trip switching, draft cancel/confirm, and existing non-signing review behavior.
- No new shipping raster assets or durable global design-system changes.
