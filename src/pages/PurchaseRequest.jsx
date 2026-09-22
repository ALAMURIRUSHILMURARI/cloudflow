import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ShoppingCart, 
  ArrowLeft, 
  UploadCloud, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  FileText, 
  X,
  Send
} from 'lucide-react';
import { Input, Textarea, Select } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { addRequest } from '../store/slices/requestSlice';
import { addNotification } from '../store/slices/notificationSlice';
import requestService from '../services/requestService';
import uploadService from '../services/uploadService';
import notificationService from '../services/notificationService';
import { WORKFLOW_DEFINITIONS } from '../data/mockData';

export const PurchaseRequest = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Hardware & Edge Devices',
    quantity: 1,
    estimatedCost: '',
    currency: 'USD',
    businessJustification: '',
    priority: 'Normal',
  });

  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentMeta, setAttachmentMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const workflowSteps = WORKFLOW_DEFINITIONS.purchase.steps;

  const categoryOptions = [
    { value: 'Hardware & Edge Devices', label: 'Hardware & Edge Devices' },
    { value: 'Software & Subscriptions', label: 'Software & Subscriptions' },
    { value: 'Lab Testbed Equipment', label: 'Lab Testbed Equipment' },
    { value: 'Cloud Infrastructure Capacity', label: 'Cloud Infrastructure Capacity' },
    { value: 'Office Supplies & Peripherals', label: 'Office Supplies & Peripherals' },
  ];

  const priorityOptions = [
    { value: 'Low', label: 'Low Priority' },
    { value: 'Normal', label: 'Normal Priority' },
    { value: 'High', label: 'High Priority' },
    { value: 'Critical', label: 'Critical / Expedited' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Simulate S3 presigned URL generation and direct S3 PUT
      const uploaded = await uploadService.uploadAttachment(file);
      setAttachmentFile(file);
      setAttachmentMeta(uploaded);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setAttachmentFile(null);
    setAttachmentMeta(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.itemName.trim()) errs.itemName = 'Item name is required';
    if (!formData.quantity || formData.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    if (!formData.estimatedCost || isNaN(formData.estimatedCost) || Number(formData.estimatedCost) <= 0) {
      errs.estimatedCost = 'Enter a valid estimated cost';
    }
    if (!formData.businessJustification.trim()) {
      errs.businessJustification = 'Business justification is required';
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
        type: 'purchase',
        title: formData.itemName,
        priority: formData.priority,
        requester: {
          name: user?.name || 'Alex Morgan',
          email: user?.email || 'employee@cloudflow.demo',
          department: user?.department || 'Cloud Infrastructure',
          employeeId: user?.employeeId || 'CF-1042'
        },
        data: {
          itemName: formData.itemName,
          category: formData.category,
          quantity: Number(formData.quantity),
          estimatedCost: Number(formData.estimatedCost),
          currency: formData.currency,
          businessJustification: formData.businessJustification,
          attachment: attachmentMeta ? attachmentMeta.fileName : null,
          attachmentSize: attachmentMeta ? attachmentMeta.fileSize : null,
          s3Url: attachmentMeta ? attachmentMeta.s3Url : null,
        }
      };

      const newRequest = await requestService.createRequest(payload);
      dispatch(addRequest(newRequest));

      // Trigger notification
      const notif = await notificationService.createNotification({
        title: 'Purchase Request Submitted',
        message: `${newRequest.id} (${newRequest.title}) has been submitted and assigned to Manager review.`,
        type: 'info',
        requestId: newRequest.id
      });
      dispatch(addNotification(notif));

      // Navigate to details
      navigate(`/requests/${newRequest.id}`);
    } catch (err) {
      console.error('Failed to submit purchase request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Breadcrumb */}
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
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Purchase Requisition</h1>
            <p className="text-xs text-blue-200">Hardware, Testbed Nodes & Commercial Software Procurement</p>
          </div>
        </div>

        {/* Workflow Chain Preview */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-2">
            Execution Pipeline:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {workflowSteps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <span className="bg-white/15 px-2.5 py-1 rounded-md text-white font-medium text-[11px]">
                  {idx + 1}. {s.label}
                </span>
                {idx < workflowSteps.length - 1 && (
                  <span className="text-blue-300 font-bold">→</span>
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
            <Input
              label="Item / Requisition Name"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              placeholder="e.g. NVIDIA Jetson AGX Orin Industrial Module Kit"
              error={errors.itemName}
              required
            />
          </div>

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            options={categoryOptions}
            required
          />

          <Select
            label="Priority Level"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            options={priorityOptions}
            required
          />

          <Input
            label="Quantity"
            name="quantity"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            error={errors.quantity}
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                label="Estimated Total Cost"
                name="estimatedCost"
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={handleChange}
                placeholder="0.00"
                icon={DollarSign}
                error={errors.estimatedCost}
                required
              />
            </div>
            <div>
              <Select
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'INR', label: 'INR (₹)' },
                ]}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Business Justification & Impact"
              name="businessJustification"
              rows={4}
              value={formData.businessJustification}
              onChange={handleChange}
              placeholder="Explain why this purchase is required for your project or research..."
              error={errors.businessJustification}
              helperText="Provide vendor quotation details or grant allocation numbers if applicable."
              required
            />
          </div>

          {/* S3 Attachment Upload Area */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Supporting Documentation / Vendor Quote (Optional)
            </label>

            {!attachmentMeta ? (
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-100/70 transition-all">
                <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">
                  {uploading ? 'Negotiating S3 Presigned URL & Uploading...' : 'Click to select quote PDF or specification sheet'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">PDF, PNG, JPG or DOCX up to 10 MB</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{attachmentMeta.fileName}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      {attachmentMeta.fileSize} • S3 Mock Upload Complete
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
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
            Submit Purchase Requisition
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseRequest;
