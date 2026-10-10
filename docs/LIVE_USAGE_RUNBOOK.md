# Owner-operated live usage checks

The agent implements an ADDITIVE Valorant v2 contract; it never signs transactions.
Do not modify, migrate or redeploy the existing game, Valorant v1, leagues or COD resolver.
Run from the MEG repository root. Install dependencies with `pnpm install --frozen-lockfile`.
Keys are read only from the local process environment for non-dry-run commands:
`GENLAYER_PRIVATE_KEY` (wallet 1; game/resolver owner for registration) and
`GENLAYER_PRIVATE_KEY_2` (wallet 2). Never paste keys into commands, chat, files,
logs, screenshots or Git. Dry-runs do not access either key. Do not dump your environment.
All scripts bind chain 61997 and `https://studio-dev.genlayer.com/api`.
Writes are sequential, have a 0.2 test GEN fee-deposit cap per transaction, wait
for FINALIZED **and successful execution**, then verify the resulting state.
A printed submitted hash is not successful-usage evidence until these checks pass.
On a timeout, inspect that hash before retrying; never assume a timeout means failure.

## 1. Activate the expired round's refunds

```powershell
node scripts/activate-refunds.mjs meg-champions-2026-group-c-tl-prx --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Refund preflight failed; stop.' }
node scripts/activate-refunds.mjs meg-champions-2026-group-c-tl-prx
if ($LASTEXITCODE -ne 0) { throw 'Inspect the transaction before continuing.' }
```

The dry-run must show OPEN or SCORING and `refund_at` at or before now. The live
command must show FINALIZED + SUCCESS and the re-read status REFUNDING. This
activates claims; it does **not** transfer the participants' refunds automatically.
Each original participant claims separately through the selected round's website.
A second invocation after success refuses REFUNDING by design.

## 2. Verified upcoming fixture — currently blocked

Research on 10 October 2026 did not establish a fixture satisfying **all** gates.
Do not register either candidate or mark it verified based on this research:

