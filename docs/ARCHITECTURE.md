# MEG architecture

## Boundaries

MEG is split into a browser product, a reusable market schema, and two fresh GenLayer contracts. The browser owns presentation and wallet orchestration; the contracts own escrow, settlement, claims, and resolver persistence.

```text
Next.js web client
  ├─ @meg/scoring market pack + packing + economics
  ├─ StudioNet wagmi transport
  └─ game/resolver read + write adapters

MomentEsportsGridGame
  ├─ one entry per wallet per round
  ├─ nine isolated cell pools
  ├─ valid/outcome bitmaps from resolver
  ├─ pari-mutuel claims and refunds
  └─ row + diagonal jackpot accounting

EsportsMatchResolver
  ├─ approved source allowlist locked at registration
  ├─ GenLayer source extraction and validator comparison
  ├─ strict nine-cell result JSON
  └─ optional permissionless dispatch to the game contract
```

## Market-pack contract

The TypeScript pack is the source of truth for the initial Valorant cells. Every cell has a stable `cellIndex` from 0–8, a row (`COMMON`, `MEDIUM`, `RARE`), a column (`TEAM`, `MAP`, `PLAYER`), three options, an explanation, a resolution rule, approved source labels, and explicit invalid states. The UI can later load a League of Legends or Call of Duty pack without changing the game accounting contract.

Option IDs are stable integers 1–27: `optionId = cellIndex * 3 + optionIndex + 1`. A packed grid stores one option ID in each byte, so a complete grid fits in 72 bits. Settlement keeps three bitmaps, one per grid column, to preserve the existing compact contract interface; the resolver also persists the full nine-cell JSON record so cell-level `RESOLVED` and `INVALID` outcomes remain inspectable.

## Lifecycle

1. The operator registers the resolver record and creates a round with lock, kickoff, resolution, refund, liquidity, and grid-diversity floors.
2. A player selects all nine options. The UI renders the exact `5% + 10% + 15%` row allocation, the `5%` jackpot contribution, and the `5%` platform share before the wallet signs.
3. `join_round` stores one immutable packed grid and distributes the stake into the nine independent option pools.
4. After the registered resolution window opens, GenLayer reads only the locked approved publishers. It persists consensus first. A later permissionless call dispatches the accepted bitmaps to the game.
5. If liquidity is ready, the game enters scoring, processes jackpot qualification in bounded batches, then opens claims. If a cell is invalid, its affected option stakes are refundable; if the round is underfilled, timed out, cancelled, or otherwise cannot settle safely, the whole entry is refundable.
6. Claims are individually marked before native GEN is transferred, and every payout path checks the round liability.

## Trust boundaries

The client never accepts a caller-provided outcome. It does not claim that a blank-address preview is on chain. The resolver treats source text as untrusted evidence, never guesses unsupported facts, and compares the complete structured result—including all nine cell records—before persisting consensus. Contract addresses and source URLs are deployment inputs, not UI overrides.

Automated direct tests run against local GenVM. The product configuration exposes StudioNet only; no other hosted network is presented in the UI.
