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
- The production build requires a non-zero deployed `CIPHERGATE_CONTRACT_ADDRESS`; it passed with the E-012 address on 2026-07-17 CST.

<a id="e-010--nox-docker-e2e-blocker"></a>

## E-010 — Nox Docker E2E

**Status:** VERIFIED — FRESH OFFICIAL-STACK RUN EXITED ZERO

A fresh `npm run test:nox` run started the official Nox Docker stack, executed both Node.js test cases, and exited `0`. The terminal printed a `✔` result for each case and ended with:

```text
2 passing (2 nodejs)
```

The first passing case, `keeps attributes private but discloses the decision to the submitter`, covers:

- encryption proofs are bound to the submitting wallet and target contract;
- same-submitter action-commitment/audit-ID replay and exact encrypted-input-bundle replay are rejected;
- owner access is present for all three private attributes while submitter access/public decryption is absent;
- publication before evaluation, unauthorized evaluation, repeated evaluation, malformed publication, and repeated publication fail;
- the normalized decision is publicly decryptable and a stranger may relay its valid proof without selecting the enum;
- a proof for one intent cannot publish another intent;
- two different private inputs that both resolve to REVIEW normalize to the same public decision, fixed policy metadata, and closed gate while retaining different encrypted amount handles;
- only PASS opens the gate for the exact stored action commitment, while a mismatched commitment stays closed.

The second passing case, `executes the Solidity policy at every strict comparison boundary`, exercises six on-chain encrypted-policy vectors: amount `10,000` versus `10,001`, risk `50`, `51`, `80`, and `81`, and non-zero counterparty flags. Each produced the expected PASS/REVIEW/BLOCK result.

Hardhat's shared-RPC wallet clients return every account from `getAddresses()` by default, while `@iexec-nox/handle` selects the first returned address. The E2E therefore binds the submitter client's `getAddresses()` result to `[submitter.account.address]`. This is a test-environment account-selection adapter; it does not replace Nox encryption, proof validation, ACL enforcement, encrypted computation, public-decryption proof verification, or product behavior with a mock.

The official images are now present locally. Docker Desktop's Containers proxy was configured manually to complete image acquisition and the run. Afterward it was restored to `Same as host proxy`, Docker Desktop was fully restarted, and both the UI and CLI verified `Engine running` with no residual Nox containers.

Earlier attempts are retained as historical troubleshooting evidence. The plugin initially surfaced only:

```text
Error: [nox] Failed to start the offchain stack: [object Object]
```

During the initial proxy-mode attempts, Docker Desktop used `System proxy` with Containers proxy set to `Same as host proxy`. Its `httpproxy.log` showed image-pull CONNECT requests routed through the local static HTTPS proxy `http://127.0.0.1:1082`; that path repeatedly returned HTTP 503 and truncated CloudFront layer streams. Three `docker pull nats:2.12-alpine` attempts failed with two `short read ... unexpected EOF` errors and one registry-referrers `Service Unavailable` response.

On 2026-07-17, an authorized controlled retry set Containers proxy to `No proxy`, fully restarted Docker Desktop, and verified that the setting survived restart before running `npm run test:nox`. Docker's proxy log recorded seven stack-image connections to `registry-1.docker.io` as `container via direct connection because Docker Desktop has no HTTPS proxy`, confirming that this attempt did not reuse the containers proxy. Compose reported `iexechub/nox-ingestor:0.6.0` first and canceled the other six pulls immediately afterward. That historical command failed during `Starting Nox offchain stack...`, before any test assertion. At that point no Nox container or image remained, and the plugin-written `offchain-services.log` was 0 bytes.

Immediately afterward, Containers proxy was restored to `Same as host proxy`, Docker Desktop was fully restarted, and both the restored setting and `Engine running` state were verified. A read-only registry check then reproduced the no-proxy image-acquisition failure exactly:

```text
ERROR: failed to do request: Head "https://registry-1.docker.io/v2/iexechub/nox-ingestor/manifests/0.6.0": tls: failed to verify certificate: x509: certificate is valid for gamma-cell-1-lambda.us-east-1.api.aws, *.gamma-cell-1-api-lambda.us-east-1.api.aws, not registry-1.docker.io
```

Local DNS resolved `registry-1.docker.io` to `3.230.235.129` for that check. The compose configuration was valid, and the official Nox `0.6.0` tags exposed active `linux/arm64` manifests. Those checks ruled out invalid compose syntax, missing image tags, and an Apple Silicon architecture mismatch for the historical failure. The direct path removed the initial local proxy's 503/truncation failure but exposed a separate DNS/routing/TLS certificate mismatch; the plugin hid that nested Docker/Compose detail as `[object Object]`.

