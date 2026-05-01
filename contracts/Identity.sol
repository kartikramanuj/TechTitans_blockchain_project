// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract IdentityVerifier is AccessControl, ReentrancyGuard {

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    uint256 public constant MAX_REQUESTS = 4;
    uint256 public constant VERIFICATION_FEE = 0.01 ether;
    uint256 public constant VERIFICATION_WINDOW = 1 days;
    uint256 public constant PENALTY = 0.005 ether;

    enum Status { None, Pending, Verified, Revoked, Rejected }

    struct Identity {
        bytes32 identityHash;
        Status status;
        address assignedVerifier;
        address verifiedBy;
        uint256 timestamp;
        uint256 deadline;
        uint256 reward;
        bool settled;
    }

    mapping(address => Identity) public identities;
    mapping(bytes32 => bool) public usedHashes;
    mapping(address => uint256) public requestCount;

    mapping(address => uint256) public stake;
    address[] public activeVerifiers;
    mapping(address => uint256) private activeIndex;
    uint256 public activePointer;

    mapping(address => uint256) public pendingWithdrawals;

    event IdentitySubmitted(address indexed user, address verifier, uint256 deadline);
    event IdentityVerified(address indexed user, address verifier);
    event IdentityRejected(address indexed user, address verifier);
    event IdentityExpired(address indexed user);
    event VerifierPenalized(address indexed verifier);
    event Withdrawal(address indexed to, uint256 amount);
    event VerifierActivated(address verifier);
    event VerifierDeactivated(address verifier);
    event IdentityRevoked(address indexed user);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addVerifier(address v) external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        require(v != address(0), "Invalid verifier");
        require(msg.value >= PENALTY, "Stake required");
        grantRole(VERIFIER_ROLE, v);
        stake[v] += msg.value;
        if (stake[v] >= PENALTY) { _addActive(v); }
    }

    function removeVerifier(address v) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VERIFIER_ROLE, v);
        _removeActive(v);
    }

    function revokeIdentity() external {
        Identity storage id = identities[msg.sender];
        require(id.status != Status.None, "No identity found");
        id.status = Status.Revoked;
        emit IdentityRevoked(msg.sender);
    }

    function topUpStake() external payable onlyRole(VERIFIER_ROLE) {
        require(msg.value > 0, "No value");
        stake[msg.sender] += msg.value;
        if (stake[msg.sender] >= PENALTY) { _addActive(msg.sender); }
    }

    function _addActive(address v) internal {
        if (activeIndex[v] == 0) {
            activeVerifiers.push(v);
            activeIndex[v] = activeVerifiers.length;
            emit VerifierActivated(v);
        }
    }

    function _removeActive(address v) internal {
        uint256 idxPlus = activeIndex[v];
        if (idxPlus == 0) return;
        uint256 idx = idxPlus - 1;
        uint256 last = activeVerifiers.length - 1;
        if (idx != last) {
            address lastAddr = activeVerifiers[last];
            activeVerifiers[idx] = lastAddr;
            activeIndex[lastAddr] = idx + 1;
        }
        activeVerifiers.pop();
        activeIndex[v] = 0;
        emit VerifierDeactivated(v);
    }

    function _assignVerifier() internal returns (address) {
        require(activeVerifiers.length > 0, "No active verifier");
        address v = activeVerifiers[activePointer % activeVerifiers.length];
        activePointer++;
        return v;
    }

    function submitIdentity(bytes32 hash) external payable {
        require(msg.value >= VERIFICATION_FEE, "Fee required");
        require(hash != bytes32(0), "Invalid hash");
        require(!usedHashes[hash], "Hash already used");
        require(requestCount[msg.sender] < MAX_REQUESTS, "Limit reached");

        address assigned = _assignVerifier();

        identities[msg.sender] = Identity({
            identityHash: hash,
            status: Status.Pending,
            assignedVerifier: assigned,
            verifiedBy: address(0),
            timestamp: block.timestamp,
            deadline: block.timestamp + VERIFICATION_WINDOW,
            reward: msg.value,
            settled: false
        });

        requestCount[msg.sender]++;
        usedHashes[hash] = true;
        emit IdentitySubmitted(msg.sender, assigned, block.timestamp + VERIFICATION_WINDOW);
    }

    function verifyIdentity(address user, bytes32 computedHash) external onlyRole(VERIFIER_ROLE) nonReentrant {
        Identity storage id = identities[user];
        require(id.status == Status.Pending, "Not pending");
        require(msg.sender == id.assignedVerifier, "Not assigned");
        require(block.timestamp <= id.deadline, "Expired");
        require(id.identityHash == computedHash, "Hash mismatch");

        id.status = Status.Verified;
        id.verifiedBy = msg.sender;
        id.settled = true;
        pendingWithdrawals[msg.sender] += id.reward;
        emit IdentityVerified(user, msg.sender);
    }

    function rejectIdentity(address user) external onlyRole(VERIFIER_ROLE) nonReentrant {
        Identity storage id = identities[user];
        require(id.status == Status.Pending, "Not pending");
        require(msg.sender == id.assignedVerifier, "Not assigned");
        require(block.timestamp <= id.deadline, "Expired");

        id.status = Status.Rejected;
        id.verifiedBy = msg.sender;
        id.settled = true;
        pendingWithdrawals[msg.sender] += id.reward;
        emit IdentityRejected(user, msg.sender);
    }

    function settleExpired(address user) external nonReentrant {
        Identity storage id = identities[user];
        require(id.status == Status.Pending, "Not pending");
        require(block.timestamp > id.deadline, "Still active");
        id.settled = true;
        id.status = Status.Revoked;
        address v = id.assignedVerifier;
        if (stake[v] >= PENALTY) { stake[v] -= PENALTY; } else { stake[v] = 0; }
        if (stake[v] < PENALTY) { _removeActive(v); }
        pendingWithdrawals[user] += id.reward;
        emit IdentityExpired(user);
        emit VerifierPenalized(v);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    function isVerified(address user) public view returns (bool) {
        return identities[user].status == Status.Verified;
    }

    function getIdentity(address user) external view returns (
        bytes32 identityHash,
        Status status,
        address assignedVerifier,
        uint256 timestamp,
        uint256 deadline,
        uint256 reward,
        bool settled
    ) {
        Identity memory id = identities[user];
        return (id.identityHash, id.status, id.assignedVerifier, id.timestamp, id.deadline, id.reward, id.settled);
    }
}
