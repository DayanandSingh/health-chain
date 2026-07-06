// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AccessControl {
    enum Role {
        None,
        Patient,
        Doctor,
        HospitalAdmin,
        Laboratory,
        Pharmacist,
        SystemAdmin
    }

    enum PermissionType {
        Read,
        Write,
        Update,
        Revoke
    }

    address public owner;

    mapping(address => Role) public roles;
    mapping(bytes32 => mapping(address => bool)) public recordPermission;
    mapping(bytes32 => mapping(address => mapping(PermissionType => bool))) public permissionTypes;

    event UserRegistered(address indexed user, Role role, uint256 timestamp);
    event PermissionGranted(bytes32 indexed recordId, address indexed patient, address indexed grantee, uint256 timestamp);
    event PermissionRevoked(bytes32 indexed recordId, address indexed patient, address indexed grantee, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyPatientOrAdmin() {
        require(roles[msg.sender] == Role.Patient || roles[msg.sender] == Role.SystemAdmin || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.SystemAdmin;
    }

    function registerUser(address user, Role role) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(role != Role.None, "Invalid role");
        roles[user] = role;
        emit UserRegistered(user, role, block.timestamp);
    }

    function grantPermission(bytes32 recordId, address grantee, PermissionType[] calldata permissions) external onlyPatientOrAdmin {
        require(grantee != address(0), "Invalid grantee");
        recordPermission[recordId][grantee] = true;

        for (uint256 i = 0; i < permissions.length; i++) {
            permissionTypes[recordId][grantee][permissions[i]] = true;
        }

        emit PermissionGranted(recordId, msg.sender, grantee, block.timestamp);
    }

    function revokePermission(bytes32 recordId, address grantee) external onlyPatientOrAdmin {
        recordPermission[recordId][grantee] = false;
        permissionTypes[recordId][grantee][PermissionType.Read] = false;
        permissionTypes[recordId][grantee][PermissionType.Write] = false;
        permissionTypes[recordId][grantee][PermissionType.Update] = false;
        permissionTypes[recordId][grantee][PermissionType.Revoke] = false;
        emit PermissionRevoked(recordId, msg.sender, grantee, block.timestamp);
    }

    function hasPermission(bytes32 recordId, address user, PermissionType permissionType) external view returns (bool) {
        return recordPermission[recordId][user] && permissionTypes[recordId][user][permissionType];
    }
}

