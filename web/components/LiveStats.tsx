'use client';

import { useEffect, useRef, useState } from 'react';
import { useReadContract, usePublicClient, useChainId } from 'wagmi';
import { motion, useInView } from 'framer-motion';
import { VOTING_ABI, getContractAddress } from '@/lib/abi';
import { FileText, Lock, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setVal(Math.floor(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {val.toLocaleString()}
    </span>
  );
}

export function LiveStats() {
  const { t } = useI18n();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);
  const publicClient = usePublicClient();
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VOTING_ABI,
    functionName: 'proposalCount',
  });

  const total = count ? Number(count) : 0;
  const [totalVotes, setTotalVotes] = useState<number | null>(null);
  const [finalized, setFinalized] = useState<number>(0);

  useEffect(() => {
    if (!publicClient || total === 0) {
      setTotalVotes(0);
      setFinalized(0);
      return;
    }
    let cancelled = false;
    (async () => {
      let votes = 0;
      let done = 0;
      for (let i = 0; i < total; i++) {
        try {
          const m = (await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: VOTING_ABI,
            functionName: 'getProposalMeta',
            args: [BigInt(i)],
          })) as readonly [
            string,
            string,
            readonly string[],
            bigint,
            boolean,
            boolean,
            number,
            boolean,
            number,
          ];
          votes += Number(m[8] ?? 0);
          if (m[4]) done += 1;
        } catch {
          // skip
        }
      }
      if (!cancelled) {
        setTotalVotes(votes);
        setFinalized(done);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, total]);

  const items = [
    {
      label: t('stats.proposals'),
      value: total,
      Icon: FileText,
      color: '#a78bfa',
    },
    {
      label: t('stats.ballots'),
      value: totalVotes ?? 0,
      Icon: Lock,
      color: '#22d3ee',
    },
    {
      label: t('stats.revealed'),
      value: finalized,
      Icon: ShieldCheck,
      color: '#10b981',
    },
  ];

  return (
    <section className="-mt-4 mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-violet-500/40 transition-colors"
        >
          <div
            className="h-12 w-12 rounded-xl grid place-items-center shrink-0"
            style={{
              background: `${s.color}1f`,
              color: s.color,
            }}
          >
            <s.Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-3xl font-semibold tracking-tight font-mono">
              <CountUp to={Number(s.value) || 0} />
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 mt-0.5">
              {s.label}
            </div>
          </div>
        </motion.div>
      ))}
    </section>
  );
}
