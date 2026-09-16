# MEG economics

All figures are denominated in native GEN. The minimum stake is `1 GEN`; the maximum is `100 GEN`. A signed entry allocates the stake before settlement as follows:

| Destination | Share | Applied to |
| --- | ---: | --- |
| Each COMMON cell | 5% | one isolated cell pool |
| Each MEDIUM cell | 10% | one isolated cell pool |
| Each RARE cell | 15% | one isolated cell pool |
| Jackpot | 5% | progressive round jackpot |
| Platform revenue | 5% | released after safe settlement |

The nine pools therefore receive `90%` in total. Each cell is pari-mutuel: winners in that cell share its distributable pool pro rata by the stake allocated to their selected option. A cell with no winning stake returns the affected cell allocation to the players who selected valid options in that cell. An invalid cell returns every affected cell allocation regardless of the selected option.

## Jackpot

The progressive jackpot is won only when an entry completes at least one horizontal line and at least one diagonal line on the settled nine-cell grid. Qualifying entries share the jackpot pro rata by their full entry stake. If nobody qualifies, the jackpot rolls to the next open round or the global rollover balance for the next round created.

## Refunds and solvency

The game contract can open `REFUNDING` for owner cancellation before lock, an underfilled round after lock, or a timeout. In that state every unclaimed entry receives its full original stake. A resolver-invalid cell is narrower: only the cell allocation is returned, while valid cells can still settle. Revenue is released only when settlement or a full refund path is complete, and claims are idempotent through the entry's `claimed` flag.

The UI shows an immutable allocation confirmation immediately before signing. It does not describe projected winnings as guaranteed returns, and the demo does not use live money or fund disclosed bots.
