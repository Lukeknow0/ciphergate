# Project Evidence

**Updated:** 2026-07-17 CST
**Scope:** facts verified in the current workspace or through recorded Sepolia receipts. Blocked and pending gates are labeled explicitly.

The entries are chronological. Statements such as “no signature occurred” describe that evidence step only; later authorized actions are listed separately.

## E-001 — Authorized Sepolia test funding

**Status:** VERIFIED

- Network: Ethereum Sepolia (`chainId 11155111`)
- Recipient: `0x309BD0006389C29C6b691d6d12Df83DafeC85316`
- Amount: `0.05 Sepolia ETH`
- Faucet: Google Cloud Web3 faucet, linked by the official iExec Nox network documentation
- Transaction: `0x85f673a2f936bee452ef5945a263c8567d106b1e360c2ca179e0f81388e11d98`
- Explorer: https://sepolia.etherscan.io/tx/0x85f673a2f936bee452ef5945a263c8567d106b1e360c2ca179e0f81388e11d98
- Sepolia RPC receipt status: `0x1` (success)
- Receipt recipient: `0x309bd0006389c29c6b691d6d12df83dafec85316`
- RPC balance checked at 2026-07-16 18:00 CST: `0xb1a2bc2ec50000` wei = `0.05 ETH`

Reproduction:

```bash
curl -sS -X POST \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["0x85f673a2f936bee452ef5945a263c8567d106b1e360c2ca179e0f81388e11d98"],"id":1}' \
  https://11155111.rpc.thirdweb.com

curl -sS -X POST \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x309BD0006389C29C6b691d6d12Df83DafeC85316","latest"],"id":2}' \
  https://11155111.rpc.thirdweb.com
```

The faucet action was explicitly authorized and required no wallet signature. Later signed Hello World actions are recorded in E-005 and E-006.

## E-002 — Official Hello World compiler preflight

**Status:** VERIFIED

- Official page: https://docs.noxprotocol.io/getting-started/hello-world
- The final Remix link loaded the official `ConfidentialPiggyBank` source.
- The tutorial source declared `pragma solidity ^0.8.27`.
- The then-current imported Nox files declared `pragma solidity ^0.8.35` in `INoxCompute.sol`, `Nox.sol`, `HandleUtils.sol`, and `TypeUtils.sol`.
- Compiling with Solidity `0.8.27` returned parser errors before deployment.
- The page displayed a last-updated date of 2026/6/9 and an under-development warning.

No wallet action occurred during this preflight step.

## E-003 — Hello World compatibility source

**Status:** VERIFIED

[`contracts/ConfidentialPiggyBank.sol`](contracts/ConfidentialPiggyBank.sol) preserves the tutorial logic while adjusting the pragma from `^0.8.27` to `^0.8.35` to match the imported Nox dependencies. It is separate from the CipherGate product contract and is disclosed in [`ASSET_PROVENANCE.md`](ASSET_PROVENANCE.md).

## E-004 — Hello World compatibility compile

**Status:** VERIFIED

- Remix compiler selected: Solidity `0.8.35+commit.47b9dedd`.
- The compatibility source compiled without the earlier `ParserError`.
- No wallet action occurred during this compile step.

## E-005 — Hello World Sepolia deployment

**Status:** VERIFIED

- Network: Ethereum Sepolia (`11155111`)
- Deployer: `0x309BD0006389C29C6b691d6d12Df83DafeC85316`
- Contract: `ConfidentialPiggyBank`
- Contract address: `0x372Be24349fC9162fa45b85c84027059789B2EC0`
- Deployment transaction: `0x3c10890fbb8c0d01ad8cf7f9227509f4c41421042ab44519267cfcad149d5840`
- Explorer: https://sepolia.etherscan.io/tx/0x3c10890fbb8c0d01ad8cf7f9227509f4c41421042ab44519267cfcad149d5840
- Block: `11284498`; receipt status: `0x1`; `to: null`
- RPC returned the same contract address, and `eth_getCode` returned non-empty runtime bytecode.
- Remix reported Blockscout and Sourcify verification successful.

The wallet also created `0xfd574bd565eda11ced8e92b0981806857e12dae4` in a duplicate deployment. A 2026-07-17 `eth_getCode` comparison returned byte-for-byte identical runtime code for both addresses. CipherGate documentation and submission materials designate only `0x372Be24349fC9162fa45b85c84027059789B2EC0` as the canonical Hello World contract; the duplicate is retained solely as historical evidence.

Remix also displayed a non-fatal `_context7.t3.error.indexOf is not a function` UI string after the successful receipt. The independent RPC receipt and deployed bytecode are the primary evidence.

## E-006 — Nox SDK encrypted deposit smoke test

