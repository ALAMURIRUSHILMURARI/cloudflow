# CloudFlow: Enterprise Workflow Automation Platform

> **Capstone Project Title:**  
> **Serverless Cloud Application Architecture: Enterprise Workflow Automation, Multi-Cloud Active Resilience & Physical Edge Testbed**

---

## Academic Notice & Project Status

> [!IMPORTANT]  
> **The app runs in two modes.** With `VITE_MOCK_MODE=true` it uses the client-side mock services (localStorage).
> With `VITE_MOCK_MODE=false` and the API URLs set, it talks to the real AWS serverless backend in [`backend/`](backend/README.md):
> Cognito sign-in, API Gateway + Lambda, DynamoDB (+ Streams audit ledger), S3 presigned uploads, EventBridge,
> a DR stack with client-side failover, and a Raspberry Pi edge prober. See **Live AWS backend** below.

## Live AWS backend

| Piece | Where |
| --- | --- |
| Workflow engine, Lambda handlers, SAM template | `backend/cloud/` |
| Raspberry Pi 3 B+ edge prober (load, p95, failover) | `backend/edge/` |
| Tests (unit + moto AWS) | `backend/tests/` (CI: `.github/workflows/backend-tests.yml`) |
| Live API client and failover | `src/services/cloudApi.js`, `src/services/liveService.js` |
| Demo runbook, cost analysis, results | `docs/` |

**Deploy** (from Git Bash, with the AWS CLI and SAM CLI signed in):

```bash
cd backend/cloud/aws
read -s -p "Demo password: " DEMO_PASSWORD; export DEMO_PASSWORD; echo
bash deploy_all.sh
```

It deploys the DR stack and then the primary stack, which replicates to the DR table. It also creates the demo users
(`employee@cloudflow.demo`, `manager@cloudflow.demo`, `admin@cloudflow.demo`, and so on) on both stacks, and prints three lines for `.env`:

```
VITE_MOCK_MODE=false
VITE_API_BASE_URL=https://....execute-api.ap-southeast-2.amazonaws.com
VITE_API_SECONDARY_URL=https://....execute-api.ap-southeast-2.amazonaws.com
```

Commit them and push to `main`. GitHub Pages rebuilds the site, which then signs in to both Cognito user pools.
The banner chip shows which stack is serving (green **LIVE: AWS primary**, amber **FAILOVER: served by AWS DR**).
**Edge Telemetry** in the sidebar shows the Pi's p95 latency, request rate, failover events and approval turnaround.

---

## 1. Project Objective

**CloudFlow** is an enterprise-grade cloud-native workflow automation application designed to demonstrate multi-stage business requisition execution, role-based approval state machines, and resilient distributed systems orchestration.

The frontend serves as the primary operational console for employees, department managers, and system administrators to initiate, monitor, audit, and authorize enterprise workflows.

### Key Capabilities:
- **Separation of Workflow Concerns:** Four independent request pipelines with dedicated form schemas, validations, and state machines.
- **State Machine Visualization:** Real-time visual timeline tracking of each approval stage (Employee, Manager, Procurement, Finance, IT Security, HR, and Automated Workers).
- **Service Layer Abstraction:** Decoupled business logic allowing drop-in replacement of client mock persistence with AWS Serverless microservices.
- **Role-Based Access Simulation:** Granular role states for Employee (`Alex Morgan`), Manager (`Sarah Jenkins`), and Administrator (`David Vance`).

---

## 2. Frontend Architecture

CloudFlow is built as a single-page application (SPA) following modern enterprise React architectural patterns:

```
┌────────────────────────────────────────────────────────┐
│                   React 18 SPA Layer                   │
│        (Vite + React Router v6 + Tailwind CSS)         │
└───────────────────────────┬────────────────────────────┘
                            │ Dispatches User Actions
                            ▼
┌────────────────────────────────────────────────────────┐
│             Redux Toolkit (State Management)           │
│   authSlice  │  requestSlice  │  approvals  │  notifs  │
└───────────────────────────┬────────────────────────────┘
                            │ Calls Service Layer
                            ▼
┌────────────────────────────────────────────────────────┐
│             Enterprise Service Layer (Async)           │
│  authService │ requestService │ approvalService │ S3   │
└───────────────────────────┬────────────────────────────┘
                            │ Current: Mock / Future: AWS
             ┌──────────────┴──────────────┐
             ▼                             ▼
   [Mock In-Memory Store]       [AWS Serverless Backend]
   • LocalStorage Persistence   • Amazon Cognito (SRP/JWT)
   • Simulated Network Delay    • API Gateway + Lambda
   • Instant UI Validation      • Amazon DynamoDB (Single-Table)
                                • Amazon S3 (Presigned URLs)
                                • AWS Step Functions
```

