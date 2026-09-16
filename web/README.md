# MEG web client

The Next.js client is the playable, reviewer-facing surface for Moment Esports Grid. It exposes the Valorant market pack, transparent GEN allocation, wallet-gated signing, contract-backed entries, and the GenLayer proof route.

Routes:

- `/` — build and confirm the nine-cell entry.
- `/matches` — synthetic fixture disclosure and configured round state.
- `/entries` — the connected wallet's contract-backed entry and claim/refund state.
- `/rankings` — contract-derived settled standings, excluding disclosed bots.
- `/rules` — market, settlement, and responsible-play rules.
- `/integrity` — trust boundary and recovery paths.
- `/genlayer` — the resolver's strict nine-cell proof record.

Run from the repository root:

```bash
pnpm install
pnpm --filter @meg/scoring build
pnpm --filter web dev
```

The default port is `3003`. The app does not invent live fixtures or stats. With no configured address it says exactly that the chain state is unavailable and leaves signing disabled.
