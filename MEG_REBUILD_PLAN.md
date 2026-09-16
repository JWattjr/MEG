# MEG rebuild plan

## Scope

Build a standalone Valorant prediction-market game named MEG — Moment Esports Grid — from a local product foundation in `C:\Users\User\Desktop\Moment Grid Genlayer`.

## Source audit

- Primary product surface: `web`, a Next.js App Router application. Unrelated source applications are excluded.
- Reusable frontend foundation: wallet controls, StudioNet client helpers, on-chain round/entry reads, Guided Play patterns, route shell, and responsive game composition.
- Reusable economic foundation: the audited nine-cell game accounting, including nine isolated ledgers, 5/10/15% cell allocations, 5% jackpot, 5% revenue, pari-mutuel claims, jackpot line qualification, partial invalid-cell refunds, underfilled-round refunds, timeout refunds, and double-claim protection.
- Reusable resolver foundation: `match_round_resolver.py`, including immutable registration, allow-listed evidence, validator consensus, persisted resolution before dispatch, retryable outcomes, and two-step ownership.
- Reusable test foundation: direct GenLayer VM fixtures and the source project’s economics/resolution test conventions.
- Legacy sport-specific surfaces, fixtures, copy, hosted-network configuration, deployment addresses, and unrelated game code are not carried into MEG.

## Implementation sequence

1. Define a reusable `MarketPack` schema for nine Valorant cells, three row tiers, three columns, options, evidence sources, resolution rules, and final/invalid state.
2. Create fresh `MomentEsportsGridGame` and `EsportsMatchResolver` contracts. Preserve proven money movement while changing the resolver to emit nine strict cell results and keep bitmap fields only as the settlement adapter.
3. Replace shared scoring with Valorant market-pack configuration, packed-grid serialization, deterministic line scoring, and economics helpers.
4. Rebuild the web UI as an original MEG broadcast-operations desk: grid-first, cobalt/acid-lime/cream, mobile-first, keyboard accessible, and honest about synthetic data versus StudioNet state.
5. Adapt Play, Matches, My Entries, Rankings, Rules, Integrity, and GenLayer Proof routes. Add coming-next League of Legends and Call of Duty placeholders without implementing their packs.
6. Add documentation, synthetic fixture data, StudioNet-only environment defaults, bot disclosure/runbook notes, and direct/unit/e2e coverage.
7. Run linting, type checking, builds, direct tests, and one bounded desktop/mobile browser verification pass. Do not deploy, publish, initialize Git, commit, push, or fund bots.

## Acceptance gates

- No legacy sport, hosted-network, or unrelated game product language remains in the MEG surface.
- No existing Moment Grid contract address is presented as a MEG deployment.
- The UI clearly shows nine calls, nine pools, one series, one signature, evidence-backed resolution, exact fees, refund conditions, and immutable acceptance.
- Synthetic fixtures are visibly labeled and never presented as live fixtures.
- StudioNet is the only supported public network; localnet is test-only.
- Contract tests cover variable stakes, rounding, isolated pools, jackpot qualification, invalid cells, refund paths, resolver disagreement, and early/duplicate resolution.
