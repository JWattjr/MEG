import { allocateStake, MAXIMUM_STAKE_WEI as SHARED_MAXIMUM_STAKE_WEI, MINIMUM_STAKE_WEI as SHARED_MINIMUM_STAKE_WEI, packGrid, type MarketOptionId } from "@meg/scoring";
import { createTransactionKit, type SubmitInput } from "@genlayer/transaction-kit";
import { createClient } from "genlayer-js";
import { localnet, studioDevnet } from "genlayer-js/chains";
import { ExecutionResult, type CalldataEncodable, type TransactionHash } from "genlayer-js/types";
import { formatEther, isAddress, parseEther } from "viem";
import { ensureStudioNextNetwork, type Eip1193Provider } from "./wagmi";

export const MINIMUM_STAKE_GEN = "1";
export const MINIMUM_STAKE_WEI = SHARED_MINIMUM_STAKE_WEI;
export const MAXIMUM_STAKE_WEI = SHARED_MAXIMUM_STAKE_WEI;
export type RoundStatus = "OPEN" | "SCORING" | "SETTLED" | "REFUNDING";
export type GenLayerProvider = NonNullable<NonNullable<Parameters<typeof createClient>[0]>["provider"]>;

export type GameRoundRecord = {
  round_id: string;
  match_id: string;
  resolver_address: string;
  resolver_resolution_id: string;
  status: RoundStatus;
  minimum_stake: bigint;
  maximum_stake?: bigint;
  lock_at: string;
  kickoff_at?: string;
  resolve_not_before?: string;
  refund_at: string;
  minimum_participants?: bigint;
  minimum_total_stake?: bigint;
  minimum_unique_grids?: bigint;
  unique_grid_count?: bigint;
  liquidity_ready?: boolean;
  participant_count: bigint;
  total_escrow: bigint;
  total_pool_stake: bigint;
  total_claimed: bigint;
  jackpot_seed: bigint;
  jackpot_pool: bigint;
  jackpot_winning_stake: bigint;
  jackpot_paid: bigint;
  jackpot_rolled_over: boolean;
  jackpot_rollover_destination?: string;
  revenue_pool: bigint;
  settlement_cursor: bigint;
  window_0_bitmap: bigint;
  window_1_bitmap: bigint;
  window_2_bitmap: bigint;
  window_0_valid_bitmap?: bigint;
  window_1_valid_bitmap?: bigint;
  window_2_valid_bitmap?: bigint;
  resolution_accepted_at?: string;
  settled_at: string;
};

export type GameEntryRecord = {
  player?: string;
  packed_grid: bigint;
  stake_amount: bigint;
  claimed: boolean;
  joined_at: string;
  marked_mask: bigint;
  completed_lines: bigint;
  jackpot_qualified: boolean;
  claimable: bigint;
};

export type GameRoundResolutionRecord = {
  resolution_id: string;
  match_id: string;
  status: "PENDING" | "SETTLED";
  reason_code: string;
  match_status: string;
  evidence_summary: string;
  source_references_json: string;
  cell_results_json?: string;
  attempt_count: bigint;
  dispatch_count: bigint;
  resolved_at: string;
};

export type GameCellPool = {
  cell: bigint;
  tier: "COMMON" | "MEDIUM" | "RARE";
  total_pool: bigint;
  option_0_moment_id: bigint;
  option_0_stake: bigint;
  option_1_moment_id: bigint;
  option_1_stake: bigint;
  option_2_moment_id: bigint;
  option_2_stake: bigint;
  winning_stake: bigint;
  refundable_stake?: bigint;
  paid: bigint;
};

type GenLayerClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
const requestedNetwork = process.env.NEXT_PUBLIC_GENLAYER_GAME_NETWORK?.trim().toLowerCase() ?? "studio-next";
const networkSetting = requestedNetwork === "localnet" ? "localnet" : "studio-next";
const networks = {
  localnet: { chain: localnet, connectName: "localnet" as const },
  "studio-next": { chain: studioDevnet, connectName: "studioDevnet" as const },
};
const selectedNetwork = networks[networkSetting];
const contractAddress = process.env.NEXT_PUBLIC_GENLAYER_GAME_ADDRESS ?? "";
const resolverAddress = process.env.NEXT_PUBLIC_GENLAYER_ROUND_RESOLVER_ADDRESS ?? "";
const roundId = process.env.NEXT_PUBLIC_GENLAYER_GAME_ROUND_ID ?? "";
const botAddresses = (process.env.NEXT_PUBLIC_GENLAYER_BOT_ADDRESSES ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter((value, index, values) => isAddress(value) && values.indexOf(value) === index);
const formBotAddress = process.env.NEXT_PUBLIC_GENLAYER_FORM_BOT_ADDRESS?.trim().toLowerCase() ?? "";
const chaosBotAddress = process.env.NEXT_PUBLIC_GENLAYER_CHAOS_BOT_ADDRESS?.trim().toLowerCase() ?? "";
const endpoint = process.env.NEXT_PUBLIC_GENLAYER_GAME_RPC_URL?.trim() || (networkSetting === "studio-next" && typeof window !== "undefined" ? "/api/genlayer" : undefined);
const networkLabel = networkSetting === "studio-next" ? "Studio Next" : "Localnet test";

export const genLayerGameConfig = {
  contractAddress,
  resolverAddress,
  roundId,
  endpoint,
  network: networkSetting,
  chainId: selectedNetwork.chain.id,
  enabled: isAddress(contractAddress) && isAddress(resolverAddress),
  activeRoundEnabled: isAddress(contractAddress) && isAddress(resolverAddress) && Boolean(roundId),
  botAddresses,
  deploymentLabel: networkSetting === "studio-next" ? "Studio Next · MEG" : "Localnet · tests only",
  networkLabel,
  validatorLabel: networkSetting === "studio-next" ? "Studio Next validators" : "local test validators",
  entryLockNote: `After acceptance, the grid is immutable and the registered series stays fixed on ${networkLabel}.`,
  entryAcceptedNote: `Accepted by ${networkLabel} validators. Your entry is recorded on the MEG game contract.`,
};

export function isDisclosedTestBot(address?: string): boolean {
  return Boolean(address && genLayerGameConfig.botAddresses.includes(address.toLowerCase()));
}

export function disclosedBotLabel(address?: string): string | null {
  const normalized = address?.toLowerCase();
  if (!normalized || !genLayerGameConfig.botAddresses.includes(normalized)) return null;
  if (normalized === formBotAddress) return "Form Bot";
  if (normalized === chaosBotAddress) return "Chaos Bot";
  return "Disclosed Bot";
}

function client(account?: `0x${string}`, provider?: GenLayerClientConfig["provider"]) {
  return createClient({
    chain: selectedNetwork.chain,
    ...(endpoint ? { endpoint } : {}),
    ...(account ? { account } : {}),
    ...(provider ? { provider } : {}),
  });
}

function gameAddress(): `0x${string}` {
  if (!isAddress(contractAddress)) throw new Error("The MEG game contract is not configured for Studio Next.");
  return contractAddress;
}

function roundResolverAddress(): `0x${string}` {
  if (!isAddress(resolverAddress)) throw new Error("The MEG resolver contract is not configured for Studio Next.");
  return resolverAddress;
}

async function assertExecution(receipt: { txExecutionResultName?: string; consensus_data?: { leader_receipt?: Array<{ execution_result?: string }> } }, phase: string) {
  const leaderExecution = receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN && leaderExecution !== "SUCCESS") throw new Error(`GenLayer ${phase} the transaction, but execution failed (${receipt.txExecutionResultName ?? leaderExecution ?? "UNKNOWN"}).`);
}

function makeWriteInput(address: `0x${string}`, functionName: string, args: CalldataEncodable[]): SubmitInput {
  return { kind: "write", address, method: functionName, args };
}

function makeTransactionKit(account: `0x${string}`, provider: GenLayerProvider) {
  return createTransactionKit({ chain: selectedNetwork.chain, provider, account });
}

function parseRpcQuantity(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^0x[0-9a-f]+$/iu.test(value)) {
    const parsed = Number(BigInt(value));
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  throw new Error(`Studio Next returned an invalid ${label}. Refresh and try again.`);
}

async function assertStudioNextWalletState(account: `0x${string}`, provider: GenLayerProvider): Promise<void> {
  if (networkSetting !== "studio-next") return;

  // Re-run the network switch immediately before signing. This also covers a
  // wallet that was switched away from Studio Next after the initial connect.
  await ensureStudioNextNetwork(provider as Eip1193Provider);

  const chainId = await provider.request({ method: "eth_chainId" });
  const expectedChainId = `0x${selectedNetwork.chain.id.toString(16)}`;
  if (chainId !== expectedChainId) {
    throw new Error(`Wallet is on the wrong network. Select Studio Next (chain ID ${selectedNetwork.chain.id}) and try again.`);
  }

  // The injected wallet and the canonical RPC must agree before a wallet
  // popup is opened. A same-chain wallet entry can still point at an old RPC
  // definition, which is exactly how a valid chain ID can produce nonce 0.
  let walletNonce: number | undefined;
  try {
    walletNonce = parseRpcQuantity(await provider.request({
      method: "eth_getTransactionCount",
      params: [account, "pending"],
    }), "wallet nonce");
  } catch {
    // Some injected wallets do not expose read methods. The SDK will still
    // perform its canonical nonce read and the wallet can choose its nonce.
  }

  if (walletNonce === undefined) return;
  const canonicalNonce = await client().getCurrentNonce({ address: account });
  if (walletNonce !== canonicalNonce) {
    throw new Error(`Your wallet is using a stale Studio Next RPC (wallet nonce ${walletNonce}, current chain nonce ${canonicalNonce}). Remove and re-add the Studio Next network with RPC ${"https://studio-dev.genlayer.com/api"}, then reconnect.`);
  }
}

