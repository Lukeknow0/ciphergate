# Submission draft

> **Draft only — do not publish yet.** Replace every `PENDING` item and re-check all claims against [`EVIDENCE.md`](EVIDENCE.md) before submission.

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
- Five dependency-free policy vectors plus six strict comparison-boundary vectors in the Docker E2E source.
- Four contract access/metadata/commitment tests and a static ABI/action/event public-surface check.
- Nine browser Nox-adapter tests.
- Nine commitment-bound Safe adapter tests, including a fixed checksum oracle, all action-field mutations, range/deadline checks, deployed Safe code/live nonce, and UNKNOWN/REVIEW/BLOCK rejection.
- Official-stack E2E source for wallet/contract proof binding, ACL denial, replay rejection, public result proofs, malformed/cross-intent proofs, one-time operations, same-output REVIEW normalization, policy boundaries, and exact/mismatched commitments.
- Browser bundle wired to the official Nox handle client and viem for prepare/submit/evaluate/prove/publish/export, with opaque audit IDs and stale-session/race recovery.
- MIT license, provenance/third-party notices, pinned CI definition, `.nvmrc`, `.env.example`, and unexecuted Sepolia deploy/read-only-smoke helpers.
- Reviewed initial commit created in the local `main` repository; no public remote or release tag yet.

## Verified evidence as of 2026-07-17

- Official Hello World deployment: [`0x372Be24349fC9162fa45b85c84027059789B2EC0`](https://sepolia.etherscan.io/address/0x372Be24349fC9162fa45b85c84027059789B2EC0)
- Official encrypted deposit: [`0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138`](https://sepolia.etherscan.io/tx/0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138)
- Solidity compile: PASS
- Contract unit tests: PASS, 4/4
- Browser adapter tests: PASS, 9/9
- Safe adapter tests: PASS, 9/9
- Policy vectors: PASS, 5/5
- ABI/action/event surface check: PASS
- Explicitly unconfigured frontend preview build: PASS
- Explicitly unconfigured desktop/mobile browser QA: PASS (fail-closed controls, responsive layout, license links)
- Manifest/lock/installed dependency tree: PASS
- Lockfile metadata: PASS, 202/202 dependency entries contain official-registry `resolved` URLs and `integrity` digests
- Exact current revision: PASS, isolated official-registry `npm ci` followed by the complete `npm run check`

The canonical Hello World address is `0x372Be24349fC9162fa45b85c84027059789B2EC0`; a bytecode-identical duplicate deployment is deliberately omitted from the submission-facing evidence. The deposit receipt succeeded and targets the canonical address. These transactions demonstrate successful Nox onboarding, not a CipherGate deployment.

## Known limitations to disclose

- The official Nox E2E assertions have not executed because the official offchain stack still fails during startup, including after a controlled `No proxy` plus full Docker restart retry; no substitute images or mocks are claimed.
- Input encryption is a trusted-gateway flow: the SDK posts the encoded value to the Nox Handle Gateway over TLS. The project does not claim purely local/browser-side encryption.
- The proof-bound/replay/action-bound paths compile and have unit/static coverage, but their real Nox cryptographic/ACL paths require the blocked Docker run.
- The encrypted amount is a submitter-provided attribute. Nox proves which encrypted value was evaluated, but v1 has no oracle or attestation proving it equals the committed Safe native value.
- Commitment replay state is submitter-scoped to prevent copied-mempool-hash denial of service. Different accounts can create separate intents for the same Safe action because v1 does not verify a Safe-owner signature or allowlist; reviewers must confirm the JSON verifier, intent ID, and on-chain submitter.
- Transaction Builder JSON is advisory and cannot enforce the expected Safe nonce/deadline after download. A Guard/Module consuming the same commitment would be required for execution-time enforcement.
- The payload has not been imported through an actual Safe, and no Safe transaction has been signed or executed.
- The unconfigured frontend preview passed desktop/mobile browser QA, but it has not run against a live CipherGate address; production browser QA remains pending deployment.
- The exact current revision passed an isolated official-registry `npm ci` plus the complete aggregate check.
- The current online dependency audit still reports 16 development/transitive findings (0 critical, 2 high, 6 moderate, 8 low). They flow through the pinned Nox/Hardhat path and have no compatible direct fix; no blanket audit fix was applied because it could break the required integration stack.
- CipherGate has not been deployed to Sepolia, tagged as a release, or published; only a reviewed local source commit exists.

## Required before submission

- [x] Initialize a dedicated local Git repository.
- [x] Add license, attribution/notices, pinned CI definition, and deploy/read-only-smoke helpers.
- [x] Synchronize manifest/lock metadata and verify the installed dependency tree.
- [x] Run an official-registry isolated `npm ci` plus complete aggregate check for the exact release candidate.
- [x] Verify 202/202 lockfile dependency entries contain `resolved` and `integrity` metadata.
- [ ] Run the official Nox Docker E2E with zero failures; capture invalid/cross-proof, replay, ACL, same-output, and exact-action evidence.
- [x] Complete fail-closed desktop/mobile browser QA of the unconfigured preview.
- [x] Review the complete diff/secret scan and create a clean local source commit.
- [ ] Add an evidence export and screenshot manifest.
- [ ] With explicit approval, deploy CipherGate to Sepolia and record address/receipts.
- [ ] Browser-test the production build against the deployed address.
- [ ] Validate the advisory proposal through an actual Safe import path without signing or execution.
- [ ] Record and verify a maximum-four-minute demo.
- [ ] With explicit approval, publish the repository, video, social post, and DoraHacks submission.

## Final links

- Source repository: `PENDING`
- Live/demo URL: `PENDING`
- CipherGate Sepolia contract: `PENDING`
- Demo video: `PENDING`
- Social post: `PENDING`
- Evidence index: [`EVIDENCE.md`](EVIDENCE.md)
- Technical feedback: [`feedback.md`](feedback.md)
