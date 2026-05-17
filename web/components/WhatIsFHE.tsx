'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Lock,
  Cpu,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export function WhatIsFHEButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors ${className}`}
      >
        <Sparkles className="h-3 w-3" />
        What is FHE?
      </button>
      <WhatIsFHEModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function WhatIsFHEModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
            <div className="glass gradient-border rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto p-6 sm:p-8 relative">
              <button
                onClick={onClose}
                className="absolute end-4 top-4 h-9 w-9 grid place-items-center rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-zinc-400">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                Fully Homomorphic Encryption
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Vote on-chain. <span className="gradient-text">Nobody sees how.</span>
              </h2>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Regular blockchains are radically transparent. Anyone can see
                every vote. Fhenix DAO flips that: your ballot is encrypted in your
                browser, tallied <em>while still encrypted</em>, and only the
                final result is ever decrypted.
              </p>

              {/* 3-step explainer */}
              <div className="mt-6 space-y-3">
                {[
                  {
                    Icon: Lock,
                    title: '1. Encrypt locally',
                    body: 'Your vote (e.g. "Yes") becomes a 256-byte ciphertext before it ever leaves your browser. A zero-knowledge proof certifies it\u2019s a valid ballot.',
                    color: '#a78bfa',
                  },
                  {
                    Icon: Cpu,
                    title: '2. Tally homomorphically',
                    body: 'The contract adds encrypted ballots into encrypted totals using FHE.add. Neither validators nor the contract owner can see individual votes.',
                    color: '#22d3ee',
                  },
                  {
                    Icon: ShieldCheck,
                    title: '3. Reveal verifiably',
                    body: 'After the deadline, the CoFHE Threshold Network signs the decryption of each tally. Anyone can verify the signature. Collusion is cryptographically blocked.',
                    color: '#10b981',
                  },
                ].map((s) => (
                  <div
                    key={s.title}
                    className="flex gap-3 p-4 rounded-xl bg-zinc-900/40 border border-border"
                  >
                    <div
                      className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                      style={{
                        background: `${s.color}1f`,
                        color: s.color,
                      }}
                    >
                      <s.Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{s.title}</div>
                      <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {s.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison table */}
              <div className="mt-6">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-3 font-medium">
                  vs. other DAO voting
                </div>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-900/60">
                      <tr>
                        <th className="text-start px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Capability
                        </th>
                        <th className="px-3 py-2.5 text-xs font-medium text-zinc-500">
                          Snapshot
                        </th>
                        <th className="px-3 py-2.5 text-xs font-medium text-zinc-500">
                          Aragon
                        </th>
                        <th className="px-3 py-2.5 text-xs font-medium text-cyan-300">
                          Fhenix DAO
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Vote privacy', false, false, true],
                        ['On-chain tally', false, true, true],
                        ['No trusted aggregator', true, true, true],
                        ['Verifiable reveal', true, true, true],
                        ['Forever-sealed ballots', false, false, true],
                      ].map(([cap, a, b, c]) => (
                        <tr
                          key={cap as string}
                          className="border-t border-border/60"
                        >
                          <td className="px-3 py-2.5 text-zinc-300">
                            {cap as string}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <CellIcon yes={a as boolean} />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <CellIcon yes={b as boolean} />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <CellIcon yes={c as boolean} highlight />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://www.fhenix.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-4 rounded-lg gradient-bg text-white text-sm font-medium flex items-center gap-2 hover:scale-[1.02] transition-transform"
                >
                  Learn more on fhenix.io
                </a>
                <button
                  onClick={onClose}
                  className="h-10 px-4 rounded-lg glass text-sm hover:bg-zinc-800/40 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CellIcon({
  yes,
  highlight,
}: {
  yes: boolean;
  highlight?: boolean;
}) {
  if (yes) {
    return (
      <Check
        className={`mx-auto h-4 w-4 ${
          highlight ? 'text-emerald-400' : 'text-zinc-400'
        }`}
      />
    );
  }
  return (
    <EyeOff className="mx-auto h-4 w-4 text-red-400/70" />
  );
}
