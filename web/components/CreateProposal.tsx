'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { VOTING_ABI, getContractAddress } from '@/lib/abi';
import { Plus, Trash2, Loader2, Vote, Calculator } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CATEGORIES, encodeCategory, type CategoryKey } from '@/lib/categories';

type Mode = 0 | 1; // 0 = Standard, 1 = Quadratic

export function CreateProposal({ onCreated }: { onCreated?: () => void }) {
  const { t } = useI18n();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['Yes', 'No']);
  const [hours, setHours] = useState(24);
  const [mode, setMode] = useState<Mode>(0);
  const [category, setCategory] = useState<CategoryKey>('general');

  const { writeContractAsync, isPending, data: hash } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  if (isSuccess && onCreated) onCreated();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (description.trim().length < 4) return alert('Description too short');
    if (cleanOptions.length < 2) return alert('Need at least 2 options');

    const encoded = encodeCategory(category, description.trim());
    await writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: VOTING_ABI,
      functionName: 'createProposal',
      args: [encoded, cleanOptions, BigInt(hours * 3600), mode],
      chainId: chainId as any,
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="text-lg font-semibold">{t('create.title')}</h2>

      <div>
        <label className="label">{t('create.mech')}</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode(0)}
            className={`p-3 rounded-lg border text-left transition ${
              mode === 0
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Vote className="w-4 h-4" /> {t('card.standard')}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {t('create.mech.std.body')}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode(1)}
            className={`p-3 rounded-lg border text-left transition ${
              mode === 1
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Calculator className="w-4 h-4" /> {t('card.quadratic')}
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                FHE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {t('create.mech.qv.body')}
            </p>
          </button>
        </div>
      </div>

      <div>
        <label className="label">{t('create.category')}</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                  active
                    ? `${c.bg} ${c.color} ${c.border}`
                    : 'border-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>{c.emoji}</span>
                <span>{t(c.i18n as any)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label">{t('create.desc')}</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('create.desc.placeholder')}
        />
      </div>

      <div>
        <label className="label">
          {t('create.options')} ({options.length})
        </label>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input"
                value={o}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setOptions(options.filter((_, j) => j !== i))
                  }
                  className="btn-ghost"
                  aria-label="remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 16 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ''])}
              className="btn-ghost"
            >
              <Plus className="w-4 h-4" /> {t('create.options.add')}
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="label">{t('create.duration')}</label>
        <input
          type="number"
          min={1}
          max={720}
          className="input"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        />
      </div>

      <button
        type="submit"
        disabled={isPending || confirming}
        className="btn-primary w-full"
      >
        {(isPending || confirming) && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {isPending
          ? t('create.submit.pending')
          : confirming
            ? t('create.submit.creating')
            : t('create.submit')}
      </button>
    </form>
  );
}
