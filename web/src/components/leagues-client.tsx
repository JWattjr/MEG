"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { isAddress } from "viem";
import { Copy, RefreshCw, Users } from "lucide-react";
import { scoreLeague, type LeagueScore } from "@meg/scoring";
import { createLeague, inviteLeagueMember, joinLeague, leagueRegistryAddress, readLeague, readLeagues, type CommunityLeague } from "@/lib/community-leagues";
import { genLayerGameConfig, readGameRounds, readGameRound, readRoundEntries, type GameRoundRecord, type GenLayerProvider } from "@/lib/genlayer-game";

export function LeaguesClient({ leagueId }: { leagueId?: string }) {
  const { address, connector } = useAccount();
  const [leagues, setLeagues] = useState<CommunityLeague[]>([]);
  const [rounds, setRounds] = useState<GameRoundRecord[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [scores, setScores] = useState<LeagueScore[]>([]);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hash, setHash] = useState("");
  const [now, setNow] = useState(0);
  const connected = isAddress(leagueRegistryAddress);
  const load = useCallback(async () => {
    await Promise.resolve();
    setNow(Date.now());
    setLoading(true); setError("");
    try {
      if (!connected) return;
      if (leagueId) {
        const league = await readLeague(leagueId);
        if (!league) throw new Error("League not found. Check the invitation link.");
        if (league.game_address.toLowerCase() !== genLayerGameConfig.contractAddress.toLowerCase() || league.scoring !== "correct-cells-v1") throw new Error("This league belongs to a different game or scoring version.");
        setLeagues([league]);
        const seasonRounds = (await Promise.all(league.round_ids.map((id) => readGameRound(id)))).filter((round): round is GameRoundRecord => Boolean(round));
        setRounds(seasonRounds);
        const settled = [];
        for (const round of seasonRounds) {
          if (round.status === "SETTLED") settled.push({ status: round.status, entries: await readRoundEntries(round.round_id, round.participant_count) });
        }
        setScores(scoreLeague(league.members, settled, genLayerGameConfig.botAddresses));
      } else {
        const [records, registered] = await Promise.all([readLeagues(), readGameRounds()]);
        setLeagues(records); setRounds(registered.filter((round) => round.status === "OPEN" && Date.parse(round.lock_at) > Date.now()));
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load leagues. Refresh to try again."); }
    finally { setLoading(false); }
  }, [leagueId, connected]);
  useEffect(() => { const initial = window.setTimeout(() => void load(), 0); const timer = window.setInterval(() => setNow(Date.now()), 15_000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [load]);
  const transact = async (operation: (account: `0x${string}`, provider: GenLayerProvider) => Promise<string>) => {
    if (busy) return;
    setBusy(true); setError(""); setNotice(""); setHash("");
    try {
      if (!address || !connector) throw new Error("Connect your wallet to continue.");
      const provider = await connector.getProvider() as GenLayerProvider;
      const tx = await operation(address, provider);
      setHash(tx); setNotice("Confirmed on-chain. The league is updated.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The wallet operation failed. Check the request and try again."); }
    finally { setBusy(false); }
  };
  const league = leagueId ? leagues[0] : null;
  const host = league && address?.toLowerCase() === league.host.toLowerCase();
  const member = league?.members.some((wallet) => wallet.toLowerCase() === address?.toLowerCase());
  const locked = league ? now >= Date.parse(league.join_before) : false;
  return <section className="league-view">
    <div className="feature-toolbar"><Link className="text-link" href={leagueId ? "/leagues" : "/matches"}>{leagueId ? "All leagues" : "Browse matches"}</Link><button className="feature-button" onClick={() => void load()} disabled={loading || busy || !connected}><RefreshCw size={15} />Refresh</button></div>
    <p className="feature-note">One point per correct cell in a settled round. Stake size never changes your score. Ties share a rank; refunded rounds do not score. League membership closes before the first match locks.</p>
    {!connected && <p className="notice-strip">League registration is unavailable until the registry is connected to this deployment.</p>}
    {loading && connected && <p role="status">Reading leagues from Studio Next…</p>}
    {error && <p className="notice-strip" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {hash && <a className="text-link wrap-anywhere" href={`https://explorer-studio-dev.genlayer.com/tx/${hash}`} target="_blank" rel="noreferrer">View confirmed transaction</a>}
    {busy && <p role="status">Review your wallet request. Waiting for execution and finality…</p>}
{!leagueId && connected && <div className="league-layout"><section><h2>Create your league</h2><form className="feature-form" onSubmit={(event) => { event.preventDefault(); void transact(async (account, provider) => { const id = crypto.randomUUID(); const tx = await createLeague(account, provider, id, name.trim(), selected); setNotice(`League created. Open it below to invite your friends.`); setName(""); setSelected([]); return tx; }); }}><label>League name<input minLength={3} maxLength={60} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Friday night squad" /></label><fieldset><legend>Select the season’s rounds</legend>{rounds.length === 0 && !loading && <p>No upcoming registered rounds. A host can create a league after new matches are registered.</p>}{rounds.map((round) => <label className="round-choice" key={round.round_id}><input type="checkbox" checked={selected.includes(round.round_id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, round.round_id] : current.filter((id) => id !== round.round_id))} disabled={busy || (!selected.includes(round.round_id) && selected.length >= 16)} /><span>{round.match_id}<small>Locks {new Date(round.lock_at).toLocaleString()}</small></span></label>)}</fieldset><p className="feature-note">The round list is fixed after creation. You become the host and first member. Creating or joining a league stakes no GEN; network fees apply. Membership and results are public on-chain.</p><button className="primary-control" disabled={busy || loading || selected.length === 0 || !address} type="submit">{address ? "Create league" : "Connect wallet to create"}</button></form></section><section><h2>Recent leagues</h2>{leagues.length === 0 && !loading && <p>No leagues yet. Create the first season for your group.</p>}<div className="league-list">{leagues.map((item) => <Link href={`/leagues/${encodeURIComponent(item.league_id)}`} key={item.league_id}><strong>{item.name}</strong><span><Users size={14} /> {item.members.length} members · {item.round_ids.length} rounds</span><small>{now >= Date.parse(item.join_before) ? "Membership locked" : "Open for invited wallets"}</small></Link>)}</div></section></div>}
    {league && <>
      <div className="receipt-summary"><div><h2>{league.name}</h2><p>{league.members.length} members · {league.round_ids.length} rounds</p><span className="status-tag">{locked ? "MEMBERSHIP LOCKED" : "INVITATION ONLY"}</span></div><button className="feature-button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice("League link copied. The host must also invite the recipient’s wallet."); } catch { setNotice("Copy this page’s URL from your address bar to share the league."); } }}><Copy size={15} />Copy league link</button></div>
      {!member && <button className="primary-control" disabled={!address || busy || locked} onClick={() => void transact((account, provider) => joinLeague(account, provider, league.league_id))}>{address ? "Join with invited wallet" : "Connect wallet to join"}</button>}
      {member && <p>You are on the roster. <Link href="/matches">Make your calls before the rounds lock.</Link></p>}
      {host && !locked && <form className="feature-form invite-form" onSubmit={(event) => { event.preventDefault(); if (!isAddress(invite)) { setError("Enter a valid wallet address."); return; } const wallet = invite; void transact((account, provider) => inviteLeagueMember(account, provider, league.league_id, wallet)); }}><label>Invite a friend’s wallet<input value={invite} onChange={(event) => setInvite(event.target.value.trim())} placeholder="0x…" required /></label><button className="primary-control" disabled={busy || !isAddress(invite)}>Authorize invitation</button></form>}
      <h2>Season standings</h2><div className="table-scroll" role="region" aria-label="League standings" tabIndex={0}><table className="feature-table"><thead><tr><th scope="col">Rank</th><th scope="col">Wallet</th><th scope="col">Points</th><th scope="col">Settled entries</th></tr></thead><tbody>{scores.map((score) => <tr key={score.address}><td>{score.rank}</td><th scope="row" className="wrap-anywhere">{score.address}</th><td>{score.points}</td><td>{score.roundsPlayed}</td></tr>)}</tbody></table></div>
      <h2>Season matches</h2><div className="league-list">{rounds.map((round) => <Link key={round.round_id} href={`/?round=${encodeURIComponent(round.round_id)}`}><strong>{round.match_id}</strong><span>{round.status}</span></Link>)}</div><p className="feature-note">Disclosed automated wallets are excluded from standings. Scores are computed from this roster and the game contract’s settled entries. They are MEG league scores, not GenLayer Portal points.</p>
    </>}
  </section>;
}
