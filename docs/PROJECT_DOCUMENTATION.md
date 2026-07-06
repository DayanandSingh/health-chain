# Blockchain-Based Healthcare Record System

## 1. Abstract

The Blockchain-Based Healthcare Record System is a decentralized electronic health record platform where patients own their medical data and can grant or revoke access to doctors, hospitals, laboratories, and pharmacists. Large medical files are stored off-chain using IPFS-compatible storage, while SHA256 hashes and permission events are stored on Ethereum smart contracts to provide tamper evidence and auditability.

## 2. Introduction

Healthcare records are often scattered across hospitals, clinics, laboratories, and pharmacies. This creates duplication, slow verification, and weak patient control. The proposed system combines a web application, secure REST API, MongoDB, IPFS storage, and Ethereum smart contracts to make health records portable, verifiable, and access controlled.

## 3. Problem Statement

Traditional healthcare record systems are centralized and institution-controlled. Patients cannot easily control who accesses their records, medical histories can be difficult to verify, and audit trails are often incomplete. A secure, decentralized, role-based system is required to improve trust, privacy, and transparency.

## 4. Existing System

- Hospital-centric record ownership
- Manual report sharing through paper, email, or messaging apps
- Limited tamper detection
- Weak cross-institution interoperability
- Centralized audit trail controlled by a single organization

## 5. Proposed System

The system allows registered patients to manage profiles, upload reports, and control permissions. Doctors and other healthcare roles can view or update records only when authorized. IPFS stores the documents, MongoDB stores application metadata, and Ethereum smart contracts store record hashes and permission/audit events.

## 6. Objectives

- Secure electronic health records
- Blockchain-based record verification
- Patient-controlled access management
- Tamper-proof medical history
- Decentralized file storage
- Role-based authorization
- Smart contract-based permissions
- Complete audit trail

## 7. Architecture Diagram

```mermaid
flowchart LR
  U["Patient / Doctor / Admin"] --> F["React Frontend"]
  F --> A["Express REST API"]
  A --> M["MongoDB"]
  A --> I["IPFS Storage"]
  A --> B["Ethereum Smart Contracts"]
  W["MetaMask Wallet"] --> F
  B --> C1["AccessControl.sol"]
  B --> C2["MedicalRecord.sol"]
  B --> C3["AuditTrail.sol"]
```

## 8. Use Case Diagram

```mermaid
flowchart TB
  Patient["Patient"] --> Register["Register/Login"]
  Patient --> Upload["Upload Reports"]
  Patient --> Grant["Grant Access"]
  Patient --> Revoke["Revoke Access"]
  Patient --> Logs["View Audit Logs"]
  Doctor["Doctor"] --> View["View Authorized Records"]
  Doctor --> Diagnosis["Add Diagnosis"]
  Doctor --> Prescription["Add Prescription"]
  Lab["Laboratory"] --> LabReport["Upload Lab Report"]
  Pharmacist["Pharmacist"] --> Rx["View Prescription"]
  Admin["System Admin"] --> Manage["Manage Users and Stats"]
```

## 9. ER Diagram

```mermaid
erDiagram
  USERS ||--o| PATIENTS : creates
  USERS ||--o| DOCTORS : creates
  USERS ||--o{ PERMISSIONS : receives
  PATIENTS ||--o{ MEDICAL_RECORDS : owns
  DOCTORS ||--o{ MEDICAL_RECORDS : writes
  HOSPITALS ||--o{ MEDICAL_RECORDS : stores
  PATIENTS ||--o{ PERMISSIONS : grants
  MEDICAL_RECORDS ||--o{ AUDIT_LOGS : tracks
  USERS ||--o{ AUDIT_LOGS : performs
```

## 10. Data Flow Diagram

```mermaid
flowchart TD
  A["User Uploads Report"] --> B["Backend Validates Role and JWT"]
  B --> C["Upload File to IPFS"]
  C --> D["Receive CID"]
  D --> E["Generate SHA256 Hash"]
  E --> F["Store Metadata in MongoDB"]
  E --> G["Store Hash on Blockchain"]
  F --> H["Return Record"]
  G --> H
```

## 11. Sequence Diagram

```mermaid
sequenceDiagram
  actor Patient
  participant UI as React UI
  participant API as Express API
  participant IPFS
  participant DB as MongoDB
  participant ETH as Ethereum
  Patient->>UI: Upload medical report
  UI->>API: POST /api/record
  API->>API: Validate JWT and role
  API->>IPFS: Store file
  IPFS-->>API: CID
  API->>API: Generate SHA256 hash
  API->>ETH: storeRecordHash
  ETH-->>API: Transaction ID
  API->>DB: Save record metadata
  API-->>UI: Record created
```

## 12. Testing

### Backend Tests

- Authentication validation
- Protected route access
- Permission grant and revoke flow
- Medical record verification
- Audit log creation

### Smart Contract Tests

- Store record hash
- Verify valid hash
- Reject changed hash
- Grant and revoke permissions
- Append audit entries

### Frontend Tests

- Registration and login navigation
- Role-specific dashboard rendering
- Record search and verification UI
- Permission form validation
- Admin statistics rendering

## 13. Results

The completed prototype demonstrates secure user registration, JWT login, role-based dashboards, patient profile storage, medical record metadata, IPFS-style report CIDs, blockchain-style record hashes, access permissions, QR sharing, and audit logs.

## 14. Future Scope

- Live Pinata/Web3.Storage integration
- Ethers.js contract calls from the backend
- Multi-hospital onboarding workflow
- Patient consent expiry automation
- FHIR-compatible health data import/export
- Mobile application
- Cloud deployment with CI/CD

## 15. Conclusion

This project demonstrates how blockchain can strengthen healthcare record management by separating heavy file storage from immutable verification. Patients gain access control, doctors receive trusted records, and administrators can audit activity without compromising private medical documents.

