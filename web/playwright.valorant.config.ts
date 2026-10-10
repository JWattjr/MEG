import { defineConfig, devices } from "@playwright/test";

// Runs after the unconfigured suite, with isolated, synthetic public addresses.
// The test intercepts ALL RPC requests; no signing or real fixture is involved.
export default defineConfig({
  testDir: "./e2e", testMatch: "**/valorant-v2.spec.ts", fullyParallel: false,
  reporter: "list", use: { baseURL: "http://localhost:3003", trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -p 3003", url: "http://localhost:3003",
    reuseExistingServer: false, timeout: 180_000,
    env: {
      NEXT_PUBLIC_GENLAYER_GAME_NETWORK: "studio-next", NEXT_PUBLIC_GENLAYER_GAME_RPC_URL: "",
      NEXT_PUBLIC_GENLAYER_GAME_ADDRESS: "0x1111111111111111111111111111111111111111",
      NEXT_PUBLIC_GENLAYER_ROUND_RESOLVER_ADDRESS: "",
      NEXT_PUBLIC_GENLAYER_VALORANT_RESOLVER_ADDRESS: "0x2222222222222222222222222222222222222222",
      NEXT_PUBLIC_GENLAYER_GAME_ROUND_ID: "", NEXT_PUBLIC_GENLAYER_RESOLUTION_ID: "",
      NEXT_PUBLIC_REPLAY_SECONDS: "8",
    },
  },
  projects: [
    { name: "chromium-v2", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 960 } } },
    { name: "chromium-v2-mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
