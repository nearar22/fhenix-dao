// Categories are encoded as a `[KEY]` prefix at the start of the proposal
// description, e.g. "[treasury] Should we fund X?". This avoids any contract
// change while still giving us proper filtering & badges.

export type CategoryKey =
  | 'general'
  | 'treasury'
  | 'tech'
  | 'governance'
  | 'community';

export const CATEGORIES: {
  key: CategoryKey;
  i18n: string;
  color: string;
  bg: string;
  border: string;
  emoji: string;
}[] = [
  {
    key: 'general',
    i18n: 'cat.general',
    color: 'text-zinc-300',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    emoji: '📋',
  },
  {
    key: 'treasury',
    i18n: 'cat.treasury',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    emoji: '💰',
  },
  {
    key: 'tech',
    i18n: 'cat.tech',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    emoji: '⚙️',
  },
  {
    key: 'governance',
    i18n: 'cat.governance',
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    emoji: '⚖️',
  },
  {
    key: 'community',
    i18n: 'cat.community',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    emoji: '🌐',
  },
];

const KEYS = CATEGORIES.map((c) => c.key) as readonly CategoryKey[];

/** Parse a description like "[treasury] Foo" -> { category, description: "Foo" } */
export function parseCategory(raw: string): {
  category: CategoryKey;
  description: string;
} {
  const m = raw.match(/^\s*\[([a-z]+)\]\s*(.*)$/i);
  if (m && KEYS.includes(m[1].toLowerCase() as CategoryKey)) {
    return {
      category: m[1].toLowerCase() as CategoryKey,
      description: m[2],
    };
  }
  return { category: 'general', description: raw };
}

/** Encode a category prefix into a description for on-chain storage. */
export function encodeCategory(
  category: CategoryKey,
  description: string,
): string {
  if (category === 'general') return description;
  return `[${category}] ${description}`;
}

export function getCategory(key: CategoryKey) {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}
