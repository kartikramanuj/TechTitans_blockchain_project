## Foundry

Foundry is a toolkit for Ethereum application development written in Rust. This repository implements the TechTitans Blockchain Project, focusing on decentralized identity verification and KYC-gated auctions.

## Project Description

This project provides a secure environment for identity management and auction participation.
- Identity Verifier: A contract system for submitting and verifying user identity hashes with verifier roles and staking mechanisms.
- KYC Gated Auction: An auction platform that integrates with the identity verifier to ensure only verified participants can place bids.

## Architecture

The project utilizes a dual-framework approach for maximum efficiency:
- Foundry: Used for core contract development, high-speed testing, and gas analysis.
- Hardhat: Used for deployment management, scripting, and ecosystem integration.

## Installation

Ensure you have Foundry installed. If not, follow the instructions at https://book.getfoundry.sh/getting-started/installation.

```shell
git clone https://github.com/Suhani-006/TechTitans_blockchain_project
cd TechTitans_blockchain_project
forge install
```

## Documentation

Comprehensive analysis of the contracts is available in the dedicated report file:
- [Professional Gas and Coverage Report](./GAS_AND_COVERAGE_REPORT.md)

Detailed Foundry documentation is available at:
- [Foundry Book](https://book.getfoundry.sh/)

## Usage

### Build
Compile the smart contracts:
```shell
forge build
```

### Test
Run the comprehensive test suite:
```shell
forge test
```

### Gas Reporting
Generate a detailed gas consumption report:
```shell
forge test --gas-report
```

### Coverage
Analyze testing coverage:
```shell
forge coverage --report summary
```

### Format
Apply standard formatting:
```shell
forge fmt
```

### Anvil
Start a local Ethereum node:
```shell
anvil
```

### Help
```shell
forge --help
anvil --help
cast --help
```
