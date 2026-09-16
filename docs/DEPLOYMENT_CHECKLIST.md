# MEG deployment checklist

Deployment is intentionally manual and out of scope for this rebuild. Complete every gate before any public StudioNet launch.

## Repository gate

- [ ] Target workspace contains no `.git`, `.next`, `node_modules`, logs, secret env files, or source-only unrelated game directories.
- [ ] No source-era sport, legacy product, or legacy network language remains in product UI, docs, config, or public routes.
- [ ] Root and web package names are `meg` / `web`; shared package is `@meg/scoring`.
- [ ] Git history, remotes, commits, pushes, and deployment commands remain untouched.

## Product gate

- [ ] The home route shows all nine Valorant cells with common/medium/rare and team/map/player labels.
- [ ] Synthetic fixture content is visibly labelled and no live fixture or stat is invented.
- [ ] Guided Play is dismissible and does not trap the user; keyboard focus, labels, reduced motion, and mobile layout are checked.
- [ ] Exact stake allocation and immutable confirmation are visible before a wallet prompt.

## Contract gate

- [ ] Fresh `MomentEsportsGridGame` and `EsportsMatchResolver` addresses are recorded.
- [ ] Resolver source URLs are approved, distinct publishers and locked before entry.
- [ ] Resolver registration and game round use the same match and resolution IDs.
- [ ] Direct tests, resolver tests, lint, typecheck, build, and E2E all pass.
- [ ] Manual read-only verification covers round, cell pools, resolution JSON, entries, claims, refunds, jackpot rollover, and pause controls.

## Launch gate

- [ ] `NEXT_PUBLIC_GENLAYER_GAME_NETWORK=studionet` is set; no private key is exposed to Next.js.
- [ ] Any bots are explicitly authorized, publicly disclosed, and separately funded.
- [ ] Operators have a rollback/pause contact and a written evidence/recovery record.
- [ ] No public launch, contract funding, or traffic switch occurs until the operator explicitly approves it.
