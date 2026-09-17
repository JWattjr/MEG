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
- RPC: `https://studio-next.genlayer.com/api`
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

## Safe operating sequence

1. Deploy fresh `MomentEsportsGridGame` and `EsportsMatchResolver` contracts with the pinned GenVM runner.
2. Register the resolution with the two approved source URLs and the exact match metadata. Verify the registration is finalized before opening the round.
3. Create the game round using the fresh resolver address and matching resolution ID.
4. Verify code, schema, round state, resolver state, nine cell pools, source references, stake quote, and protocol balances from a read-only client.
5. Keep the resolution pending until the match record is final. Do not call `resolve_round` for a scheduled, postponed, disputed, or partially evidenced match.
6. Use Transaction Kit’s live fee estimate and tracking for wallet writes. A fee quote must not be assumed; Studio Next may report gasless policy.

## Vercel and submission evidence

- Repository: `https://github.com/JWattjr/MEG`
- Branch: `codex/studio-next-launch`
- Public app URL: https://moment-grid-genlayer.vercel.app
- Public contract addresses and transaction hashes: recorded above; each transaction finalized with accepted consensus
- Demo video: record the script in `docs/DEMO_VIDEO_SCRIPT.md`; do not claim a video URL until it is uploaded.