function withWalletNonceCompatibility(provider: GenLayerProvider): GenLayerProvider {
  const requestProvider = provider as unknown as Eip1193Provider;
  return new Proxy(provider as object, {
    get(target, property, receiver) {
      if (property !== "request") return Reflect.get(target, property, receiver);
      return async (request: { method: string; params?: readonly unknown[] }) => {
        if (request.method !== "eth_sendTransaction") return requestProvider.request(request);
        const transaction = request.params?.[0];
        if (!transaction || typeof transaction !== "object" || Array.isArray(transaction)) return requestProvider.request(request);

        // genlayer-js includes a nonce in its EIP-1193 request. For Studio
        // Next injected wallets, omitting it lets the wallet query its own
        // freshly selected network and prevents it from submitting a cached
        // zero nonce. The preflight above ensures both views agree first.
        const walletTransaction = Object.fromEntries(Object.entries(transaction).filter(([key]) => key !== "nonce"));
        return requestProvider.request({ ...request, params: [walletTransaction, ...(request.params?.slice(1) ?? [])] });
      };
    },
  }) as GenLayerProvider;
}

function assertFeeQuote(quote: Awaited<ReturnType<ReturnType<typeof makeTransactionKit>["estimate"]>>) {
  if (quote.verification.status === "mismatch") {
    throw new Error("Studio Next fee policy changed while this transaction was being prepared. Refresh and try again.");
  }
}

async function submitWithKit(account: `0x${string}`, provider: GenLayerProvider, address: `0x${string}`, functionName: string, args: CalldataEncodable[], value: bigint, until: "decided" | "finalized", onSubmitted?: (hash: `0x${string}`) => void): Promise<`0x${string}`> {
  await assertStudioNextWalletState(account, provider);
  const transaction = makeWriteInput(address, functionName, args);
  const kit = makeTransactionKit(account, withWalletNonceCompatibility(provider));
  const quote = await kit.estimate({ preset: "standard", userValue: value }, transaction);
  assertFeeQuote(quote);
  const submitted = await kit.submit(quote, transaction);
  onSubmitted?.(submitted.genlayerTxId);
  const tracked = await kit.track(submitted.genlayerTxId, () => undefined, { until });
  if (tracked.successful !== true) {
    throw new Error(`Studio Next decided the transaction without a successful execution (${tracked.executionResultName ?? tracked.statusName ?? "UNKNOWN"}).`);
  }
  return submitted.genlayerTxId;
}

async function writeFinalized(account: `0x${string}`, provider: GenLayerProvider, address: `0x${string}`, functionName: string, args: CalldataEncodable[], value = 0n, onSubmitted?: (hash: `0x${string}`) => void): Promise<`0x${string}`> {
  return submitWithKit(account, provider, address, functionName, args, value, "finalized", onSubmitted);
}

async function writeAccepted(account: `0x${string}`, provider: GenLayerProvider, address: `0x${string}`, functionName: string, args: CalldataEncodable[], value = 0n, onSubmitted?: (hash: `0x${string}`) => void): Promise<`0x${string}`> {
  return submitWithKit(account, provider, address, functionName, args, value, "decided", onSubmitted);
}

export async function waitForGameTransactionFinality(hash: `0x${string}`): Promise<void> {
  const receipt = await client().waitForTransactionReceipt({ hash: hash as TransactionHash, waitUntil: "finalized", interval: 3_000, retries: 240 });
  await assertExecution(receipt, "finalized");
}

export function parseStake(value: string, minimumStake = MINIMUM_STAKE_WEI, maximumStake = MAXIMUM_STAKE_WEI): bigint {
  const stake = parseEther(value.trim() || "0");
  if (stake < minimumStake) throw new Error(`Minimum stake is ${formatGen(minimumStake)} GEN.`);
  if (stake > maximumStake) throw new Error(`Maximum testnet stake is ${formatGen(maximumStake)} GEN per entry.`);
  return stake;
}

