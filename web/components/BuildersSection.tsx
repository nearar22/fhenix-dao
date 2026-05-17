'use client';

import { motion } from 'framer-motion';
import { Github, BookOpen, GitFork, Code2, ArrowRight } from 'lucide-react';

const CTAS = [
  {
    Icon: GitFork,
    title: 'Fork this dApp',
    body: 'MIT-licensed source for the contract + this UI. Clone, deploy your own CoFHE-powered governance in minutes.',
    href: 'https://github.com/',
    cta: 'Open repo',
    color: '#a78bfa',
  },
  {
    Icon: BookOpen,
    title: 'Read the CoFHE docs',
    body: 'Encryption primitives, threshold decryption, gas tips, and the full Solidity API for euint8 → euint256.',
    href: 'https://cofhe-docs.fhenix.zone/',
    cta: 'Open docs',
    color: '#22d3ee',
  },
  {
    Icon: Code2,
    title: 'See the contract',
    body: 'Audit-ready Solidity for proposal lifecycle, encrypted tallying with FHE.add and quadratic budgets via FHE.select.',
    href: 'https://github.com/',
    cta: 'View Solidity',
    color: '#10b981',
  },
];

export function BuildersSection() {
  return (
    <section id="build" className="py-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-zinc-400 mb-4">
          <Github className="h-3 w-3 text-cyan-400" />
          For builders
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Open-source.{' '}
          <span className="gradient-text">Fork-ready.</span>
        </h2>
        <p className="mt-3 text-zinc-400">
          Fhinex is a reference dApp for Fhenix CoFHE. Steal the architecture,
          fork the UI, ship encrypted governance for your own DAO.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {CTAS.map((c, i) => (
          <motion.a
            key={c.title}
            href={c.href}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group relative glass rounded-2xl p-6 transition-all hover:scale-[1.01]"
          >
            <div
              className="h-12 w-12 rounded-xl grid place-items-center shadow-lg transition-transform group-hover:scale-110"
              style={{ background: `${c.color}1f`, color: c.color }}
            >
              <c.Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              {c.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              {c.body}
            </p>
            <div
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: c.color }}
            >
              {c.cta}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
