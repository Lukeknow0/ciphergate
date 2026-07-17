import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeAbiParameters, encodeEventTopics, keccak256, stringToHex } from "viem";

import {
  buildSubmitArgs,
  createCipherGateSession,
  decisionFromCode,
  decryptIntentDecision,
  encryptIntentFields,
  isSafeProposalAllowed,
  parseUint64,
  parseUint256,
  submitEncryptedIntent,
} from "../frontend/src/noxAdapter.js";
import { firewallAbi } from "../frontend/src/firewallAbi.js";

const contractAddress = "0x1111111111111111111111111111111111111111";

test("validates uint256 values and policy ranges", () => {
  assert.equal(parseUint256("9000", "Amount"), 9000n);
  assert.throws(() => parseUint256("-1", "Amount"), /non-negative whole number/);
  assert.throws(() => parseUint256("1.5", "Amount"), /non-negative whole number/);
  assert.throws(() => parseUint256("101", "Risk score", 100n), /supported range/);
  assert.equal(parseUint64("18446744073709551615", "Deadline"), (1n << 64n) - 1n);
  assert.throws(
    () => parseUint64("18446744073709551616", "Deadline"),
    /supported range/,
  );
});

test("maps only encrypted decision codes supported by the contract", () => {
  assert.equal(decisionFromCode(1n), "PASS");
  assert.equal(decisionFromCode(2n), "REVIEW");
  assert.equal(decisionFromCode(3n), "BLOCK");
  assert.throws(() => decisionFromCode(0n), /Unexpected encrypted decision code/);
});

test("encrypts each sensitive field as uint256 for the application contract", async () => {
  const calls = [];
  const handleClient = {
    async encryptInput(value, solidityType, applicationContract) {
      calls.push({ value, solidityType, applicationContract });
      const suffix = String(calls.length).padStart(64, "0");
      return { handle: `0x${suffix}`, handleProof: `0x${suffix}` };
    },
  };
  const encrypted = await encryptIntentFields(handleClient, contractAddress, {
    amount: "9000",
    riskScore: "51",
    counterpartyFlags: "0",
  });

  assert.deepEqual(
    calls,
    [9000n, 51n, 0n].map((value) => ({
      value,
      solidityType: "uint256",
      applicationContract: contractAddress,
    })),
  );
  assert.ok(encrypted.amountInput.handle.startsWith("0x"));
  await assert.rejects(
    encryptIntentFields(handleClient, `0x${"0".repeat(40)}`, {
      amount: "1",
      riskScore: "1",
      counterpartyFlags: "0",
    }),
    /non-zero address/,
  );
});

test("rejects a zero configured contract before requesting wallet access", async () => {
  let requested = false;
  await assert.rejects(
    createCipherGateSession({
      ethereum: { request: async () => { requested = true; } },
      contractAddress: `0x${"0".repeat(40)}`,
    }),
    /non-zero contract address/,
  );
  assert.equal(requested, false);
});

test("builds submitIntent arguments with the committed action and opaque audit hash", () => {
  const item = (digit) => ({ handle: `0x${digit.repeat(64)}`, handleProof: `0x${digit.repeat(64)}` });
  const actionCommitment = `0x${"4".repeat(64)}`;
  const actionDeadline = 1_800_000_000n;
  const result = buildSubmitArgs(
    { amountInput: item("1"), riskInput: item("2"), flagsInput: item("3") },
    "cg-7f3a91c2e8b44d10",
    { actionCommitment, actionDeadline },
  );
  assert.equal(result.args.length, 9);
  assert.equal(result.args[6], result.auditIdHash);
  assert.equal(result.args[7], actionCommitment);
  assert.equal(result.args[8], actionDeadline);
  assert.match(result.auditIdHash, /^0x[0-9a-f]{64}$/);
  assert.throws(
    () => buildSubmitArgs(
      { amountInput: item("1"), riskInput: item("2"), flagsInput: item("3") },
      "",
      { actionCommitment, actionDeadline },
    ),
    /opaque audit ID is required/,
  );
  assert.throws(
    () => buildSubmitArgs(
      { amountInput: item("1"), riskInput: item("2"), flagsInput: item("3") },
      "cg-opaque",
      { actionCommitment: `0x${"0".repeat(64)}`, actionDeadline },
    ),
    /non-zero action commitment/,
  );
});

