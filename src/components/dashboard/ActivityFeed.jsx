import React from 'react';
import { 
  FilePlus, 
  CheckCircle2, 
  XCircle, 
  Cpu, 
  Clock 
} from 'lucide-react';
import { INITIAL_ACTIVITIES } from '../../data/mockData';

const activityTypeIcons = {
  submission: { icon: FilePlus, color: 'bg-indigo-100 text-indigo-600' },
  approval: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
  rejection: { icon: XCircle, color: 'bg-rose-100 text-rose-600' },
  system: { icon: Cpu, color: 'bg-purple-100 text-purple-600' },
};

export const ActivityFeed = ({ activities = INITIAL_ACTIVITIES }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Live Activity Feed</h2>
          <p className="text-xs text-slate-500">EventBridge event audit log</p>
        </div>
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Event stream active"></span>
      </div>

      <div className="space-y-4">
        {activities.map((act) => {
          const conf = activityTypeIcons[act.type] || activityTypeIcons.submission;
          const Icon = conf.icon;

          return (
            <div key={act.id} className="flex items-start gap-3">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${conf.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 leading-snug">
                  <span className="font-semibold text-slate-900">{act.user}</span>{' '}
                  <span className="text-slate-600">{act.action}</span>{' '}
                  <span className="font-mono font-semibold text-indigo-600">{act.target}</span>
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{act.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;
