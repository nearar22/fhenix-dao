import hre from 'hardhat';
import { Encryptable, FheTypes, type CofheClient } from '@cofhe/sdk';
import { expect } from 'chai';

describe('ConfidentialVoting', () => {
  async function deploy() {
    const [owner, alice, bob, carol] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory('ConfidentialVoting');
    const voting = await Factory.connect(owner).deploy();
    await voting.waitForDeployment();

    const ownerClient: CofheClient =
      await hre.cofhe.createClientWithBatteries(owner);
    const aliceClient: CofheClient =
      await hre.cofhe.createClientWithBatteries(alice);
    const bobClient: CofheClient =
      await hre.cofhe.createClientWithBatteries(bob);
    const carolClient: CofheClient =
      await hre.cofhe.createClientWithBatteries(carol);

    return {
      voting,
      owner,
      alice,
      bob,
      carol,
      ownerClient,
      aliceClient,
      bobClient,
      carolClient,
    };
  }

  it('creates a proposal', async () => {
    const { voting, owner } = await deploy();
    const tx = await voting
      .connect(owner)
      .createProposal('Pizza for the team?', ['Yes', 'No', 'Abstain'], 3600, 0);
    await tx.wait();

    expect(await voting.proposalCount()).to.equal(1n);

    const meta = await voting.getProposalMeta(0);
    expect(meta.description).to.equal('Pizza for the team?');
    expect(meta.options.length).to.equal(3);
    expect(meta.finalized).to.equal(false);
  });

  it('rejects proposal creation from non-owner', async () => {
    const { voting, alice } = await deploy();
    await expect(
      voting.connect(alice).createProposal('Should fail', ['A', 'B'], 60, 0),
    ).to.be.revertedWithCustomError(voting, 'NotOwner');
  });

  it('runs a full encrypted vote and finalizes correct tallies', async () => {
    const {
      voting,
      owner,
      alice,
      bob,
      carol,
      ownerClient,
      aliceClient,
      bobClient,
      carolClient,
    } = await deploy();

    // Owner creates proposal: Yes / No / Abstain
    await (
      await voting
        .connect(owner)
        .createProposal('Pizza?', ['Yes', 'No', 'Abstain'], 60, 0)
    ).wait();

    // Alice votes Yes (0)
    const [encA] = await aliceClient
      .encryptInputs([Encryptable.uint8(0n)])
      .execute();
    await (await voting.connect(alice).vote(0, encA)).wait();

    // Bob votes No (1)
    const [encB] = await bobClient
      .encryptInputs([Encryptable.uint8(1n)])
      .execute();
    await (await voting.connect(bob).vote(0, encB)).wait();

    // Carol votes Yes (0)
    const [encC] = await carolClient
      .encryptInputs([Encryptable.uint8(0n)])
      .execute();
    await (await voting.connect(carol).vote(0, encC)).wait();

    expect(await voting.hasVoted(0, alice.address)).to.equal(true);

    // Cannot vote twice
    const [encDup] = await aliceClient
      .encryptInputs([Encryptable.uint8(2n)])
      .execute();
    await expect(
      voting.connect(alice).vote(0, encDup),
    ).to.be.revertedWithCustomError(voting, 'AlreadyVoted');

    // Cannot finalize before deadline
    await expect(
      voting.finalizeProposal(0, [0, 0, 0], ['0x', '0x', '0x']),
    ).to.be.revertedWithCustomError(voting, 'VotingStillOpen');

    // Fast-forward past deadline
    await hre.network.provider.send('evm_increaseTime', [120]);
    await hre.network.provider.send('evm_mine');

    // Open tallies for global decryption
    await (await voting.requestDecryption(0)).wait();

    // Decrypt each tally for on-chain publishing
    const numOptions = 3;
    const plaintexts: bigint[] = [];
    const signatures: string[] = [];
    for (let i = 0; i < numOptions; ++i) {
      const ctHash = await voting.getEncryptedTally(0, i);
      const { decryptedValue, signature } = await ownerClient
        .decryptForTx(ctHash)
        .withoutPermit()
        .execute();
      plaintexts.push(decryptedValue as bigint);
      signatures.push(signature as string);
    }

    // Verify off-chain: 2 Yes, 1 No, 0 Abstain
    expect(plaintexts).to.deep.equal([2n, 1n, 0n]);

    await (
      await voting.finalizeProposal(
        0,
        plaintexts.map((v) => Number(v)),
        signatures,
      )
    ).wait();

    const results = await voting.getResults(0);
    expect(results.map((r: bigint) => Number(r))).to.deep.equal([2, 1, 0]);

    // Cannot finalize twice
    await expect(
      voting.finalizeProposal(
        0,
        plaintexts.map((v) => Number(v)),
        signatures,
      ),
    ).to.be.revertedWithCustomError(voting, 'AlreadyFinalized');
  });

  it('runs a quadratic vote and applies budget gate', async () => {
    const { voting, owner, alice, bob, ownerClient, aliceClient, bobClient } =
      await deploy();

    // 3 options, Quadratic mode (=1)
    await (
      await voting
        .connect(owner)
        .createProposal('Fund which initiative?', ['A', 'B', 'C'], 60, 1)
    ).wait();

    // Alice: 5 votes on A -> 25 credits, 5 on B -> 25, 0 on C. Total=50 (valid)
    const aliceVotes = await aliceClient
      .encryptInputs([
        Encryptable.uint8(5n),
        Encryptable.uint8(5n),
        Encryptable.uint8(0n),
      ])
      .execute();
    await (await voting.connect(alice).voteQuadratic(0, aliceVotes)).wait();

    // Bob tries 9 votes on A -> 81 credits, 5 on B -> 25 -> total 106 > 100 (INVALID, must zero)
    const bobVotes = await bobClient
      .encryptInputs([
        Encryptable.uint8(9n),
        Encryptable.uint8(5n),
        Encryptable.uint8(0n),
      ])
      .execute();
    await (await voting.connect(bob).voteQuadratic(0, bobVotes)).wait();

    // Wrong-mode call must revert
    const [encStd] = await aliceClient
      .encryptInputs([Encryptable.uint8(0n)])
      .execute();
    await expect(
      voting.connect(alice).vote(0, encStd),
    ).to.be.revertedWithCustomError(voting, 'WrongMode');

    // Fast-forward + open + decrypt tallies
    await hre.network.provider.send('evm_increaseTime', [120]);
    await hre.network.provider.send('evm_mine');
    await (await voting.requestDecryption(0)).wait();

    const tallies: bigint[] = [];
    for (let i = 0; i < 3; i++) {
      const ct = await voting.getEncryptedTally(0, i);
      const { decryptedValue } = await ownerClient
        .decryptForTx(ct)
        .withoutPermit()
        .execute();
      tallies.push(decryptedValue as bigint);
    }
    // Only Alice's votes count: A=5, B=5, C=0. Bob's invalid budget => zeroed.
    expect(tallies).to.deep.equal([5n, 5n, 0n]);
  });

  it('peeks the encrypted leader without revealing tallies', async () => {
    const { voting, owner, alice, bob, ownerClient, aliceClient, bobClient } =
      await deploy();
    await (
      await voting
        .connect(owner)
        .createProposal('Leader test', ['Red', 'Green', 'Blue'], 600, 0)
    ).wait();

    // Two votes for Green (1)
    for (const [voter, client] of [
      [alice, aliceClient],
      [bob, bobClient],
    ] as const) {
      const [enc] = await client
        .encryptInputs([Encryptable.uint8(1n)])
        .execute();
      await (await voting.connect(voter).vote(0, enc)).wait();
    }

    await (await voting.peekLeader(0)).wait();

    const meta = await voting.getProposalMeta(0);
    expect(meta.leaderPeeked).to.equal(true);
    expect(meta.voteCount).to.equal(2n);

    const leaderCt = await voting.getEncryptedLeader(0);
    const { decryptedValue } = await ownerClient
      .decryptForTx(leaderCt)
      .withoutPermit()
      .execute();
    expect(decryptedValue).to.equal(1n); // Green
  });

  it('blocks votes after deadline', async () => {
    const { voting, owner, alice, aliceClient } = await deploy();
    await (
      await voting.connect(owner).createProposal('Q?', ['A', 'B'], 60, 0)
    ).wait();

    await hre.network.provider.send('evm_increaseTime', [120]);
    await hre.network.provider.send('evm_mine');

    const [enc] = await aliceClient
      .encryptInputs([Encryptable.uint8(0n)])
      .execute();
    await expect(
      voting.connect(alice).vote(0, enc),
    ).to.be.revertedWithCustomError(voting, 'VotingClosed');
  });
});
