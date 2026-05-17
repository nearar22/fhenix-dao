// Minimal ABI for the ConfidentialVoting contract — only the functions the UI calls.
export const VOTING_ABI = [
  {
    type: 'function',
    name: 'proposalCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'createProposal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'description', type: 'string' },
      { name: 'options', type: 'string[]' },
      { name: 'durationSeconds', type: 'uint64' },
      { name: 'mode', type: 'uint8' },
    ],
    outputs: [{ name: 'proposalId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'vote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      {
        name: 'encChoice',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'voteQuadratic',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      {
        name: 'encVotes',
        type: 'tuple[]',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'peekLeader',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getEncryptedLeader',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'CREDITS_PER_VOTER',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'MAX_VOTES_PER_OPTION',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'requestDecryption',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'finalizeProposal',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'plaintexts', type: 'uint32[]' },
      { name: 'signatures', type: 'bytes[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getProposalMeta',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'description', type: 'string' },
      { name: 'options', type: 'string[]' },
      { name: 'deadline', type: 'uint64' },
      { name: 'finalized', type: 'bool' },
      { name: 'decryptionRequested', type: 'bool' },
      { name: 'mode', type: 'uint8' },
      { name: 'leaderPeeked', type: 'bool' },
      { name: 'voteCount', type: 'uint32' },
    ],
  },
  {
    type: 'function',
    name: 'getEncryptedTally',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'optionIndex', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getResults',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint32[]' }],
  },
  {
    type: 'function',
    name: 'hasVoted',
    stateMutability: 'view',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'description', type: 'string', indexed: false },
      { name: 'numOptions', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint64', indexed: false },
      { name: 'mode', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LeaderPeeked',
    inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }],
  },
  {
    type: 'event',
    name: 'Voted',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ProposalFinalized',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: true },
      { name: 'results', type: 'uint32[]', indexed: false },
    ],
  },
] as const;

// Per-chain contract addresses. Override via env vars when deploying.
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  // Ethereum Sepolia (11155111)
  11155111:
    (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA as `0x${string}`) ??
    (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ??
    '0xdcEB5E9A8736cD43641A7fb6fc57dF9D86C8F6A3',
  // Arbitrum Sepolia (421614)
  421614:
    (process.env
      .NEXT_PUBLIC_CONTRACT_ADDRESS_ARBITRUM_SEPOLIA as `0x${string}`) ??
    '0x54d88A4205CCc5bFEF82c47385ce37719eB6884E',
};

/** Default (Sepolia) — kept for legacy imports. Prefer useContractAddress(). */
export const CONTRACT_ADDRESS = CONTRACT_ADDRESSES[11155111];

export function getContractAddress(chainId?: number): `0x${string}` {
  if (chainId && CONTRACT_ADDRESSES[chainId]) return CONTRACT_ADDRESSES[chainId];
  return CONTRACT_ADDRESS;
}

export function getExplorerBase(chainId?: number): string {
  switch (chainId) {
    case 421614:
      return 'https://sepolia.arbiscan.io';
    case 11155111:
    default:
      return 'https://sepolia.etherscan.io';
  }
}

export function getChainLabel(chainId?: number): string {
  switch (chainId) {
    case 421614:
      return 'Arbitrum Sepolia';
    case 11155111:
      return 'Ethereum Sepolia';
    default:
      return 'Unknown';
  }
}

export function getFaucetUrl(chainId?: number): string {
  switch (chainId) {
    case 421614:
      return 'https://faucet.quicknode.com/arbitrum/sepolia';
    case 11155111:
    default:
      return 'https://sepoliafaucet.com/';
  }
}
