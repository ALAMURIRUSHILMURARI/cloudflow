import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  Cloud, 
  Server, 
  Cpu, 
  Database, 
  HardDrive,
  ShoppingCart,
  Calendar,
  Receipt,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import RecentRequests from '../components/dashboard/RecentRequests';
import ActivityFeed from '../components/dashboard/ActivityFeed';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { requests } = useSelector((state) => state.requests);

  // Dynamic request metrics calculation
  const totalCount = requests.length || 24;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  const quickWorkflows = [
    {
      title: 'Purchase Requisition',
      path: '/requests/new/purchase',
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100/80 border-blue-200',
      stages: '5 Stages'
    },
    {
      title: 'Leave Application',
      path: '/requests/new/leave',
      icon: Calendar,
      color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200',
      stages: '5 Stages'
    },
    {
      title: 'Expense Claim',
      path: '/requests/new/expense',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100/80 border-amber-200',
      stages: '5 Stages'
    },
    {
      title: 'Software Access',
      path: '/requests/new/software-access',
      icon: ShieldCheck,
      color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border-indigo-200',
      stages: '5 Stages'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'Alex Morgan'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Role: <span className="font-semibold text-slate-700">{user?.role || 'Employee'}</span> • Department: <span className="font-semibold text-slate-700">{user?.department || 'Engineering'}</span>
          </p>
        </div>

        <Link
          to="/requests/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create Workflow Request</span>
        </Link>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={totalCount}
          subtitle="All lifecycle requisitions"
          icon={FileText}
          color="indigo"
          onClick={() => navigate('/requests')}
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          subtitle="Awaiting approvals"
          icon={Clock}
          color="amber"
          onClick={() => navigate('/requests')}
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          subtitle="Executed & provisioned"
          icon={CheckCircle2}
          color="emerald"
          onClick={() => navigate('/requests')}
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          subtitle="Denied or terminated"
          icon={XCircle}
          color="rose"
          onClick={() => navigate('/requests')}
        />
      </div>

      {/* System Status Banner - Explicitly specifies Demo / Integration Pending */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">System Integration Status</h3>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  Demo / Integration Pending
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Current prototype uses client-side mock orchestration for academic demonstration & UI validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>AWS Backend Target: us-east-1</span>
          </div>
        </div>

        {/* Cloud Architecture Pipeline Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <Cloud className="h-4 w-4 text-indigo-600" />
              <span>SPA Frontend</span>
            </div>
            <p className="text-[11px] text-slate-500">React 18 + Vite + Tailwind</p>
            <span className="mt-2 inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ● Active & Functional
            </span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <Server className="h-4 w-4 text-indigo-600" />
              <span>Auth Service</span>
            </div>
            <p className="text-[11px] text-slate-500">Amazon Cognito User Pool</p>
            <span className="mt-2 inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              ◌ Mock Layer Ready
            </span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <Cpu className="h-4 w-4 text-indigo-600" />
              <span>Orchestration</span>
            </div>
            <p className="text-[11px] text-slate-500">AWS Step Functions + Lambda</p>
            <span className="mt-2 inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              ◌ Architecture Mapped
            </span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
              <Database className="h-4 w-4 text-indigo-600" />
              <span>Storage & S3</span>
            </div>
            <p className="text-[11px] text-slate-500">DynamoDB & S3 Presigned</p>
            <span className="mt-2 inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              ◌ Schemas Defined
            </span>
          </div>
        </div>
      </div>

      {/* Quick Request Launch Bar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Quick Workflow Launchers
          </h2>
          <Link to="/requests/new" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            All categories →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickWorkflows.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between rounded-xl border p-3.5 transition-all shadow-2xs hover:shadow-xs ${item.color}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-bold">{item.title}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] opacity-75">
                  <span>{item.stages}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Recent Requests & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentRequests requests={requests} />
        </div>
        <div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
