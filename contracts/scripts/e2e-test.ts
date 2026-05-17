/**
 * End-to-end test of the encrypted voting flow on a real chain.
 *
 * What it does:
 *   1. Creates a proposal with a very short duration (60 seconds)
 *   2. Encrypts a vote via the CoFHE SDK (real threshold network)
 *   3. Submits the encrypted vote on-chain
 *   4. Waits for deadline + opens tallies for decryption
 *   5. Decrypts each tally via the CoFHE threshold network
 *   6. Finalizes results on-chain
 *
 * Run:
 *   npx hardhat run scripts/e2e-test.ts --network arbitrumSepolia
 */

import hre from 'hardhat';
import { Encryptable, type CofheClient } from '@cofhe/sdk';
// `web` entrypoint exposes the high-level helpers; it works in Node 20+
// because Workers and crypto.subtle are available there too.
const { createCofheClient, createCofheConfig } = require('@cofhe/sdk/web');
import { chains as cofheChains } from '@cofhe/sdk/chains';

const CONTRACTS: Record<number, string> = {
  11155111: '0xdcEB5E9A8736cD43641A7fb6fc57dF9D86C8F6A3',
  421614: '0x54d88A4205CCc5bFEF82c47385ce37719eB6884E',
};

function logStep(s: string) {
  console.log(`\n=== ${s} ===`);
}

function fmtSec(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const contract = CONTRACTS[chainId];
  if (!contract) throw new Error(`No contract for chain ${chainId}`);

  console.log(`Chain:      ${chainId}`);
  console.log(`Signer:     ${deployer.address}`);
  console.log(`Contract:   ${contract}`);

  const voting = await hre.ethers.getContractAt('ConfidentialVoting', contract);

  // ------------------------------------------------------------------
  // Step 1: create a fast-test proposal (60 seconds)
  // ------------------------------------------------------------------
  logStep('1. Creating 60s proposal');
  const t0 = Date.now();
  const txCreate = await voting.createProposal(
    '[E2E] Automated test of the full encrypted flow',
    ['Yes', 'No'],
    60n,
    0,
  );
  const rcptCreate = await txCreate.wait();
  const proposalId = (await voting.proposalCount()) - 1n;
  console.log(`  proposalId=${proposalId}  tx=${rcptCreate?.hash}`);

  // ------------------------------------------------------------------
  // Step 2: build the CoFHE client targeted at our chain
  // ------------------------------------------------------------------
  logStep('2. Initializing CoFHE client');
  const chainsForChainId: Record<number, any> = {
    11155111: (cofheChains as any).sepolia,
    421614: (cofheChains as any).arbSepolia,
    84532: (cofheChains as any).baseSepolia,
  };
  const targetChain = chainsForChainId[chainId];
  if (!targetChain)
    throw new Error(`CoFHE SDK has no chain definition for ${chainId}`);

  const config = createCofheConfig({ supportedChains: [targetChain] });
  const cofhe: CofheClient = createCofheClient(config);

  // The SDK expects a viem-style wallet client. Our hardhat signer plus
  // ethers provider can be wrapped, but the SDK is happy with a minimal
  // adapter. Easiest: use the hardhat plugin's helper if present.
  const cofheMaybe: any = (hre as any).cofhe;
  if (cofheMaybe?.createClientWithBatteries) {
    // On networks with mock batteries this is a one-liner. Doesn't apply
    // on real testnets (hardhat plugin only enables it for hardhat-network),
    // so fall through to manual connect below.
  }

  // Manual connect using the SDK's expected viem clients.
  const { createPublicClient, createWalletClient, http } = await import('viem');
  const { sepolia, arbitrumSepolia } = await import('viem/chains');
  const viemChain =
    chainId === 11155111 ? sepolia : chainId === 421614 ? arbitrumSepolia : null;
  if (!viemChain) throw new Error(`No viem chain for ${chainId}`);

  const rpc =
    chainId === 11155111
      ? process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
      : 'https://sepolia-rollup.arbitrum.io/rpc';

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpc),
  });
  const { privateKeyToAccount } = await import('viem/accounts');
  const pk = process.env.PRIVATE_KEY!;
  const account = privateKeyToAccount(pk.startsWith('0x') ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`));
  const walletClient = createWalletClient({
    account,
    chain: viemChain,
    transport: http(rpc),
  });

  await cofhe.connect(publicClient as any, walletClient as any);
  console.log(`  CoFHE client connected for ${account.address} on chain ${chainId}`);

  // ------------------------------------------------------------------
  // Step 3: encrypt + submit vote
  // ------------------------------------------------------------------
  logStep('3. Encrypting & submitting vote ("Yes" = 0)');
  const tEnc = Date.now();
  const [encChoice] = await cofhe
    .encryptInputs([Encryptable.uint8(0n)])
    .onStep((step, ctx) => {
      if (ctx?.isStart) console.log(`  encrypting: ${step}`);
    })
    .execute();
  console.log(`  encrypted in ${fmtSec(Date.now() - tEnc)}`);

  const txVote = await voting.vote(proposalId, encChoice as any);
  const rcptVote = await txVote.wait();
  console.log(`  vote tx=${rcptVote?.hash}`);

  // ------------------------------------------------------------------
  // Step 4: wait for deadline
  // ------------------------------------------------------------------
  logStep('4. Waiting for proposal deadline');
  const meta = await voting.getProposalMeta(proposalId);
  const deadline = Number(meta.deadline);
  const now = Math.floor(Date.now() / 1000);
  const waitSec = Math.max(0, deadline - now + 5);
  console.log(`  sleeping ${waitSec}s`);
  await new Promise((r) => setTimeout(r, waitSec * 1000));

  // ------------------------------------------------------------------
  // Step 5: open tallies for decryption
  // ------------------------------------------------------------------
  logStep('5. Calling requestDecryption');
  const txReq = await voting.requestDecryption(proposalId);
  const rcptReq = await txReq.wait();
  console.log(`  tx=${rcptReq?.hash}`);

  // ------------------------------------------------------------------
  // Step 6: decrypt each tally via threshold network
  // ------------------------------------------------------------------
  logStep('6. Decrypting tallies via CoFHE Threshold Network');
  const numOptions = 2;
  const plaintexts: bigint[] = [];
  const signatures: string[] = [];
  for (let i = 0; i < numOptions; i++) {
    const tD = Date.now();
    const ctHash = await voting.getEncryptedTally(proposalId, i);
    console.log(`  tally ${i}: ctHash=${ctHash.toString().slice(0, 12)}... requesting decryption...`);
    const { decryptedValue, signature } = await cofhe
      .decryptForTx(ctHash)
      .withoutPermit()
      .execute();
    console.log(
      `  tally ${i} decrypted in ${fmtSec(Date.now() - tD)} -> ${decryptedValue}`,
    );
    plaintexts.push(decryptedValue as bigint);
    signatures.push(signature as string);
  }

  // ------------------------------------------------------------------
  // Step 7: finalize on-chain
  // ------------------------------------------------------------------
  logStep('7. Finalizing on-chain');
  const txFin = await voting.finalizeProposal(
    proposalId,
    plaintexts.map((v) => Number(v)),
    signatures,
  );
  const rcptFin = await txFin.wait();
  console.log(`  tx=${rcptFin?.hash}`);

  const results = await voting.getResults(proposalId);
  console.log(`  results=[${results.map((r: bigint) => Number(r)).join(', ')}]`);

  console.log(`\n✅ Full flow completed in ${fmtSec(Date.now() - t0)}`);
}

main().catch((e) => {
  console.error('\n❌ E2E FAILED:', e);
  process.exit(1);
});
