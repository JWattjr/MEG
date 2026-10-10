# MEG leagues, receipts and Call of Duty

Baseline: accepted MEG release `9ba876e`. This release has three independently demonstrable additions. Deployment and live transaction evidence must be recorded after verification; implementation alone is not proof of on-chain execution.

## Boundaries

The browser owns discovery, display, league ranking derived from settled entries, and receipt explanations. The existing game owns stakes, outcome bitmaps, settlement and claims. A new deterministic league registry owns invitations and membership before the first round locks. A new Call of Duty resolver owns approved evidence, independently validated outcomes, and finalized dispatch to the existing game. The operator registers actual fixtures; no schedule, participant count or winning result is fabricated.

Call of Duty v1 supports completed best-of-five series. Cancelled/forfeited series remain pending until the game’s refund deadline permits a full refund. Missing per-cell evidence invalidates the affected cell after the final series is agreed. The selected players, sources and rules are fixed at registration.

## Direction contract

THESIS: Extend MEG’s existing match desk with a league roster and readable settlement ledger.
OWN-WORLD: Inherit DESIGN.md: navy, paper, cobalt, lime, existing typography and outlined controls.
STORY: Choose a round, invite a wallet into a season, make predictions, inspect settled results.
FIRST VIEWPORT: League name and membership action precede roster/rounds. Receipts start with the selected round and authoritative entry total, then the nine-cell ledger.
FORM: Local feature extension; keep existing shell, navigation and table/form conventions. No visual-world replacement or concept seed.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Evidence to collect

- Release diff from the accepted baseline, production URL and new contract addresses.
- League creation, host invitation and a second wallet’s membership transaction.
- Receipt with its round and resolver IDs, evidence references, stake allocation and claim state.
- Call of Duty registration, real evidence resolution and game dispatch receipts.
- Separate implemented, deployed and exercised capabilities. Record real usage only.

## Studio Next deployment, 10 October 2026

The existing game and Valorant resolver remain in use. Two new contracts finalized successfully with validator consensus; deployed source was compared byte-for-byte with the release files.

| Contract | Address | Deployment transaction |
| --- | --- | --- |
| Community leagues | `0x5E1f8CdDab9c0301E3C4a05988d9e29723d0d8d4` | `0xb85c4916bcb622cc363d37abd41a1952ec5c29c1b94d9eadd6287b68552c1605` |
| Call of Duty resolver | `0x03dfc444cb9963D59B146b94e8a062f3B0D498D5` | `0xe570dc7841638b8bd4df1f7d930ecfe8a5225f6f9b9f8ee3db6d1d1944e8d60d` |

Explorer: `https://explorer-studio-dev.genlayer.com/address/<address>` and `/tx/<transaction>`.

Source SHA256: league registry `b189862ae9367c355f926948146a6ea599d5146f791803c9b075db57dacd532c`; COD resolver `71e09a7389b8f0209820ed6e013dff878649ba6476195e611dd226c3d1d3765e`.

Verification: 45 direct contract tests and 13 shared scoring/economic tests pass, including independent validator disagreement, source conflicts, incomplete statistics, cancellation, invitation authorization, duplicate membership, lock deadlines, receipt allocation and exact RPC integer conversion. Four browser workflows pass. TypeScript and lint checks pass. Direct tests and validator callbacks do not prove real publisher retrieval and full live consensus for a COD match.

Live state at verification: zero leagues and zero COD registrations. The existing Valorant round is past its lock. No verified upcoming COD fixture was found in the official schedule. The new pack is available in non-signing practice; a genuine upcoming fixture must be registered before league creation or COD staking can be exercised publicly. Do not claim completed COD settlement, two-wallet league usage, or new organic traction from this release.

## Register an actual Call of Duty fixture

Use the game-owner account through the GenLayer CLI or the operator utility. The utility reads `GENLAYER_PRIVATE_KEY` only from the operator’s local process environment; never paste a key into the site, an issue, a submission, or a committed file. Run `node scripts/register-cod-round.mjs <private-local-fixture.json>` from the repository root.

The JSON must contain `verified: true`, `game`, `resolver`, `round_id`, `resolution_id`, `lock_at`, `kickoff_at`, `resolve_not_before`, `resolve_deadline`, `refund_at`, and `metadata`. Metadata contains `match_id`, `team_a`, `team_b`, `player_a`, `player_b`, `competition`, `match_date`, `format_name: "BEST_OF_5"`, and `source_urls`.

Verify identity, scheduled start, format, named players and usable match-specific evidence pages before setting `verified`. Use two or three distinct approved publishers: callofdutyleague.com, breakingpoint.gg, and liquipedia.net/callofduty/. All timestamps use UTC `YYYY-MM-DDTHH:MM:SSZ`. Membership and prediction locks precede kickoff; evidence collection follows kickoff; the evidence deadline must be no later than the refund deadline. The script registers the resolver first, then creates the game round with 1 GEN minimum stake, two participants, 2 GEN total liquidity, and two unique grids. It refuses mismatching existing registrations.

