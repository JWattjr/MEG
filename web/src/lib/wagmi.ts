"use client";

import { createConfig, http } from "wagmi";
import { studionet } from "genlayer-js/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  // StudioNet is first so it is the default chain offered to injected wallets.
  chains: [studionet],
  connectors: [injected()],
  transports: {
    [studionet.id]: http(process.env.NEXT_PUBLIC_GENLAYER_GAME_RPC_URL?.trim() || (typeof window !== "undefined" ? "/api/genlayer" : studionet.rpcUrls.default.http[0])),
  },
  ssr: true,
});
