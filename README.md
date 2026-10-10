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
uv sync --locked
pnpm test:contracts
node --test tests/operator/*.test.mjs
pnpm --filter web test:e2e
```

The direct suite uses `uv.lock`, not a globally installed `gltest` or pytest.
Python 3.13 is selected by `.python-version`. Dev dependencies pin pytest
`8.4.2` and `genlayer-test==0.30.0rc2` (the `v0.30.0-rc.2` testing-suite release,
fixed Git revision `d84591b58746a6202b56b720199ce7b9f12fd666`). The latter's
direct SDK loader supports the v0.6 release tree and `bundles-v2` cache instead
of selecting an obsolete cached v0.3.0-rc7 bundle.

`tests/direct/conftest.py` defaults `GENVM_VERSION` to `v0.6.0-rc8` **before**
importing the direct harness. This release contains the contracts' pinned
`py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` runner.
Explicit environment settings still override the default: remove an obsolete
`GENVM_VERSION` or set it to `v0.6.0-rc8`, and unset `GENVM_PREBUILT_DIR` unless
you intentionally provide a compatible runner tree. Do not edit contract hashes
or point tests at `latest` to mask a missing runner.

On first use the loader downloads the pinned release bundle from
`genlayerlabs/genvm-manager` and caches it under
`~/.cache/gltest-direct/bundles-v2`; initial installation therefore needs GitHub
and package-registry access. Windows fd-0 cleanup and message timestamp
compatibility are isolated in the test conftest. These direct tests mock
nondeterministic input and do not prove live publisher retrieval or consensus.
The product configuration exposes Studio Next only; localnet is reserved for
automated contract tests (the direct suite needs no running local node).

See [the live usage runbook](docs/LIVE_USAGE_RUNBOOK.md) for dry-run-first refund,
registration and two-wallet league commands. No agent signs these transactions.

## Scope boundary

The repository does not fund wallets or run bots automatically. Any disclosed bot address is informational and must be authorized and funded separately before use.
