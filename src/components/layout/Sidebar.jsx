import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  CheckSquare, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Layers,
  Cloud,
  ChevronRight
} from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import authService from '../../services/authService';

export const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);
  const { pendingApprovals } = useSelector((state) => state.approvals);

  const handleLogout = async () => {
    await authService.logout();
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Requests', path: '/requests', icon: FileText },
    { label: 'New Request', path: '/requests/new', icon: PlusCircle },
    { 
      label: 'Approvals', 
      path: '/approvals', 
      icon: CheckSquare,
      badge: pendingApprovals?.length || 0,
      badgeColor: 'bg-amber-100 text-amber-700'
    },
    { 
      label: 'Notifications', 
      path: '/notifications', 
      icon: Bell,
      badge: unreadCount || 0,
      badgeColor: 'bg-rose-100 text-rose-700'
    },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-slate-900 tracking-tight">CloudFlow</span>
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">v1.0</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate w-36">Serverless Workflows</p>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Architecture Status Badge Box */}
          <div className="pt-4">
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-slate-50 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-4 w-4 text-indigo-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">Architecture Mode</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 mb-2">
                <strong className="text-indigo-900 font-semibold">Demo / Integration Pending</strong>
              </p>
              <div className="text-[10px] text-slate-500 font-mono bg-white/80 rounded border border-indigo-50 px-2 py-1">
                AWS Cognito + API Gateway
              </div>
            </div>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name || 'User'}
                className="h-8 w-8 rounded-full object-cover border border-slate-200"
              />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Alex Morgan'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.role || 'Employee'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600 transition-colors shadow-none hover:shadow-xs"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
