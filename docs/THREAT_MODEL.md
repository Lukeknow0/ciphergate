# CipherGate threat model (P0)

**Updated:** 2026-07-18 CST
**Applies to:** the public Sepolia hackathon release; not an audited production system

## Assets and security goals

- Keep amount, risk score, and counterparty flags out of plaintext calldata, events, and Solidity state.
- Reject malformed, cross-wallet, or cross-contract encrypted-input proofs through `Nox.fromExternal`.
- Restrict attribute decryption/computation to the contract, owner, and auditor ACLs established at submission time.
- Expose only the normalized decision, together with a Nox proof that the contract can verify before updating public state.
- Bind each intent to a domain-separated Safe action commitment covering chain, the verifying CipherGate deployment, Safe, destination, value, calldata hash, expected Safe nonce, and a maximum-seven-day deadline; reject reuse by the same submitter without exposing a global replay marker that another address could front-run.
- Prevent the browser adapter from exporting any action other than the exact, unexpired commitment for a proof-verified PASS.
- Reject reuse of a submitter's audit ID or exact encrypted-input-handle bundle.
- Never sign or execute a Safe transaction inside CipherGate.

## Public by design

- Contract and wallet addresses, transaction timing, gas, calldata handle/proof bytes, and encrypted handles.
- Intent ID, submitter and submission-time auditor addresses, audit ID hash, fixed policy version/hash, action commitment/deadline, and creation timestamp.
- The normalized public decision and its public-decryption proof after encrypted evaluation.
- Contract bytecode and all policy thresholds embedded in it.

Audit IDs must therefore be opaque random identifiers; putting a customer name or business context into an audit ID would leak it publicly.

## Trust boundaries

| Component or role | Trusted for |
|---|---|
| Nox Handle Gateway | Receiving encoded clear inputs over TLS, returning wallet/contract-bound handles and proofs, and not retaining or disclosing inputs outside its stated design |
| Nox contracts and off-chain stack | Proof validation, encrypted operations, ACL enforcement, and correct decryption |
| Contract owner | Auditor administration, attribute access, and encrypted evaluation |
| Auditor | Attribute access and encrypted evaluation |
| Submitter browser | Correctly forming policy attributes and the action commitment before encryption, using a fresh opaque audit ID, and protecting wallet approval context |
| Proposal consumer / Safe | Independently validating the expected nonce/deadline, chain, CipherGate verifier, Safe address, target, calldata, value, and current policy outcome before signing |

The owner and auditor are privileged readers. The Handle Gateway receives encoded plaintext when `encryptInput` posts to `/v0/secrets`. CipherGate is confidential from public on-chain observers and unauthorized accounts, not from those roles or the trusted gateway/service boundary.

## Current authorization behavior

- On submission, the contract, owner, and then-current auditor receive Nox access to the three private attributes.
- On evaluation, the contract, owner, and then-current auditor receive computational access to the encrypted decision; the normalized decision is also marked publicly decryptable so a proof can be produced and verified on-chain.
- Changing the auditor does not revoke access already granted to the old auditor and does not retroactively grant the new auditor access to old intents.
- The v1 policy thresholds and policy hash are compile-time constants; there is no metadata-only policy update path.
- An intent can be evaluated and published only once. Its PASS export window closes at its committed deadline.
- The contract has no owner rotation, timelock, multisig requirement, emergency pause, or per-intent revocation.

## Abuse cases and expected controls

1. **Malformed or incorrectly bound proof:** `Nox.fromExternal` rejects it in the passing official Nox Docker E2E, including wrong-wallet and wrong-contract submissions.
2. **Non-owner auditor change:** custom `NotOwner` revert; covered by the local unit tests. Policy v1 cannot be changed after deployment.
3. **Zero auditor:** custom `InvalidAuditor` revert; covered by the local unit tests.
4. **Unauthorized or repeated evaluation:** custom `NotOwnerOrAuditor` / `DecisionAlreadyEvaluated` reverts. **Invalid publication:** `publishDecision()` accepts no enum, checks public-decryptability, and verifies the supplied Nox proof for the current decision handle.
5. **Proposal construction for non-PASS, wrong action, or expired action:** the contract gate requires PASS, exact commitment equality, and a live deadline; the browser recomputes the commitment before export.
6. **Unauthorized attribute decryption:** the passing official-stack E2E confirms that the submitter cannot privately decrypt the protected amount and that the amount is not publicly decryptable. It also verifies owner viewer access and submitter viewer denial for all three attributes. The normalized decision is intentionally public; the attributes are not.
7. **Sensitive plaintext in events:** the ABI/event surface check rejects sensitive attribute field names. This is a narrow static check, not a complete trace/storage privacy proof.
8. **Proof/identifier replay:** reuse of the same submitter-scoped audit ID or exact three-handle bundle reverts. This does not prevent a submitter from encrypting the same plaintext again into fresh handles.

