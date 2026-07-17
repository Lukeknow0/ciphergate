import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  keccak256,
} from "viem";
import { sepolia } from "viem/chains";

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const suppliedAddress = process.env.CIPHERGATE_CONTRACT_ADDRESS;

if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is required.");
if (!isAddress(suppliedAddress ?? "")) {
  throw new Error("CIPHERGATE_CONTRACT_ADDRESS must be a valid address.");
}

const address = getAddress(suppliedAddress);
const artifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/ConfidentialIntentFirewall.sol/ConfidentialIntentFirewall.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });

if ((await client.getChainId()) !== sepolia.id) {
  throw new Error(`RPC is not Ethereum Sepolia (${sepolia.id}).`);
}

const bytecode = await client.getBytecode({ address });
if (!bytecode || bytecode === "0x") throw new Error("No runtime bytecode at the supplied address.");

const [owner, auditor, policyHash, policyVersion, maxActionLifetime] = await Promise.all([
  client.readContract({ address, abi: artifact.abi, functionName: "owner" }),
  client.readContract({ address, abi: artifact.abi, functionName: "auditor" }),
  client.readContract({ address, abi: artifact.abi, functionName: "policyHash" }),
  client.readContract({ address, abi: artifact.abi, functionName: "policyVersion" }),
  client.readContract({ address, abi: artifact.abi, functionName: "MAX_ACTION_LIFETIME" }),
]);

console.log(
  JSON.stringify(
    {
      chainId: sepolia.id,
      contractAddress: address,
      runtimeBytecodeHash: keccak256(bytecode),
      owner,
      auditor,
      policyHash,
      policyVersion: policyVersion.toString(),
      maxActionLifetimeSeconds: maxActionLifetime.toString(),
    },
    null,
    2,
  ),
);
