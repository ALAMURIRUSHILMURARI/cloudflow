import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Calendar, 
  Receipt, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { WORKFLOW_DEFINITIONS } from '../data/mockData';

export const NewRequest = () => {
  const requestTypes = [
    {
      id: 'purchase',
      title: 'Purchase Request',
      description: 'Procurement of hardware, lab testbed servers, equipment, or major SaaS team licenses.',
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
      iconBg: 'bg-blue-600 text-white',
      path: '/requests/new/purchase',
      workflowSteps: WORKFLOW_DEFINITIONS.purchase.steps,
      estimatedTime: '2-4 Business Days'
    },
    {
      id: 'leave',
      title: 'Leave Application',
      description: 'Request annual vacation, medical sick leave, conference attendance, or academic research time.',
      icon: Calendar,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400',
      iconBg: 'bg-emerald-600 text-white',
      path: '/requests/new/leave',
      workflowSteps: WORKFLOW_DEFINITIONS.leave.steps,
      estimatedTime: '1-2 Business Days'
    },
    {
      id: 'expense',
      title: 'Expense Claim',
      description: 'Reimbursement for travel, client dinners, equipment purchases, and conference registrations.',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
      iconBg: 'bg-amber-600 text-white',
      path: '/requests/new/expense',
      workflowSteps: WORKFLOW_DEFINITIONS.expense.steps,
      estimatedTime: '3-5 Business Days'
    },
    {
      id: 'software',
      title: 'Software Access Request',
      description: 'Request elevated IAM privileges, cloud console access, code repositories, or developer tools.',
      icon: ShieldCheck,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400',
      iconBg: 'bg-indigo-600 text-white',
      path: '/requests/new/software-access',
      workflowSteps: WORKFLOW_DEFINITIONS.software.steps,
      estimatedTime: 'Same Day - 24 Hours'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Initiate New Workflow Requisition
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Select a standardized requisition template below. Each workflow executes through an independent enterprise state machine.
        </p>
      </div>

      {/* Grid of 4 Request Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requestTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-lg hover:border-indigo-200 group"
            >
              <div>
                {/* Header Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${type.iconBg} shadow-md`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {type.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                </div>

                {/* Workflow Pipeline stages */}
                <div className="my-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    <span>Automated Workflow Stages ({type.workflowSteps.length})</span>
                    <span className="text-indigo-600 font-semibold">{type.estimatedTime}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {type.workflowSteps.map((step, idx) => (
                      <React.Fragment key={step.id}>
                        <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-medium text-slate-700 text-[11px]">
                          {step.label}
                        </span>
                        {idx < type.workflowSteps.length - 1 && (
                          <span className="text-slate-300 font-bold">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Link Button */}
              <div className="pt-2">
                <Link
                  to={type.path}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 transition-colors"
                >
                  <span>Start {type.title}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Capstone Architectural Note */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-slate-600 flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-indigo-950">Multi-Workflow Separation of Concerns</p>
          <p className="mt-0.5 text-slate-600 leading-relaxed">
            As required by the academic specification, all 4 requisition workflows maintain dedicated React components, distinct input schemas, and independent Step Function pipeline definitions rather than sharing a single monolithic form.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewRequest;
