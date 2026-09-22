import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Layers, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Info, 
  UserCheck, 
  Server, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { 
  loginSuccess, 
  loginFailure, 
  setLoading, 
  clearAuthError 
} from '../store/slices/authSlice';
import authService from '../services/authService';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('employee@cloudflow.demo');
  const [password, setPassword] = useState('demo1234');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');

  const demoAccounts = [
    {
      role: 'Employee',
      email: 'employee@cloudflow.demo',
      desc: 'Alex Morgan • Requisition Creator',
      badge: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      role: 'Manager',
      email: 'manager@cloudflow.demo',
      desc: 'Sarah Jenkins • Approval Authority',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      role: 'Administrator',
      email: 'admin@cloudflow.demo',
      desc: 'David Vance • System & IAM Admin',
      badge: 'bg-purple-50 text-purple-700 border-purple-200'
    }
  ];

  const handleLogin = async (e) => {
    e?.preventDefault();
    dispatch(setLoading(true));
    dispatch(clearAuthError());

    try {
      const session = await authService.login(email, password);
      dispatch(loginSuccess(session));
      const redirectPath = location.state?.from?.pathname || '/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      dispatch(loginFailure(err.message || 'Authentication failed. Please check credentials.'));
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    dispatch(clearAuthError());
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const res = await authService.forgotPassword(forgotEmail || email);
    setForgotMsg(res.message);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 mb-3">
            <Layers className="h-8 w-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            CloudFlow Platform
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium max-w-sm">
            Serverless Cloud Architecture • Multi-Cloud Active Resilience & Physical Edge Testbed
          </p>
        </div>

        {/* Main Login Card */}
        <div className="mt-8 bg-white/95 backdrop-blur rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200/50">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <Input
              label="Enterprise Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@cloudflow.demo"
              icon={Mail}
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMsg('');
                    setForgotEmail(email);
                    setForgotModalOpen(true);
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Forgot Password?
                </button>
              </div>
              <Input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
              icon={ArrowRight}
            >
              Sign In to CloudFlow
            </Button>
          </form>

          {/* Demo Credentials Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              <span>Demo Quick-Select Profiles</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    email === acc.email
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{acc.role}</span>
                      <span className="text-[11px] font-mono text-slate-500">{acc.email}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{acc.desc}</p>
                  </div>
                  {email === acc.email && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Academic Architecture Note */}
          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
              <Server className="h-3.5 w-3.5 text-indigo-600" />
              <span>Cognito Auth Integration Roadmap</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              `authService.js` is structured for seamless migration to AWS Cognito User Pool with SRP protocol and JWT token claims validation.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title="Reset Password"
        subtitle="Simulated Amazon SES password reset verification"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="user@cloudflow.demo"
            required
            icon={Mail}
          />
          {forgotMsg ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              {forgotMsg}
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setForgotModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="primary">
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Login;
