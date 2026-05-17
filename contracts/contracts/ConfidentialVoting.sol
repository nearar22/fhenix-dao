// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title  ConfidentialVoting
 * @notice A DAO voting contract where each ballot is encrypted client-side
 *         with FHE and tallied homomorphically on-chain. Only the final
 *         per-option tally is decrypted, and only after the deadline.
 *
 *         Privacy guarantees:
 *           - No one can see how a specific address voted.
 *           - Live tallies are encrypted and unreadable.
 *           - Final results are produced by the CoFHE Threshold Network
 *             with a verifiable signature (FHE.publishDecryptResult).
 */
contract ConfidentialVoting {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    /// @notice Two ballot mechanisms are supported per proposal.
    enum VotingMode {
        Standard,    // 1 voter = 1 vote on a single option
        Quadratic    // 1 voter has CREDITS_PER_VOTER, cost = sum(votes_i^2)
    }

    struct Proposal {
        address creator;
        string description;
        string[] options;       // human-readable option labels
        uint64 deadline;        // unix timestamp; voting closes at >=
        VotingMode mode;        // Standard or Quadratic
        bool finalized;         // true after results are published
        bool decryptionRequested; // true after allowGlobal opens tallies
        bool leaderPeeked;      // leader index has been opened for decryption
        uint32[] results;       // plaintext final tallies (filled on finalize)
        euint32[] tallies;      // encrypted running tallies, one per option
        euint8 leadingOption;   // encrypted argmax over tallies (live)
        uint32 voteCount;       // public count of voters (NOT votes)
        mapping(address => bool) hasVoted;
    }

    /// @notice Quadratic voting credit budget per voter (votes^2 must be <= this).
    uint32 public constant CREDITS_PER_VOTER = 100;
    /// @notice Max votes a voter can put on a single option in QV mode.
    uint8 public constant MAX_VOTES_PER_OPTION = 10;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    address public immutable owner;
    uint256 public proposalCount;

    // proposalId => Proposal
    mapping(uint256 => Proposal) private _proposals;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed creator,
        string description,
        uint256 numOptions,
        uint64 deadline,
        VotingMode mode
    );
    event LeaderPeeked(uint256 indexed proposalId);
    event Voted(uint256 indexed proposalId, address indexed voter);
    event DecryptionRequested(uint256 indexed proposalId);
    event ProposalFinalized(uint256 indexed proposalId, uint32[] results);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error NotOwner();
    error InvalidOptions();
    error InvalidDuration();
    error ProposalDoesNotExist();
    error VotingClosed();
    error VotingStillOpen();
    error AlreadyVoted();
    error AlreadyFinalized();
    error LengthMismatch();
    error DecryptionNotRequested();
    error DecryptionAlreadyRequested();
    error WrongMode();
    error NoVotesYet();

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier exists(uint256 proposalId) {
        if (proposalId >= proposalCount) revert ProposalDoesNotExist();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Owner: create a proposal
    // ---------------------------------------------------------------------

    /**
     * @notice Create a new proposal. The encrypted tallies are initialized
     *         to zero (a trivially-encrypted zero) for each option.
     * @param description       Free-form question / motion text.
     * @param options           Human-readable option labels (>= 2, <= 16).
     * @param durationSeconds   How long voting stays open from `block.timestamp`.
     */
    function createProposal(
        string calldata description,
        string[] calldata options,
        uint64 durationSeconds,
        VotingMode mode
    ) external onlyOwner returns (uint256 proposalId) {
        if (options.length < 2 || options.length > 16) revert InvalidOptions();
        if (durationSeconds == 0) revert InvalidDuration();

        proposalId = proposalCount++;
        Proposal storage p = _proposals[proposalId];
        p.creator = msg.sender;
        p.description = description;
        p.deadline = uint64(block.timestamp) + durationSeconds;
        p.mode = mode;

        // copy options (calldata -> storage)
        for (uint256 i = 0; i < options.length; ++i) {
            p.options.push(options[i]);
            // initialize each tally to encrypted zero
            euint32 zero = FHE.asEuint32(0);
            p.tallies.push(zero);
            FHE.allowThis(zero);
        }

        // initialize leadingOption to 0 (encrypted)
        p.leadingOption = FHE.asEuint8(0);
        FHE.allowThis(p.leadingOption);

        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            options.length,
            p.deadline,
            mode
        );
    }

    // ---------------------------------------------------------------------
    // Voter: cast an encrypted ballot
    // ---------------------------------------------------------------------

    /**
     * @notice Cast a vote. The choice is an encrypted option index.
     *         For every option `i`, the contract adds `eq(choice, i)` (an
     *         encrypted 0/1) to that option's running tally. This means
     *         exactly one option's tally increases by one, but neither the
     *         contract nor any observer learns which.
     *
     * @param proposalId  Target proposal.
     * @param encChoice   Encrypted uint8 produced by `@cofhe/sdk`
     *                    (`Encryptable.uint8(optionIndex)`).
     */
    function vote(uint256 proposalId, InEuint8 calldata encChoice)
        external
        exists(proposalId)
    {
        Proposal storage p = _proposals[proposalId];
        if (p.mode != VotingMode.Standard) revert WrongMode();
        if (block.timestamp >= p.deadline) revert VotingClosed();
        if (p.hasVoted[msg.sender]) revert AlreadyVoted();
        p.hasVoted[msg.sender] = true;
        p.voteCount += 1;

        euint8 choice = FHE.asEuint8(encChoice);

        uint256 n = p.options.length;
        for (uint256 i = 0; i < n; ++i) {
            // encrypted boolean: 1 if choice == i else 0
            ebool isMatch = FHE.eq(choice, FHE.asEuint8(uint8(i)));
            // cast bool->uint32 (0 or 1) and add to running tally
            euint32 inc = FHE.asEuint32(isMatch);
            p.tallies[i] = FHE.add(p.tallies[i], inc);
            FHE.allowThis(p.tallies[i]);
        }

        _recomputeLeader(p);
        emit Voted(proposalId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Voter: cast a quadratic ballot
    // ---------------------------------------------------------------------

    /**
     * @notice Cast a quadratic vote. The voter allocates encrypted vote
     *         counts across options; the contract verifies (encrypted) that
     *         sum(votes_i^2) <= CREDITS_PER_VOTER. Invalid budgets do NOT
     *         revert — they silently zero out the votes, preserving privacy
     *         (no observer learns whether the voter overspent).
     *
     * @param proposalId Target proposal (must be in Quadratic mode).
     * @param encVotes   One encrypted uint8 per option, each in [0, MAX_VOTES_PER_OPTION].
     */
    function voteQuadratic(uint256 proposalId, InEuint8[] calldata encVotes)
        external
        exists(proposalId)
    {
        Proposal storage p = _proposals[proposalId];
        if (p.mode != VotingMode.Quadratic) revert WrongMode();
        if (block.timestamp >= p.deadline) revert VotingClosed();
        if (p.hasVoted[msg.sender]) revert AlreadyVoted();
        if (encVotes.length != p.options.length) revert LengthMismatch();
        p.hasVoted[msg.sender] = true;
        p.voteCount += 1;

        uint256 n = p.options.length;

        // Step 1: lift to encrypted uint32, compute squared cost per option,
        // and clamp to MAX_VOTES_PER_OPTION.
        euint32[] memory votes32 = new euint32[](n);
        euint32 totalCost = FHE.asEuint32(0);
        euint32 maxPerOpt = FHE.asEuint32(uint32(MAX_VOTES_PER_OPTION));

        for (uint256 i = 0; i < n; ++i) {
            euint8 v8 = FHE.asEuint8(encVotes[i]);
            euint32 v = FHE.asEuint32(v8);
            // cap at MAX_VOTES_PER_OPTION (encrypted min)
            ebool inRange = FHE.lte(v, maxPerOpt);
            v = FHE.select(inRange, v, FHE.asEuint32(0));
            votes32[i] = v;
            // cost contribution = v * v
            totalCost = FHE.add(totalCost, FHE.mul(v, v));
        }

        // Step 2: validity gate. If sum(v_i^2) > budget, multiplier = 0 (vote ignored).
        ebool isValid = FHE.lte(totalCost, FHE.asEuint32(CREDITS_PER_VOTER));
        euint32 mult = FHE.select(isValid, FHE.asEuint32(1), FHE.asEuint32(0));

        // Step 3: apply (votes_i * mult) to each tally.
        for (uint256 i = 0; i < n; ++i) {
            euint32 inc = FHE.mul(votes32[i], mult);
            p.tallies[i] = FHE.add(p.tallies[i], inc);
            FHE.allowThis(p.tallies[i]);
        }

        _recomputeLeader(p);
        emit Voted(proposalId, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Live encrypted argmax (the "leader" indicator)
    // ---------------------------------------------------------------------

    /// @dev Recompute encrypted argmax and store as p.leadingOption.
    function _recomputeLeader(Proposal storage p) internal {
        uint256 n = p.options.length;
        euint32 bestVal = p.tallies[0];
        euint8 bestIdx = FHE.asEuint8(0);
        for (uint256 i = 1; i < n; ++i) {
            ebool isBetter = FHE.gt(p.tallies[i], bestVal);
            bestVal = FHE.select(isBetter, p.tallies[i], bestVal);
            bestIdx = FHE.select(isBetter, FHE.asEuint8(uint8(i)), bestIdx);
        }
        p.leadingOption = bestIdx;
        FHE.allowThis(p.leadingOption);
    }

    /**
     * @notice Open the encrypted leader index for global decryption WITHOUT
     *         exposing the actual tallies. Anyone can call this once at least
     *         one vote has been cast — the wow-moment is that the dApp can
     *         show "🟢 Option X is currently leading" while the per-option
     *         counts remain encrypted.
     */
    function peekLeader(uint256 proposalId) external exists(proposalId) {
        Proposal storage p = _proposals[proposalId];
        if (p.voteCount == 0) revert NoVotesYet();
        FHE.allowGlobal(p.leadingOption);
        p.leaderPeeked = true;
        emit LeaderPeeked(proposalId);
    }

    function getEncryptedLeader(uint256 proposalId)
        external
        view
        exists(proposalId)
        returns (euint8)
    {
        return _proposals[proposalId].leadingOption;
    }

    // ---------------------------------------------------------------------
    // Finalize: 2-step flow (request decryption → publish results)
    // ---------------------------------------------------------------------

    /**
     * @notice After the deadline, anyone may flip every tally to globally
     *         decryptable. Without this step, the encrypted tallies are
     *         only readable by the contract itself, so no one can produce
     *         a Threshold Network signature for `decryptForTx`.
     *
     *         Calling this is safe ONLY because the deadline has passed —
     *         no further votes can change the tally.
     */
    function requestDecryption(uint256 proposalId)
        external
        exists(proposalId)
    {
        Proposal storage p = _proposals[proposalId];
        if (block.timestamp < p.deadline) revert VotingStillOpen();
        if (p.decryptionRequested) revert DecryptionAlreadyRequested();

        p.decryptionRequested = true;
        uint256 n = p.options.length;
        for (uint256 i = 0; i < n; ++i) {
            FHE.allowGlobal(p.tallies[i]);
        }

        emit DecryptionRequested(proposalId);
    }

    /**
     * @notice After `requestDecryption`, off-chain the caller decrypts each
     *         tally via the CoFHE Threshold Network and submits the
     *         (plaintext, signature) pairs here for verifiable publishing.
     *
     * @param proposalId   Target proposal.
     * @param plaintexts   Final tally values, one per option, in order.
     * @param signatures   Threshold Network signatures, one per option.
     */
    function finalizeProposal(
        uint256 proposalId,
        uint32[] calldata plaintexts,
        bytes[] calldata signatures
    ) external exists(proposalId) {
        Proposal storage p = _proposals[proposalId];
        if (block.timestamp < p.deadline) revert VotingStillOpen();
        if (!p.decryptionRequested) revert DecryptionNotRequested();
        if (p.finalized) revert AlreadyFinalized();
        if (plaintexts.length != p.options.length) revert LengthMismatch();
        if (signatures.length != p.options.length) revert LengthMismatch();

        uint256 n = p.options.length;
        for (uint256 i = 0; i < n; ++i) {
            // verifies the Threshold Network signature for this ciphertext
            FHE.publishDecryptResult(
                p.tallies[i],
                plaintexts[i],
                signatures[i]
            );
            p.results.push(plaintexts[i]);
        }

        p.finalized = true;
        emit ProposalFinalized(proposalId, p.results);
    }

    // ---------------------------------------------------------------------
    // Read helpers
    // ---------------------------------------------------------------------

    function getProposalMeta(uint256 proposalId)
        external
        view
        exists(proposalId)
        returns (
            address creator,
            string memory description,
            string[] memory options,
            uint64 deadline,
            bool finalized,
            bool decryptionRequested,
            VotingMode mode,
            bool leaderPeeked,
            uint32 voteCount
        )
    {
        Proposal storage p = _proposals[proposalId];
        return (
            p.creator,
            p.description,
            p.options,
            p.deadline,
            p.finalized,
            p.decryptionRequested,
            p.mode,
            p.leaderPeeked,
            p.voteCount
        );
    }

    /// @notice Encrypted handle for a single option's running tally.
    function getEncryptedTally(uint256 proposalId, uint256 optionIndex)
        external
        view
        exists(proposalId)
        returns (euint32)
    {
        Proposal storage p = _proposals[proposalId];
        require(optionIndex < p.options.length, "bad option");
        return p.tallies[optionIndex];
    }

    function getResults(uint256 proposalId)
        external
        view
        exists(proposalId)
        returns (uint32[] memory)
    {
        return _proposals[proposalId].results;
    }

    function hasVoted(uint256 proposalId, address voter)
        external
        view
        exists(proposalId)
        returns (bool)
    {
        return _proposals[proposalId].hasVoted[voter];
    }
}
