# Decentralized Identity Verification System

This is a full-stack decentralized application for identity verification and KYC-gated auctions. The project consists of smart contracts, a Node.js backend for off-chain data and logic, and a Next.js frontend for user interaction.

## Project Structure

- `/contracts`: Smart contracts (Solidity).
- `/backend`: Node.js Express server for identity management and blockchain synchronization.
- `/src`: Next.js frontend application.
- `/scripts`: Deployment and utility scripts.
- `/test`: Foundry and Hardhat test suites.

## System Components

### Smart Contracts
- **Identity Verifier**: Manages verifier roles, staking, and identity hash verification.
- **KYC Gated Auction**: Handles auction logic restricted to verified users.

### Backend
- Built with Node.js and Express.
- Manages off-chain identity documents and interacts with Pinata for IPFS storage.
- Synchronizes blockchain events with a local MySQL database via Sequelize.
- Provides APIs for KYC submission and authentication.

### Frontend
- Built with Next.js and React.
- Provides an administrative interface for verifiers and an auction portal for users.
- Integrates with MetaMask for blockchain interactions.

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18 or higher.
- **Foundry**: For smart contract testing and development. [Install Foundry](https://book.getfoundry.sh/getting-started/installation).
- **MySQL**: For backend database management.
- **MetaMask**: Browser extension for blockchain interaction.

### 1. Global Setup
Clone the repository and install dependencies:

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

### 2. Database Configuration
1. Ensure your MySQL server is running.
2. The backend will automatically create the database if it doesn't exist, but you need to provide the correct credentials in the environment variables.

### 3. Pinata Setup (IPFS)
1. Create an account at [Pinata](https://www.pinata.cloud/).
2. Generate an **API Key** and **Secret API Key**, or a **JWT token**.
3. These will be used for storing encrypted identity documents on IPFS.

### 4. Environment Variables
> [!IMPORTANT]
> **You must provide your own credentials.** The application will not function correctly with the placeholder values. Replace all `your_...` placeholders with your actual API keys, private keys, and RPC URLs.

You need to set up environment variables for both the root (frontend/deployment) and the backend.

#### Root Environment (`.env`)
Create a `.env` file in the root directory:
```env
# Blockchain Deployment
SEPOLIA_RPC_URL=your_sepolia_rpc_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# Frontend Config
NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS=deployed_identity_contract_address
NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS=deployed_auction_contract_address
NEXT_PUBLIC_EXPECTED_CHAIN_ID=11155111
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api
```

#### Backend Environment (`backend/.env`)
Create a `.env` file in the `backend` directory:
```env
PORT=5001
JWT_SECRET=your_random_jwt_secret
RPC_URL=your_sepolia_rpc_url
VERIFIER_PRIVATE_KEY=your_verifier_private_key
IDENTITY_CONTRACT_ADDRESS=deployed_identity_contract_address
AUCTION_CONTRACT_ADDRESS=deployed_auction_contract_address

# Database Config
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=blockchain_db
DB_PORT=3306

# Pinata Config
PINATA_JWT=your_pinata_jwt
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_api_key
```

---

## Documentation

- **[Full Project Report](./docs/Report.pdf)**: Comprehensive overview of the project, architecture, and analysis.
- **[Gas and Coverage Report](./GAS_AND_COVERAGE_REPORT.md)**: Detailed smart contract gas metrics and test coverage results.

---

## Deployment & Usage

### 1. Smart Contracts
Compile and deploy the contracts to Sepolia (or your preferred network):

```shell
# Compile
forge build

# Deploy (using Hardhat script)
npx hardhat run scripts/deploy.js --network sepolia
```
*Note: After deployment, copy the contract addresses to both `.env` files.*

### 2. Backend Server
The backend handles event synchronization and KYC document management.

```shell
cd backend
npm start
```
The backend includes a **Blockchain Listener** that syncs on-chain events with the MySQL database.

### 3. Frontend Application
Run the Next.js development server:

```shell
# From the root directory
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Setting up a Verifier
To test the full flow, you may need to authorize a verifier:
```shell
npx hardhat run scripts/setup-verifier.js --network sepolia
```

---

## Development & Testing

### Smart Contract Testing (Foundry)
```shell
forge test
forge test --gas-report
```

### Hardhat Tests
```shell
npx hardhat test
```

---

## Troubleshooting
- **CORS Issues**: The backend has a manual CORS handler. Ensure `NEXT_PUBLIC_API_BASE_URL` matches your backend address.
- **Database Connection**: Ensure MySQL is running and the credentials in `backend/.env` are correct.
- **RPC Issues**: If using Sepolia, ensure your RPC URL is valid and you have enough test ETH.
- **IPFS Uploads**: Check your Pinata API keys if identity document uploads fail.

## License
This project is licensed under the MIT License.

## Team members
- 240041030 - Ramanuj Kartik
- 240001077 - Vataliya suhani
- 240041033 - sana Tejasri
- 240041037 - vaghasiya parl
- 240004001 - Aastha
- 240021015 - Sakshya
