# MEG — Moment Esports Grid

MEG is a nine-call Valorant prediction game built as a separate product from the original Moment Grid codebase. Players lock one option in each cell, stake native GEN on Studio Next, and settle against a strict GenLayer consensus record after the series is final.

The first playable pack is deliberately synthetic and clearly labelled. It is a deterministic product/demo fixture, not a live esports feed. No wallet is asked to sign until the grid, tier allocation, network, and settlement target are visible and confirmed.

## Workspace

- `web/` — Next.js 16 browser client and product routes.
- `shared/scoring/` — market-pack schema, option IDs, grid packing, line detection, and economic allocation helpers.
- `contracts/moment_esports_grid_game.py` — nine-cell native-GEN game, isolated cell pools, refunds, jackpot, and claims.
- `contracts/esports_match_resolver.py` — approved-source GenLayer resolver with nine strict cell results.
- `tests/direct/` — direct contract and resolver coverage.
- `docs/` — architecture, economics, Studio Next operations, demo, and deployment gates.

## Run locally

```bash
pnpm install
pnpm --filter @meg/scoring build
pnpm dev:web
```

Open `http://localhost:3003`. Copy `.env.example` to `web/.env.local` when connecting to a deployed Studio Next pair. Blank contract addresses keep the UI in a transparent, non-signing preview state.

## Verification

```bash
pnpm --filter @meg/scoring test
pnpm --filter @meg/scoring typecheck
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
pnpm test:contracts
pnpm --filter web test:e2e
```

The direct contract suite uses the local GenVM test harness. The product configuration exposes Studio Next only; localnet is reserved for automated contract tests.

## Scope boundary

The repository does not fund wallets or run bots automatically. Any disclosed bot address is informational and must be authorized and funded separately before use.
