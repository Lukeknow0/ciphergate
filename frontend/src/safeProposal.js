import {
  encodeAbiParameters,
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  zeroAddress,
} from "viem";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX = /^0x([0-9a-fA-F]{2})*$/;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const UINT256_MAX = (1n << 256n) - 1n;
const UINT64_MAX = (1n << 64n) - 1n;

export const MAX_ACTION_LIFETIME_SECONDS = 7n * 24n * 60n * 60n;
export const ACTION_COMMITMENT_DOMAIN = keccak256(
  stringToHex("CipherGate.SafeAction.v1"),
);

// Current official Safe Transaction Builder release checked on 2026-07-16.
export const SAFE_TX_BUILDER_VERSION = "2.0.1";

const SAFE_NONCE_ABI = [
  {
    type: "function",
    name: "nonce",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const CHECKSUM_VALUE = 0;
const CHECKSUM_TOKEN = 1;
const CHECKSUM_LEAVE = 2;

function encodeChecksumPrimitive(value) {
  if (value === undefined) return "null";
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") {
    throw new TypeError(`Unsupported non-JSON checksum value: ${String(value)}`);
  }
  return encoded;
}

function assertChecksumObject(value) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Checksum input may contain only arrays and plain objects");
  }
}

// Independent token-stream implementation of the Transaction Builder v1
// checksum format. A fixed release-oracle vector in safe-adapter.test.mjs
// prevents this implementation from validating itself.
function* checksumTokens(root) {
  const ancestors = new WeakSet();
  const stack = [{ type: CHECKSUM_VALUE, value: root }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame.type === CHECKSUM_TOKEN) {
      yield frame.text;
      continue;
    }
    if (frame.type === CHECKSUM_LEAVE) {
      ancestors.delete(frame.value);
      continue;
    }

    const value = frame.value;
    if (value === null || typeof value !== "object") {
      yield encodeChecksumPrimitive(value);
      continue;
    }
    if (ancestors.has(value)) throw new TypeError("Cyclic checksum input is unsupported");
    const array = Array.isArray(value);
    if (!array) assertChecksumObject(value);
    ancestors.add(value);
    stack.push({ type: CHECKSUM_LEAVE, value });

    if (array) {
      stack.push({ type: CHECKSUM_TOKEN, text: "]" });
      for (let index = value.length - 1; index >= 0; index -= 1) {
        if (index < value.length - 1) stack.push({ type: CHECKSUM_TOKEN, text: "," });
        stack.push({ type: CHECKSUM_VALUE, value: value[index] });
      }
      yield "[";
      continue;
    }

    const keys = Object.keys(value).sort();
    stack.push({ type: CHECKSUM_TOKEN, text: "}" });
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      stack.push({ type: CHECKSUM_TOKEN, text: "," });
      stack.push({ type: CHECKSUM_VALUE, value: value[keys[index]] });
    }
    yield `{${JSON.stringify(keys)}`;
  }
}

export function calculateSafeChecksum(batch) {
  assertChecksumObject(batch);
  assertChecksumObject(batch.meta);
  const meta = { ...batch.meta };
  delete meta.checksum;
  meta.name = null;
  const canonical = Array.from(checksumTokens({ ...batch, meta })).join("");
  return keccak256(stringToHex(canonical));
}

function parseUnsigned(value, label, maximum = UINT256_MAX) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) throw new Error(`${label} must be a non-negative whole number`);
  const parsed = BigInt(normalized);
  if (parsed > maximum) throw new Error(`${label} is outside the supported range`);
  return parsed;
}

function normalizeNonZeroAddress(value, label) {
  const normalized = String(value ?? "").trim();
  if (!isAddress(normalized) || !ADDRESS.test(normalized)) {
    throw new Error(`${label} is not a valid address`);
  }
  const checksummed = getAddress(normalized);
  if (checksummed.toLowerCase() === zeroAddress) {
    throw new Error(`${label} cannot be the zero address`);
  }
  return checksummed;
}

function normalizeCalldata(value) {
  const normalized = String(value ?? "").trim();
  if (!HEX.test(normalized)) throw new Error("Calldata must be strict even-length hex");
  return normalized.toLowerCase();
}

export function validateActionDeadline(
  deadline,
  {
    nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
    maxLifetimeSeconds = MAX_ACTION_LIFETIME_SECONDS,
  } = {},
) {
  const normalizedDeadline = parseUnsigned(deadline, "Action deadline", UINT64_MAX);
  const normalizedNow = parseUnsigned(nowSeconds, "Current time", UINT64_MAX);
  const normalizedLifetime = parseUnsigned(
    maxLifetimeSeconds,
    "Maximum action lifetime",
    UINT64_MAX,
  );
  if (normalizedDeadline <= normalizedNow) throw new Error("Action deadline must be in the future");
  if (normalizedDeadline > normalizedNow + normalizedLifetime) {
    throw new Error("Action deadline cannot be more than 7 days in the future");
  }
  return normalizedDeadline;
}

