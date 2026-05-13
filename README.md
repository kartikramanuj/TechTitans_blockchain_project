# TechTitans Blockchain Project

This is a full-stack decentralized application for identity verification and KYC-gated auctions. The project consists of smart contracts, a Node.js backend for off-chain data and logic, and a Next.js frontend for user interaction.

## Project Structure

- /contracts: Smart contracts (Solidity).
- /backend: Node.js Express server for identity management and blockchain synchronization.
- /src: Next.js frontend application.
- /test: Foundry and Hardhat test suites.

## System Components

### Smart Contracts
- Identity Verifier: Manages verifier roles, staking, and identity hash verification.
- KYC Gated Auction: Handles auction logic restricted to verified users.

### Backend
- Built with Node.js and Express.
- Manages off-chain identity documents and interacts with Pinata for IPFS storage.
- Synchronizes blockchain events with a local MySQL database via Sequelize.
- Provides APIs for KYC submission and authentication.

### Frontend
- Built with Next.js and React.
- Provides an administrative interface for verifiers and an auction portal for users.
- Integrates with MetaMask for blockchain interactions.

## Installation

### Prerequisites
- Node.js (v18+)
- Foundry (for smart contract testing)
- MySQL (for backend database)

### Global Setup
Clone the repository and install dependencies for the root and backend:

```shell
git clone https://github.com/Suhani-006/TechTitans_blockchain_project
cd TechTitans_blockchain_project

# Install frontend and root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## Configuration

### Backend
Create a `.env` file in the `backend` directory using `.env.example` as a template. You will need:
- Database credentials (MySQL).
- Pinata API keys (for IPFS).
- Ethereum RPC URL and Private Key.

### Frontend
Create a `.env` file in the root directory for Next.js environment variables.

## Usage

### Smart Contracts (Foundry)

Compile contracts:
```shell
forge build
```

Run tests:
```shell
forge test
```

Generate Gas Report:
```shell
forge test --gas-report
```

For detailed contract metrics, see [GAS_AND_COVERAGE_REPORT.md](./GAS_AND_COVERAGE_REPORT.md).

### Backend Server

Start the backend:
```shell
cd backend
npm start
```

### Frontend Application

Start the development server:
```shell
# From the root directory
npm run dev
```

The application will be available at http://localhost:3000.

## Documentation

- [Smart Contract Gas and Coverage Report](./GAS_AND_COVERAGE_REPORT.md)
- [Foundry Documentation](https://book.getfoundry.sh/)

## Architecture

The project employs a hybrid development strategy:
- Foundry: High-performance contract testing and gas optimization.
- Hardhat: Deployment scripts and ecosystem integration.
- Next.js: Modern, responsive frontend.
- Express/Sequelize: Robust backend and database management.
