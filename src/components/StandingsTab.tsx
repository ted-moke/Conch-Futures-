import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AuthUser } from "../lib/auth";
import { FUTURES_QUESTIONS, NFL_WIN_TOTALS } from "../constants";
import { Pool, Picks, StandingRow } from "../types";
import { Medal, Check, X, ShieldAlert, Award, AlertCircle, RefreshCw, Crown, TrendingUp, Users } from "lucide-react";
import { TeamStandingInfo } from "../lib/nflApi";

interface StandingsTabProps {
  pool: Pool;
  user: AuthUser;
  userPicks: Picks | null;
  categoryFilter?: string;
  nflStandings?: Record<string, TeamStandingInfo>;
}

export default function StandingsTab({ pool, user, userPicks, categoryFilter = "all", nflStandings }: StandingsTabProps) {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<StandingRow | null>(null);

  const getPoints = (qId: string, defaultPoints: number) => {
    return pool.customPoints?.[qId] !== undefined ? pool.customPoints[qId] : defaultPoints;
  };

  // Filter questions by active list configured in this pool
  const activeQuestionsList = FUTURES_QUESTIONS.filter(
    (q) => !pool.activeQuestions || pool.activeQuestions.includes(q.id)
  );

  const totalPlayers = standings.length;
  const topScore = totalPlayers > 0 ? standings[0].score : 0;
  const leadersList = standings.filter((s) => s.score === topScore);
  const averageScore = totalPlayers > 0
    ? (standings.reduce((acc, row) => acc + row.score, 0) / totalPlayers).toFixed(1)
    : "0";

  const fetchStandings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all picks documents in `/pools/{poolId}/picks`
      const picksRef = collection(db, `pools/${pool.id}/picks`);
      const picksSnap = await getDocs(picksRef);
      const allPicks: Picks[] = [];
      picksSnap.forEach((doc) => {
        allPicks.push({ id: doc.id, ...doc.data() } as any);
      });

      // Calculate score for each pick document
      const results = pool.results || {};
      const rows: StandingRow[] = allPicks.map((pick) => {
        let score = 0;
        let correctCount = 0;
        const totalPicks = activeQuestionsList.length;

        activeQuestionsList.forEach((q) => {
          const userPick = pick.selections[q.id];
          let officialWinner = results[q.id];

          // DYNAMIC SCORING: If no official winner, calculate it from live NFL standings
          if (!officialWinner && nflStandings && Object.keys(nflStandings).length > 0) {
            if (q.category === "division") {
              const leadingTeam = q.options.find(opt => nflStandings[opt.value]?.divisionStanding === 1);
              if (leadingTeam) officialWinner = leadingTeam.value;
            } else if (q.category === "standings") {
              const sorted = [...q.options].sort((a, b) => {
                const sA = nflStandings[a.value]?.divisionStanding || 99;
                const sB = nflStandings[b.value]?.divisionStanding || 99;
                return sA - sB;
              });
              officialWinner = sorted.map(t => t.value).join(",");
            } else if (q.category === "over_under") {
              const teamValue = q.id.split('_')[1]?.toUpperCase();
              if (teamValue && nflStandings[teamValue]) {
                const stats = nflStandings[teamValue];
                const totalGames = stats.wins + stats.losses + stats.ties;
                if (totalGames > 0) {
                  const pace = (stats.wins / totalGames) * 17;
                  const line = NFL_WIN_TOTALS[teamValue] || 8.5;
                  if (pace > line) officialWinner = "OVER";
                  else if (pace < line) officialWinner = "UNDER";
                }
              }
            }
          }

          if (userPick && officialWinner) {
            if (q.category === "standings") {
              const userParts = userPick.split(",");
              const officialParts = officialWinner.split(",");
              let matches = 0;
              for (let i = 0; i < 4; i++) {
                if (userParts[i] && officialParts[i] && userParts[i] === officialParts[i]) {
                  matches += 1;
                }
              }
              if (matches > 0) {
                score += matches * (getPoints(q.id, q.points) / 4);
                if (matches === 4) {
                  score += 10; // Bonus for exact order
                }
                correctCount += matches / 4;
              }
            } else if (userPick?.toString().toUpperCase() === officialWinner?.toString().toUpperCase()) {
              score += getPoints(q.id, q.points);
              correctCount += 1;
            }
          }
        });

        let tiebreakerDiff: number | undefined;
        if (pool.tiebreakerResult && pick.tiebreaker) {
          tiebreakerDiff = Math.abs(Number(pick.tiebreaker) - Number(pool.tiebreakerResult));
        }

        return {
          userId: pick.userId,
          userDisplayName: pick.userDisplayName || "Anonymous Player",
          userPhotoURL: pick.userPhotoURL,
          score,
          correctCount,
          totalPicks,
          picks: pick.selections,
          tiebreaker: pick.tiebreaker,
          tiebreakerDiff,
        };
      });

      // Sort by score DESC, then correct count DESC, then tiebreaker diff ASC, then alphabetically by name
      rows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        if (a.tiebreakerDiff !== undefined && b.tiebreakerDiff !== undefined) {
           if (a.tiebreakerDiff !== b.tiebreakerDiff) return a.tiebreakerDiff - b.tiebreakerDiff;
        } else if (a.tiebreakerDiff !== undefined) {
           return -1; // a has tiebreaker, b doesn't
        } else if (b.tiebreakerDiff !== undefined) {
           return 1; // b has tiebreaker, a doesn't
        }
        return a.userDisplayName.localeCompare(b.userDisplayName);
      });

      setStandings(rows);
    } catch (err) {
      console.error(err);
      setError("Failed to compile pool standings. Try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [pool]);

  const getRankBadge = (index: number) => {
    if (index === 0) return <span className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 font-bold border border-amber-500/25 flex items-center gap-1 text-xs"><Medal className="w-3.5 h-3.5" /> 1st</span>;
    if (index === 1) return <span className="p-1.5 bg-slate-300/10 rounded-lg text-slate-300 font-bold border border-slate-300/25 flex items-center gap-1 text-xs"><Medal className="w-3.5 h-3.5" /> 2nd</span>;
    if (index === 2) return <span className="p-1.5 bg-amber-700/10 rounded-lg text-amber-700 font-bold border border-amber-700/25 flex items-center gap-1 text-xs"><Medal className="w-3.5 h-3.5" /> 3rd</span>;
    return <span className="text-xs text-slate-500 font-mono pl-2">{index + 1}th</span>;
  };

  const officialResultsCount = Object.keys(pool.results || {}).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 items-start">
      {/* Standings List (Left 2 columns) */}
      <div className="lg:col-span-2 space-y-2">
        <div className="flex justify-between items-center pb-1 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" /> Leaderboard
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Scores are dynamically calculated using real-time NFL standings{officialResultsCount > 0 ? `, supplemented by ${officialResultsCount} manual admin results.` : "."}
            </p>
          </div>
          <button
            onClick={fetchStandings}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-slate-800/40 animate-pulse rounded-xl border border-slate-800"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-rose-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : standings.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 text-center text-slate-400 text-sm">
            No entries submitted picks yet. Be the first!
          </div>
        ) : (
          <div className="space-y-3">
            {/* KPI metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Leader Card */}
              <div
                id="leaderboard-kpi-leader-card"
                className="bg-slate-850 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-grow">
                  <span className="block text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                    Current Leader
                  </span>
                  <span className="block font-extrabold text-white text-sm truncate">
                    {leadersList.map((l) => l.userDisplayName).join(", ")}
                  </span>
                  <span className="block text-xs font-semibold text-amber-400 font-mono mt-0.5">
                    {topScore} PTS
                  </span>
                </div>
              </div>

              {/* Average Score Card */}
              <div
                id="leaderboard-kpi-avg-score-card"
                className="bg-slate-850 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                    Average Score
                  </span>
                  <span className="block font-extrabold text-white text-sm">
                    {averageScore} PTS
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    Across pool players
                  </span>
                </div>
              </div>

              {/* Participation Card */}
              <div
                id="leaderboard-kpi-participation-card"
                className="bg-slate-850 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                    Total Players
                  </span>
                  <span className="block font-extrabold text-white text-sm">
                    {totalPlayers} Participant{totalPlayers !== 1 ? "s" : ""}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    Submitted predictions
                  </span>
                </div>
              </div>
            </div>

            {/* Players List */}
            <div id="leaderboard-players-list" className="space-y-2.5">
              {standings.map((row, index) => {
                const isCurrentUser = row.userId === user.uid;
                const isSelected = selectedUser?.userId === row.userId;

                return (
                  <div
                    key={row.userId}
                    onClick={() => setSelectedUser(isSelected ? null : row)}
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : isCurrentUser
                        ? "bg-slate-800 border-slate-700/80 hover:bg-slate-700/60"
                        : "bg-slate-850 hover:bg-slate-800/80 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-12 flex justify-start">{getRankBadge(index)}</div>
                      
                      {row.userPhotoURL ? (
                        <img
                          src={row.userPhotoURL}
                          alt={row.userDisplayName}
                          className="w-8 h-8 rounded-full border border-slate-700 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 flex-shrink-0 uppercase">
                          {row.userDisplayName.substr(0, 2)}
                        </div>
                      )}

                      <div className="truncate">
                        <span className="font-bold text-white text-sm block sm:inline truncate">
                          {row.userDisplayName}
                        </span>
                        {isCurrentUser && (
                          <span className="ml-0 sm:ml-2 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                            You
                          </span>
                        )}
                        {(pool.entryFee || 0) > 0 && (
                          <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                            pool.payments?.[row.userId]?.paid
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400/80 border-amber-500/20"
                          }`}>
                            {pool.payments?.[row.userId]?.paid ? "✓ Paid" : "Unpaid"}
                          </span>
                        )}
                        <span className="sm:hidden block text-[10px] text-slate-400 mt-0.5">
                          {row.correctCount} correct • {Object.keys(row.picks).length} made
                        </span>
                      </div>
                    </div>

                    {/* Desktop Status counters */}
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end border-t border-slate-800/60 sm:border-t-0 pt-2 sm:pt-0">
                      <div className="hidden sm:block text-right">
                        <span className="text-slate-400 text-[11px] block">CORRECT PICKS</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {row.correctCount} / {row.totalPicks}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] sm:text-[11px] block">TOTAL POINTS</span>
                        <span className="text-lg font-mono font-extrabold text-emerald-400">
                          {row.score} <span className="text-[10px] font-semibold text-slate-500 uppercase">PTS</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Picks Comparison (Right 1 column) */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 pb-1 border-b border-slate-800">
          <ShieldAlert className="w-5 h-5 text-emerald-400" /> Predictions Detail
        </h2>

        {selectedUser ? (
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-3 shadow-xl space-y-2 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center gap-2.5 pb-1 border-b border-slate-700">
              {selectedUser.userPhotoURL ? (
                <img
                  src={selectedUser.userPhotoURL}
                  alt={selectedUser.userDisplayName}
                  className="w-10 h-10 rounded-full border border-slate-600"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                  {selectedUser.userDisplayName.substr(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-white text-base leading-tight">
                  {selectedUser.userDisplayName}
                </h3>
                <span className="text-xs text-emerald-400 font-bold">
                  {selectedUser.score} Points • {selectedUser.correctCount} Correct
                </span>
              </div>
            </div>

            <div className="space-y-3.5 animate-fadeIn">
              {activeQuestionsList.filter((q) => categoryFilter === "all" || q.category === categoryFilter || (categoryFilter === "standings" && q.category === "over_under")).map((q) => {
                const userPick = selectedUser.picks[q.id];
                let officialWinner = pool.results?.[q.id];
                let isDynamic = false;
                if (!officialWinner && nflStandings && Object.keys(nflStandings).length > 0) {
                  isDynamic = true;
                  if (q.category === "division") {
                    const leadingTeam = q.options.find(opt => nflStandings[opt.value]?.divisionStanding === 1);
                    if (leadingTeam) officialWinner = leadingTeam.value;
                  } else if (q.category === "standings") {
                    const sorted = [...q.options].sort((a, b) => {
                      const sA = nflStandings[a.value]?.divisionStanding || 99;
                      const sB = nflStandings[b.value]?.divisionStanding || 99;
                      return sA - sB;
                    });
                    officialWinner = sorted.map(t => t.value).join(",");
                  } else if (q.category === "over_under") {
                    const teamValue = q.id.split('_')[1]?.toUpperCase();
                    if (teamValue && nflStandings[teamValue]) {
                      const stats = nflStandings[teamValue];
                      const totalGames = stats.wins + stats.losses + stats.ties;
                      if (totalGames > 0) {
                        const pace = (stats.wins / totalGames) * 17;
                        const line = NFL_WIN_TOTALS[teamValue] || 8.5;
                        if (pace > line) officialWinner = "OVER";
                        else if (pace < line) officialWinner = "UNDER";
                      }
                    }
                  }
                }
                
                let isCorrect = false;
                let pickLabel = "";
                let scoreText = "";

                if (q.category === "standings") {
                  if (userPick) {
                    const parts = userPick.split(",");
                    pickLabel = parts.map(t => {
                      const lbl = q.options.find(o => o.value === t)?.label.split(" ").pop() || t;
                      const std = nflStandings?.[t];
                      return std ? `${lbl} (${std.overallRecord})` : lbl;
                    }).join(" > ");
                    if (officialWinner) {
                      const officialParts = officialWinner.split(",");
                      let matches = 0;
                      for (let i = 0; i < 4; i++) {
                        if (parts[i] === officialParts[i]) matches += 1;
                      }
                      isCorrect = (matches === 4);
                      const basePts = matches * (getPoints(q.id, q.points) / 4);
                      const bonus = matches === 4 ? 10 : 0;
                      scoreText = `${matches}/4 correct (+${basePts}${bonus ? ` and +${bonus} bonus` : ''} pts)`;
                    }
                  } else {
                    pickLabel = "No prediction";
                  }
                } else {
                  isCorrect = userPick && officialWinner && userPick.toString().toUpperCase() === officialWinner.toString().toUpperCase();
                  const baseLabel = q.options.find((o) => o.value.toUpperCase() === userPick?.toUpperCase())?.label || "No pick";
                  let std = nflStandings?.[userPick];
                  if (q.category === "over_under") {
                    const teamValue = q.id.split('_')[1]?.toUpperCase();
                    std = nflStandings?.[teamValue];
                  }
                  pickLabel = std ? `${baseLabel} (${std.overallRecord})` : baseLabel;
                  if (officialWinner) {
                    scoreText = isCorrect ? `Correct (+${getPoints(q.id, q.points)} pts)` : `Incorrect (+0 pts)`;
                  }
                }

                return (
                  <div key={q.id} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/20 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[11px] font-bold text-slate-400 leading-tight">
                        {q.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0">
                        {getPoints(q.id, q.points)} pts
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2.5 pt-1">
                      <span className={`text-xs font-bold ${userPick ? "text-white" : "text-slate-600 italic"}`}>
                        {pickLabel}
                      </span>

                      {/* Score icon indicators */}
                      {officialWinner ? (
                        q.category === "standings" ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {scoreText}
                            </span>
                            {isCorrect ? (
                              <span className="p-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="p-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400">
                                <AlertCircle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        ) : isCorrect ? (
                          <span className="p-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                          TBD
                        </span>
                      )}
                    </div>

                    {officialWinner && !isCorrect && (
                      <div className="text-[10px] text-slate-400 bg-slate-950/40 rounded px-2 py-1 mt-1 border-l-2 border-amber-500">
                        {isDynamic ? "Projected" : "Official"}: <span className="font-semibold text-slate-200">
                          {q.category === "standings"
                            ? officialWinner.split(",").map(t => q.options.find(o => o.value === t)?.label.split(" ").pop() || t).join(" > ")
                            : (q.options.find((o) => o.value === officialWinner)?.label || officialWinner)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center text-slate-400 text-sm">
            <p>Click on any player in the leaderboard to analyze their predictions side-by-side with official results.</p>
          </div>
        )}
      </div>
    </div>
  );
}