- [Riot's official LCQ announcement](https://valorantesports.com/en-US/news/eyntk-gc-americas-lcq-2026)
  and [official schedule](https://valorantesports.com/en-US/valorantesports) list
  the 14 October FlyQuest RED/Akave match at 18:00 UTC; its
  [VLR match page](https://www.vlr.gg/766309/flyquest-red-vs-akave-esports-gc-game-changers-2026-americas-last-chance-qualifier-rr)
  lists 14:00 CDT, or 19:00 UTC. This one-hour conflict is unresolved.
- The official schedule lists Team Vitality/LOUD, Champions upper final, on
  16 October at 06:00 UTC, BO3. The
  [THESPIKE upcoming-match listing](https://www.thespike.gg/jp/events/matches/valorant-champions-tour-2026-champions-shanghai/4233)
  still lists TBD/TBD for this fixture. Two approved match-specific pages
  confirming the named teams could not be verified. A bracket inference is not
  sufficient to mark a fixture verified.

No local live fixture JSON was created. `.local-fixtures/` is gitignored and is
the required location once verification succeeds. Do not use the synthetic
operator unit-test inputs as real fixtures.

Before preparing `.local-fixtures/valorant.json`, verify actual teams, named players, kickoff
in UTC (at least 48 hours away at registration), BO3, official schedule and
two match-specific pages from different approved publishers. Record your
source checks locally; `verified: true` is an operator attestation, not an
automated publisher-content check. Exact allowed origins match the deployed
resolver: `https://valorantesports.com/`, `https://www.vlr.gg/`,
`https://www.thespike.gg/`. Generic calendars alone are not match-specific evidence.

The JSON schema is:

- `verified`, `game`, `resolver`, `round_id`, `resolution_id`;
- UTC `lock_at`, `kickoff_at`, `resolve_not_before`, `resolve_deadline`, `refund_at`
  in `YYYY-MM-DDTHH:MM:SSZ` format, with now < lock < kickoff <= evidence-open
  < evidence-deadline <= refund;
- `metadata`: `game_type: "valorant"`, `rule_version: "valorant-bo3-v2"`,
  `match_id`, `team_a`, `team_b`, `player_a`, `player_b`, `competition`, `match_date`,
  `format_name: "BEST_OF_3"`, `map_1`, and `source_urls` (2–3
  URLs, each from a different approved publisher). Do not guess a veto/map; disclose
  an unannounced opening map as pending rather than inventing its name.

Use game `0x3Dc2e4Bc192f0C39bA3930BB584342906d30e75a` and the NEW source-verified
v2 resolver address (never the v1 address). The script checks both existing
records before writing, registers the resolver first, verifies it, creates the
game round, then verifies all exposed IDs, metadata, bindings, timing and
economic thresholds (1 GEN, 2 participants, 2 GEN total, 2 unique grids).
The v2 view exposes named players, rules and source URLs, so resumption compares
all metadata directly. The script also checks deployed source SHA256, version
and that v2 belongs to the existing game owner before any signing.

### Deploy v2 → set public environment → redeploy site (owner-operated)

Status: **implemented; deployed only when an actual transaction exists**.
The v1 contract stores no player names: its cell-5 prompt cannot bind player A/B.
Its original board remains readable; do not describe v1 player settlement as fixed.
Only v2 supplies authoritative named-player board metadata. Its branch remains
inactive until the public build environment contains its actual deployed address.

Run in repository root, with the game-owner key already set securely in the local
process environment. These commands never echo the key:

```powershell
node scripts/deploy-valorant-resolver.mjs --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Deployment preflight failed; stop.' }
node scripts/deploy-valorant-resolver.mjs
if ($LASTEXITCODE -ne 0) { throw 'Inspect submitted hash; do not blindly redeploy.' }

$megV2 = Read-Host 'NEW v2 PUBLIC address from FINALIZED + SUCCESS + SOURCE VERIFIED output'
node scripts/deploy-valorant-resolver.mjs --dry-run --verify-address $megV2
if ($LASTEXITCODE -ne 0) { throw 'Source/version/owner verification failed; stop.' }
$env:NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS = $megV2

vercel env add NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS production --project moment-grid-genlayer --value $megV2 --visibility config --no-sensitive --yes
if ($LASTEXITCODE -ne 0) { throw 'Check existing public variable; stop before deployment.' }
vercel deploy --prod --skip-domain
if ($LASTEXITCODE -ne 0) { throw 'Staged production build failed; stop.' }
```

If the variable already exists, inspect its public value first, then repeat
`vercel env add` with `--force` only when intentionally replacing that v2 value.
Never replace the legacy resolver variable. Vercel CLI 59.5.0 supports these flags.
The repo is linked to `moment-grid-genlayer`; confirm the CLI's project and build
commit match this release. `NEXT_PUBLIC_` values are build-time: changing the
variable alone cannot update the running site. No signing key goes into Vercel.

Open the staged URL printed by deploy. Verify build success, original Valorant
round/receipts, COD practice and leagues, with no guessed v2 round. Check that
the build uses the verified v2 address. Only then run:

```powershell
$megStagedUrl = Read-Host 'Verified staged deployment URL'
vercel promote $megStagedUrl
if ($LASTEXITCODE -ne 0) { throw 'Promotion failed; stop.' }
```

Registration follows site activation, then league create/invite/join, then the
two MANUAL website entries. Do not promote a build targeting an undeployed v2.

## 3. Registration and league commands (only after both gates are cleared)

Use your two actual **public** wallet addresses; they must correspond to the
locally configured signing keys. Choose a new league ID, or reuse the same ID
only to resume the same host/name/one-round season. Do not interpret membership
as paid participation. Registration wallet 1 must own the game and resolver.

```powershell
node scripts/register-valorant-round.mjs .local-fixtures/valorant.json --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Registration preflight failed; stop.' }
node scripts/register-valorant-round.mjs .local-fixtures/valorant.json
if ($LASTEXITCODE -ne 0) { throw 'Inspect submitted hashes before retrying.' }

$megFixture = Get-Content -LiteralPath .local-fixtures/valorant.json -Raw | ConvertFrom-Json
$megLeagueId = 'meg-live-league-20261010'
$megWallet1 = Read-Host 'Wallet 1 PUBLIC address (not a key)'
$megWallet2 = Read-Host 'Wallet 2 PUBLIC address (not a key)'
node scripts/league-smoke.mjs $megLeagueId $megFixture.round_id --wallet-1 $megWallet1 --wallet-2 $megWallet2 --dry-run
if ($LASTEXITCODE -ne 0) { throw 'League preflight failed; stop.' }
node scripts/league-smoke.mjs $megLeagueId $megFixture.round_id --wallet-1 $megWallet1 --wallet-2 $megWallet2
if ($LASTEXITCODE -ne 0) { throw 'Inspect submitted hashes before retrying.' }
```

Wallet 1 creates the league (and is automatically a member), invites wallet 2,
then wallet 2 joins. Each operation waits for successful finalization and prints
its public hash and explorer link. Matching completed steps can be skipped on
resumption. The final `get_league` must bind the exact round and game and show
both wallets. Existing incompatible IDs, locked seasons or conflicting metadata
stop the process. No fee or key is needed for the dry-run.

COD registration now also supports `--dry-run` with a verified local BO5 JSON
using the existing COD schema and publisher policy. This is not evidence that a
real COD registration or settlement has occurred.

With v2 configured, running either registration script with only `--dry-run`
inspects deployed versions/counts without a fixture and exits **2** (incomplete
fixture preflight). Missing/undeployed v2 address stops Valorant earlier with exit 1.
It must not be described as a successful real-fixture registration test.

## 4. Two manual website entries (not automated)

Only proceed after the fixture is verified, registered, still before `lock_at`,
and the website recognizes its exact market definitions:

1. Open `https://moment-grid-genlayer.vercel.app/?round=<actual-round-id>` in
   separate wallet profiles for each signer. Confirm the actual match, UTC
   kickoff, registered-fixture label and Studio Next chain 61997. If it says
   practice/unverified or shows the old teams/players, **stop**.
2. Wallet 1 connects and confirms league membership at `/leagues`. Select all
   nine calls, review the actual stake (at least 1 GEN), and sign once. Retain
   the public transaction hash. Wait for FINALIZED + successful execution and
   re-read the entry; a wallet approval or submitted hash alone is insufficient.
3. Wallet 2 does the same, selecting a **different** nine-call grid so the game
   reaches its two-unique-grid liquidity requirement. Do not replace a grid
   after signing; existing entries are immutable.
4. Re-read both entries, participant count, total stake and `liquidity_ready`.
   Inspect `/receipts/<actual-round-id>?wallet=<actual-public-address>` for each
   wallet and export JSON. Upcoming-match outcomes must remain pending; a
   receipt display is not proof of match resolution, settlement or payout.
5. Send only the public hashes to the coding agent for read-only verification
   and subsequent documentation. No keys or wallet exports.
