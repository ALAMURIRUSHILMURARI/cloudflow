import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Calendar, 
  Receipt, 
  ShieldCheck, 
  Clock, 
  User, 
  FileText, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Building, 
  DollarSign, 
  Layers,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { RequestStatusBadge } from '../components/requests/RequestStatusBadge';
import { RequestTimeline } from '../components/requests/RequestTimeline';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Textarea } from '../components/common/Input';
import { Loading } from '../components/common/Loading';
import { updateRequest } from '../store/slices/requestSlice';
import { addNotification } from '../store/slices/notificationSlice';
import requestService from '../services/requestService';
import approvalService from '../services/approvalService';
import notificationService from '../services/notificationService';

const typeIcons = {
  purchase: ShoppingCart,
  leave: Calendar,
  expense: Receipt,
  software: ShieldCheck,
};

const typeLabels = {
  purchase: 'Purchase Requisition',
  leave: 'Leave Application',
  expense: 'Expense Claim',
  software: 'Software Access Requisition',
};

export const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { requests } = useSelector((state) => state.requests);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Approval modal states
  const [modalType, setModalType] = useState(null); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await requestService.getRequestById(id);
        setRequest(data);
      } catch (err) {
        setError(err.message || 'Failed to load request details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, requests]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const updated = await approvalService.approveRequest(request.id, {
        approverName: user?.name || 'Manager',
        comments: comments || 'Approved by reviewer'
      });
      setRequest(updated);
      dispatch(updateRequest(updated));

      const notif = await notificationService.createNotification({
        title: 'Request Approved',
        message: `${request.id} (${request.title}) was approved by ${user?.name}.`,
        type: 'success',
        requestId: request.id
      });
      dispatch(addNotification(notif));

      setModalType(null);
      setComments('');
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) return;

    setActionLoading(true);
    try {
      const updated = await approvalService.rejectRequest(request.id, {
        approverName: user?.name || 'Reviewer',
        reason: comments
      });
      setRequest(updated);
      dispatch(updateRequest(updated));

      const notif = await notificationService.createNotification({
        title: 'Request Rejected',
        message: `${request.id} was rejected by ${user?.name}. Reason: ${comments}`,
        type: 'error',
        requestId: request.id
      });
      dispatch(addNotification(notif));

      setModalType(null);
      setComments('');
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading requisition execution graph..." size="lg" />;
  }

  if (error || !request) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto mb-3" />
        <h2 className="text-base font-bold text-rose-900">Request Not Found</h2>
        <p className="text-xs text-rose-700 mt-1 mb-6">{error || `No requisition exists with ID: ${id}`}</p>
        <Button variant="primary" onClick={() => navigate('/requests')}>
          Return to My Requests
        </Button>
      </div>
    );
  }

  const Icon = typeIcons[request.type] || FileText;
  const typeLabel = typeLabels[request.type] || 'Workflow Request';

  const createdFormatted = new Date(request.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar with Back Link and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Requisitions</span>
        </Link>

        {request.status === 'Pending' && (
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => {
                setComments('');
                setModalType('reject');
              }}
            >
              Reject Requisition
            </Button>
            <Button
              variant="success"
              size="sm"
              icon={CheckCircle2}
              onClick={() => {
                setComments('Approved. Meets departmental policy requirements.');
                setModalType('approve');
              }}
            >
              Approve Step
            </Button>
          </div>
        )}
      </div>

      {/* Main Request Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-mono text-base font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {request.id}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700">
                <Icon className="h-3.5 w-3.5" />
                {typeLabel}
              </span>
              <RequestStatusBadge status={request.status} size="md" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {request.title}
            </h1>
          </div>

          <div className="text-xs text-slate-500 md:text-right">
            <p className="font-semibold text-slate-700">Initiated on:</p>
            <p className="mt-0.5">{createdFormatted}</p>
          </div>
        </div>

        {/* Requester Identity Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Requester Name</span>
            <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              {request.requester?.name || 'Alex Morgan'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Department</span>
            <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              {request.requester?.department || 'Cloud Infrastructure'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Employee ID</span>
            <p className="font-mono font-bold text-slate-800 mt-0.5">
              {request.requester?.employeeId || 'CF-1042'}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Priority</span>
            <p className="font-bold text-slate-800 mt-0.5">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px]">
                {request.priority || 'Normal'}
              </span>
            </p>
          </div>
        </div>

        {/* Workflow State Tracker */}
        <div className="pt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Execution Pipeline ({request.workflow?.length || 5} Stages)
          </h2>
          <RequestTimeline
            workflow={request.workflow}
            stepHistory={request.stepHistory}
            currentStepIndex={request.currentStepIndex}
            overallStatus={request.status}
          />
        </div>
      </div>

      {/* Requisition Specific Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3">
            Requisition Specifics & Data Payload
          </h2>

          {/* Type-Specific Field Views */}
          {request.type === 'purchase' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Item Name</span>
                  <p className="font-bold text-slate-900 mt-1 text-sm">{request.data?.itemName}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Category</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.category}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Quantity</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.quantity} Units</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Estimated Cost</span>
                  <p className="font-bold text-indigo-700 mt-1 text-sm">
                    {request.data?.currency || '$'} {Number(request.data?.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Business Justification</span>
                <p className="mt-1 p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-100">
                  {request.data?.businessJustification || 'No justification provided.'}
                </p>
              </div>
            </div>
          )}

          {request.type === 'leave' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Leave Type</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.leaveType}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Duration</span>
                  <p className="font-bold text-emerald-700 mt-1">{request.data?.durationDays} Days</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Coverage Contact</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.handoverContact || 'Team on-call'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Start Date</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.startDate}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">End Date</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.endDate}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Reason for Leave</span>
                <p className="mt-1 p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-100">
                  {request.data?.reason || 'No description provided.'}
                </p>
              </div>
            </div>
          )}

          {request.type === 'expense' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Category</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.expenseCategory}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Claim Amount</span>
                  <p className="font-bold text-amber-700 mt-1 text-sm">
                    {request.data?.currency || '$'} {Number(request.data?.amount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Date Incurred</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.expenseDate}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Itemized Description</span>
                <p className="mt-1 p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-100">
                  {request.data?.description || 'No description provided.'}
                </p>
              </div>
            </div>
          )}

          {request.type === 'software' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Software</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.softwareName}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Access Level</span>
                  <p className="font-bold text-indigo-700 mt-1">{request.data?.accessLevel}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <span className="text-slate-400">Duration</span>
                  <p className="font-bold text-slate-900 mt-1">{request.data?.requiredDuration}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Business & Least-Privilege Justification</span>
                <p className="mt-1 p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed border border-slate-100">
                  {request.data?.businessJustification || 'No justification provided.'}
                </p>
              </div>
            </div>
          )}

          {/* S3 Attachment View if Available */}
          {(request.data?.attachment || request.data?.receiptUpload) && (
            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">
                Attached Documentation (Amazon S3 Storage)
              </span>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {request.data.attachment || request.data.receiptUpload}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {request.data.attachmentSize || request.data.receiptSize || '1.2 MB'} • AES-256 S3 Managed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert(`Simulated downloading S3 document: ${request.data.attachment || request.data.receiptUpload}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log / Step History Sidebar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3 mb-4">
            Audit Trail & History
          </h2>

          <div className="space-y-4">
            {request.stepHistory?.map((step, idx) => (
              <div key={step.stepId || idx} className="text-xs border-l-2 border-slate-200 pl-3 py-1 relative">
                <div className={`absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ${
                  step.status === 'Approved' ? 'bg-emerald-500' :
                  step.status === 'Rejected' ? 'bg-rose-500' :
                  step.status === 'Pending' ? 'bg-amber-500' : 'bg-slate-300'
                }`} />

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{step.label}</span>
                  <span className={`text-[10px] font-semibold rounded px-1.5 py-0.2 ${
                    step.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                    step.status === 'Rejected' ? 'bg-rose-50 text-rose-700' :
                    step.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {step.status}
                  </span>
                </div>

                <p className="text-slate-600 text-[11px] mt-1">{step.notes}</p>
                {step.actor && (
                  <p className="text-slate-400 text-[10px] mt-0.5">By: {step.actor}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={modalType === 'approve'}
        onClose={() => setModalType(null)}
        title="Approve Workflow Stage"
        subtitle={`Advance requisition ${request.id} to next stage`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            You are approving this request on behalf of <strong>{user?.name || 'Reviewer'}</strong> ({user?.role || 'Manager'}).
          </p>
          <Textarea
            label="Approval Comments / Notes"
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add optional notes for the audit trail..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalType(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleApprove} isLoading={actionLoading} icon={CheckCircle2}>
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={modalType === 'reject'}
        onClose={() => setModalType(null)}
        title="Reject Requisition"
        subtitle={`Deny and terminate workflow for ${request.id}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-rose-600">
            Rejecting this request will terminate the execution state machine and notify the requester.
          </p>
          <Textarea
            label="Reason for Rejection *"
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Specify reason (e.g. Budget exceeded, insufficient justification)..."
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalType(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} isLoading={actionLoading} disabled={!comments.trim()} icon={XCircle}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RequestDetails;
