# iExec Nox feedback

## Observed during the official Hello World journey

- The official `hello-world` page loaded successfully and the Remix link produced the confidential piggy-bank source.
- The tutorial source declared Solidity `^0.8.27`, while the imported current Nox files declared `^0.8.35`; selecting compiler `0.8.35` was required to compile.
- Remix displayed a non-fatal `_context7.t3.error.indexOf is not a function` string after the successful deployment receipt. Sepolia RPC, deployed bytecode, Blockscout, and Sourcify independently confirmed success.
- The SDK Playground connected the same MetaMask account and generated an encrypted handle/proof. A `deposit(bytes32,bytes)` transaction completed successfully on Sepolia.

## Observed during local Hardhat integration

- The official `@iexec-nox/nox-hardhat-plugin@0.1.0` integration path was straightforward to configure once the compatible Hardhat/Solidity versions were pinned.
- When the off-chain stack could not start, the surfaced exception was `Error: [nox] Failed to start the offchain stack: [object Object]`. The nested failure was not serialized in the Hardhat error.
- Manual `docker compose ... config` validation succeeded, and the official Nox `0.6.0` tags exposed `linux/arm64` manifests. Docker Desktop's system-proxy log showed image-pull traffic routed through a local HTTPS proxy that returned HTTP 503 and truncated CloudFront streams; repeated pulls ended in `short read`/`unexpected EOF` or `Service Unavailable`. No containers started and the plugin log remained empty. This isolates the observed failure to the local Docker Desktop proxy path rather than Solidity, compose syntax, tags, or host architecture.
- The E2E test therefore remains unexecuted; the repository does not label the Nox privacy/ACL integration as passing.
- The `allowPublicDecryption` → handle-client `publicDecrypt` → Solidity `publicDecrypt(handle, proof)` path provides a clean way to bind a normalized public result to an encrypted computation without trusting a relayer to choose the value. A short end-to-end cookbook for this pattern would be especially useful for policy and voting applications.

## Suggested improvements

- Pin or clearly document the currently compatible Solidity, Hardhat, plugin, protocol-contract, handle-client, Node, and Docker image versions in one copyable setup block.
- Distinguish a successful transaction receipt from a client-side post-processing error in the Remix journey.
- Preserve and print the underlying Docker/Compose error instead of coercing it to `[object Object]`.
- When startup fails before containers exist, print the exact compose command and image name plus a diagnostic hint for Docker daemon proxy/registry failures.
- Document whether a failed startup is safe to retry and how to verify/clean any partially created stack without deleting unrelated containers.
- Add one official example that marks only a derived result publicly decryptable, retrieves the decryption proof in the browser, and verifies that proof on-chain before updating public state.
- State prominently that `encryptInput` sends the encoded clear value to the trusted Handle Gateway over TLS; this avoids readers incorrectly assuming the current SDK performs pure client-side encryption.
