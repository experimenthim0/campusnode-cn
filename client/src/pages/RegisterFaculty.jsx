import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { registerFaculty } from '../services/authService';
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Mail,
  User,
} from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import CampusNodeIntroAnimation from '../components/CampusNodeIntroAnimation';
import RegistrationTermsNotice from '../components/RegistrationTermsNotice';

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Information Technology",
  "Data Science & Engineering",
  "Electronics & Communication Engineering",
  "Electronics & VLSI Engineering",
  "Electrical Engineering",
  "Instrumentation & Control Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Industrial & Production Engineering",
  "Textile Technology",
  "Mathematics & Computing",
  "Physics",
  "Chemistry",
  "Humanities & Management",
];
const RegisterFaculty = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { setSession } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    customDepartment: '',
    designation: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
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

  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

    const passwordVal = formData.password;

    if (nextState && passwordVal && passwordVal.length > 0) {
      setIsTextRevealing(true);
      const len = passwordVal.length;
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
          setDisplayText(passwordVal.slice(0, currentStep) + '•'.repeat(len - currentStep));
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

    const passwordVal = formData.confirmPassword;

    if (nextState && passwordVal && passwordVal.length > 0) {
      setIsConfirmTextRevealing(true);
      const len = passwordVal.length;
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
          setDisplayConfirmText(passwordVal.slice(0, currentStep) + '•'.repeat(len - currentStep));
        }
      }, stepDuration);
    } else {
      setDisplayConfirmText('');
      setIsConfirmTextRevealing(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }

    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      errors.email = 'Institutional email is required.';
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = 'Please provide a valid institutional email address.';
    } else if (!cleanEmail.endsWith('@nitj.ac.in')) {
      errors.email = 'Please use your official @nitj.ac.in faculty email.';
    }

    const effectiveDept = formData.department === 'Other / Administration'
      ? formData.customDepartment?.trim()
      : formData.department?.trim();

    if (!effectiveDept) {
      errors.department = 'Please select or specify your department.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreedToTerms) {
      errors.terms = 'Please accept the Terms & Conditions and acknowledge non-editable fields before registering.';
    }

    setFieldErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors, effectiveDept };
  };

  const handleTermsChange = (checked) => {
    setAgreedToTerms(checked);
    if (fieldErrors.terms) {
      setFieldErrors((prev) => ({ ...prev, terms: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
    if (name === 'password') {
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
    }
    if (name === 'confirmPassword') {
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
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const { isValid, errors, effectiveDept } = validateForm();
    if (!isValid) {
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        const el = document.getElementById(firstKey);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        department: effectiveDept,
        designation: formData.designation?.trim() || undefined,
        password: formData.password,
      };

      const res = await registerFaculty(payload);
      if (res.data.user && res.data.token) {
        setSession(res.data.user, res.data.role || 'faculty', res.data.token);
        showNotification('Welcome! Your faculty account has been created.', 'success');
        navigate('/');
      } else {
        showNotification(res.data.message || 'Registration successful! You can now log in.', 'success', 5000);
        navigate('/login');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Faculty registration failed. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const labelCls =
    'block text-[12px] font-medium  tracking-wider text-zinc-500 dark:text-zinc-400 mb-1';

  const getInputCls = (fieldName) =>
    `w-full px-3.5 py-2.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border ${
      fieldErrors[fieldName]
        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950/40'
        : 'border-zinc-200/80 dark:border-zinc-800 focus:border-cn-blue-500 focus:ring-cn-blue-500/20'
    } rounded-xl text-zinc-900 dark:text-white text-xs font-light outline-none focus:ring-2 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500`;

  return (
    <div className="mysans min-h-[70vh] bg-cn-bg text-cn-text relative overflow-x-hidden transition-colors duration-300 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Background Ambient Atmosphere ── */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[650px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(0, 148, 255, 0.12) 0%, rgba(249, 115, 22, 0.06) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="w-full mx-auto relative z-10 my-auto ">
        <div className="rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row items-stretch">
          
          {/* ── LEFT COLUMN: Campusnode introduction / interactive animation (~55% width on desktop) ── */}
          <div className="w-full p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center hidden md:block">
            <CampusNodeIntroAnimation />
          </div>

          {/* ── RIGHT COLUMN: Registration form (~45% width on desktop, vertically centered) ── */}
          <div className="w-full p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-center">
            <div className="text-center sm:text-left mb-6">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                Faculty Registration
              </h1>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                {serverError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label htmlFor="name" className={labelCls}>
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Dr. Gopal Krishnan"
                      className={getInputCls('name')}
                    />
                    <User className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Institutional Email */}
                <div>
                  <label htmlFor="email" className={labelCls}>
                    Institutional Email (@nitj.ac.in) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. krishnang@nitj.ac.in"
                      className={getInputCls('email')}
                    />
                    <Mail className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Department & Designation Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="department" className={labelCls}>
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className={getInputCls('department')}
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.department && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.department}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="designation" className={labelCls}>
                      Designation <span className="text-zinc-400 lowercase font-normal">(optional)</span>
                    </label>
                    <input
                      id="designation"
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. Associate Professor"
                      className={getInputCls('designation')}
                    />
                  </div>
                </div>

                {/* Custom Department input if 'Other / Administration' selected */}
                {formData.department === 'Other / Administration' && (
                  <div>
                    <label htmlFor="customDepartment" className={labelCls}>
                      Specify Department / Center <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="customDepartment"
                      type="text"
                      name="customDepartment"
                      value={formData.customDepartment}
                      onChange={handleChange}
                      placeholder="e.g. Centre for Artificial Intelligence"
                      className={getInputCls('department')}
                    />
                  </div>
                )}

                {/* Password & Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="password" className={labelCls}>
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={displayText !== '' ? displayText : formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`${getInputCls('password')} pr-11`}
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
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                          showPassword
                            ? "text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300"
                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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
                              <EyeOff className="w-4 h-4" />
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
                              <Eye className="w-4 h-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className={labelCls}>
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={displayConfirmText !== '' ? displayConfirmText : formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`${getInputCls('confirmPassword')} pr-11`}
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
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                          showConfirmPassword
                            ? "text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300"
                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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
                              <EyeOff className="w-4 h-4" />
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
                              <Eye className="w-4 h-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <PasswordStrengthChecker password={formData.password} />
                )}

                {/* Terms & Conditions + Non-Editable Fields Notice */}
                <RegistrationTermsNotice
                  role="faculty"
                  agreed={agreedToTerms}
                  onAgreementChange={handleTermsChange}
                  error={fieldErrors.terms}
                />

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-cn-blue-600 hover:bg-cn-blue-700 text-white text-xs font-medium uppercase tracking-wider shadow-lg shadow-cn-blue-600/25 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Faculty Registration</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-cn-blue-600 dark:text-cn-blue-400 hover:underline">
                      Log in
                    </Link>
                  </span>
                  <div className="flex items-center gap-2">
                    <Link to="/register" className="hover:text-cn-blue-600 dark:hover:text-cn-blue-400">
                     Register as NITJian
                    </Link>
                    <span>•</span>
                    <Link to="/register/external" className="hover:text-cn-blue-600 dark:hover:text-cn-blue-400">
                      Register as External
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
};

export default RegisterFaculty;
