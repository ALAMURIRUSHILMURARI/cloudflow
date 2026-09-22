/**
 * CloudFlow Enterprise Mock Dataset
 * 
 * Demonstrates workflow states, schemas, and user permissions.
 * Designed to seamlessly mirror future AWS DynamoDB document schemas.
 */

export const MOCK_USERS = [
  {
    id: 'usr-001',
    email: 'employee@cloudflow.demo',
    name: 'Alex Morgan',
    role: 'Employee',
    roleKey: 'employee',
    title: 'Senior Cloud Engineer',
    department: 'Cloud Infrastructure',
    employeeId: 'CF-1042',
    phone: '+1 (555) 234-8901',
    location: 'Austin Tech Hub, TX',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    manager: 'Sarah Jenkins',
    joinDate: 'Jan 15, 2023',
  },
  {
    id: 'usr-002',
    email: 'manager@cloudflow.demo',
    name: 'Sarah Jenkins',
    role: 'Manager',
    roleKey: 'manager',
    title: 'Engineering Director',
    department: 'Product & Engineering',
    employeeId: 'CF-0418',
    phone: '+1 (555) 876-5432',
    location: 'Seattle HQ, WA',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    manager: 'David Vance',
    joinDate: 'Mar 10, 2021',
  },
  {
    id: 'usr-003',
    email: 'admin@cloudflow.demo',
    name: 'David Vance',
    role: 'Administrator',
    roleKey: 'admin',
    title: 'VP of Enterprise IT',
    department: 'IT & Security Infrastructure',
    employeeId: 'CF-0012',
    phone: '+1 (555) 901-2345',
    location: 'New York Enterprise Center, NY',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    manager: 'Executive Board',
    joinDate: 'Aug 01, 2019',
  }
];

export const WORKFLOW_DEFINITIONS = {
  purchase: {
    type: 'purchase',
    name: 'Purchase Request',
    steps: [
      { id: 'step_1', label: 'Employee', role: 'Employee', description: 'Submission & initial review' },
      { id: 'step_2', label: 'Manager', role: 'Manager', description: 'Line manager budget sign-off' },
      { id: 'step_3', label: 'Procurement', role: 'Procurement Specialist', description: 'Vendor evaluation & contract terms' },
      { id: 'step_4', label: 'Finance', role: 'Finance Controller', description: 'Budget allocation & tax approval' },
      { id: 'step_5', label: 'PO Generation', role: 'Automated System', description: 'Enterprise ERP PO creation' }
    ]
  },
  leave: {
    type: 'leave',
    name: 'Leave Application',
    steps: [
      { id: 'step_1', label: 'Employee', role: 'Employee', description: 'Request submission' },
      { id: 'step_2', label: 'Manager', role: 'Manager', description: 'Team coverage & leave approval' },
      { id: 'step_3', label: 'HR', role: 'HR Operations', description: 'Policy compliance check' },
      { id: 'step_4', label: 'Leave Balance', role: 'Automated System', description: 'Accrual deduction & validation' },
      { id: 'step_5', label: 'Calendar', role: 'Exchange / Google Calendar', description: 'Out-of-office calendar synchronization' }
    ]
  },
  expense: {
    type: 'expense',
    name: 'Expense Claim',
    steps: [
      { id: 'step_1', label: 'Employee', role: 'Employee', description: 'Itemized expense submission' },
      { id: 'step_2', label: 'Manager', role: 'Manager', description: 'Department expense approval' },
      { id: 'step_3', label: 'Finance', role: 'Accounts Payable', description: 'Receipt verification & tax breakdown' },
      { id: 'step_4', label: 'Audit', role: 'Internal Compliance', description: 'Policy audit & fraud check' },
      { id: 'step_5', label: 'Payment', role: 'Treasury / Payroll', description: 'Direct deposit disbursement' }
    ]
  },
  software: {
    type: 'software',
    name: 'Software Access Request',
    steps: [
      { id: 'step_1', label: 'Employee', role: 'Employee', description: 'Access specification & justification' },
      { id: 'step_2', label: 'Manager', role: 'Manager', description: 'Business justification review' },
      { id: 'step_3', label: 'IT Security', role: 'SecOps Officer', description: 'RBAC & least-privilege review' },
      { id: 'step_4', label: 'Grant', role: 'IAM Administrator', description: 'License allocation & SSO entitlement' },
      { id: 'step_5', label: 'Provisioning', role: 'SCIM / Okta / Cognito', description: 'Automated account credential provisioning' }
    ]
  }
};

