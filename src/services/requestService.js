/**
 * CloudFlow Request Lifecycle Service
 * 
 * ARCHITECTURAL DESIGN & AWS ROADMAP:
 * Current: In-memory & LocalStorage state store for instant frontend validation.
 * Future AWS Integration:
 *   - REST / GraphQL via Amazon API Gateway (v1 endpoints)
 *   - Business logic executed in AWS Lambda functions (Node.js/Python 3.12)
 *   - Relational/NoSQL persistence in Amazon DynamoDB with Single-Table Design
 *     (PartitionKey: `PK=REQ#<id>`, SortKey: `SK=METADATA`)
 *   - Orchestration handled by AWS Step Functions Express State Machines
 */

import { INITIAL_REQUESTS, WORKFLOW_DEFINITIONS } from '../data/mockData';

const STORAGE_KEY = 'cloudflow_requests_store';

class RequestService {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REQUESTS));
    }
  }

  getRawRequests() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : INITIAL_REQUESTS;
    } catch {
      return INITIAL_REQUESTS;
    }
  }

  saveRawRequests(requests) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }

  /**
   * Fetch all workflow requests.
   * Target AWS: GET /requests (via API Gateway -> Lambda -> DynamoDB Scan/Query)
   */
  async getRequests() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return this.getRawRequests();
  }

  /**
   * Fetch a single request by ID.
   * Target AWS: GET /requests/{id} (DynamoDB GetItem)
   */
  async getRequestById(id) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const requests = this.getRawRequests();
    const found = requests.find((r) => r.id === id);
    if (!found) {
      throw new Error(`Request with ID ${id} was not found.`);
    }
    return found;
  }

  /**
   * Generate next sequential/random Enterprise Request ID (REQ-2026-XXXXX).
   */
  generateRequestId() {
    const existing = this.getRawRequests();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    return `REQ-2026-${randomSuffix}`;
  }

  /**
   * Create a new enterprise workflow request.
   * Target AWS: POST /requests (API Gateway -> Lambda -> Step Functions StartExecution)
   */
  async createRequest({ type, title, priority = 'Normal', requester, data }) {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const workflowDef = WORKFLOW_DEFINITIONS[type] || WORKFLOW_DEFINITIONS.purchase;
    const requestId = this.generateRequestId();
    const now = new Date().toISOString();

    const initialStepHistory = workflowDef.steps.map((step, idx) => ({
      stepId: step.id,
      label: step.label,
      status: idx === 0 ? 'Approved' : idx === 1 ? 'Pending' : 'Upcoming',
      actor: idx === 0 ? requester.name : step.role,
      timestamp: idx === 0 ? now : null,
      notes: idx === 0 ? 'Submitted requisition' : idx === 1 ? `Awaiting ${step.label} review` : 'Pending prior workflow approval'
    }));

    const newRequest = {
      id: requestId,
      type,
      title: title || `${workflowDef.name} - ${requestId}`,
      requester: {
        name: requester.name || 'Alex Morgan',
        email: requester.email || 'employee@cloudflow.demo',
        department: requester.department || 'Cloud Infrastructure',
        employeeId: requester.employeeId || 'CF-1042'
      },
      status: 'Pending',
      currentStepIndex: 1, // Second step is pending review
      currentStep: workflowDef.steps[1]?.label || 'Manager',
      priority,
      createdAt: now,
      updatedAt: now,
      workflow: workflowDef.steps,
      stepHistory: initialStepHistory,
      data: data || {}
    };

    const requests = this.getRawRequests();
    const updatedList = [newRequest, ...requests];
    this.saveRawRequests(updatedList);

    return newRequest;
  }

  /**
   * Update an existing request.
   * Target AWS: PUT /requests/{id} (DynamoDB UpdateItem)
   */
  async updateRequest(id, updates) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const requests = this.getRawRequests();
    const index = requests.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error(`Request ${id} not found`);
    }

    const updated = {
      ...requests[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    requests[index] = updated;
    this.saveRawRequests(requests);
    return updated;
  }

  /**
   * Delete a request.
   * Target AWS: DELETE /requests/{id} (DynamoDB DeleteItem)
   */
  async deleteRequest(id) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const requests = this.getRawRequests();
    const filtered = requests.filter((r) => r.id !== id);
    this.saveRawRequests(filtered);
    return id;
  }
}

export const requestService = new RequestService();
export default requestService;
