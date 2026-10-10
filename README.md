# MEG — Moment Esports Grid

MEG is a nine-call esports prediction game with Valorant and Call of Duty market packs. Players lock one option in each cell, stake native GEN on Studio Next, and settle against a GenLayer consensus record after the series is final.

Only registered, verified upcoming fixtures enable staking. Call of Duty practice uses clearly labeled synthetic teams. Community leagues store invitations and fixed membership on-chain, and settlement receipts explain each cell’s stake, outcome, refund and estimated return. See [the milestone release](docs/MILESTONE_RELEASE.md) for deployment evidence and remaining live-fixture verification.

Review the fixed [milestone release comparison](https://github.com/JWattjr/MEG/compare/9ba876e...15b70eb) against the accepted baseline; this link does not follow a moving branch.

## Workspace

- `web/` — Next.js 16 browser client and product routes.
- `shared/scoring/` — market-pack schema, option IDs, grid packing, line detection, and economic allocation helpers.
- `contracts/moment_esports_grid_game.py` — nine-cell native-GEN game, isolated cell pools, refunds, jackpot, and claims.
- `contracts/esports_match_resolver.py` — approved-source GenLayer resolver with nine strict cell results.
- `contracts/valorant_match_resolver.py` — additive `valorant-bo3-v2` resolver with registered player names and independent publisher/validator checks; implemented, deployed only when its transaction exists.
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

## Valorant v2 activation

The deployed v1 resolver does **not** store player names, so its cell-5 prompt
cannot reliably distinguish the board's player A/B. That existing contract is
unchanged, and the original fixture branch remains readable. V2 registers both
names and returns them with `game_type` and `rule_version` so newly registered
BO3 rounds can build their boards without hardcoded fixtures. Unknown rules or
missing players fail closed. The inherited exact-score cell has no B 2–0
choice; v2 marks that cell INVALID for B 2–0, never B 2–1.

Leave `NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS` blank until the operator
deploys the NEW contract and verifies FINALIZED execution, owner, version and
source SHA256. Then set that public address in Vercel and rebuild before
registering a verified upcoming match. The frontend reads each round's
`resolver_address`, not a global resolver address. V1, v2 and COD coexist; no
existing contract is replaced or migrated. The runbook gives the exact order.

Web unit tests: `pnpm --filter web test`. Browser checks include a separate
synthetic, mocked v2 board with an enabled entry-review button; they do not sign
or prove live participation. To lint AND validate the new contract with the
reviewed GenVM runner bundle, set `GENVM_VERSION=v0.6.0-rc8` in your process and
run `genvm-lint check contracts/valorant_match_resolver.py --json` (linter 0.10.0
verified locally; `requirements.txt` also lists the newer RC).

## Scope boundary

The repository does not fund wallets or run bots automatically. Any disclosed bot address is informational and must be authorized and funded separately before use.