**Status:** VERIFIED

- The Nox SDK Playground connected wallet `0x309…85316`.
- Contract: `0x372Be24349fC9162fa45b85c84027059789B2EC0`
- Encrypted test value: `1`
- Generated handle: `0x0000aa36a72301b2be37a78594a2d25e8d0f3a18aa095c650b31f12951d5e675`
- Remix called `deposit(bytes32,bytes)` with the generated handle and proof.
- Transaction: `0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138`
- Explorer: https://sepolia.etherscan.io/tx/0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138
- RPC receipt status: `0x1`; `to` matches the deployed contract; gas used `0x1c1db`.
- Receipt logs include the encrypted-handle event and ACL permission events for the contract and owner.

This proves the official onboarding flow, not a CipherGate product deployment.

A 2026-07-17 RPC check returned wallet transaction count `0x3`. The three on-chain wallet actions are the two successful deployments and this successful deposit. The red MetaMask “failed” activity item was a local wallet-history entry, not an additional failed Sepolia transaction.

## E-007 — Individual hackathon registration

**Status:** VERIFIED

- Registration type: individual (`Need teammates: No`)
- DoraHacks displayed: “Congratulations! You have successfully registered for WTF !! hackathon summer edition.”
- Private contact values are intentionally not repeated in this repository.

See [`REGISTRATION_STATUS.md`](REGISTRATION_STATUS.md) for the scoped registration record.

## E-008 — CipherGate compile and pinned toolchain

**Status:** TOOLCHAIN, COMPILE, AND EXACT-REVISION ISOLATED CHECK VERIFIED

`npm run compile` succeeds for `ConfidentialIntentFirewall.sol` with Solidity `0.8.35`, optimizer runs `200`, and `viaIR: true`.

Intended direct versions in `package.json`:

| Package | Version |
|---|---:|
| Node.js used for the snapshot | `22.22.3` |
| npm used for the snapshot | `10.9.8` |
| Hardhat | `3.9.1` |
| `@iexec-nox/nox-hardhat-plugin` | `0.1.0` |
| `@iexec-nox/nox-protocol-contracts` | `0.2.4` |
| `@iexec-nox/handle` | `0.1.0-beta.13` |
| `@nomicfoundation/hardhat-toolbox-viem` | `5.0.7` |
| viem | `2.55.2` |
| TypeScript | `5.8.3` |
| `tsx` | `4.23.1` |
| esbuild | `0.28.1` |

Node is also pinned in `.nvmrc`; npm is declared through `packageManager`. The synchronized lockfile, installed tree, and clean-install qualification are recorded in E-011.

## E-009 — Local non-Docker test snapshot

**Status:** VERIFIED at 2026-07-17 CST

| Command | Result |
|---|---|
| `npm run test:unit` | PASS: 4 tests, 0 failures |
| `npm run test:frontend` | PASS: 9 tests, 0 failures |
| `npm run test:safe` | PASS: 9 tests, 0 failures |
| `npm run vectors` | PASS: 5 named vectors (`PASS`, `REVIEW`, and three `BLOCK` paths) |
| `npm run test:surface` | PASS: encrypted-input ABI, proof-only decision publication, fixed policy, exact-action gate, and no sensitive event ABI field |
| `npm run test:docs` | PASS: all local Markdown link targets exist inside the repository |
| `npm run build:frontend:preview` | PASS: deterministic browser bundle built in explicitly unconfigured mode |
| `node --check frontend/src/app.js` | PASS |
| Parse `package.json` and `test/policy-boundaries.json` | PASS |

Coverage boundaries:

- `test:unit` covers the compiled immutable policy metadata, zero/non-owner auditor rejection, missing-intent proposal checks, and Solidity/JavaScript agreement on the chain-and-deployment-bound action commitment.
- `test:frontend` covers uint/risk validation, decision normalization, three-field Nox encryption, zero-contract rejection, commitment-bound submit arguments/ABI, exact gate queries, post-proof state refresh, and strict receipt-event binding.
- `test:safe` covers the Safe v1 shape/checksum oracle, commitment sensitivity to every action field, changed-action rejection, address/number/deadline validation, deployed-code/live-nonce checks, and UNKNOWN/REVIEW/BLOCK rejection.
- `vectors` is a dependency-free mirror of the policy truth table; it does not prove Nox execution.
- `test:surface` is an ABI/event-name check. It does not inspect transaction traces, storage, timing, gas, or all possible metadata leakage.
- The production build is deliberately not counted as passing because no non-zero deployed `CIPHERGATE_CONTRACT_ADDRESS` exists.

## E-010 — Nox Docker E2E blocker

**Status:** BLOCKED BEFORE TEST EXECUTION