Conclusion: the earlier proxy/DNS/TLS failures are resolved for the current evidence run and are not a current blocker. The local official-stack integration claims above are now supported by an exit-zero execution. This does not establish a CipherGate Sepolia deployment, live product browser flow, actual Safe JSON import, or public release; the Hello World Sepolia address in E-005 is a separate onboarding contract and must not be presented as CipherGate.

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

**Status:** VERIFIED — DEPLOYMENT RECEIPT AND READ-ONLY SMOKE PASS

- Network: Ethereum Sepolia (`chainId 11155111`)
- Deployer: `0x309BD0006389C29C6b691d6d12Df83DafeC85316`
- Contract: `ConfidentialIntentFirewall`
- Contract address: `0xe0df8484d6986e1ef9b4ef04a263d72708560b71`
- Deployment transaction: `0x515098f6f1894202bf895c4f3af909b5493d4733611ec06c0fcdd0db2e15d078`
- Explorer: https://sepolia.etherscan.io/tx/0x515098f6f1894202bf895c4f3af909b5493d4733611ec06c0fcdd0db2e15d078
- Block: `11292069` (`0xac4da5`); receipt status: `0x1`; `to: null`
- Runtime bytecode: non-empty; smoke hash: `0xf1c4febb28e9a7f005693b00d56364fc4a96a124a666756512a698ebba1218fb`
- `owner()` and `auditor()` both return the authorized wallet.
- `policyVersion()` returns `1`.
- `policyHash()` returns `0xd9b7aa2496e739c17db5c0c551eeb5089cb8ec567dcb61f6e5290ea0ddf05802`.
- `MAX_ACTION_LIFETIME()` returns `604800` seconds (seven days).

Reproduction:

```bash
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com \
CIPHERGATE_CONTRACT_ADDRESS=0xe0df8484d6986e1ef9b4ef04a263d72708560b71 \
npm run smoke:sepolia
```

The smoke command exited zero on 2026-07-17 CST. On 2026-07-18, two independent public RPC endpoints also returned block `0xac4da5`, status `0x1`, and the same created contract address for the deployment receipt. The earlier draft block value `11292005` was incorrect and is superseded by `11292069`. This entry covers deployment and public metadata; the production PASS flow and Safe import are independently recorded in E-015 and E-016.

## E-013 — Source control and release evidence

**Status:** REVIEWED SOURCE AND LIVE-EVIDENCE COMMITS CREATED; NO PUBLIC RELEASE

`git rev-parse --show-toplevel` resolves to the dedicated CipherGate directory, and the branch is `main`. The reviewed source baseline was created after the aggregate test, exact-revision isolated `npm ci` reproduction, browser QA, security review, diff validation, and secret scan. The live PASS/Safe import evidence and final verification record are also committed locally; `git rev-parse HEAD` is the authoritative current local identifier.

The evidence package still cannot cite:

- a public repository URL or CI run associated with the reviewed source.
- a release tag or published release artifact.

An MIT `LICENSE`, `THIRD_PARTY_NOTICES.md`, aggregate `npm run check`, pinned two-job GitHub Actions workflow, and deploy/read-only-smoke helpers exist locally. No CI run can exist before publication. A hash-indexed screenshot manifest and live-field check now exist under [`evidence/`](evidence/); the manual deployment used Remix/MetaMask, and the read-only smoke script has run successfully. An automated evidence-export script and demo assets remain absent.

Required closure evidence:

1. Record and verify the maximum-four-minute demo from the committed evidence package.
2. Run CI after publication and cite the release commit/tag in the demo, deployment record, and final submission.

## E-014 — Proof-bound decision and browser integration

**Status:** LOCAL OFFICIAL NOX E2E, BUILD, AND UNIT/STATIC CHECKS VERIFIED; LIVE FLOW AND SAFE IMPORT VERIFIED IN E-015/E-016

At 2026-07-17 CST, the local security design, official-stack integration, and browser adapter have these verified properties:

