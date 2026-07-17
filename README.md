# CipherGate — Confidential Intent Policy Firewall

CipherGate is a pre-execution policy layer for treasury intents. It uses iExec Nox encrypted values to evaluate an amount, risk score, and counterparty flags before an exact, precommitted Safe action may be exported for human review.

> **Current status (2026-07-17): security-hardened local integration build with the official Docker-backed Nox E2E passing; not a live CipherGate deployment or submission-ready release.** The contract and current non-Docker unit/static/preview-build checks are green, and `npm run test:nox` now exits zero with two green cases and `2 passing (2 nodejs)` against the official Nox stack. CipherGate itself is still not deployed on Sepolia, the production browser flow has not run against a live CipherGate, the advisory Safe JSON has not been imported into an actual Safe, and no public release exists. The separate official Nox Hello World deployment and encrypted deposit smoke test are live on Sepolia.

## What exists today

- `contracts/ConfidentialIntentFirewall.sol` validates Nox handles/proofs, evaluates an immutable policy v1, exposes only the normalized decision for public decryption, and verifies the resulting Nox proof before opening an exact-action PASS gate.
- The fixed policy is identified by `policyVersion = 1` and `policyHash = 0xd9b7aa2496e739c17db5c0c551eeb5089cb8ec567dcb61f6e5290ea0ddf05802`; there is no policy mutation function.
- Each intent binds a domain-separated commitment over chain ID, the verifying CipherGate deployment, Safe address, destination, value, calldata hash, expected Safe nonce, and deadline. The deadline must be in the future and no more than seven days away.
- Submission rejects a reused action commitment or audit ID for the same submitter, and rejects an exact encrypted-input bundle replay. Action-commitment uniqueness is deliberately submitter-scoped so another address cannot copy a pending commitment and consume a global marker. Evaluation and publication are each one-time operations, and private-attribute access is fixed to the owner and submission-time auditor.
- `test/nox-e2e.test.ts` passes against the official Docker-backed Nox stack. Its two cases exercise real wallet/contract proof binding, private-attribute ACL negatives, proof retrieval and malformed/cross-intent proof rejection, action/audit/input replay rejection, one-time evaluation/publication, exact/mismatched action gating, and six strict Solidity comparison boundaries.
- The Hardhat shared RPC helper exposes multiple accounts from `getAddresses()`. In the E2E harness, each submitter wallet client's `getAddresses()` is therefore bound to that client's `account.address`, ensuring the Nox handle proof is made for the intended submitter. This is a test-environment wallet adapter, not a production mock of Nox or CipherGate.
- `frontend/` uses the official Nox handle client and viem for wallet connection, three handle/proof requests, submission, encrypted evaluation, public-decision proof retrieval/publication, and PASS-only Safe batch export. The unconfigured preview build is tested; a production build requires a non-zero deployed CipherGate address.
- `frontend/src/safeProposal.js` verifies deployed Safe code and the exact live `nonce()`, recomputes the action commitment before export, and emits the checksummed Safe Transaction Builder v1 shape. The JSON is advisory: it does not enforce execution and is not a Safe Guard or Module.
- The canonical `ConfidentialPiggyBank` tutorial contract is deployed on Sepolia at [`0x372Be2…B2EC0`](https://sepolia.etherscan.io/address/0x372Be24349fC9162fa45b85c84027059789B2EC0). A bytecode-identical duplicate at [`0xfd574b…dae4`](https://sepolia.etherscan.io/address/0xfd574bd565eda11ced8e92b0981806857e12dae4) is recorded only as deployment history and is not used by development or submission materials. This is onboarding evidence, not the CipherGate product deployment.

## Fixed policy v1

| Condition | Decision code | Normalized decision |
|---|---:|---|
| `amount > 10,000`, `riskScore > 80`, or `counterpartyFlags > 0` | `3` | `BLOCK` |
| Otherwise, `riskScore > 50` | `2` | `REVIEW` |
| Otherwise | `1` | `PASS` |

The Solidity evaluator keeps the attributes private and marks only the normalized decision code for public decryption. `publishDecision()` accepts a Nox decryption proof rather than a caller-selected enum; NoxCompute verifies that proof before the on-chain gate can open. Any account may relay a valid proof, but no account may choose the decision.

## Public and protected data

| Data | Current treatment |
|---|---|
| Clear input before handle creation | Encoded by the SDK and sent over TLS to the trusted Nox Handle Gateway `/v0/secrets` endpoint; encryption is not purely local-browser cryptography |
| Amount, risk score, counterparty flags | Submitted as Nox handles/proofs and stored as encrypted handles |
| Encrypted decision code | Marked publicly decryptable only after encrypted evaluation; returned with a Nox proof |
| Submitter and submission-time auditor addresses, audit ID, fixed policy version/hash, action commitment/deadline, timestamp | Public chain metadata |
| Public `PASS` / `REVIEW` / `BLOCK` enum | Derived on-chain only from a valid Nox public-decryption proof |
| Safe signature and execution | Out of scope; never performed or enforced by CipherGate's JSON adapter |

“Confidential” here means protected from public on-chain observers and unauthorized accounts. The Nox Handle Gateway is inside the trusted computing/service boundary because it receives the encoded input during `encryptInput`. The encrypted amount is submitter-provided; v1 has no oracle proving that it equals the committed Safe value. See [the threat model](docs/THREAT_MODEL.md) for the complete trust boundary and residual risks.

## Repository map

```text
contracts/   CipherGate contract and the separate Hello World compatibility copy
frontend/    Browser Nox/contract flow and advisory PASS-only Safe batch exporter
scripts/     Build, policy/ABI/doc checks, and unexecuted Sepolia deploy/smoke helpers
test/        Hardhat ACL, Nox E2E, policy-vector, frontend, and Safe-adapter tests
docs/        Threat model
```

## Reproduce the current checks

Prerequisites:

- Node.js `22.22.3` and npm `10.9.8` (also pinned in `.nvmrc`, `package.json`, and `package-lock.json`)
- Docker Desktop only for `npm run test:nox`

From a clean checkout:

```bash
npm ci
npm run compile
npm run test:unit
npm run test:frontend
npm run test:safe
npm run vectors
npm run test:surface
npm run test:docs
npm run build:frontend:preview
npm run test:nox
```

`npm run build:frontend` is the release build and intentionally fails until `CIPHERGATE_CONTRACT_ADDRESS` is a non-zero deployed address. `npm run test:nox` starts the official Nox Docker stack and performs the real encryption/decryption, ACL, proof, replay, publication, boundary, and exact-action tests; it is intentionally separate from the fast checks. The current run exits zero with two checkmarks and `2 passing (2 nodejs)`.

### Verification snapshot

| Check | Result on 2026-07-17 | Evidence |
|---|---|---|
| Solidity compile (`0.8.35`, optimizer, `viaIR`) | PASS | [E-008](EVIDENCE.md#e-008--ciphergate-compile-and-pinned-toolchain) |
| Contract access/metadata/commitment unit tests | PASS, 4/4 | [E-009](EVIDENCE.md#e-009--local-non-docker-test-snapshot) |
| Browser Nox adapter unit tests | PASS, 9/9 | [E-009](EVIDENCE.md#e-009--local-non-docker-test-snapshot) |
| Commitment-bound Safe batch adapter | PASS, 9/9 | [E-009](EVIDENCE.md#e-009--local-non-docker-test-snapshot) |
| Policy boundary vectors | PASS, 5/5 | [E-009](EVIDENCE.md#e-009--local-non-docker-test-snapshot) |
| ABI/action-bound public-surface check | PASS | [E-009](EVIDENCE.md#e-009--local-non-docker-test-snapshot) |
| Unconfigured frontend preview build | PASS | [E-009](EVIDENCE.md#e-009--local-non-docker-test-snapshot) |
| Unconfigured desktop/mobile browser QA | PASS; fail-closed controls, no horizontal overflow, license links served | [E-014](EVIDENCE.md#e-014--proof-bound-decision-and-browser-integration) |
| Official Nox Docker E2E | PASS, 2/2 (`2 passing (2 nodejs)`) | [E-010](EVIDENCE.md#e-010--nox-docker-e2e) |
| Dependency tree and lockfile consistency | PASS (`npm ls --depth=0`) | [E-011](EVIDENCE.md#e-011--dependency-lock-synchronization) |
| Lockfile artifact metadata | PASS, 202/202 dependency entries contain `resolved` and `integrity` | [E-011](EVIDENCE.md#e-011--dependency-lock-synchronization) |
| Official npm-registry isolated `npm ci` + aggregate check for this exact revision | PASS | [E-011](EVIDENCE.md#e-011--dependency-lock-synchronization) |
| Online `npm audit` | REVIEW: 16 development/transitive findings (0 critical, 2 high, 6 moderate, 8 low); no compatible direct fix through the pinned Nox/Hardhat path, so no blanket fix was applied | [E-011](EVIDENCE.md#e-011--dependency-lock-synchronization) |
| CipherGate Sepolia deployment | NOT PERFORMED | [E-012](EVIDENCE.md#e-012--ciphergate-live-deployment) |
| Local Git repository / reviewed source commit | PASS locally; no remote or release tag | [E-013](EVIDENCE.md#e-013--source-control-and-release-evidence) |

## Live onboarding evidence

- Sepolia funding transaction: [`0x85f673…1d98`](https://sepolia.etherscan.io/tx/0x85f673a2f936bee452ef5945a263c8567d106b1e360c2ca179e0f81388e11d98)
- Official Hello World deployment: [`0x3c1089…5840`](https://sepolia.etherscan.io/tx/0x3c10890fbb8c0d01ad8cf7f9227509f4c41421042ab44519267cfcad149d5840)
- Nox encrypted deposit: [`0x3592f3…b138`](https://sepolia.etherscan.io/tx/0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138)

The encrypted deposit receipt has `status: 0x1` and targets the canonical `0x372Be2…B2EC0` contract. The wallet's current Sepolia nonce is `3`; the red MetaMask “failed” item was local activity history rather than an additional failed on-chain transaction. These transactions prove the official Hello World journey. They do **not** prove that CipherGate itself is deployed or end-to-end validated.

## Submission documents

- [Evidence index](EVIDENCE.md)
- [Current status and blockers](STATUS.md)
- [Development plan](DEVELOPMENT_PLAN.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Demo script](DEMO_SCRIPT.md)
- [Submission draft](SUBMISSION_DRAFT.md)
- [Asset provenance](ASSET_PROVENANCE.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [iExec Nox feedback](feedback.md)
- [Registration status](REGISTRATION_STATUS.md)

No public repository, CI run, video, social post, CipherGate deployment, Safe import/signature/execution, or final hackathon submission has been performed. A reviewed initial commit exists in the local `main` repository; it has not been tagged or published.
