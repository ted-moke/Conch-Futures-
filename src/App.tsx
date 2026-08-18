import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "./lib/auth";
import { Pool } from "./types";
import PoolSelector from "./components/PoolSelector";
import PoolDetail from "./components/PoolDetail";
import LoginPage from "./components/LoginPage";
import HostBar from "./components/HostBar";
import Logo from "./components/Logo";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  const handleSignOut = async () => {
    await signOut();
    setSelectedPool(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061217] flex flex-col justify-center items-center">
        <div className="w-12 h-12 rounded-full border-4 border-teal-500/25 border-t-teal-400 animate-spin mb-4"></div>
        <p className="text-slate-400 font-mono text-xs">Loading Conch Predictor Series...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <>
        <HostBar />
        <LoginPage />
      </>
    );
  }

  // Signed in layout
  return (
    <div className="min-h-screen bg-[#061217] flex flex-col">
      <HostBar />
      {/* Navbar dashboard */}
      <header className="border-b border-[#113a4b]/50 bg-[#071d26]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 h-12 flex items-center justify-between">
          <div
            onClick={() => setSelectedPool(null)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Logo size={40} variant="full" className="transition-transform group-hover:scale-105" />
            <span className="font-extrabold tracking-tight text-white text-base font-display">
              Conch Predictor Series
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile summary */}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-5 h-5 rounded-full border border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-slate-300 uppercase">
                  {user.displayName?.charAt(0)}
                </div>
              )}
              <span className="text-slate-300 text-xs font-semibold max-w-[120px] truncate">
                {user.displayName || "User"}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace container */}
      <main className="flex-grow pb-4">
        {selectedPool ? (
          <PoolDetail
            pool={selectedPool}
            user={user}
            onBack={() => setSelectedPool(null)}
          />
        ) : (
          <PoolSelector
            user={user}
            onSelectPool={(pool) => setSelectedPool(pool)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#113a4b]/40 bg-[#041014]/40 text-center py-2 text-teal-800 text-xs font-mono">
        Conch Predictor Series • Predictions & Standings
      </footer>
    </div>
  );
}
