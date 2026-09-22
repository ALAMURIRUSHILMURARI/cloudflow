import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Check, 
  Clock, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { markAsRead, markAllAsRead } from '../store/slices/notificationSlice';
import notificationService from '../services/notificationService';

const typeIcons = {
  info: { icon: Info, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  success: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  error: { icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
};

export const Notifications = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector((state) => state.notifications);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const handleMarkOne = async (id, e) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
    dispatch(markAsRead(id));
  };

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead();
    dispatch(markAllAsRead());
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.read : true));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Notifications & System Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time event stream driven by Amazon SNS & Step Functions event broker.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={CheckCheck}
            onClick={handleMarkAll}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
          description="Your notifications feed is clean and up to date."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const conf = typeIcons[item.type] || typeIcons.info;
            const Icon = conf.icon;
            const formattedDate = new Date(item.timestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={item.id}
                className={`relative flex items-start justify-between gap-4 rounded-xl border p-4 transition-all ${
                  item.read
                    ? 'border-slate-200 bg-white opacity-85'
                    : 'border-indigo-200 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/10'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${conf.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h3>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formattedDate}
                      </span>
                      {item.requestId && (
                        <Link
                          to={`/requests/${item.requestId}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                        >
                          <span>View {item.requestId}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!item.read && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkOne(item.id, e)}
                    title="Mark as read"
                    className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
