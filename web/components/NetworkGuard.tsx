'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia, arbitrumSepolia } from 'wagmi/chains';
import { AlertTriangle, ArrowRight, Droplets, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_CHAIN_IDS } from '@/lib/wagmi';
export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const wrongChain =
    isConnected && !SUPPORTED_CHAIN_IDS.includes(chainId as any);

  return (
    <AnimatePresence>
      {wrongChain && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="sticky top-16 z-30 mx-auto max-w-6xl px-4 sm:px-6 mt-3"
        >
          <div className="glass rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-amber-100">
                Unsupported network. Switch to{' '}
                <span className="text-amber-300 font-medium">
                  Ethereum Sepolia
                </span>{' '}
                or{' '}
                <span className="text-amber-300 font-medium">
                  Arbitrum Sepolia
                </span>
                .
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://sepoliafaucet.com/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-200 hover:text-amber-100 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-amber-500/10 transition-colors"
              >
                <Droplets className="h-3.5 w-3.5" />
                Get test ETH
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => switchChain({ chainId: sepolia.id })}
                disabled={isPending}
                className="h-8 px-3 rounded-lg bg-amber-500 text-zinc-900 text-xs font-semibold hover:bg-amber-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? 'Switching…' : 'Ethereum Sepolia'}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </button>
              <button
                onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
                disabled={isPending}
                className="h-8 px-3 rounded-lg bg-cyan-500 text-zinc-900 text-xs font-semibold hover:bg-cyan-400 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? '…' : 'Arbitrum Sepolia'}
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
