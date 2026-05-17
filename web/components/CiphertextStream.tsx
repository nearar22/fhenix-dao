'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Cpu, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

export type EncryptStage =
  | 'idle'
  | 'plaintext'
  | 'encrypting'
  | 'ciphertext'
  | 'submitting'
  | 'done';

const HEX = '0123456789abcdef';

function randomHex(len: number) {
  let s = '0x';
  for (let i = 0; i < len; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

export function CiphertextStream({
  stage,
  plaintext,
  elapsedMs,
  bytes,
  onClose,
}: {
  stage: EncryptStage;
  plaintext: string;
  elapsedMs?: number;
  bytes?: number;
  onClose?: () => void;
}) {
  const [hex, setHex] = useState<string[]>([]);

  // Stream new hex lines while encrypting
  useEffect(() => {
    if (stage !== 'encrypting' && stage !== 'ciphertext') return;
    const lines = Array.from({ length: 4 }, () => randomHex(64));
    setHex(lines);
    if (stage !== 'encrypting') return;
    const t = setInterval(() => {
      setHex((prev) => [randomHex(64), ...prev.slice(0, 7)]);
    }, 140);
    return () => clearInterval(t);
  }, [stage]);

  const visible = stage !== 'idle';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="mt-3 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-violet-500/5 via-cyan-500/5 to-transparent p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                <StageIcon stage={stage} />
                <StageLabel stage={stage} />
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                {elapsedMs != null && (
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {elapsedMs}ms
                  </span>
                )}
                {bytes != null && <span>{bytes} bytes</span>}
                {onClose && (stage === 'done' || stage === 'submitting') && (
                  <button
                    onClick={onClose}
                    className="text-zinc-500 hover:text-zinc-200"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Flow: plaintext -> arrow -> ciphertext */}
            <div className="grid grid-cols-[auto_auto_1fr] items-center gap-3">
              <div className="px-3 py-2 rounded-md bg-zinc-900/60 border border-zinc-700/60 font-mono text-xs text-zinc-300 truncate max-w-[120px]">
                {plaintext}
              </div>

              <motion.div
                animate={
                  stage === 'encrypting'
                    ? { x: [0, 4, 0], opacity: [0.4, 1, 0.4] }
                    : { x: 0, opacity: 1 }
                }
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ArrowRight className="h-4 w-4 text-cyan-400" />
              </motion.div>

              <div className="rounded-md bg-zinc-950/80 border border-cyan-500/30 p-2 font-mono text-[10px] leading-4 text-cyan-400/80 overflow-hidden h-[72px]">
                <AnimatePresence initial={false}>
                  {hex.slice(0, 4).map((line, i) => (
                    <motion.div
                      key={`${line}-${i}`}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1 - i * 0.2, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate"
                    >
                      {line}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Step progress */}
            <div className="mt-3 flex items-center gap-1.5">
              {(
                ['plaintext', 'encrypting', 'ciphertext', 'submitting', 'done'] as const
              ).map((s, i) => {
                const stages = [
                  'plaintext',
                  'encrypting',
                  'ciphertext',
                  'submitting',
                  'done',
                ] as const;
                const currentIdx = stages.indexOf(stage as any);
                const myIdx = stages.indexOf(s);
                const active = currentIdx >= myIdx;
                return (
                  <div
                    key={s}
                    className={`h-1 rounded-full flex-1 transition-colors ${
                      active ? 'bg-cyan-400' : 'bg-zinc-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StageIcon({ stage }: { stage: EncryptStage }) {
  if (stage === 'done') return <ShieldCheck className="h-3.5 w-3.5" />;
  if (stage === 'submitting' || stage === 'ciphertext')
    return <Cpu className="h-3.5 w-3.5" />;
  return <Lock className="h-3.5 w-3.5" />;
}

function StageLabel({ stage }: { stage: EncryptStage }) {
  switch (stage) {
    case 'plaintext':
      return <>Reading plaintext ballot…</>;
    case 'encrypting':
      return <>Encrypting locally via @cofhe/sdk…</>;
    case 'ciphertext':
      return <>Ciphertext ready. Signing transaction…</>;
    case 'submitting':
      return <>Submitting to Sepolia…</>;
    case 'done':
      return <>Sealed on-chain. Forever encrypted.</>;
    default:
      return null;
  }
}
