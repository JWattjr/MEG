# MEG — Moment Esports Grid

MEG is a nine-call esports prediction game with Valorant and Call of Duty market packs. Players lock one option in each cell, stake native GEN on Studio Next, and settle against a GenLayer consensus record after the series is final.

Only registered, verified upcoming fixtures enable staking. Call of Duty practice uses clearly labeled synthetic teams. Community leagues store invitations and fixed membership on-chain, and settlement receipts explain each cell’s stake, outcome, refund and estimated return. See [the milestone release](docs/MILESTONE_RELEASE.md) for deployment evidence and remaining live-fixture verification.

Review the fixed [milestone release comparison](https://github.com/JWattjr/MEG/compare/9ba876e...15b70eb) against the accepted baseline; this link does not follow a moving branch.

## Workspace

- `web/` — Next.js 16 browser client and product routes.
- `shared/scoring/` — market-pack schema, option IDs, grid packing, line detection, and economic allocation helpers.
- `contracts/moment_esports_grid_game.py` — nine-cell native-GEN game, isolated cell pools, refunds, jackpot, and claims.
- `contracts/esports_match_resolver.py` — approved-source GenLayer resolver with nine strict cell results.
- `contracts/cod_match_resolver.py` — BO5 Call of Duty resolver with independent publisher and validator checks.
- `contracts/community_leagues.py` — invitation-only rosters that close before the first season round locks.
- `scripts/register-cod-round.mjs` — owner-operated fixture registration with identity, source and timing checks.
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

The direct contract suite uses the pinned runtime. Set `GENVM_VERSION=v0.6.0-rc8` when running the contract tools so their release bundle contains the contract’s pinned runner. Install `requirements.txt` into a Python 3.12+ environment. The product configuration exposes Studio Next only; localnet is reserved for automated contract tests.

## Scope boundary

The repository does not fund wallets or run bots automatically. Any disclosed bot address is informational and must be authorized and funded separately before use.
