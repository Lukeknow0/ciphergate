import {
  createCipherGateSession,
  decisionFromCode,
  decryptIntentDecision,
  encryptIntentFields,
  evaluateEncryptedIntent,
  isSafeProposalAllowed,
  publishIntentDecision,
  readIntent,
  SEPOLIA_CHAIN_ID,
  submitEncryptedIntent,
} from "./noxAdapter.js";
import {
  buildActionCommitment,
  buildSafeProposal,
  normalizeSafeAction,
  validateActionDeadline,
  verifySafeContractNonce,
} from "./safeProposal.js";

const contractAddress = process.env.CIPHERGATE_CONTRACT_ADDRESS;
const ACTION_INPUT_IDS = [
  "safeAddress",
  "destination",
  "safeValue",
  "safeData",
  "safeNonce",
  "actionDeadline",
];
const CONFIDENTIAL_INPUT_IDS = ["amount", "risk", "flags", "audit"];

const state = {
  epoch: 0,
  operation: null,
  operationLabel: "",
  needsReconnect: false,
  session: null,
  intentId: null,
  evaluated: false,
  published: false,
  gateReadPending: false,
  decision: "UNKNOWN",
  decryptionProof: null,
  proposalAllowed: false,
  submission: null,
  action: null,
  actionCommitment: null,
  actionLocked: false,
  publishHash: null,
};

class StaleOperationError extends Error {}

const $ = (id) => document.getElementById(id);
const setStatus = (message, isError = false) => {
  $("status").textContent = message;
  $("status").classList.toggle("error", isError);
};
const short = (value) => `${value.slice(0, 6)}…${value.slice(-4)}`;

