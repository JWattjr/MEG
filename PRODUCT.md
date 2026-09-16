# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: existing Next.js App Router monorepo with a shared TypeScript market-pack package and GenLayer Python contracts

## Users

Primary users are esports fans and testnet wallet users who want to make a compact set of predictions about one Valorant series, inspect the evidence policy, and claim a transparent result or refund.

## Product Purpose

MEG — Moment Esports Grid — lets a player choose nine predictions for one Valorant series, stake at least 1 test GEN in one signed grid, and follow the series through GenLayer-verified outcomes, deterministic pool scoring, claims, or refunds. Success means a first-time visitor understands the game quickly and can distinguish a local illustration from authoritative on-chain state.

## Positioning

MEG turns one esports series into nine independent prediction pools. Each call has its own loser-funded ledger, while a row plus diagonal can unlock a progressive jackpot; GenLayer validators read approved public text evidence and the contract, not an operator, calculates payouts.

## Operating Context

The product is mobile-first and intended for a fast pre-series decision, a locked-entry tracking view, and a later proof/claim review. Local development uses clearly labeled synthetic Valorant fixture data. A production round must be registered with verified teams, date, format, map data, player data, and approved source URLs before predictions lock.

## Capabilities and Constraints

- Nine cells arranged by COMMON, MEDIUM, and RARE rows and TEAM, MAP, and PLAYER columns.
- One payable grid transaction on GenLayer StudioNet; minimum stake is 1 test GEN.
- Three common cells receive 15% total, three medium cells 30%, three rare cells 45%, 5% funds the jackpot, and 5% is platform revenue.
- Cell pools never transfer money between one another. Correct predictors share only their cell’s available payout.
- A row and a diagonal qualify a player for the jackpot. Invalid cells refund their affected cell stake; underfilled, cancelled, and timeout rounds support full refunds.
- Resolution requires registered sources and persisted GenLayer consensus after the series is complete. Missing or conflicting evidence is INVALID, never automatically FALSE.
- StudioNet is the only supported public network. Localnet may be used for automated tests.
- League of Legends and Call of Duty market packs are future extensions and are not implemented now.
- The product does not request or store private keys, wallet passwords, or secrets.

## Brand Commitments

- Brand name: MEG. Expanded name: Moment Esports Grid.
- Suggested tagline: “Nine calls. One series. Prove your read.”
- Original MEG identity; no Riot Games, Valorant Champions Tour, team, or player logos.
- Required notice: “MEG is an independent product and is not affiliated with Riot Games or the Valorant Champions Tour.”
- Voice is direct, competitive, precise, and readable; it should feel like an esports broadcast operations desk, not generic cyberpunk.

## Evidence on Hand

The source project provides tested economic and GenLayer lifecycle patterns. MEG has no verified live Valorant fixture at this stage. Any local fixture, match statistic, player name, balance, or outcome used for development must be labeled synthetic or illustrative. Two disclosed test bots are supported by the architecture but are not run or funded in this build.

## Product Principles

1. Nine calls stay legible as nine separate pools.
2. Chain state is authoritative; previews never masquerade as winnings.
3. Evidence gaps become refunds, not guesses.
4. Every money movement is explainable before a signature.
5. The game is fast to enter and easy to audit later.

## Accessibility & Inclusion

Use semantic controls, keyboard focus states, readable contrast, touch-sized actions, reduced-motion support, status text that does not rely on color alone, and layouts that work at 390px without horizontal overflow.
