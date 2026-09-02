import React from 'react';

const STEPS = [
  { id: 1, label: 'Basic Details', sub: 'Name, description, category' },
  { id: 2, label: 'Timings & Access', sub: 'Date, time, venue' },
  { id: 3, label: 'Registration & Pay', sub: 'Slots, fees, deadline' },
  { id: 4, label: 'Extras', sub: 'Poster, tags, links' },
];

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const EventFormStepper = ({ currentStep = 1, onStepClick }) => {
  return (
    <div className="w-full bg-white border border-neutral-200 rounded-xl p-4 md:p-6 mb-8 shadow-sm">
      <div className="relative flex items-start justify-between">
        {/* Background track */}
        <div
          className="absolute top-5 h-px bg-neutral-200 z-0"
          style={{ left: 'calc(12.5%)', right: 'calc(12.5%)' }}
        />

        {/* Progress fill */}
        <div
          className="absolute top-5 h-px bg-orange-500 z-0 transition-all duration-500"
          style={{
            left: 'calc(12.5%)',
            width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 75}%)`
          }}
        />

        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center flex-1 cursor-pointer group"
              onClick={() => onStepClick?.(step.id)}
            >
              <button
                type="button"
                aria-label={`Go to step ${step.id}: ${step.label}`}
                aria-current={isActive ? 'step' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onStepClick?.(step.id);
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isDone
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : isActive
                    ? 'bg-black border-black text-white shadow-md scale-105'
                    : 'bg-white border-neutral-200 text-neutral-400 group-hover:border-neutral-400 group-hover:text-neutral-600'
                }`}
              >
                {isDone ? <CheckIcon /> : <span>{step.id}</span>}
              </button>

              <div className="mt-2 text-center px-1">
                <span
                  className={`block text-xs font-medium tracking-widest transition-colors duration-200 ${
                    isActive ? 'text-black font-semibold' : isDone ? 'text-neutral-600 font-semibold' : 'text-neutral-400 group-hover:text-neutral-600'
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`block text-[10px] mt-0.5 transition-colors duration-200 hidden md:block ${
                    isActive ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  {step.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventFormStepper;