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
import { Eye, EyeOff } from 'lucide-react';
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
    'w-full px-4 py-2.5 sm:py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400';
  const labelCls =
    'block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5';

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-[#0a0a0a] flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-6xl mx-auto">
        {/* Main 2-Column Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6 sm:space-y-8 py-2 lg:py-6">
            {/* Brand Logo */}
            <div>
              <Link to="/" className="inline-flex items-center gap-2 select-none group">
                <span className="font-light text-2xl sm:text-3xl tracking-wider text-black dark:text-neutral-100 leading-none logofont">
                  Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
                </span>
              </Link>
            </div>

            {/* Headline & Description */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.18]">
                Your campus.<br />
                <span className="text-orange-600 dark:text-orange-500 font-extrabold">Everything connected.</span>
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-md">
                Discover events, connect with campus clubs, and manage your campus activities in one place.
              </p>
            </div>

         
            {/* Three Key Benefits */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-5 h-5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                  <i className="ri-check-line font-bold" />
                </div>
                <span>Discover campus events</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-5 h-5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                  <i className="ri-check-line font-bold" />
                </div>
                <span>Connect with clubs</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="w-5 h-5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs shrink-0">
                  <i className="ri-check-line font-bold" />
                </div>
                <span>Register and manage activities</span>
              </div>
            </div>

            {/* Important Notice in Left Panel */}
            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl flex items-start gap-3 mt-4">
              <i className="ri-error-warning-line text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Important Notice
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed text-[11.5px]">
                  Academic details such as <strong>Roll Number</strong>, <strong>Program</strong>, <strong>Branch</strong>, <strong>Graduation Year</strong>, and <strong>College Email</strong> cannot be modified after registration.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 w-full max-w-xl mx-auto">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-sm">
              
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  Create your student account
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Enter your details to get started on CampusNode
                </p>
              </div>

              <form className="flex flex-col gap-4 sm:gap-4.5" onSubmit={handleSubmit}>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600/60 dark:text-red-400/60 text-xs sm:text-sm font-medium rounded-xl flex items-center gap-2">
                    <i className="ri-error-warning-line text-base flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* ROW 1: Full Name + Roll Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className={labelCls}>Full Name</label>
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
                      {isOtherProgram ? 'Roll No / Employee ID' : 'Roll Number'}
                    <i className="ri-error-warning-line text-red-600/60 dark:text-red-400/60 mx-1 font-light" />
                    </label> 
                    <input
                      id="rollNo"
                      name="rollNo"
                      type="text"
                      required={!isOtherProgram}
                      className={inputCls}
                      placeholder={isOtherProgram ? 'Optional for Other' : 'Enter your roll number'}
                      value={formData.rollNo}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* ROW 2: Program + Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="program" className={labelCls}>Program <i className="ri-error-warning-line text-red-600/60 dark:text-red-400/60 mx-1 font-light" /></label>
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
                    <label htmlFor="branch" className={labelCls}>Branch<i className="ri-error-warning-line text-red-600/60 dark:text-red-400/60 mx-1 font-light" /></label>
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
                        {formData.program ? "Select Branch" : "Select a program first"}
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
                  <label htmlFor="graduationYear" className={labelCls}>Graduation Year<i className="ri-error-warning-line text-red-600/60 dark:text-red-400/60 mx-1 font-light" /></label>
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
                  <label htmlFor="email" className={labelCls}>College Email<i className="ri-error-warning-line text-red-600/60 dark:text-red-400/60 mx-1 font-light" /></label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className={inputCls}
                    placeholder="name.branch.year@nitj.ac.in"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                {/* ROW 5: Password */}
                <div>
                  <label htmlFor="password" className={labelCls}>Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className={`${inputCls} pr-11`}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <PasswordStrengthChecker 
                    password={formData.password} 
                    userInputs={[formData.name, formData.email, formData.rollNo]} 
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all mt-2 shadow-xs ${
                    loading
                      ? 'bg-neutral-400 dark:bg-neutral-700 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-orange-600/20'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin" /> Registering…
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
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

