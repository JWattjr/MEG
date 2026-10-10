import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/valorant-v2.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3003",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1" ? undefined : {
    command: "node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -p 3003",
    url: "http://localhost:3003",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_GENLAYER_GAME_NETWORK: "studio-next",
      NEXT_PUBLIC_GENLAYER_GAME_RPC_URL: "",
      NEXT_PUBLIC_GENLAYER_GAME_ADDRESS: "",
      NEXT_PUBLIC_GENLAYER_ROUND_RESOLVER_ADDRESS: "",
      NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS: "",
      NEXT_PUBLIC_GENLAYER_GAME_ROUND_ID: "",
      NEXT_PUBLIC_GENLAYER_RESOLUTION_ID: "",
      // Public, already-deployed registry: do not depend on a local .env file.
      NEXT_PUBLIC_MEG_LEAGUES_ADDRESS: "0x5E1f8CdDab9c0301E3C4a05988d9e29723d0d8d4",
      NEXT_PUBLIC_REPLAY_SECONDS: "8",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
