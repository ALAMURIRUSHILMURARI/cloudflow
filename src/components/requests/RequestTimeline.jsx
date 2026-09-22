import React from 'react';
import { Check, Clock, X, AlertCircle, Circle } from 'lucide-react';

export const RequestTimeline = ({ workflow = [], stepHistory = [], currentStepIndex = 0, overallStatus = 'Pending' }) => {
  if (!workflow || workflow.length === 0) return null;

  return (
    <div className="w-full py-4">
      {/* Horizontal workflow timeline for medium/large screens */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Connector Line Background */}
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

          {workflow.map((step, idx) => {
            const historyItem = stepHistory[idx] || {};
            const isCompleted = historyItem.status === 'Approved' || (overallStatus === 'Approved' && idx <= currentStepIndex);
            const isRejected = historyItem.status === 'Rejected' || (overallStatus === 'Rejected' && idx === currentStepIndex);
            const isCurrent = (historyItem.status === 'Pending' || idx === currentStepIndex) && overallStatus === 'Pending';
            const isUpcoming = !isCompleted && !isRejected && !isCurrent;

            return (
              <div key={step.id || idx} className="relative z-10 flex flex-col items-center text-center flex-1 px-2">
                {/* Node Icon */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100'
                      : isRejected
                      ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100'
                      : isCurrent
                      ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 shadow-md animate-pulse'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : isRejected ? (
                    <X className="h-5 w-5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <span className="text-xs font-semibold">{idx + 1}</span>
                  )}
                </div>

                {/* Step Metadata */}
                <div className="mt-3">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : isRejected ? 'text-rose-600' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">{step.role || 'Reviewer'}</p>
                  
                  {/* Status Indicator */}
                  <div className="mt-1">
                    {isCompleted && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600">
                        ✓ Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        ● Pending Approval
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-rose-600">
                        ✕ Rejected
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-[10px] text-slate-400">
                        ○ Pending
                      </span>
                    )}
                  </div>

                  {historyItem.timestamp && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(historyItem.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertical workflow timeline for mobile screens */}
      <div className="block md:hidden space-y-4">
        {workflow.map((step, idx) => {
          const historyItem = stepHistory[idx] || {};
          const isCompleted = historyItem.status === 'Approved' || (overallStatus === 'Approved' && idx <= currentStepIndex);
          const isRejected = historyItem.status === 'Rejected' || (overallStatus === 'Rejected' && idx === currentStepIndex);
          const isCurrent = (historyItem.status === 'Pending' || idx === currentStepIndex) && overallStatus === 'Pending';
          const isUpcoming = !isCompleted && !isRejected && !isCurrent;

          return (
            <div key={step.id || idx} className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isRejected
                    ? 'bg-rose-600 border-rose-600 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 border-indigo-600 text-white ring-2 ring-indigo-100'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isRejected ? (
                  <X className="h-4 w-4" />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{idx + 1}</span>
                )}
              </div>

              <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">{step.label}</p>
                  <span className="text-[10px] font-medium text-slate-500">{step.role}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{historyItem.notes || step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestTimeline;
