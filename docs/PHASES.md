# Build Phases

## Phase 1: Folder Structure

Created `backend`, `blockchain`, `frontend`, `docs`, and `outputs` folders with modular subfolders.

## Phase 2: Backend

Implemented Express API with MongoDB models, JWT authentication, bcrypt password hashing, validation, Helmet, CORS, rate limiting, XSS protection, RBAC middleware, medical records, permissions, audit logs, and admin statistics.

## Phase 3: Blockchain

Implemented:

- `AccessControl.sol`
- `MedicalRecord.sol`
- `AuditTrail.sol`

Added Hardhat config, deployment script, environment file, and contract test.

## Phase 4: IPFS Integration

Implemented IPFS-compatible upload service. The default `mock` mode generates deterministic local CIDs so the final-year demo can run without external accounts.

## Phase 5: Frontend

Implemented React UI with landing, login, register, dashboards, records, permissions, profile, audit, and admin pages.

## Phase 6: Testing

Included package scripts for backend Jest and blockchain Hardhat tests.

## Phase 7: Documentation

Generated full project documentation with architecture, use case, ER, data flow, sequence, testing, results, future scope, and conclusion.

