import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { registerFaculty } from '../services/authService';
import {
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  Lock,
  Mail,
  User,
  Award,
} from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Instrumentation & Control Engineering',
  'Industrial & Production Engineering',
  'Textile Technology',
  'Mathematics & Computing',
  'Physics',
  'Chemistry',
  'Humanities & Management',
  'Other / Administration',
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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    setFieldErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors, effectiveDept };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
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
    'block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1';

  const getInputCls = (fieldName) =>
    `w-full px-3.5 py-2.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border ${
      fieldErrors[fieldName]
        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950/40'
        : 'border-zinc-200/80 dark:border-zinc-800 focus:border-cn-blue-500 focus:ring-cn-blue-500/20'
    } rounded-xl text-zinc-900 dark:text-white text-xs font-light outline-none focus:ring-2 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500`;

  return (
    <div className="mysans min-h-screen bg-cn-bg text-cn-text relative overflow-hidden transition-colors duration-300 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      {/* Background Atmosphere */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[650px] opacity-40 dark:opacity-20"
        style={{
          background:
            'radial-gradient(ellipse at center top, rgba(59, 130, 246, 0.15) 0%, rgba(168, 85, 247, 0.08) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-5xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          
          {/* Left Column: Context & Overview */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cn-blue-500/10 border border-cn-blue-500/20 text-cn-blue-600 dark:text-cn-blue-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Faculty & Non-Student Members</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Faculty Registration
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm">
                Register to attend campus workshops, judge competitions, participate in events, and coordinate club activities.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 pt-1 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cn-blue-600 dark:text-cn-blue-400 shrink-0" />
                Event participation & passes
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cn-blue-600 dark:text-cn-blue-400 shrink-0" />
                Verified certificates
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-cn-blue-600 dark:text-cn-blue-400 shrink-0" />
                Club coordination ready
              </span>
            </div>

            {/* Switch to Other Registration Flows */}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors group"
              >
                <span>Are you an NITJ student? Register as Student</span>
                <ArrowRight className="w-3.5 h-3.5 text-cn-blue-600 dark:text-cn-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/register/external"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-cn-blue-600 dark:hover:text-cn-blue-400 transition-colors group"
              >
                <span>From another university? Register as External</span>
                <ArrowRight className="w-3.5 h-3.5 text-cn-blue-600 dark:text-cn-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Column: Glassmorphic Registration Card */}
          <div className="lg:col-span-7 w-full">
            <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-5 sm:p-7 relative overflow-hidden">
              
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                  Faculty & Staff Account
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Enter your name, institutional email, and department
                </p>
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
                    Institutional Email <span className="text-rose-500">*</span>
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
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`${getInputCls('password')} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`${getInputCls('confirmPassword')} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-cn-blue-600 hover:bg-cn-blue-700 text-white text-xs font-semibold uppercase tracking-wider shadow-lg shadow-cn-blue-600/25 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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

                <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-cn-blue-600 dark:text-cn-blue-400 hover:underline">
                    Log in here
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterFaculty;