The implemented `test/nox-e2e.test.ts` is designed to prove:

- encryption proofs are bound to the submitting wallet and target contract;
- same-submitter action-commitment/audit-ID replay and exact encrypted-input-bundle replay are rejected;
- owner access is present for all three private attributes while submitter access/public decryption is absent;
- publication before evaluation, unauthorized evaluation, repeated evaluation, malformed publication, and repeated publication fail;
- the normalized decision is publicly decryptable and a stranger may relay its valid proof without selecting the enum;
- a proof for one intent cannot publish another intent;
- two different private inputs that both resolve to REVIEW normalize to the same public decision, fixed policy metadata, and closed gate while retaining different encrypted amount handles;
- six strict Solidity comparison-boundary cases produce the expected PASS/REVIEW/BLOCK result;
- only PASS opens the gate for the exact stored action commitment, while a mismatched commitment stays closed.

Observed startup failure:

```text
Error: [nox] Failed to start the offchain stack: [object Object]
```

Docker Desktop was configured in system proxy mode. Its `httpproxy.log` showed image-pull CONNECT requests routed through the local static HTTPS proxy `http://127.0.0.1:1082`; that path repeatedly returned HTTP 503 and truncated CloudFront layer streams. Three `docker pull nats:2.12-alpine` attempts failed with two `short read ... unexpected EOF` errors and one registry-referrers `Service Unavailable` response.

The compose configuration validated, and the official Nox `0.6.0` tags exposed active `linux/arm64` manifests. No containers were created, and `offchain-services.log` remained empty. This rules out invalid compose syntax, missing image tags, and an Apple Silicon architecture mismatch for the observed failure.

Conclusion: no Nox E2E assertion ran. Do not label privacy/ACL/proof/replay integration as passing until the official images pull and `npm run test:nox` exits zero.

## E-011 — Dependency lock synchronization

**Status:** MANIFEST/LOCK/INSTALLED TREE CONSISTENT; EXACT-REVISION ISOLATED INSTALL/CHECK PASS

An audit at 2026-07-16 22:51 CST initially found that `package-lock.json` omitted four direct dependencies and the installed tree had a missing/mismatched TypeScript type toolchain. The lockfile and install were then synchronized during the same work session.

A repeat `npm ls --depth=0` exited zero and reported exactly:

```text
@iexec-nox/handle@0.1.0-beta.13
@iexec-nox/nox-hardhat-plugin@0.1.0
@iexec-nox/nox-protocol-contracts@0.2.4
@nomicfoundation/hardhat-toolbox-viem@5.0.7
@types/node@22.19.7
esbuild@0.28.1
hardhat@3.9.1
tsx@4.23.1
typescript@5.8.3
viem@2.55.2
```

`package-lock.json` now lists the same direct development dependencies and versions at its root. A direct parse of the lockfile counted 202 dependency package entries outside the root record; 202/202 contain a non-empty official-registry `resolved` URL and 202/202 contain a non-empty `integrity` digest.

An earlier isolated copy was created on 2026-07-16 without `node_modules`, `artifacts`, `cache`, `frontend/dist`, or Git metadata. Its first official-registry `npm ci` attempt was interrupted by `ECONNRESET`; a single retry using the partially filled isolated npm cache succeeded and installed 177 packages. `npm run check` then compiled both Solidity files and passed that revision's unit/static/build checks with zero failures.

After the manifest/lock and security-packaging changes, the exact current worktree was copied again without `node_modules`, Solidity artifacts/cache, frontend build output, or Git metadata. With the registry explicitly set to `https://registry.npmjs.org/`, `npm ci` completed successfully. In that same isolated install, `npm run check` completed successfully: Solidity compile, unit tests (4/4), frontend adapter tests (9/9), Safe adapter tests (9/9), five policy vectors, public-surface check, documentation-link check, and explicit unconfigured preview build all passed.

An online `npm audit` for the current dependency graph reports 16 findings: 0 critical, 2 high, 6 moderate, and 8 low. They are development/transitive findings reached through the pinned Nox/Hardhat integration path; the available remediation does not provide a compatible direct-dependency update that preserves this stack. No blanket `npm audit fix` was run because forcing transitive changes could break the required Nox/Hardhat versions. This is a documented release risk, not a claim that the findings are resolved.

## E-012 — CipherGate live deployment

**Status:** NOT PERFORMED

CipherGate has no Sepolia address, deployment transaction, live encrypted-intent transaction, Safe import/proposal submission, public repository, video, social post, or final DoraHacks project submission. `scripts/deploy-sepolia.mjs` and the read-only `scripts/smoke-sepolia.mjs` now exist but have not been run. Consequential actions remain subject to explicit user approval.

