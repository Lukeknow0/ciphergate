# Development Plan — CipherGate

**Event:** iExec WTF!! Hackathon Summer Edition
**Deadline:** 2026-08-02 05:59 CST
**Internal freeze:** 2026-08-01 12:00 CST
**Decision:** GO by explicit user decision on 2026-07-16
**Estimated effort:** 35–50 focused hours
**Cash budget:** 0; Sepolia test funds only

## 1. Product position

CipherGate is **not** a payment rail, wallet bot, or generalized chat agent. It is a deterministic pre-execution policy engine for treasury and Safe-compatible transaction intents:

1. A user prepares an intent containing sensitive amount, counterparty status, and risk/compliance attributes.
2. The frontend uses the official Nox handle client/Handle Gateway to obtain encrypted handles and proofs. The gateway receives the encoded input over TLS and is part of the trusted service boundary.
3. A Nox-enabled Solidity contract evaluates the encrypted fields against a versioned policy.
4. Only `PASS`, `REVIEW`, or `BLOCK`, the policy hash, an audit ID, and necessary transaction metadata become public.
5. A Safe adapter can produce a transaction proposal only after `PASS`; signing and execution remain explicit human actions.

This framing separates the project from the prior Vibe event’s payment apps: the new work is a reusable confidential policy-control layer around arbitrary treasury intents, not another confidential transfer product.

## 2. Existing assets versus new work

### Pre-existing concepts from Pharos PayFlow Guard

- `PASS` / `REVIEW` / `BLOCK` vocabulary.
- Deterministic reason codes and audit IDs.
- Human confirmation before value moves.
- Evidence-first packaging and explicit live/mock labels.

No Pharos branding will appear in the submission. Source files will not be copied by default; any reused code must be listed file-by-file in `ASSET_PROVENANCE.md` with its original commit and the new diff.

### New hackathon work

- Nox encrypted-input Solidity contract and policy evaluation.
- Nox ACL/decryption authorization model.
- Hardhat 3 + official Nox plugin test environment.
- Safe-compatible intent/proposal adapter.
- Browser operating frontend using the official Nox handle client and viem; the implementation now builds, while live-chain browser validation remains pending deployment.
- Local Nox and live ETH Sepolia end-to-end tests.
- Deployment and evidence scripts.
- `feedback.md`, provenance document, submission draft, and demo package.

## 3. P0 acceptance scope

| Area | Required result |
|---|---|
| Nox integration | Real official Nox SDK/plugin and encrypted Solidity types; no mock substituted for integration. |
| Contract | `ConfidentialIntentFirewall.sol` accepts encrypted fields and records a normalized decision handle plus policy/audit metadata. |
| Privacy | Public calldata/log/state inspection cannot recover submitted plaintext values. |
| Authorization | Unauthorized decryption and unauthorized viewer grants fail deterministically. |
| Protocol integration | Safe-compatible transaction proposal JSON is created only for an unexpired `PASS` whose domain-separated commitment exactly matches chain, the verifying CipherGate deployment, Safe, target, value, calldata hash, expected Safe nonce, and deadline. Commitment replay protection is submitter-scoped to avoid mempool-copy denial of service. This is an advisory adapter until a Guard/Module enforces it at execution. |
| Frontend | Connect wallet, create/encrypt intent, submit, display decision/evidence, and export an audit bundle. |
| Networks | Local official Nox stack for tests and an actual ETH Sepolia deployment for the demo. |
| Evidence | Commands, test output, versions, commit, contract address, transaction hashes, normalized receipts, and screenshot manifest. |
| Submission | Public repo, reproducible README, `feedback.md`, maximum-four-minute video, and X/DoraHacks copy. |

## 4. Technical shape

```text
Browser UI (integrated locally; live-chain validation pending)
  -> Nox SDK encryptInput(amount, riskScore, counterpartyFlags)
  -> ConfidentialIntentFirewall on ETH Sepolia
       - validate handle proofs
       - encrypted comparisons/select
       - policyVersion + policyHash
       - ACL: owner / optional auditor / contract
       - decision handle + auditId
       - action commitment + maximum-seven-day deadline
  -> public normalized-decision decryption + Nox proof
  -> on-chain proof verification and PASS / REVIEW / BLOCK receipt
  -> exact-action, nonce/deadline-aware PASS-only Safe proposal adapter
  -> evidence bundle (no signing or execution)
```

Planned repository shape:

```text
contracts/
  ConfidentialIntentFirewall.sol
frontend/
  src/
scripts/
  deploy.ts
  sepolia-smoke.ts
  export-evidence.ts
test/
  policy-boundaries.test.ts
  privacy-nonleak.test.ts
  acl-denial.test.ts
  safe-adapter.test.ts
evidence/
docs/
README.md
ASSET_PROVENANCE.md
EVIDENCE.md
SUBMISSION_DRAFT.md
DEMO_SCRIPT.md
feedback.md
```

## 5. Machine-verifiable tests

1. **Policy boundaries:** below threshold → `PASS`; review band → `REVIEW`; high amount or blocked counterparty flag → `BLOCK`.
2. **Same-output privacy:** submit two different sensitive inputs that both evaluate to `REVIEW`; normalize receipts and prove the public policy output is identical while neither plaintext appears in calldata, logs, stored public fields, or the exported bundle. Handles/audit IDs may differ and are excluded from normalized equality.
3. **Unauthorized decrypt:** an attacker account requests decryption of a protected handle and receives the expected deterministic ACL denial; no plaintext is returned.
4. **Unauthorized viewer grant:** a non-owner tries to add an auditor/viewer and the contract reverts with a stable custom error.
5. **Invalid proof:** malformed or cross-contract handle proof is rejected.
6. **Commitment-bound adapter:** Safe proposal construction succeeds only for an exact, live `PASS` commitment and rejects UNKNOWN/REVIEW/BLOCK, changed transaction fields, expired deadlines, zero addresses, uint overflows, missing Safe bytecode, and nonce mismatch.
7. **Sepolia smoke:** deploy, submit one encrypted intent, obtain the decision, and save contract address, transaction hash, chain ID, block, versions, and command output.

