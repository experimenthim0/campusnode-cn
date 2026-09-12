import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, Sparkles, Lock, ArrowRight, ShieldCheck, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resendVerificationEmail } from '../services/authService';

const STUDENT_FAILURE_MESSAGES = [
  {
    title: "Wrong Password Again?",
    body: "Was the password your crush's birthday? Because clearly, it's not working out. 💔",
    hint: "Double check your spelling or use 'Forgot password?'"
  },
  {
    title: "Midterm Flashbacks?",
    body: "You're forgetting this password just like Chapter 4 during the end-sem exams. 📚",
    hint: "Don't guess blindly — take a quick breath."
  },
  {
    title: "Ex's Nickname Detected?",
    body: "Still trying your ex's nickname? It didn't work then, and it's definitely not working now. 💀",
    hint: "Time to let it go and reset the password."
  },
  {
    title: "3 AM Sleep Deprivation",
    body: "That late-night Maggi and 2 hours of sleep are finally taking their toll on your memory. 🍜",
    hint: "Type slowly, check your Caps Lock."
  },
  {
    title: "Viva Exam Strategy?",
    body: "Typing random passwords with the exact same confidence as an unprepared external viva. 📝",
    hint: "Multiple failed attempts might trigger the rate limiter."
  },
  {
    title: "8:30 AM Monday Energy",
    body: "Struggling to remember this password harder than making it to the 75% attendance threshold. ⏰",
    hint: "Take a second to verify before hitting Sign In again."
  },
  {
    title: "Left on Seen?",
    body: "Entering wrong passwords faster than your crush leaves you on 'Delivered'. 📱",
    hint: "Hit 'Forgot password?' to get back in quickly."
  }
];

const Login = () => {
  const { login, verify2FA: authVerify2FA } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'
  const [resendMsg, setResendMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (needsVerification) setNeedsVerification(false);
  };

  const handleResendVerification = async () => {
    const targetEmail = verificationEmail || formData.email;
    if (!targetEmail) return;
    setResendStatus('sending');
    try {
      const res = await resendVerificationEmail(targetEmail);
      setResendStatus('sent');
      setResendMsg(res.data?.message || 'Verification email resent! Please check your inbox.');
    } catch (err) {
      setResendStatus('error');
      setResendMsg(err.response?.data?.message || 'Failed to resend verification email.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setNeedsVerification(false);
    setResendStatus('');
    setResendMsg('');
    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      setFailedAttempts(0);

      if (result?.needs2FA) {
        setShowOTP(true);
        setError('');
      }
      // Navigation is handled by AuthContext
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setNeedsVerification(true);
        setVerificationEmail(err.response?.data?.email || formData.email);
        setError(err.response?.data?.message || 'Please verify your email before logging in.');
      } else {
        setFailedAttempts((prev) => prev + 1);
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authVerify2FA(formData.email, otp);
      setFailedAttempts(0);
      // Navigation is handled by AuthContext
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white text-sm font-medium outline-none focus:border-cn-blue-500 focus:ring-2 focus:ring-cn-blue-500/20 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500";

  return (
    <div className="mysans min-h-[80vh] bg-cn-surface-elevated dark:bg-cn-bg text-zinc-900 dark:text-white relative overflow-hidden transition-colors duration-300 flex flex-col items-center justify-center px-4 py-10 sm:px-6">
      {/* ── Background Ambient Atmosphere ── */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[650px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(234, 88, 12, 0.14) 0%, rgba(59, 130, 246, 0.06) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10">
        
        {/* Frosted Glass Login Card */}
        <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-6 sm:p-8 relative overflow-hidden flex flex-col">
          
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/50 border border-cn-blue-200/60 dark:border-cn-blue-800/60 text-cn-blue-600 dark:text-cn-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CampusNode NITJ</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Sign in to manage clubs, events, and campus updates.
            </p>
          </div>

          {!showOTP ? (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Dedicated Email Verification Required Banner */}
              {needsVerification && (
                <div className="p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl text-zinc-900 dark:text-white text-xs flex flex-col gap-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <strong className="block font-semibold text-xs text-amber-950 dark:text-amber-200">
                        Email Verification Required
                      </strong>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                        {error || "Please verify your email address before logging in."}
                      </p>
                    </div>
                  </div>

                  {resendStatus === 'sent' ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{resendMsg}</span>
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Didn't receive the link?</span>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendStatus === 'sending'}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {resendStatus === 'sending' ? 'Sending link...' : 'Resend verification email'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Humorous failure message after 2 failed attempts (only if not verification error) */}
              {!needsVerification && failedAttempts >= 2 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="block font-semibold text-xs text-amber-950 dark:text-amber-100">
                        {STUDENT_FAILURE_MESSAGES[(failedAttempts - 2) % STUDENT_FAILURE_MESSAGES.length].title}
                      </strong>
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        Attempt {failedAttempts}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed font-normal">
                      {STUDENT_FAILURE_MESSAGES[(failedAttempts - 2) % STUDENT_FAILURE_MESSAGES.length].body}
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 italic pt-0.5">
                      💡 {STUDENT_FAILURE_MESSAGES[(failedAttempts - 2) % STUDENT_FAILURE_MESSAGES.length].hint}
                    </p>
                  </div>
                </div>
              )}

              {/* Standard error for 1st failed attempt */}
              {!needsVerification && error && failedAttempts < 2 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl text-center">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className={inputCls}
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300 hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 2FA OTP Form */
            <form className="flex flex-col gap-5" onSubmit={handleVerifyOTP}>
              <div className="text-center mb-2">
                <div className="w-10 h-10 rounded-2xl bg-cn-blue-500/10 text-cn-blue-600 dark:text-cn-blue-400 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">2-Step Verification</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Enter the 6-digit code sent to your email.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl text-center">
                  {error}
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`${inputCls} text-center text-2xl tracking-[0.3em] font-mono`}
                />
              </div>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOTP(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200/80 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white/90 dark:bg-zinc-900/90 text-zinc-400 dark:text-zinc-500">
                New student?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-5 flex justify-center">
            <Link
              to="/register"
              className="w-full text-center py-2.5 px-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs hover:border-cn-blue-500 dark:hover:border-cn-blue-500 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 bg-white/50 dark:bg-zinc-800/40 transition-all cursor-pointer"
            >
              Register as Student
            </Link>
          </div>

          {/* Admin Login Link */}
          <Link
            to="/admin-secret-login"
            className="mt-5 text-xs text-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Login to Admin Portal
          </Link>

        </div>
      </div>
    </div>
  );
};

export default Login;