---

## 3. Directory & Folder Structure

```
cloudflow/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx            # Reusable button with variants & loading state
│   │   │   ├── EmptyState.jsx        # Standardized empty list/search view
│   │   │   ├── Input.jsx             # Form input, textarea, and select controls
│   │   │   ├── Loading.jsx           # Spinners and skeleton cards
│   │   │   └── Modal.jsx             # Accessible modal dialogue overlay
│   │   ├── dashboard/
│   │   │   ├── ActivityFeed.jsx      # Audit event stream
│   │   │   ├── RecentRequests.jsx    # Live dashboard table
│   │   │   └── StatCard.jsx          # Reusable metric cards
│   │   ├── layout/
│   │   │   ├── Header.jsx            # Top navigation, status indicator & user menu
│   │   │   ├── Layout.jsx            # Root layout shell with Capstone notice banner
│   │   │   └── Sidebar.jsx           # Responsive sidebar with dynamic badge counts
│   │   └── requests/
│   │       ├── RequestCard.jsx       # Modular request item card
│   │       ├── RequestStatusBadge.jsx# Status pills (Pending, Approved, Rejected)
│   │       └── RequestTimeline.jsx   # Multi-stage interactive step tracker
│   │
│   ├── data/
│   │   └── mockData.js               # Initial users, workflows, requests & audit logs
│   │
│   ├── pages/
│   │   ├── Approvals.jsx             # Manager review queue & approval actions
│   │   ├── Dashboard.jsx             # Executive metrics & integration status
│   │   ├── ExpenseRequest.jsx        # Dedicated expense claim form & receipt upload
│   │   ├── LeaveRequest.jsx          # Dedicated leave application form
│   │   ├── Login.jsx                 # Enterprise login with one-click demo credentials
│   │   ├── MyRequests.jsx            # Searchable & filterable requisition catalog
│   │   ├── NewRequest.jsx            # Category launcher hub
│   │   ├── Notifications.jsx         # Real-time alert feed & mark-as-read
│   │   ├── Profile.jsx               # Employee directory & IAM role entitlements
│   │   ├── PurchaseRequest.jsx       # Dedicated purchase requisition & S3 quote upload
│   │   ├── RequestDetails.jsx        # Dynamic request viewer & timeline execution
│   │   ├── Settings.jsx              # Dispatch preferences & theme configuration
│   │   └── SoftwareAccessRequest.jsx # Dedicated IAM & cloud tooling requisition form
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx             # Protected & public route definitions
│   │
│   ├── services/
│   │   ├── approvalService.js        # Step Function approval transitions
│   │   ├── authService.js            # Cognito mock & session management
│   │   ├── notificationService.js    # SNS/EventBridge mock notification broker
│   │   ├── requestService.js         # DynamoDB CRUD & ID generation
│   │   └── uploadService.js          # S3 presigned URL upload simulation
│   │
│   ├── store/
│   │   ├── slices/
│   │   │   ├── approvalSlice.js
│   │   │   ├── authSlice.js
│   │   │   ├── notificationSlice.js
│   │   │   └── requestSlice.js
│   │   └── store.js                  # Combined Redux Toolkit store
│   │
│   ├── App.jsx                       # Redux & Router provider wrapper
│   ├── index.css                     # Tailwind directives & typography
│   └── main.jsx                      # Vite application bootstrap
│
├── .env                              # Environment variable configuration
├── .env.example                      # Environment template
├── package.json                      # Dependencies & scripts
├── tailwind.config.js                # Tailwind theme extensions
└── vite.config.js                    # Vite bundler config
```

---

## 4. Technologies Used

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 18 | Component-based UI architecture |
| **Tooling / Bundler** | Vite 5 | Fast HMR and Rollup production bundling |
| **Styling** | Tailwind CSS 3 | Utility-first responsive design system |
| **Routing** | React Router DOM v6 | Client-side routing with protected route guards |
| **State Management** | Redux Toolkit | Centralized immutable application state |
| **HTTP Client** | Axios | Standardized REST client for service layer |
| **Icons** | Lucide React | High-contrast enterprise iconography |

---

## 5. Workflow Architecture

CloudFlow implements four distinct enterprise state machines. Each workflow defines unique data models, review steps, and automated worker tasks:

