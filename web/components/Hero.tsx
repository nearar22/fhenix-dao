'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, ArrowRight, Code2, ChevronDown, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

function Ciphertext({ count = 36 }: { count?: number }) {
  const lines = Array.from({ length: count }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const hex = '0123456789abcdef';
    let s = '0x';
    for (let j = 0; j < 64; j++) s += hex[(seed * (j + 1)) % 16];
    return s;
  });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]">
      <div className="animate-ciphertext-scroll flex flex-col gap-2 font-mono text-[10px] leading-4 text-cyan-400/30 whitespace-nowrap">
        {[...lines, ...lines].map((l, i) => (
          <div key={i} style={{ paddingInlineStart: `${(i * 17) % 80}px` }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero({
  onScrollToProposals,
}: {
  onScrollToProposals?: () => void;
}) {
  const { t } = useI18n();
  const heroRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const r = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      setParallax({ x, y });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative pt-10 sm:pt-16 pb-16 sm:pb-24"
      id="top"
    >
      <div
        className="absolute -top-20 start-1/4 h-64 w-64 rounded-full blur-3xl bg-violet-500/30 pointer-events-none"
        style={{
          transform: `translate(${parallax.x * 30}px, ${parallax.y * 30}px)`,
        }}
      />
      <div
        className="absolute top-40 end-1/4 h-72 w-72 rounded-full blur-3xl bg-cyan-500/20 pointer-events-none"
        style={{
          transform: `translate(${parallax.x * -40}px, ${parallax.y * -40}px)`,
        }}
      />

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-zinc-400">
            <Sparkles className="h-3 w-3 text-cyan-400" />
            {t('hero.badge')}
          </div>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            {t('hero.title1')}
            <br />
            <span className="gradient-text">{t('hero.title2')}</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
            {t('hero.subtitle')}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={onScrollToProposals}
              className="h-12 px-5 rounded-xl gradient-bg text-white font-medium flex items-center gap-2 shadow-[0_8px_28px_rgba(124,58,237,0.4)] hover:shadow-[0_10px_36px_rgba(124,58,237,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('hero.cta')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="h-12 px-5 rounded-xl glass text-zinc-100 font-medium flex items-center gap-2 hover:bg-zinc-800/40 transition-all"
            >
              <Code2 className="h-4 w-4" />
              {t('hero.source')}
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[t('hero.f1'), t('hero.f2'), t('hero.f3')].map((p) => (
              <span
                key={p}
                className="px-3 py-1.5 rounded-full text-xs text-zinc-400 glass font-mono"
              >
                {p}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative h-[420px] sm:h-[480px] glass rounded-3xl overflow-hidden gradient-border"
        >
          <Ciphertext />

          <div
            className="absolute inset-0 grid place-items-center"
            style={{
              transform: `translate(${parallax.x * -10}px, ${parallax.y * -10}px)`,
            }}
          >
            <div className="relative animate-float-slow">
              <div className="h-44 w-44 sm:h-52 sm:w-52 rounded-3xl gradient-bg grid place-items-center animate-pulse-glow relative">
                <Lock
                  className="h-20 w-20 sm:h-24 sm:w-24 text-white"
                  strokeWidth={1.5}
                />
                <div className="absolute inset-0 rounded-3xl ring-1 ring-white/20" />
              </div>
              <p className="text-center mt-4 font-mono text-xs text-zinc-400 tracking-wider">
                {t('hero.caption')}
              </p>
            </div>
          </div>

          {[
            { label: 'FHE.add', className: 'top-6 start-6', delay: 0 },
            { label: 'FHE.select', className: 'top-6 end-6', delay: 0.3 },
            { label: 'FHE.gt', className: 'bottom-6 start-6', delay: 0.6 },
          ].map((b) => (
            <motion.div
              key={b.label}
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3 + b.delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: b.delay,
              }}
              className={`absolute ${b.className} px-2.5 py-1 rounded-lg glass text-[10px] font-mono text-cyan-400 border border-cyan-500/30`}
            >
              {b.label}
            </motion.div>
          ))}

          <div className="absolute bottom-6 end-6 px-2.5 py-1 rounded-lg glass text-[10px] font-mono text-violet-400 border border-violet-500/30">
            ciphertext
          </div>
        </motion.div>
      </div>

      <motion.button
        onClick={onScrollToProposals}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="mt-12 lg:mt-20 mx-auto flex flex-col items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors w-fit"
      >
        {t('hero.scroll')}
        <ChevronDown className="h-4 w-4" />
      </motion.button>
    </section>
  );
}
