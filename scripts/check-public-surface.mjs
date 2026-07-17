import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const artifactUrl = new URL(
  "../artifacts/contracts/ConfidentialIntentFirewall.sol/ConfidentialIntentFirewall.json",
  import.meta.url,
);
const artifact = JSON.parse(await readFile(artifactUrl, "utf8"));
const source = await readFile(
  new URL("../contracts/ConfidentialIntentFirewall.sol", import.meta.url),
  "utf8",
);
const submit = artifact.abi.find((item) => item.type === "function" && item.name === "submitIntent");
assert.ok(submit, "submitIntent ABI missing");
assert.deepEqual(
  submit.inputs.map((input) => input.type),
  [
    "bytes32",
    "bytes",
    "bytes32",
    "bytes",
    "bytes32",
    "bytes",
    "bytes32",
    "bytes32",
    "uint64",
  ],
  "sensitive fields must be handles/proofs; only public audit/action metadata may follow",
);

const publish = artifact.abi.find((item) => item.type === "function" && item.name === "publishDecision");
assert.ok(publish, "publishDecision ABI missing");
assert.deepEqual(
  publish.inputs.map((input) => input.type),
  ["uint256", "bytes"],
  "public decision must accept a Nox decryption proof, not a caller-selected enum",
);
assert.match(source, /Nox\.publicDecrypt\(intent\.encryptedDecision, decryptionProof\)/);
assert.match(source, /Nox\.allowPublicDecryption\(code\)/);
assert.match(source, /Nox\.isPubliclyDecryptable\(intent\.encryptedDecision\)/);

const safeGate = artifact.abi.find(
  (item) => item.type === "function" && item.name === "safeProposalAllowed",
);
assert.ok(safeGate, "safeProposalAllowed ABI missing");
assert.deepEqual(
  safeGate.inputs.map((input) => input.type),
  ["uint256", "bytes32"],
  "the PASS gate must verify the exact committed Safe action",
);
assert.match(source, /intent\.actionCommitment == actionCommitment/);
assert.match(source, /block\.timestamp <= intent\.actionDeadline/);
assert.match(source, /usedActionCommitments\[msg\.sender\]\[actionCommitment\]/);
assert.match(source, /ACTION_COMMITMENT_DOMAIN,[\s\S]*block\.chainid,[\s\S]*address\(this\),/);
const usedActionCommitments = artifact.abi.find(
  (item) => item.type === "function" && item.name === "usedActionCommitments",
);
assert.ok(usedActionCommitments, "submitter-scoped action replay getter missing");
assert.deepEqual(
  usedActionCommitments.inputs.map((input) => input.type),
  ["address", "bytes32"],
  "action replay state must be namespaced by submitter",
);

const sensitiveNames = new Set(["amount", "riskScore", "counterpartyFlags"]);
for (const event of artifact.abi.filter((item) => item.type === "event")) {
  for (const input of event.inputs) {
    assert.ok(!sensitiveNames.has(input.name), `${event.name} leaks ${input.name}`);
  }
}

console.log(
  "PASS public surface: encrypted inputs; proof-bound decision; action-bound gate; no sensitive event fields",
);
