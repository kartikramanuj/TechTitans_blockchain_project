// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {IdentityVerifier} from "../contracts/Identity.sol";
import {KYCGatedAuction} from "../contracts/KYCGatedAuction.sol";

contract KYCGatedAuctionTest is Test {
    IdentityVerifier public verifier;
    KYCGatedAuction public auction;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public verifierAddr = address(4);

    uint256 public constant VERIFICATION_FEE = 0.0001 ether;
    uint256 public constant MIN_STAKE = 0.0005 ether;

    function setUp() public {
        vm.startPrank(owner);
        verifier = new IdentityVerifier();
        auction = new KYCGatedAuction(address(verifier));
        
        verifier.addVerifier(verifierAddr);
        vm.stopPrank();

        vm.deal(verifierAddr, 1 ether);
        vm.prank(verifierAddr);
        verifier.activateVerifier{value: MIN_STAKE}();
    }

    function _verifyUser(address user, string memory id) internal {
        bytes32 hash = keccak256(abi.encodePacked(id));
        vm.deal(user, 1 ether);
        vm.prank(user);
        verifier.submitIdentity{value: VERIFICATION_FEE}(hash);

        vm.prank(verifierAddr);
        verifier.verifyIdentity(user, hash);
    }

    function test_StartAuction() public {
        vm.prank(owner);
        auction.startAuction();
        assertTrue(auction.auctionActive());
    }

    function test_PlaceBid_FailsWithoutKYC() public {
        vm.prank(owner);
        auction.startAuction();

        vm.deal(user1, 1 ether);
        vm.prank(user1);
        vm.expectRevert("KYC required");
        auction.placeBid{value: 0.1 ether}();
    }

    function test_PlaceBid_SucceedsWithKYC() public {
        _verifyUser(user1, "user1");
        
        vm.prank(owner);
        auction.startAuction();

        vm.prank(user1);
        auction.placeBid{value: 0.1 ether}();

        assertEq(auction.highestBid(), 0.1 ether);
        assertEq(auction.highestBidder(), user1);
    }

    function test_Outbid() public {
        _verifyUser(user1, "user1");
        _verifyUser(user2, "user2");

        vm.prank(owner);
        auction.startAuction();

        vm.prank(user1);
        auction.placeBid{value: 0.1 ether}();

        vm.prank(user2);
        auction.placeBid{value: 0.2 ether}();

        assertEq(auction.highestBid(), 0.2 ether);
        assertEq(auction.highestBidder(), user2);
        assertEq(auction.pendingReturns(user1), 0.1 ether);
    }

    function test_EndAuction() public {
        _verifyUser(user1, "user1");
        
        vm.prank(owner);
        auction.startAuction();

        vm.prank(user1);
        auction.placeBid{value: 0.1 ether}();

        vm.prank(owner);
        auction.endAuction();

        assertFalse(auction.auctionActive());
        
        (uint256 id, address winner, uint256 amount) = auction.pastAuctions(0);
        assertEq(id, 1);
        assertEq(winner, user1);
        assertEq(amount, 0.1 ether);
    }
}
