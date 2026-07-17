import { createViemHandleClient } from "@iexec-nox/handle";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  isAddress,
  keccak256,
  parseEventLogs,
  stringToHex,
  zeroAddress,
  zeroHash,
} from "viem";
import { sepolia } from "viem/chains";

import { firewallAbi } from "./firewallAbi.js";

export const SEPOLIA_CHAIN_ID = sepolia.id;
export const SEPOLIA_CHAIN_HEX = "0xaa36a7";

const UINT256_MAX = (1n << 256n) - 1n;
const UINT64_MAX = (1n << 64n) - 1n;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const DECISIONS = Object.freeze({ 1: "PASS", 2: "REVIEW", 3: "BLOCK" });

function isNonZeroAddress(value) {
  return isAddress(value) && value.toLowerCase() !== zeroAddress;
}

function assertProvider(ethereum) {
  if (!ethereum || typeof ethereum.request !== "function") {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }
}

export function parseUint256(value, label, maximum = UINT256_MAX) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }
  const parsed = BigInt(normalized);
  if (parsed > maximum) throw new Error(`${label} is outside the supported range.`);
  return parsed;
}

export function parseUint64(value, label) {
  return parseUint256(value, label, UINT64_MAX);
}

export function decisionFromCode(value) {
  const code = Number(value);
  const decision = DECISIONS[code];
  if (!decision) throw new Error(`Unexpected encrypted decision code: ${String(value)}`);
  return decision;
}

export async function encryptIntentFields(handleClient, applicationContract, fields) {
  if (!isNonZeroAddress(applicationContract)) {
    throw new Error("CipherGate contract address must be a non-zero address.");
  }
  const amount = parseUint256(fields.amount, "Amount");
  const riskScore = parseUint256(fields.riskScore, "Risk score", 100n);
  const counterpartyFlags = parseUint256(fields.counterpartyFlags, "Counterparty flags");

  const [amountInput, riskInput, flagsInput] = await Promise.all([
    handleClient.encryptInput(amount, "uint256", applicationContract),
    handleClient.encryptInput(riskScore, "uint256", applicationContract),
    handleClient.encryptInput(counterpartyFlags, "uint256", applicationContract),
  ]);

  return { amountInput, riskInput, flagsInput };
}

export function buildSubmitArgs(
  encrypted,
  auditId,
  { actionCommitment, actionDeadline },
) {
  const normalizedAuditId = String(auditId ?? "").trim();
  if (!normalizedAuditId) throw new Error("An opaque audit ID is required; its hash will be public.");
  const auditIdHash = keccak256(stringToHex(normalizedAuditId));
  if (!BYTES32.test(actionCommitment ?? "") || /^0x0{64}$/i.test(actionCommitment)) {
    throw new Error("A non-zero action commitment is required.");
  }
  const normalizedActionDeadline = parseUint64(actionDeadline, "Action deadline");
  if (normalizedActionDeadline === 0n) throw new Error("Action deadline must be greater than zero.");
  return {
    auditIdHash,
    actionCommitment,
    actionDeadline: normalizedActionDeadline,
    args: [
      encrypted.amountInput.handle,
      encrypted.amountInput.handleProof,
      encrypted.riskInput.handle,
      encrypted.riskInput.handleProof,
      encrypted.flagsInput.handle,
      encrypted.flagsInput.handleProof,
      auditIdHash,
      actionCommitment,
      normalizedActionDeadline,
    ],
  };
}

async function ensureSepolia(ethereum) {
  const currentChain = await ethereum.request({ method: "eth_chainId" });
  if (String(currentChain).toLowerCase() === SEPOLIA_CHAIN_HEX) return;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_HEX }],
    });
  } catch (error) {
    if (error?.code === 4902) {
      throw new Error("Sepolia is not configured in this wallet. Add it in MetaMask, then retry.");
    }
    throw error;
  }
}

export async function createCipherGateSession({ ethereum, contractAddress }) {
  assertProvider(ethereum);
  if (!isNonZeroAddress(contractAddress)) {
    throw new Error(
      "CipherGate is not configured with a non-zero contract address. Build with CIPHERGATE_CONTRACT_ADDRESS after deployment.",
    );
  }

  await ensureSepolia(ethereum);
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || !accounts[0]) throw new Error("No wallet account was selected.");
  const account = getAddress(accounts[0]);
  const transport = custom(ethereum);
  const walletClient = createWalletClient({ account, chain: sepolia, transport });
  const publicClient = createPublicClient({ chain: sepolia, transport });

  // The official SDK ships the Sepolia gateway, NoxCompute, and subgraph
  // addresses. No endpoint override is needed for chain 11155111.
  const handleClient = await createViemHandleClient(walletClient);
  const normalizedContractAddress = getAddress(contractAddress);
  const [owner, auditor] = await Promise.all([
    publicClient.readContract({
      address: normalizedContractAddress,
      abi: firewallAbi,
      functionName: "owner",
    }),
    publicClient.readContract({
      address: normalizedContractAddress,
      abi: firewallAbi,
      functionName: "auditor",
    }),
  ]);

  // Wallet events can arrive while the SDK and role reads are in flight. Do a
  // final authoritative check so a connect operation never returns a stale
  // account or a session that has already moved away from Sepolia.
  const [finalAccounts, finalChain] = await Promise.all([
    ethereum.request({ method: "eth_accounts" }),
    ethereum.request({ method: "eth_chainId" }),
  ]);
  if (
    !Array.isArray(finalAccounts) ||
    !finalAccounts[0] ||
    getAddress(finalAccounts[0]) !== account ||
    String(finalChain).toLowerCase() !== SEPOLIA_CHAIN_HEX
  ) {
    throw new Error("Wallet account or network changed while connecting. Reconnect and retry.");
  }

  return {
    account,
    contractAddress: normalizedContractAddress,
    walletClient,
    publicClient,
    handleClient,
    canEvaluate: [owner, auditor].some(
      (address) => address.toLowerCase() === account.toLowerCase(),
    ),
  };
}

