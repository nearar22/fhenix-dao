'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ThresholdInfo({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="text-zinc-500 hover:text-cyan-300 transition-colors"
        title="Threshold network info"
      >
        <Info className="h-3 w-3" />
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
              className="absolute z-50 top-5 start-0 w-72 sm:w-80 p-4 rounded-xl glass border border-cyan-500/30 shadow-2xl text-xs leading-relaxed text-zinc-300"
              onMouseLeave={() => setOpen(false)}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute end-2 top-2 h-6 w-6 grid place-items-center rounded text-zinc-500 hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="font-semibold text-cyan-300 mb-2">
                Threshold Decryption Network
              </div>
              <p>
                The CoFHE Threshold Network is an{' '}
                <b className="text-zinc-100">M-of-N</b> committee of independent
                operators that holds shares of the decryption key. They sign the
                decryption of a tally only when{' '}
                <b className="text-zinc-100">at least M operators agree</b>.
              </p>
              <p className="mt-2">
                Anyone can verify the signature on-chain. Collusion is
                economically punished via slashing, and individual ballots are{' '}
                <b className="text-zinc-100">never decryptable</b>, only the
                final tally.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}
