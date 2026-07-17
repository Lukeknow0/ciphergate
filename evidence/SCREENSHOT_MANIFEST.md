# Screenshot manifest

**Captured:** 2026-07-18 CST

**Scope:** CipherGate Sepolia live PASS flow and Safe Transaction Builder import validation

All files were reviewed at original resolution. No private keys, recovery phrases, cookies, authorization headers, passwords, or unrelated personal data are visible. Public Sepolia addresses and transaction metadata are intentionally retained as audit evidence.

| File | Captured (CST) | Dimensions | SHA-256 | What it proves | Limits |
|---|---|---:|---|---|---|
| [`screenshots/live-pass-onchain.png`](screenshots/live-pass-onchain.png) | 2026-07-18 01:05:56 | 3090×1600 | `c1649b651a22f9ffe767e4090056550af47e6c14880ad9a4018e0e7dd8f97400` | Production UI recovered Intent #0, displayed policy v1, the committed Safe nonce/deadline, proof-published `PASS`, and an enabled/exported checksummed Safe batch. | A screenshot is not a receipt; the three state-changing transactions are independently checked in [`LIVE_FIELD_CHECK.md`](LIVE_FIELD_CHECK.md). |
| [`screenshots/safe-import-success.png`](screenshots/safe-import-success.png) | 2026-07-18 00:47:37 | 1561×937 | `744cb0c2ccf4d4b23d6a0c3a81287d0d3194ad468dc4dace75f1772c71463777` | Safe Transaction Builder accepted the JSON and displayed `1 uploaded` with one custom-data transaction. | `Create Batch` was not clicked. Import does not imply a Safe signature or execution. |
| [`screenshots/safe-import-fields.png`](screenshots/safe-import-fields.png) | 2026-07-18 00:28:27 | 1561×937 | `8468791289a1c954588a15cbb84c3fb3088a2476b95c27bd40dbfe3ffb8fd57f` | The imported transaction edit dialog displayed the intended destination, `0.0 ETH`, and `0x` calldata. | The address input visually clips the final characters at this viewport; the complete address was verified from the imported DOM and the persisted JSON, then compared in [`LIVE_FIELD_CHECK.md`](LIVE_FIELD_CHECK.md). |

## Persisted non-image artifact

| File | SHA-256 | Review |
|---|---|---|
| [`safe-import/ciphergate-safe-intent-0.json`](safe-import/ciphergate-safe-intent-0.json) | `e45a2d332d45b252dae4cc640a79e89c2b749e6ce89a23d0ecb81d4bc84c9315` | Safe Transaction Builder v1 batch imported successfully; checksum recomputation and all public action fields are recorded in [`LIVE_FIELD_CHECK.md`](LIVE_FIELD_CHECK.md). |

The Safe page was wallet-disconnected during validation, and no signing or execution control was used.
