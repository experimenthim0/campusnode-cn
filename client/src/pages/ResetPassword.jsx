import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [displayText, setDisplayText] = useState('');
  const [isTextRevealing, setIsTextRevealing] = useState(false);
  const revealIntervalRef = useRef(null);
  const revealTimeoutRef = useRef(null);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayConfirmText, setDisplayConfirmText] = useState('');
  const [isConfirmTextRevealing, setIsConfirmTextRevealing] = useState(false);
  const revealConfirmIntervalRef = useRef(null);
  const revealConfirmTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      if (revealConfirmIntervalRef.current) clearInterval(revealConfirmIntervalRef.current);
      if (revealConfirmTimeoutRef.current) clearTimeout(revealConfirmTimeoutRef.current);
    };
  }, []);

  const handleTogglePassword = () => {
    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
    if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);

    const nextState = !showPassword;
    setShowPassword(nextState);

    if (nextState && password && password.length > 0) {
      setIsTextRevealing(true);
      const len = password.length;
      const stepDuration = Math.min(55, Math.max(25, Math.floor(400 / len)));
      let currentStep = 0;

      setDisplayText('•'.repeat(len));

      revealIntervalRef.current = setInterval(() => {
        currentStep++;
        if (currentStep >= len) {
          clearInterval(revealIntervalRef.current);
          revealIntervalRef.current = null;
          setDisplayText('');
          revealTimeoutRef.current = setTimeout(() => {
            setIsTextRevealing(false);
          }, 150);
        } else {
          setDisplayText(password.slice(0, currentStep) + '•'.repeat(len - currentStep));
        }
      }, stepDuration);
    } else {
      setDisplayText('');
      setIsTextRevealing(false);
    }
  };

  const handleToggleConfirmPassword = () => {
    if (revealConfirmIntervalRef.current) clearInterval(revealConfirmIntervalRef.current);
    if (revealConfirmTimeoutRef.current) clearTimeout(revealConfirmTimeoutRef.current);

    const nextState = !showConfirmPassword;
    setShowConfirmPassword(nextState);

    if (nextState && confirmPassword && confirmPassword.length > 0) {
      setIsConfirmTextRevealing(true);
      const len = confirmPassword.length;
      const stepDuration = Math.min(55, Math.max(25, Math.floor(400 / len)));
      let currentStep = 0;

      setDisplayConfirmText('•'.repeat(len));

      revealConfirmIntervalRef.current = setInterval(() => {
        currentStep++;
        if (currentStep >= len) {
          clearInterval(revealConfirmIntervalRef.current);
          revealConfirmIntervalRef.current = null;
          setDisplayConfirmText('');
          revealConfirmTimeoutRef.current = setTimeout(() => {
            setIsConfirmTextRevealing(false);
          }, 150);
        } else {
          setDisplayConfirmText(confirmPassword.slice(0, currentStep) + '•'.repeat(len - currentStep));
        }
      }, stepDuration);
    } else {
      setDisplayConfirmText('');
      setIsConfirmTextRevealing(false);
    }
  };

  const handlePasswordChange = (val) => {
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    setIsTextRevealing(false);
    setDisplayText('');
    setPassword(val);
  };

  const handleConfirmPasswordChange = (val) => {
    if (revealConfirmIntervalRef.current) {
      clearInterval(revealConfirmIntervalRef.current);
      revealConfirmIntervalRef.current = null;
    }
    if (revealConfirmTimeoutRef.current) {
      clearTimeout(revealConfirmTimeoutRef.current);
      revealConfirmTimeoutRef.current = null;
    }
    setIsConfirmTextRevealing(false);
    setDisplayConfirmText('');
    setConfirmPassword(val);
  };

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
            Campusnode
          </h1>
          <p className="text-sm text-cn-text-muted mt-1">
            Reset your password
          </p>
        </div>

        <div className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-medium text-cn-text text-center">
            Set New Password
          </h2>
          <p className="mt-1 text-center text-sm text-cn-text-muted">
            Please enter your new password below
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
            <div>
              <label className="block text-[13px] font-medium  tracking-wider text-cn-text-muted mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={displayText !== '' ? displayText : password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full px-4 py-3 pr-11 border border-cn-border rounded-xl bg-cn-surface text-cn-text text-sm font-medium outline-none focus:border-cn-blue-500 focus:ring-1 focus:ring-cn-blue-500/20 transition-all placeholder:text-neutral-400"
                  placeholder="Enter new password"
                  style={{
                    textShadow: isTextRevealing
                      ? '0 0 8px rgba(0, 148, 255, 0.7), 0 0 2px rgba(0, 148, 255, 0.4)'
                      : 'none',
                    letterSpacing: isTextRevealing ? '0.04em' : 'normal',
                    transition: 'text-shadow 0.25s ease, letter-spacing 0.25s ease',
                  }}
                />
                <motion.button
                  type="button"
                  onClick={handleTogglePassword}
                  onMouseDown={(e) => e.preventDefault()}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                    showPassword
                      ? "text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300"
                      : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {showPassword ? (
                      <motion.span
                        key="eye-off"
                        initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 25 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex items-center justify-center"
                      >
                        <EyeOff size={18} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="eye"
                        initial={{ opacity: 0, scale: 0.5, rotate: 25 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: -25 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex items-center justify-center"
                      >
                        <Eye size={18} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
              <PasswordStrengthChecker password={password} />
            </div>

            <div>
              <label className="block text-[13px] font-medium  tracking-wider text-cn-text-muted mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={displayConfirmText !== '' ? displayConfirmText : confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className="w-full px-4 py-3 pr-11 border border-cn-border rounded-xl bg-cn-surface text-cn-text text-sm font-medium outline-none focus:border-cn-blue-500 focus:ring-1 focus:ring-cn-blue-500/20 transition-all placeholder:text-neutral-400"
                  placeholder="Confirm new password"
                  style={{
                    textShadow: isConfirmTextRevealing
                      ? '0 0 8px rgba(0, 148, 255, 0.7), 0 0 2px rgba(0, 148, 255, 0.4)'
                      : 'none',
                    letterSpacing: isConfirmTextRevealing ? '0.04em' : 'normal',
                    transition: 'text-shadow 0.25s ease, letter-spacing 0.25s ease',
                  }}
                />
                <motion.button
                  type="button"
                  onClick={handleToggleConfirmPassword}
                  onMouseDown={(e) => e.preventDefault()}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                    showConfirmPassword
                      ? "text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300"
                      : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {showConfirmPassword ? (
                      <motion.span
                        key="eye-off"
                        initial={{ opacity: 0, scale: 0.5, rotate: -25 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 25 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex items-center justify-center"
                      >
                        <EyeOff size={18} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="eye"
                        initial={{ opacity: 0, scale: 0.5, rotate: 25 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: -25 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="flex items-center justify-center"
                      >
                        <Eye size={18} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white text-sm font-medium transition-all ${
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
              className="text-sm font-medium text-cn-text-muted hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors"
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
