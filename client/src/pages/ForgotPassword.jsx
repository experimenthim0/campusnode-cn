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
    <div className="min-h-screen bg-cn-bg text-cn-text flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-cn-text">
            Campus<span className="text-brand-500 dark:text-brand-400">Node</span>
          </h1>
          <p className="text-sm text-cn-text-muted mt-1">
            Reset your account password
          </p>
        </div>

        <div className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-cn-text text-center">
            Forgot Password
          </h2>
          <p className="mt-1 text-center text-sm text-cn-text-muted mb-6">
            Enter your registered email address and we'll send you a password reset link
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-cn-text-muted mb-2">
                Registered Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-cn-border rounded-xl bg-cn-surface text-cn-text text-sm font-medium outline-none focus:border-cn-blue-500 focus:ring-1 focus:ring-cn-blue-500/20 transition-all placeholder:text-neutral-400"
                placeholder="you@nitj.ac.in or club@domain.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all ${loading
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 cursor-pointer hover:-translate-y-0.5'
                }`}
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div className="mt-5 p-3 bg-cn-blue-50 dark:bg-cn-blue-950/20 border border-cn-blue-200 dark:border-cn-blue-900/40 text-cn-blue-700 dark:text-cn-blue-400 text-sm font-medium text-center rounded-xl">
              {message}
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-cn-border-subtle text-center">
            <Link
              to="/login"
              className="text-sm font-semibold text-cn-text-muted hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors"
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
