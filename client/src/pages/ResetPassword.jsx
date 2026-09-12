import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { resetPassword as resetPasswordApi } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return showNotification('Passwords do not match', 'error');
    }
    if (password.length < 6) {
      return showNotification('Password must be at least 6 characters', 'error');
    }

    setLoading(true);
    try {
      const res = await resetPasswordApi(token, password);
      showNotification(res.data.message, 'success');
      navigate('/login');

    } catch (err) {
      showNotification(err.response?.data?.message || 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cn-bg text-cn-text flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-wider text-cn-text logofont">
            Campus<span className="text-brand-600">Node</span>
          </h1>
          <p className="text-sm text-cn-text-muted mt-1">
            Reset your password
          </p>
        </div>

        <div className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-cn-text text-center">
            Set New Password
          </h2>
          <p className="mt-1 text-center text-sm text-cn-text-muted">
            Please enter your new password below
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
            <div>
              <label className="block text-[13px] font-semibold  tracking-wider text-cn-text-muted mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-cn-border rounded-xl bg-cn-surface text-cn-text text-sm font-medium outline-none focus:border-cn-blue-500 focus:ring-1 focus:ring-cn-blue-500/20 transition-all placeholder:text-neutral-400"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthChecker password={password} />
            </div>

            <div>
              <label className="block text-[13px] font-semibold  tracking-wider text-cn-text-muted mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-cn-border rounded-xl bg-cn-surface text-cn-text text-sm font-medium outline-none focus:border-cn-blue-500 focus:ring-1 focus:ring-cn-blue-500/20 transition-all placeholder:text-neutral-400"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all ${
                loading
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 cursor-pointer hover:-translate-y-0.5 shadow-sm'
              }`}
            >
              {loading ? 'Resetting Password...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-cn-border-subtle text-center">
            <Link
              to="/login"
              className="text-sm font-semibold text-cn-text-muted hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
