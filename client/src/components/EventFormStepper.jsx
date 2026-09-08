import React from 'react';

const STEPS = [
  { id: 1, label: 'Basic Details', sub: 'Title, category, poster' },
  { id: 2, label: 'Schedule & Access', sub: 'Date, time, venue' },
  { id: 3, label: 'Registration & Payment', sub: 'Seats, fee, team options' },
  { id: 4, label: 'Extras', sub: 'Sponsors, media, settings' },
];

const CheckIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const EventFormStepper = ({
  currentStep = 1,
  onStepClick,
  completedSteps = [],
  stepErrors = {},
  isEditMode = false,
}) => {
  const currentStepObj = STEPS.find((s) => s.id === currentStep) || STEPS[0];
  const completedSet = new Set(Array.isArray(completedSteps) ? completedSteps : []);

  return (
    <nav
      aria-label="Event form progress"
      className="w-full bg-white border border-neutral-200 rounded-xl p-3 md:p-4 mb-6 shadow-sm"
    >
      {/* Mobile view (< md) */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {currentStepObj.label}
            </span>
          </div>
          {stepErrors[currentStep] && (
            <span className="flex items-center text-xs text-rose-600 font-medium">
              <AlertIcon />
              <span className="ml-1">Errors</span>
            </span>
          )}
        </div>

        {/* Compact mobile step dots */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isDone = completedSet.has(step.id);
            const hasError = Boolean(stepErrors[step.id]);
            const isClickable = isEditMode || isDone || step.id <= currentStep;

            return (
              <button
                key={step.id}
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick?.(step.id)}
                aria-label={`Step ${step.id}: ${step.label}${hasError ? ' (has errors)' : isDone ? ' (completed)' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center justify-center py-2 px-1 rounded-lg text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : hasError
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <span className="mr-1">
                  {hasError ? '!' : isDone ? '✓' : step.id}
                </span>
                <span className="truncate">{step.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop view (>= md) */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isDone = completedSet.has(step.id);
          const hasError = Boolean(stepErrors[step.id]);
          const isClickable = isEditMode || isDone || step.id <= currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick?.(step.id)}
                aria-label={`Step ${step.id}: ${step.label}${hasError ? ' (has errors)' : isDone ? ' (completed)' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center space-x-3 text-left p-2 rounded-lg transition-colors group ${
                  isClickable ? 'cursor-pointer hover:bg-neutral-50' : 'cursor-default opacity-70'
                }`}
              >
                {/* Step indicator circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 ${
                    hasError
                      ? 'bg-rose-100 border-2 border-rose-500 text-rose-700'
                      : isActive
                      ? 'bg-neutral-900 border-2 border-neutral-900 text-white shadow-sm ring-4 ring-neutral-100'
                      : isDone
                      ? 'bg-emerald-500 border-2 border-emerald-500 text-white shadow-sm'
                      : 'bg-neutral-100 border-2 border-neutral-200 text-neutral-500 group-hover:border-neutral-300'
                  }`}
                >
                  {hasError ? (
                    <AlertIcon />
                  ) : isDone ? (
                    <CheckIcon />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step label & subtitle */}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-xs font-semibold tracking-wide uppercase ${
                        isActive
                          ? 'text-neutral-900'
                          : hasError
                          ? 'text-rose-600'
                          : isDone
                          ? 'text-neutral-700'
                          : 'text-neutral-400 group-hover:text-neutral-600'
                      }`}
                    >
                      {step.label}
                    </span>
                    {hasError && (
                      <span className="text-[10px] font-medium text-rose-600 bg-rose-50 px-1 rounded">
                        Error
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate max-w-[140px] xl:max-w-[180px]">
                    {step.sub}
                  </p>
                </div>
              </button>

              {/* Connecting line between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                    completedSet.has(step.id) && (completedSet.has(step.id + 1) || currentStep === step.id + 1)
                      ? 'bg-emerald-400'
                      : currentStep > step.id
                      ? 'bg-neutral-300'
                      : 'bg-neutral-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default EventFormStepper;