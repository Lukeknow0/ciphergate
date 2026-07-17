# Live PASS and Safe import field check

**Checked:** 2026-07-18 01:14 CST  
**Network:** Ethereum Sepolia (`chainId 11155111`)  
**Method:** fresh read-only RPC queries, transaction-input decoding with the compiled ABI, independent commitment/checksum recomputation, persisted JSON inspection, and Safe Transaction Builder UI import

## Successful receipts

| Action | Transaction | Block | Receipt | Destination/result |
|---|---|---:|---|---|
| CipherGate deployment | [`0x515098f6…e15d078`](https://sepolia.etherscan.io/tx/0x515098f6f1894202bf895c4f3af909b5493d4733611ec06c0fcdd0db2e15d078) | `11292069` | `status = 1` | created `0xe0df8484d6986e1ef9b4ef04a263d72708560b71` |
| Safe activation | [`0x29bd36f8…1e91f4af`](https://sepolia.etherscan.io/tx/0x29bd36f8f6329fd88376aef133eaaa91721b37aa0f3d436e43bdc3871e91f4af) | `11292710` | `status = 1` | Safe bytecode exists at `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864` |
| Submit Intent #0 | [`0xf40e087b…5c605bd`](https://sepolia.etherscan.io/tx/0xf40e087b798a53aa48d686faa074db648f3374d9876a1e67976a6b11f5c605bd) | `11292743` | `status = 1` | called CipherGate `submitIntent` |
| Evaluate Intent #0 | [`0xe3f6406b…6771e50`](https://sepolia.etherscan.io/tx/0xe3f6406b36d44ed33105a913e2d49e54fec7a4ed22935972693d5833e6771e50) | `11292768` | `status = 1` | called `evaluateEncryptedPolicy(0)` |
| Publish Intent #0 | [`0x5d1a812d…ea19dfd`](https://sepolia.etherscan.io/tx/0x5d1a812da0a4258b31e912549754581fa46f09b9f766e02d5d3973299ea19dfd) | `11292896` | `status = 1` | called `publishDecision(0, proof)` |

Two independent public RPC endpoints returned deployment block `0xac4da5` (`11292069`), `status = 0x1`, and the same created contract address. This corrects the earlier draft value `11292005`.

## Exact binding comparison

| Field | Prepared action / persisted JSON | On-chain or independently derived | Result |
|---|---|---|---|
| Chain | `11155111` | RPC `eth_chainId = 11155111` | MATCH |
| CipherGate verifier | `0xe0Df8484d6986e1eF9b4Ef04A263D72708560B71` | deployment receipt and non-empty runtime code at the same address | MATCH |
| Safe | `0xDE9612a94C5B660a8321CbeAee44a808DA7E6864` | non-empty Safe bytecode; live `nonce() = 0` | MATCH |
| Target | `0x309BD0006389C29C6b691d6d12Df83DafeC85316` | imported JSON transaction and Transaction Builder field inspection | MATCH |
| Value | `0` | imported JSON; UI displayed `0.0 ETH` | MATCH |
| Calldata | `0x` | imported JSON; UI displayed `0x` | MATCH |
| Calldata hash | `0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470` | independently computed `keccak256(0x)` | MATCH |
| Expected Safe nonce | `0` | live Safe `nonce() = 0` at the check | MATCH |
| Deadline | `1784562256` (2026-07-20 23:44:16 CST) | decoded submit calldata and stored Intent #0 | MATCH |
| Action commitment | `0xd661e3083474af643505b50218f21aa716f35abfea9814f85b2435bbe3c34bef` | recomputed from all action fields and read from Intent #0 | MATCH |
| Policy | v1 / `0xd9b7aa2496e739c17db5c0c551eeb5089cb8ec567dcb61f6e5290ea0ddf05802` | stored Intent #0 and deployment metadata | MATCH |
| Decision | `PASS` | Intent #0 `publicDecision = 1`; `safeProposalAllowed(0, commitment) = true` at the check | MATCH |

The decoded submit transaction also matches audit ID `0x17d5c4dc32bc42781db5379ee7bab7f4a067f8c40f2afa952fda24d61fb62a7d`. The decoded publish proof hashes to `0x1d1ad21979370e94d6862b363901f0c3073464396ebee725fbda0f33e6ba3fd8`.

## Safe batch integrity and import boundary

- Persisted JSON: [`ciphergate-safe-intent-0.json`](safe-import/ciphergate-safe-intent-0.json)
- File SHA-256: `e45a2d332d45b252dae4cc640a79e89c2b749e6ce89a23d0ecb81d4bc84c9315`
- Stored and recomputed Transaction Builder checksum: `0xd99244cb7f90c95190a1fcde69a12b17f991998578f9c7de793e36ab6d69ebdb`
- Transaction Builder displayed `1 uploaded`; the transaction field dialog was inspected.
- `Create Batch` was not clicked. The Safe app was wallet-disconnected. No proposal was signed, submitted to the Safe service, or executed on-chain.

The JSON remains advisory. Its description records the expected nonce and deadline, but Transaction Builder does not enforce those metadata at execution time. A signer must re-check the current Safe nonce, deadline, verifier, Intent #0 state, commitment, and exact payload; only a Guard or Module consuming the commitment could enforce them during Safe execution.
