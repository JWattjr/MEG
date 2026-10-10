import { afterEach, expect, it, vi } from "vitest";
import type { GameRoundRecord } from "./genlayer-game";

const { readContract } = vi.hoisted(() => ({ readContract: vi.fn() }));
vi.mock("genlayer-js", () => ({ createClient: () => ({ readContract }) }));
vi.mock("@genlayer/transaction-kit", () => ({ createTransactionKit: vi.fn() }));
vi.mock("./wagmi", () => ({ ensureStudioNextNetwork: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); readContract.mockReset(); });

it.each(["0x2222222222222222222222222222222222222222", "0x3333333333333333333333333333333333333333"])("reads v1/v2 using round.resolver_address %s without a global resolver", async (resolver) => {
  const game = "0x1111111111111111111111111111111111111111";
  vi.stubEnv("NEXT_PUBLIC_GENLAYER_GAME_ADDRESS", game);
  vi.stubEnv("NEXT_PUBLIC_GENLAYER_ROUND_RESOLVER_ADDRESS", "");
  const { readGameRoundResolution } = await import("./genlayer-game");
  const round = { round_id: "synthetic", match_id: "synthetic-match", resolver_address: resolver, resolver_resolution_id: "synthetic-resolution" } as GameRoundRecord;
  readContract.mockResolvedValue({ resolution_id: round.resolver_resolution_id, match_id: round.match_id, settlement_round_id: round.round_id, settlement_target: game, attempt_count: 0, dispatch_count: 0 });
  expect(await readGameRoundResolution(round.round_id, round)).not.toBeNull();
  expect(readContract).toHaveBeenCalledWith({ address: resolver, functionName: "get_round_resolution", args: [round.resolver_resolution_id] });
});
