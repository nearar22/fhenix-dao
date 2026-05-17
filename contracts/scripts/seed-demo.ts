import hre from 'hardhat';

// Per-network contract addresses. Add new chains here as you deploy.
const CONTRACTS: Record<number, string> = {
  11155111: '0xdcEB5E9A8736cD43641A7fb6fc57dF9D86C8F6A3', // Sepolia
  421614: process.env.CONTRACT_ARB_SEPOLIA ?? '', // Arbitrum Sepolia (fill after deploy)
};

// Duration in SECONDS so we can do quick tests (5 minutes).
const FIVE_MIN = 5 * 60;
const ONE_HOUR = 60 * 60;

const PROPOSALS = [
  {
    description: '[QUICK TEST] Try the encrypted finalize flow',
    options: ['Yes', 'No'],
    durationSeconds: FIVE_MIN,
    mode: 0,
  },
  {
    description: 'Should the Fhinex DAO fund the new privacy research grant?',
    options: ['Yes, fund 50k', 'No, defer 1 quarter', 'Abstain'],
    durationSeconds: ONE_HOUR,
    mode: 0,
  },
  {
    description:
      'Allocate Q2 treasury across initiatives (quadratic budget = 100 credits)',
    options: ['Marketing', 'R&D', 'Liquidity incentives', 'Reserves'],
    durationSeconds: ONE_HOUR * 2,
    mode: 1,
  },
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const contract = CONTRACTS[chainId];
  if (!contract) {
    throw new Error(
      `No contract address configured for chain ${chainId}. Update CONTRACTS in scripts/seed-demo.ts.`,
    );
  }

  console.log(`Seeding chain ${chainId} from:`, deployer.address);
  console.log('Contract:', contract);

  const voting = await hre.ethers.getContractAt('ConfidentialVoting', contract);

  for (const p of PROPOSALS) {
    const tx = await voting.createProposal(
      p.description,
      p.options,
      BigInt(p.durationSeconds),
      p.mode,
    );
    const rcpt = await tx.wait();
    console.log(
      `\u2713 Created [${p.mode === 1 ? 'QV' : 'STD'}] "${p.description.slice(0, 50)}..." tx=${rcpt?.hash}`,
    );
  }

  const total = await voting.proposalCount();
  console.log(`\nTotal proposals on-chain: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