Every test must have one documented command and a non-zero failure exit when the expected invariant is violated.

## 6. Minimal validation first

Before UI work, spend at most four hours on this gate:

1. Finish the official Hello World journey with a user-approved Sepolia wallet.
2. Attempt the event-linked starter. If it remains unavailable, bootstrap only from the official Nox Hardhat guide/plugin and record the broken starter in `feedback.md`.
3. Pin Node, Docker, Hardhat, plugin, SDK, and contract package versions.
4. Run one official encrypted input/decryption test locally.
5. Add one minimal ACL-denial test.

Continue only if both the happy-path encryption/decryption and negative ACL test pass without mock behavior.

Current gate status (2026-07-18): the official Hello World onboarding path remains separate evidence. CipherGate is deployed on Sepolia at `0xe0df8484d6986e1ef9b4ef04a263d72708560b71`; production Intent #0 completed successful submit/evaluate/publish receipts and reached proof-published `PASS`. Its checksummed proposal imported through Safe Transaction Builder as `1 uploaded`, with no batch creation, signature, or execution. The official Docker-backed Nox E2E exits `0` with two `✔` cases and `2 passing (2 nodejs)`, while the aggregate checks, production build, read-only Sepolia smoke, isolated `npm ci` reproduction, documentation links, evidence hashes, and secret/PII scan pass. The temporary Docker proxy change used during earlier image acquisition was restored to `Same as host proxy`; the final Nox run left no containers. The online npm audit disclosure remains 16 development/transitive findings (0 critical, 2 high, 6 moderate, 8 low), with no blanket fix applied. Reviewed source and evidence commits exist locally. Public repository/CI, source publication, demo upload, social post, and final DoraHacks submission still require explicit approval. See `STATUS.md` and `EVIDENCE.md` for the authoritative snapshot.

## 7. Execution schedule through the deadline

| Date | Deliverable and measurable exit condition |
|---|---|
| Jul 16 | Registration advanced to organizer questions; obtain email and approved Hello World wallet path. Plan and project directory created. |
| Jul 17 | Complete Hello World; pin tool versions; local official Nox happy-path and ACL-denial tests both pass. |
| Jul 18 | Write threat model, public/private field table, decision truth table, and contract interface. |
| Jul 19 | Implement encrypted input validation, policy version/hash, audit ID, and decision storage. Unit compile clean. |
| Jul 20 | Implement encrypted comparisons/select and all boundary tests. |
| Jul 21 | Implement ACL/viewer rules, invalid-proof rejection, and unauthorized-decryption evidence. |
| Jul 22 | Implement same-output privacy test plus automated plaintext scan of calldata/logs/state/evidence. |
| Jul 23 | Build frontend wallet connection, intent form, encryption, submission, and result state machine. |
| Jul 24 | Complete decision/evidence UI and error states; no chat interface. |
| Jul 25 | Implement Safe-compatible proposal adapter and PASS-only gating tests. |
| Jul 26 | Run complete local E2E twice from a clean checkout; target one-command setup. |
| Jul 27 | With explicit approval, obtain Sepolia funds and deploy; run live smoke test and save hashes. |
| Jul 28 | Finish README, deployment guide, `ASSET_PROVENANCE.md`, `feedback.md`, and evidence index. |
| Jul 29 | Browser QA, responsive frontend QA, clean-install verification, and screenshot manifest. |
| Jul 30 | Draft submission and record a ≤4-minute demo rehearsal; all claims linked to evidence. |
| Jul 31 | Fix only P0 defects; freeze dependencies and commit. No new features. |
| Aug 1 | Internal freeze by 12:00 CST; with explicit approval publish repo/video/X post and submit at least 12 hours before deadline. |

## 8. Stop-loss lines

- Stop after four environment hours if the official Nox plugin/local stack cannot produce a real encrypted happy path plus ACL denial.
- Stop UI work if the core privacy and authorization tests are not green after 12 total development hours.
- Do not call the JSON adapter execution enforcement: Safe import must be validated, and only a future Guard/Module consuming the same commitment can enforce the gate when a Safe executes.
- Drop optional features before weakening evidence, tests, or reproducibility.
- No cash spend, mainnet action, private key handling, automatic signing, or automatic execution.
- Wallet signature, faucet, Sepolia deployment, public repository, X post, video publication, and final DoraHacks submission still require explicit user approval at the moment of action.

## 9. Honest return expectation

- Gross prize range: USD-denominated $0–$750; base case is $0.
- Planned input: 35–50 focused hours, front-loaded into a four-hour technical feasibility gate.
- Payment asset, net amount, hosting treatment, and payment time remain unverified and are accepted as user-directed project risk.
- This is a high-variance competition, not stable income. The reusable value is the Nox/Safe privacy-control implementation and its evidence harness.

## 10. AI leverage and human controls

AI will accelerate contract/test scaffolding, boundary-case generation, evidence normalization, frontend implementation, documentation, and demo scripting. Human review remains mandatory for encrypted-type semantics, ACL permissions, security claims, wallet signing, deployment, public claims, and final submission.
