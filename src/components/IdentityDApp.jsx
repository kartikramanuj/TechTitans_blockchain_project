"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  LayoutDashboard, 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  Gavel, 
  Wallet, 
  Copy, 
  Moon, 
  Sun, 
  FileUp, 
  Timer, 
  Zap, 
  RefreshCw, 
  ExternalLink, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Globe,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  BadgeCheck,
  Shield,
  Clock,
  XCircle,
  Gem,
  Flame,
  Search
} from 'lucide-react';
import IdentityVerifierJSON from '../../artifacts/contracts/Identity.sol/IdentityVerifier.json';
import KYCGatedAuctionJSON from '../../artifacts/contracts/KYCGatedAuction.sol/KYCGatedAuction.json';

// --- Constants ---
const IDENTITY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS;
const AUCTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS;
const EXPECTED_CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID || "31338");
const IDENTITY_ABI = IdentityVerifierJSON.abi;
const AUCTION_ABI = KYCGatedAuctionJSON.abi;
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

// --- Base Components ---
const Card = ({ children, className = "", theme }) => (
  <div className={`${theme.card} border ${theme.border} rounded-xl overflow-hidden shadow-sm transition-colors duration-300 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", disabled, className = "", isDark }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    secondary: isDark 
      ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700" 
      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
    outline: isDark
      ? "bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300"
      : "bg-transparent border border-gray-300 hover:bg-gray-50 text-gray-600"
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className} flex items-center justify-center gap-2`}
    >
      {children}
    </button>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    Verified: "bg-green-500/10 text-green-500 border-green-500/20",
    Pending: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    Revoked: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    None: "bg-gray-200/50 text-gray-500 border-gray-300"
  };
  const icons = {
    Verified: <BadgeCheck className="w-3 h-3" />,
    Pending: <Clock className="w-3 h-3" />,
    Rejected: <XCircle className="w-3 h-3" />,
    Revoked: <Shield className="w-3 h-3" />,
    None: <Shield className="w-3 h-3" />
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.None} flex items-center gap-1.5`}>
      {icons[status] || icons.None}
      {status}
    </span>
  );
};

// --- Main Application ---
export default function IdentityDApp({ initialView = "user" }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [identityContract, setIdentityContract] = useState(null);
  const [auctionContract, setAuctionContract] = useState(null);
  const [view, setView] = useState(initialView);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [roles, setRoles] = useState({ isAdmin: false, isVerifier: false });
  const [token, setToken] = useState(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(true);

  const theme = {
    bg: isDark ? 'bg-[#0B0F14]' : 'bg-[#F9FAFB]',
    sidebar: isDark ? 'bg-[#0F172A]' : 'bg-white',
    card: isDark ? 'bg-[#111827]' : 'bg-white',
    border: isDark ? 'border-gray-800' : 'border-gray-200',
    text: isDark ? 'text-gray-200' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    header: isDark ? 'bg-[#0F172A]/50' : 'bg-white/80',
    input: isDark ? 'bg-[#0B0F14]' : 'bg-[#F9FAFB]',
    navHover: isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    navActive: isDark ? 'bg-blue-600/10 text-blue-500 border-blue-600/20' : 'bg-blue-50 text-blue-600 border-blue-100',
  };

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const loginToBackend = async (address, role) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const message = `Login to SecureID as ${role}\nWallet: ${address}\nTimestamp: ${Date.now()}`;
    
    let signature;
    try {
      signature = await signer.signMessage(message);
    } catch (signError) {
      if (signError.code === "ACTION_REJECTED" || signError.code === 4001 || signError.message?.toLowerCase().includes("rejected")) {
        throw new Error("USER_CANCELLED");
      }
      throw signError;
    }

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, role, signature, message })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "SERVER_AUTH_FAILED");
    
    if (data.token) {
      setToken(data.token);
      return data.token;
    }
    throw new Error("TOKEN_MISSING");
  };

  const checkRoles = async (_contract, address) => {
    const [isAdmin, isVerifier] = await Promise.all([
      _contract.hasRole(DEFAULT_ADMIN_ROLE, address).catch(() => false),
      _contract.hasRole(VERIFIER_ROLE, address).catch(() => false)
    ]);
    const role = isAdmin ? 'admin' : isVerifier ? 'verifier' : 'user';
    
    // loginToBackend now throws USER_CANCELLED or other errors directly
    await loginToBackend(address, role);
    
    setRoles({ isAdmin, isVerifier });
    return true;
  };

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);
        const targetChainId = Number(EXPECTED_CHAIN_ID);

        console.log("Current Chain ID:", currentChainId, "Target Chain ID:", targetChainId);
        
        if (currentChainId !== targetChainId) {
          const networkName = targetChainId === 11155111 ? "Sepolia Testnet" : "Hardhat Localhost";
          showMessage('error', `Please switch to ${networkName} (${targetChainId}). Detected: ${currentChainId}`);
          return;
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const _identityContract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, IDENTITY_ABI, signer);
        const _auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, signer);

        // --- ATOMIC AUTHENTICATION ---
        // 1. Verify identity via signature BEFORE updating app state
        await checkRoles(_identityContract, address);
        
        // 2. Only if signature is successful, update state and transition UI
        const balance = await provider.getBalance(address);
        setEthBalance(ethers.formatEther(balance));
        setWalletAddress(address);
        setIdentityContract(_identityContract);
        setAuctionContract(_auctionContract);
        
        showMessage('success', 'Authenticated Successfully');
      } catch (error) { 
        // Silent logs for developer
        console.warn("Connection Interrupted:", error.message);
        
        if (error.message === "USER_CANCELLED") {
          showMessage('error', 'Authentication cancelled. Please sign the request to enter the protocol.');
        } else if (error.message === "SERVER_AUTH_FAILED") {
          showMessage('error', 'Backend authorization failed. Please try again.');
        } else {
          const cleanMessage = error.message?.split("(")[0] || "Connection failed";
          showMessage('error', cleanMessage); 
        }
        
        // Ensure state is cleared on any failure
        setWalletAddress(null);
        setToken(null);
        setIdentityContract(null);
      }
    } else { alert("Install MetaMask"); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accs) => accs.length > 0 ? connectWallet() : setWalletAddress(null));
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const shortenedAddress = walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : '';

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans flex overflow-hidden transition-colors duration-500`}>
      
      {/* Sidebar */}
      <aside className={`${theme.sidebar} border-r ${theme.border} transition-all duration-300 flex flex-col z-30 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className={`p-6 flex items-center gap-3 border-b ${theme.border} h-20`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">S</div>
          {sidebarOpen && <span className={`font-bold text-lg tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>SecureID</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1.5 mt-4">
          <NavItem icon={<User className="w-5 h-5" />} label="User Portal" active={view === 'user'} onClick={() => setView('user')} expanded={sidebarOpen} theme={theme} />
          <NavItem icon={<ShieldCheck className="w-5 h-5" />} label="Verifier Panel" active={view === 'verifier'} onClick={() => setView('verifier')} expanded={sidebarOpen} theme={theme} />
          <NavItem icon={<ShieldAlert className="w-5 h-5" />} label="Admin Center" active={view === 'admin'} onClick={() => setView('admin')} expanded={sidebarOpen} theme={theme} />
          <NavItem icon={<Gavel className="w-5 h-5" />} label="Live Auction" active={view === 'auction'} onClick={() => setView('auction')} expanded={sidebarOpen} theme={theme} />
        </nav>

        <div className={`p-4 border-t ${theme.border}`}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`w-full flex items-center justify-center p-2 rounded-lg ${theme.navHover} transition-colors ${theme.textMuted}`}>
            {sidebarOpen ? <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><ChevronLeft className="w-4 h-4" /> Collapse</div> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className={`h-20 border-b ${theme.border} ${theme.header} backdrop-blur-md flex items-center justify-between px-8 z-20 transition-colors duration-300`}>
          <div className="flex items-center gap-4">
            <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} capitalize tracking-tight`}>{view.replace('-', ' ')}</h1>
            <div className={`px-2.5 py-1 ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100'} border rounded-full flex items-center gap-2`}>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Connected</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role Badge */}
            {walletAddress && (
              <div className={`hidden sm:flex items-center px-3 py-1 rounded-lg border ${
                roles.isAdmin ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                roles.isVerifier ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
              } text-[10px] font-black uppercase tracking-widest`}>
                {roles.isAdmin ? 'Master Admin' : roles.isVerifier ? 'Auth Node' : 'Standard User'}
              </div>
            )}

            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg border ${theme.border} ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-amber-400' : 'bg-white hover:bg-gray-50 shadow-sm text-blue-600'} transition-all`}
            >
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className={`h-8 w-px ${theme.border} mx-2 hidden md:block`} />

            <div className={`text-right hidden md:block px-4`}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Balance</p>
              <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{parseFloat(ethBalance).toFixed(4)} <span className="text-gray-500 font-medium">ETH</span></p>
            </div>
            
            {!walletAddress ? (
              <Button onClick={connectWallet} isDark={isDark}><Globe className="w-4 h-4" /> Connect Wallet</Button>
            ) : (
              <div className={`flex items-center gap-3 ${isDark ? 'bg-gray-800/50' : 'bg-white border-gray-200 shadow-sm'} border px-4 py-2 rounded-xl`}>
                <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full shadow-inner" />
                <span className={`text-sm font-mono font-medium ${theme.textMuted}`}>{shortenedAddress}</span>
                <button onClick={() => { navigator.clipboard.writeText(walletAddress); showMessage('success', 'Address copied!'); }} className="text-gray-400 hover:text-blue-500 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          
          {/* Notifications */}
          {message.text && (
            <div className={`fixed top-24 right-8 z-50 p-4 rounded-xl border shadow-2xl animate-in slide-in-from-right duration-300 ${
              message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
            } ${isDark ? '' : 'bg-white/90 backdrop-blur-sm'}`}>
              <div className="flex items-center gap-3">
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="text-sm font-bold tracking-tight">{message.text}</span>
              </div>
            </div>
          )}

          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!walletAddress ? (
              <EmptyState title="Access Required" description="Connect your Web3 wallet to securely interact with the identity protocol." icon={<Globe className="w-10 h-10 text-blue-500" />} cta="Initialize Connection" onClick={connectWallet} theme={theme} />
            ) : (
              <>
                {view === 'dashboard' && <GlobalDashboard theme={theme} isDark={isDark} ethBalance={ethBalance} roles={roles} />}
                {view === 'user' && <UserDashboard contract={identityContract} walletAddress={walletAddress} token={token} showMessage={showMessage} ethBalance={ethBalance} theme={theme} isDark={isDark} />}
                {view === 'verifier' && <VerifierDashboard contract={identityContract} isVerifier={roles.isVerifier} isAdmin={roles.isAdmin} walletAddress={walletAddress} token={token} showMessage={showMessage} theme={theme} isDark={isDark} />}
                {view === 'admin' && <AdminDashboard identityContract={identityContract} auctionContract={auctionContract} isAdmin={roles.isAdmin} showMessage={showMessage} token={token} theme={theme} isDark={isDark} />}
                {view === 'auction' && <AuctionPortal contract={auctionContract} identityContract={identityContract} walletAddress={walletAddress} showMessage={showMessage} theme={theme} isDark={isDark} />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, expanded, theme }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group border border-transparent ${
        active ? theme.navActive : `${theme.navHover} ${theme.textMuted} hover:${theme.text}`
      }`}
    >
      <span className="group-active:scale-90 transition-transform">{icon}</span>
      {expanded && <span className="text-sm font-bold tracking-tight">{label}</span>}
    </button>
  );
}

function StatBox({ label, value, icon, color = "blue", theme }) {
  const colors = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    red: "text-red-500 bg-red-500/10",
    amber: "text-amber-500 bg-amber-500/10"
  };
  return (
    <Card className="p-6" theme={theme}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]} shadow-inner`}>
          {React.cloneElement(icon, { className: "w-4 h-4" })}
        </div>
      </div>
      <p className="text-2xl font-black tracking-tight">{value}</p>
    </Card>
  );
}

