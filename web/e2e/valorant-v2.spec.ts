import { expect, test } from "@playwright/test";
import { abi } from "genlayer-js";
import { fromHex, fromRlp, toHex } from "viem";

const game = "0x1111111111111111111111111111111111111111";
const resolver = "0x2222222222222222222222222222222222222222";
const round = {
  round_id: "synthetic-v2-only", match_id: "synthetic-v2-match", resolver_address: resolver,
  resolver_resolution_id: "synthetic-v2-resolution", status: "OPEN",
  minimum_stake: 10n ** 18n, maximum_stake: 100n * 10n ** 18n,
  lock_at: "2099-01-01T00:00:00Z", kickoff_at: "2099-01-01T01:00:00Z", refund_at: "2099-01-03T00:00:00Z",
  participant_count: 0n, total_escrow: 0n, total_pool_stake: 0n, total_claimed: 0n,
  jackpot_seed: 0n, jackpot_pool: 0n, jackpot_winning_stake: 0n, jackpot_paid: 0n,
  jackpot_rolled_over: false, revenue_pool: 0n, settlement_cursor: 0n,
  window_0_bitmap: 0n, window_1_bitmap: 0n, window_2_bitmap: 0n, settled_at: "",
};
const record = {
  resolution_id: round.resolver_resolution_id, match_id: round.match_id,
  settlement_target: game, settlement_round_id: round.round_id,
  game_type: "valorant", rule_version: "valorant-bo3-v2", format_name: "BEST_OF_3",
  team_a: "Synthetic Northstar", team_b: "Synthetic Arcforge", player_a: "Kestrel", player_b: "Morrow",
  competition: "Synthetic browser test only", match_date: "2099-01-01", map_1: "Not yet announced",
  status: "PENDING", match_status: "UNKNOWN", reason_code: "PENDING", evidence_summary: "",
  source_references_json: "[]", cell_results_json: "[]", attempt_count: 0n, dispatch_count: 0n, resolved_at: "",
};

test("mocked v2 round is a named-player, enterable board routed to its own resolver", async ({ page }, testInfo) => {
  const reads: Array<{ to: string; method: string }> = [];
  await page.addInitScript(() => localStorage.setItem("meg-guided-play-v1", JSON.stringify({ version: 1, step: "pick", status: "paused" })));
  await page.route("**/api/genlayer", async (route) => {
    const request = route.request().postDataJSON();
    let result: unknown = "0xf22d";
    if (request.method === "gen_call") {
      const params = request.params[0];
      const parts = fromRlp(params.data as `0x${string}`) as `0x${string}`[];
      const call = abi.calldata.decode(fromHex(parts[0], "bytes"));
      // Raw calldata maps are Map instances; the SDK's jsonSafeReturn wrapper
      // turns them into objects only after readContract decodes its response.
      const method = call instanceof Map ? call.get("") : undefined;
      expect(typeof method).toBe("string");
      reads.push({ to: params.to, method: method as string });
      const value = method === "get_round" ? round : method === "get_round_resolution" ? record : {};
      result = toHex(abi.calldata.encode(value as Parameters<typeof abi.calldata.encode>[0]));
    }
    await route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
  });
  await page.goto(`/?round=${round.round_id}`);
  await expect(page.getByText("REGISTERED FIXTURE", { exact: true })).toBeVisible();
  const grid = page.getByTestId("meg-grid");
  await expect(grid.locator("article")).toHaveCount(9);
  await expect(grid.locator("select").nth(5).locator("option")).toContainText(["Kestrel", "Morrow"]);
  await expect(grid.locator("select").first().locator("option")).toContainText(["Synthetic Northstar", "Synthetic Arcforge"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("v2-board.png"), fullPage: true });
  await page.getByRole("button", { name: /Quick fill a draft/i }).click();
  await page.getByRole("button", { name: /Review my nine calls/i }).click();
  await expect(page.getByRole("button", { name: /Lock & sign 1 GEN/i })).toBeEnabled();
  expect(reads).toContainEqual({ to: resolver, method: "get_round_resolution" });
  // No wallet approval or paid entry is executed by this test.
});
