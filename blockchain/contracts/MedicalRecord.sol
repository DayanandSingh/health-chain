// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MedicalRecord {
    struct RecordHash {
        bytes32 recordId;
        bytes32 recordHash;
        address owner;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => RecordHash) private records;

    event RecordHashStored(bytes32 indexed recordId, bytes32 indexed recordHash, address indexed owner, uint256 timestamp);
    event RecordHashUpdated(bytes32 indexed recordId, bytes32 indexed oldHash, bytes32 indexed newHash, uint256 timestamp);

    modifier onlyOwner(bytes32 recordId) {
        require(records[recordId].owner == msg.sender, "Only record owner");
        _;
    }

    function storeRecordHash(bytes32 recordId, bytes32 recordHash) external {
        require(recordId != bytes32(0), "Invalid record id");
        require(recordHash != bytes32(0), "Invalid hash");
        require(!records[recordId].exists, "Record already exists");

        records[recordId] = RecordHash({
            recordId: recordId,
            recordHash: recordHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        emit RecordHashStored(recordId, recordHash, msg.sender, block.timestamp);
    }

    function updateRecordHash(bytes32 recordId, bytes32 newHash) external onlyOwner(recordId) {
        require(newHash != bytes32(0), "Invalid hash");
        bytes32 oldHash = records[recordId].recordHash;
        records[recordId].recordHash = newHash;
        records[recordId].timestamp = block.timestamp;
        emit RecordHashUpdated(recordId, oldHash, newHash, block.timestamp);
    }

    function verifyRecord(bytes32 recordId, bytes32 candidateHash) external view returns (bool) {
        return records[recordId].exists && records[recordId].recordHash == candidateHash;
    }

    function getRecord(bytes32 recordId) external view returns (bytes32, bytes32, address, uint256, bool) {
        RecordHash memory item = records[recordId];
        return (item.recordId, item.recordHash, item.owner, item.timestamp, item.exists);
    }
}

