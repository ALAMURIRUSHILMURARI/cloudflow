import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ShieldCheck, 
  ArrowLeft, 
  KeyRound, 
  Clock, 
  Send,
  Lock,
  Cpu
} from 'lucide-react';
import { Input, Textarea, Select } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { addRequest } from '../store/slices/requestSlice';
import { addNotification } from '../store/slices/notificationSlice';
import requestService from '../services/requestService';
import notificationService from '../services/notificationService';
import { WORKFLOW_DEFINITIONS } from '../data/mockData';

export const SoftwareAccessRequest = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    softwareName: 'AWS Console & CLI Enterprise IAM',
    accessLevel: 'Developer (Read/Write)',
    requiredDuration: '90 Days',
    businessJustification: '',
    targetEnvironment: 'Staging & Production Lab',
    priority: 'Normal',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const workflowSteps = WORKFLOW_DEFINITIONS.software.steps;

  const softwareOptions = [
    { value: 'AWS Console & CLI Enterprise IAM', label: 'AWS Console & CLI Enterprise IAM' },
    { value: 'GitHub Enterprise Organization Admin', label: 'GitHub Enterprise Organization Admin' },
    { value: 'Datadog Enterprise APM & Distributed Tracing', label: 'Datadog Enterprise APM & Distributed Tracing' },
    { value: 'HashiCorp Terraform Cloud Workspace', label: 'HashiCorp Terraform Cloud Workspace' },
    { value: 'Kubernetes Multi-Cluster Admin Context', label: 'Kubernetes Multi-Cluster Admin Context' },
    { value: 'Jira Software & Confluence Enterprise Space', label: 'Jira Software & Confluence Enterprise Space' },
    { value: 'Custom Internal Tool / Service Token', label: 'Custom Internal Tool / Service Token' },
  ];

  const accessLevelOptions = [
    { value: 'Read Only (Auditor)', label: 'Read Only (Auditor)' },
    { value: 'Standard Contributor', label: 'Standard Contributor' },
    { value: 'Developer (Read/Write)', label: 'Developer (Read/Write)' },
    { value: 'Administrator / Elevated IAM Role', label: 'Administrator / Elevated IAM Role' },
  ];

  const durationOptions = [
    { value: '14 Days (Temporary Project)', label: '14 Days (Temporary Project)' },
    { value: '30 Days (Sprint Cycle)', label: '30 Days (Sprint Cycle)' },
    { value: '90 Days (Quarterly)', label: '90 Days (Quarterly)' },
    { value: '1 Year (Annual)', label: '1 Year (Annual)' },
    { value: 'Permanent (Core Responsibility)', label: 'Permanent (Core Responsibility)' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.softwareName.trim()) errs.softwareName = 'Software selection is required';
    if (!formData.businessJustification.trim()) {
      errs.businessJustification = 'Business justification and least-privilege rationale are required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        type: 'software',
        title: `${formData.softwareName} Access`,
        priority: formData.priority,
        requester: {
          name: user?.name || 'Alex Morgan',
          email: user?.email || 'employee@cloudflow.demo',
          department: user?.department || 'Cloud Infrastructure',
          employeeId: user?.employeeId || 'CF-1042'
        },
        data: {
          softwareName: formData.softwareName,
          accessLevel: formData.accessLevel,
          requiredDuration: formData.requiredDuration,
          targetEnvironment: formData.targetEnvironment,
          businessJustification: formData.businessJustification,
        }
      };

      const newRequest = await requestService.createRequest(payload);
      dispatch(addRequest(newRequest));

      // Trigger Notification
      const notif = await notificationService.createNotification({
        title: 'Software Access Requisition Submitted',
        message: `${newRequest.id} (${formData.softwareName}) routed for Manager and SecOps review.`,
        type: 'info',
        requestId: newRequest.id
      });
      dispatch(addNotification(notif));

      navigate(`/requests/${newRequest.id}`);
    } catch (err) {
      console.error('Failed to submit software access request:', err);
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Software Access Requisition</h1>
            <p className="text-xs text-indigo-200">IAM Roles, Cloud Subscriptions, Developer Tooling & SCIM Provisioning</p>
          </div>
        </div>

        {/* Workflow Chain Preview */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-2">
            Execution Pipeline:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {workflowSteps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <span className="bg-white/15 px-2.5 py-1 rounded-md text-white font-medium text-[11px]">
                  {idx + 1}. {s.label}
                </span>
                {idx < workflowSteps.length - 1 && (
                  <span className="text-indigo-300 font-bold">→</span>
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
              label="Target Software Application / Service"
              name="softwareName"
              value={formData.softwareName}
              onChange={handleChange}
              options={softwareOptions}
              required
            />
          </div>

          <Select
            label="Requested Access Level"
            name="accessLevel"
            value={formData.accessLevel}
            onChange={handleChange}
            options={accessLevelOptions}
            required
          />

          <Select
            label="Required Duration"
            name="requiredDuration"
            value={formData.requiredDuration}
            onChange={handleChange}
            options={durationOptions}
            required
          />

          <div className="md:col-span-2">
            <Input
              label="Target Environment / Account ID"
              name="targetEnvironment"
              value={formData.targetEnvironment}
              onChange={handleChange}
              placeholder="e.g. AWS Account 123456789012 (us-east-1 VPC)"
              helperText="Specify the cloud environment or tenant domain where access is needed."
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Business Justification & Security Rationale"
              name="businessJustification"
              rows={4}
              value={formData.businessJustification}
              onChange={handleChange}
              placeholder="Describe what tasks you will perform and justify why least-privilege access is satisfied..."
              error={errors.businessJustification}
              required
            />
          </div>
        </div>

        {/* Security Policy Notice */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-start gap-3">
          <KeyRound className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Automated IAM Grant & Provisioning</p>
            <p className="mt-0.5 text-slate-500 leading-relaxed">
              Upon SecOps approval, CloudFlow triggers automated SCIM and AWS IAM Identity Center policies to provision temporary scoped credentials with MFA enforcement.
            </p>
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
            Submit Access Requisition
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SoftwareAccessRequest;
