import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login, verify2FA: authVerify2FA } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);

      if (result.needs2FA) {
        setShowOTP(true);
        setError('');
      }
      // Navigation is handled by AuthContext
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
      // Navigation is handled by AuthContext
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400";

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none logofont">
            Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
          </span>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Sign in to your account
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col ">

          {!showOTP ? (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium text-center rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
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

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-orange-600 hover:text-orange-700 font-medium">
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
                    placeholder="Enter your password"
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all mt-1 ${isLoading
                    ? 'bg-neutral-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 cursor-pointer hover:-translate-y-0.5'
                  }`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleVerifyOTP}>
              <div className="text-center mb-2">
                <h3 className="text-lg font-bold text-black dark:text-white">2-Step Verification</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Enter the 6-digit code sent to your email.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium text-center rounded-xl">
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
                  className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all ${isLoading
                      ? 'bg-neutral-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 cursor-pointer'
                    }`}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOTP(false)}
                  className="text-sm text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-neutral-900 text-neutral-400 text-xs">New student?</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 flex justify-center">
            <Link
              to="/register"
              className="w-full text-center py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-black dark:text-white font-semibold text-sm hover:border-orange-500 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500 transition-all"
            >
              Register as Student
            </Link>
          </div>

          <Link
            to="/admin-secret-login"
            className="mt-6 text-sm text-center text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            Login to Admin Portal
          </Link>

        </div>
      </div>
    </div>
  );
};

export default Login;
