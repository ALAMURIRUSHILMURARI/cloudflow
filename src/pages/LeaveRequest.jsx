import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Clock, 
  UserCheck, 
  Send,
  AlertCircle
} from 'lucide-react';
import { Input, Textarea, Select } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { addRequest } from '../store/slices/requestSlice';
import { addNotification } from '../store/slices/notificationSlice';
import requestService from '../services/requestService';
import notificationService from '../services/notificationService';
import { WORKFLOW_DEFINITIONS } from '../data/mockData';

export const LeaveRequest = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    leaveType: 'Annual Vacation Leave',
    startDate: '',
    endDate: '',
    reason: '',
    handoverContact: '',
    priority: 'Normal'
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const workflowSteps = WORKFLOW_DEFINITIONS.leave.steps;

  const leaveTypeOptions = [
    { value: 'Annual Vacation Leave', label: 'Annual Vacation Leave' },
    { value: 'Medical & Sick Leave', label: 'Medical & Sick Leave' },
    { value: 'Academic & Research Recess', label: 'Academic & Research Recess' },
    { value: 'Conference & Offsite Attendance', label: 'Conference & Offsite Attendance' },
    { value: 'Casual / Personal Leave', label: 'Casual / Personal Leave' },
    { value: 'Parental Leave', label: 'Parental Leave' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const validate = () => {
    const errs = {};
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.endDate) errs.endDate = 'End date is required';
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        errs.endDate = 'End date cannot be earlier than start date';
      }
    }
    if (!formData.reason.trim()) {
      errs.reason = 'Reason for leave is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const days = calculateDays();
      const title = `${formData.leaveType} (${days} ${days === 1 ? 'Day' : 'Days'})`;

      const payload = {
        type: 'leave',
        title,
        priority: formData.priority,
        requester: {
          name: user?.name || 'Alex Morgan',
          email: user?.email || 'employee@cloudflow.demo',
          department: user?.department || 'Cloud Infrastructure',
          employeeId: user?.employeeId || 'CF-1042'
        },
        data: {
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          durationDays: days,
          reason: formData.reason,
          handoverContact: formData.handoverContact || 'Engineering On-Call Rotation'
        }
      };

      const newRequest = await requestService.createRequest(payload);
      dispatch(addRequest(newRequest));

      // Notification
      const notif = await notificationService.createNotification({
        title: 'Leave Application Submitted',
        message: `${newRequest.id} (${title}) submitted for Manager review.`,
        type: 'info',
        requestId: newRequest.id
      });
      dispatch(addNotification(notif));

      navigate(`/requests/${newRequest.id}`);
    } catch (err) {
      console.error('Failed to submit leave request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const durationDays = calculateDays();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          to="/requests/new"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Request Hub</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Leave Application</h1>
            <p className="text-xs text-emerald-200">Time-off, Vacation, Academic Research & Health Recess</p>
          </div>
        </div>

        {/* Workflow Chain Preview */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-2">
            Execution Pipeline:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {workflowSteps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <span className="bg-white/15 px-2.5 py-1 rounded-md text-white font-medium text-[11px]">
                  {idx + 1}. {s.label}
                </span>
                {idx < workflowSteps.length - 1 && (
                  <span className="text-emerald-300 font-bold">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Select
              label="Leave Type"
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              options={leaveTypeOptions}
              required
            />
          </div>

          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            error={errors.startDate}
            required
          />

          <Input
            label="End Date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            error={errors.endDate}
            required
          />

          {/* Duration Summary Pill */}
          {durationDays > 0 && (
            <div className="md:col-span-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>Total Requested Duration:</span>
              </div>
              <span className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                {durationDays} {durationDays === 1 ? 'Working Day' : 'Working Days'}
              </span>
            </div>
          )}

          <div className="md:col-span-2">
            <Input
              label="Work Handover / Backup Contact"
              name="handoverContact"
              value={formData.handoverContact}
              onChange={handleChange}
              placeholder="e.g. Sarah Jenkins / Cloud Operations Secondary Lead"
              helperText="Specify who will manage critical sprint deliverables during your absence."
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Reason for Leave"
              name="reason"
              rows={4}
              value={formData.reason}
              onChange={handleChange}
              placeholder="Provide context for this leave request..."
              error={errors.reason}
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <Button
            variant="secondary"
            onClick={() => navigate('/requests/new')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            icon={Send}
          >
            Submit Leave Application
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequest;
