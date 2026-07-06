// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AuditTrail {
    struct AuditEntry {
        address actor;
        bytes32 recordId;
        string action;
        string metadataHash;
        uint256 timestamp;
    }

    AuditEntry[] private entries;

    event AuditLogged(uint256 indexed index, address indexed actor, bytes32 indexed recordId, string action, uint256 timestamp);

    function logAction(bytes32 recordId, string calldata action, string calldata metadataHash) external returns (uint256) {
        entries.push(
            AuditEntry({
                actor: msg.sender,
                recordId: recordId,
                action: action,
                metadataHash: metadataHash,
                timestamp: block.timestamp
            })
        );

        uint256 index = entries.length - 1;
        emit AuditLogged(index, msg.sender, recordId, action, block.timestamp);
        return index;
    }

    function getEntry(uint256 index) external view returns (address, bytes32, string memory, string memory, uint256) {
        require(index < entries.length, "Invalid index");
        AuditEntry memory entry = entries[index];
        return (entry.actor, entry.recordId, entry.action, entry.metadataHash, entry.timestamp);
    }

    function count() external view returns (uint256) {
        return entries.length;
    }
}

