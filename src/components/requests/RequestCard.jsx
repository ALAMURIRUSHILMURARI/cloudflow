import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Calendar, 
  Receipt, 
  ShieldCheck, 
  ArrowRight, 
  User, 
  Clock 
} from 'lucide-react';
import RequestStatusBadge from './RequestStatusBadge';

const typeIcons = {
  purchase: ShoppingCart,
  leave: Calendar,
  expense: Receipt,
  software: ShieldCheck,
};

const typeLabels = {
  purchase: 'Purchase Requisition',
  leave: 'Leave Application',
  expense: 'Expense Claim',
  software: 'Software Access',
};

const typeColors = {
  purchase: 'bg-blue-50 text-blue-700 border-blue-200',
  leave: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expense: 'bg-amber-50 text-amber-700 border-amber-200',
  software: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const RequestCard = ({ request }) => {
  const Icon = typeIcons[request.type] || ShoppingCart;
  const typeLabel = typeLabels[request.type] || 'Workflow Request';
  const typeColor = typeColors[request.type] || 'bg-slate-50 text-slate-700 border-slate-200';

  const formattedDate = new Date(request.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-150 hover:border-indigo-300 hover:shadow-md">
      {/* Top row: ID, Type badge, Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900">{request.id}</span>
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${typeColor}`}>
            <Icon className="h-3 w-3" />
            {typeLabel}
          </span>
        </div>
        <RequestStatusBadge status={request.status} size="sm" />
      </div>

      {/* Title */}
      <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
        {request.title}
      </h3>

      {/* Requester & Date info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-slate-400" />
          {request.requester?.name || 'Requester'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {formattedDate}
        </span>
      </div>

      {/* Footer: Current workflow step and action link */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="text-xs">
          <span className="text-slate-400">Current Step: </span>
          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            {request.currentStep || 'Submitted'}
          </span>
        </div>

        <Link
          to={`/requests/${request.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};

export default RequestCard;
