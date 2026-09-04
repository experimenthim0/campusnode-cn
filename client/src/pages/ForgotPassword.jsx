import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { forgotPassword as forgotPasswordApi } from '../services/authService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await forgotPasswordApi(email);
      setMessage(res.data.message);
      showNotification(res.data.message, 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-black dark:text-white">
            Campus<span className="text-brand-600">Node</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Reset your account password
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-black dark:text-white text-center">
            Forgot Password
          </h2>
          <p className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Enter your registered email address and we'll send you a password reset link
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Registered Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-neutral-400"
                placeholder="you@nitj.ac.in or club@domain.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all ${
                loading
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 cursor-pointer hover:-translate-y-0.5'
              }`}
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div className="mt-5 p-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 text-brand-700 dark:text-brand-400 text-sm font-medium text-center rounded-xl">
              {message}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <Link
              to="/login"
              className="text-sm font-semibold text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-500 transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
