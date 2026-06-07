// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {IdentityVerifier} from "../contracts/Identity.sol";

contract IdentityTest is Test {
    IdentityVerifier public verifier;
    address public admin = address(1);
    address public user = address(2);
    address public verifierAddr = address(3);

    uint256 public constant VERIFICATION_FEE = 0.0001 ether;
    uint256 public constant MIN_STAKE = 0.0005 ether;

    function setUp() public {
        vm.startPrank(admin);
        verifier = new IdentityVerifier();
        verifier.addVerifier(verifierAddr);
        vm.stopPrank();

        vm.deal(verifierAddr, 1 ether);
        vm.prank(verifierAddr);
        verifier.activateVerifier{value: MIN_STAKE}();
    }

    function test_SubmitIdentity() public {
        vm.deal(user, 1 ether);
        bytes32 hash = keccak256("user_id_1");

        vm.prank(user);
        verifier.submitIdentity{value: VERIFICATION_FEE}(hash);

        (bytes32 identityHash, IdentityVerifier.Status status, address assignedVerifier, , , , ) = verifier.getIdentity(user);
        
        assertEq(identityHash, hash);
        assertEq(uint(status), uint(IdentityVerifier.Status.Pending));
        assertEq(assignedVerifier, verifierAddr);
    }

    function test_VerifyIdentity() public {
        test_SubmitIdentity();
        bytes32 hash = keccak256("user_id_1");

        vm.prank(verifierAddr);
        verifier.verifyIdentity(user, hash);

        assertTrue(verifier.isVerified(user));
    }

    function test_RejectIdentity() public {
        test_SubmitIdentity();

        vm.prank(verifierAddr);
        verifier.rejectIdentity(user);

        assertFalse(verifier.isVerified(user));
        ( , IdentityVerifier.Status status, , , , , ) = verifier.getIdentity(user);
        assertEq(uint(status), uint(IdentityVerifier.Status.Rejected));
    }

    function test_SettleExpired() public {
        test_SubmitIdentity();

        // Advance time beyond VERIFICATION_WINDOW (1 day)
        skip(1 days + 1);

        uint256 verifierStakeBefore = verifier.stake(verifierAddr);

        verifier.settleExpired(user);

        uint256 userPendingWithdrawal = verifier.pendingWithdrawals(user);
        // Reward (0.0001) + Penalty (0.00005)
        assertEq(userPendingWithdrawal, 0.0001 ether + 0.00005 ether);
        assertEq(verifier.stake(verifierAddr), verifierStakeBefore - 0.00005 ether);
    }

    function test_Withdraw() public {
        test_VerifyIdentity();

        uint256 verifierBalanceBefore = verifierAddr.balance;
        uint256 pending = verifier.pendingWithdrawals(verifierAddr);
        assertEq(pending, VERIFICATION_FEE);

        vm.prank(verifierAddr);
        verifier.withdraw();

        assertEq(verifierAddr.balance, verifierBalanceBefore + VERIFICATION_FEE);
    }
}
