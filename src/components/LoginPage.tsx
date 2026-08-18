import React, { useState } from "react";
import { Trophy, Shield, Heart, Compass, Award } from "lucide-react";
import { useAuth } from "../lib/auth";
import Logo from "./Logo";

type FormMode = "signin" | "signup";

// Firebase Auth error codes → messages a player can act on. Returning ""
// means "not worth showing" (e.g. the user closed the Google popup).
function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists — try signing in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts — wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    default:
      console.error("Sign-in error", err);
      return "Something went wrong. Please try again.";
  }
}

const inputClasses =
  "w-full px-4 py-2.5 bg-[#09222c]/80 border border-[#113a4b] rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/40 transition-colors";

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<FormMode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => run(() => signInWithGoogle());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() =>
      mode === "signin"
        ? signInWithEmail(email, password)
        : signUpWithEmail(email, password, displayName)
    );
  };

  const handlePasswordReset = () => {
    if (!email) {
      setError("Enter your email above first, then tap “Forgot password?”");
      return;
    }
    run(async () => {
      await sendPasswordReset(email);
      setNotice(`Password reset email sent to ${email}.`);
    });
  };

  const switchMode = (next: FormMode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  return (
    <div className="min-h-screen bg-[#061217] flex flex-col justify-between relative overflow-hidden">
      {/* Subtle decorative stadium grid background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,165,185,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,165,185,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Hero + sign-in */}
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-6">
              <Logo size={84} variant="full" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 font-display leading-tight">
              Predict the NFL.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Prove You're the Best.</span>
            </h1>
            <p className="text-teal-200/70 text-base sm:text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Rub the magic conch and compete against your friends! Build private pools, pick division winners, awards, super bowl champions, and over/under win totals.
            </p>

            <div className="max-w-md mx-auto lg:mx-0 text-left">
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold rounded-2xl shadow-[0_0_40px_-10px_rgba(20,184,166,0.4)] transform hover:-translate-y-0.5 transition-all cursor-pointer text-base disabled:opacity-60 disabled:cursor-default disabled:transform-none"
              >
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-grow bg-[#113a4b]/70"></div>
                <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">or use email</span>
                <div className="h-px flex-grow bg-[#113a4b]/70"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "signup" && (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name (shown in standings)"
                    autoComplete="name"
                    className={inputClasses}
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                  className={inputClasses}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  className={inputClasses}
                />

                {error && (
                  <p className="text-rose-400 text-xs leading-relaxed">{error}</p>
                )}
                {notice && (
                  <p className="text-teal-300 text-xs leading-relaxed">{notice}</p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full px-8 py-2.5 bg-[#0b2f3c] hover:bg-[#0e3a4a] text-teal-200 font-bold rounded-xl border border-[#113a4b] hover:border-teal-500/40 transition-colors cursor-pointer text-sm disabled:opacity-60 disabled:cursor-default"
                >
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </button>
              </form>

              <div className="flex items-center justify-between mt-3 text-xs">
                {mode === "signin" ? (
                  <>
                    <button
                      onClick={() => switchMode("signup")}
                      className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                    >
                      New here? Create an account
                    </button>
                    <button
                      onClick={handlePasswordReset}
                      disabled={busy}
                      className="text-slate-500 hover:text-slate-400 cursor-pointer disabled:opacity-60"
                    >
                      Forgot password?
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => switchMode("signin")}
                    className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Visuals Bento Box (Hidden on mobile) */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-5 relative z-10">
              <div className="space-y-5">
                <div className="bg-[#09222c]/80 backdrop-blur-md border border-[#113a4b]/80 rounded-3xl p-6 shadow-2xl transform translate-y-8 hover:-translate-y-2 transition-transform duration-500">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-5 border border-amber-500/30">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Major Awards</h3>
                  <p className="text-teal-100/60 text-xs leading-relaxed">Predict MVP, OPOY, DPOY, and Rookie of the Year candidates.</p>
                </div>
                <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-xl transform translate-y-8 hover:-translate-y-2 transition-transform duration-500 delay-100">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-5 border border-indigo-500/30">
                    <Compass className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Division Winners</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Lock in the kings of the North, South, East, and West.</p>
                </div>
              </div>
              <div className="space-y-5">
                <div className="bg-[#09222c]/80 backdrop-blur-md border border-teal-500/30 rounded-3xl p-6 shadow-2xl hover:-translate-y-2 transition-transform duration-500 delay-75">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-5 border border-emerald-500/30">
                    <Award className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Live Standings</h3>
                  <p className="text-teal-100/60 text-xs leading-relaxed">Track your group's points live as the NFL season progresses.</p>
                </div>
                <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-xl hover:-translate-y-2 transition-transform duration-500 delay-150">
                  <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-5 border border-rose-500/30">
                    <Heart className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Over / Unders</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Analyze the lines and call the win totals for every team.</p>
                </div>
              </div>
            </div>

            {/* Glow backing */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-teal-500/20 to-cyan-500/10 blur-[100px] -z-10 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Humble and minimalist football card footer */}
      <footer className="text-center py-2 text-teal-800 text-xs font-mono">
        Conch Predictor Series • UTC 2026
      </footer>
    </div>
  );
}
