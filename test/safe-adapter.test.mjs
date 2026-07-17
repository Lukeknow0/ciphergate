import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActionCommitment,
  buildSafeProposal,
  calculateSafeChecksum,
  normalizeSafeAction,
  SAFE_TX_BUILDER_VERSION,
  validateActionDeadline,
  verifySafeContractNonce,
} from "../frontend/src/safeProposal.js";

const nowSeconds = 1_750_000_000n;
const action = {
  chainId: 11155111,
  verifyingContract: "0x3333333333333333333333333333333333333333",
  safeAddress: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  data: "0x1234",
  value: "42",
  safeNonce: "7",
  deadline: "1750003600",
};
const base = {
  ...action,
  actionCommitment: buildActionCommitment(action),
  auditId: `0x${"a".repeat(64)}`,
  policyHash: `0x${"b".repeat(64)}`,
  intentId: "12",
  submitter: "0x4444444444444444444444444444444444444444",
  createdAt: 1_750_000_000_000,
  nowSeconds,
};

test("builds a commitment-matched checksummed Safe batch only for PASS", () => {
  const proposal = buildSafeProposal({ ...base, decision: "PASS" });
  assert.equal(proposal.chainId, "11155111");
  assert.equal(proposal.transactions.length, 1);
  assert.equal(proposal.transactions[0].operation, undefined);
  assert.equal(proposal.transactions[0].contractMethod, null);
  assert.equal(proposal.transactions[0].contractInputsValues, null);
  assert.equal(proposal.meta.createdFromSafeAddress, base.safeAddress);
  assert.equal(proposal.meta.createdFromOwnerAddress, "");
  assert.equal(proposal.meta.txBuilderVersion, SAFE_TX_BUILDER_VERSION);
  assert.match(proposal.meta.description, new RegExp(base.actionCommitment));
  assert.match(proposal.meta.description, new RegExp(action.verifyingContract));
  assert.match(proposal.meta.description, /intent=12/);
  assert.match(proposal.meta.description, new RegExp(base.submitter));
  assert.match(proposal.meta.description, /metadata only; verify manually/);
  assert.equal(
    proposal.meta.checksum,
    "0xf594abaa6d5f5d4e1b790ca8bc74435f8c297546b1fa684f589d21b79b192567",
    "fixed Safe Transaction Builder 2.0.1 oracle vector changed",
  );
  assert.equal(proposal.meta.checksum, calculateSafeChecksum(proposal));
  assert.match(proposal.meta.checksum, /^0x[0-9a-f]{64}$/);
  assert.equal(typeof proposal.createdAt, "number");
});

test("action commitment binds every Safe action field", () => {
  const commitment = buildActionCommitment(action);
  assert.equal(
    commitment,
    "0x42b3002fa9e6f2dda76388161ef72bc957e5950db200b2470cff279730cdc133",
  );
  for (const change of [
    { chainId: 1 },
    { verifyingContract: "0x4444444444444444444444444444444444444444" },
    { safeAddress: "0x3333333333333333333333333333333333333333" },
    { to: "0x3333333333333333333333333333333333333333" },
    { value: "43" },
    { data: "0xabcd" },
    { safeNonce: "8" },
    { deadline: "1750003601" },
  ]) {
    assert.notEqual(buildActionCommitment({ ...action, ...change }), commitment);
  }
});

test("rejects export when any action field differs from the submitted commitment", () => {
  assert.throws(
    () => buildSafeProposal({ ...base, decision: "PASS", data: "0xabcd" }),
    /does not match the committed action/,
  );
  const changedAction = { ...action, data: "0xabcd" };
  const changed = buildSafeProposal({
    ...base,
    ...changedAction,
    actionCommitment: buildActionCommitment(changedAction),
    decision: "PASS",
  });
  assert.notEqual(changed.meta.checksum, buildSafeProposal({ ...base, decision: "PASS" }).meta.checksum);
});

test("normalizes numeric fields and validates zero addresses and uint256 limits", () => {
  assert.deepEqual(
    normalizeSafeAction({ ...action, value: "00042", safeNonce: "007" }),
    { ...action, chainId: "11155111", value: "42", safeNonce: "7" },
  );
  assert.throws(
    () => buildActionCommitment({ ...action, verifyingContract: `0x${"0".repeat(40)}` }),
    /zero address/,
  );
  assert.throws(
    () => buildActionCommitment({ ...action, safeAddress: `0x${"0".repeat(40)}` }),
    /zero address/,
  );
  assert.throws(
    () => buildActionCommitment({ ...action, to: `0x${"0".repeat(40)}` }),
    /zero address/,
  );
  assert.throws(
    () => buildSafeProposal({ ...base, submitter: `0x${"0".repeat(40)}`, decision: "PASS" }),
    /zero address/,
  );
  assert.throws(
    () => buildActionCommitment({ ...action, value: (1n << 256n).toString() }),
    /supported range/,
  );
  assert.throws(
    () => buildActionCommitment({ ...action, safeNonce: (1n << 256n).toString() }),
    /supported range/,
  );
});

test("enforces a future deadline no more than seven days away", () => {
  assert.equal(validateActionDeadline(action.deadline, { nowSeconds }), 1_750_003_600n);
  assert.throws(
    () => validateActionDeadline(nowSeconds, { nowSeconds }),
    /must be in the future/,
  );
  assert.throws(
    () => validateActionDeadline(nowSeconds + 7n * 24n * 60n * 60n + 1n, { nowSeconds }),
    /more than 7 days/,
  );
  assert.throws(
    () => buildActionCommitment({ ...action, deadline: (1n << 64n).toString() }),
    /supported range/,
  );
});

test("requires deployed Safe code and an exact live nonce before commitment use", async () => {
  const calls = [];
  const publicClient = {
    async getBytecode({ address }) {
      calls.push(["getBytecode", address]);
      return "0x6000";
    },
    async readContract({ address, functionName }) {
      calls.push(["readContract", address, functionName]);
      return 7n;
    },
  };
  assert.equal(await verifySafeContractNonce(publicClient, action), 7n);
  assert.deepEqual(calls, [
    ["getBytecode", action.safeAddress],
    ["readContract", action.safeAddress, "nonce"],
  ]);

  await assert.rejects(
    verifySafeContractNonce(
      { ...publicClient, getBytecode: async () => "0x" },
      action,
    ),
    /no deployed contract code/,
  );
  await assert.rejects(
    verifySafeContractNonce(
      { ...publicClient, readContract: async () => 8n },
      action,
    ),
    /Safe nonce mismatch.*commits 7.*reports 8/,
  );
  await assert.rejects(
    verifySafeContractNonce(
      { ...publicClient, readContract: async () => { throw new Error("revert"); } },
      action,
    ),
    /does not expose a readable nonce/,
  );
});

for (const decision of ["UNKNOWN", "REVIEW", "BLOCK"]) {
  test(`rejects ${decision}`, () => {
    assert.throws(
      () => buildSafeProposal({ ...base, decision }),
      /requires PASS/,
    );
  });
}
