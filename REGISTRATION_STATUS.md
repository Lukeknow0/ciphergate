# Registration Status

**Status:** `REGISTERED`
**Checked:** 2026-07-16 21:20 CST

## Completed in the registration wizard

- Opened the official event page while authenticated.
- Opened “Register as Hacker.”
- Reviewed the hacker profile step.
- Existing GitHub verification and prefilled contact-profile fields were preserved; no private values are recorded in this file.
- Advanced to “Organizer Questions.”
- The user supplied the registration email and confirmed the public MetaMask address to use for the journey.
- With explicit faucet-only authorization, requested `0.05 Sepolia ETH` for `0x309BD0006389C29C6b691d6d12Df83DafeC85316` from the official Google Cloud Web3 faucet.
- The faucet transaction succeeded: `0x85f673a2f936bee452ef5945a263c8567d106b1e360c2ca179e0f81388e11d98`.
- An Ethereum Sepolia RPC receipt independently returned `status: 0x1`; the latest balance check returned exactly `0.05 ETH` at 2026-07-16 18:00 CST.
- No wallet connection or signature was needed for the faucet request.
- The official confidential `ConfidentialPiggyBank` was deployed from the confirmed address on Sepolia.
- Canonical contract: `0x372Be24349fC9162fa45b85c84027059789B2EC0`.
- Duplicate deployment `0xfd574bd565eda11ced8e92b0981806857e12dae4` has identical runtime bytecode and is not used in later development or submission evidence.
- Deployment transaction: `0x3c10890fbb8c0d01ad8cf7f9227509f4c41421042ab44519267cfcad149d5840` with RPC receipt `status: 0x1`.
- Nox SDK encrypted value `1` for the deployed contract and successfully called `deposit`; transaction `0x3592f3f94a6d930edd5632019f750c0e70f8411687ce03cc9753a5ccaff3b138` has RPC receipt `status: 0x1`.
- The wallet's Sepolia transaction count is `3`; all three recorded wallet transactions succeeded. MetaMask's red “failed” activity item was local history rather than an extra failed on-chain transaction.
- Submitted the Hacker registration as an individual (`Need teammates: No`). DoraHacks displayed “Congratulations! You have successfully registered for WTF !! hackathon summer edition.”

## Registration closure

Registration is complete; there are no remaining organizer-question actions recorded for the hacker registration. The wallet signatures and transactions listed above occurred only during the separately authorized Hello World journey.

The next event action is the project submission, which is distinct from hacker registration. CipherGate's local technical, Sepolia PASS, Safe import, and evidence gates are closed. Public repository/CI, source publication, demo upload, social publication, and final DoraHacks project submission still require explicit approval at the moment of action.