test("browser ABI matches the commitment-bound contract interface", () => {
  const submitted = firewallAbi.find((item) => item.type === "event" && item.name === "IntentSubmitted");
  assert.deepEqual(
    submitted.inputs.map(({ name, type }) => [name, type]),
    [
      ["intentId", "uint256"],
      ["auditId", "bytes32"],
      ["submitter", "address"],
      ["actionCommitment", "bytes32"],
      ["actionDeadline", "uint64"],
      ["policyVersion", "uint64"],
      ["policyHash", "bytes32"],
    ],
  );
  const gate = firewallAbi.find((item) => item.type === "function" && item.name === "safeProposalAllowed");
  assert.deepEqual(gate.inputs.map(({ type }) => type), ["uint256", "bytes32"]);
});

test("queries the Safe gate with the exact non-zero commitment", async () => {
  const calls = [];
  const actionCommitment = `0x${"4".repeat(64)}`;
  const allowed = await isSafeProposalAllowed(
    {
      contractAddress,
      publicClient: {
        async readContract(request) {
          calls.push(request);
          return true;
        },
      },
    },
    9n,
    actionCommitment,
    { blockNumber: 123n },
  );
  assert.equal(allowed, true);
  assert.deepEqual(calls[0].args, [9n, actionCommitment]);
  assert.equal(calls[0].blockNumber, 123n);
  await assert.rejects(
    isSafeProposalAllowed(
      { contractAddress, publicClient: { readContract: async () => true } },
      9n,
      `0x${"0".repeat(64)}`,
    ),
    /non-zero action commitment/,
  );
});

test("refreshes publicDecision after the Nox public-decryption call", async () => {
  const encryptedDecision = `0x${"9".repeat(64)}`;
  const actionCommitment = `0x${"4".repeat(64)}`;
  const intent = {
    encryptedDecision,
    actionCommitment,
    actionDeadline: 1_800_000_000n,
    policyHash: `0x${"5".repeat(64)}`,
    policyVersion: 1n,
    publicDecision: 0,
  };
  const reads = [intent, { ...intent, publicDecision: 1 }];
  const result = await decryptIntentDecision(
    {
      contractAddress,
      publicClient: { readContract: async () => reads.shift() },
      handleClient: {
        publicDecrypt: async () => ({ value: 1n, decryptionProof: "0x12" }),
      },
    },
    3n,
  );
  assert.equal(result.decision, "PASS");
  assert.equal(result.publicDecision, 1);
  assert.equal(reads.length, 0);
});

test("strictly binds the sole IntentSubmitted receipt event", async () => {
  const item = (digit) => ({
    handle: `0x${digit.repeat(64)}`,
    handleProof: `0x${digit.repeat(64)}`,
  });
  const encrypted = {
    amountInput: item("1"),
    riskInput: item("2"),
    flagsInput: item("3"),
  };
  const account = "0x2222222222222222222222222222222222222222";
  const auditId = "cg-receipt-vector";
  const auditIdHash = keccak256(stringToHex(auditId));
  const actionCommitment = `0x${"4".repeat(64)}`;
  const actionDeadline = 1_800_000_000n;
  const policyHash = `0x${"5".repeat(64)}`;
  const topics = encodeEventTopics({
    abi: firewallAbi,
    eventName: "IntentSubmitted",
    args: { intentId: 9n, auditId: auditIdHash, submitter: account },
  });
  const data = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "uint64" },
      { type: "uint64" },
      { type: "bytes32" },
    ],
    [actionCommitment, actionDeadline, 1n, policyHash],
  );
  const receipt = {
    status: "success",
    logs: [{ address: contractAddress, topics, data }],
  };
  const session = {
    account,
    contractAddress,
    walletClient: { writeContract: async () => `0x${"6".repeat(64)}` },
    publicClient: { waitForTransactionReceipt: async () => receipt },
  };

  const result = await submitEncryptedIntent(
    session,
    encrypted,
    auditId,
    { actionCommitment, actionDeadline },
  );
  assert.equal(result.intentId, 9n);
  assert.equal(result.auditIdHash, auditIdHash);

  receipt.logs.push(receipt.logs[0]);
  await assert.rejects(
    submitEncryptedIntent(
      session,
      encrypted,
      auditId,
      { actionCommitment, actionDeadline },
    ),
    /exactly one.*IntentSubmitted/,
  );
});
