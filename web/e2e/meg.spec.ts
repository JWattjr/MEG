import { expect, test } from "@playwright/test";

test("unconfigured home exposes a non-signing practice board", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Nine calls/i })).toBeVisible();
  await expect(page.getByText("PRACTICE BOARD · NO STAKE")).toBeVisible();
  await expect(page.getByTestId("meg-grid").locator("article")).toHaveCount(9);
  await expect(page.getByLabel("Exact pool allocation")).toBeVisible();
  await page.getByRole("button", { name: /Quick fill a draft/i }).click();
  await expect(page.locator("select")).toHaveCount(9);
  const filled = await page.locator("select").evaluateAll((elements) => elements.every((element) => (element as HTMLSelectElement).value.length > 0));
  expect(filled).toBe(true);
  await expect(page.getByRole("button", { name: /Review my nine calls/i })).toBeVisible();
  await page.getByRole("button", { name: /Review my nine calls/i }).click();
  await expect(page.getByRole("button", { name: /Studio Next lock unavailable/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Studio Next lock unavailable/i })).toBeDisabled();
});

test("supporting routes disclose configuration and verified data", async ({ page }) => {
  await page.goto("/matches");
  await expect(page.getByRole("heading", { name: /Choose the series/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Call of Duty", exact: true })).toBeVisible();
  await expect(page.getByText(/game contract is not connected/i)).toBeVisible();

  await page.goto("/genlayer");
  await expect(page.getByRole("heading", { name: /See what consensus decides/i })).toBeVisible();
  await expect(page.getByText(/not connected to a MEG game contract/i)).toBeVisible();

  await page.goto("/rules");
  await expect(page.getByRole("heading", { name: /Call\. Lock\. Reveal/i })).toBeVisible();
  await expect(page.getByText(/nine independent/i)).toBeVisible();
});

test("Call of Duty practice pack has its own BO5 questions and disables staking", async ({ page }) => {
  await page.goto("/?game=call-of-duty");
  await expect(page.locator(".grid-column-heads span")).toHaveText(["TEAM", "MAP", "PLAYER"]);
  await expect(page.getByText("PRACTICE BOARD · NO STAKE")).toBeVisible();
  await expect(page.getByText("Opening Hardpoint total score?", { exact: true })).toBeVisible();
  await expect(page.getByText("First Search & Destroy round count?", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Quick fill a draft/i }).click();
  await page.getByRole("button", { name: /Review my nine calls/i }).click();
  await expect(page.getByRole("button", { name: /Studio Next lock unavailable/i })).toBeDisabled();
});

test("leagues explain fixed membership, settled-call scoring and honest configuration", async ({ page }) => {
  await page.goto("/leagues");
  await expect(page.getByRole("heading", { name: "Your squad. One season." })).toBeVisible();
  await expect(page.getByText(/Stake size never changes your score/i)).toBeVisible();
  await expect(page.getByText(/registry is connected to this deployment/i)).toBeVisible();
});
