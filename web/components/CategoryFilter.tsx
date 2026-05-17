'use client';

import { CATEGORIES, type CategoryKey } from '@/lib/categories';
import { useI18n } from '@/lib/i18n';
import { LayoutGrid } from 'lucide-react';

export function CategoryFilter({
  value,
  onChange,
  counts,
}: {
  value: CategoryKey | 'all';
  onChange: (v: CategoryKey | 'all') => void;
  counts?: Partial<Record<CategoryKey | 'all', number>>;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1.5 no-scrollbar">
      <Chip
        active={value === 'all'}
        onClick={() => onChange('all')}
        label={
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="h-3 w-3" />
            {t('props.filter.all')}
            {counts?.all != null && (
              <span className="text-[10px] opacity-70">({counts.all})</span>
            )}
          </span>
        }
      />
      {CATEGORIES.map((c) => (
        <Chip
          key={c.key}
          active={value === c.key}
          onClick={() => onChange(c.key)}
          tone={c.color}
          bg={c.bg}
          border={c.border}
          label={
            <span className="inline-flex items-center gap-1.5">
              <span>{c.emoji}</span>
              {t(c.i18n as any)}
              {counts?.[c.key] != null && (
                <span className="text-[10px] opacity-70">
                  ({counts[c.key]})
                </span>
              )}
            </span>
          }
        />
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  tone,
  bg,
  border,
}: {
  active: boolean;
  onClick: () => void;
  label: React.ReactNode;
  tone?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-xs font-medium transition-all ${
        active
          ? `${bg ?? 'bg-violet-500/15'} ${tone ?? 'text-violet-200'} border ${border ?? 'border-violet-500/40'} shadow-sm`
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
      }`}
    >
      {label}
    </button>
  );
}
