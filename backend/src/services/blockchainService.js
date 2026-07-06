const { sha256Text } = require("../utils/hash");
const { ethers } = require("ethers");

const medicalRecordAbi = [
  "function storeRecordHash(bytes32 recordId, bytes32 recordHash) external",
  "function updateRecordHash(bytes32 recordId, bytes32 newHash) external",
  "function verifyRecord(bytes32 recordId, bytes32 candidateHash) external view returns (bool)"
];

const accessControlAbi = [
  "function grantPermission(bytes32 recordId, address grantee, uint8[] permissions) external",
  "function revokePermission(bytes32 recordId, address grantee) external"
];

function toBytes32(value) {
  return ethers.id(String(value));
}

function hashToBytes32(hash) {
  return hash.startsWith("0x") ? hash : `0x${hash}`;
}

function getWallet() {
  if (!process.env.BACKEND_WALLET_PRIVATE_KEY) {
    throw new Error("BACKEND_WALLET_PRIVATE_KEY is required for live blockchain mode.");
  }
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  return new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);
}

async function storeRecordHash({ recordId, recordHash, owner }) {
  if (process.env.BLOCKCHAIN_MODE === "mock") {
    return {
      txId: `0xmock${sha256Text(`${recordId}:${recordHash}:${owner}`).slice(0, 58)}`,
      status: "stored"
    };
  }

  if (!process.env.MEDICAL_RECORD_CONTRACT) {
    throw new Error("MEDICAL_RECORD_CONTRACT is required for live blockchain mode.");
  }

  const contract = new ethers.Contract(process.env.MEDICAL_RECORD_CONTRACT, medicalRecordAbi, getWallet());
  const tx = await contract.storeRecordHash(toBytes32(recordId), hashToBytes32(recordHash));
  const receipt = await tx.wait();
  return { txId: receipt.hash, status: "stored", owner };
}

async function updateRecordHash({ recordId, recordHash, owner }) {
  if (process.env.BLOCKCHAIN_MODE === "mock") {
    return {
      txId: `0xupdate${sha256Text(`${recordId}:${recordHash}:${owner}`).slice(0, 55)}`,
      status: "updated"
    };
  }

  if (!process.env.MEDICAL_RECORD_CONTRACT) {
    throw new Error("MEDICAL_RECORD_CONTRACT is required for live blockchain mode.");
  }

  const contract = new ethers.Contract(process.env.MEDICAL_RECORD_CONTRACT, medicalRecordAbi, getWallet());
  const tx = await contract.updateRecordHash(toBytes32(recordId), hashToBytes32(recordHash));
  const receipt = await tx.wait();
  return { txId: receipt.hash, status: "updated", owner };
}

async function verifyRecordHash({ recordId, recordHash, expectedHash }) {
  if (process.env.BLOCKCHAIN_MODE !== "mock" && process.env.MEDICAL_RECORD_CONTRACT && recordId) {
    const contract = new ethers.Contract(process.env.MEDICAL_RECORD_CONTRACT, medicalRecordAbi, getWallet());
    const verified = await contract.verifyRecord(toBytes32(recordId), hashToBytes32(recordHash));
    return {
      verified,
      status: verified ? "VERIFIED" : "TAMPERED"
    };
  }

  return {
    verified: recordHash === expectedHash,
    status: recordHash === expectedHash ? "VERIFIED" : "TAMPERED"
  };
}

async function grantPermission({ recordId, patientWallet, granteeWallet, permissionTypes }) {
  if (process.env.BLOCKCHAIN_MODE === "mock") {
    return {
      txId: `0xgrant${sha256Text(`${recordId}:${patientWallet}:${granteeWallet}:${permissionTypes.join(",")}`).slice(0, 56)}`
    };
  }

  if (!process.env.ACCESS_CONTROL_CONTRACT) {
    throw new Error("ACCESS_CONTROL_CONTRACT is required for live blockchain mode.");
  }

  const map = { read: 0, write: 1, update: 2, revoke: 3 };
  const contract = new ethers.Contract(process.env.ACCESS_CONTROL_CONTRACT, accessControlAbi, getWallet());
  const tx = await contract.grantPermission(toBytes32(recordId), granteeWallet, permissionTypes.map((item) => map[item]));
  const receipt = await tx.wait();
  return { txId: receipt.hash, patientWallet };
}

async function revokePermission({ recordId, patientWallet, granteeWallet }) {
  if (process.env.BLOCKCHAIN_MODE === "mock") {
    return {
      txId: `0xrevoke${sha256Text(`${recordId}:${patientWallet}:${granteeWallet}`).slice(0, 55)}`
    };
  }

  if (!process.env.ACCESS_CONTROL_CONTRACT) {
    throw new Error("ACCESS_CONTROL_CONTRACT is required for live blockchain mode.");
  }

  const contract = new ethers.Contract(process.env.ACCESS_CONTROL_CONTRACT, accessControlAbi, getWallet());
  const tx = await contract.revokePermission(toBytes32(recordId), granteeWallet);
  const receipt = await tx.wait();
  return { txId: receipt.hash, patientWallet };
}

module.exports = { storeRecordHash, updateRecordHash, verifyRecordHash, grantPermission, revokePermission };
