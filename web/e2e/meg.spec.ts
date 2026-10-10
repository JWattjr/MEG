import { expect, test } from "@playwright/test";

test("unconfigured home exposes a non-signing practice board", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Nine calls/i })).toBeVisible();
  await expect(page.getByText("PRACTICE BOARD · NO STAKE")).toBeVisible();
  await expect(page.getByTestId("meg-grid").locator("article")).toHaveCount(9);
  await expect(page.getByLabel("Exact pool allocation")).toBeVisible();
  await page.getByRole("button", { name: /Quick fill a draft/i }).click();
  await expect(page.getByTestId("meg-grid").locator("select")).toHaveCount(9);
  const filled = await page.getByTestId("meg-grid").locator("select").evaluateAll((elements) => elements.every((element) => (element as HTMLSelectElement).value.length > 0));
  expect(filled).toBe(true);
  await expect(page.getByRole("button", { name: /Review my nine calls/i })).toBeVisible();
  await page.getByRole("button", { name: /Review my nine calls/i }).click();
  await expect(page.getByRole("button", { name: /Studio Next lock unavailable/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Studio Next lock unavailable/i })).toBeDisabled();
});

test("supporting routes disclose configuration and verified data", async ({ page }) => {
  await page.goto("/matches");
  await expect(page.getByRole("heading", { name: /Choose the series/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filter matches by game" })).toHaveValue("all");
  await expect(page.getByText(/game contract is not connected/i)).toBeVisible();

  await page.goto("/genlayer");
  await expect(page.getByRole("heading", { name: /See what consensus decides/i })).toBeVisible();
  await expect(page.getByText(/not connected to a MEG game contract/i)).toBeVisible();

  await page.goto("/rules");
  await expect(page.getByRole("heading", { name: /Call\. Lock\. Reveal/i })).toBeVisible();
  await expect(page.getByText(/nine independent/i)).toBeVisible();
});

test("game dropdown switches pack, URL and theme without mixing drafts", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("meg-guided-play-v1", JSON.stringify({ version: 1, step: "pick", status: "paused" })));
  await page.goto("/?game=valorant");
  const picker = page.getByRole("combobox", { name: "Game", exact: true });
  await expect(picker.locator("option")).toHaveText(["Valorant", "Call of Duty"]);
  await picker.selectOption("call-of-duty");
  await expect(page).toHaveURL(/game=call-of-duty/);
  await expect(page.locator("main")).toHaveAttribute("data-game", "call-of-duty");
  await expect(page.getByText("Opening Hardpoint total score?", { exact: true })).toBeVisible();
  await expect(page.locator(".play-hero h1 span")).toHaveCSS("color", "rgb(83, 102, 58)");
  await page.getByTestId("meg-grid").locator("select").first().selectOption({ index: 1 });
  await page.getByRole("button", { name: "Dismiss Guided Play" }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await picker.selectOption("valorant");
  await expect(picker).toHaveValue("call-of-duty");
  await expect(page.getByTestId("meg-grid").locator("select").first()).not.toHaveValue("");
  page.once("dialog", (dialog) => dialog.accept());
  await picker.selectOption("valorant");
  await expect(page).toHaveURL(/game=valorant/);
  await expect(page.locator("main")).toHaveAttribute("data-game", "valorant");
  await expect(page.locator(".play-hero h1 span")).toHaveCSS("color", "rgb(73, 100, 245)");
  expect(await page.getByTestId("meg-grid").locator("select").evaluateAll((elements) => elements.every((element) => (element as HTMLSelectElement).value === ""))).toBe(true);
  await expect(page.getByText("Opening Hardpoint total score?", { exact: true })).toHaveCount(0);
});

test("selected game match link starts filtered and retains all-game browsing", async ({ page }) => {
  await page.goto("/?game=call-of-duty");
  await page.getByRole("link", { name: "Browse Call of Duty matches" }).click();
  await expect(page).toHaveURL(/matches\?game=call-of-duty/);
  const filter = page.getByRole("combobox", { name: "Filter matches by game" });
  await expect(filter).toHaveValue("call-of-duty");
  await filter.selectOption("all");
  await expect(filter).toHaveValue("all");
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
