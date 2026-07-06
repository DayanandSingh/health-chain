# Blockchain-Based Healthcare Record System

A final-year project demonstrating patient-owned electronic health records with JWT authentication, role-based access, MongoDB persistence, IPFS-style off-chain file storage, and Ethereum smart contracts for record hash verification and audit integrity.

## Project Phases

1. Folder Structure
2. Backend API
3. Blockchain Contracts
4. IPFS Integration
5. Frontend
6. Testing
7. Documentation

## Tech Stack

- Frontend: React, Tailwind CSS, Axios, React Router
- Backend: Node.js, Express.js, MongoDB
- Blockchain: Solidity, Hardhat, Ethereum-compatible local network
- Storage: IPFS-compatible service with local mock fallback
- Authentication: JWT, bcrypt

## Folder Structure

```text
backend/      Express API, MongoDB models, auth, RBAC, IPFS/blockchain services
blockchain/   Solidity contracts, Hardhat config, deployment script, tests
frontend/     React dashboard application
docs/         Final-year project documentation and diagrams
outputs/      User-facing deliverables
```

## Quick Start

Copy each example environment file before running the services:

```bash
cp backend/.env.example backend/.env
cp blockchain/.env.example blockchain/.env
cp frontend/.env.example frontend/.env
```

Install dependencies in each package:

```bash
cd backend && npm install
cd ../blockchain && npm install
cd ../frontend && npm install
```

Run MongoDB locally, then start the backend:

```bash
cd backend
npm run dev
```

Run the blockchain locally:

```bash
cd blockchain
npm run node
npm run deploy:local
```

Start the frontend:

```bash
cd frontend
npm run dev
```

## Demo Credentials

Register users from the UI with any role. Use local Hardhat wallet addresses for blockchain demo flows.

## Documentation

See [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) for abstract, diagrams, testing, results, future scope, and conclusion.

