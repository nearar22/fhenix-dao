'use client';

import { useRef } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import {
  VOTING_ABI,
  getExplorerBase,
  getContractAddress,
} from '@/lib/abi';
import { ConnectButton } from '@/components/ConnectButton';
import { CreateProposal } from '@/components/CreateProposal';
import { ProposalCard } from '@/components/ProposalCard';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { LiveStats } from '@/components/LiveStats';
import { Footer } from '@/components/Footer';
import { CursorBlob } from '@/components/CursorBlob';
import { NetworkGuard } from '@/components/NetworkGuard';
import { WhatIsFHEButton } from '@/components/WhatIsFHE';
import { Faq } from '@/components/Faq';
import { BuildersSection } from '@/components/BuildersSection';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ChainSwitcher } from '@/components/ChainSwitcher';
import { Lock, ExternalLink, History } from 'lucide-react';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import type { CategoryKey } from '@/lib/categories';

export default function Home() {
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const explorer = getExplorerBase(chainId);

  const { data: count, refetch: refetchCount } = useReadContract({
    address: contractAddress,
    abi: VOTING_ABI,
    functionName: 'proposalCount',
  });

  const { data: owner } = useReadContract({
    address: contractAddress,
    abi: VOTING_ABI,
    functionName: 'owner',
  });

  const isOwner =
    !!address && !!owner && address.toLowerCase() === (owner as string).toLowerCase();

  const total = count ? Number(count) : 0;
  // newest first
  const ids = Array.from({ length: total }, (_, i) => BigInt(total - 1 - i));

  const proposalsRef = useRef<HTMLDivElement>(null);
  const scrollToProposals = () => {
    proposalsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const [category, setCategory] = useState<CategoryKey | 'all'>('all');

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <CursorBlob />
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'glass border-b border-border/60'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 rounded-xl gradient-bg grid place-items-center shadow-[0_4px_20px_rgba(124,58,237,0.4)]">
              <Lock className="h-4 w-4 text-white" strokeWidth={2.5} />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold tracking-tight">Fhenix DAO</span>
              <span className="text-[10px] text-zinc-500 hidden sm:block">
                {t('app.tagline')}
              </span>
            </div>
          </a>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <WhatIsFHEButton className="hidden md:inline-flex" />
            <Link
              href="/my-votes"
              className="h-9 hidden md:flex items-center gap-1.5 px-3 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              My votes
            </Link>
            <LanguageSwitcher />
            <ChainSwitcher />
            <a
              href={`${explorer}/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="h-9 hidden lg:flex items-center gap-1.5 px-3 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors font-mono"
              title={t('header.contract')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {contractAddress.slice(0, 6)}…{contractAddress.slice(-4)}
            </a>
            <ConnectButton />
          </div>
        </div>
      </header>
      <NetworkGuard />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">

      {/* Hero */}
      <Hero onScrollToProposals={scrollToProposals} />

      {/* Live stats */}
      <LiveStats />

      {/* How it works */}
      <HowItWorks />

      {/* Proposals + Activity feed */}
      <div ref={proposalsRef} className="pt-8 grid lg:grid-cols-[1fr_300px] gap-6">
        <div>
          {!isConnected && (
            <div className="card text-center py-10">
              <div className="text-zinc-300 font-medium mb-1">
                {t('props.connect.title')}
              </div>
              <div className="text-sm text-zinc-500">
                {t('props.connect.body')}
              </div>
            </div>
          )}

          {isConnected && (
            <>
              {isOwner && (
                <div className="mb-8">
                  <CreateProposal onCreated={() => refetchCount()} />
                </div>
              )}

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm uppercase tracking-[0.2em] text-zinc-400 font-medium">
                    {t('props.title')}
                  </h2>
                  <span className="text-xs text-zinc-500">
                    {total} {t('props.total')}
                  </span>
                </div>
                <CategoryFilter value={category} onChange={setCategory} />
                {total === 0 ? (
                  <div className="card text-zinc-500 text-sm text-center py-8">
                    {t('props.empty')}
                    {isOwner && ' ' + t('props.empty.owner')}
                  </div>
                ) : (
                  ids.map((id) => (
                    <ProposalCard
                      key={id.toString()}
                      proposalId={id}
                      categoryFilter={category}
                      isOwner={isOwner}
                    />
                  ))
                )}
              </section>
            </>
          )}
        </div>

        {/* Activity feed sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <ActivityFeed />
          </div>
        </aside>
      </div>

        <BuildersSection />
        <Faq />
        <Footer />
      </main>
    </>
  );
}
