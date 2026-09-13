import React from 'react';
import { Link } from 'react-router-dom';

const RegisterLanding = () => {
  return (
    <div className="min-h-screen bg-cn-bg text-cn-text flex flex-col items-center justify-center py-12 px-4">

      <div className="text-center mb-8 max-w-md">
        <div className="flex items-center justify-center gap-2 mb-3 text-cn-blue-600 dark:text-cn-blue-400">
          <span className="block w-6 h-0.5 bg-cn-blue-600 dark:bg-cn-blue-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Get Started</span>
          <span className="block w-6 h-0.5 bg-cn-blue-600 dark:bg-cn-blue-400" />
        </div>
        <h1 className="font-black text-[clamp(32px,6vw,44px)] leading-[1.05] tracking-tight text-cn-text mb-2">
          Join Campus<span className="text-brand-500 dark:text-brand-400">Node</span>
        </h1>
        <p className="text-[14px] text-cn-text-muted leading-relaxed">
          Select your role to create your account
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-3.5">
        {/* Student Registration */}
        <Link
          to="/register"
          className="group flex items-center gap-4 p-5 bg-cn-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <i className="ri-user-line text-2xl" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400 mb-0.5">NITJ Student</div>
            <div className="font-bold text-[16px] text-cn-text leading-tight">Student Account</div>
            <div className="text-[12px] text-cn-text-muted mt-0.5">Discover & attend campus events, join clubs</div>
          </div>
          <i className="ri-arrow-right-line text-lg text-cn-text-muted ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* Faculty Registration */}
        <Link
          to="/register/faculty"
          className="group flex items-center gap-4 p-5 bg-cn-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <i className="ri-building-4-line text-2xl" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-600 dark:text-purple-400 mb-0.5">Faculty & Staff</div>
            <div className="font-bold text-[16px] text-cn-text leading-tight">Faculty Account</div>
            <div className="text-[12px] text-cn-text-muted mt-0.5">Participate in events, judge & coordinate clubs</div>
          </div>
          <i className="ri-arrow-right-line text-lg text-cn-text-muted ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
        </Link>

        {/* External Registration */}
        <Link
          to="/register/external"
          className="group flex items-center gap-4 p-5 bg-cn-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
            <i className="ri-global-line text-2xl" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400 mb-0.5">Other Institutions</div>
            <div className="font-bold text-[16px] text-cn-text leading-tight">External Participant</div>
            <div className="text-[12px] text-cn-text-muted mt-0.5">Inter-college competitions, fests & workshops</div>
          </div>
          <i className="ri-arrow-right-line text-lg text-cn-text-muted ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[13px] text-cn-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-cn-blue-600 dark:text-cn-blue-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterLanding;