export const INITIAL_REQUESTS = [
  {
    id: 'REQ-2026-00124',
    type: 'purchase',
    title: 'High-Performance Edge AI Gateway Server',
    requester: {
      name: 'Alex Morgan',
      email: 'employee@cloudflow.demo',
      department: 'Cloud Infrastructure',
      employeeId: 'CF-1042'
    },
    status: 'Pending',
    currentStepIndex: 1, // Manager step
    currentStep: 'Manager',
    priority: 'High',
    createdAt: '2026-09-18T10:30:00Z',
    updatedAt: '2026-09-18T10:30:00Z',
    workflow: WORKFLOW_DEFINITIONS.purchase.steps,
    stepHistory: [
      { stepId: 'step_1', label: 'Employee', status: 'Approved', actor: 'Alex Morgan', timestamp: '2026-09-18T10:30:00Z', notes: 'Submitted requisition with quote' },
      { stepId: 'step_2', label: 'Manager', status: 'Pending', actor: 'Sarah Jenkins', timestamp: null, notes: 'Awaiting line manager budget sign-off' },
      { stepId: 'step_3', label: 'Procurement', status: 'Upcoming', actor: 'Procurement Team', timestamp: null, notes: 'Pending previous approval' },
      { stepId: 'step_4', label: 'Finance', status: 'Upcoming', actor: 'Finance Dept', timestamp: null, notes: 'Pending previous approval' },
      { stepId: 'step_5', label: 'PO Generation', status: 'Upcoming', actor: 'System Worker', timestamp: null, notes: 'Pending final sign-off' }
    ],
    data: {
      itemName: 'NVIDIA Jetson AGX Orin Industrial Module Kit',
      category: 'Hardware & Edge Devices',
      quantity: 2,
      estimatedCost: 3998.00,
      currency: 'USD',
      businessJustification: 'Required for building the physical edge testbed node in the Multi-Cloud Active Resilience laboratory benchmark.',
      attachment: 'Quote_NVIDIA_EdgeCluster_2026.pdf',
      attachmentSize: '1.8 MB'
    }
  },
  {
    id: 'REQ-2026-00122',
    type: 'software',
    title: 'AWS Production Multi-Region IAM Access',
    requester: {
      name: 'Alex Morgan',
      email: 'employee@cloudflow.demo',
      department: 'Cloud Infrastructure',
      employeeId: 'CF-1042'
    },
    status: 'Approved',
    currentStepIndex: 4, // Finalized
    currentStep: 'Completed',
    priority: 'Critical',
    createdAt: '2026-09-14T09:15:00Z',
    updatedAt: '2026-09-15T14:20:00Z',
    workflow: WORKFLOW_DEFINITIONS.software.steps,
    stepHistory: [
      { stepId: 'step_1', label: 'Employee', status: 'Approved', actor: 'Alex Morgan', timestamp: '2026-09-14T09:15:00Z', notes: 'Requested IAM role for us-east-1 and eu-west-1' },
      { stepId: 'step_2', label: 'Manager', status: 'Approved', actor: 'Sarah Jenkins', timestamp: '2026-09-14T11:45:00Z', notes: 'Approved for Q3 Cloud Resilience benchmark' },
      { stepId: 'step_3', label: 'IT Security', status: 'Approved', actor: 'Security Auditor', timestamp: '2026-09-15T10:00:00Z', notes: 'Role bounded by MFA requirement and IP restriction' },
      { stepId: 'step_4', label: 'Grant', status: 'Approved', actor: 'IAM Admin', timestamp: '2026-09-15T13:30:00Z', notes: 'Role assigned in AWS IAM Identity Center' },
      { stepId: 'step_5', label: 'Provisioning', status: 'Approved', actor: 'CloudFlow SCIM Engine', timestamp: '2026-09-15T14:20:00Z', notes: 'SSO credentials synchronized to user profile' }
    ],
    data: {
      softwareName: 'AWS Console & CLI Enterprise IAM',
      accessLevel: 'Administrator (Scoped to Lab VPC)',
      businessJustification: 'Needed to orchestrate automated failover testing between AWS and physical edge nodes.',
      requiredDuration: '90 Days'
    }
  },
  {
    id: 'REQ-2026-00121',
    type: 'expense',
    title: 'IEEE Cloud Summit Conference Travel & Registration',
    requester: {
      name: 'Alex Morgan',
      email: 'employee@cloudflow.demo',
      department: 'Cloud Infrastructure',
      employeeId: 'CF-1042'
    },
    status: 'Pending',
    currentStepIndex: 2, // Finance step
    currentStep: 'Finance',
    priority: 'Medium',
    createdAt: '2026-09-16T14:10:00Z',
    updatedAt: '2026-09-17T08:50:00Z',
    workflow: WORKFLOW_DEFINITIONS.expense.steps,
    stepHistory: [
      { stepId: 'step_1', label: 'Employee', status: 'Approved', actor: 'Alex Morgan', timestamp: '2026-09-16T14:10:00Z', notes: 'Expense receipt bundle uploaded' },
      { stepId: 'step_2', label: 'Manager', status: 'Approved', actor: 'Sarah Jenkins', timestamp: '2026-09-17T08:50:00Z', notes: 'Travel was pre-approved under Research Grant R-44' },
      { stepId: 'step_3', label: 'Finance', status: 'Pending', actor: 'Finance Accounts Payable', timestamp: null, notes: 'Reviewing itemized receipts & currency conversions' },
      { stepId: 'step_4', label: 'Audit', status: 'Upcoming', actor: 'Compliance Auditor', timestamp: null, notes: 'Awaiting finance confirmation' },
      { stepId: 'step_5', label: 'Payment', status: 'Upcoming', actor: 'Payroll System', timestamp: null, notes: 'Direct deposit queue' }
    ],
    data: {
      expenseCategory: 'Travel & Conferences',
      amount: 1240.50,
      currency: 'USD',
      expenseDate: '2026-09-12',
      description: 'Flight tickets, hotel booking, and conference registration for paper presentation on Serverless Active Resilience.',
      receiptUpload: 'Receipts_IEEE_CloudSummit_Morgan.pdf',
      receiptSize: '3.4 MB'
    }
  },
  {
    id: 'REQ-2026-00120',
    type: 'leave',
    title: 'Annual Research Recess & Academic Leave',
    requester: {
      name: 'Alex Morgan',
      email: 'employee@cloudflow.demo',
      department: 'Cloud Infrastructure',
      employeeId: 'CF-1042'
    },
    status: 'Approved',
    currentStepIndex: 4,
    currentStep: 'Completed',
    priority: 'Normal',
    createdAt: '2026-09-10T11:00:00Z',
    updatedAt: '2026-09-11T16:00:00Z',
    workflow: WORKFLOW_DEFINITIONS.leave.steps,
    stepHistory: [
      { stepId: 'step_1', label: 'Employee', status: 'Approved', actor: 'Alex Morgan', timestamp: '2026-09-10T11:00:00Z', notes: 'Requested 4 days leave' },
      { stepId: 'step_2', label: 'Manager', status: 'Approved', actor: 'Sarah Jenkins', timestamp: '2026-09-10T15:30:00Z', notes: 'Sprint workload re-balanced' },
      { stepId: 'step_3', label: 'HR', status: 'Approved', actor: 'HR Team', timestamp: '2026-09-11T09:20:00Z', notes: 'Sufficient balance available' },
      { stepId: 'step_4', label: 'Leave Balance', status: 'Approved', actor: 'HRIS System', timestamp: '2026-09-11T12:00:00Z', notes: '4 days deducted from 22 days accrued' },
      { stepId: 'step_5', label: 'Calendar', status: 'Approved', actor: 'Calendar Sync', timestamp: '2026-09-11T16:00:00Z', notes: 'Out-of-office automated invite published' }
    ],
    data: {
      leaveType: 'Annual Leave',
      startDate: '2026-10-05',
      endDate: '2026-10-08',
      durationDays: 4,
      reason: 'Attending Capstone Project symposium and offsite research review.'
    }
  },
  {
    id: 'REQ-2026-00119',
    type: 'purchase',
    title: 'Datadog Enterprise APM Subscription License',
    requester: {
      name: 'Sarah Jenkins',
      email: 'manager@cloudflow.demo',
      department: 'Product & Engineering',
      employeeId: 'CF-0418'
    },
    status: 'Rejected',
    currentStepIndex: 3, // Rejected at Finance
    currentStep: 'Rejected',
    priority: 'High',
    createdAt: '2026-09-05T08:00:00Z',
    updatedAt: '2026-09-08T15:00:00Z',
    workflow: WORKFLOW_DEFINITIONS.purchase.steps,
    stepHistory: [
      { stepId: 'step_1', label: 'Employee', status: 'Approved', actor: 'Sarah Jenkins', timestamp: '2026-09-05T08:00:00Z', notes: 'Submitted APM vendor renewal' },
      { stepId: 'step_2', label: 'Manager', status: 'Approved', actor: 'David Vance', timestamp: '2026-09-06T10:00:00Z', notes: 'Approved for observability' },
      { stepId: 'step_3', label: 'Procurement', status: 'Approved', actor: 'Procurement Team', timestamp: '2026-09-07T14:00:00Z', notes: 'Negotiated 10% volume discount' },
      { stepId: 'step_4', label: 'Finance', status: 'Rejected', actor: 'Finance Controller', timestamp: '2026-09-08T15:00:00Z', notes: 'Exceeds remaining departmental software OPEX budget for Q3. Please defer to Q4.' },
      { stepId: 'step_5', label: 'PO Generation', status: 'Cancelled', actor: 'System', timestamp: null, notes: 'Cancelled due to rejection' }
    ],
    data: {
      itemName: 'Datadog Pro APM 50 Host Annual License',
      category: 'Software Subscriptions',
      quantity: 1,
      estimatedCost: 18000.00,
      currency: 'USD',
      businessJustification: 'Distributed tracing for serverless Lambda cold start latency analysis.',
      attachment: 'Datadog_Renewal_Q3.pdf',
      attachmentSize: '950 KB'
    }
  },
  {
    id: 'REQ-2026-00118',
    type: 'software',
    title: 'GitHub Copilot Enterprise Multi-Seat Access',
    requester: {
      name: 'Alex Morgan',
      email: 'employee@cloudflow.demo',
      department: 'Cloud Infrastructure',
      employeeId: 'CF-1042'
    },
    status: 'Pending',
    currentStepIndex: 1, // Manager step
    currentStep: 'Manager',
    priority: 'Normal',
    createdAt: '2026-09-17T16:45:00Z',
    updatedAt: '2026-09-17T16:45:00Z',
    workflow: WORKFLOW_DEFINITIONS.software.steps,
    stepHistory: [
      { stepId: 'step_1', label: 'Employee', status: 'Approved', actor: 'Alex Morgan', timestamp: '2026-09-17T16:45:00Z', notes: 'Requested seat license for development acceleration' },
      { stepId: 'step_2', label: 'Manager', status: 'Pending', actor: 'Sarah Jenkins', timestamp: null, notes: 'Awaiting manager endorsement' },
      { stepId: 'step_3', label: 'IT Security', status: 'Upcoming', actor: 'SecOps Team', timestamp: null, notes: 'IP & telemetry screening' },
      { stepId: 'step_4', label: 'Grant', status: 'Upcoming', actor: 'GitHub Org Owner', timestamp: null, notes: 'Assign seat in GitHub Org' },
      { stepId: 'step_5', label: 'Provisioning', status: 'Upcoming', actor: 'System', timestamp: null, notes: 'Sync license' }
    ],
    data: {
      softwareName: 'GitHub Copilot Enterprise',
      accessLevel: 'Developer Seat',
      businessJustification: 'AI assisted code generation and architectural test benching for CloudFlow capstone project.',
      requiredDuration: '1 Year'
    }
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    title: 'Request Submitted Successfully',
    message: 'REQ-2026-00124 (High-Performance Edge AI Gateway Server) was submitted and routed to Manager review.',
    type: 'info',
    timestamp: '2026-09-18T10:30:00Z',
    read: false,
    requestId: 'REQ-2026-00124'
  },
  {
    id: 'notif-002',
    title: 'Approval Required',
    message: 'REQ-2026-00118 (GitHub Copilot Enterprise) is awaiting your manager review & sign-off.',
    type: 'warning',
    timestamp: '2026-09-17T16:45:00Z',
    read: false,
    requestId: 'REQ-2026-00118'
  },
  {
    id: 'notif-003',
    title: 'Access Provisioned',
    message: 'REQ-2026-00122 (AWS Production Multi-Region IAM Access) has completed all workflow stages and is now active.',
    type: 'success',
    timestamp: '2026-09-15T14:20:00Z',
    read: true,
    requestId: 'REQ-2026-00122'
  },
  {
    id: 'notif-004',
    title: 'Expense Claim Progressed',
    message: 'REQ-2026-00121 was approved by Manager Sarah Jenkins and forwarded to Finance Accounts Payable.',
    type: 'info',
    timestamp: '2026-09-17T08:50:00Z',
    read: true,
    requestId: 'REQ-2026-00121'
  },
  {
    id: 'notif-005',
    title: 'Request Rejected by Finance',
    message: 'REQ-2026-00119 (Datadog Enterprise APM) was rejected by Finance due to Q3 budget constraints.',
    type: 'error',
    timestamp: '2026-09-08T15:00:00Z',
    read: true,
    requestId: 'REQ-2026-00119'
  }
];

export const INITIAL_ACTIVITIES = [
  {
    id: 'act-001',
    user: 'Alex Morgan',
    action: 'submitted purchase requisition',
    target: 'REQ-2026-00124',
    timestamp: '10 minutes ago',
    type: 'submission'
  },
  {
    id: 'act-002',
    user: 'Sarah Jenkins',
    action: 'approved line expense',
    target: 'REQ-2026-00121',
    timestamp: '1 day ago',
    type: 'approval'
  },
  {
    id: 'act-003',
    user: 'CloudFlow SCIM Engine',
    action: 'provisioned IAM credentials',
    target: 'REQ-2026-00122',
    timestamp: '3 days ago',
    type: 'system'
  },
  {
    id: 'act-004',
    user: 'Finance Controller',
    action: 'rejected PO generation',
    target: 'REQ-2026-00119',
    timestamp: '10 days ago',
    type: 'rejection'
  }
];