async function waitForSuccess(publicClient, hash, action) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${action} transaction reverted.`);
  return receipt;
}

export async function submitEncryptedIntent(session, encrypted, auditId, actionBinding) {
  const {
    args,
    auditIdHash,
    actionCommitment,
    actionDeadline,
  } = buildSubmitArgs(encrypted, auditId, actionBinding);
  const hash = await session.walletClient.writeContract({
    account: session.account,
    chain: sepolia,
    address: session.contractAddress,
    abi: firewallAbi,
    functionName: "submitIntent",
    args,
  });
  const receipt = await waitForSuccess(session.publicClient, hash, "Submit intent");
  const events = parseEventLogs({
    abi: firewallAbi,
    eventName: "IntentSubmitted",
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === session.contractAddress.toLowerCase(),
    ),
    strict: true,
  });
  if (events.length !== 1) {
    throw new Error("Receipt must contain exactly one CipherGate IntentSubmitted event.");
  }
  const [event] = events;
  if (
    event.args.auditId.toLowerCase() !== auditIdHash.toLowerCase() ||
    event.args.submitter.toLowerCase() !== session.account.toLowerCase() ||
    event.args.actionCommitment.toLowerCase() !== actionCommitment.toLowerCase() ||
    event.args.actionDeadline !== actionDeadline ||
    event.args.policyVersion === 0n ||
    !BYTES32.test(event.args.policyHash) ||
    /^0x0{64}$/i.test(event.args.policyHash)
  ) {
    throw new Error("IntentSubmitted event did not match the submitted intent and Safe action.");
  }

  return {
    hash,
    receipt,
    intentId: event.args.intentId,
    auditIdHash,
    actionCommitment: event.args.actionCommitment,
    actionDeadline: event.args.actionDeadline,
    policyHash: event.args.policyHash,
    policyVersion: event.args.policyVersion,
  };
}

export async function evaluateEncryptedIntent(session, intentId) {
  if (!session.canEvaluate) throw new Error("Only the CipherGate owner or auditor can evaluate.");
  const hash = await session.walletClient.writeContract({
    account: session.account,
    chain: sepolia,
    address: session.contractAddress,
    abi: firewallAbi,
    functionName: "evaluateEncryptedPolicy",
    args: [intentId],
  });
  const receipt = await waitForSuccess(session.publicClient, hash, "Evaluate policy");
  return { hash, receipt };
}

export async function readIntent(session, intentId, { blockNumber } = {}) {
  return session.publicClient.readContract({
    address: session.contractAddress,
    abi: firewallAbi,
    functionName: "getIntent",
    args: [intentId],
    ...(blockNumber === undefined ? {} : { blockNumber }),
  });
}

export async function decryptIntentDecision(session, intentId) {
  const intent = await readIntent(session, intentId);
  if (intent.encryptedDecision === zeroHash) {
    throw new Error("The encrypted policy decision has not been computed yet.");
  }
  const result = await session.handleClient.publicDecrypt(intent.encryptedDecision);
  const refreshedIntent = await readIntent(session, intentId);
  if (
    refreshedIntent.encryptedDecision.toLowerCase() !== intent.encryptedDecision.toLowerCase() ||
    refreshedIntent.actionCommitment.toLowerCase() !== intent.actionCommitment.toLowerCase() ||
    refreshedIntent.actionDeadline !== intent.actionDeadline
  ) {
    throw new Error("Intent changed while its decision proof was being fetched.");
  }
  return {
    decision: decisionFromCode(result.value),
    code: Number(result.value),
    decryptionProof: result.decryptionProof,
    actionCommitment: refreshedIntent.actionCommitment,
    actionDeadline: refreshedIntent.actionDeadline,
    policyHash: refreshedIntent.policyHash,
    policyVersion: refreshedIntent.policyVersion,
    publicDecision:
      Number(refreshedIntent.publicDecision) || Number(intent.publicDecision),
  };
}

export async function publishIntentDecision(session, intentId, decryptionProof) {
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(decryptionProof ?? "")) {
    throw new Error("A valid Nox public-decryption proof is required.");
  }
  const hash = await session.walletClient.writeContract({
    account: session.account,
    chain: sepolia,
    address: session.contractAddress,
    abi: firewallAbi,
    functionName: "publishDecision",
    args: [intentId, decryptionProof],
  });
  const receipt = await waitForSuccess(session.publicClient, hash, "Publish decision");
  return { hash, receipt };
}

export async function isSafeProposalAllowed(
  session,
  intentId,
  actionCommitment,
  { blockNumber } = {},
) {
  if (!BYTES32.test(actionCommitment ?? "") || /^0x0{64}$/i.test(actionCommitment)) {
    throw new Error("A non-zero action commitment is required for the Safe proposal gate.");
  }
  return session.publicClient.readContract({
    address: session.contractAddress,
    abi: firewallAbi,
    functionName: "safeProposalAllowed",
    args: [intentId, actionCommitment],
    ...(blockNumber === undefined ? {} : { blockNumber }),
  });
}
