"use client";

import { Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useChainId } from "wagmi";
import { genLayerGameConfig, MINIMUM_STAKE_WEI } from "@/lib/genlayer-game";
import { ensureStudioNextNetwork, type Eip1193Provider } from "@/lib/wagmi";

export function WalletButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [walletError, setWalletError] = useState("");
  const { address, isConnected } = useAccount();
  const { connectors, connect, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { data: balance, refetch: refreshBalance } = useBalance({ address, chainId: genLayerGameConfig.chainId });
  const wrongNetwork = isConnected && chainId !== genLayerGameConfig.chainId;
  const needsFunding = Boolean(balance && balance.value < MINIMUM_STAKE_WEI);

  const explainWalletError = useCallback((error: unknown): string => {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (code === 4001) return "Wallet request rejected. Approve the connection or network switch to continue.";
      if (code === -32002) return "A wallet request is already pending. Open your wallet and finish it first.";
    }
    return error instanceof Error ? error.message : "The wallet could not switch to Studio Next.";
  }, []);

  const connectToStudioNext = useCallback(async (connector: (typeof connectors)[number]) => {
    setBusy(true);
    setWalletError("");
    try {
      await connect({ connector });
      const provider = await connector.getProvider();
      await ensureStudioNextNetwork(provider as Eip1193Provider);
      setOpen(false);
    } catch (error) {
      setWalletError(explainWalletError(error));
    } finally {
      setBusy(false);
    }
  }, [connect, explainWalletError]);

  const switchToStudioNext = useCallback(async () => {
    const connector = (await Promise.resolve(connectors.find((candidate) => candidate.id === "injected"))) ?? connectors[0];
    if (!connector) {
      setWalletError("No compatible browser wallet was detected.");
      return;
    }
    setBusy(true);
    setWalletError("");
    try {
      const provider = await connector.getProvider();
      await ensureStudioNextNetwork(provider as Eip1193Provider);
    } catch (error) {
      setWalletError(explainWalletError(error));
    } finally {
      setBusy(false);
    }
  }, [connectors, explainWalletError]);

  const copyAddress = useCallback(async () => {
    if (!address || !navigator.clipboard) return;
    await navigator.clipboard.writeText(address);
  }, [address]);

  return <div className="wallet-menu">
    <button className={`wallet-button ${wrongNetwork ? "is-wrong-network" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open wallet controls">
      {isConnected ? <><span className="wallet-status" />{wrongNetwork ? "Wrong network" : `${address?.slice(0, 4)}…${address?.slice(-3)}`}</> : <><Wallet size={13} strokeWidth={2.2} />Connect</>}
    </button>
    {open && <div className="wallet-popover" role="dialog" aria-label="Wallet controls">
      {!isConnected ? <>
        <strong>Choose wallet</strong>
        {connectors.map((connector) => <button key={connector.uid} type="button" disabled={busy} onClick={() => void connectToStudioNext(connector)}>{busy ? "Connecting…" : connector.name}</button>)}
        {!connectors.length && <p>No compatible browser wallet was detected.</p>}
      </> : <>
        <strong>{address?.slice(0, 8)}…{address?.slice(-6)}</strong>
        <p>{balance ? `${Number(formatEther(balance.value)).toLocaleString(undefined, { maximumFractionDigits: 3 })} ${balance.symbol}` : "Balance loading…"}</p>
        {wrongNetwork && <button type="button" disabled={busy} onClick={() => void switchToStudioNext()}>{busy ? "Switching…" : "Switch to Studio Next"}</button>}
        {needsFunding && <div className="wallet-funding">
          <p>You need test GEN for stake and transaction fees.</p>
          <p>Open Studio, use the same wallet in the account selector, click the 💧 faucet, then return here.</p>
          <a href="https://studio-dev.genlayer.com" target="_blank" rel="noreferrer">Get test GEN in Studio</a>
          <button type="button" onClick={() => void copyAddress()}>Copy wallet address</button>
          <button type="button" onClick={() => void refreshBalance()}>Refresh balance</button>
        </div>}
        <button type="button" onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
      </>}
      {(connectError || walletError) && <p className="error-message">{walletError || connectError?.message}</p>}
    </div>}
  </div>;
}