export function normalizeSafeAction({
  chainId,
  verifyingContract,
  safeAddress,
  to,
  value = "0",
  data = "0x",
  safeNonce,
  deadline,
}) {
  const normalizedChainId = parseUnsigned(chainId, "Chain ID");
  if (normalizedChainId === 0n) throw new Error("Chain ID must be greater than zero");
  const normalizedValue = parseUnsigned(value, "Value");
  const normalizedNonce = parseUnsigned(safeNonce, "Safe nonce");
  const normalizedDeadline = parseUnsigned(deadline, "Action deadline", UINT64_MAX);

  return {
    chainId: normalizedChainId.toString(),
    verifyingContract: normalizeNonZeroAddress(verifyingContract, "CipherGate verifier"),
    safeAddress: normalizeNonZeroAddress(safeAddress, "Safe address"),
    to: normalizeNonZeroAddress(to, "Destination"),
    value: normalizedValue.toString(),
    data: normalizeCalldata(data),
    safeNonce: normalizedNonce.toString(),
    deadline: normalizedDeadline.toString(),
  };
}

export function buildActionCommitment(action) {
  const normalized = normalizeSafeAction(action);
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "uint64" },
      ],
      [
        ACTION_COMMITMENT_DOMAIN,
        BigInt(normalized.chainId),
        normalized.verifyingContract,
        normalized.safeAddress,
        normalized.to,
        BigInt(normalized.value),
        keccak256(normalized.data),
        BigInt(normalized.safeNonce),
        BigInt(normalized.deadline),
      ],
    ),
  );
}

export async function verifySafeContractNonce(publicClient, action) {
  if (!publicClient?.getBytecode || !publicClient?.readContract) {
    throw new Error("A public client is required to verify the Safe nonce");
  }
  const normalized = normalizeSafeAction(action);
  const bytecode = await publicClient.getBytecode({ address: normalized.safeAddress });
  if (!bytecode || /^0x0*$/i.test(bytecode)) {
    throw new Error("Safe address has no deployed contract code");
  }

  let liveNonce;
  try {
    liveNonce = await publicClient.readContract({
      address: normalized.safeAddress,
      abi: SAFE_NONCE_ABI,
      functionName: "nonce",
    });
  } catch (error) {
    throw new Error("Safe address does not expose a readable nonce()", { cause: error });
  }
  if (BigInt(liveNonce) !== BigInt(normalized.safeNonce)) {
    throw new Error(
      `Safe nonce mismatch: the form commits ${normalized.safeNonce}, but the Safe reports ${liveNonce}`,
    );
  }
  return BigInt(liveNonce);
}

export function buildSafeProposal({
  decision,
  chainId,
  verifyingContract,
  safeAddress,
  to,
  data,
  value = "0",
  safeNonce,
  deadline,
  actionCommitment,
  auditId,
  policyHash,
  intentId,
  submitter,
  createdAt = Date.now(),
  nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
}) {
  if (decision !== "PASS") throw new Error("Safe proposal requires PASS");
  if (!Number.isSafeInteger(createdAt) || createdAt < 0) throw new Error("Invalid creation time");
  if (!BYTES32.test(actionCommitment ?? "") || /^0x0{64}$/i.test(actionCommitment)) {
    throw new Error("A non-zero action commitment is required");
  }

  validateActionDeadline(deadline, { nowSeconds });
  const normalizedIntentId = parseUnsigned(intentId, "Intent ID");
  const normalizedSubmitter = normalizeNonZeroAddress(submitter, "Intent submitter");
  const action = normalizeSafeAction({
    chainId,
    verifyingContract,
    safeAddress,
    to,
    value,
    data,
    safeNonce,
    deadline,
  });
  const recomputedCommitment = buildActionCommitment(action);
  if (recomputedCommitment.toLowerCase() !== actionCommitment.toLowerCase()) {
    throw new Error("Safe action does not match the committed action");
  }

  const batch = {
    version: "1.0",
    chainId: action.chainId,
    createdAt,
    meta: {
      name: "CipherGate PASS proposal",
      description: `Commitment-bound CipherGate advisory (not a Guard/Module); verifier=${action.verifyingContract}; intent=${normalizedIntentId}; submitter=${normalizedSubmitter}; commitment=${recomputedCommitment}; audit=${auditId ?? ""}; policy=${policyHash ?? ""}; safeNonce=${action.safeNonce} (commitment metadata only; verify manually on Safe import); deadline=${action.deadline}`,
      txBuilderVersion: SAFE_TX_BUILDER_VERSION,
      createdFromSafeAddress: action.safeAddress,
      createdFromOwnerAddress: "",
      checksum: null,
    },
    transactions: [
      {
        to: action.to,
        value: action.value,
        data: action.data,
        contractMethod: null,
        contractInputsValues: null,
      },
    ],
  };

  batch.meta.checksum = calculateSafeChecksum(batch);
  return batch;
}
