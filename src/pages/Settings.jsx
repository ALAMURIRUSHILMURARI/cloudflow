import React, { useState } from 'react';
import { 
  Bell, 
  Moon, 
  Sun, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Smartphone, 
  Server, 
  Lock,
  RotateCcw
} from 'lucide-react';
import { Button } from '../components/common/Button';

const SETTINGS_STORAGE_KEY = 'cloudflow_app_settings';

export const Settings = () => {
  const getInitialSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        emailNotifications: true,
        workflowUpdates: true,
        approvalAlerts: true,
        systemBroadcasts: false,
        theme: 'light',
        mfaEnabled: true,
        sessionTimeout: '8h'
      };
    } catch {
      return {
        emailNotifications: true,
        workflowUpdates: true,
        approvalAlerts: true,
        systemBroadcasts: false,
        theme: 'light',
        mfaEnabled: true,
        sessionTimeout: '8h'
      };
    }
  };

  const [settings, setSettings] = useState(getInitialSettings);
  const [saved, setSaved] = useState(false);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSelect = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    const defaults = {
      emailNotifications: true,
      workflowUpdates: true,
      approvalAlerts: true,
      systemBroadcasts: false,
      theme: 'light',
      mfaEnabled: true,
      sessionTimeout: '8h'
    };
    setSettings(defaults);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    setSaved(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System & Application Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage notification dispatch channels, UI theme, and security compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RotateCcw} onClick={handleReset}>
            Reset Defaults
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Preferences saved successfully to local configuration store.</span>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <Bell className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Notification Dispatch Preferences
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              id: 'emailNotifications',
              title: 'Amazon SES Email Dispatch',
              desc: 'Receive transactional emails when requisitions are submitted or assigned.'
            },
            {
              id: 'workflowUpdates',
              title: 'Workflow Stage Transitions',
              desc: 'Notify when an active request moves from Manager to Procurement/Finance.'
            },
            {
              id: 'approvalAlerts',
              title: 'Immediate Approval Action Alerts',
              desc: 'Send urgent notifications when requests require your direct authorization.'
            },
            {
              id: 'systemBroadcasts',
              title: 'Multi-Cloud Testbed Maintenance Announcements',
              desc: 'Receive alerts regarding planned edge node downtime or benchmark runs.'
            }
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={settings[item.id]}
                  onChange={() => handleToggle(item.id)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Preferences */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <Sun className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Interface Theme & Presentation
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light Enterprise', icon: Sun, desc: 'Clean high-contrast SaaS' },
            { id: 'dark', label: 'Dark Mode (Preview)', icon: Moon, desc: 'Low-light lab terminal' },
            { id: 'system', label: 'System Automatic', icon: Smartphone, desc: 'Sync with OS preference' },
          ].map((theme) => {
            const Icon = theme.icon;
            const isSelected = settings.theme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelect('theme', theme.id)}
                className={`flex flex-col items-center text-center p-4 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="font-bold text-slate-900">{theme.label}</span>
                <span className="text-[10px] text-slate-400 mt-1">{theme.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security & AWS Cognito Configuration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Account Security & Cognito IAM
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-900">Multi-Factor Authentication (MFA)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">TOTP Authenticator app enforcement for privileged actions.</p>
            </div>
            <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              Enforced by Policy
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-900">Session Inactivity Timeout</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Automatic JWT token refresh and session invalidation.</p>
            </div>
            <span className="font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded">
              8 Hours
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
