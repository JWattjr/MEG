# MEG design system

## World

MEG is an esports broadcast operations desk: the player reads a compact match board, marks calls, checks the ledger, and follows evidence through settlement. The interface should feel precise and live without pretending to be an official broadcast or using third-party brand assets.

## Visual grammar

- Deep navy ink is the operating surface; warm paper panels carry decisions and evidence.
- Cobalt is the navigation and active-control signal. Acid lime means selected, confirmed, or claimable; orange is reserved for warnings and invalid/refund states.
- Use decisive 1–2px rules, small broadcast labels, tabular numerals, and a strong outlined control language.
- Keep the 3×3 grid dominant. Supporting content is a rail, strip, or ledger row rather than nested generic cards.
- Use Archivo Black for display, Geist for body/UI, and IBM Plex Mono for IDs, amounts, and status codes.
- Use Lucide for icons; do not use emoji or Unicode glyphs as interface icons.

## Layout

The Play route uses a wide desk frame on desktop and a single-column playbook on mobile. The first viewport shows the MEG identity, synthetic/live fixture status, the nine-cell grid, and the next useful action. The stake ledger follows the grid and remains visible before signature.

## Interaction

Cell selection is an explicit native control that works with keyboard and touch. Guided Play highlights the next real control, explains why it matters, pauses for wallet actions, and can be dismissed or restarted. Motion is limited to an authored grid-state reveal and respects `prefers-reduced-motion`.

## State language

OPEN, LOCKED, RESOLVING, SETTLED, REFUNDABLE, and CANCELLED are always paired with plain-English copy. Transaction copy distinguishes wallet request, rejection, submission, acceptance, finality, and claim completion.

## Content rules

Use “series,” “map,” “round,” “top fragger,” “call,” “pool,” “evidence,” and “claim.” Never use source-era sport terms, hosted-network references, or official Riot/VCT styling. Synthetic values carry a visible “Synthetic fixture” label.
