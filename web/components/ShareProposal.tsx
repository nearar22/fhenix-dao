'use client';

import { useState } from 'react';
import { Share2, Check, Twitter } from 'lucide-react';

export function ShareProposal({
  proposalId,
  description,
}: {
  proposalId: bigint | number;
  description: string;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/#proposal-${proposalId.toString()}`
      : '';

  const shareText = `🔒 I just voted on Fhenix DAO proposal #${proposalId.toString()}, and nobody will ever see how I voted. Confidential DAO voting powered by Fhenix CoFHE.\n\n${description.slice(0, 100)}${description.length > 100 ? '…' : ''}`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(url)}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="inline-flex items-center gap-1">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noreferrer"
        className="h-7 w-7 grid place-items-center rounded-md text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
        title="Share on X"
      >
        <Twitter className="h-3.5 w-3.5" />
      </a>
      <button
        onClick={onCopy}
        className="h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
        title="Copy link"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Share2 className="h-3 w-3" />
            Share
          </>
        )}
      </button>
    </div>
  );
}
