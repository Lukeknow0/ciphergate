# Project Status

**Decision:** `GO_USER_DIRECTED`
**Phase:** public release; final submission pending
**Updated:** 2026-07-18 CST

## Current verdict

CipherGate is deployed to Sepolia with a passing official Docker-backed Nox E2E, a production browser PASS flow, a passing read-only Sepolia smoke test, and a successful advisory JSON import through Safe Transaction Builder. The imported transaction was inspected but not turned into a batch, signed, or executed. The public [repository](https://github.com/Lukeknow0/ciphergate), passing [CI/Pages deployment](https://github.com/Lukeknow0/ciphergate/actions/runs/29625661507), live [frontend](https://lukeknow0.github.io/ciphergate/), and [video release](https://github.com/Lukeknow0/ciphergate/releases/tag/v1.0.0-hackathon) are complete. The required social post and final DoraHacks Submit action remain.

The separate official Hello World journey is complete and independently evidenced on Sepolia. It is not product-deployment evidence.

## Completed and verified

- Registered for the DoraHacks event as an individual.
- Funded the authorized public wallet with `0.05 Sepolia ETH` through the official documentation path.
- Deployed the official `ConfidentialPiggyBank` compatibility build twice on Sepolia. Runtime bytecode is identical; `0x372Be24349fC9162fa45b85c84027059789B2EC0` is the sole canonical address and `0xfd574bd565eda11ced8e92b0981806857e12dae4` is retained only as duplicate-deployment history.
- Used the Nox SDK Playground to encrypt value `1` and completed a successful `deposit(bytes32,bytes)` transaction.
- Implemented an immutable policy v1 (`amount > 10,000`, `risk > 80`, or `flags > 0` → BLOCK; otherwise `risk > 50` → REVIEW; otherwise PASS) with fixed version/hash metadata and no policy setter.
- Bound every intent to a domain-separated action commitment covering chain ID, the verifying CipherGate deployment, Safe, destination, value, calldata hash, expected Safe nonce, and deadline. The deadline is limited to seven days.
- Added submitter-scoped action-commitment and audit-ID replay rejection, exact encrypted-input-bundle replay rejection, one-time evaluation/publication, and submission-time auditor attribution/access. Submitter scoping prevents a copied mempool commitment from consuming another account's replay marker.
- Kept decision publication proof-bound: `publishDecision()` derives the enum only after `Nox.publicDecrypt` verifies the proof for the current decision handle. Any account may relay a valid proof but cannot choose its result.
- Implemented a browser bundle using the official handle client and viem for wallet connect, exact Safe-action preparation, encrypted submission, evaluation, proof retrieval/publication, and PASS-only batch export.
- Implemented a checksummed Safe Transaction Builder v1 adapter that validates non-zero fields and ranges, requires deployed Safe code plus an exact live nonce, and recomputes the commitment before export. The JSON is advisory and is not Guard/Module enforcement.
- Added automatic opaque audit IDs, connection/session race protection, post-proof state refresh, evaluate/publish recovery, pinned-block reads, and retry/refresh handling to the frontend flow.
- Pinned Node `22.22.3`, npm `10.9.8`, Hardhat, Nox packages, viem, TypeScript, `tsx`, esbuild, and Node types; `npm ls --depth=0` exits zero.
- Verified all 202/202 dependency entries in `package-lock.json` contain non-empty `resolved` and `integrity` metadata.
- Reproduced the exact current revision from an empty isolated copy: `npm ci` succeeded against the official npm registry and the isolated `npm run check` passed compile, all unit/static/doc checks, and the preview build.
- Compiled with Solidity `0.8.35`, optimizer enabled, and `viaIR` enabled.
- Passed contract access/metadata/commitment unit tests: 4/4.
- Passed browser Nox adapter tests: 9/9.
- Passed commitment-bound Safe adapter tests: 9/9.
- Passed dependency-free policy vectors: 5/5.
- Passed the ABI/action-bound public-surface check and unconfigured frontend preview build.
- Completed manual `ego-browser` QA of the unconfigured preview at desktop (`1561×937`) and mobile (`390×844`) viewports: every action stayed disabled, the configuration warning remained visible, no horizontal overflow was present, all controls stayed within the mobile viewport, and the first- and third-party license links returned their expected text.
- Passed `npm run test:nox` against the official Docker-backed Nox stack with exit code zero, two green cases, and `2 passing (2 nodejs)`. The run exercised real wallet/contract proof binding, private-attribute ACL negatives, proof retrieval and malformed/cross-intent proof rejection, action/audit/input replay rejection, one-time evaluation/publication, exact/mismatched action gating, and all six strict Solidity comparison boundaries.
- Deployed `ConfidentialIntentFirewall` to Ethereum Sepolia through Remix/MetaMask. The successful receipt and read-only smoke verification are recorded in E-012.
- Confirmed the deployed source through Sourcify v2: both creation and runtime bytecode are `exact_match`, verified at `2026-07-17T13:29:40Z`.
- Activated test Safe `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864`; the activation receipt succeeded, deployed bytecode exists, and its live nonce remained `0` during action preparation and import validation.
- Completed production Intent #0 through three successful CipherGate receipts: submit, encrypted evaluation, and proof-bound publication. The stored decision is `PASS`; the action commitment recomputes from chain, verifier, Safe, target, value, calldata hash, nonce, and deadline.
- Exported the checksummed Safe Transaction Builder v1 JSON and imported it into the actual Sepolia Safe page. Transaction Builder displayed `1 uploaded`; target, value, and calldata were inspected, while chain/verifier/Safe/nonce/deadline/commitment were independently compared to the persisted JSON and Sepolia state. `Create Batch` was not clicked and no Safe signature or execution occurred.
- Adapted only the Hardhat shared-RPC test harness by binding each submitter wallet client's `getAddresses()` to its own `account.address`; the helper otherwise returns multiple accounts and can make the handle SDK choose the wrong proof subject. This is test-environment account selection, not a production mock of Nox, proofs, encryption, the contract, or policy evaluation.
- Acquired and ran the official Nox Docker images. After the successful run, restored Containers proxy to `Same as host proxy`, fully restarted Docker Desktop, and verified in the UI that `Same as host proxy = 1`, `Manual = 0`, and `No proxy = 0`. The engine was running, `docker version` returned normal server details, and no Nox/temporary containers remained.
- Added an MIT license, third-party notices, pinned GitHub Actions definitions, `.nvmrc`, `.env.example`, and Sepolia deploy/read-only-smoke helpers.
- Published the reviewed source to `main`, passed CI run `29625661507` including Docker Nox E2E and Pages deployment, and released `v1.0.0-hackathon` with the 3:32 demo and cover.

## Resolved Nox gate and troubleshooting history

### R-001 — Official Nox Docker E2E passes

The current `npm run test:nox` run starts the official offchain stack, executes both Node.js test cases, and exits zero with two checkmarks and `2 passing (2 nodejs)`. This closes the former Nox execution gate. The passing assertions cover real handle-proof wallet and verifying-contract binding, private ACL/decryption negatives, normalized public-decision proof retrieval, malformed and cross-intent proof rejection, action/audit/input-bundle replay rejection, one-time evaluation/publication, same-output REVIEW normalization, six strict policy boundaries, and exact-versus-mismatched action gating.

Because the Hardhat shared RPC exposes multiple accounts through `getAddresses()`, the test harness binds each submitter wallet client's `getAddresses()` to that client's `account.address`. This makes the official handle client bind its proof to the intended submitter. The encryption/decryption services, ACL checks, proofs, contracts, and policy execution remain real; the account binding is a test-environment wallet adaptation, not a production mock.

Historical troubleshooting: initial runs with Docker Desktop proxy set to `System proxy` and Containers proxy set to `Same as host proxy` showed HTTP 503/truncated image-pull traffic through `127.0.0.1:1082`. A controlled `No proxy` retry then exposed a separate local DNS/routing/TLS mismatch: `registry-1.docker.io` resolved to `3.230.235.129` and presented a certificate for `gamma-cell-1-lambda.us-east-1.api.aws`. The plugin surfaced both startup failures only as `[object Object]`; neither attempt reached a CipherGate assertion.

The official images were subsequently acquired and the full stack ran successfully using a temporary Containers proxy `Manual` setting. Immediately afterward, Containers proxy was restored to `Same as host proxy` and Docker Desktop was fully restarted. Final UI verification showed exactly one selected mode (`Same as host proxy = 1`, `Manual = 0`, `No proxy = 0`), `Engine running`; `docker version` returned normal server information, and no containers remained. The earlier acquisition failures are retained as troubleshooting history and are not a current blocker.

## Live validation closure and open blockers

### R-002 — Live product and Safe import validation complete

- CipherGate is deployed at `0xe0df8484d6986e1ef9b4ef04a263d72708560b71`; production Intent #0 completed submit/evaluate/publish with successful receipts and a proof-published on-chain `PASS`.
- The production build used that address and the authorized Sepolia account. The exact action bound Safe `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864`, target `0x309BD0006389C29C6b691d6d12Df83DafeC85316`, zero value, empty calldata, nonce `0`, and deadline `1784562256` to commitment `0xd661e3083474af643505b50218f21aa716f35abfea9814f85b2435bbe3c34bef`.
- Safe Transaction Builder accepted the exported JSON and displayed `1 uploaded`. The persisted JSON checksum recomputes exactly; its full public-field comparison is in `evidence/LIVE_FIELD_CHECK.md`.
- The expected nonce and deadline remain commitment/description metadata; the JSON format cannot enforce them at execution.
- Replay protection is submitter-scoped to avoid mempool-copy denial of service; v1 does not require a Safe-owner signature or prevent different accounts from creating separate intents for the same action. The exported description identifies the verifier, intent ID, and submitter for review.
- No Safe Guard or Module consumes the commitment. `Create Batch` was not clicked; signing and execution were not performed and remain outside CipherGate.

### B-003 — Final social and DoraHacks submission are pending

- The source, CI/Pages deployment, and `v1.0.0-hackathon` release are public and linked above.
- Deployment was performed through Remix/MetaMask rather than `scripts/deploy-sepolia.mjs`. The read-only `scripts/smoke-sepolia.mjs` has run successfully against the live address.
- The live browser flow was manually verified, a persisted screenshot manifest exists, and the recorded 3:32 demo is attached to the public release. There is still no automated live-chain browser test or generalized evidence-export script.
- The current online npm audit reports 16 development/transitive findings (`0` critical, `2` high, `6` moderate, `8` low). They flow through the pinned Nox/Hardhat toolchain and have no compatible direct-dependency fix; no blanket `npm audit fix` was run because it could break the required integration stack.

## Verification matrix

| Gate | Status |
|---|---|
| Official Hello World deployment and encrypted deposit | PASS |
| Solidity compile | PASS |
| Contract unit tests | PASS (4/4) |
| Policy boundary vectors | PASS (5/5) |
| Public ABI/action-bound surface | PASS |
| Browser Nox adapter | PASS (9/9) |
| Commitment-bound Safe adapter | PASS (9/9) |
| Unconfigured frontend preview build | PASS |
| Unconfigured desktop/mobile manual browser QA | PASS |
| Production frontend build with deployed address | PASS (E-012 address) |
| Official Nox Docker E2E | PASS (2/2; `2 passing (2 nodejs)`) |
| Invalid/cross-contract/cross-intent proof rejection | PASS in official Nox E2E |
| Private-attribute ACL/decryption negatives | PASS in official Nox E2E |
| Same-output normalized REVIEW comparison | PASS in official Nox E2E |
| Six strict Solidity comparison boundaries | PASS (6/6) in official Nox E2E |
| Exact/mismatched action gate in real Nox flow | PASS in official Nox E2E |
| Manifest/lock/installed dependency tree | PASS |
| Lockfile `resolved` + `integrity` coverage | PASS (202/202 dependency entries) |
| Official npm-registry isolated `npm ci` + aggregate check for exact current revision | PASS |
| Online dependency audit | REVIEW (16: 0 critical / 2 high / 6 moderate / 8 low; no compatible direct fix) |
| Live-chain browser flow | PASS: Intent #0 submit/evaluate/publish, proof-published `PASS` |
| Actual Safe import validation | PASS: `1 uploaded`, exact field comparison; no signature/execution |
| CipherGate Sepolia deployment and smoke test | PASS |
| Local Git repository | PASS |
| Reviewed source commit / clean tree at creation | PASS locally |
| Public repository / CI / Pages | PASS ([run 29625661507](https://github.com/Lukeknow0/ciphergate/actions/runs/29625661507)) |
| Screenshot manifest | CREATED and hash-indexed |
| Release tag / demo | PASS ([v1.0.0-hackathon](https://github.com/Lukeknow0/ciphergate/releases/tag/v1.0.0-hackathon), 3:32) |

## Next actions

1. With explicit user approval, publish the required X post with the attached demo video and the repository link.
2. Fill DoraHacks with the public links, then stop immediately before the final Submit action for user confirmation.
