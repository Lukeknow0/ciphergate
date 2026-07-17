# Asset provenance

**Updated:** 2026-07-17

## External/tutorial material

| Local asset / behavior | Origin or compatibility reference | Local treatment | Product usage |
|---|---|---|---|
| `contracts/ConfidentialPiggyBank.sol` | MIT-licensed iExec Nox documentation commit [`1e0df32e11f75ae5a1e954dc7f7c2fc3617141f4`](https://github.com/iExec-Nox/documentation/blob/1e0df32e11f75ae5a1e954dc7f7c2fc3617141f4/src/contracts/ConfidentialPiggyBank.sol), source blob `fc4bb10120e46e44a7fe4c6672632ee1f1878dd6` | Tutorial logic/comments retained; pragma raised from `^0.8.27` to `^0.8.35` and a compatibility-source note added | Onboarding/compatibility evidence only; not imported by CipherGate |
| Safe Transaction Builder v1 checksum behavior | Safe Wallet `tx-builder-v2.0.1` / commit [`d79f028`](https://github.com/safe-global/safe-wallet-monorepo/tree/d79f028/apps/tx-builder), whose referenced implementation is GPL-3.0 | No Safe source is included. `safeProposal.js` uses an independently expressed iterative token-stream implementation; a fixed oracle digest (`0xf594…2567`) generated for CipherGate's verifier/intent/submitter-bound fixture prevents self-referential testing | Interoperable checksum only; does not import, sign, or execute a Safe transaction |
| `@iexec-nox/*`, Hardhat, viem, and build/test packages | Their respective npm packages and upstream licenses | Version-pinned dependencies; no vendored source modifications; direct licenses listed in `THIRD_PARTY_NOTICES.md` | Runtime/development dependencies |

The Safe compatibility reference is disclosed because its release source was consulted as an external oracle during packaging review. The shipped checksum expression was produced independently from a prose interoperability specification and is covered by this repository's MIT license; this is a provenance statement, not legal advice.

## New work for this BUIDL

- `contracts/ConfidentialIntentFirewall.sol`
- `frontend/` (including the inline SVG favicon and the independently expressed checksum implementation described above)
- `scripts/`
- `test/`
- `docs/THREAT_MODEL.md`
- `README.md`, `STATUS.md`, `EVIDENCE.md`, `DEVELOPMENT_PLAN.md`, `DEMO_SCRIPT.md`, `SUBMISSION_DRAFT.md`, and `feedback.md`

## Prior concept provenance

No source file was copied from Pharos PayFlow Guard. The PASS/REVIEW/BLOCK vocabulary, deterministic reason/audit concepts, explicit human confirmation, and evidence-first packaging are disclosed in `DEVELOPMENT_PLAN.md` as prior conceptual experience only.

## Generated assets

The small cyan inline SVG favicon in `frontend/index.html` was generated specifically for CipherGate and has no external asset source. No stock image, font file, audio, screenshot, or video asset is present in the current worktree. Any future submission asset must be added here with its source, license/permission, creation method, and modifications before publication.