```
1. Purchase Requisition:
   [Employee] ──► [Manager] ──► [Procurement] ──► [Finance] ──► [PO Generation]

2. Leave Application:
   [Employee] ──► [Manager] ──► [HR Review] ──► [Leave Balance] ──► [Calendar Sync]

3. Expense Claim:
   [Employee] ──► [Manager] ──► [Finance AP] ──► [Compliance Audit] ──► [Payment Queue]

4. Software Access Request:
   [Employee] ──► [Manager] ──► [IT Security] ──► [IAM Grant] ──► [SCIM Provisioning]
```

---

## 6. Mock Service Architecture

The service layer is strictly isolated from React UI components. All async calls return standardized promises:

- **`authService.js`**: Manages session state, JWT tokens, and user claims with mock delay.
- **`requestService.js`**: Generates unique `REQ-2026-XXXXX` requisition IDs, compiles step history, and manages persistence.
- **`approvalService.js`**: Advances the active step index or marks status as `Rejected` with recorded audit notes.
- **`notificationService.js`**: Emits real-time event alerts when requisitions transition between stages.
- **`uploadService.js`**: Simulates the 2-step Amazon S3 Presigned URL negotiation workflow.

---

## 7. Future AWS Serverless Integration Plan

When the backend integration phase begins, the mock services will directly connect to AWS managed serverless services:

```
[ React 18 SPA Frontend ]
          │
          ├── (1) Authenticate: SRP Auth Flow
          ▼
   [ Amazon Cognito ]
   • User Pools (AuthN) & Identity Pools (AuthZ)
   • JWT Token issuance (IdToken, AccessToken)
          │
          ├── (2) REST Requests with Bearer Token
          ▼
  [ Amazon API Gateway ]
   • API Authorizers (Validates Cognito JWT)
   • Throttling, WAF, CORS & Request Validation
          │
          ├── (3) Proxy Integration
          ▼
   [ AWS Lambda Functions ]
   • CreateRequestFunction (Node.js 20 / Python 3.12)
   • ApproveRequestFunction
   • GetRequestsFunction
          │
          ├── (4) State Machine Execution & Persistence
          ▼
  [ AWS Step Functions ] ──────► [ Amazon DynamoDB ]
   • Distributed State Machines    • Single-Table Design
   • Callback Task Tokens          • PartitionKey: PK=REQ#<id>
   • Automated Error Retries       • SortKey: SK=METADATA
          │
          ├── (5) Event Streaming & Alerts
          ▼
  [ Amazon EventBridge ] ──────► [ Amazon SNS / SES ]
   • Rule-based routing            • Email & SMS notifications
```

### Direct S3 Document Upload Flow:
```
React Frontend ──► API Gateway / Lambda (Request Presigned URL)
      │                                    │
      │ ◄── Returns S3 Presigned PUT URL ──┘
      │
      └──► PUT Binary ──► Amazon S3 Bucket (cloudflow-attachments)
                                │
                                └──► S3 ObjectCreated Event ──► Lambda (Virus Scan & OCR)
```

---

## 8. How to Run the Project

### Prerequisites:
- Node.js (v18 or newer)
- npm or yarn

### Step 1: Clone or Navigate to Project Directory
```bash
cd "C:\Users\RUSHIL MURARI\.gemini\antigravity\scratch\cloudflow"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### Step 4: Build for Production
```bash
npm run build
```

---

## 9. Demo Credentials

For quick evaluation during the project review, use the one-click demo selectors on the `/login` screen or input:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Employee** | `employee@cloudflow.demo` | `demo1234` | Requisition creation, tracking, profile |
| **Manager** | `manager@cloudflow.demo` | `demo1234` | Requisition review, approval & rejection |
| **Administrator** | `admin@cloudflow.demo` | `demo1234` | System configuration, IAM security |

---

## 10. Future Implementation Roadmap

1. **AWS CDK / Terraform Infrastructure as Code (IaC)**
   - Provision VPC, Cognito User Pool, DynamoDB tables, and Step Function state machines.
2. **AWS Amplify SDK Integration**
   - Replace `authService.js` with `aws-amplify/auth` for native SRP Cognito authentication.
3. **AWS AppSync / WebSocket Push**
   - Real-time notification updates replacing client-side mock event subscriptions.
4. **Physical Edge Node Telemetry Integration**
   - MQTT / AWS IoT Core stream from NVIDIA Jetson AGX Orin physical edge testbed.
