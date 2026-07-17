import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is required.");
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey ?? "")) {
  throw new Error("DEPLOYER_PRIVATE_KEY must be a 32-byte hex key. Never commit it.");
}

const artifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/ConfidentialIntentFirewall.sol/ConfidentialIntentFirewall.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const account = privateKeyToAccount(privateKey);
const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain: sepolia, transport });
const walletClient = createWalletClient({ account, chain: sepolia, transport });

if ((await publicClient.getChainId()) !== sepolia.id) {
  throw new Error(`RPC is not Ethereum Sepolia (${sepolia.id}).`);
}

const hash = await walletClient.deployContract({
  account,
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });

if (receipt.status !== "success" || !receipt.contractAddress) {
  throw new Error(`Deployment ${hash} did not succeed.`);
}

console.log(
  JSON.stringify(
    {
      chainId: sepolia.id,
      deployer: account.address,
      contractAddress: receipt.contractAddress,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
    },
    null,
    2,
  ),
);
