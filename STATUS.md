# Project Status

**Decision:** `GO_USER_DIRECTED`
**Phase:** local integration, security hardening, and evidence packaging
**Updated:** 2026-07-17 CST

## Current verdict

CipherGate is deployed to Sepolia with green current non-Docker unit/static/preview-build checks, a passing official Docker-backed Nox E2E, and a passing read-only Sepolia smoke test. It is **not submission-ready**: the production browser flow has not been exercised against the live deployment, the advisory Safe JSON has not been imported through an actual Safe, and no public release exists.

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
- Adapted only the Hardhat shared-RPC test harness by binding each submitter wallet client's `getAddresses()` to its own `account.address`; the helper otherwise returns multiple accounts and can make the handle SDK choose the wrong proof subject. This is test-environment account selection, not a production mock of Nox, proofs, encryption, the contract, or policy evaluation.
- Acquired and ran the official Nox Docker images. After the successful run, restored Containers proxy to `Same as host proxy`, fully restarted Docker Desktop, and verified in the UI that `Same as host proxy = 1`, `Manual = 0`, and `No proxy = 0`. The engine was running, `docker version` returned normal server details, and no Nox/temporary containers remained.
- Added an MIT license, third-party notices, pinned GitHub Actions definitions, `.nvmrc`, `.env.example`, and Sepolia deploy/read-only-smoke helpers.
- Created a reviewed initial local commit on `main` after the aggregate check, isolated clean-install reproduction, desktop/mobile QA, security review, diff validation, and secret scan. No public remote or release tag exists.

## Resolved Nox gate and troubleshooting history

### R-001 — Official Nox Docker E2E passes

The current `npm run test:nox` run starts the official offchain stack, executes both Node.js test cases, and exits zero with two checkmarks and `2 passing (2 nodejs)`. This closes the former Nox execution gate. The passing assertions cover real handle-proof wallet and verifying-contract binding, private ACL/decryption negatives, normalized public-decision proof retrieval, malformed and cross-intent proof rejection, action/audit/input-bundle replay rejection, one-time evaluation/publication, same-output REVIEW normalization, six strict policy boundaries, and exact-versus-mismatched action gating.

Because the Hardhat shared RPC exposes multiple accounts through `getAddresses()`, the test harness binds each submitter wallet client's `getAddresses()` to that client's `account.address`. This makes the official handle client bind its proof to the intended submitter. The encryption/decryption services, ACL checks, proofs, contracts, and policy execution remain real; the account binding is a test-environment wallet adaptation, not a production mock.

Historical troubleshooting: initial runs with Docker Desktop proxy set to `System proxy` and Containers proxy set to `Same as host proxy` showed HTTP 503/truncated image-pull traffic through `127.0.0.1:1082`. A controlled `No proxy` retry then exposed a separate local DNS/routing/TLS mismatch: `registry-1.docker.io` resolved to `3.230.235.129` and presented a certificate for `gamma-cell-1-lambda.us-east-1.api.aws`. The plugin surfaced both startup failures only as `[object Object]`; neither attempt reached a CipherGate assertion.

The official images were subsequently acquired and the full stack ran successfully using a temporary Containers proxy `Manual` setting. Immediately afterward, Containers proxy was restored to `Same as host proxy` and Docker Desktop was fully restarted. Final UI verification showed exactly one selected mode (`Same as host proxy = 1`, `Manual = 0`, `No proxy = 0`), `Engine running`; `docker version` returned normal server information, and no containers remained. The earlier acquisition failures are retained as troubleshooting history and are not a current blocker.

## Open blockers

### B-002 — Live product and Safe validation are incomplete

- CipherGate is deployed at `0xe0df8484d6986e1ef9b4ef04a263d72708560b71`; the production browser flow has not yet been exercised against it.
- The browser implementation has not been tested against a deployed CipherGate address; only its unit tests and explicit unconfigured preview build have passed.
- The production build intentionally requires a non-zero `CIPHERGATE_CONTRACT_ADDRESS`.
- The Transaction Builder JSON has not been imported into an actual Safe. Its expected nonce and deadline appear in commitment/description metadata, but the JSON format itself cannot enforce them at execution.
- Replay protection is submitter-scoped to avoid mempool-copy denial of service; v1 does not require a Safe-owner signature or prevent different accounts from creating separate intents for the same action. The exported description identifies the verifier, intent ID, and submitter for review.
- No Safe Guard or Module consumes the commitment. Signing and execution remain outside CipherGate.

### B-003 — Source/release and submission packaging are incomplete

- A reviewed local source commit exists, but there is no release tag, public remote, or CI run.
- `scripts/deploy-sepolia.mjs` and `scripts/smoke-sepolia.mjs` exist but have not been run; the deploy helper would require explicit wallet authorization.
- There is no automated live-chain browser test, persisted screenshot manifest, evidence-export script, demo recording, public repository URL, or release artifact.
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
| Live-chain browser flow | NOT RUN |
| Actual Safe import/API validation | NOT RUN |
| CipherGate Sepolia deployment and smoke test | PASS |
| Local Git repository | PASS |
| Reviewed source commit / clean tree at creation | PASS locally |
| License / notices / CI definition | CREATED locally; CI NOT RUN |
| Release tag / screenshot manifest / demo | NOT CREATED |

## Next actions

1. Add a persisted screenshot manifest/evidence export and carry the reviewed local commit hash and passing official Nox output into the demo and submission record.
2. Only with explicit user approval, deploy CipherGate on Sepolia, configure and test the production browser flow, and collect normalized receipts/screenshots.
3. Validate the exported advisory JSON through an actual Safe import path without signing or execution; document the nonce/deadline limitation.
4. Only with explicit user approval, publish the repository, video, social post, and final DoraHacks submission.
