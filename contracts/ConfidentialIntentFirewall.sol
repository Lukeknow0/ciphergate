// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox, ebool, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title CipherGate Confidential Intent Firewall
/// @notice Stores sensitive intent attributes as Nox encrypted handles and
///         exposes only public audit metadata. Policy evaluation is deliberately
///         separated from value movement: this contract never signs or executes
///         a Safe transaction.
contract ConfidentialIntentFirewall {
    enum PublicDecision { UNKNOWN, PASS, REVIEW, BLOCK }

    struct Intent {
        address submitter;
        address auditorAtSubmission;
        bytes32 auditId;
        bytes32 actionCommitment;
        bytes32 policyHash;
        uint64 policyVersion;
        uint64 createdAt;
        uint64 actionDeadline;
        euint256 amount;
        euint256 riskScore;
        euint256 counterpartyFlags;
        euint256 encryptedDecision;
        PublicDecision publicDecision;
    }

    address public immutable owner;
    address public auditor;
    uint64 public constant policyVersion = 1;
    bytes32 public constant policyHash = keccak256(
        "CipherGate.Policy.v1|BLOCK:amount>10000||risk>80||flags>0|REVIEW:risk>50|PASS:otherwise"
    );
    uint256 public constant AMOUNT_BLOCK_THRESHOLD = 10_000;
    uint256 public constant RISK_BLOCK_THRESHOLD = 80;
    uint256 public constant RISK_REVIEW_THRESHOLD = 50;
    bytes32 public constant ACTION_COMMITMENT_DOMAIN = keccak256("CipherGate.SafeAction.v1");
    uint256 public nextIntentId;
    uint64 public constant MAX_ACTION_LIFETIME = 7 days;
    mapping(uint256 => Intent) private intents;
    mapping(address => mapping(bytes32 => bool)) public usedAuditIds;
    mapping(bytes32 => bool) public usedInputBundles;
    // Replay protection is submitter-scoped. A global marker would let an
    // unrelated account copy a pending commitment from the mempool and consume
    // it before the legitimate submitter's transaction is mined.
    mapping(address => mapping(bytes32 => bool)) public usedActionCommitments;

    error NotOwner();
    error NotOwnerOrAuditor();
    error InvalidAuditor();
    error IntentMissing();
    error DecisionAlreadySet();
    error DecisionAlreadyEvaluated();
    error DecisionNotEvaluated();
    error DecisionNotPubliclyDecryptable();
    error InvalidDecisionCode();
    error InvalidAuditId();
    error AuditIdAlreadyUsed();
    error InvalidActionCommitment();
    error ActionCommitmentAlreadyUsed();
    error InvalidActionDeadline();
    error InputBundleAlreadyUsed();

    event IntentSubmitted(
        uint256 indexed intentId,
        bytes32 indexed auditId,
        address indexed submitter,
        bytes32 actionCommitment,
        uint64 actionDeadline,
        uint64 policyVersion,
        bytes32 policyHash
    );
    event DecisionPublished(uint256 indexed intentId, PublicDecision decision);
    event AuditorUpdated(address indexed auditor);
    constructor() {
        owner = msg.sender;
        auditor = msg.sender;
    }

    function setAuditor(address newAuditor) external {
        if (msg.sender != owner) revert NotOwner();
        if (newAuditor == address(0)) revert InvalidAuditor();
        auditor = newAuditor;
        emit AuditorUpdated(newAuditor);
    }

    function submitIntent(
        externalEuint256 amountHandle,
        bytes calldata amountProof,
        externalEuint256 riskScoreHandle,
        bytes calldata riskScoreProof,
        externalEuint256 counterpartyFlagsHandle,
        bytes calldata counterpartyFlagsProof,
        bytes32 auditId,
        bytes32 actionCommitment,
        uint64 actionDeadline
    ) external returns (uint256 intentId) {
        if (auditId == bytes32(0)) revert InvalidAuditId();
        if (usedAuditIds[msg.sender][auditId]) revert AuditIdAlreadyUsed();
        if (actionCommitment == bytes32(0)) revert InvalidActionCommitment();
        if (usedActionCommitments[msg.sender][actionCommitment]) {
            revert ActionCommitmentAlreadyUsed();
        }
        if (
            actionDeadline <= block.timestamp ||
            actionDeadline > block.timestamp + MAX_ACTION_LIFETIME
        ) revert InvalidActionDeadline();

        euint256 amount = Nox.fromExternal(amountHandle, amountProof);
        euint256 riskScore = Nox.fromExternal(riskScoreHandle, riskScoreProof);
        euint256 counterpartyFlags = Nox.fromExternal(counterpartyFlagsHandle, counterpartyFlagsProof);

        bytes32 inputBundle = keccak256(
            abi.encode(
                msg.sender,
                euint256.unwrap(amount),
                euint256.unwrap(riskScore),
                euint256.unwrap(counterpartyFlags)
            )
        );
        if (usedInputBundles[inputBundle]) revert InputBundleAlreadyUsed();
        usedAuditIds[msg.sender][auditId] = true;
        usedInputBundles[inputBundle] = true;
        usedActionCommitments[msg.sender][actionCommitment] = true;

        intentId = nextIntentId++;
        Intent storage intent = intents[intentId];
        intent.submitter = msg.sender;
        intent.auditorAtSubmission = auditor;
        intent.auditId = auditId;
        intent.actionCommitment = actionCommitment;
        intent.policyHash = policyHash;
        intent.policyVersion = policyVersion;
        intent.createdAt = uint64(block.timestamp);
        intent.actionDeadline = actionDeadline;
        intent.amount = amount;
        intent.riskScore = riskScore;
        intent.counterpartyFlags = counterpartyFlags;

        Nox.allowThis(amount);
        Nox.allowThis(riskScore);
        Nox.allowThis(counterpartyFlags);
        Nox.allow(amount, owner);
        Nox.allow(riskScore, owner);
        Nox.allow(counterpartyFlags, owner);
        if (auditor != address(0) && auditor != owner) {
            Nox.allow(amount, auditor);
            Nox.allow(riskScore, auditor);
            Nox.allow(counterpartyFlags, auditor);
        }

        emit IntentSubmitted(
            intentId,
            auditId,
            msg.sender,
            actionCommitment,
            actionDeadline,
            policyVersion,
            policyHash
        );
    }

    /// @notice Publishes the normalized decision only after NoxCompute verifies
    ///         the public-decryption proof for this intent's encrypted result.
    /// @dev Anyone may relay a valid proof; the proof, rather than the relayer's
    ///      identity, binds the public decision to the encrypted computation.
    function publishDecision(uint256 intentId, bytes calldata decryptionProof) external {
        Intent storage intent = intents[intentId];
        if (intent.submitter == address(0)) revert IntentMissing();
        if (intent.publicDecision != PublicDecision.UNKNOWN) revert DecisionAlreadySet();
        if (!Nox.isInitialized(intent.encryptedDecision)) revert DecisionNotEvaluated();
        if (!Nox.isPubliclyDecryptable(intent.encryptedDecision)) {
            revert DecisionNotPubliclyDecryptable();
        }

        uint256 decisionCode = Nox.publicDecrypt(intent.encryptedDecision, decryptionProof);
        if (decisionCode < uint256(PublicDecision.PASS) || decisionCode > uint256(PublicDecision.BLOCK)) {
            revert InvalidDecisionCode();
        }
        PublicDecision decision = PublicDecision(decisionCode);
        intent.publicDecision = decision;
        emit DecisionPublished(intentId, decision);
    }

    /// @notice Evaluates the first deterministic policy entirely on encrypted
    /// values. Codes are 1=PASS, 2=REVIEW, 3=BLOCK; only that normalized
    /// result is marked for public decryption after the encrypted computation.
    function evaluateEncryptedPolicy(uint256 intentId) external {
        if (msg.sender != owner && msg.sender != auditor) revert NotOwnerOrAuditor();
        Intent storage intent = intents[intentId];
        if (intent.submitter == address(0)) revert IntentMissing();
        if (intent.publicDecision != PublicDecision.UNKNOWN) revert DecisionAlreadySet();
        if (Nox.isInitialized(intent.encryptedDecision)) revert DecisionAlreadyEvaluated();

        euint256 passCode = Nox.toEuint256(1);
        euint256 reviewCode = Nox.toEuint256(2);
        euint256 blockCode = Nox.toEuint256(3);
        ebool highAmount = Nox.gt(intent.amount, Nox.toEuint256(AMOUNT_BLOCK_THRESHOLD));
        ebool highRisk = Nox.gt(intent.riskScore, Nox.toEuint256(RISK_BLOCK_THRESHOLD));
        ebool flaggedCounterparty = Nox.gt(intent.counterpartyFlags, Nox.toEuint256(0));
        ebool reviewRisk = Nox.gt(intent.riskScore, Nox.toEuint256(RISK_REVIEW_THRESHOLD));

        euint256 code = Nox.select(
            highAmount,
            blockCode,
            Nox.select(
                highRisk,
                blockCode,
                Nox.select(flaggedCounterparty, blockCode, Nox.select(reviewRisk, reviewCode, passCode))
            )
        );
        intent.encryptedDecision = code;
        Nox.allowThis(code);
        Nox.allow(code, owner);
        if (auditor != address(0) && auditor != owner) Nox.allow(code, auditor);
        Nox.allowPublicDecryption(code);
    }

    function getIntent(uint256 intentId) external view returns (Intent memory) {
        if (intents[intentId].submitter == address(0)) revert IntentMissing();
        return intents[intentId];
    }

    /// @notice Canonical commitment shared by the browser adapter and any
    ///         future Safe Guard/Module integration.
    /// @dev The verifying-contract address prevents evidence from one
    ///      CipherGate deployment being replayed as evidence from another.
    function computeActionCommitment(
        address safe,
        address to,
        uint256 value,
        bytes32 dataHash,
        uint256 safeNonce,
        uint64 actionDeadline
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                ACTION_COMMITMENT_DOMAIN,
                block.chainid,
                address(this),
                safe,
                to,
                value,
                dataHash,
                safeNonce,
                actionDeadline
            )
        );
    }

    /// @notice Returns whether an exact, committed Safe action may be exported.
    /// @dev The commitment must include chain, this CipherGate deployment, Safe,
    ///      destination, value, calldata hash, Safe nonce, and deadline. This
    ///      view is advisory unless a Safe Guard or Module independently
    ///      consumes the same commitment.
    function safeProposalAllowed(
        uint256 intentId,
        bytes32 actionCommitment
    ) external view returns (bool) {
        Intent storage intent = intents[intentId];
        if (intent.submitter == address(0)) revert IntentMissing();
        return
            intent.publicDecision == PublicDecision.PASS &&
            intent.actionCommitment == actionCommitment &&
            block.timestamp <= intent.actionDeadline;
    }
}
