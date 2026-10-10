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

## Verified release evidence

Recorded from the supplied release handoff; this documentation pass checked the local source and four screenshot files, without rerunning release tests or remote smoke.

- Source: `a1efa6b`. Checked `web/src/components/{game-shell,game-selector,matches-client}.tsx`, `web/src/app/matches/page.tsx`, and `web/src/app/globals.css` against root `PRODUCT.md`, `DESIGN.md`, and the direction contract above. The extension retains the paper board, Archivo Black/Geist/IBM Plex Mono hierarchy, squared controls, lime action/status semantics, and nine separate pools. Valorant keeps cobalt; only Call of Duty Play uses charcoal/olive overrides. Exactly two shipped packs are selectable; Call of Duty Mobile is absent. This is an ordinary local extension, not global design-system approval; DESIGN.md and existing sidecar state are preserved.
- Production: Vercel `dpl_3SN2gDoFcnuXRqUkezoEwqH8T7pU`, **READY**, at [deployment](https://moment-grid-genlayer-1bi2yq3t5-wattxs-projects.vercel.app), promoted to [public MEG](https://moment-grid-genlayer.vercel.app/?game=call-of-duty). The 45-second cloud build includes the final guard that blocks switching while acceptance awaits finality.
- Checks supplied: lint, typecheck, and local build passed; all six end-to-end tests passed. The mechanical detector ran once and returned `[]`.
- Local visual evidence (gitignored, not public attachments): `.impeccable/review/game-{valorant,call-of-duty}-{desktop,mobile}.png`. All four were validated by the main pass and fresh reviewer; supplied 390px checks found no horizontal overflow and confirmed the 44px game-selector control. No new shipping raster assets were added, so no new asset provenance is required.
- Independent finish review supplied: **ship**, all five required sections complete, no fixes. The required named reviewer role was substituted with a fresh subagent supplied the review contract. This documenter role is performed inline using the degraded documenter contract because this harness exposes no named roles.
- Remote smoke supplied: round-trip picker changes updated URL, theme, and questions together; synthetic staking stayed disabled; a registered past round displayed LOCKED without an entering link. API configuration confirmed Studio Next chain `61997` and a connected registry; no new fixtures were registered.
- Final main-agent checks: real-entry nine-cell receipt and JSON export passed on the staged deployment; promotion succeeded. A fresh unauthenticated browser checked the canonical public domain and verified both game packs, colors, URLs, and the selected-game match filter. The error-log scan returned no logs (not proof of no errors); drains and monitoring were not audited.
- Remaining product boundary: COD is a synthetic practice board until a verified upcoming COD round is registered. This UI release does not register matches, fund wallets, or alter contracts.
