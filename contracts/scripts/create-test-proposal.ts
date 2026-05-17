/**
 * Creates a single fast-test proposal so you can do a manual end-to-end run
 * from the browser:
 *   - 60-second deadline
 *   - 2 simple options
 *
 * Run:
 *   npx hardhat run scripts/create-test-proposal.ts --network arbitrumSepolia
 *   npx hardhat run scripts/create-test-proposal.ts --network sepolia
 */

import hre from 'hardhat';

const CONTRACTS: Record<number, string> = {
  11155111: '0xdcEB5E9A8736cD43641A7fb6fc57dF9D86C8F6A3',
  421614: '0x54d88A4205CCc5bFEF82c47385ce37719eB6884E',
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contract = CONTRACTS[chainId];
  if (!contract) throw new Error(`No contract for chain ${chainId}`);

  console.log(`Chain:    ${chainId}`);
  console.log(`Owner:    ${deployer.address}`);
  console.log(`Contract: ${contract}`);

  const voting = await hre.ethers.getContractAt('ConfidentialVoting', contract);

  const tx = await voting.createProposal(
    `[FAST TEST ${new Date().toISOString().slice(11, 19)}] Vote NOW, finalize in ~1 minute`,
    ['Yes', 'No'],
    60n,
    0,
  );
  const rcpt = await tx.wait();
  const id = (await voting.proposalCount()) - 1n;

  console.log(`\n\u2713 Proposal #${id} created`);
  console.log(`  tx:        ${rcpt?.hash}`);
  console.log(`  deadline:  ~60s from now`);
  console.log(`\nNow open the app and:`);
  console.log(`  1. Vote on Proposal #${id}`);
  console.log(`  2. Wait until "Awaiting finalize"`);
  console.log(`  3. Click "Finalize & reveal results"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
