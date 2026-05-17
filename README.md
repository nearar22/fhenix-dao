# Fhinex — Confidential Voting DAO

A confidential on-chain voting dApp built on **Fhenix CoFHE** — every
ballot is encrypted client-side, tallied **homomorphically** on-chain,
and only the final aggregated result is ever decrypted.

> No one — not the contract owner, not validators, not other voters —
> can see your vote. Yet anyone can verify the final count is correct
> via a Threshold Network signature.

## ✨ Hackathon highlights

| Feature | Why it matters |
|---|---|
| **Quadratic voting on encrypted ballots** | Cost = sum(votes²) computed on ciphertexts — voter never reveals their allocation, but the contract still enforces a 100-credit budget via `FHE.lte` + `FHE.select`. Over-budget ballots are *silently zeroed* (no leak about validity). |
| **Live encrypted leader peek** | After the first vote, anyone can call `peekLeader()` which opens **only** the encrypted argmax index for global decryption — the dApp shows "🟢 Option X is leading" while the actual tallies stay encrypted. |
| **Two voting mechanisms in one contract** | `Standard` (1 voter = 1 vote) and `Quadratic` (100 credits, vote² cost) selectable per proposal. |
| **End-to-end verifiable** | Final results are published with `FHE.publishDecryptResult` — signed by the CoFHE Threshold Network, so the on-chain plaintext can’t be forged. |
| **Polish** | Confetti on finalize, animated busy states, mode badges, real-time budget bar, error-resilient connect button, EIP-6963 wallet detection. |

## Architecture

```
fhinex-nr/
├── contracts/   # Hardhat + FHE.sol (Solidity 0.8.28)
│   ├── contracts/ConfidentialVoting.sol
│   └── test/ConfidentialVoting.test.ts   (6 passing)
└── web/         # Next.js 16 + Wagmi v2 + @cofhe/sdk
```

## How a ballot flows

### Standard mode
1. Owner creates proposal with N options + deadline + `mode = 0`.
2. Voter encrypts an option index (`euint8`) and submits.
3. Contract loops options and adds `FHE.eq(choice, i)` (encrypted 0/1)
   to each tally — nothing decrypted on-chain during voting.
4. After deadline: `requestDecryption` → off-chain `decryptForTx` per
   option → `finalizeProposal(plaintexts, signatures)` publishes
   verifiable results.

### Quadratic mode
1. Owner creates proposal with `mode = 1`. Each voter has 100 credits.
2. Voter chooses an integer allocation per option (slider, 0–10).
3. Each `votes[i]` is encrypted; contract computes
   `totalCost = Σ votes_i²`, `isValid = FHE.lte(totalCost, 100)`,
   then applies `tally[i] += votes[i] * isValid` — invalid budgets are
   silently zeroed without revealing they were over-budget.
4. Same finalize flow as Standard.

### Live leader peek (any time during voting)
1. After every vote the contract recomputes `leadingOption = encrypted argmax(tallies)`.
2. Anyone calls `peekLeader(proposalId)` → only `leadingOption` is
   marked globally decryptable.
3. The dApp decrypts that single ciphertext — result is the **option
   index**, not the counts. Beautiful demonstration of computing on
   encrypted data.

## Quick start

```bash
# 1. Install + test contracts
cd contracts
npm install
npx hardhat test    # 6 passing

# 2. Deploy to Sepolia (set PRIVATE_KEY + SEPOLIA_RPC_URL in .env)
npx hardhat run scripts/deploy.ts --network sepolia

# 3. Run the frontend
cd ../web
npm install
# add NEXT_PUBLIC_CONTRACT_ADDRESS + NEXT_PUBLIC_SEPOLIA_RPC_URL to .env.local
npm run dev
```

## 🎬 5-minute judge walkthrough

The dApp is deployed on **Sepolia testnet**. Two contracts shown
throughout the demo:

- v1 (Standard only): `0x54d88A4205CCc5bFEF82c47385ce37719eB6884E`
- v2 (Standard + Quadratic + Leader peek): `0xdcEB5E9A8736cD43641A7fb6fc57dF9D86C8F6A3`

### Walkthrough

1. **Connect** MetaMask to Sepolia.
2. **Create a Quadratic proposal**: "Allocate the DAO treasury" with
   options *Marketing / R&D / Liquidity / Reserves*, duration 1h.
3. **Vote**: open MetaMask in 2 different accounts and split credits
   asymmetrically (e.g., {7,3,0,0} costs 49+9 = 58 credits — valid).
   Try {10,5,0,0}: 100+25 = 125 → over budget → dApp warns, contract
   would silently zero. Use {9,4,3,0}: 81+16+9 = 106 to demonstrate the
   on-chain gate.
4. **Peek the leader**: click *Reveal leader* — dApp shows the leading
   option name in cyan **without revealing any tally**.
5. **Wait for deadline** (use a 1-min duration for the demo) → click
   *Finalize & reveal results* — confetti, results bars, trophy on
   winning option.

## Tests

```bash
cd contracts && npx hardhat test
```

- `creates a proposal` — schema sanity
- `rejects proposal creation from non-owner`
- `runs a full encrypted vote and finalizes correct tallies` — 3 voters, deadline, decrypt
- `runs a quadratic vote and applies budget gate` — verifies over-budget
  ballots are zeroed (Bob's 9²+5²=106 > 100 → only Alice's votes count)
- `peeks the encrypted leader without revealing tallies` — decrypts
  *only* `leadingOption`, leaves tallies sealed
- `blocks votes after deadline`

## Tech stack

| Layer | Tooling |
|---|---|
| FHE primitives | `@fhenixprotocol/cofhe-contracts@^0.1.3` |
| Contracts | Hardhat + `@cofhe/hardhat-plugin@^0.5.1` |
| SDK | `@cofhe/sdk@^0.5.1` |
| Frontend | Next.js 16 (App Router, webpack), Wagmi v2, viem 2, TailwindCSS |
| UI polish | Lucide icons, canvas-confetti |
| Network | Sepolia testnet (Alchemy RPC) |

## License

MIT
