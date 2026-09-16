import { expect, test } from "@playwright/test";

test("home exposes the nine-call synthetic Valorant board", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Nine calls/i })).toBeVisible();
  await expect(page.getByText("SYNTHETIC FIXTURE")).toBeVisible();
  await expect(page.getByTestId("meg-grid").locator("article")).toHaveCount(9);
  await expect(page.getByLabel("Exact pool allocation")).toBeVisible();
  await page.getByRole("button", { name: /Quick fill a draft/i }).click();
  await expect(page.locator("select")).toHaveCount(9);
  const filled = await page.locator("select").evaluateAll((elements) => elements.every((element) => (element as HTMLSelectElement).value.length > 0));
  expect(filled).toBe(true);
  await expect(page.getByRole("button", { name: /Review my nine calls/i })).toBeVisible();
  await page.getByRole("button", { name: /Review my nine calls/i }).click();
  await expect(page.getByRole("button", { name: /StudioNet lock unavailable/i })).toBeVisible();
});

test("supporting routes disclose configuration and synthetic data", async ({ page }) => {
  await page.goto("/matches");
  await expect(page.getByRole("heading", { name: /Choose the series/i })).toBeVisible();
  await expect(page.getByText(/LOCAL ONLY/i)).toBeVisible();

  await page.goto("/genlayer");
  await expect(page.getByRole("heading", { name: /See what consensus decides/i })).toBeVisible();
  await expect(page.getByText(/No resolver address is configured/i)).toBeVisible();

  await page.goto("/rules");
  await expect(page.getByRole("heading", { name: /Call\. Lock\. Reveal/i })).toBeVisible();
  await expect(page.getByText(/nine independent/i)).toBeVisible();
});
