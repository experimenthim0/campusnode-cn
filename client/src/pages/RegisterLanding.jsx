import React from 'react';
import { Link } from 'react-router-dom';

const RegisterLanding = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center py-12 px-4">

      <div className="text-center mb-10 max-w-md">
        <div className="flex items-center justify-center gap-2 mb-4 text-orange-600">
          <span className="block w-6 h-0.5 bg-orange-600" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Get Started</span>
          <span className="block w-6 h-0.5 bg-orange-600" />
        </div>
        <h1 className="font-black text-[clamp(32px,6vw,48px)] leading-[1.05] tracking-wide text-black mb-3">
          Join<br />
          Campus<span className="text-orange-600">Node</span>
        </h1>
        <p className="text-[15px] text-neutral-500 leading-relaxed">
          Select your account type to get started
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-4">

        <Link
          to="/register/student"
          className="group flex items-center gap-5 p-6 bg-white border-2 border-black rounded-sm  hover:shadow-[6px_6px_0px_#ea580c] hover:border-orange-600 hover:-translate-y-1 transition-all"
        >
          <div className="w-14 h-14 bg-black rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-orange-600 transition-colors">
            <i className="ri-user-line text-white text-2xl" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-600 mb-1">Student</div>
            <div className="font-black text-[18px] text-black leading-tight">I am a Student</div>
            <div className="text-[13px] text-neutral-500 mt-1">Register to discover & attend events</div>
          </div>
          <i className="ri-arrow-right-line text-xl text-neutral-300 ml-auto group-hover:text-orange-600 transition-colors" />
        </Link>
        <p className="text-[12px] text-center text-neutral-400 mt-2 italic">
          Club & Faculty accounts are pre-registered by the Administrator.
        </p>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[13px] text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-orange-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterLanding;
