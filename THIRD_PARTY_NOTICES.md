# Third-party notices

CipherGate source is released under the repository [`LICENSE`](LICENSE). The project consumes, but does not vendor, the following direct development/runtime packages:

| Package | Pinned version | Declared license |
|---|---:|---|
| `@iexec-nox/handle` | `0.1.0-beta.13` | MIT |
| `@iexec-nox/nox-hardhat-plugin` | `0.1.0` | MIT |
| `@iexec-nox/nox-protocol-contracts` | `0.2.4` | MIT |
| `@nomicfoundation/hardhat-toolbox-viem` | `5.0.7` | MIT |
| `@types/node` | `22.19.7` | MIT |
| `esbuild` | `0.28.1` | MIT |
| `hardhat` | `3.9.1` | MIT |
| `tsx` | `4.23.1` | MIT |
| `typescript` | `5.8.3` | Apache-2.0 |
| `viem` | `2.55.2` | MIT |

The lockfile records the complete transitive dependency graph. Each installed package's own license and notices remain authoritative. Every browser build discovers the packages actually included through esbuild's metafile, fails if one has no distributable license file, and emits their complete license texts as `dist/THIRD_PARTY_LICENSES.txt`. The site footer links that file and the CipherGate `LICENSE.txt`; esbuild's source-comment sidecar is retained as an additional notice.

The compatibility-only [`ConfidentialPiggyBank.sol`](contracts/ConfidentialPiggyBank.sol) derives from the MIT-licensed iExec Nox documentation source fixed in [`ASSET_PROVENANCE.md`](ASSET_PROVENANCE.md). It is not part of the CipherGate product contract.

The Safe Transaction Builder checksum routine is an independently expressed interoperability implementation. Compatibility is checked against a fixed oracle output from Safe Transaction Builder `v2.0.1`; no Safe source file is included in this repository. The referenced Safe Wallet monorepo release itself is GPL-3.0, as disclosed in [`ASSET_PROVENANCE.md`](ASSET_PROVENANCE.md).
