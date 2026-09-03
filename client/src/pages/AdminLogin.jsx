import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

const STAGES = {
  STAGE_E: {
    title: "Final Countdown",
    emoji: "⏳",
    messages: [
      "This is the part where dramatic countdown music should start.",
      "Less than five minutes. Do not panic. The universe is almost ready.",
      "Your next login attempt is approaching. Use it wisely.",
      "The system is preparing for your comeback."
    ]
  },
  STAGE_D: {
    title: "You're Almost Back",
    emoji: "🌤️",
    messages: [
      "The system is beginning to trust the concept of another attempt.",
      "Almost there. Please resist the urge to refresh every three seconds.",
      "Your keyboard may soon return from its temporary vacation."
    ]
  },
  STAGE_C: {
    title: "Almost Halfway There",
    emoji: "⏱️",
    messages: [
      "Good news: you have survived a significant portion of the waiting period.",
      "Time is passing. The login button is still watching.",
      "Your patience level is currently being evaluated."
    ]
  },
  STAGE_B: {
    title: "Still on Cooldown",
    emoji: "☕",
    messages: [
      "We checked. The password is still protected.",
      "Refreshing is allowed. Unfortunately, it does not speed up time.",
      "The countdown is moving. Slowly. Just like every good suspense movie."
    ]
  },
  STAGE_A: {
    title: "Access Paused",
    emoji: "⏸️",
    messages: [
      "Three unsuccessful attempts in a row. This browser needs a short break from guessing.",
      "The password is not going to reveal itself under pressure. Try again later.",
      "Your keyboard has been temporarily put on probation."
    ]
  }
};

const REFRESH_NOTES = [
  "Yes, we checked again. The timer is still running.",
  "Welcome back. Unfortunately, time has not been hacked.",
  "Nice refresh. The countdown remains unconvinced.",
  "Closing the tab was a bold strategy. The timer survived.",
  "The lockout followed you back. Impressive persistence."
];

/**
 * Calculates dynamic lockout message based on remaining time and per-mount message seed.
 */
const getLockoutMessage = (remainingMs, totalLockoutMs, seed = 0) => {
  let stage;
  if (remainingMs < 5 * 60 * 1000) {
    stage = STAGES.STAGE_E;
  } else if (remainingMs < 0.25 * totalLockoutMs) {
    stage = STAGES.STAGE_D;
  } else if (remainingMs < 0.5 * totalLockoutMs) {
    stage = STAGES.STAGE_C;
  } else if (remainingMs < 0.75 * totalLockoutMs) {
    stage = STAGES.STAGE_B;
  } else {
    stage = STAGES.STAGE_A;
  }

  const index = Math.abs(seed) % stage.messages.length;
  return {
    title: stage.title,
    emoji: stage.emoji,
    message: stage.messages[index]
  };
};

