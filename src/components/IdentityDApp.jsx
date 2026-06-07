"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import IdentityVerifierJSON from '../abi/IdentityVerifier.json';
import KYCGatedAuctionJSON from '../abi/KYCGatedAuction.json';

// --- Constants ---
const IDENTITY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "0x39AA78081c04592Ad581ADC055146c3E5A77A3F5";
const AUCTION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ADDRESS || "0xe5d539F430bD3331221BE9b144baC9F202Ae1855";
const EXPECTED_CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID || "11155111");

const getAbi = (json) => {
  if (Array.isArray(json)) return json;
  if (json && json.abi && Array.isArray(json.abi)) return json.abi;
  return null;
};

const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");

const rawApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE = rawApiBase ? (rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase) : "http://localhost:5001/api";
console.log("[IdentityDApp] API_BASE:", API_BASE);

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
  const [globalStats, setGlobalStats] = useState({ activeNodes: 0, gasPrice: '0' });
  const [recentActivity, setRecentActivity] = useState([]);
  const [syncTrigger, setSyncTrigger] = useState(0);

  const theme = useMemo(() => ({
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
    isDark
  }), [isDark]);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const fetchGlobalStats = useCallback(async (contract, provider) => {
    if (!contract || !provider) return;
    try {
      const [vList, feeData, activityRes] = await Promise.all([
        contract.getVerifierList(),
        provider.getFeeData(),
        fetch(`${API_BASE}/kyc/activity`, { cache: 'no-store' }).then(r => r.json()).catch(() => [])
      ]);
      setGlobalStats({
        activeNodes: vList.length,
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei')
      });
      setRecentActivity(Array.isArray(activityRes) ? activityRes : []);
    } catch (err) { console.error("Global stats error:", err); }
  }, []);

  const loginToBackend = useCallback(async (address, role) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const loginTime = new Date().toISOString();
    const messageToSign = `Login to SecureID as ${role}\nWallet: ${address}\nTimestamp: ${loginTime}`;
    
    let signature;
    try {
      signature = await signer.signMessage(messageToSign);
    } catch (signError) {
      if (signError.code === "ACTION_REJECTED" || signError.code === 4001 || signError.message?.toLowerCase().includes("rejected")) {
        throw new Error("USER_CANCELLED");
      }
      throw signError;
    }

    if (!API_BASE) throw new Error("API_BASE_URL_MISSING");

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, role, signature, message: messageToSign }),
      cache: 'no-store'
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "SERVER_AUTH_FAILED");
    if (data.token) {
      setToken(data.token);
      return data.token;
    }
    throw new Error("TOKEN_MISSING");
  }, []);

  const checkRoles = useCallback(async (_contract, address) => {
    const [isAdmin, isVerifier] = await Promise.all([
      _contract.hasRole(DEFAULT_ADMIN_ROLE, address).catch(() => false),
      _contract.hasRole(VERIFIER_ROLE, address).catch(() => false)
    ]);
    const role = isAdmin ? 'admin' : isVerifier ? 'verifier' : 'user';
    await loginToBackend(address, role);
    setRoles({ isAdmin, isVerifier });
    return true;
  }, [loginToBackend]);

  const connectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);
        const targetChainId = Number(EXPECTED_CHAIN_ID);

        if (currentChainId !== targetChainId) {
          const networkName = targetChainId === 11155111 ? "Sepolia Testnet" : "Hardhat Localhost";
          showMessage('error', `Please switch to ${networkName} (${targetChainId}). Detected: ${currentChainId}`);
          return;
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        if (!IDENTITY_CONTRACT_ADDRESS || !AUCTION_CONTRACT_ADDRESS) {
          throw new Error("PROTOCOL_ADDRESS_MISSING");
        }

        const identityAbi = getAbi(IdentityVerifierJSON);
        const auctionAbi = getAbi(KYCGatedAuctionJSON);

        if (!identityAbi || !auctionAbi) throw new Error("ABI_LOAD_FAILED");

        const _identityContract = new ethers.Contract(IDENTITY_CONTRACT_ADDRESS, identityAbi, signer);
        const _auctionContract = new ethers.Contract(AUCTION_CONTRACT_ADDRESS, auctionAbi, signer);

        await checkRoles(_identityContract, address);
        
        const balance = await provider.getBalance(address);
        setEthBalance(ethers.formatEther(balance));
        setWalletAddress(address);
        setIdentityContract(_identityContract);
        setAuctionContract(_auctionContract);

        await fetchGlobalStats(_identityContract, provider);
        showMessage('success', 'Authenticated Successfully');
      } catch (error) { 
        console.warn("Connection Interrupted:", error.message);
        if (error.message === "USER_CANCELLED") showMessage('error', 'Authentication cancelled. Signature required.');
        else if (error.message === "SERVER_AUTH_FAILED") showMessage('error', 'Backend authorization failed.');
        else if (error.message === "API_BASE_URL_MISSING") showMessage('error', 'Configuration error: API URL missing.');
        else showMessage('error', error.message?.split("(")[0] || "Connection failed"); 
        
        setWalletAddress(null);
        setToken(null);
        setIdentityContract(null);
      }
    } else { alert("Install MetaMask"); }
  }, [showMessage, fetchGlobalStats, checkRoles]);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountChange = (accs) => {
        if (accs.length > 0) {
          localStorage.clear();
          sessionStorage.clear();
          setToken(null);
          setWalletAddress(null);
          connectWallet();
        } else {
          setWalletAddress(null);
        }
      };
      
      const handleChainChange = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', handleChainChange);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleChainChange);
      }
    }
  }, [connectWallet]);

  useEffect(() => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    let lastBlock = -1;

    const handleBlock = (blockNum) => {
      if (lastBlock !== -1 && blockNum < lastBlock) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
      lastBlock = blockNum;
    };

    provider.on('block', handleBlock);
    return () => provider.off('block', handleBlock);
  }, []);

  useEffect(() => {
    if (!identityContract) return;

    const forceSync = () => {
      setSyncTrigger(prev => prev + 1);
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        if (walletAddress) {
          provider.getBalance(walletAddress).then(b => setEthBalance(ethers.formatEther(b)));
        }
        fetchGlobalStats(identityContract, provider);
      }
    };

    identityContract.on("IdentitySubmitted", forceSync);
    identityContract.on("IdentityVerified", forceSync);
    identityContract.on("IdentityRejected", forceSync);
    identityContract.on("IdentityRevoked", forceSync);
    identityContract.on("VerifierDeactivated", forceSync);

    return () => {
      identityContract.off("IdentitySubmitted", forceSync);
      identityContract.off("IdentityVerified", forceSync);
      identityContract.off("IdentityRejected", forceSync);
      identityContract.off("IdentityRevoked", forceSync);
      identityContract.off("VerifierDeactivated", forceSync);
    };
  }, [identityContract, fetchGlobalStats, walletAddress]);

  const shortenedAddress = walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : '';

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans flex overflow-hidden transition-colors duration-500`}>
      <aside className={`${theme.sidebar} border-r ${theme.border} transition-all duration-300 flex flex-col z-30 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className={`p-6 flex items-center gap-3 border-b ${theme.border} h-20`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">S</div>
          {sidebarOpen && <span className={`font-bold text-lg tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>SecureID</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1.5 mt-4">
          <NavItem icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} expanded={sidebarOpen} theme={theme} />
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

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={`h-20 border-b ${theme.border} ${theme.header} backdrop-blur-md flex items-center justify-between px-8 z-20 transition-colors duration-300`}>
          <div className="flex items-center gap-4">
            <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'} capitalize tracking-tight`}>{view.replace('-', ' ')}</h1>
            <div className={`px-2.5 py-1 ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-100'} border rounded-full flex items-center gap-2`}>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Connected</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {walletAddress && (
              <div className={`hidden sm:flex items-center px-3 py-1 rounded-lg border ${
                roles.isAdmin ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                roles.isVerifier ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                'bg-blue-500/10 border-blue-500/20 text-blue-500'
              } text-[10px] font-black uppercase tracking-widest`}>
                {roles.isAdmin ? 'Master Admin' : roles.isVerifier ? 'Auth Node' : 'Standard User'}
              </div>
            )}

            <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-lg border ${theme.border} ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-amber-400' : 'bg-white hover:bg-gray-50 shadow-sm text-blue-600'} transition-all`}>
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

        <div className="flex-1 overflow-y-auto p-8 relative">
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
                {view === 'dashboard' && <GlobalDashboard theme={theme} isDark={isDark} ethBalance={ethBalance} roles={roles} globalStats={globalStats} recentActivity={recentActivity} />}
                {view === 'user' && <UserDashboard contract={identityContract} walletAddress={walletAddress} token={token} showMessage={showMessage} ethBalance={ethBalance} theme={theme} isDark={isDark} syncTrigger={syncTrigger} />}
                {view === 'verifier' && <VerifierDashboard contract={identityContract} isVerifier={roles.isVerifier} isAdmin={roles.isAdmin} walletAddress={walletAddress} token={token} showMessage={showMessage} theme={theme} isDark={isDark} syncTrigger={syncTrigger} />}
                {view === 'admin' && <AdminDashboard identityContract={identityContract} auctionContract={auctionContract} isAdmin={roles.isAdmin} showMessage={showMessage} token={token} theme={theme} isDark={isDark} syncTrigger={syncTrigger} />}
                {view === 'auction' && <AuctionPortal contract={auctionContract} identityContract={identityContract} walletAddress={walletAddress} showMessage={showMessage} theme={theme} isDark={isDark} syncTrigger={syncTrigger} />}
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
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group border border-transparent ${active ? theme.navActive : `${theme.navHover} ${theme.textMuted} hover:${theme.text}`}`}>
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

function UserDashboard({ contract, walletAddress, token, showMessage, ethBalance, theme, isDark, syncTrigger }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState({ status: 'None', verifier: '', deadline: 0 });
  const [requestCount, setRequestCount] = useState(0);
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0");
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setTimeout(() => setCurrentTime(Math.floor(Date.now() / 1000)), 0);
    const timer = setInterval(() => setCurrentTime(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!contract || !walletAddress) return;
      try {
        const [id, count, amount] = await Promise.all([
          contract.getIdentity(walletAddress),
          contract.requestCount(walletAddress),
          contract.pendingWithdrawals(walletAddress)
        ]);
        if (isMounted) {
          setDetails({
            status: ["None", "Pending", "Verified", "Revoked", "Rejected"][Number(id[1])],
            verifier: id[2],
            deadline: Number(id[4])
          });
          setRequestCount(Number(count));
          setPendingWithdrawal(ethers.formatEther(amount));
        }
      } catch (err) { console.error("Fetch Data Error:", err); }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [contract, walletAddress, syncTrigger]); 

  const handleSubmit = async () => {
    if (!file || !token) return showMessage('error', 'Select a file to proceed.');
    setUploading(true);
    try {
      const idData = await contract.getIdentity(walletAddress);
      if (Number(idData[1]) === 1) throw new Error("A request is already pending on-chain.");

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userAddress', walletAddress);
      
      const res = await fetch(`${API_BASE}/kyc/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok) {
        const cidHash = ethers.id(data.cid);
        const tx = await contract.submitIdentity(cidHash, { value: ethers.parseEther("0.01"), gasLimit: 500000 });
        await tx.wait();
        showMessage('success', 'Identity confirmed on-chain.');
        setFile(null);
      } else { throw new Error(data.error || "Upload failed"); }
    } catch (err) { showMessage('error', err.message); }
    setUploading(false);
  };

  const handleRevoke = async () => {
    setUploading(true);
    try {
      const tx = await contract.revokeIdentity();
      await tx.wait();
      showMessage('success', 'Identity revoked successfully.');
    } catch (err) { showMessage('error', 'Revocation failed.'); }
    setUploading(false);
  };

  const handleSettle = async () => {
    setUploading(true);
    try {
      const tx = await contract.settleExpired(walletAddress);
      await tx.wait();
      showMessage('success', 'Timeout settled.');
    } catch (err) { showMessage('error', 'Settlement failed.'); }
    setUploading(false);
  };

  const isLimitReached = requestCount >= 4;
  const isExpired = details.status === 'Pending' && details.deadline > 0 && currentTime > details.deadline;

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
              <div className="flex gap-3">
                {details.status === 'Verified' && <Button onClick={handleRevoke} disabled={uploading} variant="danger" isDark={isDark}>Revoke Identity</Button>}
                {isExpired && <Button onClick={handleSettle} disabled={uploading} variant="secondary" isDark={isDark}>Claim SLA Refund</Button>}
                <Button onClick={handleSubmit} disabled={uploading || !file || isLimitReached || details.status === 'Pending'} className="px-10 py-3 shadow-lg shadow-blue-500/20" isDark={isDark}>
                  {uploading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : 'Execute Submission'}
                </Button>
              </div>
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
                {Number(pendingWithdrawal) > 0 && <Button variant="secondary" className="text-xs px-4 py-1.5" onClick={async () => { await contract.withdraw(); }} isDark={isDark}><ArrowDownLeft className="w-3.5 h-3.5" /> Claim</Button>}
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
            ) : <p className="text-sm text-gray-500 italic font-medium">Inactive</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function VerifierDashboard({ contract, isVerifier, isAdmin, walletAddress, token, showMessage, theme, isDark, syncTrigger }) {
  const [tasks, setTasks] = useState([]);
  const [earnings, setEarnings] = useState("0");
  const [stake, setStake] = useState("0");
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleActivateBond = async () => {
    setLoading(true);
    try {
      const tx = await contract.activateVerifier({ value: ethers.parseEther("0.0005") });
      await tx.wait();
      showMessage('success', 'Verifier status active!');
    } catch (err) { showMessage('error', 'Stake failed.'); }
    setLoading(false);
  };

  const handleTopUpStake = async () => {
    setLoading(true);
    try {
      const tx = await contract.topUpStake({ value: ethers.parseEther("0.0005") });
      await tx.wait();
      showMessage('success', 'Stake topped up!');
    } catch (err) { showMessage('error', 'Top-up failed.'); }
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!token || (!isVerifier && !isAdmin) || !contract || !walletAddress) return;
      try {
        const res = await fetch(`${API_BASE}/kyc/tasks`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
        const backendTasks = await res.json();
        const liveTasks = [];
        for (const t of (Array.isArray(backendTasks) ? backendTasks : [])) {
          const idData = await contract.getIdentity(t.userAddress);
          if (Number(idData[1]) === 1) { 
            liveTasks.push({ ...t, assignedVerifier: idData[2], onChainHash: idData[0] });
          }
        }
        if (isMounted) {
          setTasks(liveTasks);
          if (selectedTask && !liveTasks.find(t => t.userAddress === selectedTask.userAddress)) setSelectedTask(null);
        }
        const [amount, stakeAmount] = await Promise.all([contract.pendingWithdrawals(walletAddress), contract.stake(walletAddress)]);
        if (isMounted) {
          setEarnings(ethers.formatEther(amount));
          setStake(ethers.formatEther(stakeAmount));
          setIsActive(Number(stakeAmount) >= Number(ethers.parseEther("0.0005")));
        }
      } catch (err) { console.error("[Verifier] Fetch error:", err); if (isMounted) setTasks([]); }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [token, isVerifier, isAdmin, contract, walletAddress, syncTrigger, selectedTask]);

  const handleAction = async (userAddress, cid, action) => {
    setLoading(true);
    try {
      const idData = await contract.getIdentity(userAddress);
      const onChainStatus = Number(idData[1]);
      if (onChainStatus !== 1) { 
        showMessage('error', 'Blockchain state changed: Task is no longer pending.');
        await fetch(`${API_BASE}/kyc/update-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ userAddress, status: onChainStatus === 2 ? 'verified' : 'rejected' }),
          cache: 'no-store'
        });
        setSelectedTask(null);
        setLoading(false);
        return;
      }
      const onChainHash = idData[0];
      let tx;
      if (action === 'verify') {
        const hashToSubmit = cid === 'blockchain-sync' ? onChainHash : ethers.id(cid);
        tx = await contract.verifyIdentity(userAddress, hashToSubmit);
      } else { tx = await contract.rejectIdentity(userAddress); }
      showMessage('success', `Confirm transaction in MetaMask...`);
      await tx.wait();
      await fetch(`${API_BASE}/kyc/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userAddress, status: action === 'verify' ? 'verified' : 'rejected' }),
        cache: 'no-store'
      });
      showMessage('success', `Verification finalized.`);
      setSelectedTask(null);
    } catch (err) { showMessage('error', err.reason || "Operation Failed"); }
    setLoading(false);
  };

  if (!isVerifier && !isAdmin) return <EmptyState title="Permission Denied" description="Access restricted." icon={<ShieldAlert className="w-10 h-10 text-red-500" />} theme={theme} />;

  if (isVerifier && !isActive && !isAdmin) {
    const isPenalized = Number(stake) > 0 && Number(stake) < Number(ethers.parseEther("0.0005"));
    return (
      <Card className="p-16 text-center max-w-2xl mx-auto shadow-2xl" theme={theme}>
        <div className={`w-20 h-20 ${isPenalized ? 'bg-red-500/10' : 'bg-amber-500/10'} rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner`}>
          {isPenalized ? <ShieldAlert className="w-10 h-10 text-red-500" /> : <Zap className="w-10 h-10 text-amber-500" />}
        </div>
        <h3 className="text-2xl font-black mb-4 tracking-tight">{isPenalized ? 'Node Penalized' : 'Bonding Required'}</h3>
        <p className={`${theme.textMuted} text-base mb-10 font-medium max-w-md mx-auto leading-relaxed`}>{isPenalized ? `Stake below requirement. Please top up.` : 'Security bond of 0.0005 ETH required.'}</p>
        <Button onClick={isPenalized ? handleTopUpStake : handleActivateBond} disabled={loading} className="px-16 py-4 text-base shadow-xl shadow-amber-500/10" variant="primary" isDark={isDark}>
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : isPenalized ? 'Top-up 0.0005 ETH' : 'Deposit 0.0005 ETH & Activate'}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatBox label="Pending Tasks" value={tasks.length} icon={<Clock />} color="blue" theme={theme} />
        <StatBox label="Staked Bond" value={`${stake} ETH`} icon={<ShieldCheck />} color="amber" theme={theme} />
        <StatBox label="Protocol Yield" value={`${earnings} ETH`} icon={<Gem />} color="green" theme={theme} />
      </div>
      {selectedTask ? (
        <Card theme={theme} className="p-10 animate-in zoom-in-95 duration-300 shadow-2xl border-blue-500/20 ring-4 ring-blue-500/5">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black tracking-tight">Review Decision Console</h3>
              <p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Assigned User: <span className="font-mono text-blue-500">{selectedTask.userAddress}</span></p>
            </div>
            <Button variant="outline" onClick={() => setSelectedTask(null)} isDark={isDark}>Close Review</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className={`rounded-2xl border ${theme.border} overflow-hidden bg-black/5 aspect-[4/5] flex flex-col`}>
              <div className="p-4 border-b bg-gray-500/5 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Document Proof Viewer</span>
                <a 
                  href={`https://gateway.pinata.cloud/ipfs/${selectedTask.cid}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-blue-500 text-[10px] font-black uppercase flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  Open Direct Link <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                {(!selectedTask.cid || selectedTask.cid === 'blockchain-sync' || selectedTask.cid.includes('Dummy')) ? (
                  <div className="text-center space-y-4 px-10">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">Manual Verification Required</p>
                      <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                        This request was synchronized from the blockchain history. The original file link is not available in the local cache. 
                        Please verify via the <b>Submission Hash</b> or request a re-upload.
                      </p>
                    </div>
                  </div>
                ) : (
                  <iframe 
                    src={`https://gateway.pinata.cloud/ipfs/${selectedTask.cid}`} 
                    className="w-full h-full rounded-lg shadow-sm bg-white"
                    title="Document Proof"
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col justify-between py-4">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Metadata</p>
                  <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border ${theme.border} space-y-4`}>
                    <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">Submission Hash</span><span className="text-xs font-mono text-blue-500 truncate ml-4 max-w-[200px]">{selectedTask.cidHash}</span></div>
                    <div className="flex justify-between"><span className="text-xs font-bold text-gray-500">Timestamp</span><span className="text-xs font-bold">{new Date(selectedTask.uploadedAt).toLocaleString()}</span></div>
                  </div>
                </div>
                <div className="space-y-4"><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Decision Matrix</p><p className={`text-xs ${theme.textMuted} font-medium leading-relaxed`}>Verify proof matches requirements.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-10">
                <Button variant="primary" className="py-5 text-base font-black uppercase tracking-widest shadow-xl shadow-blue-500/20" onClick={() => handleAction(selectedTask.userAddress, selectedTask.cid, 'verify')} disabled={loading} isDark={isDark}>{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : 'APPROVE'}</Button>
                <Button variant="danger" className="py-5 text-base font-black uppercase tracking-widest shadow-xl shadow-red-500/20" onClick={() => handleAction(selectedTask.userAddress, selectedTask.cid, 'reject')} disabled={loading} isDark={isDark}>{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : 'REJECT'}</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card theme={theme}>
          <div className={`p-8 border-b ${theme.border} flex justify-between items-center bg-gray-900/5`}>
            <div>
              <h3 className="text-lg font-black tracking-tight">Verification Backlog</h3>
              <p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Active Network Requests</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${isDark ? 'bg-gray-900/50' : 'bg-gray-50'} text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]`}>
                  <th className="px-8 py-5">Node Identity</th>
                  <th className="px-8 py-5">Ownership</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {tasks.length === 0 ? (
                  <tr><td colSpan="3" className="px-8 py-24 text-center"><div className="flex flex-col items-center"><Globe className="w-12 h-12 mb-4 opacity-10" /><p className={`${theme.textMuted} text-sm font-bold uppercase tracking-widest`}>No Active Signal Detected</p></div></td></tr>
                ) : tasks.map(task => {
                  const isAssignedToMe = task.assignedVerifier?.toLowerCase() === walletAddress?.toLowerCase();
                  return (
                    <tr key={task.id || task.userAddress} className={`${isAssignedToMe ? (isDark ? 'bg-blue-600/5' : 'bg-blue-50/50') : 'opacity-40'} transition-colors hover:bg-gray-500/5`}>
                      <td className="px-8 py-6 font-mono text-xs font-bold tracking-tight">{task.userAddress}</td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg tracking-wider border ${isAssignedToMe ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/10'}`}>
                          {isAssignedToMe ? 'Direct Assign' : 'Network Task'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {isAssignedToMe ? <Button variant="secondary" className="text-[10px] py-2 px-6 uppercase tracking-widest font-black" onClick={() => setSelectedTask(task)} isDark={isDark}>Review Request</Button> : <span className={`text-[10px] ${theme.textMuted} font-black uppercase italic tracking-widest`}>In View Only Mode</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AdminDashboard({ identityContract, auctionContract, isAdmin, showMessage, theme, isDark, syncTrigger }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [verifierList, setVerifierList] = useState([]);
  const [adminList, setAdminList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!identityContract || !isAdmin) return;
      try {
        const [vList, aList] = await Promise.all([identityContract.getVerifierList(), identityContract.getAdminList()]);
        const [vRoles, aRoles] = await Promise.all([Promise.all(vList.map(v => identityContract.hasRole(VERIFIER_ROLE, v))), Promise.all(aList.map(a => identityContract.hasRole(DEFAULT_ADMIN_ROLE, a)))]);
        if (isMounted) {
          setVerifierList(vList.filter((_, i) => vRoles[i]));
          setAdminList(aList.filter((_, i) => aRoles[i]));
        }
        if (auctionContract) {
          const active = await auctionContract.auctionActive();
          if (isMounted) setIsAuctionActive(active);
        }
      } catch (err) { console.error("Admin fetch error:", err); }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [identityContract, auctionContract, isAdmin, syncTrigger]);

  const handleVerifierAction = async (action) => {
    if (!ethers.isAddress(address)) return showMessage('error', 'Provide a valid Ethereum address.');
    setLoading(true);
    try {
      const tx = action === 'add' ? await identityContract.addVerifier(address) : await identityContract.removeVerifier(address);
      await tx.wait();
      showMessage('success', `Verifier ${action === 'add' ? 'Added' : 'Removed'}!`);
      setAddress("");
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
    } catch (err) { showMessage('error', 'Blockchain revert.'); }
    setLoading(false);
  };

  const handleAuction = async (action) => {
    setLoading(true);
    try {
      const tx = action === 'start' ? await auctionContract.startAuction() : await auctionContract.endAuction();
      await tx.wait();
      showMessage('success', `Auction Round ${action === 'start' ? 'Initialized' : 'Finalized'}`);
    } catch (err) { showMessage('error', 'Control Failure'); }
    setLoading(false);
  };

  if (!isAdmin) return <EmptyState title="Administrator Locked" description="Access restricted." icon={<ShieldAlert className="w-10 h-10 text-rose-500" />} theme={theme} />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 space-y-10" theme={theme}>
          <div><h3 className="text-xl font-black tracking-tight">Authority Management</h3><p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Manage Nodes</p></div>
          <div className="space-y-6">
            <div className="space-y-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Search className="w-3 h-3" /> Target Address</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className={`w-full ${theme.input} border ${theme.border} p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm transition-all`} placeholder="0x0000..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest text-center`}>Verifier Roles</p><div className="flex gap-2"><Button className="flex-1 text-[10px] py-3" onClick={() => handleVerifierAction('add')} disabled={loading} isDark={isDark}><CheckCircle2 className="w-3 h-3" /> Add</Button><Button variant="outline" className="flex-1 text-[10px] py-3" onClick={() => handleVerifierAction('remove')} disabled={loading} isDark={isDark}><XCircle className="w-3 h-3" /> Revoke</Button></div></div>
              <div className="space-y-2"><p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest text-center`}>Admin Roles</p><div className="flex gap-2"><Button variant="secondary" className="flex-1 text-[10px] py-3" onClick={() => handleAdminAction('add')} disabled={loading} isDark={isDark}><Shield className="w-3 h-3" /> Add</Button><Button variant="outline" className="flex-1 text-[10px] py-3" onClick={() => handleAdminAction('remove')} disabled={loading} isDark={isDark}><ShieldAlert className="w-3 h-3" /> Revoke</Button></div></div>
            </div>
          </div>
        </Card>
        <Card className="p-8 space-y-10" theme={theme}>
          <div><h3 className="text-xl font-black tracking-tight">Auction Orchestration</h3><p className={`text-xs ${theme.textMuted} font-bold mt-1 uppercase tracking-wider`}>Round State Controls</p></div>
          <div className="flex-1 flex flex-col justify-center">
            <div className={`${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border ${theme.border} rounded-2xl p-10 space-y-8`}>
              <div className="text-center"><div className="flex justify-center items-center gap-3 mb-4"><Gavel className="w-10 h-10 text-blue-500" /><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isAuctionActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>{isAuctionActive ? 'Active' : 'Idle'}</span></div></div>
              <div className="flex flex-col gap-4"><Button variant="primary" className="w-full py-4 text-base tracking-widest shadow-xl shadow-blue-500/10 disabled:grayscale" onClick={() => handleAuction('start')} disabled={loading || isAuctionActive} isDark={isDark}>INITIALIZE LIVE ROUND</Button><Button variant="danger" className="w-full py-4 text-base tracking-widest shadow-xl shadow-red-500/10 disabled:grayscale" onClick={() => handleAuction('end')} disabled={loading || !isAuctionActive} isDark={isDark}>TERMINATE & FINALIZE</Button></div>
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card theme={theme}>
          <div className={`p-6 border-b ${theme.border} bg-gray-900/5`}><h3 className="text-lg font-black tracking-tight">Registered Verifiers</h3></div>
          <div className={`divide-y ${theme.border} max-h-[300px] overflow-y-auto`}>{verifierList.length === 0 ? <p className="p-8 text-center text-xs text-gray-500 italic font-medium">No verifiers registered.</p> : verifierList.map((v, i) => <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-500/5 transition-colors"><span className="font-mono text-xs text-gray-400">{v}</span><button onClick={() => { setAddress(v); showMessage('success', 'Address loaded into input'); }} className="p-2 hover:text-blue-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button></div>)}</div>
        </Card>
        <Card theme={theme}>
          <div className={`p-6 border-b ${theme.border} bg-gray-900/5`}><h3 className="text-lg font-black tracking-tight">Active Administrators</h3></div>
          <div className={`divide-y ${theme.border} max-h-[300px] overflow-y-auto`}>{adminList.length === 0 ? <p className="p-8 text-center text-xs text-gray-500 italic font-medium">No admins found.</p> : adminList.map((a, i) => <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-500/5 transition-colors"><span className="font-mono text-xs text-gray-400">{a}</span><div className="flex gap-2"><span className="text-[8px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Authorized</span><button onClick={() => { setAddress(a); showMessage('success', 'Address loaded into input'); }} className="p-2 hover:text-blue-500 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button></div></div>)}</div>
        </Card>
      </div>
    </div>
  );
}

function GlobalDashboard({ theme, isDark, ethBalance, roles, globalStats, recentActivity }) {
  const [chartData, setChartData] = useState([]);
  useEffect(() => { setTimeout(() => { setChartData(Array.from({ length: 12 }, () => Math.floor(Math.random() * 60) + 20)); }, 0); }, []);
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatBox label="Protocol Integrity" value="High" icon={<ShieldCheck />} color="green" theme={theme} /><StatBox label="Active Nodes" value={`${globalStats.activeNodes} Nodes`} icon={<Globe />} color="blue" theme={theme} /><StatBox label="Network Gas" value={`${parseFloat(globalStats.gasPrice).toFixed(2)} Gwei`} icon={<Flame />} color="amber" theme={theme} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8" theme={theme}>
          <div className="flex items-center justify-between mb-8"><div><h3 className="text-xl font-black tracking-tight text-blue-600">Protocol Performance</h3></div><div className="flex gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest text-green-500">Live Feed</span></div></div>
          <div className="h-[300px] w-full flex items-end gap-3 px-4 pt-10">{chartData.map((h, i) => <div key={i} className="flex-1 bg-blue-600/20 rounded-t-lg group relative transition-all hover:bg-blue-600/40" style={{ height: `${h}%` }}><div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h} Req/s</div></div>)}</div>
        </Card>
        <div className="space-y-6">
          <Card className="p-8" theme={theme}><div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><BadgeCheck className="w-6 h-6" /></div><div><h4 className="text-sm font-black tracking-tight">Active Status</h4><p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{roles.isAdmin ? 'MASTER ADMIN' : roles.isVerifier ? 'AUTH NODE' : 'STANDARD USER'}</p></div></div><div className="space-y-3"><div className="flex justify-between items-center text-xs"><span className={theme.textMuted}>Account Health</span><span className="text-green-500 font-bold uppercase">Optimal</span></div><div className="w-full bg-gray-500/10 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full w-[95%]" /></div></div></Card>
          <Card className="p-8" theme={theme}><h4 className="text-sm font-black tracking-tight mb-6">Recent Activity</h4><div className="space-y-6">{recentActivity.length === 0 ? <div className="flex flex-col items-center py-4 opacity-20"><History className="w-6 h-6 mb-2" /><p className="text-[10px] font-bold uppercase">No Activity</p></div> : recentActivity.map((act, i) => { const label = act.status === 'pending' ? 'Identity Submitted' : act.status === 'verified' ? 'Identity Verified' : 'Identity Rejected'; const icon = act.status === 'pending' ? <FileText className="w-3 h-3" /> : act.status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />; const time = new Date(act.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); return <ActivityRow key={i} icon={icon} label={label} time={time} theme={theme} />; })}</div></Card>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ icon, label, time, theme }) {
  return (
    <div className="flex items-start gap-3"><div className={`mt-0.5 w-6 h-6 rounded-lg ${theme.input} border ${theme.border} flex items-center justify-center text-blue-500`}>{icon}</div><div className="flex-1 min-w-0"><p className="text-[11px] font-bold truncate leading-tight">{label}</p><p className={`text-[9px] ${theme.textMuted} font-medium uppercase tracking-tighter mt-0.5`}>{time}</p></div></div>
  );
}

function AuctionPortal({ contract, identityContract, walletAddress, showMessage, theme, isDark, syncTrigger }) {
  const [active, setActive] = useState(false);
  const [highestBid, setHighestBid] = useState("0");
  const [highestBidder, setHighestBidder] = useState(null);
  const [bidValue, setBidValue] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!contract || !identityContract || !walletAddress) return;
      try {
        const [isActive, topBid, topBidder, past, verified] = await Promise.all([contract.auctionActive(), contract.highestBid(), contract.highestBidder(), contract.getPastAuctions(), identityContract.isVerified(walletAddress)]);
        if (isMounted) { setActive(isActive); setHighestBid(ethers.formatEther(topBid)); setHighestBidder(topBidder); setHistory(past); setIsVerified(verified); if (bidValue === "") setBidValue((parseFloat(ethers.formatEther(topBid)) + 0.001).toString()); }
      } catch (err) { console.error("Auction fetch error:", err); }
    };
    fetchData();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, identityContract, walletAddress, syncTrigger]);
  const handleBid = async () => {
    if (!bidValue || isNaN(bidValue)) return showMessage('error', 'Enter a valid ETH amount');
    setLoading(true);
    try {
      const tx = await contract.placeBid({ value: ethers.parseEther(bidValue) });
      await tx.wait();
      showMessage('success', 'Highest Bid Placed!');
      setBidValue("");
    } catch (err) { showMessage('error', err.reason || 'Bid rejected by protocol'); }
    setLoading(false);
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatBox label="Market State" value={active ? 'TRADING' : 'LOCKED'} icon={active ? <Flame /> : <Shield />} color={active ? 'green' : 'red'} theme={theme} /><StatBox label="Highest Bid" value={`${highestBid} ETH`} icon={<Gem />} color="blue" theme={theme} /><StatBox label="KYC Clearance" value={isVerified ? 'PASSED' : 'REQUIRED'} icon={<ShieldCheck />} color={isVerified ? 'green' : 'amber'} theme={theme} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-10 flex flex-col justify-between shadow-2xl" theme={theme}>
          <div className="space-y-10"><div><h3 className="text-2xl font-black tracking-tight">Active Market</h3><p className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-[0.3em] mt-1`}>KYC Gated Bidding Round</p></div><div className={`p-8 ${isDark ? 'bg-[#0B0F14]' : 'bg-gray-50'} border ${theme.border} rounded-3xl text-center space-y-4`}><p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Bid Leader</p><p className="font-mono text-sm font-bold break-all leading-relaxed">{highestBidder !== ethers.ZeroAddress ? highestBidder : 'No market participants'}</p></div><div className="space-y-6"><div className="relative group"><input type="text" value={bidValue} onChange={e => setBidValue(e.target.value)} className={`w-full ${theme.input} border ${theme.border} p-6 rounded-2xl text-3xl font-black text-center outline-none focus:ring-4 focus:ring-blue-500/10 transition-all`} placeholder="0.00" /><span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">ETH</span></div><Button onClick={handleBid} disabled={!active || !isVerified || loading} className="w-full py-5 text-lg font-black tracking-widest shadow-2xl shadow-blue-500/20" isDark={isDark}>{!isVerified ? 'VALIDATION REQUIRED' : !active ? 'MARKET CLOSED' : 'POST HIGHER BID'}</Button></div></div>
        </Card>
        <Card theme={theme} className="shadow-lg"><div className={`p-8 border-b ${theme.border} bg-gray-900/5`}><h3 className="text-lg font-black tracking-tight">Protocol History</h3></div><div className={`divide-y ${theme.border} h-[460px] overflow-y-auto custom-scrollbar`}>{history.length === 0 ? <div className="flex flex-col items-center py-32 opacity-20"><History className="w-12 h-12 mb-4" /> <p className="text-xs font-black uppercase tracking-[0.2em]">Genesis State</p></div> : history.map((record, i) => <div key={i} className={`p-8 flex justify-between items-center transition-colors ${theme.navHover}`}><div className="space-y-2"><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Round #{record[0].toString()}</p><p className="text-xs font-mono font-bold text-gray-500">{record[1].substring(0,24)}...</p></div><div className="text-right"><p className="text-xl font-black tracking-tighter">{ethers.formatEther(record[2])} <span className="text-xs text-gray-500 font-bold uppercase">ETH</span></p><p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-1">Final Winner</p></div></div>)}</div></Card>
      </div>
    </div>
  );
}
