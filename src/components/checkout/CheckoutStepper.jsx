import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Tus datos' },
  { id: 2, label: 'Pago' },
  { id: 3, label: 'Habilitación' },
];

export const CheckoutStepper = ({ currentStep, onStepClick }) => {
  return (
    <div className="px-4 sm:px-6 py-3.5 bg-[#F8F7FA] border-b border-slate-200/80">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id || currentStep === 3;
          const isActive = currentStep === step.id && currentStep < 3;
          const canNavigate =
            isCompleted && currentStep < 3 && typeof onStepClick === 'function';

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && onStepClick(step.id)}
                className={`flex items-center gap-2 text-left transition-colors ${
                  canNavigate ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-[#16A34A] text-white'
                      : isActive
                        ? 'bg-[#5B21B6] text-white shadow-xs'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.id}
                </span>
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    isCompleted
                      ? 'text-[#16A34A]'
                      : isActive
                        ? 'text-[#5B21B6]'
                        : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-[2px] rounded-full transition-colors ${
                    currentStep > step.id || currentStep === 3
                      ? 'bg-[#16A34A]/50'
                      : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
