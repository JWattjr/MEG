"use client";

import { createConfig, http } from "wagmi";
import { studioDevnet } from "genlayer-js/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  // Studio Next is the only hosted chain offered to injected wallets.
  chains: [studioDevnet],
  connectors: [injected()],
  transports: {
    [studioDevnet.id]: http(process.env.NEXT_PUBLIC_GENLAYER_GAME_RPC_URL?.trim() || (typeof window !== "undefined" ? "/api/genlayer" : studioDevnet.rpcUrls.default.http[0])),
  },
  ssr: true,
});
