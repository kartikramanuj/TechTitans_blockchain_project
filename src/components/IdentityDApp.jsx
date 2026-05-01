"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Navbar from './Navbar';
import IdentityVerifierJSON from '../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
import KYCGatedAuctionJSON from '../../artifacts/contracts/KYCGatedAuction.sol/KYCGatedAuction.json';

const IDENTITY_CONTRACT_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
const AUCTION_CONTRACT_ADDRESS = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
const EXPECTED_CHAIN_ID = 31338n;

const IDENTITY_ABI = IdentityVerifierJSON.abi;
const AUCTION_ABI = KYCGatedAuctionJSON.abi;

const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");

const API_BASE = (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") 
  ? "http://127.0.0.1:5001/api" 
  : "http://localhost:5001/api";

export default function IdentityDApp({ initialView = "user" }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [identityContract, setIdentityContract] = useState(null);
  const [auctionContract, setAuctionContract] = useState(null);
  const [view, setView] = useState(initialView);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [roles, setRoles] = useState({ isAdmin: false, isVerifier: false });
  const [token, setToken] = useState(null);
  const [ethBalance, setEthBalance] = useState("0");

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 8000);
  }, []);

  const loginToBackend = async (address, role) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, role })
      });
      if (!response.ok) throw new Error("Backend offline");
      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        return data.token;
      }
    } catch (err) { console.error("Backend login error", err); }
    return null;
  };

  const checkRoles = async (_contract, address) => {
    try {
      const [isAdmin, isVerifier] = await Promise.all([
        _contract.hasRole(DEFAULT_ADMIN_ROLE, address).catch(() => false),
        _contract.hasRole(VERIFIER_ROLE, address).catch(() => false)
      ]);
      setRoles({ isAdmin, isVerifier });
      await loginToBackend(address, isAdmin ? 'admin' : isVerifier ? 'verifier' : 'user');
    } catch (error) { console.error("Role check error", error); }
  };

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        let network = await provider.getNetwork();
        if (Number(network.chainId) !== Number(EXPECTED_CHAIN_ID)) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
            });
            network = await provider.getNetwork();
          } catch (switchError) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                  chainName: 'Hardhat Fresh',
                  rpcUrls: ['http://127.0.0.1:8546'],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                }],
              });
            } else {
              showMessage('error', `Wrong Network! Detected ID: ${network.chainId.toString()}.`);
              return;
            }
          }
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const _identityContract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, signer);
        const _auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);

        const balance = await provider.getBalance(address);
        setEthBalance(ethers.formatEther(balance));

        setWalletAddress(address);
        setIdentityContract(_identityContract);
        setAuctionContract(_auctionContract);
        await checkRoles(_identityContract, address);
        showMessage('success', 'Connected to Web3');
      } catch (error) { 
        console.error("Connection Error:", error);
        showMessage('error', `Connection failed: ${error.message}`); 
      }
    } else { alert("Install MetaMask"); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accs) => accs.length > 0 ? connectWallet() : setWalletAddress(null));
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] animate-pulse rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] animate-pulse delay-700 rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
        <Navbar walletAddress={walletAddress} connectWallet={connectWallet} roles={roles} />

        {message.text && (
          <div className={`mb-8 p-6 rounded-3xl backdrop-blur-3xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 ${
            message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <div className="flex items-center gap-3 font-bold">
              <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
              {message.text}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 p-2 bg-white/5 backdrop-blur-2xl rounded-[2rem] w-fit border border-white/10 mb-10 shadow-2xl">
          <TabButton active={view === 'user'} onClick={() => setView('user')} label="User Portal" color="blue" />
          <TabButton active={view === 'verifier'} onClick={() => setView('verifier')} label="Verifier Panel" color="purple" />
          <TabButton active={view === 'admin'} onClick={() => setView('admin')} label="Admin Center" color="rose" />
          <TabButton active={view === 'auction'} onClick={() => setView('auction')} label="Live Auction" color="amber" />
        </div>

        {!walletAddress ? (
          <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] shadow-2xl p-24 text-center border border-white/10 mt-10 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <h2 className="text-5xl font-black mb-6 tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Decentralized Identity Protocol
            </h2>
            <p className="text-slate-400 mb-12 text-lg max-w-xl mx-auto font-medium">
              Secure, transparent, and autonomous verification for the next generation of the web.
            </p>
            <button onClick={connectWallet} className="px-16 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)] transition-all transform hover:-translate-y-1 active:scale-95 text-xl">
              Enter Protocol
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {view === 'user' && <UserDashboard contract={identityContract} walletAddress={walletAddress} token={token} showMessage={showMessage} ethBalance={ethBalance} />}
            {view === 'verifier' && <VerifierDashboard contract={identityContract} isVerifier={roles.isVerifier} isAdmin={roles.isAdmin} walletAddress={walletAddress} token={token} showMessage={showMessage} />}
            {view === 'admin' && <AdminDashboard identityContract={identityContract} auctionContract={auctionContract} isAdmin={roles.isAdmin} showMessage={showMessage} token={token} />}
            {view === 'auction' && <AuctionPortal contract={auctionContract} identityContract={identityContract} walletAddress={walletAddress} showMessage={showMessage} />}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, color }) {
  const colors = {
    blue: active ? 'bg-blue-600 text-white shadow-blue-500/40' : 'hover:bg-blue-500/10 text-slate-400',
    purple: active ? 'bg-purple-600 text-white shadow-purple-500/40' : 'hover:bg-purple-500/10 text-slate-400',
    rose: active ? 'bg-rose-600 text-white shadow-rose-500/40' : 'hover:bg-rose-500/10 text-slate-400',
    amber: active ? 'bg-amber-600 text-white shadow-amber-500/40' : 'hover:bg-amber-500/10 text-slate-400'
  };
  return (
    <button onClick={onClick} className={`px-8 py-3 rounded-[1.4rem] font-black transition-all duration-300 ${colors[color]}`}>
      {label}
    </button>
  );
}

function UserDashboard({ contract, walletAddress, token, showMessage, ethBalance }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState(null);
  const [requestCount, setRequestCount] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0");

  const fetchData = useCallback(async () => {
    if (!contract) return;
    try {
      const [id, count, amount] = await Promise.all([
        contract.getIdentity(walletAddress),
        contract.requestCount(walletAddress),
        contract.pendingWithdrawals(walletAddress)
      ]);
      setDetails({
        status: ["None", "Pending", "Verified", "Revoked", "Rejected"][Number(id[1])],
        verifier: id[2],
        deadline: Number(id[4])
      });
      setRequestCount(Number(count));
      setPendingWithdrawal(ethers.formatEther(amount));
    } catch (err) { console.error("Fetch Data Error:", err); }
  }, [contract, walletAddress]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!file || !token) return showMessage('error', 'Select file and ensure logged in');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userAddress', walletAddress);
      
      const res = await fetch(`${API_BASE}/kyc/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        const tx = await contract.submitIdentity(data.cidHash, { value: ethers.parseEther("0.01") });
        await tx.wait();
        
        const updatedId = await contract.getIdentity(walletAddress);
        await fetch(`${API_BASE}/kyc/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ userAddress: walletAddress, assignedVerifier: updatedId[2] })
        });

        showMessage('success', 'Identity submitted! Verifier assigned.');
        fetchData();
      } else { throw new Error(data.error); }
    } catch (err) { showMessage('error', err.message); }
    setUploading(false);
  };

  const handleRevoke = async () => {
    try {
      const tx = await contract.revokeIdentity();
      await tx.wait();
      showMessage('success', 'Identity revoked');
      fetchData();
    } catch (err) { showMessage('error', 'Revocation failed'); }
  };

  const handleWithdraw = async () => {
    try {
      const tx = await contract.withdraw();
      await tx.wait();
      showMessage('success', 'Funds withdrawn');
      fetchData();
    } catch (err) { showMessage('error', 'Withdrawal failed'); }
  };

  const isLimitReached = requestCount >= 4;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Identity Card */}
      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <div className="w-24 h-24 bg-blue-500 rounded-full blur-3xl" />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
            <div className="space-y-4">
              <h2 className="text-3xl font-black tracking-tight">Personal Identity</h2>
              <div className="flex items-center gap-3">
                <span className={`px-6 py-2 rounded-2xl font-black text-sm uppercase tracking-widest border backdrop-blur-md ${
                  details?.status === 'Verified' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 
                  details?.status === 'Rejected' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-white/10 border-white/10 text-slate-400'
                }`}>
                  {details?.status || "None"}
                </span>
                {details?.status === 'Verified' && (
                  <button onClick={handleRevoke} className="text-xs font-black text-rose-500 uppercase hover:underline">Revoke Now</button>
                )}
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 min-w-[240px]">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Request Limit</p>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-black">{requestCount} / 4</span>
                <span className="text-xs text-slate-500 font-bold">Requests Used</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(requestCount/4)*100}%` }} />
              </div>
            </div>
          </div>

          {details?.status === 'Pending' && (
            <div className="mt-10 p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl animate-pulse">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Active Verification In Progress</p>
              <p className="font-mono text-xs text-blue-200 break-all mb-3">{details.verifier}</p>
              <p className="text-[10px] text-blue-300 font-bold">Deadline: {new Date(details.deadline * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-12 text-center group">
          <h3 className="text-2xl font-black mb-8 tracking-tight">Submit New Document</h3>
          <div className="relative group/input max-w-md mx-auto">
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="block p-12 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover/input:scale-110 transition-transform">
                <span className="text-3xl">📄</span>
              </div>
              <p className="font-black text-slate-400 group-hover/input:text-white transition-colors uppercase text-sm tracking-widest">
                {file ? file.name : "Select Document File"}
              </p>
            </label>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={uploading || !file || isLimitReached} 
            className="mt-8 w-full max-w-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-lg"
          >
            {uploading ? 'Processing Transaction...' : isLimitReached ? 'Daily Limit Reached' : 'Submit for Verification (0.01 ETH)'}
          </button>
        </div>
      </div>

      {/* Wallet Info Card */}
      <div className="space-y-8">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl -mr-24 -mt-24 rounded-full" />
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Available ETH</p>
          <h3 className="text-4xl font-black text-white mb-8 tracking-tighter">{parseFloat(ethBalance).toFixed(4)} ETH</h3>
          
          <div className="pt-6 border-t border-white/10">
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Refundable Pool</p>
            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-black text-white tracking-tighter">{pendingWithdrawal} ETH</h4>
              {Number(pendingWithdrawal) > 0 && (
                <button onClick={handleWithdraw} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-all">Claim Now</button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-10">
          <h4 className="font-black text-sm uppercase tracking-widest text-slate-500 mb-6">Security Tips</h4>
          <ul className="space-y-4 text-xs font-medium text-slate-400 leading-relaxed">
            <li className="flex gap-3"><span className="text-emerald-500 font-bold">✓</span> Never share your private keys or document hashes.</li>
            <li className="flex gap-3"><span className="text-emerald-500 font-bold">✓</span> Verifiers only see your document, not your wallet history.</li>
            <li className="flex gap-3"><span className="text-emerald-500 font-bold">✓</span> Identity status is updated instantly upon verification.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function VerifierDashboard({ contract, isVerifier, isAdmin, walletAddress, token, showMessage }) {
  const [tasks, setTasks] = useState([]);
  const [earnings, setEarnings] = useState("0");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || (!isVerifier && !isAdmin)) return;
    try {
      const res = await fetch(`${API_BASE}/kyc/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
      const amount = await contract.pendingWithdrawals(walletAddress);
      setEarnings(ethers.formatEther(amount));
    } catch (err) { console.error("Verifier fetch error:", err); setTasks([]); }
  }, [token, isVerifier, isAdmin, contract, walletAddress]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (userAddress, cid, action) => {
    setLoading(true);
    try {
      let tx;
      if (action === 'verify') {
        tx = await contract.verifyIdentity(userAddress, ethers.id(cid));
      } else {
        tx = await contract.rejectIdentity(userAddress);
      }
      await tx.wait();
      await fetch(`${API_BASE}/kyc/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userAddress, status: action === 'verify' ? 'verified' : 'rejected' })
      });
      showMessage('success', `Protocol updated: User ${action === 'verify' ? 'Approved' : 'Rejected'}`);
      fetchData();
    } catch (err) { showMessage('error', err.reason || 'Action failed'); }
    setLoading(false);
  };

  if (!isVerifier && !isAdmin) return (
    <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-24 text-center">
      <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl text-rose-500">🔒</span>
      </div>
      <h3 className="text-2xl font-black mb-2 tracking-tight">Verifier Status Required</h3>
      <p className="text-slate-400 font-medium italic uppercase text-xs tracking-widest">Access Denied to Protocol Verification Queue</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <h2 className="text-4xl font-black tracking-tighter">Verification Queue</h2>
        <div className="bg-purple-600 rounded-[2rem] p-8 shadow-2xl shadow-purple-500/20 min-w-[280px] text-right">
          <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest mb-1">Protocol Earnings</p>
          <h3 className="text-3xl font-black text-white tracking-tighter mb-4">{earnings} ETH</h3>
          <button onClick={async () => { await contract.withdraw(); fetchData(); }} className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase transition-all">Claim Earnings</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tasks.length === 0 ? (
          <div className="p-24 text-center border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5">
            <p className="text-slate-500 font-black uppercase tracking-widest">Protocol is Currently Quiet</p>
          </div>
        ) : tasks.map(task => {
          const isAssignedToMe = task.assignedVerifier?.toLowerCase() === walletAddress?.toLowerCase();
          return (
            <div key={task._id} className={`p-10 rounded-[2.5rem] border backdrop-blur-3xl transition-all duration-500 ${isAssignedToMe ? 'bg-white/10 border-blue-500/30 shadow-2xl shadow-blue-500/10' : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100'}`}>
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-4 text-center md:text-left">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Subject Wallet</p>
                    <p className="font-mono text-sm text-blue-400 break-all">{task.userAddress}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
                    <a href={`https://ipfs.io/ipfs/${task.cid}`} target="_blank" rel="noreferrer" className="text-indigo-400 text-xs font-black uppercase hover:underline decoration-indigo-400 decoration-2 underline-offset-4 tracking-widest">
                      View Evidence ↗
                    </a>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isAssignedToMe ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-slate-400'}`}>
                      {isAssignedToMe ? '● Active Assignment' : `Assigned: ${task.assignedVerifier?.substring(0,8)}...`}
                    </div>
                  </div>
                </div>
                {isAssignedToMe && (
                  <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={() => handleAction(task.userAddress, task.cid, 'verify')} disabled={loading} className="flex-1 md:flex-none bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all uppercase tracking-widest text-xs">Approve</button>
                    <button onClick={() => handleAction(task.userAddress, task.cid, 'reject')} disabled={loading} className="flex-1 md:flex-none bg-rose-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-rose-500/20 hover:bg-rose-700 active:scale-95 transition-all uppercase tracking-widest text-xs">Reject</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminDashboard({ identityContract, auctionContract, isAdmin, showMessage, token }) {
  const [address, setAddress] = useState("");
  const [stake, setStake] = useState("0.005");
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    if (!ethers.isAddress(address)) return showMessage('error', 'Invalid Address');
    setLoading(true);
    try {
      let tx;
      if (action === 'add') {
        tx = await identityContract.addVerifier(address, { value: ethers.parseEther(stake) });
      } else {
        tx = await identityContract.removeVerifier(address);
      }
      await tx.wait();
      showMessage('success', `Verifier ${action === 'add' ? 'Registered' : 'Removed'}!`);
      setAddress("");
    } catch (err) { showMessage('error', 'Operation failed'); }
    setLoading(false);
  };

  const handleAuction = async (action) => {
    setLoading(true);
    try {
      const tx = action === 'start' ? await auctionContract.startAuction() : await auctionContract.endAuction();
      await tx.wait();
      showMessage('success', `Auction ${action === 'start' ? 'Started' : 'Finalized'}!`);
    } catch (err) { showMessage('error', 'Auction control failed'); }
    setLoading(false);
  };

  if (!isAdmin) return (
    <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-24 text-center">
      <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl text-rose-500">👑</span>
      </div>
      <h3 className="text-2xl font-black mb-2 tracking-tight">Admin Privileges Required</h3>
      <p className="text-slate-400 font-medium italic uppercase text-xs tracking-widest">Protocol Administration Access Only</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-12 shadow-2xl">
        <h2 className="text-3xl font-black mb-10 tracking-tight text-rose-500">Protocol Control</h2>
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Verifier Wallet</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-mono text-white placeholder:text-slate-700" placeholder="0x..." />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Stake (ETH)</label>
            <input type="text" value={stake} onChange={e => setStake(e.target.value)} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 text-white placeholder:text-slate-700" />
          </div>
          <div className="flex gap-4">
            <button onClick={() => handleAction('add')} disabled={loading} className="flex-1 bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl hover:bg-emerald-700 active:scale-95 transition-all uppercase tracking-widest">Grant Role</button>
            <button onClick={() => handleAction('remove')} disabled={loading} className="flex-1 bg-rose-600 text-white py-5 rounded-3xl font-black shadow-xl hover:bg-rose-700 active:scale-95 transition-all uppercase tracking-widest">Revoke Role</button>
          </div>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-12 shadow-2xl">
        <h2 className="text-3xl font-black mb-10 tracking-tight text-amber-500">Auction Engine</h2>
        <div className="grid grid-cols-1 gap-6 pt-10 border-t border-white/5">
          <button onClick={() => handleAuction('start')} disabled={loading} className="w-full bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 py-8 rounded-[2rem] font-black text-xl hover:bg-emerald-500/20 transition-all uppercase tracking-tighter">Start Live Round</button>
          <button onClick={() => handleAuction('end')} disabled={loading} className="w-full bg-rose-600/10 border border-rose-500/30 text-rose-400 py-8 rounded-[2rem] font-black text-xl hover:bg-rose-500/20 transition-all uppercase tracking-tighter">End & Finalize</button>
        </div>
      </div>
    </div>
  );
}

function AuctionPortal({ contract, identityContract, walletAddress, showMessage }) {
  const [active, setActive] = useState(false);
  const [highestBid, setHighestBid] = useState("0");
  const [highestBidder, setHighestBidder] = useState(null);
  const [bidValue, setBidValue] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const fetchData = useCallback(async () => {
    if (!contract) return;
    try {
      const [isActive, topBid, topBidder, past, verified] = await Promise.all([
        contract.auctionActive(),
        contract.highestBid(),
        contract.highestBidder(),
        contract.getPastAuctions(),
        identityContract.isVerified(walletAddress)
      ]);
      setActive(isActive);
      setHighestBid(ethers.formatEther(topBid));
      setHighestBidder(topBidder);
      setHistory(past);
      setIsVerified(verified);
      if (bidValue === "") setBidValue((parseFloat(ethers.formatEther(topBid)) + 0.001).toString());
    } catch (err) { console.error("Auction fetch error:", err); }
  }, [contract, identityContract, walletAddress, bidValue]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const placeBid = async () => {
    if (!isVerified) return showMessage('error', 'Verified Status Required to Bid');
    if (parseFloat(bidValue) <= parseFloat(highestBid)) return showMessage('error', 'Bid must be higher');
    setLoading(true);
    try {
      const tx = await contract.placeBid({ value: ethers.parseEther(bidValue) });
      await tx.wait();
      showMessage('success', 'Highest Bid Placed!');
      fetchData();
    } catch (err) { showMessage('error', 'Bidding failed'); }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Live Bidding */}
      <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-12 shadow-2xl flex flex-col justify-between overflow-hidden relative group">
        <div className={`absolute top-0 right-0 p-10 font-black uppercase text-xs tracking-[0.3em] ${active ? 'text-emerald-500 animate-pulse' : 'text-slate-600'}`}>
          {active ? '● Protocol Live' : '● Engine Offline'}
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-2 tracking-tighter">Active Round</h2>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-12 italic">KYC Gated Participation</p>

          <div className="space-y-10">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Current Highest Bid</p>
              <h3 className="text-6xl font-black tracking-tighter text-white">{highestBid} <span className="text-2xl text-slate-500">ETH</span></h3>
              {highestBidder !== ethers.ZeroAddress && (
                <p className="mt-4 font-mono text-[10px] text-slate-500 break-all bg-white/5 p-3 rounded-xl inline-block border border-white/5">
                  Holder: {highestBidder}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                value={bidValue} 
                onChange={e => setBidValue(e.target.value)} 
                disabled={!active || !isVerified}
                className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/20 text-3xl font-black text-center text-white transition-all disabled:opacity-20"
                placeholder="0.00"
              />
              <button 
                onClick={placeBid} 
                disabled={!active || !isVerified || loading} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl hover:shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {!isVerified ? 'Verification Required' : !active ? 'Market Closed' : loading ? 'Broadcasting Bid...' : 'Place Higher Bid'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-12 shadow-2xl">
        <h2 className="text-3xl font-black mb-10 tracking-tight">Round History</h2>
        <div className="space-y-4 h-[440px] overflow-y-auto pr-4 custom-scrollbar">
          {history.length === 0 ? (
            <p className="text-slate-600 font-black text-xs uppercase text-center py-20 tracking-widest">No finalized rounds yet</p>
          ) : history.map((record, i) => (
            <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-3xl flex justify-between items-center group hover:bg-white/10 transition-all">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auction #{record[0].toString()}</p>
                <p className="font-mono text-[10px] text-blue-400">{record[1].substring(0,18)}...</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-white tracking-tighter">{ethers.formatEther(record[2])} ETH</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Final Winner</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}