import React from 'react';

const colorThemes = {
  indigo: {
    bg: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-100',
    hover: 'hover:border-indigo-300',
  },
  amber: {
    bg: 'bg-amber-50 text-amber-600',
    border: 'border-amber-100',
    hover: 'hover:border-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-100',
    hover: 'hover:border-emerald-300',
  },
  rose: {
    bg: 'bg-rose-50 text-rose-600',
    border: 'border-rose-100',
    hover: 'hover:border-rose-300',
  },
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  onClick,
}) => {
  const theme = colorThemes[color] || colorThemes.indigo;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border ${theme.border} bg-white p-5 shadow-xs transition-all duration-150 ${theme.hover} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.bg}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      {subtitle && (
        <div className="mt-3 flex items-center text-xs text-slate-500">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
