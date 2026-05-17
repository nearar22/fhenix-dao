import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying ConfidentialVoting with:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Balance:', hre.ethers.formatEther(balance), 'ETH');

  const Factory = await hre.ethers.getContractFactory('ConfidentialVoting');
  const voting = await Factory.deploy();
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log('ConfidentialVoting deployed to:', address);
  console.log('\nAdd this to web/.env.local:');
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