- Policy v1 is compile-time fixed: version `1`, hash `0xd9b7aa2496e739c17db5c0c551eeb5089cb8ec567dcb61f6e5290ea0ddf05802`, fixed thresholds, and no policy mutation function.
- Every submission stores a non-zero, deployment-domain-separated Safe action commitment and a future deadline of at most seven days, rejects same-submitter commitment/audit-ID reuse and exact input-handle-bundle replay, and records the auditor active at submission. Commitment replay state is submitter-scoped so copying a pending hash cannot block the original submitter through a global marker.
- `evaluateEncryptedPolicy()` marks only the normalized encrypted code with `Nox.allowPublicDecryption`.
- `publishDecision(intentId, decryptionProof)` accepts no enum, calls `Nox.publicDecrypt` for the current handle, range-checks the verified code, and then updates public state.
- Evaluation and publication are one-time operations.
- `safeProposalAllowed(intentId, commitment)` opens only for proof-published PASS, exact commitment equality, and a live deadline.
- The public-surface test asserts the proof-only ABI, fixed policy, action-bound gate, required Nox proof calls, and absence of sensitive event field names.
- The fresh Docker-backed E2E in E-010 executed both test cases on the official Nox stack and exited zero, covering wallet/contract proof binding, private-attribute ACL negatives, malformed/cross-intent/replay rejection, one-time evaluation/publication, proof-bound public decisions, six strict Solidity boundaries, and exact/mismatched action gating.

The browser implementation uses `@iexec-nox/handle` plus viem to connect on Sepolia, verify deployed Safe code and its live nonce, commit the exact Safe action, obtain three handle/proof pairs, submit an intent, evaluate it, fetch/relay the public-decryption proof, and export a PASS-only checksummed Safe Transaction Builder batch. It generates opaque audit IDs, clears sensitive inputs after confirmation, and recomputes the commitment immediately before export. Session/epoch checks and pinned-block reads prevent stale asynchronous work from overwriting newer wallet/chain state. The fail-closed preview remains available for unconfigured QA; the production build was configured with the E-012 address for the E-015 flow.

Manual `ego-browser` QA of the unconfigured build passed at desktop (`1561×937`) and mobile (`390×844`) viewports. All six transaction-affecting buttons were disabled, the unconfigured-build warning was visible, the page had no horizontal overflow, every input/button remained inside the mobile viewport, and the footer served the MIT license plus the generated third-party license file. The generated notice contained 14 package sections. This verifies the fail-closed preview and responsive layout; separate production wallet/live-chain behavior is evidenced in E-015/E-016.

Verified commands:

```text
npm run compile         PASS (1 changed Solidity file compiled)
npm run test:unit       PASS (4/4)
npm run test:frontend   PASS (9/9)
npm run test:safe       PASS (9/9)
npm run vectors         PASS (5/5)
npm run build:frontend:preview  PASS (explicit unconfigured mode)
npm run test:surface    PASS
npm run test:nox        PASS (2 passing (2 nodejs), fresh exit 0)
ego-browser desktop/mobile unconfigured QA  PASS
```

The Safe adapter follows the official v1 batch fields and an independently expressed checksum implementation tested against a fixed Safe Transaction Builder `2.0.1` oracle value. The JSON description records the verifier, intent ID, on-chain submitter, commitment, policy/audit metadata, expected nonce, and deadline. This artifact remains advisory: Transaction Builder JSON does not itself enforce the expected nonce/deadline, and only a future Guard/Module consuming the same commitment could enforce the decision at execution. The actual validation-only import is recorded in E-016; it is not Safe execution enforcement.

## E-015 — Live Sepolia PASS flow

**Status:** VERIFIED — SUBMIT, EVALUATE, AND PROOF-BOUND PUBLISH RECEIPTS SUCCEEDED

On 2026-07-18 CST, the production frontend was configured with CipherGate `0xe0df8484d6986e1ef9b4ef04a263d72708560b71`, connected on Ethereum Sepolia as the authorized wallet, and prepared Intent #0 for activated Safe `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864`.

Successful product transactions:

