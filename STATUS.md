# Project Status

**Decision:** `GO_USER_DIRECTED`
**Phase:** local integration, security hardening, and evidence packaging
**Updated:** 2026-07-17 CST

## Current verdict

CipherGate is a compiling local integration build with green current non-Docker unit/static/preview-build checks. It is **not submission-ready**: the official Nox E2E is blocked during offchain-stack startup before any assertion executes, the browser flow has not been exercised against a live CipherGate deployment, the advisory Safe JSON has not been imported through an actual Safe, and CipherGate has not been deployed to Sepolia.

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
- Added an MIT license, third-party notices, pinned GitHub Actions definitions, `.nvmrc`, `.env.example`, and Sepolia deploy/read-only-smoke helpers.
- Created a reviewed initial local commit on `main` after the aggregate check, isolated clean-install reproduction, desktop/mobile QA, security review, diff validation, and secret scan. No public remote or release tag exists.

## Open blockers

### B-001 — Official Nox stack cannot start

`npm run test:nox` reaches `Starting Nox offchain stack...`, then returns `Error: [nox] Failed to start the offchain stack: [object Object]` before any E2E assertion executes.

Initial runs with Docker Desktop proxy set to `System proxy` and Containers proxy set to `Same as host proxy` showed HTTP 503/truncated image-pull traffic through `127.0.0.1:1082`. An authorized controlled retry changed only Containers proxy to `No proxy`, fully restarted Docker Desktop, verified that the setting survived restart, and reran the command. Docker's proxy log confirmed that the seven official stack pulls then used direct connections to `registry-1.docker.io`, but the plugin still failed during the same stack-start phase. The original `Same as host proxy` setting was immediately restored, Docker Desktop was fully restarted again, and both the restored setting and running engine were verified.

The first no-proxy pull to finish was `iexechub/nox-ingestor:0.6.0`; Compose then canceled the other six pulls. A follow-up read-only `docker buildx imagetools inspect iexechub/nox-ingestor:0.6.0` reproduced the actionable network error: `registry-1.docker.io` presented a certificate valid for `gamma-cell-1-lambda.us-east-1.api.aws` rather than Docker Registry, so TLS hostname verification failed. At that time local DNS resolved `registry-1.docker.io` to `3.230.235.129`. The direct path therefore removed the original proxy's 503/truncation failure but exposed a separate local DNS/routing/TLS mismatch.

Compose syntax and the official `linux/arm64` manifests remain validated. The plugin still hides the nested Docker/Compose error as `[object Object]`; the retry left no Nox containers or images, and `offchain-services.log` is empty. The evidence locates the controlled retry's failure in local image acquisition, before any CipherGate assertion, rather than in project Solidity or test logic.

Impact: none of the Docker-backed CipherGate assertions has executed. That includes wallet/contract proof binding, encrypted-attribute ACL negatives, malformed/cross-intent publication proofs, replay checks, repeated evaluation/publication, same-output REVIEW normalization, strict Solidity policy boundaries, and exact/mismatched action gate checks.

### B-002 — Live product and Safe validation are incomplete

- CipherGate has no Sepolia address or product transaction hash.
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
| Production frontend build with deployed address | NOT RUN; no CipherGate address |
| Official Nox Docker E2E | BLOCKED during offchain stack startup; 0 assertions executed |
| Invalid/cross-contract/cross-intent proof rejection | IMPLEMENTED; NOT RUN |
| Same-output normalized REVIEW comparison | IMPLEMENTED; NOT RUN |
| Exact/mismatched action gate in real Nox flow | IMPLEMENTED; NOT RUN |
| Manifest/lock/installed dependency tree | PASS |
| Lockfile `resolved` + `integrity` coverage | PASS (202/202 dependency entries) |
| Official npm-registry isolated `npm ci` + aggregate check for exact current revision | PASS |
| Online dependency audit | REVIEW (16: 0 critical / 2 high / 6 moderate / 8 low; no compatible direct fix) |
| Live-chain browser flow | NOT RUN |
| Actual Safe import/API validation | NOT RUN |
| CipherGate Sepolia deployment and smoke test | NOT PERFORMED |
| Local Git repository | PASS |
| Reviewed source commit / clean tree at creation | PASS locally |
| License / notices / CI definition | CREATED locally; CI NOT RUN |
| Release tag / screenshot manifest / demo | NOT CREATED |

## Next actions

1. Correct or bypass the local `registry-1.docker.io` DNS/routing/TLS mismatch on a trusted network, verify the registry presents the correct certificate, then rerun `npm run test:nox`; do not repeat the completed proxy-toggle experiment.
2. Add a persisted screenshot manifest/evidence export and carry the reviewed local commit hash into the demo and submission record.
3. Only with explicit user approval, deploy CipherGate on Sepolia, configure and test the production browser flow, and collect normalized receipts/screenshots.
4. Validate the exported advisory JSON through an actual Safe import path without signing or execution; document the nonce/deadline limitation.
5. Only with explicit user approval, publish the repository, video, social post, and final DoraHacks submission.
