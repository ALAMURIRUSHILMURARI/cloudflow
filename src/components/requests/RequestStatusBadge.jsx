import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Sparkles 
} from 'lucide-react';

export const RequestStatusBadge = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase();

  const configs = {
    pending: {
      label: 'Pending Review',
      className: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
      icon: Clock,
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
      icon: CheckCircle2,
    },
    completed: {
      label: 'Completed',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
      icon: XCircle,
    },
    action_required: {
      label: 'Action Required',
      className: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20',
      icon: AlertCircle,
    },
    upcoming: {
      label: 'Upcoming',
      className: 'bg-slate-50 text-slate-500 border-slate-200 ring-slate-400/20',
      icon: Clock,
    }
  };

  const config = configs[normalized] || {
    label: status || 'Unknown',
    className: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-400/20',
    icon: Sparkles,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs ${sizeClasses[size]} ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default RequestStatusBadge;
