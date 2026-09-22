/**
 * CloudFlow Approval Service
 * 
 * ARCHITECTURAL DESIGN & AWS ROADMAP:
 * Current: Mock workflow transitions advancing state through predefined pipeline steps.
 * Future AWS Integration:
 *   - AWS Step Functions standard & express state machines
 *   - Task Tokens (`SendTaskSuccess` / `SendTaskFailure` API)
 *   - Amazon EventBridge routing events to downstream microservices
 *   - Amazon SNS & SES for email approval hooks
 */

import { requestService } from './requestService';

class ApprovalService {
  /**
   * Fetch all requests that require approval.
   */
  async getPendingApprovals() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const requests = await requestService.getRequests();
    return requests.filter((r) => r.status === 'Pending');
  }

  /**
   * Approve a request and advance its workflow to the next step.
   * Target AWS: POST /approvals/approve -> Step Functions SendTaskSuccess
   */
  async approveRequest(requestId, { approverName = 'Approver', comments = 'Approved' } = {}) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const request = await requestService.getRequestById(requestId);

    const now = new Date().toISOString();
    const currentStepIdx = request.currentStepIndex;
    const isLastStep = currentStepIdx >= request.workflow.length - 1;

    // Update step history
    const updatedStepHistory = request.stepHistory.map((step, idx) => {
      if (idx === currentStepIdx) {
        return {
          ...step,
          status: 'Approved',
          actor: approverName,
          timestamp: now,
          notes: comments || 'Approved'
        };
      } else if (idx === currentStepIdx + 1) {
        return {
          ...step,
          status: 'Pending',
          notes: `Awaiting ${step.label} review`
        };
      }
      return step;
    });

    const nextStepIdx = isLastStep ? currentStepIdx : currentStepIdx + 1;
    const newStatus = isLastStep ? 'Approved' : 'Pending';
    const newCurrentStep = isLastStep ? 'Completed' : request.workflow[nextStepIdx]?.label;

    const updatedRequest = await requestService.updateRequest(requestId, {
      status: newStatus,
      currentStepIndex: nextStepIdx,
      currentStep: newCurrentStep,
      stepHistory: updatedStepHistory,
      updatedAt: now
    });

    return updatedRequest;
  }

  /**
   * Reject a request and terminate workflow.
   * Target AWS: POST /approvals/reject -> Step Functions SendTaskFailure
   */
  async rejectRequest(requestId, { approverName = 'Approver', reason = 'Rejected' } = {}) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const request = await requestService.getRequestById(requestId);

    const now = new Date().toISOString();
    const currentStepIdx = request.currentStepIndex;

    const updatedStepHistory = request.stepHistory.map((step, idx) => {
      if (idx === currentStepIdx) {
        return {
          ...step,
          status: 'Rejected',
          actor: approverName,
          timestamp: now,
          notes: reason || 'Rejected during review'
        };
      } else if (idx > currentStepIdx) {
        return {
          ...step,
          status: 'Cancelled',
          notes: 'Cancelled due to upstream rejection'
        };
      }
      return step;
    });

    const updatedRequest = await requestService.updateRequest(requestId, {
      status: 'Rejected',
      currentStep: 'Rejected',
      stepHistory: updatedStepHistory,
      updatedAt: now
    });

    return updatedRequest;
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
