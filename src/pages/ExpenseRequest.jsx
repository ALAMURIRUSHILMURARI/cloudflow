import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Receipt, 
  ArrowLeft, 
  UploadCloud, 
  DollarSign, 
  FileText, 
  X, 
  Send,
  Calendar
} from 'lucide-react';
import { Input, Textarea, Select } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { addRequest } from '../store/slices/requestSlice';
import { addNotification } from '../store/slices/notificationSlice';
import requestService from '../services/requestService';
import uploadService from '../services/uploadService';
import notificationService from '../services/notificationService';
import { WORKFLOW_DEFINITIONS } from '../data/mockData';

export const ExpenseRequest = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    title: '',
    expenseCategory: 'Travel & Conferences',
    amount: '',
    currency: 'USD',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    priority: 'Normal',
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptMeta, setReceiptMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const workflowSteps = WORKFLOW_DEFINITIONS.expense.steps;

  const categoryOptions = [
    { value: 'Travel & Conferences', label: 'Travel & Conferences' },
    { value: 'Hardware & Peripheral Reimbursement', label: 'Hardware & Peripheral Reimbursement' },
    { value: 'Books, Subscriptions & Certifications', label: 'Books, Subscriptions & Certifications' },
    { value: 'Client Entertainment & Meals', label: 'Client Entertainment & Meals' },
    { value: 'Cell Phone & Remote Work Utility', label: 'Cell Phone & Remote Work Utility' },
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
      const uploaded = await uploadService.uploadAttachment(file);
      setReceiptFile(file);
      setReceiptMeta(uploaded);
      if (errors.receipt) {
        setErrors((prev) => ({ ...prev, receipt: null }));
      }
    } catch (err) {
      console.error('Receipt upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptMeta(null);
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Expense title is required';
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      errs.amount = 'Valid expense amount is required';
    }
    if (!formData.expenseDate) errs.expenseDate = 'Expense date is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (!receiptMeta) errs.receipt = 'Itemized receipt upload is required for audit compliance';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        type: 'expense',
        title: formData.title,
        priority: formData.priority,
        requester: {
          name: user?.name || 'Alex Morgan',
          email: user?.email || 'employee@cloudflow.demo',
          department: user?.department || 'Cloud Infrastructure',
          employeeId: user?.employeeId || 'CF-1042'
        },
        data: {
          expenseCategory: formData.expenseCategory,
          amount: Number(formData.amount),
          currency: formData.currency,
          expenseDate: formData.expenseDate,
          description: formData.description,
          receiptUpload: receiptMeta.fileName,
          receiptSize: receiptMeta.fileSize,
          s3Url: receiptMeta.s3Url,
        }
      };

      const newRequest = await requestService.createRequest(payload);
      dispatch(addRequest(newRequest));

      // Trigger Notification
      const notif = await notificationService.createNotification({
        title: 'Expense Claim Submitted',
        message: `${newRequest.id} ($${Number(formData.amount).toFixed(2)}) submitted for Department Manager review.`,
        type: 'info',
        requestId: newRequest.id
      });
      dispatch(addNotification(notif));

      navigate(`/requests/${newRequest.id}`);
    } catch (err) {
      console.error('Failed to submit expense claim:', err);
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
      <div className="rounded-2xl bg-gradient-to-r from-amber-700 to-orange-800 text-white p-6 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Expense Claim</h1>
            <p className="text-xs text-amber-200">Reimbursement for Travel, Conferences, Lab & Remote Utility Costs</p>
          </div>
        </div>

        {/* Workflow Chain Preview */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-2">
            Execution Pipeline:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {workflowSteps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <span className="bg-white/15 px-2.5 py-1 rounded-md text-white font-medium text-[11px]">
                  {idx + 1}. {s.label}
                </span>
                {idx < workflowSteps.length - 1 && (
                  <span className="text-amber-300 font-bold">→</span>
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
              label="Expense Claim Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. IEEE Cloud Summit Conference Travel & Registration"
              error={errors.title}
              required
            />
          </div>

          <Select
            label="Expense Category"
            name="expenseCategory"
            value={formData.expenseCategory}
            onChange={handleChange}
            options={categoryOptions}
            required
          />

          <Input
            label="Date Incurred"
            name="expenseDate"
            type="date"
            value={formData.expenseDate}
            onChange={handleChange}
            error={errors.expenseDate}
            icon={Calendar}
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                label="Reimbursement Amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                icon={DollarSign}
                error={errors.amount}
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
              label="Itemized Description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="List individual items, locations, travel dates, or business purposes..."
              error={errors.description}
              required
            />
          </div>

          {/* Receipt File Upload */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Itemized Receipt Bundle <span className="text-rose-500">*</span>
            </label>

            {!receiptMeta ? (
              <div>
                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-slate-100/70 transition-all">
                  <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    {uploading ? 'Processing S3 Presigned Upload...' : 'Click to upload receipt PDF, PNG, or JPG'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">Maximum 10 MB per file</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={uploading}
                  />
                </label>
                {errors.receipt && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.receipt}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{receiptMeta.fileName}</p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      {receiptMeta.fileSize} • S3 Storage Encrypted
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
            Submit Expense Claim
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseRequest;
