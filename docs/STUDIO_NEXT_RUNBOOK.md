# Studio Next runbook

This is the operator record for the MEG hackathon deployment on GenLayer Studio Next / Studio Devnet (chain ID `61997`). It records public deployment evidence only; no private key belongs in the repository, Vercel, or the browser.

## Preflight

1. Use the matching RC stack: `genlayer-js@2.0.0-rc.1`, `@genlayer/transaction-kit@0.1.0-rc.2`, `genlayer@0.40.0-rc.3`, and the GenLayer Python v0.19 RC line.
2. Confirm the canonical RPC is `https://studio-dev.genlayer.com/api` (the browser alias `https://studio-next.genlayer.com/api` may resolve to the same chain).
3. Confirm chain ID `61997` and explorer `https://explorer-studio-dev.genlayer.com/`.
4. Run the frontend checks, direct contract tests, GenVM lint, and read-only contract validation before deployment.
5. Review the verified fixture: Team Liquid vs Paper Rex, Valorant Champions 2026 Group Stage Opening (C), best-of-three, Map 1 veto pending, with the locked official schedule and VLR source URLs.

## Deployment record

The following fields are filled only after a fresh transaction is finalized on Studio Next.

- Network: `GenLayer Studio Devnet` / Studio Next
- Chain ID: `61997`
- RPC: `https://studio-dev.genlayer.com/api`
- Explorer: `https://explorer-studio-dev.genlayer.com/`
- Game contract: `0x3Dc2e4Bc192f0C39bA3930BB584342906d30e75a`
- Game deployment transaction: `0x782ab7b1368e536f0a1e2184297a282eca0eb25fa9e59a020e779bb1a815e7f4`
- Resolver contract: `0x54EfF381f3DE7809653ddbaCdCF40f1f6bcF4d97`
- Resolver deployment transaction: `0xcd2693f03b9913e55ecdcf41b9ad745b2a651d36d798f23473a2137434c608b0`
- Resolver registration transaction: `0xaba7f6bff5bd42ac91766a50b1ded6b70501b3c3225c2233e0ef3750c408ea97`
- Game round creation transaction: `0x451369ac24904fcc948958937bda7bcfdbcb00a364af4bcdb9a58d275077754b`
- Round ID: `meg-champions-2026-group-c-tl-prx`
- Resolution ID: `meg-champions-2026-group-c-tl-prx-20260924`
- Match ID: `valorant-champions-2026-group-c-opening-tl-prx`

## Original deployment sequence (historical; do not repeat for v2)

1. Deploy fresh `MomentEsportsGridGame` and `EsportsMatchResolver` contracts with the pinned GenVM runner.
2. Register the resolution with the two approved source URLs and the exact match metadata. Verify the registration is finalized before opening the round.
3. Create the game round using the fresh resolver address and matching resolution ID.
4. Verify code, schema, round state, resolver state, nine cell pools, source references, stake quote, and protocol balances from a read-only client.
5. Keep the resolution pending until the match record is final. Do not call `resolve_round` for a scheduled, postponed, disputed, or partially evidenced match.
6. Use Transaction Kit’s live fee estimate and tracking for wallet writes. A fee quote must not be assumed; Studio Next may report gasless policy.

## Additive Valorant v2 follow-up

`contracts/valorant_match_resolver.py`, version `valorant-bo3-v2`, is implemented;
**deployed only when a real successful finalized transaction exists**. No v2
address or deployment hash is assumed. Do not modify/migrate/redeploy any of
the existing game, v1 resolver, leagues or COD addresses.

V1 stores no player names, so its cell-5 prompt cannot bind the board's named
options. V2 fixes this for NEW rounds by registering both players and returning
the complete schema. It retains the Valorant nine-cell indexing and separate
persisted consensus → finalized dispatch into the existing game's
`accept_resolution`. Unknown/incomplete per-cell facts are INVALID, conflicting
publishers remain pending, and cancelled/postponed matches remain pending for
the game's full-refund path. B 2–0 has no exact-score choice in the existing
board, so that one cell is INVALID rather than misreported.

Order: owner deploys NEW v2 → verify source SHA256/version/owner → set
`NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS` in Vercel → rebuild/stage/check
and promote → verified fixture registration → league create/invite/join → two
manual website entries. The frontend v2 branch is inactive with a blank public
address. See the complete commands in [LIVE_USAGE_RUNBOOK.md](LIVE_USAGE_RUNBOOK.md).

## Existing-contract refund and league operations

For the expired original round, verified new fixtures and two-wallet leagues,
follow [LIVE_USAGE_RUNBOOK.md](LIVE_USAGE_RUNBOOK.md). It provides dry-run-first
commands for `activate-refunds.mjs`, `register-valorant-round.mjs` and
`league-smoke.mjs`, plus the manual website-entry gates. These operate existing
game/league contracts and the NEW v2 for new registrations; do not redeploy or change the addresses above. The owner alone runs
signing commands with local process-environment keys. Inspect finalized
execution success and resulting state, not just transaction submission.

At the earlier 10 October follow-up, future-fixture verification and legacy-only
board binding were blockers. The additive implementation addresses board binding
conditionally on v2 deployment/activation. Fixture verification, deployment and
signed live usage still require owner action; tests are not transaction evidence.

## Vercel and submission evidence

- Repository: `https://github.com/JWattjr/MEG`
- Branch: `main`
- Public app URL: https://moment-grid-genlayer.vercel.app
- Public contract addresses and transaction hashes: recorded above; each transaction finalized with accepted consensus
- Demo video: record the script in `docs/DEMO_VIDEO_SCRIPT.md`; do not claim a video URL until it is uploaded.
