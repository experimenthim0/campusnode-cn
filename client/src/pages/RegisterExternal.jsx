import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { registerExternal } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
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
    'w-full px-4 py-2.5 sm:py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400';
  const labelCls =
    'block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5';

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-[#0a0a0a] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-6xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6 sm:space-y-8 py-2 lg:py-6">
            <div>
              <Link to="/" className="inline-flex items-center gap-2 select-none group">
                <span className="font-light text-2xl sm:text-3xl tracking-wider text-black dark:text-neutral-100 leading-none logofont">
                  Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
                </span>
              </Link>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.18]">
                External Participant<br />
                <span className="text-orange-600 dark:text-orange-500 font-extrabold">Registration.</span>
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-md">
                Participate in open hackathons, cultural festivals, technical competitions, and workshops.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-5 h-5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                  <i className="ri-check-line font-bold" />
                </div>
                <span>Register for open inter-college events</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-5 h-5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                  <i className="ri-check-line font-bold" />
                </div>
                <span>Create and join event teams</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-5 h-5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                  <i className="ri-check-line font-bold" />
                </div>
                <span>Access digital event passes and certificates</span>
              </div>
            </div>

            <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-2xl flex items-start gap-3 mt-4">
              <i className="ri-information-line text-orange-600 dark:text-orange-400 text-lg shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-neutral-900 dark:text-white">
                  Academic Email Requirement
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed text-[11.5px]">
                  Registration requires an official college/university email ending with <strong>.edu</strong> or <strong>.ac.in</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Are you an NIT Jalandhar student?{' '}
              <Link to="/register/student" className="font-semibold text-orange-600 dark:text-orange-500 hover:underline">
                Register here
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 w-full max-w-xl mx-auto">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-sm">
              
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Create Participant Account
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Enter your details to register as an external participant
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium rounded-xl flex items-center gap-2">
                    <i className="ri-error-warning-line text-base flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className={labelCls}>
                    Full Name <span className="text-orange-600">*</span>
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
                    College Email Address <span className="text-orange-600">*</span>
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
                    Must end with .edu or .ac.in
                  </span>
                </div>

                <div>
                  <label className={labelCls}>
                    College / Institute Name <span className="text-orange-600">*</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Program / Degree <span className="text-orange-600">*</span>
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
                    Expected Graduation Year <span className="text-orange-600">*</span>
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
                    Password <span className="text-orange-600">*</span>
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
                    <div className="mt-2">
                      <PasswordStrengthChecker password={formData.password} />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-lg" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-orange-600 dark:text-orange-500 hover:underline">
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
