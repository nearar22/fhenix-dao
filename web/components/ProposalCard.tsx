'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useConfig,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { getWalletClient, switchChain as switchChainCore } from '@wagmi/core';
import { sepolia } from 'wagmi/chains';
import { VOTING_ABI, getContractAddress } from '@/lib/abi';
import { SUPPORTED_CHAIN_IDS, type SupportedChainId } from '@/lib/wagmi';
import { getCofheClient } from '@/lib/cofhe';
import { Encryptable, FheTypes } from '@cofhe/sdk';
import {
  Lock,
  ShieldCheck,
  Loader2,
  Clock,
  Trophy,
  Calculator,
  Vote,
  Eye,
  Sparkles,
  Minus,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '@/lib/i18n';
import { parseCategory, getCategory } from '@/lib/categories';
import { CiphertextStream, type EncryptStage } from './CiphertextStream';
import { ShareProposal } from './ShareProposal';
import { ThresholdInfo } from './ThresholdInfo';
import { Zap, AlertTriangle } from 'lucide-react';

type Meta = readonly [
  creator: `0x${string}`,
  description: string,
  options: readonly string[],
  deadline: bigint,
  finalized: boolean,
  decryptionRequested: boolean,
  mode: number,
  leaderPeeked: boolean,
  voteCount: number,
];

const QUORUM_TARGET = 10; // visual participation target (demo)

export function ProposalCard({
  proposalId,
  categoryFilter,
  isOwner,
}: {
  proposalId: bigint;
  categoryFilter?: string;
  isOwner?: boolean;
}) {
  const { t } = useI18n();
  const { address } = useAccount();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = getContractAddress(chainId);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();

  /**
   * Robust walletClient fetcher.
   * `useWalletClient` is reactive but can lag behind connector state
   * (Rabby, EIP-6963 wallets, etc.). When that happens we synchronously
   * pull a fresh client from wagmi core so voting still works.
   */
  async function ensureWalletClient() {
    if (walletClient) return walletClient;
    try {
      const wc = await getWalletClient(wagmiConfig);
      if (wc) {
        console.log('[Fhinex] ensureWalletClient: fetched via core', wc.account?.address);
        return wc;
      }
    } catch (e) {
      console.error('[Fhinex] getWalletClient(core) failed:', e);
    }
    return null;
  }

  /**
   * Ensure the wallet is actually on a supported chain BEFORE we encrypt or
   * submit. wagmi's reactive `useChainId` can lag behind the wallet's real
   * chain (e.g. user manually switched in Rabby after connecting), so we
   * trust the walletClient's live chain id.
   * Returns the chain id we should target for writeContract, or throws.
   */
  async function ensureSupportedChain(
    wc: NonNullable<Awaited<ReturnType<typeof ensureWalletClient>>>,
  ): Promise<SupportedChainId> {
    const live = await wc.getChainId();
    console.log('[Fhinex] live wallet chain:', live, 'wagmi chain:', chainId);
    if (SUPPORTED_CHAIN_IDS.includes(live as SupportedChainId)) {
      return live as SupportedChainId;
    }
    // Wallet is on an unsupported chain (e.g. Mainnet). Force switch.
    setBusy('Switching network to Sepolia…');
    try {
      await switchChainAsync({ chainId: sepolia.id });
    } catch {
      // Fall back to core action which uses the active connector directly.
      await switchChainCore(wagmiConfig, { chainId: sepolia.id });
    }
    const after = await wc.getChainId();
    if (!SUPPORTED_CHAIN_IDS.includes(after as SupportedChainId)) {
      throw new Error(
        `Wallet is on chain ${after}. Please switch to Sepolia or Arbitrum Sepolia in your wallet and try again.`,
      );
    }
    return after as SupportedChainId;
  }

  const { data: meta, refetch: refetchMeta } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VOTING_ABI,
    functionName: 'getProposalMeta',
    args: [proposalId],
  }) as { data: Meta | undefined; refetch: () => void };

  const { data: voted, refetch: refetchVoted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VOTING_ABI,
    functionName: 'hasVoted',
    args: address ? [proposalId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: results, refetch: refetchResults } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: VOTING_ABI,
    functionName: 'getResults',
    args: [proposalId],
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [qvVotes, setQvVotes] = useState<number[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [hasFiredConfetti, setHasFiredConfetti] = useState(false);

  // Demo finalize: client-side simulated results for when CoFHE is down
  const [demoResults, setDemoResults] = useState<number[] | null>(null);
  const isDemoFinalized = demoResults !== null;

  // Live encryption visualization
  const [encStage, setEncStage] = useState<EncryptStage>('idle');
  const [encPlaintext, setEncPlaintext] = useState('');
  const [encMs, setEncMs] = useState<number | undefined>(undefined);
  const [encBytes, setEncBytes] = useState<number | undefined>(undefined);

  const CREDITS = 100;
  const MAX_PER_OPTION = 10;

  const now = Math.floor(Date.now() / 1000);
  const deadline = meta ? Number(meta[3]) : 0;
  const closed = deadline > 0 && now >= deadline;
  const finalized = meta?.[4] ?? false;
  const mode = meta?.[6] ?? 0;
  const leaderPeeked = meta?.[7] ?? false;
  const voteCount = meta ? Number(meta[8]) : 0;
  const isQuadratic = mode === 1;

  // Initialize qvVotes when options length changes
  useEffect(() => {
    if (meta && qvVotes.length !== meta[2].length) {
      setQvVotes(new Array(meta[2].length).fill(0));
    }
  }, [meta, qvVotes.length]);

  const qvBudgetUsed = qvVotes.reduce((s, v) => s + v * v, 0);
  const qvOverBudget = qvBudgetUsed > CREDITS;

  // Confetti on finalize
  useEffect(() => {
    if (finalized && !hasFiredConfetti) {
      setHasFiredConfetti(true);
      const duration = 2000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#7c3aed', '#06b6d4', '#22c55e'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#7c3aed', '#06b6d4', '#22c55e'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, [finalized, hasFiredConfetti]);

  const timeLeft = useMemo(() => {
    if (!meta) return '';
    if (closed) return 'Voting closed';
    const s = deadline - now;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m left`;
  }, [meta, closed, deadline, now]);

  // ---- voting ----
  const { writeContractAsync } = useWriteContract();

  async function castVote() {
    console.log('[Fhinex] castVote clicked', {
      selected,
      hasPublicClient: !!publicClient,
      hasWalletClient: !!walletClient,
      hasMeta: !!meta,
      address,
    });
    if (selected == null) {
      setError('Please select an option first.');
      return;
    }
    if (!publicClient || !meta) {
      setError('Network client not ready. Try refreshing the page.');
      return;
    }
    setError(null);
    setBusy('Preparing wallet…');
    setEncStage('plaintext');
    setEncPlaintext(meta[2][selected] ?? `Option ${selected}`);
    setEncMs(undefined);
    setEncBytes(undefined);
    const t0 = performance.now();
    try {
      const activeWallet = await ensureWalletClient();
      if (!activeWallet) {
        throw new Error(
          'Wallet not ready. Open your wallet extension, make sure it is unlocked and connected to Sepolia or Arbitrum Sepolia, then try again.',
        );
      }
      const targetChain = await ensureSupportedChain(activeWallet);
      setBusy('Encrypting your vote…');
      const client = await getCofheClient(publicClient as any, activeWallet);
      setEncStage('encrypting');
      const [encChoice] = await client
        .encryptInputs([Encryptable.uint8(BigInt(selected))])
        .onStep((step, ctx) => {
          if (ctx?.isStart) setBusy(`Encrypting: ${step}`);
        })
        .execute();

      const elapsed = Math.round(performance.now() - t0);
      setEncMs(elapsed);
      try {
        const size = JSON.stringify(encChoice).length;
        setEncBytes(size);
      } catch {}
      setEncStage('ciphertext');

      setBusy('Submitting transaction…');
      setEncStage('submitting');
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'vote',
        args: [proposalId, encChoice as any],
        chainId: targetChain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setEncStage('done');
      setBusy(null);
      refetchVoted();
      refetchMeta();
    } catch (e: any) {
      console.error('[Fhinex] castVote error:', e);
      setError(e?.shortMessage ?? e?.message ?? 'Vote failed');
      setBusy(null);
      setEncStage('idle');
    }
  }

  async function castQuadraticVote() {
    console.log('[Fhinex] castQuadraticVote clicked', {
      qvVotes,
      hasPublicClient: !!publicClient,
      hasWalletClient: !!walletClient,
      hasMeta: !!meta,
    });
    if (!publicClient || !meta) {
      setError('Network client not ready. Try refreshing the page.');
      return;
    }
    if (qvOverBudget) {
      setError(
        `Budget exceeded: ${qvBudgetUsed} > ${CREDITS}. (Vote would be silently zeroed by the contract.)`,
      );
      return;
    }
    if (qvBudgetUsed === 0) {
      setError('Allocate at least 1 vote to an option.');
      return;
    }
    setError(null);
    setBusy('Preparing wallet…');
    setEncStage('plaintext');
    setEncPlaintext(`[${qvVotes.join(', ')}]`);
    setEncMs(undefined);
    setEncBytes(undefined);
    const t0 = performance.now();
    try {
      const activeWallet = await ensureWalletClient();
      if (!activeWallet) {
        throw new Error(
          'Wallet not ready. Open your wallet extension, make sure it is unlocked and connected to a supported network, then try again.',
        );
      }
      const targetChain = await ensureSupportedChain(activeWallet);
      setBusy('Encrypting quadratic ballot…');
      const client = await getCofheClient(publicClient as any, activeWallet);
      setEncStage('encrypting');
      const inputs = qvVotes.map((v) => Encryptable.uint8(BigInt(v)));
      const encVotes = await client
        .encryptInputs(inputs)
        .onStep((step, ctx) => {
          if (ctx?.isStart) setBusy(`Encrypting: ${step}`);
        })
        .execute();

      const elapsed = Math.round(performance.now() - t0);
      setEncMs(elapsed);
      try {
        const size = JSON.stringify(encVotes).length;
        setEncBytes(size);
      } catch {}
      setEncStage('ciphertext');

      setBusy('Submitting transaction…');
      setEncStage('submitting');
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'voteQuadratic',
        args: [proposalId, encVotes as any],
        chainId: targetChain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setEncStage('done');
      setBusy(null);
      refetchVoted();
      refetchMeta();
    } catch (e: any) {
      console.error('[Fhinex] castQuadraticVote error:', e);
      setError(e?.shortMessage ?? e?.message ?? 'Vote failed');
      setBusy(null);
      setEncStage('idle');
    }
  }

  // ---- live encrypted leader peek ----
  async function peekLeader() {
    if (!publicClient || !meta) return;
    setError(null);
    try {
      const activeWallet = await ensureWalletClient();
      if (!activeWallet) throw new Error('Wallet not ready.');
      const targetChain = await ensureSupportedChain(activeWallet);
      // Step 1 (only first time): open leader index for global decryption.
      if (!leaderPeeked) {
        setBusy('Opening encrypted leader on-chain…');
        const peekHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: VOTING_ABI,
          functionName: 'peekLeader',
          args: [proposalId],
          chainId: targetChain,
        });
        await publicClient.waitForTransactionReceipt({ hash: peekHash });
        await refetchMeta();
      }

      // Step 2: decrypt the leader index ONLY (no tally counts revealed).
      const client = await getCofheClient(publicClient as any, activeWallet);
      const ctHash = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'getEncryptedLeader',
        args: [proposalId],
      })) as bigint;
      const tL = Date.now();
      let leaderPhase = 'submitting';
      const tickL = setInterval(() => {
        const s = Math.floor((Date.now() - tL) / 1000);
        setBusy(`Decrypting leader… ${s}s · ${leaderPhase}`);
      }, 1000);
      let decryptedValue: bigint;
      try {
        const r = await decryptWithProgress(client, ctHash, (info) => {
          leaderPhase = info.phase;
          console.log('[Fhinex] leader poll:', info);
        });
        decryptedValue = r.decryptedValue;
      } finally {
        clearInterval(tickL);
      }
      const idx = Number(decryptedValue);
      setLeaderName(meta[2][idx] ?? `Option ${idx}`);
      setBusy(null);
    } catch (e: any) {
      const raw = e?.shortMessage ?? e?.message ?? 'Leader peek failed';
      const isUpstream = /request_id|decrypt submit|decrypt-timeout/i.test(raw);
      setError(
        isUpstream
          ? 'CoFHE Threshold Network is unresponsive right now (we waited 5 min and the request_id never came back). The leader was already opened on-chain so you can retry later for free. Status: https://discord.gg/fhenix'
          : raw,
      );
      console.error('[Fhinex] peekLeader error:', raw);
      setBusy(null);
    }
  }

  /**
   * Wraps `client.decryptForTx(ctHash)` with two CoFHE-specific tweaks
   * informed by the SDK source code:
   *
   *  - `.set404RetryTimeout(120_000)` raises the SDK's tolerance for the
   *    threshold-network indexer being slow to index a fresh ciphertext.
   *    The SDK default is only 10s, which is too short on a busy testnet.
   *    The official hint emitted on failure is literally:
   *      "Increase set404RetryTimeout(...) if the backend is slow."
   *
   *  - `.onPoll(...)` lets us surface what stage the SDK is in (waiting on
   *    request_id vs. polling for the result) so the UI shows real
   *    progress instead of a frozen spinner.
   *
   * The SDK already retries internally for up to 5 minutes, so we don't
   * race a hard timeout on top of it -- that was cutting valid runs short.
   */
  async function decryptWithProgress(
    client: Awaited<ReturnType<typeof getCofheClient>>,
    ctHash: bigint,
    onPoll: (info: { phase: string; attempt: number }) => void,
  ): Promise<{ decryptedValue: bigint; signature: string }> {
    return (await client
      .decryptForTx(ctHash)
      .withoutPermit()
      .set404RetryTimeout(120_000)
      .onPoll((info: any) => {
        onPoll({
          phase: info?.phase ?? info?.kind ?? 'polling',
          attempt: info?.attempt ?? info?.attemptIndex ?? 0,
        });
      })
      .execute()) as any;
  }

  // ---- finalize ----
  async function finalize() {
    if (!meta || !publicClient) return;
    setError(null);
    try {
      const activeWallet = await ensureWalletClient();
      if (!activeWallet) throw new Error('Wallet not ready.');
      const targetChain = await ensureSupportedChain(activeWallet);
      const client = await getCofheClient(publicClient as any, activeWallet);
      const numOptions = meta[2].length;

      // Step 1: open tallies for global decryption (only once)
      if (!meta[5]) {
        setBusy('Opening tallies for decryption…');
        const reqHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: VOTING_ABI,
          functionName: 'requestDecryption',
          args: [proposalId],
          chainId: targetChain,
        });
        await publicClient.waitForTransactionReceipt({ hash: reqHash });
        await refetchMeta();
      }

      // Step 2: decrypt every tally via Threshold Network. The threshold
      // network can take 30s-2min per ciphertext, so we surface progress
      // (elapsed seconds) and log every step.
      setBusy('Decrypting tallies via Threshold Network…');
      const plaintexts: number[] = [];
      const signatures: `0x${string}`[] = [];

      for (let i = 0; i < numOptions; i++) {
        const t0 = Date.now();
        let phase = 'submitting';
        const ctHash = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VOTING_ABI,
          functionName: 'getEncryptedTally',
          args: [proposalId, BigInt(i)],
        })) as bigint;
        console.log(`[Fhinex] decrypting tally ${i}/${numOptions} ctHash=`, ctHash.toString());

        const tick = setInterval(() => {
          const s = Math.floor((Date.now() - t0) / 1000);
          setBusy(`Decrypting option ${i + 1}/${numOptions}… ${s}s · ${phase}`);
        }, 1000);

        try {
          const { decryptedValue, signature } = await decryptWithProgress(
            client,
            ctHash,
            (info) => {
              phase = info.phase;
              console.log(`[Fhinex] tally ${i} poll:`, info);
            },
          );

          plaintexts.push(Number(decryptedValue));
          signatures.push(signature as `0x${string}`);
          console.log(
            `[Fhinex] decrypted tally ${i} in ${Math.round((Date.now() - t0) / 1000)}s ->`,
            decryptedValue.toString(),
          );
        } finally {
          clearInterval(tick);
        }
      }

      console.log('[Fhinex] all tallies decrypted', {
        plaintexts,
        signatures: signatures.map((s) => ({ len: s.length, sample: s.slice(0, 20) })),
      });
      // Sanity-check: every signature must be a non-empty hex blob, otherwise
      // the contract's signature verification will revert before the wallet
      // even opens. This is the failure mode for 0-voter proposals on real
      // testnets where the SDK returns mock/empty signatures.
      const invalidSigIdx = signatures.findIndex(
        (s) => !s || s === '0x' || s.length < 10,
      );
      if (invalidSigIdx >= 0) {
        throw new Error(
          `CoFHE returned an empty signature for option ${invalidSigIdx + 1}. ` +
            `This usually happens on proposals with 0 votes (the encrypted tally ` +
            `was never written by a vote). Cast at least one vote, then try again.`,
        );
      }

      setBusy('Publishing results on-chain…');
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: VOTING_ABI,
        functionName: 'finalizeProposal',
        args: [proposalId, plaintexts, signatures],
        chainId: targetChain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setBusy(null);
      refetchMeta();
      refetchResults();
    } catch (e: any) {
      const raw = e?.shortMessage ?? e?.message ?? 'Finalize failed';
      const isUpstream = /request_id|decrypt submit|decrypt-timeout/i.test(raw);
      const friendly = isUpstream
        ? 'CoFHE Threshold Network is slow / unreachable right now (we retried 3 times). Your decryption request is already open on-chain so retrying later costs no extra gas. Track Fhenix status: https://discord.gg/fhenix'
        : raw;
      setError(friendly);
      console.error('[Fhinex] finalize error:', raw);
      setBusy(null);
    }
  }

  /**
   * Demo Finalize — generates plausible mock results client-side.
   * This does NOT touch the chain. It's purely visual so hackathon judges
   * can see the confetti + results UI even when CoFHE's threshold network
   * is unreachable.
   */
  function demoFinalize() {
    if (!meta) return;
    const n = meta[2].length;
    const vc = Math.max(voteCount, 1);
    // Generate random distribution that sums to roughly voteCount
    const raw = Array.from({ length: n }, () => Math.random());
    const sum = raw.reduce((a, b) => a + b, 0);
    const mock = raw.map((r) => Math.round((r / sum) * vc));
    // Make sure it sums to voteCount exactly
    const diff = vc - mock.reduce((a, b) => a + b, 0);
    mock[0] += diff;
    setDemoResults(mock);
    // Fire confetti!
    const duration = 2000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f59e0b', '#7c3aed', '#06b6d4'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#7c3aed', '#06b6d4'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  if (!meta) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 w-32 bg-border rounded" />
      </div>
    );
  }

  const [, description, options] = meta;

  // Use real results if finalized, or demo results if in demo mode
  const activeResults = finalized && results
    ? (results as readonly number[])
    : isDemoFinalized
      ? demoResults
      : null;
  const showResults = activeResults !== null;

  const totalVotes = showResults
    ? activeResults.reduce((a, b) => a + Number(b), 0)
    : 0;
  const winnerIdx = showResults
    ? activeResults.reduce(
        (best, v, i, arr) => (Number(v) > Number(arr[best]) ? i : best),
        0,
      )
    : -1;

  const parsed = parseCategory(description);
  const cat = getCategory(parsed.category);
  const cleanDesc = parsed.description;

  // Filter by selected category (if any)
  if (
    categoryFilter &&
    categoryFilter !== 'all' &&
    categoryFilter !== parsed.category
  ) {
    return null;
  }
  const quorumPct = Math.min(100, (voteCount / QUORUM_TARGET) * 100);
  const quorumMet = voteCount >= QUORUM_TARGET;

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500 flex items-center flex-wrap gap-2">
            {t('card.proposal')} #{proposalId.toString()}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${cat.bg} ${cat.color} text-[10px] normal-case tracking-normal border ${cat.border}`}
            >
              <span>{cat.emoji}</span> {t(cat.i18n as any)}
            </span>
            {isQuadratic ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px] normal-case tracking-normal">
                <Calculator className="w-3 h-3" /> {t('card.quadratic')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] normal-case tracking-normal">
                <Vote className="w-3 h-3" /> {t('card.standard')}
              </span>
            )}
            <span className="text-zinc-500">
              • {voteCount}{' '}
              {voteCount === 1 ? t('card.voter') : t('card.voters')}
            </span>
          </div>
          <h3 className="text-lg font-semibold mt-1 break-words">
            {cleanDesc}
          </h3>
          <div className="mt-2">
            <ShareProposal proposalId={proposalId} description={cleanDesc} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
          {finalized ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />{' '}
              {t('card.finalized')}
            </>
          ) : closed ? (
            <>
              <Clock className="w-4 h-4 text-amber-400" />{' '}
              {t('card.awaiting')}
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-accent2" /> {timeLeft}
            </>
          )}
        </div>
      </div>

      {/* Quorum / participation bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-zinc-500 uppercase tracking-wider">
            {t('card.quorum')}
          </span>
          <span
            className={
              quorumMet ? 'text-emerald-300 font-medium' : 'text-zinc-400'
            }
          >
            {voteCount} / {QUORUM_TARGET}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-bg overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${
              quorumMet
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                : 'bg-gradient-to-r from-violet-500 to-cyan-500'
            }`}
            style={{ width: `${quorumPct}%` }}
          />
        </div>
      </div>

      {/* Voting UI — STANDARD */}
      {!closed && !voted && !isQuadratic && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${
                selected === i
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-zinc-600'
              }`}
            >
              <input
                type="radio"
                name={`p-${proposalId}`}
                checked={selected === i}
                onChange={() => setSelected(i)}
                className="accent-accent"
              />
              <span>{opt}</span>
            </label>
          ))}
          <button
            disabled={selected == null || !!busy}
            onClick={castVote}
            className="btn-primary w-full"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {busy}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> {t('card.cast')}
              </>
            )}
          </button>
          <CiphertextStream
            stage={encStage}
            plaintext={encPlaintext}
            elapsedMs={encMs}
            bytes={encBytes}
            onClose={() => setEncStage('idle')}
          />
        </div>
      )}

      {/* Voting UI — QUADRATIC */}
      {!closed && !voted && isQuadratic && (
        <div className="space-y-3">
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-xs text-violet-200">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Calculator className="w-4 h-4" /> {t('card.qv.budget')}
            </div>
            {t('card.qv.budget.body')}
          </div>

          <div className="space-y-2">
            {options.map((opt, i) => {
              const v = qvVotes[i] ?? 0;
              const cost = v * v;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-bg/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-medium truncate">{opt}</span>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {t('card.qv.cost')}:{' '}
                      <b className="text-violet-300">{cost}</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...qvVotes];
                        next[i] = Math.max(0, v - 1);
                        setQvVotes(next);
                      }}
                      className="btn-ghost px-2"
                      disabled={v <= 0}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={MAX_PER_OPTION}
                      value={v}
                      onChange={(e) => {
                        const next = [...qvVotes];
                        next[i] = Number(e.target.value);
                        setQvVotes(next);
                      }}
                      className="flex-1 accent-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...qvVotes];
                        next[i] = Math.min(MAX_PER_OPTION, v + 1);
                        setQvVotes(next);
                      }}
                      className="btn-ghost px-2"
                      disabled={v >= MAX_PER_OPTION}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-right text-sm tabular-nums text-zinc-200">
                      {v}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">{t('card.qv.used')}</span>
              <span
                className={
                  qvOverBudget
                    ? 'text-red-400 font-semibold'
                    : 'text-violet-300 font-medium'
                }
              >
                {qvBudgetUsed} / {CREDITS}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden">
              <div
                className={`h-full transition-all ${
                  qvOverBudget ? 'bg-red-500' : 'bg-violet-500'
                }`}
                style={{
                  width: `${Math.min(100, (qvBudgetUsed / CREDITS) * 100)}%`,
                }}
              />
            </div>
          </div>

          <button
            disabled={qvBudgetUsed === 0 || qvOverBudget || !!busy}
            onClick={castQuadraticVote}
            className="btn-primary w-full"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {busy}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> {t('card.cast.qv')}
              </>
            )}
          </button>
          <CiphertextStream
            stage={encStage}
            plaintext={encPlaintext}
            elapsedMs={encMs}
            bytes={encBytes}
            onClose={() => setEncStage('idle')}
          />
        </div>
      )}

      {!closed && voted && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {t('card.voted')}
        </div>
      )}

      {/* Live encrypted leader peek */}
      {!finalized && voteCount > 0 && (
        <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span className="text-zinc-200">
                {leaderName ? (
                  <>
                    {t('card.leader.leading')}:{' '}
                    <b className="text-cyan-300">{leaderName}</b>
                    <span className="text-zinc-500 ml-2">
                      ({t('card.leader.sealed')})
                    </span>
                  </>
                ) : (
                  <>{t('card.leader.peek')}</>
                )}
              </span>
            </div>
            <button
              onClick={peekLeader}
              disabled={!!busy}
              className="btn-ghost text-xs shrink-0"
            >
              {busy && busy.toLowerCase().includes('leader') ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {leaderName
                ? t('card.leader.refresh')
                : t('card.leader.reveal')}
            </button>
          </div>
        </div>
      )}

      {/* Awaiting finalize */}
      {closed && !finalized && !isDemoFinalized && (
        <div className="space-y-2">
          <button onClick={finalize} disabled={!!busy} className="btn-primary w-full">
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {busy}
              </>
            ) : (
              t('card.finalize')
            )}
          </button>

          {/* Demo Finalize — owner-only fallback when CoFHE is down */}
          {isOwner && (
            <button
              onClick={demoFinalize}
              disabled={!!busy}
              className="btn w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <Zap className="w-4 h-4" />
              {t('card.demo' as any)}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-2">
          {/* Demo mode banner */}
          {isDemoFinalized && !finalized && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] uppercase tracking-wider">
                    {t('card.demo.badge' as any)}
                  </span>
                  Simulated Results
                </span>
                <p className="text-amber-200/70 mt-1">
                  {t('card.demo.note' as any)}
                </p>
                <button
                  onClick={() => setDemoResults(null)}
                  className="mt-2 text-amber-400 hover:text-amber-300 underline underline-offset-2 text-[11px]"
                >
                  Dismiss simulation
                </button>
              </div>
            </div>
          )}

          {options.map((opt, i) => {
            const v = Number(activeResults[i] ?? 0);
            const pct = totalVotes > 0 ? (v / totalVotes) * 100 : 0;
            const isWinner = i === winnerIdx && totalVotes > 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {isWinner && (
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    )}
                    {opt}
                  </span>
                  <span className="text-zinc-400">
                    {v} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${isWinner ? 'bg-accent' : 'bg-accent2'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="text-xs text-zinc-500 pt-2 flex items-center gap-1.5">
            {t('card.results.total')}: {totalVotes}
            <span className="text-zinc-600">·</span>
            {finalized ? (
              <span className="inline-flex items-center gap-1 text-emerald-400/80">
                <ShieldCheck className="w-3 h-3" /> Threshold-signed reveal
                <ThresholdInfo />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400/80">
                <Zap className="w-3 h-3" /> Simulated (client-side only)
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-700/50 bg-red-500/5 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
