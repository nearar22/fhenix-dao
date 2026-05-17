'use client';

import { useEffect, useState } from 'react';
import {
  useAccount,
  useChainId,
  useDisconnect,
  useWalletClient,
} from 'wagmi';
import { Wallet, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';
import { WalletPicker } from './WalletPicker';
import { SUPPORTED_CHAIN_IDS } from '@/lib/wagmi';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { data: walletClient, isLoading: walletClientLoading } =
    useWalletClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  // When the wallet sits on an unsupported chain (Mainnet, etc.),
  // useWalletClient returns null. That's NOT a stale connection. The
  // NetworkGuard banner handles that case, so we should not flash a
  // misleading "Fix wallet" button here.
  const onSupportedChain = SUPPORTED_CHAIN_IDS.includes(chainId as any);

  const [hasEthereum, setHasEthereum] = useState<boolean | null>(null);
  useEffect(() => {
    setHasEthereum(
      typeof window !== 'undefined' && !!(window as any).ethereum,
    );
  }, []);

  // Detect stale state: connected per wagmi but no walletClient resolves
  // after a reasonable delay. Usually means the cached connector points at
  // a broken provider (e.g. Nightly hijack).
  const [staleDetected, setStaleDetected] = useState(false);
  useEffect(() => {
    if (!isConnected || walletClient || !onSupportedChain) {
      // Connected + supported chain + still no walletClient = stale.
      // Wrong-chain case is handled by NetworkGuard, not here.
      setStaleDetected(false);
      return;
    }
    // Generous timeout to avoid false positives. Rabby + EIP-6963 wallets
    // sometimes take several seconds to resolve walletClient on first load.
    const t = setTimeout(() => {
      if (isConnected && !walletClient && onSupportedChain) {
        setStaleDetected(true);
      }
    }, 8000);
    return () => clearTimeout(t);
  }, [isConnected, walletClient, walletClientLoading, onSupportedChain]);

  const hardReset = async () => {
    try {
      await disconnect();
    } catch {}
    try {
      // Clear wagmi cache for clean reconnect
      Object.keys(localStorage)
        .filter((k) => k.startsWith('wagmi') || k.startsWith('wc@'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  if (isConnected && address) {
    if (staleDetected) {
      return (
        <button
          onClick={hardReset}
          className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
          title="Wallet client missing. Click to reset and reconnect."
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Fix wallet
        </button>
      );
    }
    return (
      <button onClick={() => disconnect()} className="btn-ghost">
        <LogOut className="w-4 h-4" />
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setPickerOpen(true)}
        className="btn-primary"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
      <WalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      {hasEthereum === false && (
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          className="sr-only"
        >
          <AlertTriangle className="w-4 h-4" />
          Install MetaMask
        </a>
      )}
    </>
  );
}