const formatRemainingTime = (ms) => {
  if (ms <= 0) return '00m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Random seeds initialized once per page mount/refresh so messages change on refresh but stay stable during countdown
  const [messageSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [refreshSeed] = useState(() => Math.floor(Math.random() * 1000));

  const { adminLogin } = useAuth();
  const { showNotification } = useNotification();

  // Failed attempts in browser localStorage
  const [attempts, setAttempts] = useState(() => {
    try {
      return parseInt(localStorage.getItem('campusnode_admin_failed_attempts') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Lockout expiry timestamp
  const [lockoutExpiry, setLockoutExpiry] = useState(() => {
    try {
      return parseInt(localStorage.getItem('campusnode_admin_lockout_time') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [lockoutRemaining, setLockoutRemaining] = useState(() => {
    try {
      const lockoutUntil = parseInt(localStorage.getItem('campusnode_admin_lockout_time') || '0', 10);
      const now = Date.now();
      if (lockoutUntil > now) {
        return lockoutUntil - now;
      }
      return 0;
    } catch {
      return 0;
    }
  });

  // Refresh / Revisit detection during active lockout
  const [isRevisit, setIsRevisit] = useState(() => {
    try {
      const lockoutUntil = parseInt(localStorage.getItem('campusnode_admin_lockout_time') || '0', 10);
      if (lockoutUntil > Date.now()) {
        const seenKey = 'campusnode_admin_seen_lockout';
        const lastSeen = sessionStorage.getItem(seenKey);
        const remaining = lockoutUntil - Date.now();
        // If previously seen in this tab or remaining time is already ticking down (>2s elapsed)
        return lastSeen === String(lockoutUntil) || remaining < LOCKOUT_DURATION_MS - 2000;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    const lockoutUntil = parseInt(localStorage.getItem('campusnode_admin_lockout_time') || '0', 10);
    if (lockoutUntil > Date.now()) {
      try {
        const seenKey = 'campusnode_admin_seen_lockout';
        sessionStorage.setItem(seenKey, String(lockoutUntil));
      } catch {}
    }
  }, []);

  // Countdown timer for lockout duration
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const interval = setInterval(() => {
      try {
        const lockoutUntil = parseInt(localStorage.getItem('campusnode_admin_lockout_time') || '0', 10);
        const remaining = lockoutUntil - Date.now();

        if (remaining <= 0) {
          setLockoutRemaining(0);
          setLockoutExpiry(0);
          setAttempts(0);
          setError('');
          setIsRevisit(false);
          localStorage.removeItem('campusnode_admin_lockout_time');
          localStorage.removeItem('campusnode_admin_failed_attempts');
          try {
            sessionStorage.removeItem('campusnode_admin_seen_lockout');
          } catch {}
        } else {
          setLockoutRemaining(remaining);
        }
      } catch {
        setLockoutRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const isLockedOut = lockoutRemaining > 0;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLockedOut) return;

    setError('');
    setLoading(true);

    try {
      await adminLogin(email, password);
      // Reset attempts and lockout state on successful authentication
      localStorage.removeItem('campusnode_admin_failed_attempts');
      localStorage.removeItem('campusnode_admin_lockout_time');
      try {
        sessionStorage.removeItem('campusnode_admin_seen_lockout');
      } catch {}
      setAttempts(0);
      setLockoutExpiry(0);
      setLockoutRemaining(0);
      setIsRevisit(false);
      showNotification('Welcome back, Admin!', 'success');
      // Navigation is handled by AuthContext
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        const expiry = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem('campusnode_admin_lockout_time', String(expiry));
        localStorage.setItem('campusnode_admin_failed_attempts', String(newAttempts));
        try {
          sessionStorage.setItem('campusnode_admin_seen_lockout', String(expiry));
        } catch {}
        setLockoutExpiry(expiry);
        setLockoutRemaining(LOCKOUT_DURATION_MS);
        setIsRevisit(false);
        showNotification('Too many failed attempts. Access locked for 30 minutes.', 'error');
      } else {
        localStorage.setItem('campusnode_admin_failed_attempts', String(newAttempts));
        if (newAttempts === 2) {
          setError("That didn't work. Take a moment to check your password before trying again.");
        } else {
          setError(err.response?.data?.message || 'Invalid credentials.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900/20 dark:focus:ring-white/20 transition-all placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed";

  const lockoutInfo = isLockedOut
    ? getLockoutMessage(lockoutRemaining, LOCKOUT_DURATION_MS, messageSeed)
    : null;

  const refreshNote = isLockedOut && isRevisit
    ? REFRESH_NOTES[Math.abs(refreshSeed) % REFRESH_NOTES.length]
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none logofont">
            Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-2 flex items-center justify-center gap-1.5">
            <ShieldAlert size={14} className="text-neutral-900 dark:text-white" />
            <span>Admin Portal</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col transition-colors">
          
          {/* Lockout Screen */}
          {isLockedOut && lockoutInfo ? (
            <div className="py-2 px-1 text-center space-y-4 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-2xl mx-auto shadow-2xs">
                {lockoutInfo.emoji}
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white tracking-tight">
                  {lockoutInfo.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                  {lockoutInfo.message}
                </p>
                {isRevisit && refreshNote && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 italic pt-1">
                    "{refreshNote}"
                  </p>
                )}
              </div>

              <div className="py-2.5 px-5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl inline-flex flex-col items-center justify-center shadow-2xs">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Time Remaining
                </span>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white mt-0.5">
                  {formatRemainingTime(lockoutRemaining)}
                </span>
              </div>
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              {/* Attempt 2 Warning */}
              {attempts === 2 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <strong className="block font-semibold text-xs text-amber-950 dark:text-amber-100">
                      One attempt left
                    </strong>
                    <p className="text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed font-normal">
                      That didn't work. Take a moment to check your password before trying again.
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 italic">
                      No pressure. Well... a little pressure.
                    </p>
                  </div>
                </div>
              )}

              {/* Standard Error (attempt 1 or other errors) */}
              {error && attempts !== 2 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium text-center rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                  Admin Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  disabled={isLockedOut || loading}
                  className={inputCls}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Password
                  </label>
                  {attempts > 0 && !isLockedOut && (
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      Attempt {attempts} of {MAX_ATTEMPTS}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                    disabled={isLockedOut || loading}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLockedOut || loading}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer focus:outline-none disabled:opacity-40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isLockedOut}
                className="w-full py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-all mt-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {loading ? 'Authenticating...' : 'Go to Dashboard'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-neutral-900 text-neutral-400 text-xs">Navigation</span>
            </div>
          </div>

          {/* Return to Student Login */}
          <div className="mt-6 flex justify-center">
            <Link
              to="/login"
              className="w-full text-center py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-black dark:text-white font-semibold text-sm hover:border-neutral-900 dark:hover:border-white transition-all"
            >
              Back to Student Login
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500 mt-6 font-bold uppercase tracking-widest">
          Authorized personnel only. All access attempts are logged.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;

