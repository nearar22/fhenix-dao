'use client';

import { useEffect, useState } from 'react';
import { useConnect, type Connector } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ExternalLink, Smartphone } from 'lucide-react';

type WalletMeta = {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  match: (c: Connector) => boolean;
  installUrl?: string;
};

// SVG/emoji icons (small inline for speed; replace with images if needed)
const ICONS = {
  metamask:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E17726"/><stop offset="1" stop-color="#E27625"/></linearGradient></defs><rect width="40" height="40" rx="8" fill="#1c1c1e"/><path d="M30 9 22 15l1.5-3.5L30 9zM10 9l8 6-1.5-3.5L10 9zm15.5 18 4 .5-1.5 4-2.5-4.5zm-11 0-2.5 4.5-1.5-4 4-.5zm-1 9-1-3 5-1v3.5l-4 .5zm9.5 0-4-.5V31l5 1-1 3zm-9-9 1.5-1.5h6l1.5 1.5-1 4.5h-7l-1-4.5z" fill="url(#g)"/></svg>`,
    ),
  coinbase:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#0052FF"/><circle cx="20" cy="20" r="11" fill="white"/><rect x="16" y="16" width="8" height="8" rx="1.5" fill="#0052FF"/></svg>`,
    ),
  walletconnect:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#3B99FC"/><path d="M13 17.5c4-4 10.5-4 14.5 0l.6.6c.2.2.2.5 0 .7l-2 2c-.1.1-.3.1-.4 0l-.8-.8c-2.8-2.7-7.3-2.7-10 0l-.9.9c-.1.1-.3.1-.4 0l-2-2c-.2-.2-.2-.5 0-.7l.4-.7zm17.8 3.3 1.7 1.7c.2.2.2.5 0 .7l-7.8 7.6c-.2.2-.5.2-.7 0l-5.5-5.4c-.1-.1-.2-.1-.3 0l-5.5 5.4c-.2.2-.5.2-.7 0L4.4 23c-.2-.2-.2-.5 0-.7l1.7-1.7c.2-.2.5-.2.7 0l5.5 5.4c.1.1.2.1.3 0l5.5-5.4c.2-.2.5-.2.7 0l5.5 5.4c.1.1.2.1.3 0l5.5-5.4c.3-.2.6-.2.8.2z" fill="#fff"/></svg>`,
    ),
  injected:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#27272a"/><path d="M20 11c-5 0-9 4-9 9 0 5 4 9 9 9s9-4 9-9c0-5-4-9-9-9zm0 14c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" fill="#a78bfa"/></svg>`,
    ),
};

const WALLETS: WalletMeta[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Most popular Ethereum wallet',
    icon: ICONS.metamask,
    badge: 'Popular',
    match: (c) =>
      c.id === 'metaMaskSDK' ||
      c.id === 'metaMask' ||
      c.name?.toLowerCase() === 'metamask',
    installUrl: 'https://metamask.io/download/',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Mobile + browser extension',
    icon: ICONS.coinbase,
    match: (c) =>
      c.id === 'coinbaseWalletSDK' ||
      c.id === 'coinbaseWallet' ||
      c.name?.toLowerCase().includes('coinbase'),
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Trust, Rainbow, Ledger, 200+ wallets',
    icon: ICONS.walletconnect,
    badge: 'Mobile',
    match: (c) => c.id === 'walletConnect',
  },
];

export function WalletPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connect, connectors, isPending, variables, error } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Detect other EIP-6963 wallets (Rabby, Phantom EVM, Frame, Brave, etc.)
  const otherInjected = connectors.filter(
    (c) =>
      c.id !== 'metaMaskSDK' &&
      c.id !== 'metaMask' &&
      c.id !== 'coinbaseWalletSDK' &&
      c.id !== 'coinbaseWallet' &&
      c.id !== 'walletConnect' &&
      c.id !== 'injected' &&
      !c.name?.toLowerCase().includes('metamask') &&
      !c.name?.toLowerCase().includes('coinbase'),
  );

  useEffect(() => {
    if (!isPending) setPendingId(null);
  }, [isPending]);

  const handleConnect = async (
    walletId: string,
    matcher: (c: Connector) => boolean,
    installUrl?: string,
  ) => {
    const connector = connectors.find(matcher);
    if (!connector) {
      if (installUrl) window.open(installUrl, '_blank');
      return;
    }
    setPendingId(walletId);
    try {
      console.log('[Fhinex] connecting via:', connector.id, connector.name);
      await connect({ connector });
      onClose();
    } catch (e) {
      console.error('[Fhinex] connect failed:', e);
      setPendingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none"
          >
            <div className="glass gradient-border rounded-3xl max-w-md w-full pointer-events-auto p-6 relative">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Connect a wallet
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Pick your wallet to vote with encrypted ballots
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-1.5">
                {WALLETS.map((w) => {
                  const c = connectors.find(w.match);
                  const installed = !!c;
                  const isLoading =
                    pendingId === w.id ||
                    (isPending && variables?.connector === c);
                  return (
                    <button
                      key={w.id}
                      onClick={() =>
                        handleConnect(w.id, w.match, w.installUrl)
                      }
                      disabled={isLoading}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-violet-500/40 transition-all group disabled:opacity-50"
                    >
                      <img
                        src={w.icon}
                        alt=""
                        className="h-10 w-10 rounded-lg shrink-0"
                      />
                      <div className="flex-1 text-start min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {w.name}
                          </span>
                          {w.badge && (
                            <span className="text-[9px] uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                              {w.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                          {installed ? w.description : 'Click to install'}
                        </div>
                      </div>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-violet-400 shrink-0" />
                      ) : !installed && w.installUrl ? (
                        <ExternalLink className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}

                {/* Other EIP-6963 wallets (Rabby, Brave, Frame, Rainbow ext, etc.) */}
                {otherInjected.length > 0 && (
                  <>
                    <div className="px-1 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">
                      Other detected
                    </div>
                    {otherInjected.map((c) => {
                      const isLoading =
                        isPending && variables?.connector === c;
                      return (
                        <button
                          key={c.uid}
                          onClick={async () => {
                            try {
                              await connect({ connector: c });
                              onClose();
                            } catch (e) {
                              console.error('[Fhinex] connect failed:', e);
                            }
                          }}
                          disabled={isLoading}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-zinc-900/40 hover:bg-zinc-800/60 transition-all disabled:opacity-50"
                        >
                          {c.icon ? (
                            <img
                              src={c.icon}
                              alt=""
                              className="h-10 w-10 rounded-lg shrink-0"
                            />
                          ) : (
                            <img
                              src={ICONS.injected}
                              alt=""
                              className="h-10 w-10 rounded-lg shrink-0"
                            />
                          )}
                          <div className="flex-1 text-start min-w-0">
                            <div className="font-medium text-sm">{c.name}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              Detected in your browser
                            </div>
                          </div>
                          {isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-violet-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>

              {error && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {error.message}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2 text-[11px] text-zinc-500">
                <Smartphone className="h-3 w-3" />
                On mobile? Pick <b className="text-zinc-300">WalletConnect</b> and
                scan the QR with your wallet app.
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
