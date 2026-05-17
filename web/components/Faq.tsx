'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Can the contract owner see how I voted?',
    a: 'No. Your ballot is encrypted in your browser before it ever touches the chain. The contract operates on ciphertexts using FHE.add / FHE.eq / FHE.select. Even validators only see encrypted bytes. The contract owner has the same view as everyone else.',
  },
  {
    q: 'How is FHE different from zero-knowledge (ZK) voting?',
    a: 'ZK voting proves a tally is correct against a hidden ballot, but typically needs a trusted off-chain aggregator. FHE lets the chain itself compute on encrypted ballots, no aggregator required. The chain is the tallier, and it never sees plaintext.',
  },
  {
    q: 'What stops the Threshold Network from colluding to leak votes?',
    a: 'The network can only decrypt the final tally, not individual ballots. Decryption is split across N independent operators using threshold cryptography: you need M-of-N to sign, which makes collusion publicly observable and economically punishable via slashing.',
  },
  {
    q: 'Why is gas higher than a normal vote?',
    a: 'FHE operations are roughly 10–100× more expensive than plaintext ops. CoFHE batches and amortizes these costs, and most user actions are around 200k to 500k gas, comparable to a Uniswap swap. Tallying happens lazily, paid by the finalizer.',
  },
  {
    q: 'What happens if I lose my wallet?',
    a: 'Your past votes stay encrypted forever; they are not tied to any decryption key you control. You simply lose the ability to vote on future proposals with that address. No recovery is needed because no secret is held by you.',
  },
  {
    q: 'Is this audited?',
    a: 'CoFHE is built by Fhenix and audited by leading firms (see fhenix.io/security). The Fhinex example contract is open source. Audit before mainnet use. This Sepolia deployment is for demonstration.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-zinc-400 mb-4">
          <HelpCircle className="h-3 w-3 text-cyan-400" />
          FAQ
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          The honest answers
        </h2>
        <p className="mt-3 text-zinc-400">
          Everything you might be wondering before you cast an encrypted vote.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-2">
        {QUESTIONS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="glass rounded-xl overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-start hover:bg-zinc-800/20 transition-colors"
              >
                <span className="font-medium text-sm sm:text-base">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  } text-zinc-400`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed">
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