## Proof-bound public decision

`evaluateEncryptedPolicy()` computes an encrypted code and calls `Nox.allowPublicDecryption(code)`. The SDK returns the normalized value together with a public-decryption proof. `publishDecision()` passes that proof and the intent's current decision handle to `Nox.publicDecrypt`; only the verified numeric code is converted to the public enum.

Consequences and limits:

- Any account may relay a valid proof, but no relayer can choose PASS/REVIEW/BLOCK.
- A proof for another handle or malformed proof must fail NoxCompute verification.
- The Safe export path also checks the stored action commitment and deadline; an actual Safe import and signer review remain mandatory.
- This binding is exercised by the passing official Nox Docker E2E: a stranger relays a valid public-decryption proof, malformed and cross-intent proofs fail, and repeated publication is rejected.

## Residual risks

- Handle/proof sizes, timing, gas, transaction ordering, repeated submissions, and wallet relationships may leak metadata even when values remain encrypted.
- A compromised privileged wallet can read protected attributes and trigger evaluation, but cannot select the published enum without a matching Nox proof.
- A compromised Handle Gateway, TLS endpoint, browser, or upstream service path can observe or alter inputs before handle creation; the current design is not client-side-only encryption.
- A front end can misrepresent cleartext before encryption or proposal fields after evaluation; users must verify wallet prompts and Safe payloads. The current production build derives its badge from the public Nox result and completed one live Sepolia PASS path, but that manual run is not a general front-end integrity proof or automated live regression test.
- The encrypted `amount` is a submitter-provided policy attribute. Nox proves which encrypted value was evaluated, but v1 has no oracle/attestation proving that value equals the committed Safe native-value field. The adapter supplies both consistently; a malicious custom client can lie.
- Action-commitment replay protection is submitter-scoped to prevent mempool-copy denial of service. Different accounts can therefore create separate, potentially conflicting intents for the same Safe action. v1 has no Safe-owner signature/allowlist; reviewers must use the verifier, intent ID, and on-chain submitter recorded in the JSON description and contract state.
- The Transaction Builder JSON is an advisory interoperability artifact, not an enforcement hook. Its format does not carry the expected Safe nonce as an executable constraint; CipherGate records it in the commitment/description, but only a Safe Guard/Module consuming the commitment could enforce it at execution time.
- An exported JSON file can be copied. The browser re-checks the live nonce and deadline before each export, but cannot control a file after download. Safe owners must verify the expected nonce/deadline and exact transaction before signing.
- A proof-verified PASS can be queried until its deadline for the same commitment. CipherGate does not mark a commitment consumed because it does not observe Safe execution.
- The proposal JSON imported successfully through the actual Safe Transaction Builder UI, but import acceptance is not Safe enforcement. `Create Batch` was not clicked, and no Safe signature or execution occurred.
- The local official Nox integration passes with two cases and `2 passing (2 nodejs)`, evidencing the covered proof, ACL, replay, publication, strict-boundary, and action-gate behavior. CipherGate is separately deployed at `0xe0df8484d6986e1ef9b4ef04a263d72708560b71`; one production PASS flow and one Safe import were validated. The public source, CI/Pages run, and video release are linked in the README; the separate Hello World Sepolia address remains onboarding evidence, not the CipherGate product.
- Dependencies are version-pinned, the installed tree matches the synchronized lockfile, and all 202/202 dependency entries contain official-registry `resolved` URLs plus `integrity` digests. The exact current revision passed an isolated official-registry `npm ci` plus `npm run check`. The online audit still reports 16 development/transitive findings (0 critical, 2 high, 6 moderate, 8 low) through the pinned Nox/Hardhat path; no compatible direct fix exists and no blanket fix was applied.

## Out of scope

- Safe Guard/Module enforcement, signatures, threshold policy, transaction execution, custody, token transfers, sanctions-oracle correctness, identity verification, key recovery, and production incident response.
- Protection from the owner, auditor, wallet provider, compromised browser, compromised Nox infrastructure, or malicious Safe signers.
