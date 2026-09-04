import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { registerExternal } from '../services/authService';
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

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

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.collegeName.trim() ||
      !formData.program?.trim() ||
      !formData.graduationYear
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1] || '';
    const isAcademicEmail =
      domain.endsWith('.edu') ||
      domain.endsWith('.ac.in') ||
      domain.endsWith('.edu.in');

    if (!isAcademicEmail) {
      setError('Please use an academic college email ending with .edu or .ac.in');
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
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white text-sm font-medium outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500';
  const labelCls =
    'block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5';

  return (
    <div className="min-h-screen bg-neutral-50/70 dark:bg-[#0a0a0a] flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Compact Introduction */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div>
              <Link to="/" className="inline-flex items-center select-none group">
                <span className="font-light text-2xl sm:text-3xl tracking-wider text-neutral-900 dark:text-neutral-100 leading-none logofont">
                  Campus<span className="text-brand-600 dark:text-brand-500">Node</span>
                </span>
              </Link>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-500">
                For Students From Other Institutions
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                External Registration
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm pt-1">
                Join hackathons, competitions, festivals and workshops hosted across campuses.
              </p>
            </div>

            {/* Compact Benefits List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-4 h-4 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Open inter-college events</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-4 h-4 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Create or join teams</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-4 h-4 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Digital passes and certificates</span>
              </div>
            </div>

            {/* Small Bottom Link */}
            <div className="pt-2">
              <Link 
                to="/register" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-500 transition-colors group"
              >
                <span>Studying at NIT Jalandhar? Register as a student</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-600 dark:text-brand-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div className="lg:col-span-7 w-full">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xs">
              
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Create your account
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Register as an external participant
                </p>
              </div>

              <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                    <i className="ri-error-warning-line text-base shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className={labelCls}>
                    Full Name <span className="text-brand-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    College Email Address <span className="text-brand-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. name@college.edu or student@iitd.ac.in"
                    required
                    className={inputCls}
                  />
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
                    Use your official college email (.edu, .edu.in or .ac.in)
                  </span>
                </div>

                <div>
                  <label className={labelCls}>
                    College / Institute Name <span className="text-brand-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="collegeName"
                    value={formData.collegeName}
                    onChange={handleChange}
                    placeholder="e.g. IIT Delhi, BITS Pilani, Thapar University"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>
                      Program / Degree <span className="text-brand-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="program"
                      value={formData.program}
                      onChange={handleChange}
                      placeholder="e.g. B.Tech / BCA / MBA"
                      required
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    Expected Graduation Year <span className="text-brand-600">*</span>
                  </label>
                  <select
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  >
                    <option value="">Select graduation year</option>
                    {graduationYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Password <span className="text-brand-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      required
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-1.5">
                      <PasswordStrengthChecker password={formData.password} />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs"
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

              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-500 hover:underline">
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegisterExternal;
