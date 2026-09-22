import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  ShoppingCart, 
  Calendar, 
  Receipt, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Textarea } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { updateRequest } from '../store/slices/requestSlice';
import { removePendingApproval } from '../store/slices/approvalSlice';
import { addNotification } from '../store/slices/notificationSlice';
import approvalService from '../services/approvalService';
import notificationService from '../services/notificationService';

const typeIcons = {
  purchase: ShoppingCart,
  leave: Calendar,
  expense: Receipt,
  software: ShieldCheck,
};

export const Approvals = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { requests } = useSelector((state) => state.requests);

  const [selectedReq, setSelectedReq] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'approve' | 'reject'
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter requests that are currently in 'Pending' status
  const pendingList = requests.filter((r) => r.status === 'Pending');

  const handleOpenAction = (req, action) => {
    setSelectedReq(req);
    setModalAction(action);
    setNotes(action === 'approve' ? 'Approved. Verified against department policy.' : '');
  };

  const handleConfirmApproval = async () => {
    if (!selectedReq) return;
    setIsSubmitting(true);

    try {
      const updated = await approvalService.approveRequest(selectedReq.id, {
        approverName: user?.name || 'Reviewer',
        comments: notes
      });

      dispatch(updateRequest(updated));
      if (updated.status !== 'Pending') {
        dispatch(removePendingApproval(selectedReq.id));
      }

      const notif = await notificationService.createNotification({
        title: 'Requisition Approved',
        message: `${selectedReq.id} was approved by ${user?.name}.`,
        type: 'success',
        requestId: selectedReq.id
      });
      dispatch(addNotification(notif));

      setModalAction(null);
      setSelectedReq(null);
      setNotes('');
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedReq || !notes.trim()) return;
    setIsSubmitting(true);

    try {
      const updated = await approvalService.rejectRequest(selectedReq.id, {
        approverName: user?.name || 'Reviewer',
        reason: notes
      });

      dispatch(updateRequest(updated));
      dispatch(removePendingApproval(selectedReq.id));

      const notif = await notificationService.createNotification({
        title: 'Requisition Rejected',
        message: `${selectedReq.id} was rejected by ${user?.name}.`,
        type: 'error',
        requestId: selectedReq.id
      });
      dispatch(addNotification(notif));

      setModalAction(null);
      setSelectedReq(null);
      setNotes('');
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Manager & Administrative Approvals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review pending requisitions awaiting line management, procurement, or security endorsement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800">
            {pendingList.length} Pending Actions
          </span>
        </div>
      </div>

      {/* Approvals Table / Card list */}
      {pendingList.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All Approval Queues are Clear"
          description="There are currently no requisitions awaiting your review or sign-off."
          actionLabel="View All Requisitions"
          onAction={() => navigate('/requests')}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Request ID</th>
                  <th scope="col" className="px-6 py-3.5">Requisition Title</th>
                  <th scope="col" className="px-6 py-3.5">Requester</th>
                  <th scope="col" className="px-6 py-3.5">Type</th>
                  <th scope="col" className="px-6 py-3.5">Current Stage</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendingList.map((req) => {
                  const Icon = typeIcons[req.type] || CheckSquare;
                  const dateStr = new Date(req.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        <Link to={`/requests/${req.id}`} className="hover:text-indigo-600 hover:underline">
                          {req.id}
                        </Link>
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 max-w-xs truncate">{req.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Submitted on {dateStr}</p>
                      </td>

                      {/* Requester */}
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">{req.requester?.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{req.requester?.department}</span>
                      </td>

                      {/* Type */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 capitalize">
                          <Icon className="h-3.5 w-3.5 text-indigo-500" />
                          {req.type}
                        </span>
                      </td>

                      {/* Current Step */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Clock className="h-3 w-3" />
                          {req.currentStep}
                        </span>
                      </td>

                      {/* Buttons: Approve / Reject / View Details */}
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={() => navigate(`/requests/${req.id}`)}
                          >
                            Details
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleOpenAction(req, 'reject')}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            icon={CheckCircle2}
                            onClick={() => handleOpenAction(req, 'approve')}
                          >
                            Approve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!modalAction}
        onClose={() => setModalAction(null)}
        title={modalAction === 'approve' ? 'Approve Requisition Step' : 'Reject Requisition'}
        subtitle={selectedReq ? `${selectedReq.id} - ${selectedReq.title}` : ''}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {modalAction === 'approve' 
              ? `You are confirming approval for stage "${selectedReq?.currentStep}". This will advance the workflow state machine.`
              : `You are denying this requisition. This will mark the workflow as Rejected and alert the requester.`}
          </p>

          <Textarea
            label={modalAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required) *'}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={modalAction === 'approve' ? 'Add review remarks...' : 'State reason for rejection...'}
            required={modalAction === 'reject'}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalAction(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            {modalAction === 'approve' ? (
              <Button
                variant="success"
                onClick={handleConfirmApproval}
                isLoading={isSubmitting}
                icon={CheckCircle2}
              >
                Approve Requisition
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={handleConfirmRejection}
                isLoading={isSubmitting}
                disabled={!notes.trim()}
                icon={XCircle}
              >
                Confirm Rejection
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Approvals;