function createOpaqueAuditId() {
  if (globalThis.crypto?.randomUUID) {
    return `cg-${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
  }
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return `cg-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return "";
}

function populateOpaqueAuditId({ replace = false } = {}) {
  if (!replace && $("audit").value) return;
  const auditId = createOpaqueAuditId();
  if (auditId) $("audit").value = auditId;
}

function showDecision(decision) {
  state.decision = decision;
  const badge = $("decisionBadge");
  badge.textContent = decision;
  badge.className = `badge ${decision.toLowerCase()}`;
}

function resetIntentState() {
  state.intentId = null;
  state.evaluated = false;
  state.published = false;
  state.gateReadPending = false;
  state.decryptionProof = null;
  state.proposalAllowed = false;
  state.submission = null;
  state.action = null;
  state.actionCommitment = null;
  state.actionLocked = false;
  state.publishHash = null;
  showDecision("UNKNOWN");
  $("intentMeta").textContent = "No intent submitted.";
  $("actionMeta").textContent = "No Safe action committed.";
  $("policy").textContent = "Policy: —";
  $("proposalState").textContent =
    "Safe proposal construction is locked until an on-chain PASS decision for this exact commitment.";
}

function renderControls() {
  const busy = state.operation !== null;
  const connected = state.session !== null;
  const hasIntent = state.intentId !== null;

  $("connect").disabled = busy || !contractAddress;
  $("connect").textContent =
    state.operation === "connect"
      ? state.operationLabel
      : connected
        ? short(state.session.account)
        : state.needsReconnect
          ? "Reconnect wallet"
          : "Connect wallet";

  $("submit").disabled = !connected || busy || hasIntent;
  $("submit").textContent =
    state.operation === "submit" ? state.operationLabel : "Encrypt & submit committed intent";

  $("evaluate").disabled =
    !connected || busy || !hasIntent || state.evaluated || !state.session.canEvaluate;
  $("evaluate").textContent =
    state.operation === "evaluate" ? state.operationLabel : "Evaluate encrypted policy";

  $("decrypt").disabled =
    !connected ||
    busy ||
    !hasIntent ||
    !state.evaluated ||
    Boolean(state.decryptionProof) ||
    state.published;
  $("decrypt").textContent =
    state.operation === "decrypt" ? state.operationLabel : "Fetch decision proof";

  const canPublish = Boolean(state.decryptionProof) && !state.published;
  const canRefresh = state.published && state.gateReadPending;
  $("publish").disabled = !connected || busy || (!canPublish && !canRefresh);
  $("publish").textContent =
    state.operation === "publish"
      ? state.operationLabel
      : canRefresh
        ? "Refresh on-chain gate"
        : "Publish normalized decision";

  $("export").disabled =
    !connected || busy || !state.proposalAllowed || state.decision !== "PASS";
  $("export").textContent =
    state.operation === "export" ? state.operationLabel : "Export checksummed Safe batch";

  for (const id of ACTION_INPUT_IDS) $(id).disabled = busy || state.actionLocked;
  for (const id of CONFIDENTIAL_INPUT_IDS) $(id).disabled = busy || hasIntent;
}

function beginOperation(name, label) {
  if (state.operation) throw new Error("Another wallet operation is already in progress.");
  if (name !== "connect" && !state.session) throw new Error("Reconnect the wallet first.");
  const token = { epoch: state.epoch, session: state.session };
  state.operation = name;
  state.operationLabel = label;
  renderControls();
  return token;
}

function isCurrent(token) {
  return token.epoch === state.epoch && token.session === state.session;
}

function assertCurrent(token) {
  if (!isCurrent(token)) throw new StaleOperationError("Wallet state changed during the operation.");
}

async function tracked(promise, token) {
  try {
    const result = await promise;
    assertCurrent(token);
    return result;
  } catch (error) {
    if (!isCurrent(token)) throw new StaleOperationError("Wallet state changed during the operation.");
    throw error;
  }
}

function setOperationLabel(token, label) {
  assertCurrent(token);
  state.operationLabel = label;
  renderControls();
}

function finishOperation(token) {
  if (!isCurrent(token)) return;
  state.operation = null;
  state.operationLabel = "";
  renderControls();
}

function resetForWalletChange() {
  // Switching to Sepolia and selecting an account are expected during connect;
  // createCipherGateSession returns the authoritative final account and chain.
  if (state.operation === "connect") return;
  state.epoch += 1;
  state.operation = null;
  state.operationLabel = "";
  state.session = null;
  state.needsReconnect = true;
  resetIntentState();
  renderControls();
  setStatus("Wallet account or network changed. Reconnect before continuing.", true);
}

function readActionFromUi() {
  return normalizeSafeAction({
    chainId: SEPOLIA_CHAIN_ID,
    verifyingContract: contractAddress,
    safeAddress: $("safeAddress").value,
    to: $("destination").value,
    value: $("safeValue").value,
    data: $("safeData").value,
    safeNonce: $("safeNonce").value,
    deadline: $("actionDeadline").value,
  });
}

function assertCommittedAction(intent) {
  if (intent.actionCommitment.toLowerCase() !== state.actionCommitment.toLowerCase()) {
    throw new Error("On-chain intent commitment does not match the locked Safe action.");
  }
  if (BigInt(intent.actionDeadline) !== BigInt(state.action.deadline)) {
    throw new Error("On-chain intent deadline does not match the locked Safe action.");
  }
}

function updateProposalState() {
  if (state.gateReadPending) {
    $("proposalState").textContent =
      "Decision publication is confirmed, but the exact-action gate still needs an RPC refresh.";
  } else if (state.proposalAllowed) {
    $("proposalState").textContent =
      "PASS and the exact Safe-action commitment are confirmed on-chain. This adapter may export an unsigned proposal for review.";
  } else if (state.published) {
    $("proposalState").textContent =
      `${state.decision} is confirmed on-chain. Safe proposal construction remains blocked.`;
  } else if (state.actionLocked) {
    $("proposalState").textContent =
      "The Safe action is committed, but a proof-verified on-chain PASS is still required.";
  }
}

async function refreshOnchainState(token) {
  const publicationWasObserved = state.published || Boolean(state.publishHash);
  state.gateReadPending = publicationWasObserved;
  state.proposalAllowed = false;
  renderControls();

  const block = await tracked(
    state.session.publicClient.getBlock({ blockTag: "latest" }),
    token,
  );
  const intent = await tracked(
    readIntent(state.session, state.intentId, { blockNumber: block.number }),
    token,
  );
  assertCommittedAction(intent);
  state.evaluated = intent.encryptedDecision !== `0x${"0".repeat(64)}`;
  const publicDecision = Number(intent.publicDecision);
  if (publicDecision === 0) {
    if (publicationWasObserved) {
      state.published = true;
      state.gateReadPending = true;
      updateProposalState();
      throw new Error("The RPC has not indexed the confirmed publication yet.");
    }
    state.published = false;
    state.gateReadPending = false;
    updateProposalState();
    return false;
  }

  state.published = true;
  state.gateReadPending = true;
  showDecision(decisionFromCode(publicDecision));
  renderControls();
  const allowed = await tracked(
    isSafeProposalAllowed(
      state.session,
      state.intentId,
      state.actionCommitment,
      { blockNumber: block.number },
    ),
    token,
  );
  state.proposalAllowed = allowed;
  if (
    state.decision === "PASS" &&
    !allowed &&
    BigInt(block.timestamp) <= BigInt(intent.actionDeadline)
  ) {
    state.gateReadPending = true;
    updateProposalState();
    renderControls();
    throw new Error("Pinned RPC reads disagree about the exact-action PASS gate.");
  }
  state.gateReadPending = false;
  updateProposalState();
  return allowed;
}

async function connect() {
  state.epoch += 1;
  state.session = null;
  state.needsReconnect = false;
  resetIntentState();
  const token = beginOperation("connect", "Connecting…");
  try {
    const session = await tracked(
      createCipherGateSession({ ethereum: window.ethereum, contractAddress }),
      token,
    );
    state.session = session;
    token.session = session;
    state.needsReconnect = false;
    const role = session.canEvaluate ? "owner/auditor" : "submitter";
    setStatus(
      `Connected to Sepolia as ${role}. Confidential values go to the trusted Nox Gateway over TLS; only handles and proofs go on-chain.`,
    );
  } finally {
    finishOperation(token);
  }
}

async function submit() {
  const token = beginOperation("submit", "Validating commitment…");
  try {
    const action = readActionFromUi();
    const submissionBlock = await tracked(
      state.session.publicClient.getBlock({ blockTag: "latest" }),
      token,
    );
    validateActionDeadline(action.deadline, { nowSeconds: submissionBlock.timestamp });
    setOperationLabel(token, "Checking Safe nonce…");
    await tracked(verifySafeContractNonce(state.session.publicClient, action), token);
    const actionCommitment = buildActionCommitment(action);
    state.decryptionProof = null;
    state.proposalAllowed = false;
    state.published = false;
    state.gateReadPending = false;
    showDecision("UNKNOWN");
    updateProposalState();

    const fields = {
      amount: $("amount").value,
      riskScore: $("risk").value,
      counterpartyFlags: $("flags").value,
    };
    const auditId = $("audit").value;
    setOperationLabel(token, "Encrypting…");
    setStatus("Requesting three encrypted handles from the official Nox Gateway…");
    const encrypted = await tracked(
      encryptIntentFields(
        state.session.handleClient,
        state.session.contractAddress,
        fields,
      ),
      token,
    );

    setOperationLabel(token, "Confirm in wallet…");
    setStatus("Handles and the Safe-action commitment are ready. Confirm submitIntent.");
    const submission = await tracked(
      submitEncryptedIntent(state.session, encrypted, auditId, {
        actionCommitment,
        actionDeadline: action.deadline,
      }),
      token,
    );

    state.submission = submission;
    state.intentId = submission.intentId;
    state.action = Object.freeze({ ...action });
    state.actionCommitment = actionCommitment;
    state.actionLocked = true;
    state.evaluated = false;
    for (const id of ["amount", "risk", "flags"]) $(id).value = "";
    populateOpaqueAuditId({ replace: true });
    $("intentMeta").textContent =
      `Intent #${state.intentId} · policy v${submission.policyVersion} · tx ${short(submission.hash)}`;
    $("actionMeta").textContent =
      `Locked commitment ${short(actionCommitment)} · Safe nonce ${action.safeNonce} · deadline ${action.deadline}`;
    $("policy").textContent = `Policy: v${submission.policyVersion}`;
    setStatus(
      state.session.canEvaluate
        ? "Encrypted intent confirmed. The committed Safe fields are now locked; evaluate the policy next."
        : "Encrypted intent confirmed. The committed Safe fields are locked; the owner or auditor must evaluate it.",
    );
  } finally {
    finishOperation(token);
  }
}

async function evaluate() {
  const token = beginOperation("evaluate", "Confirm in wallet…");
  try {
    state.decryptionProof = null;
    state.proposalAllowed = false;
    state.published = false;
    state.gateReadPending = false;
    showDecision("UNKNOWN");
    renderControls();
    setStatus("Confirm one-time encrypted policy evaluation in your wallet.");
    let result;
    try {
      result = await tracked(
        evaluateEncryptedIntent(state.session, state.intentId),
        token,
      );
    } catch (error) {
      try {
        const block = await tracked(
          state.session.publicClient.getBlock({ blockTag: "latest" }),
          token,
        );
        const intent = await tracked(
          readIntent(state.session, state.intentId, { blockNumber: block.number }),
          token,
        );
        assertCommittedAction(intent);
        if (intent.encryptedDecision !== `0x${"0".repeat(64)}`) {
          state.evaluated = true;
          if (Number(intent.publicDecision) !== 0) {
            state.published = true;
            state.gateReadPending = true;
            showDecision(decisionFromCode(intent.publicDecision));
            try {
              await refreshOnchainState(token);
            } catch (refreshError) {
              if (refreshError instanceof StaleOperationError) throw refreshError;
            }
            setStatus(
              "The intent was already evaluated and published; its on-chain state was recovered.",
            );
          } else {
            setStatus("The intent was already evaluated; fetch its decision proof next.");
          }
          return;
        }
      } catch (recoveryError) {
        if (recoveryError instanceof StaleOperationError) throw recoveryError;
      }
      throw error;
    }
    state.evaluated = true;
    setStatus(
      `Evaluation confirmed in ${short(result.hash)}. Fetch the decision when the Nox runner is ready.`,
    );
  } finally {
    finishOperation(token);
  }
}

async function decrypt() {
  const token = beginOperation("decrypt", "Fetching proof…");
  try {
    setStatus("Fetching the publicly decryptable normalized result and its Nox proof…");
    const result = await tracked(
      decryptIntentDecision(state.session, state.intentId),
      token,
    );
    if (result.actionCommitment.toLowerCase() !== state.actionCommitment.toLowerCase()) {
      throw new Error("Decrypted decision belongs to a different Safe-action commitment.");
    }
    if (BigInt(result.actionDeadline) !== BigInt(state.action.deadline)) {
      throw new Error("Decrypted decision belongs to a different action deadline.");
    }
    state.evaluated = true;
    state.published = state.published || result.publicDecision !== 0;
    state.decryptionProof = state.published ? null : result.decryptionProof;
    state.gateReadPending = state.published;
    showDecision(result.decision);
    $("policy").textContent = `Policy: v${result.policyVersion}`;

    if (state.published) {
      try {
        await refreshOnchainState(token);
        setStatus(
          `The ${state.decision} decision was already published; the exact-action gate has been refreshed.`,
        );
      } catch (error) {
        if (error instanceof StaleOperationError) throw error;
        state.gateReadPending = true;
        updateProposalState();
        setStatus(
          `The decision is published, but the gate refresh failed: ${error?.shortMessage || error?.message || String(error)}`,
          true,
        );
      }
    } else {
      setStatus(
        `Public decision proof returned ${result.decision}. Confidential attributes remain encrypted.`,
      );
    }
  } finally {
    finishOperation(token);
  }
}

async function publish() {
  const refreshing = state.published && state.gateReadPending;
  const token = beginOperation(
    "publish",
    refreshing ? "Refreshing gate…" : "Confirm in wallet…",
  );
  try {
    if (refreshing) {
      await refreshOnchainState(token);
      setStatus("On-chain decision and exact-action gate refreshed.");
      return;
    }

    setStatus(`Confirm proof-verified publication of the normalized ${state.decision} decision.`);
    let result;
    try {
      result = await tracked(
        publishIntentDecision(
          state.session,
          state.intentId,
          state.decryptionProof,
        ),
        token,
      );
    } catch (error) {
      try {
        await refreshOnchainState(token);
      } catch (recoveryError) {
        if (recoveryError instanceof StaleOperationError) throw recoveryError;
      }
      if (state.published) {
        state.decryptionProof = null;
        updateProposalState();
        setStatus(
          state.gateReadPending
            ? "The decision was already published by another relayer. Refresh the exact-action gate."
            : "The decision was already published; on-chain state was recovered.",
        );
        return;
      }
      throw error;
    }

    // The transaction receipt is already final at this point. Record that fact
    // before the secondary RPC reads so a transient read failure is recoverable.
    state.published = true;
    state.gateReadPending = true;
    state.publishHash = result.hash;
    state.decryptionProof = null;
    updateProposalState();

    try {
      await refreshOnchainState(token);
      setStatus(`Decision publication confirmed in ${short(result.hash)}.`);
    } catch (error) {
      if (error instanceof StaleOperationError) throw error;
      state.gateReadPending = true;
      state.proposalAllowed = false;
      updateProposalState();
      setStatus(
        `Publication confirmed in ${short(result.hash)}, but the follow-up gate read failed. Use Refresh on-chain gate.`,
        true,
      );
    }
  } finally {
    finishOperation(token);
  }
}

async function exportSafeBatch() {
  const token = beginOperation("export", "Verifying commitment…");
  try {
    if (!state.proposalAllowed || state.decision !== "PASS") {
      throw new Error("A proof-verified on-chain PASS decision is required before export.");
    }
    const exportBlock = await tracked(
      state.session.publicClient.getBlock({ blockTag: "latest" }),
      token,
    );
    try {
      validateActionDeadline(state.action.deadline, { nowSeconds: exportBlock.timestamp });
    } catch (error) {
      state.proposalAllowed = false;
      state.gateReadPending = false;
      updateProposalState();
      renderControls();
      throw error;
    }
    setOperationLabel(token, "Rechecking Safe nonce…");
    try {
      await tracked(
        verifySafeContractNonce(state.session.publicClient, state.action),
        token,
      );
    } catch (error) {
      state.proposalAllowed = false;
      updateProposalState();
      renderControls();
      throw error;
    }
    const recomputedCommitment = buildActionCommitment(state.action);
    if (
      recomputedCommitment.toLowerCase() !== state.actionCommitment.toLowerCase() ||
      recomputedCommitment.toLowerCase() !== state.submission.actionCommitment.toLowerCase()
    ) {
      throw new Error("The locked Safe action no longer matches its on-chain commitment.");
    }

    const gateBlock = await tracked(
      state.session.publicClient.getBlock({ blockTag: "latest" }),
      token,
    );
    try {
      validateActionDeadline(state.action.deadline, { nowSeconds: gateBlock.timestamp });
    } catch (error) {
      state.proposalAllowed = false;
      state.gateReadPending = false;
      updateProposalState();
      renderControls();
      throw error;
    }
    const stillAllowed = await tracked(
      isSafeProposalAllowed(
        state.session,
        state.intentId,
        recomputedCommitment,
        { blockNumber: gateBlock.number },
      ),
      token,
    );
    state.proposalAllowed = stillAllowed;
    if (!stillAllowed) {
      state.gateReadPending = true;
      updateProposalState();
      renderControls();
      throw new Error("The exact-action PASS gate is not open. Refresh its on-chain state.");
    }
    state.gateReadPending = false;

    const batch = buildSafeProposal({
      decision: state.decision,
      ...state.action,
      actionCommitment: recomputedCommitment,
      auditId: state.submission.auditIdHash,
      policyHash: state.submission.policyHash,
      intentId: state.intentId,
      submitter: state.session.account,
      nowSeconds: gateBlock.timestamp,
    });
    const blob = new Blob([`${JSON.stringify(batch, null, 2)}\n`], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `ciphergate-safe-intent-${state.intentId}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
    setStatus(
      "Commitment-matched Safe Transaction Builder batch exported for human review. CipherGate did not sign or execute it.",
    );
  } finally {
    finishOperation(token);
  }
}

function run(action) {
  return () =>
    action().catch((error) => {
      if (error instanceof StaleOperationError) return;
      setStatus(error?.shortMessage || error?.message || String(error), true);
    });
}

$("connect").addEventListener("click", run(connect));
$("submit").addEventListener("click", run(submit));
$("evaluate").addEventListener("click", run(evaluate));
$("decrypt").addEventListener("click", run(decrypt));
$("publish").addEventListener("click", run(publish));
$("export").addEventListener("click", run(exportSafeBatch));

if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", resetForWalletChange);
  window.ethereum.on("chainChanged", resetForWalletChange);
}

if (!$("actionDeadline").value) {
  $("actionDeadline").value = String(Math.floor(Date.now() / 1000) + 60 * 60);
}
populateOpaqueAuditId();
resetIntentState();
renderControls();
if (!contractAddress) {
  setStatus(
    "Preview build: CipherGate is not configured. A production build requires CIPHERGATE_CONTRACT_ADDRESS.",
    true,
  );
}
