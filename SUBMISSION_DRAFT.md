# Submission draft

> **Draft for DoraHacks form entry — do not submit yet.** Public release links are populated; re-check all claims against [`EVIDENCE.md`](EVIDENCE.md) before final submission.

## Project name

CipherGate — Confidential Intent Policy Firewall

## One-line pitch

CipherGate uses iExec Nox to evaluate sensitive treasury intent attributes and bind a proof-verified PASS to an exact Safe action before an advisory proposal payload may be exported, without placing the amount, risk score, or counterparty flags in plaintext on-chain.

## Problem

Treasury policy checks often require commercially sensitive inputs. Publishing amounts, risk scores, or counterparty status before a proposal is approved leaks information; moving the check fully off-chain makes its authorization and audit trail harder to inspect. A generic “PASS” is also insufficient if it can be reused for a different transaction.

## Solution

CipherGate separates confidential evaluation from signing and execution:

1. The browser verifies deployed Safe code and its exact live nonce, then computes a domain-separated commitment over chain ID, the verifying CipherGate deployment, Safe, destination, value, calldata hash, expected nonce, and a maximum-seven-day deadline.
2. The official handle client encodes the amount/risk/flags and sends them over TLS to the trusted Nox Handle Gateway, which returns handles/proofs bound to the wallet and CipherGate contract.
3. The contract validates those proofs, rejects same-submitter action-commitment/audit-ID replay and exact handle-bundle replay, then stores encrypted values plus the action commitment, deadline, submission-time auditor, and fixed policy metadata. The submitter scope prevents an unrelated account from copying a pending commitment and consuming a global marker.
4. Immutable policy v1 produces an encrypted code for PASS, REVIEW, or BLOCK. There is no admin policy setter.
5. The contract marks only the normalized decision for public decryption; any account may relay its proof, but `publishDecision()` derives the enum only after NoxCompute verifies it for the current handle.
6. The adapter refuses to export a Safe Transaction Builder batch unless the on-chain decision is PASS, the deadline is live, the Safe nonce is still exact, and every action field recomputes the stored commitment.
7. The exported JSON is advisory. Safe import, signer review, signing, and execution stay explicit and outside CipherGate; no Guard or Module enforcement is claimed.

## Fixed policy v1

- Version: `1`
- Hash: `0xd9b7aa2496e739c17db5c0c551eeb5089cb8ec567dcb61f6e5290ea0ddf05802`
- BLOCK when `amount > 10,000`, `riskScore > 80`, or `counterpartyFlags > 0`
- Otherwise REVIEW when `riskScore > 50`
- Otherwise PASS

## iExec Nox usage

- `externalEuint256` plus proof validation with `Nox.fromExternal`
- encrypted comparisons with `Nox.gt`
- encrypted branching with nested `Nox.select`
- contract/owner/submission-time-auditor ACLs with `Nox.allowThis` and `Nox.allow`
- normalized-result disclosure with `Nox.allowPublicDecryption`
- on-chain result binding with `Nox.publicDecrypt(handle, proof)`
- official `@iexec-nox/nox-hardhat-plugin` and `@iexec-nox/handle` integration path

## What is implemented

