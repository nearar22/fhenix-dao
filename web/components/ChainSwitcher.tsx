'use client';

import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia, arbitrumSepolia } from 'wagmi/chains';
import { Check, ChevronDown, Loader2, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CHAINS = [
  {
    id: sepolia.id,
    name: 'Ethereum Sepolia',
    short: 'Sepolia',
    color: '#627eea',
  },
  {
    id: arbitrumSepolia.id,
    name: 'Arbitrum Sepolia',
    short: 'Arb Sepolia',
    color: '#28a0f0',
  },
];

export function ChainSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (!isConnected) return null;

  const current = CHAINS.find((c) => c.id === chainId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors border border-border/60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : current ? (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: current.color }}
          />
        ) : (
          <Network className="h-3.5 w-3.5 text-amber-400" />
        )}
        <span className="hidden sm:inline">
          {current ? current.short : 'Unsupported'}
        </span>
        <ChevronDown className="h-3 w-3 text-zinc-500" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 end-0 mt-1.5 w-56 p-1 rounded-xl glass border border-border shadow-2xl"
            >
              <div className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-mono">
                Network
              </div>
              {CHAINS.map((c) => {
                const active = c.id === chainId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      switchChain({ chainId: c.id });
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-zinc-800/60 text-zinc-100'
                        : 'text-zinc-300 hover:bg-zinc-800/40'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: c.color }}
                    />
                    <span className="flex-1 text-start">{c.name}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </button>
                );
              })}
              <div className="mt-1 pt-2 px-3 pb-1.5 border-t border-border/60 text-[10px] text-zinc-500">
                Fhenix CoFHE is live on both networks.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
