'use client';

import { Lock, Cpu, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

const STEPS = [
  { Icon: Lock, key: 's1', color: '#a78bfa', mix: '#22d3ee' },
  { Icon: Cpu, key: 's2', color: '#22d3ee', mix: '#a78bfa' },
  { Icon: ShieldCheck, key: 's3', color: '#10b981', mix: '#22d3ee' },
] as const;

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-[0.2em] text-violet-300 font-medium mb-2">
          {t('how.kicker')}
        </div>
        <h2 className="text-3xl font-bold">
          {t('how.title1')}{' '}
          <span className="gradient-text">{t('how.title2')}</span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative glass rounded-2xl p-6 transition-all"
          >
            <div
              className="h-12 w-12 rounded-xl grid place-items-center shadow-lg transition-transform group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${step.color}, ${step.mix})`,
              }}
            >
              <step.Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="mt-5 text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-mono">
              {t('how.step')} {i + 1}
            </div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">
              {t(`how.${step.key}.title` as any)}
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              {t(`how.${step.key}.body` as any)}
            </p>
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: `inset 0 0 0 1px ${step.color}` }}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