After registration, open `/?round=<round_id>`. Create a league on `/leagues`, select the round, authorize a second wallet and let that wallet join before lock. Both players make their own game entries. Resolve after the evidence window opens, dispatch after consensus settles, process game settlement, then inspect `/receipts/<round_id>?wallet=<wallet>` and claim from the selected round. On cancellation or unresolved evidence, activate game refunds after `refund_at` instead of dispatching fabricated results.

## Milestone submission draft

Title: **MEG community leagues, transparent settlement receipts and Call of Duty support**.

Compared with the accepted MEG release, this update adds invitation-only on-chain league rosters, fixed seasons and equal-weight rankings from settled calls; public round-specific settlement explanations with evidence, stake allocation, refund reasoning and JSON export; and a nine-market Call of Duty BO5 pack with a dedicated Studio Next resolver. The resolver compares distinct publishers and requires independent validators to agree on outcomes. Deployment transactions, source code and reproducible tests provide evidence of new work. Real COD fixture settlement and two-wallet league activity are pending a verified upcoming registration.

Use one milestone submission for the combined release if only one weekly slot remains. Point awards are determined by review. Attach the GitHub diff, production routes and both new explorer links, and describe any subsequent real usage separately with transaction evidence.

## Reproducible public review path

Production website: [MEG](https://moment-grid-genlayer.vercel.app/). Implementation commit: `6bd470bd481e6d7ca2001d57a7963e8bb04a95fe`; reviewed application release: `3e73e4bbac732e32835cb65f7165c45ba5200d6d`.

1. Open [Call of Duty practice](https://moment-grid-genlayer.vercel.app/?game=call-of-duty). Check the nine BO5-specific questions, select calls or quick-fill a draft, and open the review. The board is visibly synthetic; signing remains disabled. No wallet or funds are needed to inspect this pack.
2. Open [the public entry explanation](https://moment-grid-genlayer.vercel.app/receipts/meg-champions-2026-group-c-tl-prx?wallet=0x1eE3B827907429E5dF3DB7282446b6E065ff6199). This existing public entry shows its original 1 GEN stake, nine predictions, 0.9 GEN cell allocation, and separate 0.05 GEN jackpot/platform allocations. Its outcomes are pending and its available claim is 0 GEN; this is not a completed settlement. Export JSON to inspect the exact integer amounts, round binding, and observed state.
3. Open [community leagues](https://moment-grid-genlayer.vercel.app/leagues). Inspect equal-weight settled-call scoring, invitation-only membership, fixed season rules and the creation form. With no future registered round, creation is intentionally unavailable. The registry is deployed, but this release does not yet demonstrate a created league or a second wallet joining.
4. Compare [the new code against the accepted release](https://github.com/JWattjr/MEG/compare/9ba876e...15b70eb), then inspect the [league registry](https://explorer-studio-dev.genlayer.com/address/0x5E1f8CdDab9c0301E3C4a05988d9e29723d0d8d4) and [COD resolver](https://explorer-studio-dev.genlayer.com/address/0x03dfc444cb9963D59B146b94e8a062f3B0D498D5). The deployed source matches the release contracts.

Authenticated staged-production checks passed on all three routes at desktop 1440×960 and mobile 390×844, with no browser exceptions or document-level horizontal overflow. The existing entry rendered all nine rows and exported JSON on both devices. Horizontally scrollable ledger tables retain their full columns on narrow screens. These checks do not replace live league creation/joining or real COD resolution.

## Final release verification

The corrected production deployment `dpl_EdS2kuGRQcsuaWFqrz4qCojqmDB9` is READY and was promoted to the public website on 10 October 2026. Framework: Next.js 16.2.12. Vercel build: 43 seconds. Its immutable URL is [the reviewed deployment](https://moment-grid-genlayer-ahjb426sj-wattxs-projects.vercel.app); this URL retains Vercel authentication while the public website is accessible without the temporary verification session.

Post-promotion public checks passed: all nine COD draft selections and review, disabled synthetic signing, past-lock match discovery, Studio Next chain 61997 through the deployed API, connected league registry, and a real-entry nine-cell receipt with JSON download. Final lint, TypeScript, local production build and all four browser regression tests passed. The development-server rerun had timed out before assertions; the compiled-server rerun passed all four in 4.2 seconds. The recent Vercel error-log query returned no logs; monitoring/drains were not audited, so this is not a claim that every runtime error would be detected.

Impeccable's fresh finish review found one material mapping issue: a stray header spacer shifted TEAM/MAP/PLAYER. The spacer was removed and a regression assertion added. The reviewer scored that finding **resolved**, with a **ship** verdict scoped to this correction. All six corrected desktop/mobile captures were validated. The documentation comparison preserved the incumbent visual system without changing DESIGN.md or repairing pre-existing token/sidecar drift. No new shipping raster assets were introduced.

Submission remains a separate owner action. Do not claim live COD settlement or live league participation until a genuine upcoming round has been registered and the transactions have been exercised.
