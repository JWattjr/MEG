"use client";

import { createConfig, http } from "wagmi";
import { studioDevnet } from "genlayer-js/chains";
import { injected } from "wagmi/connectors";

export const STUDIO_NEXT_CHAIN_ID = "0xf22d" as const;
export const STUDIO_NEXT_RPC_URL = "https://studio-dev.genlayer.com/api" as const;
export const STUDIO_NEXT_EXPLORER_URL = "https://explorer-studio-dev.genlayer.com" as const;

export const studioNextWalletChain = {
  chainId: STUDIO_NEXT_CHAIN_ID,
  chainName: "GenLayer Studio Next",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [STUDIO_NEXT_RPC_URL],
  blockExplorerUrls: [STUDIO_NEXT_EXPLORER_URL],
} as const;

export type Eip1193Provider = {
  request: (args: { method: string; params?: readonly unknown[] }) => Promise<unknown>;
};

function providerErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : typeof code === "string" ? Number(code) : undefined;
}

export async function ensureStudioNextNetwork(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIO_NEXT_CHAIN_ID }] });
  } catch (error) {
    if (providerErrorCode(error) !== 4902) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [studioNextWalletChain] });
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIO_NEXT_CHAIN_ID }] });
  }
}

export const wagmiConfig = createConfig({
  // Studio Next is the only hosted chain offered to injected wallets.
  chains: [studioDevnet],
  connectors: [injected()],
  transports: {
    [studioDevnet.id]: http(process.env.NEXT_PUBLIC_GENLAYER_GAME_RPC_URL?.trim() || (typeof window !== "undefined" ? "/api/genlayer" : STUDIO_NEXT_RPC_URL)),
  },
  ssr: true,
});
