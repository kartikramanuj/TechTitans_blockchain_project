"use client";

export default function Navbar({ walletAddress, connectWallet, roles }) {
  return (
    <nav className="flex justify-between items-center p-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl mb-10 transition-all hover:shadow-blue-500/10">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-blue-500/30 transform rotate-3">
          ID
        </div>
        <div>
          <h1 className="font-black text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SecureID
          </h1>
          <div className="flex gap-1.5 mt-0.5">
            {roles?.isAdmin && <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-rose-500 text-white rounded-full shadow-sm">Admin</span>}
            {roles?.isVerifier && <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-purple-500 text-white rounded-full shadow-sm">Verifier</span>}
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500 text-white rounded-full shadow-sm">User</span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={connectWallet} 
        className={`px-8 py-3 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-xl ${
          walletAddress 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
        }`}
      >
        {walletAddress ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
            {walletAddress.substring(0,6)}...{walletAddress.slice(-4)}
          </div>
        ) : 'Connect Wallet'}
      </button>
    </nav>
  );
}