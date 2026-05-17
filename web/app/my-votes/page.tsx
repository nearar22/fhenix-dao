'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId, usePublicClient, useReadContract } from 'wagmi';
import { VOTING_ABI, getContractAddress } from '@/lib/abi';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  ExternalLink,
  ShieldCheck,
  Clock,
  History,
  Vote as VoteIcon,
  Calculator,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ConnectButton } from '@/components/ConnectButton';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CursorBlob } from '@/components/CursorBlob';
import { NetworkGuard } from '@/components/NetworkGuard';
import { Footer } from '@/components/Footer';
import { parseCategory, getCategory } from '@/lib/categories';
import { useI18n } from '@/lib/i18n';

type Meta = readonly [
  creator: `0x${string}`,
  description: string,
  options: readonly string[],
  deadline: bigint,
  finalized: boolean,
  decryptionRequested: boolean,
  mode: number,
  leaderPeeked: boolean,
  voteCount: number,
];

type VoteRow = {
  id: bigint;
  description: string;
  category: string;
  emoji: string;
  catColor: string;
  catBg: string;
  catBorder: string;
  finalized: boolean;
  deadline: number;
  isQuadratic: boolean;
};

export default function MyVotesPage() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);

  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VOTING_ABI,
    functionName: 'proposalCount',
  });
  const total = count ? Number(count) : 0;

  const [rows, setRows] = useState<VoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient || !address || total === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const result: VoteRow[] = [];
      for (let i = total - 1; i >= 0; i--) {
        try {
          const id = BigInt(i);
          const voted = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: VOTING_ABI,
            functionName: 'hasVoted',
            args: [id, address],
          })) as boolean;
          if (!voted) continue;
          const m = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: VOTING_ABI,
            functionName: 'getProposalMeta',
            args: [id],
          })) as Meta;
          const parsed = parseCategory(m[1]);
          const cat = getCategory(parsed.category);
          result.push({
            id,
            description: parsed.description,
            category: cat.i18n,
            emoji: cat.emoji,
            catColor: cat.color,
            catBg: cat.bg,
            catBorder: cat.border,
            finalized: m[4],
            deadline: Number(m[3]),
            isQuadratic: m[6] === 1,
          });
        } catch {
          // skip
        }
      }
      if (!cancelled) {
        setRows(result);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, total]);

  const now = Math.floor(Date.now() / 1000);

  return (
    <>
      <CursorBlob />
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 group text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            <span className="text-sm font-medium">Back to proposals</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ConnectButton />
          </div>
        </div>
      </header>
      <NetworkGuard />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-zinc-400">
            <History className="h-3 w-3 text-cyan-400" />
            Your vote history
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            My encrypted votes
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl">
            Every ballot you've cast on Fhenix DAO. Your choices remain{' '}
            <span className="text-cyan-300 font-medium">forever encrypted</span>,
            even from us. This page only shows that you voted, never how.
          </p>
        </motion.div>

        {!isConnected ? (
          <div className="mt-10 glass rounded-2xl p-10 text-center">
            <Lock className="h-8 w-8 mx-auto text-zinc-500 mb-3" />
            <div className="font-medium mb-1">Connect your wallet</div>
            <div className="text-sm text-zinc-500">
              You need to be connected to see your vote history.
            </div>
          </div>
        ) : loading ? (
          <div className="mt-10 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="glass rounded-2xl p-5 animate-pulse h-24"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 glass rounded-2xl p-10 text-center">
            <VoteIcon className="h-8 w-8 mx-auto text-zinc-500 mb-3" />
            <div className="font-medium mb-1">No votes yet</div>
            <div className="text-sm text-zinc-500">
              Once you cast your first encrypted ballot, it'll show up here.
            </div>
            <Link
              href="/"
              className="mt-5 inline-flex h-9 px-4 rounded-lg gradient-bg text-white text-sm font-medium items-center gap-2 hover:scale-[1.02] transition-transform"
            >
              See live proposals
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-3">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-mono mb-2">
              {rows.length} encrypted ballot{rows.length === 1 ? '' : 's'} on-chain
            </div>
            {rows.map((r, i) => {
              const closed = r.deadline > 0 && now >= r.deadline;
              return (
                <motion.div
                  key={r.id.toString()}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-2xl p-5 hover:border-violet-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-zinc-500 flex items-center flex-wrap gap-2">
                        Proposal #{r.id.toString()}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${r.catBg} ${r.catColor} text-[10px] normal-case tracking-normal border ${r.catBorder}`}
                        >
                          <span>{r.emoji}</span> {t(r.category as any)}
                        </span>
                        {r.isQuadratic ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] normal-case tracking-normal">
                            <Calculator className="w-3 h-3" /> QV
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] normal-case tracking-normal">
                            <VoteIcon className="w-3 h-3" /> 1p1v
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold mt-1.5 break-words line-clamp-2">
                        {r.description}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400/90">
                        <Lock className="h-3 w-3" />
                        Your ballot is encrypted on Sepolia. Only the final tally
                        is ever revealed.
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span
                        className={`text-xs flex items-center gap-1.5 ${
                          r.finalized
                            ? 'text-emerald-400'
                            : closed
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                        }`}
                      >
                        {r.finalized ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" /> Revealed
                          </>
                        ) : closed ? (
                          <>
                            <Clock className="w-3.5 h-3.5" /> Awaiting
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Live
                          </>
                        )}
                      </span>
                      <a
                        href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-zinc-500 hover:text-zinc-200 inline-flex items-center gap-1"
                      >
                        Etherscan <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <Footer />
      </main>
    </>
  );
}