function EmptyState({ title, description, icon, cta, onClick, theme }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className={`w-24 h-24 ${theme.card} rounded-3xl flex items-center justify-center mb-8 border ${theme.border} shadow-xl transform hover:rotate-6 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black mb-3 tracking-tight">{title}</h3>
      <p className={`${theme.textMuted} text-sm max-w-sm mb-10 font-medium leading-relaxed`}>{description}</p>
      {cta && <Button onClick={onClick} className="px-12 py-3 text-base shadow-xl shadow-blue-500/20" isDark={theme.isDark}>{cta}</Button>}
    </div>
  );
}

// --- View Components ---

function UserDashboard({ contract, walletAddress, token, showMessage, ethBalance, theme, isDark }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState({ status: 'None', verifier: '', deadline: 0 });
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
    if (!file || !token) return showMessage('error', 'Select a file to proceed.');
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
        const cidHash = ethers.id(data.cid);
        const tx = await contract.submitIdentity(cidHash, { value: ethers.parseEther("0.0001") });
        
        showMessage('success', 'Transaction sent! Waiting for confirmation...');
        await tx.wait();
        
        showMessage('success', 'Identity confirmed on-chain.');
        fetchData();
        setFile(null);
      } else { throw new Error(data.error); }
    } catch (err) { showMessage('error', err.message); }
    setUploading(false);
  };

  const isLimitReached = requestCount >= 4;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Current Status" value={details.status} icon={<BadgeCheck />} color="blue" theme={theme} />
        <StatBox label="Quota Usage" value={`${requestCount} / 4`} icon={<FileText />} color="amber" theme={theme} />
        <StatBox label="Asset Value" value={`${parseFloat(ethBalance).toFixed(3)} ETH`} icon={<Wallet />} color="green" theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8" theme={theme}>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black tracking-tight">Identity Submission</h3>
              <p className={`text-xs ${theme.textMuted} font-medium mt-1 uppercase tracking-wider`}>Phase 1: Encrypted Document Upload</p>
            </div>
            <StatusBadge status={details.status} />
          </div>

          <div className="space-y-8">
            <div className={`${isDark ? 'bg-[#0B0F14]' : 'bg-gray-50'} border-2 border-dashed ${theme.border} rounded-2xl p-12 flex flex-col items-center justify-center text-center group transition-all hover:border-blue-500/50`}>
              <input type="file" id="file-upload" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              <label htmlFor="file-upload" className="cursor-pointer w-full">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <FileUp className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-base font-bold mb-2">{file ? file.name : "Drop document here"}</p>
                <p className={`text-xs ${theme.textMuted} font-medium`}>Supports PDF, JPG, PNG (Max 10MB)</p>
              </label>
            </div>

            <div className={`flex items-center justify-between p-6 ${isDark ? 'bg-gray-800/30' : 'bg-blue-50/50'} rounded-2xl border ${theme.border}`}>
              <div className="space-y-1">
                <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>Verification Fee</p>
                <p className="text-lg font-black tracking-tight">0.0001 <span className="text-gray-500 font-medium">ETH</span></p>
              </div>
              <Button onClick={handleSubmit} disabled={uploading || !file || isLimitReached} className="px-10 py-3 shadow-lg shadow-blue-500/20" isDark={isDark}>
                {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Finalizing Tx...</> : 'Execute Submission'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-8 flex flex-col" theme={theme}>
          <h3 className="text-xl font-black tracking-tight mb-8">Protocol Info</h3>
          
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>Verifier Node</p>
              <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'} border ${theme.border}`}>
                <p className="font-mono text-xs break-all leading-relaxed">{details.verifier !== ethers.ZeroAddress ? details.verifier : 'No node assigned yet'}</p>
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest`}>Escrowed Balance</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-black tracking-tighter">{pendingWithdrawal} <span className="text-sm text-gray-500 font-bold uppercase">ETH</span></p>
                {Number(pendingWithdrawal) > 0 && (
                  <Button variant="secondary" className="text-xs px-4 py-1.5" onClick={async () => { await contract.withdraw(); fetchData(); }} isDark={isDark}><ArrowDownLeft className="w-3.5 h-3.5" /> Claim</Button>
                )}
              </div>
            </div>
          </div>

          <div className={`mt-8 pt-8 border-t ${theme.border}`}>
            <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest mb-3`}>SLA Deadline</p>
            {details.deadline > 0 ? (
              <div className="flex items-center gap-3">
                <Timer className="w-4 h-4 text-blue-500 animate-pulse" />
                <p className="text-sm font-bold tracking-tight">{new Date(details.deadline * 1000).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic font-medium">Inactive</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function VerifierDashboard({ contract, isVerifier, isAdmin, walletAddress, token, showMessage, theme, isDark }) {
  const [tasks, setTasks] = useState([]);
  const [earnings, setEarnings] = useState("0");
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || (!isVerifier && !isAdmin)) return;
    try {
      const res = await fetch(`${API_BASE}/kyc/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
      
      const [amount, stakeAmount] = await Promise.all([
        contract.pendingWithdrawals(walletAddress),
        contract.stake(walletAddress)
      ]);
      setEarnings(ethers.formatEther(amount));
      setIsActive(Number(stakeAmount) >= Number(ethers.parseEther("0.0005")));
    } catch (err) { console.error("Verifier fetch error:", err); setTasks([]); }
  }, [token, isVerifier, isAdmin, contract, walletAddress]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const tx = await contract.activateVerifier({ value: ethers.parseEther("0.0005") });
      await tx.wait();
      showMessage('success', 'Verifier status active!');
      fetchData();
    } catch (err) { showMessage('error', 'Stake failed.'); }
    setLoading(false);
  };

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
      showMessage('success', `Verification complete: ${action}`);
      fetchData();
    } catch (err) { showMessage('error', 'Operation failed'); }
    setLoading(false);
  };

  if (!isVerifier && !isAdmin) return <EmptyState title="Permission Denied" description="Your wallet does not have the necessary credentials to access the verifier network." icon={<ShieldAlert className="w-10 h-10 text-red-500" />} theme={theme} />;

  if (isVerifier && !isActive && !isAdmin) {
    return (
      <Card className="p-16 text-center max-w-2xl mx-auto shadow-2xl" theme={theme}>
        <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Zap className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-black mb-4 tracking-tight">Bonding Required</h3>
        <p className={`${theme.textMuted} text-base mb-10 font-medium max-w-md mx-auto leading-relaxed`}>To begin validating identities, the protocol requires a security bond of 0.0005 ETH.</p>
        <Button onClick={handleActivate} disabled={loading} className="px-16 py-4 text-base shadow-xl shadow-amber-500/10" variant="primary" isDark={isDark}>
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Deposit 0.0005 ETH & Activate'}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Pending Tasks" value={tasks.length} icon={<Clock />} color="blue" theme={theme} />
        <StatBox label="Protocol Yield" value={`${earnings} ETH`} icon={<Gem />} color="green" theme={theme} />
        <StatBox label="Queue Health" value="Stable" icon={<ShieldCheck />} color="blue" theme={theme} />
      </div>

      <Card theme={theme}>
        <div className={`p-8 border-b ${theme.border} flex justify-between items-center bg-gray-900/5`}>
          <div>
            <h3 className="text-lg font-black tracking-tight">Verification Backlog</h3>
            <p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Active Network Requests</p>
          </div>
          <Button variant="outline" onClick={fetchData} className="text-xs px-4" isDark={isDark}><RefreshCw className="w-3.5 h-3.5" /> Refresh Feed</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]`}>
                <th className="px-8 py-5">Node Identity</th>
                <th className="px-8 py-5">Verification Link</th>
                <th className="px-8 py-5">Ownership</th>
                <th className="px-8 py-5 text-right">Decision Engine</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.border}`}>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <Globe className="w-12 h-12 mb-4 opacity-10" />
                      <p className={`${theme.textMuted} text-sm font-bold uppercase tracking-widest`}>No Active Signal Detected</p>
                    </div>
                  </td>
                </tr>
              ) : tasks.map(task => {
                const isAssignedToMe = task.assignedVerifier?.toLowerCase() === walletAddress?.toLowerCase();
                return (
                  <tr key={task.id} className={`${isAssignedToMe ? (isDark ? 'bg-blue-600/5' : 'bg-blue-50/50') : 'opacity-40'} transition-colors hover:bg-gray-500/5`}>
                    <td className="px-8 py-6 font-mono text-xs font-bold tracking-tight">{task.userAddress}</td>
                    <td className="px-8 py-6">
                      <a href={`https://ipfs.io/ipfs/${task.cid}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-500 text-xs font-black tracking-tight underline underline-offset-4 decoration-2 decoration-blue-500/20 flex items-center gap-1">VIEW PROOF <ExternalLink className="w-3 h-3" /></a>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg tracking-wider border ${isAssignedToMe ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/10'}`}>
                        {isAssignedToMe ? 'Direct Assign' : 'Network Task'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right flex justify-end gap-3">
                      {isAssignedToMe ? (
                        <>
                          <Button variant="primary" className="py-2 text-[10px] px-5 uppercase tracking-widest" onClick={() => handleAction(task.userAddress, task.cid, 'verify')} disabled={loading} isDark={isDark}>Approve</Button>
                          <Button variant="danger" className="py-2 text-[10px] px-5 uppercase tracking-widest" onClick={() => handleAction(task.userAddress, task.cid, 'reject')} disabled={loading} isDark={isDark}>Reject</Button>
                        </>
                      ) : <span className={`text-[10px] ${theme.textMuted} font-black uppercase italic tracking-widest`}>In View Only Mode</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminDashboard({ identityContract, auctionContract, isAdmin, showMessage, theme, isDark }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [verifierList, setVerifierList] = useState([]);
  const [adminList, setAdminList] = useState([]);

  const fetchData = useCallback(async () => {
    if (!identityContract || !isAdmin) return;
    try {
      const [vList, aList] = await Promise.all([
        identityContract.getVerifierList(),
        identityContract.getAdminList()
      ]);
      setVerifierList(vList);
      setAdminList(aList);

      if (auctionContract) {
        const active = await auctionContract.auctionActive();
        setIsAuctionActive(active);
      }
    } catch (err) { console.error("Admin fetch error:", err); }
  }, [identityContract, auctionContract, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerifierAction = async (action) => {
    if (!ethers.isAddress(address)) return showMessage('error', 'Provide a valid Ethereum address.');
    setLoading(true);
    try {
      const tx = action === 'add' ? await identityContract.addVerifier(address) : await identityContract.removeVerifier(address);
      await tx.wait();
      showMessage('success', `Verifier ${action === 'add' ? 'Added' : 'Removed'}!`);
      setAddress("");
      fetchData();
    } catch (err) { showMessage('error', 'Blockchain revert.'); }
    setLoading(false);
  };

  const handleAdminAction = async (action) => {
    if (!ethers.isAddress(address)) return showMessage('error', 'Provide a valid Ethereum address.');
    setLoading(true);
    try {
      const tx = action === 'add' ? await identityContract.addAdmin(address) : await identityContract.removeAdmin(address);
      await tx.wait();
      showMessage('success', `Admin ${action === 'add' ? 'Added' : 'Removed'}!`);
      setAddress("");
      fetchData();
    } catch (err) { showMessage('error', 'Blockchain revert.'); }
    setLoading(false);
  };

  const handleAuction = async (action) => {
    setLoading(true);
    try {
      const tx = action === 'start' ? await auctionContract.startAuction() : await auctionContract.endAuction();
      await tx.wait();
      showMessage('success', `Auction Round ${action === 'start' ? 'Initialized' : 'Finalized'}`);
      fetchData();
    } catch (err) { showMessage('error', 'Control Failure'); }
    setLoading(false);
  };

  if (!isAdmin) return <EmptyState title="Administrator Locked" description="System configuration is restricted to master protocol administrators." icon={<ShieldAlert className="w-10 h-10 text-rose-500" />} theme={theme} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 space-y-10" theme={theme}>
          <div>
            <h3 className="text-xl font-black tracking-tight">Authority Management</h3>
            <p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Manage Verifiers & Admins</p>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Search className="w-3 h-3" /> Target Address</label>
              <input 
                type="text" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                className={`w-full ${theme.input} border ${theme.border} p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm transition-all`}
                placeholder="0x0000..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest text-center`}>Verifier Roles</p>
                <div className="flex gap-2">
                  <Button className="flex-1 text-[10px] py-3" onClick={() => handleVerifierAction('add')} disabled={loading} isDark={isDark}><CheckCircle2 className="w-3 h-3" /> Add</Button>
                  <Button variant="outline" className="flex-1 text-[10px] py-3" onClick={() => handleVerifierAction('remove')} disabled={loading} isDark={isDark}><XCircle className="w-3 h-3" /> Revoke</Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest text-center`}>Admin Roles</p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 text-[10px] py-3" onClick={() => handleAdminAction('add')} disabled={loading} isDark={isDark}><Shield className="w-3 h-3" /> Add</Button>
                  <Button variant="outline" className="flex-1 text-[10px] py-3" onClick={() => handleAdminAction('remove')} disabled={loading} isDark={isDark}><ShieldAlert className="w-3 h-3" /> Revoke</Button>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/5' : 'bg-blue-50'} border border-blue-500/10 flex items-start gap-3`}>
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-relaxed">System Note: Administrative changes are permanent and require high-level clearance.</p>
            </div>
          </div>
        </Card>

        <Card className="p-8 space-y-10" theme={theme}>
          <div>
            <h3 className="text-xl font-black tracking-tight">Auction Orchestration</h3>
            <p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Round State Controls</p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className={`${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border ${theme.border} rounded-2xl p-10 space-y-8`}>
              <div className="text-center">
                <div className="flex justify-center items-center gap-3 mb-4">
                  <Gavel className="w-10 h-10 text-blue-500" />
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isAuctionActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                    {isAuctionActive ? 'Active' : 'Idle'}
                  </span>
                </div>
                <p className={`text-xs ${theme.textMuted} font-medium px-4`}>Manually trigger round transitions for the KYC-gated market engine.</p>
              </div>
              
              <div className="flex flex-col gap-4">
                <Button variant="primary" className="w-full py-4 text-base tracking-widest shadow-xl shadow-blue-500/10 disabled:grayscale" onClick={() => handleAuction('start')} disabled={loading || isAuctionActive} isDark={isDark}>INITIALIZE LIVE ROUND</Button>
                <Button variant="danger" className="w-full py-4 text-base tracking-widest shadow-xl shadow-red-500/10 disabled:grayscale" onClick={() => handleAuction('end')} disabled={loading || !isAuctionActive} isDark={isDark}>TERMINATE & FINALIZE</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card theme={theme}>
          <div className={`p-6 border-b ${theme.border} bg-gray-900/5`}>
            <h3 className="text-lg font-black tracking-tight">Registered Verifiers</h3>
            <p className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider mt-1`}>Complete Network Node List</p>
          </div>
          <div className={`divide-y ${theme.border} max-h-[300px] overflow-y-auto`}>
            {verifierList.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500 italic font-medium">No verifiers registered.</p>
            ) : verifierList.map((v, i) => (
              <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-500/5 transition-colors">
                <span className="font-mono text-xs text-gray-400">{v}</span>
                <button onClick={() => { setAddress(v); showMessage('success', 'Address loaded into input'); }} className="p-2 hover:text-blue-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card theme={theme}>
          <div className={`p-6 border-b ${theme.border} bg-gray-900/5`}>
            <h3 className="text-lg font-black tracking-tight">Active Administrators</h3>
            <p className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider mt-1`}>System Protocol Controllers</p>
          </div>
          <div className={`divide-y ${theme.border} max-h-[300px] overflow-y-auto`}>
            {adminList.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-500 italic font-medium">No admins found.</p>
            ) : adminList.map((a, i) => (
              <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-500/5 transition-colors">
                <span className="font-mono text-xs text-gray-400">{a}</span>
                <div className="flex gap-2">
                  <span className="text-[8px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Authorized</span>
                  <button onClick={() => { setAddress(a); showMessage('success', 'Address loaded into input'); }} className="p-2 hover:text-blue-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function GlobalDashboard({ theme, isDark, ethBalance, roles }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Protocol Integrity" value="High" icon={<ShieldCheck />} color="green" theme={theme} />
        <StatBox label="Active Nodes" value="12 Nodes" icon={<Globe />} color="blue" theme={theme} />
        <StatBox label="Network Gas" value="1.2 Gwei" icon={<Flame />} color="amber" theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8" theme={theme}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight text-blue-600">Protocol Performance</h3>
              <p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Real-time Network Statistics</p>
            </div>
            <div className="flex gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Live Feed</span>
            </div>
          </div>

          <div className="h-[300px] w-full flex items-end gap-3 px-4 pt-10">
            {[40, 70, 45, 90, 65, 80, 50, 85, 30, 95, 60, 75].map((h, i) => (
              <div key={i} className="flex-1 bg-blue-600/20 rounded-t-lg group relative transition-all hover:bg-blue-600/40" style={{ height: `${h}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {h} Req/s
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 px-2">
            {['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
              <span key={t} className={`text-[10px] font-bold ${theme.textMuted}`}>{t}</span>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-8" theme={theme}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight">Active Status</h4>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{roles.isAdmin ? 'MASTER ADMIN' : roles.isVerifier ? 'AUTH NODE' : 'STANDARD USER'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className={theme.textMuted}>Account Health</span>
                <span className="text-green-500 font-bold uppercase">Optimal</span>
              </div>
              <div className="w-full bg-gray-500/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full w-[95%]" />
              </div>
            </div>
          </Card>

          <Card className="p-8" theme={theme}>
            <h4 className="text-sm font-black tracking-tight mb-6">Recent Activity</h4>
            <div className="space-y-6">
              <ActivityRow icon={<FileText className="w-3 h-3" />} label="New Identity Submitted" time="2m ago" theme={theme} />
              <ActivityRow icon={<CheckCircle2 className="w-3 h-3" />} label="Verifier Bond Confirmed" time="15m ago" theme={theme} />
              <ActivityRow icon={<Gem className="w-3 h-3" />} label="Auction Bid Recorded" time="1h ago" theme={theme} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ icon, label, time, theme }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 w-6 h-6 rounded-lg ${theme.input} border ${theme.border} flex items-center justify-center text-blue-500`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold truncate leading-tight">{label}</p>
        <p className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-tighter mt-0.5`}>{time}</p>
      </div>
    </div>
  );
}

function AuctionPortal({ contract, identityContract, walletAddress, showMessage, theme, isDark }) {
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
    if (!isVerified) return showMessage('error', 'Verified Status Required.');
    if (parseFloat(bidValue) <= parseFloat(highestBid)) return showMessage('error', 'Incremental bid required.');
    setLoading(true);
    try {
      const tx = await contract.placeBid({ value: ethers.parseEther(bidValue) });
      await tx.wait();
      showMessage('success', 'Highest Bid Placed!');
      fetchData();
    } catch (err) { showMessage('error', 'Execution failed.'); }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Market State" value={active ? 'TRADING' : 'LOCKED'} icon={active ? <Flame /> : <Shield />} color={active ? 'green' : 'red'} theme={theme} />
        <StatBox label="Highest Bid" value={`${highestBid} ETH`} icon={<Gem />} color="blue" theme={theme} />
        <StatBox label="KYC Clearance" value={isVerified ? 'PASSED' : 'REQUIRED'} icon={<ShieldCheck />} color={isVerified ? 'green' : 'amber'} theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-10 flex flex-col justify-between shadow-2xl" theme={theme}>
          <div className="space-y-10">
            <div>
              <h3 className="text-2xl font-black tracking-tight">Active Market</h3>
              <p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-[0.3em] mt-1`}>KYC Gated Bidding Round</p>
            </div>

            <div className={`p-8 ${isDark ? 'bg-[#0B0F14]' : 'bg-gray-50'} border ${theme.border} rounded-3xl text-center space-y-4`}>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Bid Leader</p>
              <p className="font-mono text-sm font-bold break-all leading-relaxed">{highestBidder !== ethers.ZeroAddress ? highestBidder : 'No market participants'}</p>
            </div>
            
            <div className="space-y-6">
              <div className="relative group">
                <input 
                  type="text" 
                  value={bidValue} 
                  onChange={e => setBidValue(e.target.value)}
                  className={`w-full ${theme.input} border ${theme.border} p-6 rounded-2xl text-3xl font-black text-center outline-none focus:ring-4 focus:ring-blue-500/10 transition-all`}
                  placeholder="0.00"
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">ETH</span>
              </div>
              <Button onClick={placeBid} disabled={!active || !isVerified || loading} className="w-full py-5 text-lg font-black tracking-widest shadow-2xl shadow-blue-500/20" isDark={isDark}>
                {!isVerified ? 'VALIDATION REQUIRED' : !active ? 'MARKET CLOSED' : 'POST HIGHER BID'}
              </Button>
            </div>
          </div>
        </Card>

        <Card theme={theme} className="shadow-lg">
          <div className={`p-8 border-b ${theme.border} bg-gray-900/5`}>
            <h3 className="text-lg font-black tracking-tight">Protocol History</h3>
            <p className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-wider mt-1`}>Archived Finalized Rounds</p>
          </div>
          <div className={`divide-y ${theme.border} h-[460px] overflow-y-auto custom-scrollbar`}>
            {history.length === 0 ? (
              <div className="flex flex-col items-center py-32 opacity-20">
                <History className="w-12 h-12 mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Genesis State</p>
              </div>
            ) : history.map((record, i) => (
              <div key={i} className={`p-8 flex justify-between items-center transition-colors ${theme.navHover}`}>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Round #{record[0].toString()}</p>
                  <p className="text-xs font-mono font-bold text-gray-500">{record[1].substring(0,24)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black tracking-tighter">{ethers.formatEther(record[2])} <span className="text-xs text-gray-500 font-bold uppercase">ETH</span></p>
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">Final Winner</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