| Step | Transaction | Block | Receipt |
|---|---|---:|---|
| Submit Intent #0 | [`0xf40e087b798a53aa48d686faa074db648f3374d9876a1e67976a6b11f5c605bd`](https://sepolia.etherscan.io/tx/0xf40e087b798a53aa48d686faa074db648f3374d9876a1e67976a6b11f5c605bd) | `11292743` | `status = 1` |
| Evaluate encrypted policy | [`0xe3f6406b36d44ed33105a913e2d49e54fec7a4ed22935972693d5833e6771e50`](https://sepolia.etherscan.io/tx/0xe3f6406b36d44ed33105a913e2d49e54fec7a4ed22935972693d5833e6771e50) | `11292768` | `status = 1` |
| Publish normalized decision | [`0x5d1a812da0a4258b31e912549754581fa46f09b9f766e02d5d3973299ea19dfd`](https://sepolia.etherscan.io/tx/0x5d1a812da0a4258b31e912549754581fa46f09b9f766e02d5d3973299ea19dfd) | `11292896` | `status = 1` |

Fresh transaction-input decoding confirms `submitIntent`, `evaluateEncryptedPolicy(0)`, and `publishDecision(0, proof)`. The public proof bytes hash to `0x1d1ad21979370e94d6862b363901f0c3073464396ebee725fbda0f33e6ba3fd8`. Intent #0 stores `publicDecision = 1` (`PASS`), policy v1/hash, action deadline `1784562256`, and action commitment `0xd661e3083474af643505b50218f21aa716f35abfea9814f85b2435bbe3c34bef`.

The commitment was independently recomputed from:

- chain `11155111`;
- verifier `0xe0Df8484d6986e1eF9b4Ef04A263D72708560B71`;
- Safe `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864`;
- target `0x309BD0006389C29C6b691d6d12Df83DafeC85316`;
- value `0`;
- calldata `0x`, hash `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470`;
- expected Safe nonce `0`;
- deadline `1784562256`.

The recomputation equals the stored commitment, Safe bytecode is non-empty, live Safe nonce was `0`, and `safeProposalAllowed(0, commitment)` returned `true` at the 2026-07-18 01:14 CST check. Detailed field results are persisted in [`evidence/LIVE_FIELD_CHECK.md`](evidence/LIVE_FIELD_CHECK.md). The production screenshot is indexed in [`evidence/SCREENSHOT_MANIFEST.md`](evidence/SCREENSHOT_MANIFEST.md).

## E-016 — Safe Transaction Builder import

**Status:** VERIFIED — JSON IMPORTED AND FIELDS INSPECTED; NOT SIGNED OR EXECUTED

Safe activation transaction [`0x29bd36f8f6329fd88376aef133eaaa91721b37aa0f3d436e43bdc3871e91f4af`](https://sepolia.etherscan.io/tx/0x29bd36f8f6329fd88376aef133eaaa91721b37aa0f3d436e43bdc3871e91f4af) succeeded in block `11292710`. Deployed bytecode exists at Safe `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864`.

The exported [`ciphergate-safe-intent-0.json`](evidence/safe-import/ciphergate-safe-intent-0.json) has file SHA-256 `e45a2d332d45b252dae4cc640a79e89c2b749e6ce89a23d0ecb81d4bc84c9315`. Its stored Safe Transaction Builder checksum `0xd99244cb7f90c95190a1fcde69a12b17f991998578f9c7de793e36ab6d69ebdb` recomputes exactly.

The JSON imported into the actual Safe Transaction Builder page, which displayed `1 uploaded`. The imported edit dialog was inspected for destination, zero ETH value, and empty calldata; the full chain/Safe/verifier/target/value/calldata-hash/nonce/deadline/commitment comparison is recorded in [`evidence/LIVE_FIELD_CHECK.md`](evidence/LIVE_FIELD_CHECK.md). Screenshots and their hashes are recorded in [`evidence/SCREENSHOT_MANIFEST.md`](evidence/SCREENSHOT_MANIFEST.md).

`Create Batch` was not clicked. The Safe app was wallet-disconnected, and no Safe proposal was signed, sent for execution, or executed. The import proves format acceptance and field fidelity only; it does not turn the advisory expected nonce/deadline metadata into execution-time enforcement.

## E-017 — Final local release-candidate verification

**Status:** VERIFIED — FRESH FINAL MATRIX EXITED ZERO

On 2026-07-18 CST, after adding the live-flow/Safe evidence and correcting the deployment block record, the release-candidate working tree was verified with:

| Check | Result |
|---|---|
| `npm run check` | PASS, exit `0`: compile; contract 4/4; frontend 9/9; Safe 9/9; policy 5/5; surface; docs; preview build |
| `npm run test:nox` | PASS, exit `0`: two `✔` cases; `2 passing (2 nodejs)` |
| production `npm run build:frontend` with the E-012 address | PASS, exit `0` |
| `npm run smoke:sepolia` | PASS, exit `0`; chain/address/bytecode/owner/auditor/policy/lifetime matched |
| `npm run test:docs` | PASS, exit `0` |
| isolated official-registry `npm ci` + `npm run check` | PASS, exit `0` for the final candidate files |
| `git diff --check` | PASS, exit `0` |
| secret/PII, address/hash/link, evidence checksum, and residual-container scans | PASS: no email addresses or secret values found; only public blockchain addresses and documented placeholder/warning prose remain |

No `npm audit fix` was run. No Docker proxy setting was changed. The official Nox run cleaned up its temporary stack, and the residual-container check found no Nox containers.
