import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";
import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  zeroAddress,
  zeroHash,
} from "viem";

const connection = await hre.network.connect();

async function fixture() {
  const [owner, attacker] = await connection.viem.getWalletClients();
  const firewall = await connection.viem.deployContract("ConfidentialIntentFirewall");
  return { firewall, owner, attacker };
}

const loadFixture = () => connection.networkHelpers.loadFixture(fixture);

describe("ConfidentialIntentFirewall access controls", () => {
  it("binds public policy metadata to the compiled v1 thresholds", async () => {
    const { firewall } = await loadFixture();
    assert.equal(await firewall.read.policyVersion(), 1n);
    assert.equal(
      await firewall.read.policyHash(),
      keccak256(
        stringToHex(
          "CipherGate.Policy.v1|BLOCK:amount>10000||risk>80||flags>0|REVIEW:risk>50|PASS:otherwise",
        ),
      ),
    );
  });

  it("rejects zero and non-owner auditor changes", async () => {
    const { firewall, attacker } = await loadFixture();
    await assert.rejects(firewall.write.setAuditor([zeroAddress]), /InvalidAuditor/);
    await assert.rejects(
      firewall.write.setAuditor([attacker.account.address], { account: attacker.account }),
      /NotOwner/,
    );
  });

  it("rejects proposal checks for missing intents", async () => {
    const { firewall } = await loadFixture();
    await assert.rejects(
      firewall.read.safeProposalAllowed([999n, zeroHash]),
      /IntentMissing/,
    );
  });

  it("computes the documented chain-and-deployment-bound Safe action commitment", async () => {
    const { firewall, attacker } = await loadFixture();
    const safe = attacker.account.address;
    const to = "0x1111111111111111111111111111111111111111";
    const value = 123n;
    const dataHash = keccak256("0x1234");
    const nonce = 7n;
    const deadline = 1_800_000_000n;
    const domain = keccak256(stringToHex("CipherGate.SafeAction.v1"));
    const expected = keccak256(
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
        [domain, 31_337n, firewall.address, safe, to, value, dataHash, nonce, deadline],
      ),
    );

    assert.equal(
      await firewall.read.computeActionCommitment([
        safe,
        to,
        value,
        dataHash,
        nonce,
        deadline,
      ]),
      expected,
    );
  });
});
