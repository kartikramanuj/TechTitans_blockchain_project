// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityVerifier {
    function isVerified(address user) external view returns (bool);
}

contract KYCGatedAuction {

    IIdentityVerifier public identityContract;

    address public owner;
    uint256 public highestBid;
    address public highestBidder;

    bool public auctionActive;

    struct AuctionRecord {
        uint256 id;
        address winner;
        uint256 amount;
    }

    AuctionRecord[] public pastAuctions;
    uint256 public auctionCount;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionStarted(uint256 indexed auctionId);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _identityContract) {
        identityContract = IIdentityVerifier(_identityContract);
        owner = msg.sender;
    }

    // 🚀 Start auction
    function startAuction() external onlyOwner {
        require(!auctionActive, "Already active");
        auctionCount++;
        highestBid = 0;
        highestBidder = address(0);
        auctionActive = true;
        emit AuctionStarted(auctionCount);
    }

    // 🛑 End auction
    function endAuction() external onlyOwner {
        require(auctionActive, "Not active");
        auctionActive = false;
        
        pastAuctions.push(AuctionRecord({
            id: auctionCount,
            winner: highestBidder,
            amount: highestBid
        }));

        emit AuctionEnded(auctionCount, highestBidder, highestBid);
    }

    function getPastAuctions() external view returns (AuctionRecord[] memory) {
        return pastAuctions;
    }

    // 💰 Place bid (KYC REQUIRED 🔥)
    mapping(address => uint256) public pendingReturns;

    /// @notice Places a bid in the auction. Requires KYC verification.
    /// @dev Checks if the auction is active, verifies KYC via identityContract, and updates the highest bid.
    function placeBid() external payable {
        require(auctionActive, "Auction not active");

        // 🔥 COMPOSABILITY CHECK
        require(
            identityContract.isVerified(msg.sender),
            "KYC required"
        );

        require(msg.value > highestBid, "Bid too low");

        if (highestBid != 0) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBid = msg.value;
        highestBidder = msg.sender;

        emit BidPlaced(msg.sender, msg.value);
    }

    function withdraw() external returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            pendingReturns[msg.sender] = 0;
            if (!payable(msg.sender).send(amount)) {
                pendingReturns[msg.sender] = amount;
                return false;
            }
        }
        return true;
    }
}
