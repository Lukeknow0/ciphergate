# Four-minute demo script

> **Recording gate:** do not record the final demo until the official Nox E2E, exact-revision clean install, production browser flow, advisory Safe import, and CipherGate Sepolia smoke test are complete. Never present the Hello World address as CipherGate.

## Pre-record checklist

- Confirm MetaMask is on Ethereum Sepolia and the visible account is the authorized demo account.
- Prepare a funded demo account and a real test Safe with no sensitive labels, unrelated balances, tabs, or notifications visible.
- Confirm the Safe has deployed code and record its live nonce immediately before preparing the intent.
- Prepare the exact destination, native value, calldata, expected Safe nonce, and action deadline. Do not change them after intent submission.
- Open the deployed CipherGate address on the explorer and confirm it matches the submission draft.
- Run the exact aggregate check from a clean checkout and save its zero-exit output.
- Prepare one PASS, one REVIEW, and one BLOCK input; let the UI generate fresh opaque audit IDs.
- Confirm every displayed decision and proof comes from the tested contract/Nox path.
- Verify the PASS JSON imports through Safe Transaction Builder without signing or execution, and manually compare the Safe, target, value, calldata, expected nonce, and deadline.
- Disable unrelated browser extensions/pop-ups and rehearse to 3:40–3:55.

## Timed script

1. **0:00–0:25 — Problem and boundary**

   “Treasury policy checks need sensitive amounts and risk signals. CipherGate evaluates those fields confidentially and binds PASS to an exact Safe action before an advisory proposal may be exported. It does not custody funds, sign, or execute transactions.”

2. **0:25–0:55 — Architecture and fixed policy**

   Show the contract and public/protected data table. Point out the immutable policy v1/hash, Nox handle validation, encrypted comparisons/select, submission-time ACLs, replay rejection, public-decryption proof verification, and one-time evaluation/publication. State that a relayer can submit a valid proof but cannot choose its result.

3. **0:55–1:30 — Commit the exact action, obtain handles, and submit**

   Connect MetaMask on Sepolia. Show the Safe code/live nonce check, enter the exact Safe destination/value/calldata and deadline, then show the commitment covering chain, the verifying CipherGate deployment, Safe, target, value, calldata hash, nonce, and deadline. Enter the private amount/risk/flag fields and request handles through the official SDK. State clearly that the SDK sends encoded inputs over TLS to the trusted Nox Handle Gateway. Show that the on-chain call contains handles/proofs, an opaque audit hash, commitment, and deadline—not plaintext policy integers. Approve only the prepared test transaction.

4. **1:30–2:05 — Evaluate and prove**

   Run encrypted policy evaluation, fetch the publicly decryptable normalized result and Nox proof, then relay it to the contract. Briefly show the official-stack test evidence for unauthorized evaluation/decryption and malformed/cross-intent/repeated proofs. Use this segment only after that test has actually passed.

5. **2:05–2:35 — Policy boundaries and replay resistance**

   Show the five green dependency-free vectors and the passed strict Solidity boundaries. Explain: amount above 10,000, risk above 80, or any flag → BLOCK; otherwise risk above 50 → REVIEW; otherwise PASS. Show the tests rejecting action-commitment, audit-ID, and exact-input-bundle reuse plus repeated evaluation/publication.

6. **2:35–3:20 — Exact-action PASS export**

   Show the adapter tests rejecting UNKNOWN, REVIEW, BLOCK, an expired deadline, missing Safe bytecode, a changed nonce, and every changed action field. Export the exact PASS batch and import it through Safe Transaction Builder without signing. Manually compare the transaction fields. State: “This JSON is advisory; its checksum and description do not enforce execution. Only a Safe Guard or Module consuming this commitment could enforce it when the Safe executes.”

7. **3:20–3:50 — Verifiable evidence**

   Show the CipherGate Sepolia address and receipts, the clean exact-revision test run, release commit, and `EVIDENCE.md`. Distinguish the earlier Hello World onboarding hashes from the product deployment.

8. **3:50–4:00 — Close**

   “CipherGate proves a fixed confidential policy result and binds PASS to one exact, time-limited Safe action while keeping signer review and execution explicit.”

## Failure policy

- If the live stack, wallet, explorer, or Safe import fails during recording, stop and fix it; do not replace the segment with an unlabeled mock.
- If a prerecorded terminal or screenshot is used, label its capture time and link it to the corresponding evidence entry.
- Do not call Transaction Builder JSON execution enforcement, and do not imply the encrypted amount is externally attested.
- Never show private keys, recovery phrases, cookies, wallet history unrelated to the demo, or plaintext customer/counterparty information.