## E-013 — Source control and release evidence

**Status:** REVIEWED INITIAL LOCAL COMMIT CREATED; NO PUBLIC RELEASE

`git rev-parse --show-toplevel` resolves to the dedicated CipherGate directory, and the branch is `main`. This evidence file is part of the reviewed initial commit created after the aggregate test, exact-revision isolated `npm ci` reproduction, browser QA, security review, diff validation, and secret scan. At that commit's creation, `git status --short` was empty; `git rev-parse HEAD` is the authoritative local identifier.

The evidence package still cannot cite:

- a public repository URL or CI run associated with the reviewed source.
- a release tag or published release artifact.

An MIT `LICENSE`, `THIRD_PARTY_NOTICES.md`, aggregate `npm run check`, pinned two-job GitHub Actions workflow, and deploy/read-only-smoke helpers exist locally. No CI run can exist before publication. Evidence-export, screenshot-manifest, and demo assets are absent; deploy/smoke scripts are unexecuted.

Required closure evidence:

1. Add a screenshot manifest and repeatable evidence export before recording the demo.
2. Run CI after publication and cite the release commit/tag in the demo, deployment record, and final submission.

## E-014 — Proof-bound decision and browser integration

**Status:** LOCAL BUILD AND UNIT/STATIC CHECKS VERIFIED; LIVE NOX/SEPOLIA FLOW PENDING

At 2026-07-17 CST, the local security design and browser adapter have these verified source-level properties:

- Policy v1 is compile-time fixed: version `1`, hash `0xd9b7aa2496e739c17db5c0c551eeb5089cb8ec567dcb61f6e5290ea0ddf05802`, fixed thresholds, and no policy mutation function.
- Every submission stores a non-zero, deployment-domain-separated Safe action commitment and a future deadline of at most seven days, rejects same-submitter commitment/audit-ID reuse and exact input-handle-bundle replay, and records the auditor active at submission. Commitment replay state is submitter-scoped so copying a pending hash cannot block the original submitter through a global marker.
- `evaluateEncryptedPolicy()` marks only the normalized encrypted code with `Nox.allowPublicDecryption`.
- `publishDecision(intentId, decryptionProof)` accepts no enum, calls `Nox.publicDecrypt` for the current handle, range-checks the verified code, and then updates public state.
- Evaluation and publication are one-time operations.
- `safeProposalAllowed(intentId, commitment)` opens only for proof-published PASS, exact commitment equality, and a live deadline.
- The public-surface test asserts the proof-only ABI, fixed policy, action-bound gate, required Nox proof calls, and absence of sensitive event field names.
- The Docker-backed E2E coverage is enumerated in E-010; none of those assertions has executed yet.

The browser implementation uses `@iexec-nox/handle` plus viem to connect on Sepolia, verify deployed Safe code and its live nonce, commit the exact Safe action, obtain three handle/proof pairs, submit an intent, evaluate it, fetch/relay the public-decryption proof, and export a PASS-only checksummed Safe Transaction Builder batch. It generates opaque audit IDs, clears sensitive inputs after confirmation, and recomputes the commitment immediately before export. Session/epoch checks and pinned-block reads prevent stale asynchronous work from overwriting newer wallet/chain state. The preview build intentionally remains unconfigured until a CipherGate deployment address is supplied.

Manual `ego-browser` QA of that unconfigured build passed at desktop (`1561×937`) and mobile (`390×844`) viewports. All six transaction-affecting buttons were disabled, the unconfigured-build warning was visible, the page had no horizontal overflow, every input/button remained inside the mobile viewport, and the footer served the MIT license plus the generated third-party license file. The generated notice contained 14 package sections. This verifies the local fail-closed preview and responsive layout only; it does not validate a wallet connection, live CipherGate flow, or Safe import.

Verified commands:

```text
npm run compile         PASS (1 changed Solidity file compiled)
npm run test:unit       PASS (4/4)
npm run test:frontend   PASS (9/9)
npm run test:safe       PASS (9/9)
npm run vectors         PASS (5/5)
npm run build:frontend:preview  PASS (explicit unconfigured mode)
npm run test:surface    PASS
ego-browser desktop/mobile unconfigured QA  PASS
```

The Safe adapter follows the official v1 batch fields and an independently expressed checksum implementation tested against a fixed Safe Transaction Builder `2.0.1` oracle value. The JSON description records the verifier, intent ID, on-chain submitter, commitment, policy/audit metadata, expected nonce, and deadline. This artifact remains advisory: Transaction Builder JSON does not itself enforce the expected nonce/deadline, and only a future Guard/Module consuming the same commitment could enforce the decision at execution. Actual Safe import remains required before calling the integration end-to-end validated.
