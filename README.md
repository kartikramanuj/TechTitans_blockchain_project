# Decentralized Identity Verification and KYC-Gated Auction System

A professional blockchain-based platform for secure identity management and regulated auction participation using Ethereum, IPFS, and a Node.js/MySQL backend.

## 🚀 Overview

This project implements a **Hybrid Storage Model** for decentralized KYC (Know Your Customer) verification. It ensures that sensitive identity documents remain private and off-chain (on IPFS) while providing cryptographic proofs and automated enforcement on the Ethereum blockchain.

### Key Features
- **Decentralized KYC:** Users submit identity proofs via IPFS.
- **Economic Accountability:** Verifiers must stake ETH to participate and are penalized (slashed) for inactivity or malicious behavior.
- **Composability:** The `KYCGatedAuction` contract automatically verifies user status through the `IdentityVerifier` contract before allowing bids.
- **Manual Reward System:** Verifiers claim rewards through a secure pull-payment (withdraw) mechanism.
- **Real-time Synchronization:** A robust backend service reconciles blockchain events with a local database for optimized UI performance.

---

## 🏗 Architecture

The system consists of four primary layers:
1.  **Smart Contract Layer:** Solidity contracts (`Identity.sol`, `KYCGatedAuction.sol`) deployed on Sepolia.
2.  **Decentralized Storage:** Document storage via **IPFS** and **Pinata**.
3.  **Backend Layer:** Node.js/Express server with **Sequelize/MySQL** for state caching and event polling.
4.  **Frontend Layer:** A modern, responsive **Next.js** dashboard with MetaMask integration.

---

## 🛠 Tech Stack

- **Blockchain:** Ethereum (Sepolia Testnet), Hardhat, Ethers.js
- **Storage:** IPFS, Pinata
- **Frontend:** Next.js, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, MySQL, Sequelize
- **Security:** OpenZeppelin (AccessControl, ReentrancyGuard)

---

## 🚥 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server
- MetaMask Extension
- Pinata API Keys (JWT)

### 2. Environment Setup
Create a `.env` file in both the **root** and **backend** directories based on the provided `.env.example` files.

### 3. Installation
```bash
# Install root dependencies (Frontend & Hardhat)
npm install

# Install backend dependencies
cd backend
npm install
```

### 4. Running the Project
```bash
# Start MySQL and ensure the database 'blockchain_db' exists

# Start Backend (Port 5001)
cd backend
npm start

# Start Frontend (Port 3000)
# In a new terminal from the root directory
npm run dev
```

---

## 🧪 Testing and Gas Analysis

The project includes a comprehensive test suite covering core identity and auction logic.

```bash
# Run tests with Gas Reporter
npx hardhat test
```

### Measured Gas Usage (Average)
- **Submit Identity:** 212,479 gas
- **Verify Identity:** 108,200 gas
- **Withdraw Rewards:** 33,186 gas
- **Place Bid:** 58,758 gas

---

## 📜 Smart Contract Addresses (Sepolia)
- **Identity Verifier:** `0xCb6ac6401c473F6CD126eFfA8A8d860582CB265c`
- **KYC-Gated Auction:** `0x72203506D428cd5BFa10f6F3FeF3BD0538D444B8`

---

## 📄 Documentation
A comprehensive **Technical Project Report** is available in the `docs/` directory:
- [Technical Project Report (PDF)](docs/Report_CS218.pdf)

### Highlights from the Report:
- **Low-Level EVM Analysis:** Detailed breakdown of opcodes and storage costs.
- **Gas Optimization:** In-depth analysis of how we reduced costs for core functions (e.g., optimizing `submitIdentity` from 212k to 184k gas by moving CID storage off-chain).
- **Security Model:** Verification state machine and slashing mechanism details.

---

## 👥 Contributors
- **Kartik Ramanuj** (240041030)
- **Parl Vaghasiya** (240041037)
- **Sana Tejasri** (240041033)
- **Suhani Vataliya** (240001077)
- **Aastha** (240004001)
- **Sakshya Singh Kasera** (240021015)

---

## 📄 License
This project is licensed under the ISC License.
