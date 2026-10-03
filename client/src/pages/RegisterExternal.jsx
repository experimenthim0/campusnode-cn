import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { registerExternal } from '../services/authService';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  Lock,
} from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import CampusNodeIntroAnimation from '../components/CampusNodeIntroAnimation';
import RegistrationTermsNotice from '../components/RegistrationTermsNotice';

const RegisterExternal = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { setSession } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    collegeName: '',
    phone: '',
    program: '',
    graduationYear: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const validateForm = () => {
    const errors = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Full Name is required.';
    }

    if (!formData.collegeName || !formData.collegeName.trim()) {
      errors.collegeName = 'College / University name is required.';
    }

    if (!formData.program || !formData.program.trim()) {
      errors.program = 'Program / Degree is required.';
    }

    if (!formData.graduationYear) {
      errors.graduationYear = 'Graduation Year is required.';
    }

    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || '';
    const isAcademicEmail =
      domain.endsWith('.edu') ||
      domain.endsWith('.ac.in') ||
      domain.endsWith('.edu.in');

    if (!cleanEmail) {
      errors.email = 'Academic email is required.';
    } else if (!isAcademicEmail) {
      errors.email = 'Please use an academic email ending with .edu or .ac.in';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!agreedToTerms) {
      errors.terms = 'Please accept the Terms & Conditions and acknowledge non-editable fields before registering.';
    }

    setFieldErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const { isValid, errors } = validateForm();
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
      const res = await registerExternal(formData);
      if (res.data.user && res.data.token) {
        setSession(res.data.user, res.data.role || 'external', res.data.token);
        showNotification('Welcome! Your participant account has been created.', 'success');
        navigate('/profile');
      } else {
        showNotification(res.data.message || 'Registration successful!', 'success');
        navigate('/login');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
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
          
          {/* ── LEFT COLUMN: CampusNode introduction / interactive animation (~55% width on desktop) ── */}
          <div className="w-full p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center hidden md:block">
            <CampusNodeIntroAnimation />
          </div>

          {/* ── RIGHT COLUMN: Registration form (~45% width on desktop, vertically centered) ── */}
          <div className="w-full p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-center">
            <div className="text-center sm:text-left mb-6">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                External Registration
              </h1>
            </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                {serverError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* ── SECTION 1: Personal & College Information ── */}
                <div className="space-y-3">
                  

                  {/* Full Name & Phone Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="name" className={labelCls}>
                        Full Name <span className="text-brand-600">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className={getInputCls('name')}
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                      />
                      {fieldErrors.name && (
                        <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.name}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelCls}>
                        Phone Number <span className="text-zinc-400 text-[10px]">(Optional)</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        className={getInputCls('phone')}
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* College / University Name */}
                  <div>
                    <label htmlFor="collegeName" className={labelCls}>
                      College / University Name <span className="text-brand-600">*</span>
                    </label>
                    <input
                      id="collegeName"
                      name="collegeName"
                      type="text"
                      required
                      className={getInputCls('collegeName')}
                      placeholder="e.g. Delhi Technological University"
                      value={formData.collegeName}
                      onChange={handleChange}
                    />
                    {fieldErrors.collegeName && (
                      <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.collegeName}</span>
                      </p>
                    )}
                  </div>

                  {/* Program / Degree & Graduation Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="program" className={labelCls}>
                        Program / Degree <span className="text-brand-600">*</span>
                      </label>
                      <input
                        id="program"
                        name="program"
                        type="text"
                        required
                        className={getInputCls('program')}
                        placeholder="e.g. B.Tech Computer Science"
                        value={formData.program}
                        onChange={handleChange}
                      />
                      {fieldErrors.program && (
                        <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.program}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="graduationYear" className={labelCls}>
                        Graduation Year <span className="text-brand-600">*</span>
                      </label>
                      <select
                        id="graduationYear"
                        name="graduationYear"
                        required
                        className={getInputCls('graduationYear')}
                        value={formData.graduationYear}
                        onChange={handleChange}
                      >
                        <option value="">Select Year</option>
                        {graduationYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Class of {yr}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.graduationYear && (
                        <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.graduationYear}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: Account Credentials ── */}
                <div className="space-y-3 pt-1">
                 
                  {/* College Email (.edu or .ac.in) */}
                  <div>
                    <label htmlFor="email" className={labelCls}>
                      Institutional Student Email <span className="text-brand-600">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className={getInputCls('email')}
                      placeholder="e.g. @ac.in , @edu.in"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    {/* <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                      Must end with an academic domain (.edu, .ac.in, or .edu.in)
                    </span> */}
                    {fieldErrors.email && (
                      <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className={labelCls}>
                      Password <span className="text-brand-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className={`${getInputCls('password')} pr-10`}
                        placeholder="Create a secure password"
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldErrors.password}</span>
                      </p>
                    )}
                    {formData.password && (
                      <div className="mt-1.5">
                        <PasswordStrengthChecker
                          password={formData.password}
                          userInputs={[formData.name, formData.email, formData.collegeName]}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms & Conditions + Non-Editable Fields Notice */}
                <RegistrationTermsNotice
                  role="external"
                  agreed={agreedToTerms}
                  onAgreementChange={handleTermsChange}
                  error={fieldErrors.terms}
                />

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-cn-blue-600 dark:text-cn-blue-400 hover:underline">
                    Log in
                  </Link>
                </span>
                <div className="flex items-center gap-2">
                  <Link to="/register" className="hover:text-cn-blue-600 dark:hover:text-cn-blue-400">
                    Register as NITJian
                  </Link>
                  <span>•</span>
                  <Link to="/register/faculty" className="hover:text-cn-blue-600 dark:hover:text-cn-blue-400">
                    Register as Faculty
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default RegisterExternal;
