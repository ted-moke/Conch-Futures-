import React, { useState, useEffect } from "react";
import { ArrowLeft, Award, Users, Save, Sparkles, Settings, Copy, Check, Share2, RefreshCw, Search, History, Clock, Timer, CircleDollarSign } from "lucide-react";
import { Pool, Picks } from "../types";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AuthUser } from "../lib/auth";
import StandingsTab from "./StandingsTab";
import PicksTab from "./PicksTab";
import ComparePicksTab from "./ComparePicksTab";
import AdminTab from "./AdminTab";
import LastYearResultsTab from "./LastYearResultsTab";
import { fetchNflStandings, TeamStandingInfo } from "../lib/nflApi";
import { FUTURES_QUESTIONS } from "../constants";

interface PoolDetailProps {
  pool: Pool;
  user: AuthUser;
  onBack: () => void;
}

type TabType = "standings" | "my_picks" | "compare" | "admin" | "last_year";

export function getAppShareUrl(code: string): string {
  const defaultPublicUrl = "https://ais-pre-xfiomcrem6vpcrlcdoi546-387114323884.us-east1.run.app";
  
  if (typeof window === "undefined") {
    return `${defaultPublicUrl}/?join=${code}`;
  }

  const hostname = window.location.hostname;
  const origin = window.location.origin;

  const isInternalOrDev =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".google.com") ||
    hostname.endsWith(".googleusercontent.com") ||
    hostname.endsWith("ai.studio") ||
    hostname.includes("ais-dev");

  const baseUrl = isInternalOrDev ? defaultPublicUrl : origin;
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/?join=${code}`;
}

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference > 0) {
        return {
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        };
      }
      return null;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-400 mt-2 sm:mt-0">
        <Clock className="w-4 h-4 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Deadline Passed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700/60 rounded-md shadow-sm mt-2 sm:mt-0">
      <Timer className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex flex-col">
        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Pick Deadline</span>
        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400">
          {timeLeft.d > 0 && <span>{timeLeft.d}d</span>}
          <span>{timeLeft.h.toString().padStart(2, '0')}h</span>
          <span>{timeLeft.m.toString().padStart(2, '0')}m</span>
          <span>{timeLeft.s.toString().padStart(2, '0')}s</span>
        </div>
      </div>
    </div>
  );
};

export default function PoolDetail({ pool: initialPool, user, onBack }: PoolDetailProps) {
  const [pool, setPool] = useState<Pool>(initialPool);
  const [userPicks, setUserPicks] = useState<Picks | null>(null);
  const [loadingPicks, setLoadingPicks] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("standings");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Real-time NFL Standings from ESPN
  const [nflStandings, setNflStandings] = useState<Record<string, TeamStandingInfo> | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Subscribe to real-time pool document updates to capture results updates instantly
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "pools", initialPool.id), (docSnap) => {
      if (docSnap.exists()) {
        setPool({ id: docSnap.id, ...docSnap.data() } as Pool);
      }
    });
    return () => unsub();
  }, [initialPool.id]);

  // Fetch the current NFL team records from ESPN
  const loadStandingsData = async () => {
    setLoadingStandings(true);
    try {
      const data = await fetchNflStandings();
      setNflStandings(data);
    } catch (err) {
      console.warn("Failed to retrieve live NFL standings:", err);
    } finally {
      setLoadingStandings(false);
    }
  };

  useEffect(() => {
    loadStandingsData();
  }, []);

  // Fetch the current user's submitted picks inside this pool
  const fetchUserPicks = async () => {
    setLoadingPicks(true);
    try {
      const pickDocRef = doc(db, `pools/${initialPool.id}/picks`, user.uid);
      const pickDocSnap = await getDoc(pickDocRef);
      if (pickDocSnap.exists()) {
        setUserPicks({ id: pickDocSnap.id, ...pickDocSnap.data() } as any);
      } else {
        setUserPicks(null);
      }
    } catch (err) {
      console.error("Failed to load user picks", err);
    } finally {
      setLoadingPicks(false);
    }
  };

  useEffect(() => {
    fetchUserPicks();
  }, [pool.id, user.uid]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try modern asynchronous clipboard API first
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn("navigator.clipboard.writeText failed, trying selection fallback:", err);
      }
    }

    // Classic selection fallback (highly reliable in iframes or document focus issues)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Selection-based clipboard fallback failed:", err);
      return false;
    }
  };

  const handleCopyCode = async () => {
    const success = await copyToClipboard(pool.code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSharePool = async () => {
    const shareUrl = getAppShareUrl(pool.code);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my NFL Futures Pool: ${pool.name}`,
          text: `Join my Conch Predictor NFL Futures Pick'Em pool "${pool.name}" using the passcode ${pool.code}!`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // If share was cancelled or failed, fall back to copy
        console.log("Share API error or cancelled, falling back to copy", err);
      }
    }
    
    // Fallback: Robust Clipboard copy
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      console.error("Failed to copy link using all methods");
    }
  };

  const isCreator = pool.creatorId === user.uid;

  const totalQuestions = FUTURES_QUESTIONS.length;
  const completedPicksCount = userPicks?.selections 
    ? Object.keys(userPicks.selections).filter(k => !!userPicks.selections[k] && (!k.startsWith("standings_") || userPicks.selections[k].split(",").length === 4)).length 
    : 0;
  const isPicksComplete = completedPicksCount === totalQuestions && userPicks?.tiebreaker;

  return (
    <div className="max-w-7xl mx-auto py-1 px-2 sm:px-2">
      {/* Pool Header / Banner */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-2 shadow-lg mb-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Pools
        </button>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2.5">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <h1 className="text-2xl font-extrabold text-white">{pool.name}</h1>
              <CountdownTimer targetDate={pool.deadline?.toDate ? pool.deadline.toDate() : (pool.deadline ? new Date(pool.deadline) : new Date("2026-09-10T20:20:00-04:00"))} />
            </div>
            {pool.description && (
              <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
                {pool.description}
              </p>
            )}
            <p className="text-[11px] text-slate-500 font-mono mt-2">
              Created by {pool.creatorName}
            </p>
          </div>

          {/* Code and Invite panel */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900 border border-slate-700/40 p-2 rounded-xl shadow-inner w-full lg:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div>
                <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-500">
                  Friends Join Code
                </span>
                <span className="text-sm font-mono font-black text-emerald-400 tracking-wider">
                  {pool.code}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyCode}
                className="flex-1 sm:flex-none px-1.5 py-1 bg-slate-800 hover:bg-slate-755 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold min-w-[110px]"
                title="Copy Code"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">Copied Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleSharePool}
                className="flex-1 sm:flex-none px-1.5.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs min-w-[110px] shadow-sm shadow-emerald-500/10"
                title="Share Pool Invite Link"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-slate-950" />
                    <span className="text-[10px] font-black">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Pool</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* League Buy-In / Dues Banner */}
      {(pool.entryFee !== undefined || pool.duesNote) && (pool.entryFee || 0) > 0 && (
        <div className={`p-3 rounded-xl border mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          pool.payments?.[user.uid]?.paid
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
            : "bg-amber-950/40 border-amber-500/30 text-amber-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              pool.payments?.[user.uid]?.paid
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-amber-500/20 text-amber-400"
            }`}>
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs uppercase tracking-wider">
                  League Buy-In: ${pool.entryFee?.toFixed(2) || "0.00"}
                </span>
                {pool.payments?.[user.uid]?.paid ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> Dues Paid
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                    Payment Pending
                  </span>
                )}
              </div>
              {pool.duesNote && (
                <p className="text-xs text-slate-300 mt-0.5 font-medium">
                  Payment Instructions: <span className="text-white font-semibold">{pool.duesNote}</span>
                </p>
              )}
            </div>
          </div>
          {isCreator && (
            <button
              onClick={() => setActiveTab("admin")}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              Manage Dues &rarr;
            </button>
          )}
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-800 gap-1 sm:gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("standings")}
          className={`px-2 py-1.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "standings"
              ? "bg-slate-800 text-emerald-400 border-b-2 border-emerald-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" /> Standings
        </button>

        <button
          onClick={() => setActiveTab("my_picks")}
          className={`px-2 py-1.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "my_picks"
              ? "bg-slate-800 text-emerald-400 border-b-2 border-emerald-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Save className="w-4 h-4" /> My Picks
        </button>

        <button
          onClick={() => setActiveTab("compare")}
          className={`px-2 py-1.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "compare"
              ? "bg-slate-800 text-emerald-400 border-b-2 border-emerald-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" /> Compare Picks
        </button>

        <button
          onClick={() => setActiveTab("last_year")}
          className={`px-2 py-1.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "last_year"
              ? "bg-slate-800 text-indigo-400 border-b-2 border-indigo-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="w-4 h-4" /> Last Year
        </button>

        {isCreator && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-2 py-1.5 rounded-t-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "admin"
                ? "bg-slate-800 text-amber-400 border-b-2 border-amber-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" /> Admin Controls
          </button>
        )}
      </div>

      
      {activeTab === "standings" && !isPicksComplete && (
        <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 rounded-xl p-4 mb-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-emerald-400 font-extrabold text-lg flex items-center gap-2 mb-1">
              <Timer className="w-5 h-5" /> 
              Make Your Predictions!
            </h3>
            <p className="text-emerald-100/70 text-sm max-w-xl">
              You've completed <strong className="text-emerald-300">{completedPicksCount}</strong> of <strong className="text-emerald-300">{totalQuestions}</strong> picks. Lock in your future picks before kickoff!
            </p>
          </div>
          <button
            onClick={() => setActiveTab("my_picks")}
            className="w-full md:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Complete My Picks
          </button>
        </div>
      )}

      {activeTab !== "my_picks" && activeTab !== "admin" && activeTab !== "last_year" && (
      <div id="category-filter-bar" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-900 border border-slate-800 p-3 rounded-xl mb-2 shadow-inner">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Filter Futures:
        </span>
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "All Categories" },
            { id: "standings", label: "Divisions & O/U" },
            { id: "championship", label: "Championships" },
            { id: "award", label: "Player Awards" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-1.5 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400"
                  : "bg-slate-800/50 hover:bg-slate-800 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Tabs panels render */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 sm:p-2 min-h-[50vh] shadow-inner">
        {activeTab === "standings" && (
          <StandingsTab pool={pool} user={user} userPicks={userPicks} categoryFilter={categoryFilter} nflStandings={nflStandings || undefined} />
        )}

        {activeTab === "my_picks" && (
          loadingPicks ? (
            <div className="text-center py-12 text-slate-400">Loading your selections...</div>
          ) : (
            <PicksTab
              pool={pool}
              user={user}
              userPicks={userPicks}
              onPicksSaved={(newPicks) => setUserPicks(newPicks)}
              categoryFilter={categoryFilter}
              nflStandings={nflStandings || undefined}
            />
          )
        )}

        {activeTab === "compare" && <ComparePicksTab pool={pool} categoryFilter={categoryFilter} nflStandings={nflStandings || undefined} />}

        {activeTab === "last_year" && <LastYearResultsTab />}

        {activeTab === "admin" && isCreator && (
          <AdminTab
            pool={pool}
            onPoolUpdated={(updatedPool) => setPool(updatedPool)}
            categoryFilter={categoryFilter}
            nflStandings={nflStandings || undefined}
          />
        )}
      </div>
    </div>
  );
}
