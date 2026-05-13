# TechTitans Blockchain Project: Identity & KYC Auction

A decentralized identity verification system integrated with a KYC-gated auction platform. This project ensures that only verified users can participate in high-value auctions, bringing trust and compliance to decentralized finance.

## 🚀 Project Overview

This repository contains a suite of smart contracts designed for:
- **Identity Verification**: A multi-role system where admins manage verifiers, and verifiers validate user identity hashes on-chain.
- **KYC-Gated Auction**: A composable auction contract that interacts with the Identity Verifier to restrict bidding to verified participants only.

## 🏗️ Architecture

The project uses a hybrid development environment:
- **Foundry**: Used for high-performance testing, fuzzing, and professional gas/coverage reporting.
- **Hardhat**: Used for deployment scripts, local node simulation, and integration tasks.

---

## 🛠️ Foundry Toolkit

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:
- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## 📚 Documentation

- [Foundry Book](https://book.getfoundry.sh/)
- [Professional Gas & Coverage Report](./GAS_AND_COVERAGE_REPORT.md) — Detailed analysis of contract performance and testing depth.

### Reports Generation

To generate the reports locally, use the following commands:

```shell
# Gas Report
$ forge test --gas-report

# Coverage Report
$ forge coverage --report summary
```

## ⚙️ Usage

### Build
```shell
$ forge build
```

### Test
```shell
$ forge test
```

### Format
```shell
$ forge fmt
```

### Gas Snapshots
```shell
$ forge snapshot
```

### Deploy (Foundry)
```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Help
```shell
$ forge --help
$ anvil --help
$ cast --help
```
