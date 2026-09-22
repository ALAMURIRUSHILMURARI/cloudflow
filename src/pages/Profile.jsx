import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  User, 
  Mail, 
  Building, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit3, 
  CheckCircle2, 
  Key,
  Layers,
  Award
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { updateUserProfile } from '../store/slices/authSlice';
import authService from '../services/authService';

export const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || 'Alex Morgan',
    title: user?.title || 'Senior Cloud Engineer',
    department: user?.department || 'Cloud Infrastructure',
    phone: user?.phone || '+1 (555) 234-8901',
    location: user?.location || 'Austin Tech Hub, TX',
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleEditOpen = () => {
    setFormData({
      name: user?.name || '',
      title: user?.title || '',
      department: user?.department || '',
      phone: user?.phone || '',
      location: user?.location || '',
    });
    setSuccessMsg('');
    setEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateProfile(formData);
      dispatch(updateUserProfile(updated));
      setSuccessMsg('Profile information updated successfully!');
      setTimeout(() => {
        setEditModalOpen(false);
        setSuccessMsg('');
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Employee Profile & IAM Entitlements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enterprise Directory Record & AWS Cognito User Pool identity claims.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Edit3}
          onClick={handleEditOpen}
        >
          Edit Profile
        </Button>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={user?.name}
            className="h-24 w-24 rounded-2xl object-cover border-2 border-indigo-100 shadow-md"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">{user?.name}</h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {user?.role} Role
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-600">{user?.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Employee ID: <span className="font-mono font-bold text-slate-700">{user?.employeeId}</span> • Department: <span className="font-semibold text-slate-700">{user?.department}</span>
            </p>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Work Email
            </span>
            <p className="font-bold text-slate-900 font-mono text-sm">{user?.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Phone Number
            </span>
            <p className="font-bold text-slate-900 text-sm">{user?.phone || '+1 (555) 234-8901'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Office Location
            </span>
            <p className="font-bold text-slate-900 text-sm">{user?.location || 'Austin Tech Hub, TX'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Building className="h-3.5 w-3.5" /> Line Manager
            </span>
            <p className="font-bold text-slate-900 text-sm">{user?.manager || 'Sarah Jenkins'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined Date
            </span>
            <p className="font-bold text-slate-900 text-sm">{user?.joinDate || 'Jan 15, 2023'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Key className="h-3.5 w-3.5" /> SSO Identity Provider
            </span>
            <p className="font-bold text-indigo-600 text-sm">Amazon Cognito User Pool</p>
          </div>
        </div>
      </div>

      {/* IAM Permissions & Role Groups */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 mb-4">
          Assigned Workflow Privileges & Roles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <Award className="h-4 w-4 text-indigo-600" />
              <span>Requisition Initiator</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Authorized to generate Purchase Requisitions, Leave Applications, Expense Claims, and IAM Software Access requests.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Manager Reviewer</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Authorized to endorse and transition Stage-2 workflow steps for subordinates in the Engineering cluster.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-2">
              <Key className="h-4 w-4 text-purple-600" />
              <span>Multi-Cloud Testbed</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Scoped access to AWS us-east-1 VPC and Physical Edge node telemetry telemetry streaming.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Employee Profile"
        subtitle="Update directory details"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Job Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
          />

          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Input
            label="Office Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          {successMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Profile;
