import { hexToBytes, isAddress } from "viem";
import { client, writeFinalized, type GenLayerProvider } from "./genlayer-game";

export const leagueRegistryAddress = process.env.NEXT_PUBLIC_MEG_LEAGUES_ADDRESS?.trim() ?? "";
export const codResolverAddress = process.env.NEXT_PUBLIC_MEG_COD_RESOLVER_ADDRESS?.trim() ?? "";
export type CommunityLeague = { league_id: string; name: string; host: string; round_ids: string[]; join_before: string; created_at: string; members: string[]; scoring: string; game_address: string };
function registry(): `0x${string}` {
  if (!isAddress(leagueRegistryAddress)) throw new Error("The league registry is not connected in this deployment.");
  return leagueRegistryAddress;
}
export async function readLeague(id: string): Promise<CommunityLeague | null> {
  const record = await client().readContract({ address: registry(), functionName: "get_league", args: [id] }) as CommunityLeague;
  return record?.league_id ? record : null;
}
export async function readLeagues(): Promise<CommunityLeague[]> {
  const count = Number(await client().readContract({ address: registry(), functionName: "get_league_count", args: [] }));
  const records: CommunityLeague[] = [];
  // Bounded recent discovery; older leagues remain addressable by their invite URL.
  for (let index = count - 1; index >= Math.max(0, count - 12); index--) {
    const id = await client().readContract({ address: registry(), functionName: "get_league_id", args: [index] }) as string;
    const league = await readLeague(id);
    if (league) records.push(league);
  }
  return records;
}
export function createLeague(account: `0x${string}`, provider: GenLayerProvider, id: string, name: string, rounds: string[]) {
  return writeFinalized(account, provider, registry(), "create_league", [id, name, JSON.stringify(rounds)]);
}
export function inviteLeagueMember(account: `0x${string}`, provider: GenLayerProvider, id: string, wallet: `0x${string}`) {
  // GenLayer calldata distinguishes addresses from strings.
  return import("genlayer-js/types").then(({ CalldataAddress }) => writeFinalized(account, provider, registry(), "invite_member", [id, new CalldataAddress(hexToBytes(wallet))]));
}
export function joinLeague(account: `0x${string}`, provider: GenLayerProvider, id: string) {
  return writeFinalized(account, provider, registry(), "join_league", [id]);
}
