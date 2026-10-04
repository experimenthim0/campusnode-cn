import React from 'react';
import { Link } from 'react-router-dom';
import CampusNodeIntroAnimation from '../components/CampusNodeIntroAnimation';

const RegisterLanding = () => {
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

          {/* ── RIGHT COLUMN: Registration options (~45% width on desktop, vertically centered) ── */}
          <div className="w-full p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-center">
            <div className="text-center sm:text-left mb-6">
              <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                Join Campus<span className="text-brand-500 dark:text-brand-400">Node</span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                Select your account type to proceed with registration
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Student Registration */}
              <Link
                to="/register"
                className="group flex items-center gap-4 p-4 sm:p-5 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-12 h-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <i className="ri-user-line text-2xl" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400 mb-0.5">NITJ Student</div>
                  <div className="font-semibold text-[15px] sm:text-[16px] text-zinc-900 dark:text-white leading-tight">Student Account</div>
                </div>
                <i className="ri-arrow-right-line text-lg text-zinc-400 dark:text-zinc-500 ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
              </Link>

              {/* Faculty Registration */}
              <Link
                to="/register/faculty"
                className="group flex items-center gap-4 p-4 sm:p-5 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-12 h-12 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <i className="ri-building-4-line text-2xl" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-600 dark:text-purple-400 mb-0.5">Faculty & Staff</div>
                  <div className="font-semibold text-[15px] sm:text-[16px] text-zinc-900 dark:text-white leading-tight">Faculty Account</div>
                </div>
                <i className="ri-arrow-right-line text-lg text-zinc-400 dark:text-zinc-500 ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
              </Link>

              {/* External Registration */}
              <Link
                to="/register/external"
                className="group flex items-center gap-4 p-4 sm:p-5 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <i className="ri-global-line text-2xl" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400 mb-0.5">Other Institutions</div>
                  <div className="font-semibold text-[15px] sm:text-[16px] text-zinc-900 dark:text-white leading-tight">External Participant</div>
                </div>
                <i className="ri-arrow-right-line text-lg text-zinc-400 dark:text-zinc-500 ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-cn-blue-600 dark:text-cn-blue-400 hover:underline">
                  Log in
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterLanding;
