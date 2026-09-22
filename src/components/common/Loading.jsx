import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loading = ({ message = 'Loading enterprise data...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 text-indigo-500',
    md: 'w-8 h-8 text-indigo-600',
    lg: 'w-12 h-12 text-indigo-600',
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className={`${sizeClasses[size]} animate-spin mb-3`} />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-4 bg-slate-200 rounded w-28"></div>
      <div className="h-6 bg-slate-200 rounded-full w-20"></div>
    </div>
    <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
    <div className="border-t border-slate-100 pt-3 flex justify-between">
      <div className="h-3 bg-slate-200 rounded w-20"></div>
      <div className="h-3 bg-slate-200 rounded w-16"></div>
    </div>
  </div>
);

export default Loading;
