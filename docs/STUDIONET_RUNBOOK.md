# StudioNet runbook

This is an operator checklist for a fresh MEG deployment. It does not deploy or fund anything by itself.

## Preflight

1. Confirm the active network is StudioNet and the RPC endpoint is the intended StudioNet endpoint.
2. Pin the exact GenVM runner hash in both contract headers. Do not replace it with a floating dependency.
3. Build and lint the frontend, run shared tests and typecheck, run the direct contract suite, and record the artifacts.
4. Review the market pack: nine cells, three options per cell, stable IDs, row/column labels, resolution rules, approved source labels, and synthetic/live disclosure.
5. Confirm no secret `.env.local`, wallet seed, private key, bot funding, or unrelated game data is entering the repository.

## Deploy and register

1. Deploy fresh `MomentEsportsGridGame` and `EsportsMatchResolver` contracts on StudioNet using the approved operator wallet.
2. Record contract addresses and transaction hashes in the deployment record; do not place private keys in the app environment.
3. Register each match resolution with two or three distinct approved publishers from the resolver allowlist. Lock the source list before entries open.
4. Create the game round with `resolver_address`, the matching `resolver_resolution_id`, the same match ID, timestamps, minimum participants, minimum total stake, and minimum unique grids.
5. Verify the round view, resolver view, stake quote, and source list from a second read-only wallet.

## Safe opening

1. Set `NEXT_PUBLIC_GENLAYER_GAME_NETWORK=studionet` and fill only the public contract addresses and round IDs.
2. Confirm the UI shows the correct teams, format, map, lock time, network, exact allocation, and “synthetic” or “live” status.
3. If controlled bots are used for liquidity testing, obtain explicit authorization, disclose their addresses, and fund them separately. Never start or fund them as part of this runbook.
4. Keep the resolver pending until the match is final. Do not resolve a scheduled, live, postponed, conflicting, or partially evidenced match.

## Settlement and recovery

1. After the evidence window opens, call `resolve_round` and inspect the persisted nine-cell JSON before dispatch.
2. Dispatch only a `SETTLED` result. Confirm the game accepts the exact resolver ID and match ID.
3. Process settlement in batches of at most 100 entries, then verify `SETTLED`, jackpot accounting, revenue liability, and claimable balances.
4. For a missing or conflicting record, leave the resolution pending and retry after the match has a final, source-grounded record.
5. For underfilled, cancelled, or timed-out rounds, use the contract refund path and verify that every entry can claim its original stake.
6. Pause the contracts if the evidence feed or deployment state is suspect. Record the reason and resume only after review.
