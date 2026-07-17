import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createViemHandleClient, type Handle } from "@iexec-nox/handle";
import {
  handleGatewayUrl,
  NOX_COMPUTE_ADDRESS,
  nox,
} from "@iexec-nox/nox-hardhat-plugin";
import { keccak256, parseAbi, stringToHex, toHex } from "viem";

const aclAbi = parseAbi([
  "function isViewer(bytes32,address) view returns (bool)",
  "function isAllowed(bytes32,address) view returns (bool)",
  "function isPubliclyDecryptable(bytes32) view returns (bool)",
]);

describe("CipherGate Nox end-to-end", () => {
  it(
    "keeps attributes private but discloses the decision to the submitter",
    { timeout: 180_000 },
    async () => {
      const { viem } = await nox.connect();
      const publicClient = await viem.getPublicClient();
      const [owner, submitter, stranger] = await viem.getWalletClients();
      submitter.getAddresses = async () => [submitter.account.address];
      const firewall = await viem.deployContract("ConfidentialIntentFirewall");

      const clientConfig = {
        gatewayUrl: handleGatewayUrl(),
        smartContractAddress: NOX_COMPUTE_ADDRESS,
        subgraphUrl: "https://example.com/subgraphs/id/none",
      } as const;
      const submitterHandles = await createViemHandleClient(submitter, clientConfig);
      const strangerHandles = await createViemHandleClient(stranger, clientConfig);
      const asSubmitter = await viem.getContractAt(
        "ConfidentialIntentFirewall",
        firewall.address,
        { client: { wallet: submitter } },
      );
      const asStranger = await viem.getContractAt(
        "ConfidentialIntentFirewall",
        firewall.address,
        { client: { wallet: stranger } },
      );

      const [amount, risk, flags] = await Promise.all([
        submitterHandles.encryptInput(9_000n, "uint256", firewall.address),
        submitterHandles.encryptInput(51n, "uint256", firewall.address),
        submitterHandles.encryptInput(0n, "uint256", firewall.address),
      ]);
      const actionDeadline = (await publicClient.getBlock()).timestamp + 3_600n;
      const actionCommitment = await firewall.read.computeActionCommitment([
        owner.account.address,
        submitter.account.address,
        0n,
        keccak256("0x"),
        0n,
        actionDeadline,
      ]);
      const replayActionCommitment = await firewall.read.computeActionCommitment([
        owner.account.address,
        submitter.account.address,
        0n,
        keccak256("0x"),
        1n,
        actionDeadline,
      ]);
      const submitArgs = [
        amount.handle,
        amount.handleProof,
        risk.handle,
        risk.handleProof,
        flags.handle,
        flags.handleProof,
        keccak256(stringToHex("audit-review-001")),
        actionCommitment,
        actionDeadline,
      ] as const;

      await assert.rejects(asStranger.write.submitIntent(submitArgs));
      const otherFirewall = await viem.deployContract("ConfidentialIntentFirewall");
      const otherAsSubmitter = await viem.getContractAt(
        "ConfidentialIntentFirewall",
        otherFirewall.address,
        { client: { wallet: submitter } },
      );
      await assert.rejects(otherAsSubmitter.write.submitIntent(submitArgs));

      const submitHash = await asSubmitter.write.submitIntent(submitArgs);
      await publicClient.waitForTransactionReceipt({ hash: submitHash });
      const submitTransaction = await publicClient.getTransaction({ hash: submitHash });
      for (const sensitiveValue of [9_000n, 51n]) {
        assert.equal(
          submitTransaction.input.toLowerCase().includes(toHex(sensitiveValue, { size: 32 }).slice(2)),
          false,
          `cleartext ${sensitiveValue} leaked in submit calldata`,
        );
      }

      await assert.rejects(
        asSubmitter.write.submitIntent([
          ...submitArgs.slice(0, 6),
          keccak256(stringToHex("audit-review-replay")),
          replayActionCommitment,
          actionDeadline,
        ]),
        /InputBundleAlreadyUsed/,
      );

      let intent = await firewall.read.getIntent([0n]);
      const amountHandle = intent.amount as Handle<"uint256">;
      assert.equal((await nox.decrypt(amountHandle)).value, 9_000n);
      await assert.rejects(
        () => submitterHandles.decrypt(amountHandle),
        /not authorized to decrypt it/i,
      );
      await assert.rejects(
        () => nox.publicDecrypt(amountHandle),
        /not publicly decryptable/i,
      );
      for (const encryptedAttribute of [intent.amount, intent.riskScore, intent.counterpartyFlags]) {
        assert.equal(
          await publicClient.readContract({
            address: NOX_COMPUTE_ADDRESS,
            abi: aclAbi,
            functionName: "isViewer",
            args: [encryptedAttribute, owner.account.address],
          }),
          true,
        );
        assert.equal(
          await publicClient.readContract({
            address: NOX_COMPUTE_ADDRESS,
            abi: aclAbi,
            functionName: "isViewer",
            args: [encryptedAttribute, submitter.account.address],
          }),
          false,
        );
      }

      await assert.rejects(
        asSubmitter.write.publishDecision([0n, "0x"]),
        /DecisionNotEvaluated/,
      );

      await assert.rejects(
        asSubmitter.write.evaluateEncryptedPolicy([0n]),
        /NotOwnerOrAuditor/,
      );
      const evaluateHash = await firewall.write.evaluateEncryptedPolicy([0n]);
      await publicClient.waitForTransactionReceipt({ hash: evaluateHash });
      await assert.rejects(
        firewall.write.evaluateEncryptedPolicy([0n]),
        /DecisionAlreadyEvaluated/,
      );
      intent = await firewall.read.getIntent([0n]);
      const decision = intent.encryptedDecision as Handle<"uint256">;
      assert.equal((await nox.decrypt(decision)).value, 2n);
      const publicDecision = await strangerHandles.publicDecrypt(decision);
      assert.equal(publicDecision.value, 2n);
      assert.match(publicDecision.decryptionProof, /^0x[0-9a-f]+$/i);
      assert.equal(
        await publicClient.readContract({
          address: NOX_COMPUTE_ADDRESS,
          abi: aclAbi,
          functionName: "isPubliclyDecryptable",
          args: [decision],
        }),
        true,
      );
      assert.equal(
        await publicClient.readContract({
          address: NOX_COMPUTE_ADDRESS,
          abi: aclAbi,
          functionName: "isViewer",
          args: [decision, submitter.account.address],
        }),
        true,
      );
      assert.equal(
        await publicClient.readContract({
          address: NOX_COMPUTE_ADDRESS,
          abi: aclAbi,
          functionName: "isAllowed",
          args: [decision, submitter.account.address],
        }),
        false,
      );
      assert.equal(
        await publicClient.readContract({
          address: NOX_COMPUTE_ADDRESS,
          abi: aclAbi,
          functionName: "isViewer",
          args: [decision, stranger.account.address],
        }),
        true,
      );

      await assert.rejects(asStranger.write.publishDecision([0n, "0x00"]));
      const publishHash = await asStranger.write.publishDecision([
        0n,
        publicDecision.decryptionProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: publishHash });
      await assert.rejects(
        asStranger.write.publishDecision([0n, publicDecision.decryptionProof]),
        /DecisionAlreadySet/,
      );
      intent = await firewall.read.getIntent([0n]);
      assert.equal(intent.publicDecision, 2);
      assert.equal(
        await firewall.read.safeProposalAllowed([0n, actionCommitment]),
        false,
      );

      const [amountTwo, riskTwo, flagsTwo] = await Promise.all([
        submitterHandles.encryptInput(7_777n, "uint256", firewall.address),
        submitterHandles.encryptInput(70n, "uint256", firewall.address),
        submitterHandles.encryptInput(0n, "uint256", firewall.address),
      ]);
      const secondActionCommitment = await firewall.read.computeActionCommitment([
        owner.account.address,
        submitter.account.address,
        0n,
        keccak256("0x"),
        2n,
        actionDeadline,
      ]);
      await assert.rejects(
        asSubmitter.write.submitIntent([
          amountTwo.handle,
          amountTwo.handleProof,
          riskTwo.handle,
          riskTwo.handleProof,
          flagsTwo.handle,
          flagsTwo.handleProof,
          keccak256(stringToHex("audit-action-replay")),
          actionCommitment,
          actionDeadline,
        ]),
        /ActionCommitmentAlreadyUsed/,
      );
      await assert.rejects(
        asSubmitter.write.submitIntent([
          amountTwo.handle,
          amountTwo.handleProof,
          riskTwo.handle,
          riskTwo.handleProof,
          flagsTwo.handle,
          flagsTwo.handleProof,
          keccak256(stringToHex("audit-review-001")),
          secondActionCommitment,
          actionDeadline,
        ]),
        /AuditIdAlreadyUsed/,
      );
      const secondSubmitHash = await asSubmitter.write.submitIntent([
        amountTwo.handle,
        amountTwo.handleProof,
        riskTwo.handle,
        riskTwo.handleProof,
        flagsTwo.handle,
        flagsTwo.handleProof,
        keccak256(stringToHex("audit-review-002")),
        secondActionCommitment,
        actionDeadline,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: secondSubmitHash });
      const secondEvaluateHash = await firewall.write.evaluateEncryptedPolicy([1n]);
      await publicClient.waitForTransactionReceipt({ hash: secondEvaluateHash });
      let secondIntent = await firewall.read.getIntent([1n]);
      const secondDecision = secondIntent.encryptedDecision as Handle<"uint256">;
      await assert.rejects(
        asStranger.write.publishDecision([1n, publicDecision.decryptionProof]),
      );
      const secondPublicDecision = await strangerHandles.publicDecrypt(secondDecision);
      assert.equal(secondPublicDecision.value, 2n);
      const secondPublishHash = await asStranger.write.publishDecision([
        1n,
        secondPublicDecision.decryptionProof,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: secondPublishHash });
      secondIntent = await firewall.read.getIntent([1n]);

      assert.notEqual(intent.amount, secondIntent.amount);
      assert.deepEqual(
        {
          decision: intent.publicDecision,
          policyHash: intent.policyHash,
          policyVersion: intent.policyVersion,
          safeProposalAllowed: await firewall.read.safeProposalAllowed([0n, actionCommitment]),
        },
        {
          decision: secondIntent.publicDecision,
          policyHash: secondIntent.policyHash,
          policyVersion: secondIntent.policyVersion,
          safeProposalAllowed: await firewall.read.safeProposalAllowed([
            1n,
            secondActionCommitment,
          ]),
        },
      );
    },
  );

  it(
    "executes the Solidity policy at every strict comparison boundary",
    { timeout: 300_000 },
    async () => {
      const { viem } = await nox.connect();
      const publicClient = await viem.getPublicClient();
      const [owner, submitter] = await viem.getWalletClients();
      submitter.getAddresses = async () => [submitter.account.address];
      const firewall = await viem.deployContract("ConfidentialIntentFirewall");
      const handleClient = await createViemHandleClient(submitter, {
        gatewayUrl: handleGatewayUrl(),
        smartContractAddress: NOX_COMPUTE_ADDRESS,
        subgraphUrl: "https://example.com/subgraphs/id/none",
      });
      const asSubmitter = await viem.getContractAt(
        "ConfidentialIntentFirewall",
        firewall.address,
        { client: { wallet: submitter } },
      );
      const actionDeadline = (await publicClient.getBlock()).timestamp + 7_200n;
      const vectors = [
        { amount: 10_000n, risk: 50n, flags: 0n, expected: 1n },
        { amount: 10_001n, risk: 0n, flags: 0n, expected: 3n },
        { amount: 0n, risk: 51n, flags: 0n, expected: 2n },
        { amount: 0n, risk: 80n, flags: 0n, expected: 2n },
        { amount: 0n, risk: 81n, flags: 0n, expected: 3n },
        { amount: 0n, risk: 0n, flags: 1n, expected: 3n },
      ] as const;

      for (const [index, vector] of vectors.entries()) {
        const [amount, risk, flags] = await Promise.all([
          handleClient.encryptInput(vector.amount, "uint256", firewall.address),
          handleClient.encryptInput(vector.risk, "uint256", firewall.address),
          handleClient.encryptInput(vector.flags, "uint256", firewall.address),
        ]);
        const actionCommitment = await firewall.read.computeActionCommitment([
          owner.account.address,
          submitter.account.address,
          0n,
          keccak256("0x"),
          BigInt(index),
          actionDeadline,
        ]);
        const submitHash = await asSubmitter.write.submitIntent([
          amount.handle,
          amount.handleProof,
          risk.handle,
          risk.handleProof,
          flags.handle,
          flags.handleProof,
          keccak256(stringToHex(`boundary-audit-${index}`)),
          actionCommitment,
          actionDeadline,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: submitHash });
        const intentId = BigInt(index);
        const evaluateHash = await firewall.write.evaluateEncryptedPolicy([intentId], {
          account: owner.account,
        });
        await publicClient.waitForTransactionReceipt({ hash: evaluateHash });
        const encryptedIntent = await firewall.read.getIntent([intentId]);
        const decrypted = await handleClient.publicDecrypt(
          encryptedIntent.encryptedDecision as Handle<"uint256">,
        );
        assert.equal(decrypted.value, vector.expected);
        const publishHash = await asSubmitter.write.publishDecision([
          intentId,
          decrypted.decryptionProof,
        ]);
        await publicClient.waitForTransactionReceipt({ hash: publishHash });
        assert.equal((await firewall.read.getIntent([intentId])).publicDecision, Number(vector.expected));
        assert.equal(
          await firewall.read.safeProposalAllowed([intentId, actionCommitment]),
          vector.expected === 1n,
        );
        assert.equal(
          await firewall.read.safeProposalAllowed([
            intentId,
            keccak256(stringToHex(`wrong-action-${index}`)),
          ]),
          false,
        );
      }
    },
  );
});
