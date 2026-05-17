'use client';

import { useEffect, useState } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { VOTING_ABI, getContractAddress } from '@/lib/abi';
import { useI18n } from '@/lib/i18n';
import { Activity, FileText, Lock, Eye, ShieldCheck } from 'lucide-react';

type EventItem = {
  kind: 'created' | 'voted' | 'peeked' | 'finalized';
  proposalId: number;
  blockNumber: bigint;
  txHash: string;
};

const ICONS = {
  created: FileText,
  voted: Lock,
  peeked: Eye,
  finalized: ShieldCheck,
};

const COLORS = {
  created: 'text-violet-300 bg-violet-500/10',
  voted: 'text-cyan-300 bg-cyan-500/10',
  peeked: 'text-amber-300 bg-amber-500/10',
  finalized: 'text-emerald-300 bg-emerald-500/10',
};

export function ActivityFeed() {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);
  const { t } = useI18n();
  const [items, setItems] = useState<EventItem[]>([]);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    async function load() {
      try {
        const latest = await publicClient!.getBlockNumber();
        const from = latest > 5000n ? latest - 5000n : 0n;
        const opts = {
          address: CONTRACT_ADDRESS,
          fromBlock: from,
          toBlock: latest,
        } as const;
        const [created, voted, peeked, finalized] = await Promise.all([
          publicClient!.getLogs({
            ...opts,
            event: VOTING_ABI.find(
              (e) => e.type === 'event' && e.name === 'ProposalCreated',
            ) as any,
          }),
          publicClient!.getLogs({
            ...opts,
            event: VOTING_ABI.find(
              (e) => e.type === 'event' && e.name === 'Voted',
            ) as any,
          }),
          publicClient!
            .getLogs({
              ...opts,
              event: VOTING_ABI.find(
                (e) => e.type === 'event' && e.name === 'LeaderPeeked',
              ) as any,
            })
            .catch(() => [] as any[]),
          publicClient!.getLogs({
            ...opts,
            event: VOTING_ABI.find(
              (e) => e.type === 'event' && e.name === 'ProposalFinalized',
            ) as any,
          }),
        ]);

        const merge = (
          arr: any[],
          kind: EventItem['kind'],
        ): EventItem[] =>
          arr.map((l) => ({
            kind,
            proposalId: Number(l.args?.proposalId ?? 0),
            blockNumber: l.blockNumber,
            txHash: l.transactionHash,
          }));

        const all = [
          ...merge(created, 'created'),
          ...merge(voted, 'voted'),
          ...merge(peeked, 'peeked'),
          ...merge(finalized, 'finalized'),
        ].sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) setItems(all.slice(0, 15));
      } catch {
        // ignore
      }
    }

    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicClient]);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-violet-300" />
        <h3 className="text-sm font-semibold">{t('activity.title')}</h3>
        <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-zinc-500 py-4 text-center">
          {t('activity.empty')}
        </div>
      ) : (
        <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {items.map((it, i) => {
            const Icon = ICONS[it.kind];
            const label = t(`activity.${it.kind}` as any, { id: it.proposalId });
            return (
              <li
                key={`${it.txHash}-${i}`}
                className="flex items-start gap-2 text-xs"
              >
                <div
                  className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${COLORS[it.kind]}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-200 truncate">{label}</div>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${it.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono"
                  >
                    {it.txHash.slice(0, 10)}…
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
