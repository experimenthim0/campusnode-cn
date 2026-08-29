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
    'w-full px-4 py-3 border border-neutral-200 dark:border-gray-200 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-sm font-medium outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400';
  const labelCls =
    'block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-5 py-12 transition-colors duration-300">

      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none logofont">
            Campus<span className="text-orange-600 dark:text-orange-500">Node</span>
          </span>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Create your student account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl flex items-center gap-2">
                <i className="ri-error-warning-line text-lg flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className={labelCls}>Full Name</label>
              <input id="name" name="name" type="text" required className={inputCls}
                placeholder="Enter your full name" value={formData.name} onChange={handleChange} />
            </div>

            {/* Roll Number */}
            <div>
              <label htmlFor="rollNo" className={labelCls}>{isOtherProgram ? 'Roll Number / Employee ID' : 'Roll Number'}</label>
              <input id="rollNo" name="rollNo" type="text" required={!isOtherProgram} className={inputCls}
                placeholder={isOtherProgram ? 'Optional for Other category' : 'Enter your roll number'} value={formData.rollNo} onChange={handleChange} />
            </div>

            {/* Program + Branch in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="program" className={labelCls}>Program</label>
                <select id="program" name="program" required className={inputCls}
                  value={formData.program} onChange={handleChange}>
                  <option value="">Select</option>
                  {PROGRAM_OPTIONS.map((program) => (
                    <option key={program} value={program}>
                      {PROGRAM_LABELS[program]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="branch" className={labelCls}>Branch</label>
                <select
                  id="branch"
                  name="branch"
                  required={!isOtherProgram}
                  disabled={!formData.program}
                  className={inputCls}
                  value={formData.branch}
                  onChange={handleChange}
                >
                  <option value="">{formData.program ? "Select Branch" : "Select Program First"}</option>
                  {availableBranches.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Graduation Year */}
            <div>
              <label htmlFor="graduationYear" className={labelCls}>Graduation Year</label>
              <select id="graduationYear" name="graduationYear" required={!isOtherProgram} className={inputCls}
                value={graduationYear} onChange={handleGraduationYearChange}>
                <option value="">Select Graduation Year</option>
                {gradYearOptions.map(option => (
                  <option key={option.gradYear} value={option.gradYear}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelCls}>College Email</label>
              <input id="email" name="email" type="email" required className={inputCls}
                placeholder="name.branch.year@nitj.ac.in" value={formData.email} onChange={handleChange} />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelCls}>Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} required className={`${inputCls} pr-11`}
                  placeholder="Create a password" value={formData.password} onChange={handleChange} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-all mt-1 ${loading
                  ? 'bg-neutral-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 cursor-pointer hover:-translate-y-0.5'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin" /> Registering…</span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterStudent;