export function formatGen(value: bigint): string {
  return Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function stakeAllocation(value: string, minimumStake = MINIMUM_STAKE_WEI, maximumStake = MAXIMUM_STAKE_WEI) {
  const stake = parseStake(value, minimumStake, maximumStake);
  const allocation = allocateStake(stake);
  return { ...allocation, protocol: allocation.platform };
}

export async function readGameRound(selectedRoundId = roundId): Promise<GameRoundRecord | null> {
  if (!genLayerGameConfig.enabled || !selectedRoundId) return null;
  const result = await client().readContract({ address: gameAddress(), functionName: "get_round", args: [selectedRoundId] });
  return result && typeof result === "object" && Object.keys(result).length > 0 ? result as GameRoundRecord : null;
}

export async function readGameRounds(): Promise<GameRoundRecord[]> {
  if (!genLayerGameConfig.enabled) return [];
  const count = await client().readContract({ address: gameAddress(), functionName: "get_round_count", args: [] }) as bigint;
  const ids = await Promise.all(Array.from({ length: Number(count) }, (_, index) => client().readContract({ address: gameAddress(), functionName: "get_round_id", args: [index] }) as Promise<string>));
  const rounds = await Promise.all(ids.map((id) => readGameRound(id)));
  return rounds.filter((value): value is GameRoundRecord => Boolean(value)).reverse();
}

export async function readGameEntry(player: `0x${string}`, selectedRoundId = roundId): Promise<GameEntryRecord | null> {
  if (!genLayerGameConfig.enabled || !selectedRoundId) return null;
  const result = await client().readContract({ address: gameAddress(), functionName: "get_entry", args: [selectedRoundId, player] });
  return result && typeof result === "object" && Object.keys(result).length > 0 ? result as GameEntryRecord : null;
}

export async function readGameRoundResolution(selectedRoundId = roundId): Promise<GameRoundResolutionRecord | null> {
  if (!genLayerGameConfig.enabled || !selectedRoundId) return null;
  const result = await client().readContract({ address: roundResolverAddress(), functionName: "get_round_resolution", args: [selectedRoundId] });
  return result && typeof result === "object" && Object.keys(result).length > 0 ? result as GameRoundResolutionRecord : null;
}

export async function readRoundEntries(selectedRoundId: string, participantCount: bigint): Promise<GameEntryRecord[]> {
  if (!genLayerGameConfig.enabled) return [];
  const records = await Promise.all(Array.from({ length: Number(participantCount) }, (_, index) => client().readContract({ address: gameAddress(), functionName: "get_entry_by_index", args: [selectedRoundId, index] }) as Promise<GameEntryRecord>));
  return records.filter((record) => record && Object.keys(record).length > 0);
}

export async function readCellPools(selectedRoundId = roundId): Promise<GameCellPool[]> {
  if (!genLayerGameConfig.enabled || !selectedRoundId) return [];
  return Promise.all(Array.from({ length: 9 }, (_, cell) => client().readContract({ address: gameAddress(), functionName: "get_cell_pool", args: [selectedRoundId, cell] }) as Promise<GameCellPool>));
}

type Submitted = (hash: `0x${string}`) => void;

export function enterGameRound(account: `0x${string}`, provider: GenLayerProvider, grid: MarketOptionId[], stake: bigint, selectedRoundId = roundId, onSubmitted?: Submitted) {
  return writeAccepted(account, provider, gameAddress(), "join_round", [selectedRoundId, packGrid(grid)], stake, onSubmitted);
}

export function resolveGameRound(account: `0x${string}`, provider: GenLayerProvider, resolutionId: string, onSubmitted?: Submitted) {
  return writeFinalized(account, provider, roundResolverAddress(), "resolve_round", [resolutionId], 0n, onSubmitted);
}

export function dispatchGameResolution(account: `0x${string}`, provider: GenLayerProvider, resolutionId: string, onSubmitted?: Submitted) {
  return writeFinalized(account, provider, roundResolverAddress(), "dispatch_resolution", [resolutionId], 0n, onSubmitted);
}

export function processGameSettlement(account: `0x${string}`, provider: GenLayerProvider, selectedRoundId = roundId, onSubmitted?: Submitted) {
  return writeFinalized(account, provider, gameAddress(), "process_settlement", [selectedRoundId, 100], 0n, onSubmitted);
}

export function activateGameRefunds(account: `0x${string}`, provider: GenLayerProvider, selectedRoundId = roundId, onSubmitted?: Submitted) {
  return writeFinalized(account, provider, gameAddress(), "activate_refunds", [selectedRoundId], 0n, onSubmitted);
}

export function claimGamePayout(account: `0x${string}`, provider: GenLayerProvider, selectedRoundId = roundId, onSubmitted?: Submitted) {
  return writeFinalized(account, provider, gameAddress(), "claim", [selectedRoundId], 0n, onSubmitted);
}