- Compiling Solidity contract with encrypted inputs, fixed versioned policy metadata, action/deadline binding, ACL grants, replay checks, one-time evaluation/publication, and proof-derived public decisions.
- Five dependency-free policy vectors plus six passing strict comparison-boundary vectors on the official Nox Docker stack.
- Four contract access/metadata/commitment tests and a static ABI/action/event public-surface check.
- Nine browser Nox-adapter tests.
- Nine commitment-bound Safe adapter tests, including a fixed checksum oracle, all action-field mutations, range/deadline checks, deployed Safe code/live nonce, and UNKNOWN/REVIEW/BLOCK rejection.
- Passing official-stack E2E for wallet/contract proof binding, attribute confidentiality and ACL negatives, replay rejection, proof-bound public decisions, malformed/cross-intent proofs, one-time evaluation/publication, same-output REVIEW normalization, six strict Solidity policy boundaries, and exact/mismatched action gates.
- Browser bundle wired to the official Nox handle client and viem for prepare/submit/evaluate/prove/publish/export, with opaque audit IDs and stale-session/race recovery.
- MIT license, provenance/third-party notices, pinned CI definition, `.nvmrc`, `.env.example`, and Sepolia deploy/read-only-smoke helpers; the read-only smoke helper has run against the live address.
- Live Sepolia Intent #0 completed submit, encrypted evaluation, and proof-bound publication with successful receipts and an on-chain `PASS`.
- The exact checksummed batch imported through Safe Transaction Builder as `1 uploaded`; fields were inspected without creating a batch, signing, or execution.
- Public source repository, passing CI/Pages deployment, `v1.0.0-hackathon` demo release, and the required [X post with demo video](https://x.com/mr_luhs/status/2078331526593577406) are available; DoraHacks submission remains pending.

## Verified evidence as of 2026-07-18

- Official Hello World deployment: [`0x372Be24349fC9162fa45b85c84027059789B2EC0`](https://sepolia.etherscan.io/address/0x372Be24349fC9162fa45b85c84027059789B2EC0)
- Official encrypted deposit: [`0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138`](https://sepolia.etherscan.io/tx/0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138)
- CipherGate deployment: [`0xe0df8484d6986e1ef9b4ef04a263d72708560b71`](https://sepolia.etherscan.io/address/0xe0df8484d6986e1ef9b4ef04a263d72708560b71), deployment receipt [`0x515098f6…e15d078`](https://sepolia.etherscan.io/tx/0x515098f6f1894202bf895c4f3af909b5493d4733611ec06c0fcdd0db2e15d078), `status = 1`
- Source verification: [Sourcify creation and runtime `exact_match`](https://sourcify.dev/server/v2/contract/11155111/0xe0df8484d6986e1ef9b4ef04a263d72708560b71)
- Live PASS: submit [`0xf40e087b…5c605bd`](https://sepolia.etherscan.io/tx/0xf40e087b798a53aa48d686faa074db648f3374d9876a1e67976a6b11f5c605bd), evaluate [`0xe3f6406b…6771e50`](https://sepolia.etherscan.io/tx/0xe3f6406b36d44ed33105a913e2d49e54fec7a4ed22935972693d5833e6771e50), publish [`0x5d1a812d…ea19dfd`](https://sepolia.etherscan.io/tx/0x5d1a812da0a4258b31e912549754581fa46f09b9f766e02d5d3973299ea19dfd); all `status = 1`
- Safe import: `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864`, `1 uploaded`, checksum and exact action fields matched; no Safe signature or execution
- Solidity compile: PASS
- Contract unit tests: PASS, 4/4
- Browser adapter tests: PASS, 9/9
- Safe adapter tests: PASS, 9/9
- Policy vectors: PASS, 5/5
- Official Nox Docker E2E: PASS, fresh exit `0`; two `✔` cases and `2 passing (2 nodejs)`
- ABI/action/event surface check: PASS
- Explicitly unconfigured frontend preview build: PASS
- Explicitly unconfigured desktop/mobile browser QA: PASS (fail-closed controls, responsive layout, license links)
- Manifest/lock/installed dependency tree: PASS
- Lockfile metadata: PASS, 202/202 dependency entries contain official-registry `resolved` URLs and `integrity` digests
- Exact current revision: PASS, isolated official-registry `npm ci` followed by the complete `npm run check`

The canonical Hello World address is `0x372Be24349fC9162fa45b85c84027059789B2EC0`; a bytecode-identical duplicate deployment is deliberately omitted from the submission-facing evidence. The deposit receipt succeeded and targets that onboarding contract. The CipherGate product is the separate `0xe0df8484d6986e1ef9b4ef04a263d72708560b71` deployment above.

## Known limitations to disclose

- The official Nox Docker E2E now passes locally. Hardhat shared-RPC wallet clients expose all accounts through `getAddresses()`, while `@iexec-nox/handle` selects the first, so the tests bind the submitter client's result to its configured `submitter.account.address`. This is test-environment account selection, not a cryptographic or product mock.
- Input encryption is a trusted-gateway flow: the SDK posts the encoded value to the Nox Handle Gateway over TLS. The project does not claim purely local/browser-side encryption.
- The passing local official-stack run validates broader negative proof/ACL/replay/action-bound paths in the Docker environment. The separate live Sepolia flow demonstrates one production PASS path; it does not repeat every Docker negative case on-chain.
- The encrypted amount is a submitter-provided attribute. Nox proves which encrypted value was evaluated, but v1 has no oracle or attestation proving it equals the committed Safe native value.
- Commitment replay state is submitter-scoped to prevent copied-mempool-hash denial of service. Different accounts can create separate intents for the same Safe action because v1 does not verify a Safe-owner signature or allowlist; reviewers must confirm the JSON verifier, intent ID, and on-chain submitter.
- Transaction Builder JSON is advisory and cannot enforce the expected Safe nonce/deadline after download. A Guard/Module consuming the same commitment would be required for execution-time enforcement.
- The payload imported successfully through the actual Safe Transaction Builder page, but `Create Batch` was not clicked and no Safe transaction was signed or executed.
- The unconfigured frontend preview passed desktop/mobile browser QA, and the production browser completed the live PASS/export path. Responsive production QA across multiple viewports was not repeated.
- The exact current revision passed an isolated official-registry `npm ci` plus the complete aggregate check.
- The current online dependency audit still reports 16 development/transitive findings (0 critical, 2 high, 6 moderate, 8 low). They flow through the pinned Nox/Hardhat path and have no compatible direct fix; no blanket audit fix was applied because it could break the required integration stack.
- CipherGate is deployed and Sourcify-verified on Sepolia. The source is public, Pages is live, the tagged demo release is published, and the required [X post with demo video](https://x.com/mr_luhs/status/2078331526593577406) is live; final DoraHacks submission remains pending.
- The successful Hello World Sepolia contract and deposit are onboarding evidence only; that address is not CipherGate.

## Required before submission

- [x] Initialize a dedicated local Git repository.
- [x] Add license, attribution/notices, pinned CI definition, and deploy/read-only-smoke helpers.
- [x] Synchronize manifest/lock metadata and verify the installed dependency tree.
- [x] Run an official-registry isolated `npm ci` plus complete aggregate check for the exact release candidate.
- [x] Verify 202/202 lockfile dependency entries contain `resolved` and `integrity` metadata.
- [x] Run the official Nox Docker E2E with zero failures; capture invalid/cross-proof, replay, ACL, same-output, exact-action, and strict-boundary evidence (`2 passing (2 nodejs)`).
- [x] Complete fail-closed desktop/mobile browser QA of the unconfigured preview.
- [x] Review the complete diff/secret scan and create a clean local source commit.
- [x] Add a persisted Safe JSON, exact-field check, and screenshot manifest. A generalized automated evidence-export script remains optional future work.
- [x] With explicit approval, deploy CipherGate to Sepolia and record address/receipts.
- [x] Browser-test the production build against the deployed address through one complete PASS flow.
- [x] Validate the advisory proposal through an actual Safe import path without signing or execution.
- [x] Publish source, CI/Pages frontend, and verified 3:32 demo release.
- [x] With explicit approval, publish the required social post with attached demo video and repository link.
- [ ] With explicit approval immediately before the final action, complete DoraHacks submission.

## Final links

- Source repository: [github.com/Lukeknow0/ciphergate](https://github.com/Lukeknow0/ciphergate)
- Live/demo URL: [lukeknow0.github.io/ciphergate](https://lukeknow0.github.io/ciphergate/)
- CipherGate Sepolia contract: [`0xe0df8484d6986e1ef9b4ef04a263d72708560b71`](https://sepolia.etherscan.io/address/0xe0df8484d6986e1ef9b4ef04a263d72708560b71)
- Demo video: [v1.0.0-hackathon release asset](https://github.com/Lukeknow0/ciphergate/releases/tag/v1.0.0-hackathon)
- Social post: [@mr_luhs/status/2078331526593577406](https://x.com/mr_luhs/status/2078331526593577406) (3:32 demo video attached)
- Evidence index: [`EVIDENCE.md`](EVIDENCE.md)
- Technical feedback: [`feedback.md`](feedback.md)
