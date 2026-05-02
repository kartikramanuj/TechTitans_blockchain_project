"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ethers } from 'ethers';

const IDENTITY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "0xc41673D7aA7aa715392b3d7b6E6Bf278a2016F3F";
const AUCTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS || "0x6648196239Bf2b448Ab150cDc61C28BF8768a9A1";

import IdentityVerifierJSON from '../../abi/IdentityVerifier.json';
import KYCGatedAuctionJSON from '../../abi/KYCGatedAuction.json';

// Helper to get ABI array safely
const getAbi = (json) => {
  if (Array.isArray(json)) return json;
  if (json && json.abi && Array.isArray(json.abi)) return json.abi;
  return null;
};

export default function AuctionPage() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [auctionActive, setAuctionActive] = useState(false);
  const [highestBid, setHighestBid] = useState("0");
  const [highestBidder, setHighestBidder] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        console.error("Wallet connection error:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const checkVerification = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const abi = getAbi(IdentityVerifierJSON);
      if (!abi) return console.error("Identity ABI missing");
      const identityContract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, abi, provider);
      const verifiedStatus = await identityContract.isVerified(address);
      setIsVerified(verifiedStatus);
    } catch (err) {
      console.error("Failed to check verification status:", err);
    }
  };

  const fetchAuctionData = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const abi = getAbi(KYCGatedAuctionJSON);
      if (!abi) return console.error("Auction ABI missing");
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, abi, provider);
      
      const active = await auctionContract.auctionActive();
      setAuctionActive(active);

      const hBid = await auctionContract.highestBid();
      setHighestBid(ethers.formatEther(hBid));

      const hBidder = await auctionContract.highestBidder();
      setHighestBidder(hBidder === ethers.ZeroAddress ? "None" : hBidder);
    } catch(err) {
      console.error("Failed to fetch auction data:", err);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      checkVerification(walletAddress);
      fetchAuctionData();
    }
  }, [walletAddress]);

  const placeBid = async () => {
    if (!bidAmount || isNaN(bidAmount) || Number(bidAmount) <= 0) return alert("Enter a valid bid");
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const abi = getAbi(KYCGatedAuctionJSON);
      if (!abi) throw new Error("Auction ABI missing");
      const auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, abi, signer);
      
      const tx = await auctionContract.placeBid({ value: ethers.parseEther(bidAmount) });
      await tx.wait(); 
      
      alert("Bid placed successfully!");
      setBidAmount("");
      fetchAuctionData();
    } catch (error) {
      console.error("Bid error:", error);
      if (error.message.includes("Bid too low")) {
         alert("Bid too low. You must bid higher than the current highest bid.");
      } else if (error.message.includes("KYC required")) {
         alert("KYC required. Your address is not verified.");
      } else if (error.message.includes("Auction not active")) {
         alert("The auction is currently inactive.");
      } else {
         alert("Failed to place bid. Check console.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <Navbar walletAddress={walletAddress} connectWallet={connectWallet} />

        <div className="bg-white rounded-xl shadow-lg border p-8">
          <h1 className="text-3xl font-bold mb-6 text-blue-900 text-center">KYC-Gated Exclusive Auction</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center">
                <p className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-2">Auction Status</p>
                <div className={`px-4 py-1 rounded-full text-lg font-bold border ${auctionActive ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                  {auctionActive ? "🟢 ACTIVE" : "🔴 INACTIVE"}
                </div>
              </div>
              
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex flex-col items-center justify-center">
                <p className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-2">Highest Bid</p>
                <p className="text-4xl font-black text-gray-800">{highestBid} <span className="text-xl">ETH</span></p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Highest Bidder</p>
                <p className="font-mono text-sm break-all">{highestBidder}</p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="mb-6 p-4 rounded-lg border bg-gray-50 flex justify-between items-center shadow-sm">
                <span className="font-semibold text-gray-700">KYC Status:</span>
                {walletAddress ? (
                  isVerified ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 border border-green-300 rounded-full font-bold flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-600"></span> Verified
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-full font-bold flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full bg-red-600"></span> Not Verified
                    </span>
                  )
                ) : (
                  <span className="text-gray-500 italic text-sm">Connect wallet</span>
                )}
              </div>

              <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Place a Bid</h3>
                
                {!isVerified && walletAddress && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm font-semibold">
                    ⚠️ You must complete KYC to participate.
                  </div>
                )}
                
                <div className="flex flex-col gap-3">
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Amount in ETH" 
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    disabled={!auctionActive || !isVerified || loading || !walletAddress}
                    className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 transition-all text-lg" 
                  />
                  <button 
                    onClick={placeBid} 
                    disabled={!auctionActive || !isVerified || loading || !walletAddress} 
                    className={`w-full py-4 rounded-lg font-bold text-white transition-colors text-lg
                      ${(!auctionActive || !isVerified || !walletAddress) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}
                    `}
                  >
                    {loading ? "Processing Tx..." : "Submit Bid"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}