'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, ExternalLink, Github } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getContractAddress, getExplorerBase } from '@/lib/abi';
import { useChainId } from 'wagmi';

export function Footer() {
  const { t } = useI18n();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);
  const explorer = getExplorerBase(chainId);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored =
      (typeof window !== 'undefined' &&
        localStorage.getItem('fhinex.theme')) as 'dark' | 'light' | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
    try {
      localStorage.setItem('fhinex.theme', theme);
    } catch {}
  }, [theme]);

  return (
    <footer className="mt-20 border-t border-border/60">
      <div className="py-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">
          {t('footer.built')}{' '}
          <a
            href="https://www.fhenix.io/"
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:text-violet-300"
          >
            Fhenix CoFHE
          </a>{' '}
          · Sepolia
        </p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <a
            href={`${explorer}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('footer.contract')}
          </a>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            {t('footer.source')}
          </a>
        </div>
      </div>
    </footer>
  );
}
