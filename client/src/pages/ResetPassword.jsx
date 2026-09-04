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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium tracking-wider text-black dark:text-white logofont">
            Campus<span className="text-brand-600">Node</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Reset your password
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-black dark:text-white text-center">
            Set New Password
          </h2>
          <p className="mt-1 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Please enter your new password below
          </p>

          {/* Role Toggle */}
          {/* <div className="flex justify-center mt-6 mb-6">
            <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-800 overflow-hidden p-1 bg-neutral-50 dark:bg-neutral-950">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  role === 'student'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('club')}
                className={`px-5 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  role === 'club'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                Club Head
              </button>
            </div>
          </div> */}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
            <div>
              <label className="block text-[13px] font-semibold  tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-neutral-400"
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
              <label className="block text-[13px] font-semibold  tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-neutral-400"
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

          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <Link
              to="/login"
              className="text-sm font-semibold text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-500 transition-colors"
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
