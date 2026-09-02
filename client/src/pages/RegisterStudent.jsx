import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { registerStudent } from '../services/authService';
import {
  PROGRAM_LABELS,
  PROGRAM_OPTIONS,
  getBranchesForProgram,
  getMaxDurationForProgram,
} from '../constants/academicConstants';
import { getGraduationYearOptions, calculateAcademicProgress } from '../utils/academicProgress';
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const RegisterStudent = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { setSession } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    branch: '',
    year: '',
    expectedGraduationYear: '',
    program: '',
    email: '',
    password: ''
  });
  const [graduationYear, setGraduationYear] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isOtherProgram = formData.program === 'OTHER';

  const availableBranches = getBranchesForProgram(formData.program);
  const gradYearOptions = getGraduationYearOptions(formData.program || 'BTECH');

  const handleGraduationYearChange = (e) => {
    const selectedGradYear = e.target.value;
    setGraduationYear(selectedGradYear);
    const progress = calculateAcademicProgress({
      program: formData.program,
      expectedGraduationYear: selectedGradYear,
    });
    setFormData((prev) => ({
      ...prev,
      expectedGraduationYear: selectedGradYear ? parseInt(selectedGradYear, 10) : null,
      year: progress.academicYearLabel,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'program') {
      setGraduationYear('');
      setFormData((prev) => ({
        ...prev,
        program: value,
        branch: '',
        year: '',
        expectedGraduationYear: '',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await registerStudent(formData);
      if (res.data.user) {
        setSession(res.data.user, res.data.role, res.data.token);
        navigate('/');
      } else {
        // Verification required - Redirect to Home with notification
        showNotification(res.data.message, 'success', 5000);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500';
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
                  Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
                </span>
              </Link>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-500">
                NIT Jalandhar Student Portal
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Student Registration
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm pt-1">
                Discover events, connect with campus clubs, and manage your campus activities in one place.
              </p>
            </div>

            {/* Compact Benefits List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-4 h-4 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Discover campus events and fests</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-4 h-4 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Connect with student clubs & societies</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-4 h-4 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Track activities & digital certificates</span>
              </div>
            </div>

            {/* Small Bottom Link */}
            <div className="pt-2">
              <Link 
                to="/register/external" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors group"
              >
                <span>From another college? Register as external</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-600 dark:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
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
                  Register with your NITJ student credentials
                </p>
              </div>

              <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2">
                    <i className="ri-error-warning-line text-base shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ROW 1: Full Name + Roll Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="name" className={labelCls}>
                      Full Name <span className="text-orange-600">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className={inputCls}
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="rollNo" className={labelCls}>
                      {isOtherProgram ? 'Roll No / ID' : 'Roll Number'} {!isOtherProgram && <span className="text-orange-600">*</span>}
                    </label> 
                    <input
                      id="rollNo"
                      name="rollNo"
                      type="text"
                      required={!isOtherProgram}
                      className={inputCls}
                      placeholder={isOtherProgram ? 'Optional for Other' : 'e.g. 21103001'}
                      value={formData.rollNo}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* ROW 2: Program + Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="program" className={labelCls}>
                      Program <span className="text-orange-600">*</span>
                    </label>
                    <select
                      id="program"
                      name="program"
                      required
                      className={inputCls}
                      value={formData.program}
                      onChange={handleChange}
                    >
                      <option value="">Select Program</option>
                      {PROGRAM_OPTIONS.map((program) => (
                        <option key={program} value={program}>
                          {PROGRAM_LABELS[program]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="branch" className={labelCls}>
                      Branch {!isOtherProgram && <span className="text-orange-600">*</span>}
                    </label>
                    <select
                      id="branch"
                      name="branch"
                      required={!isOtherProgram}
                      disabled={!formData.program}
                      className={`${inputCls} ${!formData.program ? 'opacity-60 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/50' : ''}`}
                      value={formData.branch}
                      onChange={handleChange}
                    >
                      <option value="">
                        {formData.program ? "Select Branch" : "Select program first"}
                      </option>
                      {availableBranches.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ROW 3: Graduation Year */}
                <div>
                  <label htmlFor="graduationYear" className={labelCls}>
                    Expected Graduation Year {!isOtherProgram && <span className="text-orange-600">*</span>}
                  </label>
                  <select
                    id="graduationYear"
                    name="graduationYear"
                    required={!isOtherProgram}
                    className={inputCls}
                    value={graduationYear}
                    onChange={handleGraduationYearChange}
                  >
                    <option value="">Select Graduation Year</option>
                    {gradYearOptions.map((option) => (
                      <option key={option.gradYear} value={option.gradYear}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ROW 4: College Email */}
                <div>
                  <label htmlFor="email" className={labelCls}>
                    College Email <span className="text-orange-600">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={inputCls}
                    placeholder="e.g. name.branch.year@nitj.ac.in"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 block">
                    Use your official @nitj.ac.in student email
                  </span>
                </div>

                {/* ROW 5: Password */}
                <div>
                  <label htmlFor="password" className={labelCls}>
                    Password <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className={`${inputCls} pr-10`}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
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
                      <PasswordStrengthChecker 
                        password={formData.password} 
                        userInputs={[formData.name, formData.email, formData.rollNo]} 
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-xs"
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

export default RegisterStudent;

