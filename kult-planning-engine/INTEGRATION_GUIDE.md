# 🔄 KULT Planning Engine - Complete User Flow & Integration

## 📊 **System Architecture Overview**

The KULT Planning Engine has **two main systems** that are now integrated:

1. **Campaign Planning Engine** (BuildPlanWizard) - The core campaign creation tool
2. **User Management Platform** - Role-based dashboards and workflow

---

## 🚪 **Entry Points & User Flow**

### **Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VISITS kult.my                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Are they logged in?                        │
├─────────────────────────────────────────────────────────────┤
│  NO → Redirect to /login or /auth                          │
│  YES → Redirect to /dashboard                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            /dashboard (Role-Based Redirect)                  │
├─────────────────────────────────────────────────────────────┤
│  Check user role from JWT token:                           │
│                                                             │
│  🔹 System Admin   → /dashboard/admin                      │
│  🔹 Sales Person   → /dashboard/sales                      │
│  🔹 Client Admin   → /dashboard/client-admin               │
│  🔹 Team Member    → /dashboard/team-member                │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 **Role-Based Navigation & Integration**

### **1. System Admin** (KULT Internal)

```
/dashboard/admin (User Management Platform)
├── Tab: Users (👥)
├── Tab: Organizations (🏢)
├── Tab: Sales People (💼)
└── Tab: Stats (📈)

Sidebar Navigation:
├── 🏠 Home → /dashboard/admin
├── 👥 Users
├── 🏢 Organizations
├── 💼 Sales People
├── 📊 All Campaigns
└── 📈 Analytics

❌ No access to BuildPlanWizard (admins don't create campaigns)
```

---

### **2. Sales Person** (KULT Internal)

```
/dashboard/sales
├── My Clients (assigned organizations)
├── Recent Bookings
└── All Client Campaigns

Sidebar Navigation:
├── 🏠 Home → /dashboard/sales
├── 🏢 My Clients
├── 📣 Bookings
└── 👤 Profile

❌ No access to BuildPlanWizard (sales don't create campaigns)
✅ Receives email when Client Admin books a campaign
```

---

### **3. Client Admin** (Team Lead)

```
/dashboard/client-admin
├── Pending Approvals (campaigns to approve)
├── Team Campaigns (all team's campaigns)
└── Actions: Approve, Reject, Book, Reassign

Sidebar Navigation:
├── 🏠 Home → /dashboard/client-admin
├── 📁 Team Campaigns
├── ⏳ Pending Approval
├── 👥 Team Members
└── ➕ Create Campaign → /build-plan-wizard ✅ INTEGRATION!

✅ Can create campaigns using BuildPlanWizard
✅ Can approve/reject team member campaigns
✅ Can book campaigns (triggers email to sales)
```

**Flow for Client Admin:**
```
Dashboard → Click "Create Campaign"
    ↓
/build-plan-wizard (Campaign Planning Engine)
    ↓ (Complete 4 steps)
Step 1: Campaign Details
Step 2: Audience Selection
Step 3: Format Selection
Step 4: Budget Allocation
    ↓
Save Campaign (status: draft or pending_approval)
    ↓
Back to /dashboard/client-admin
    ↓
Can Approve & Book own campaigns
```

---

### **4. Team Member** (Client User)

```
/dashboard/team-member
├── My Campaigns (only own campaigns)
├── Create New Campaign button
└── Submit for Approval button

Sidebar Navigation:
├── 🏠 Home → /dashboard/team-member
├── 📝 My Campaigns
└── ➕ Create Campaign → /build-plan-wizard ✅ INTEGRATION!

✅ Can create campaigns using BuildPlanWizard
✅ Must submit for Client Admin approval
❌ Cannot approve or book campaigns
```

**Flow for Team Member:**
```
Dashboard → Click "Create Campaign"
    ↓
/build-plan-wizard (Campaign Planning Engine)
    ↓ (Complete 4 steps)
Step 1: Campaign Details
Step 2: Audience Selection  
Step 3: Format Selection
Step 4: Budget Allocation
    ↓
Save as Draft
    ↓
Back to /dashboard/team-member
    ↓
Click "Submit for Approval"
    ↓
Campaign status → pending_approval
    ↓
Client Admin sees it in "Pending Approvals"
```

---

## 🔄 **Complete Campaign Lifecycle**

### **End-to-End Flow**

```
1. CREATION (Team Member or Client Admin)
   /dashboard → Click "Create Campaign" → /build-plan-wizard
   ↓
   Complete wizard (Steps 1-4)
   ↓
   Save Campaign (status: draft)

2. SUBMISSION (Team Member only)
   /dashboard/team-member → Click "Submit for Approval"
   ↓
   Campaign status → pending_approval
   ↓
   Client Admin notified

3. APPROVAL (Client Admin only)
   /dashboard/client-admin → See "Pending Approvals"
   ↓
   Review campaign details
   ↓
   Click "Approve" or "Reject"
   ↓
   If approved: status → approved
   If rejected: status → rejected (team member can revise)

4. BOOKING (Client Admin only)
   /dashboard/client-admin → Find approved campaign
   ↓
   Click "Book Campaign"
   ↓
   Campaign status → booked
   ↓
   EMAIL sent to assigned Sales Person

5. FOLLOW-UP (Sales Person)
   /dashboard/sales → See "Recent Bookings"
   ↓
   View campaign details
   ↓
   Click "Contact" → Email client admin
   ↓
   Close the deal!
```

---

## 🎯 **Key Integration Points**

### **1. From Dashboard to BuildPlanWizard**

**In Sidebar** (for Client Admin & Team Member):
```jsx
{ path: '/build-plan-wizard', icon: '➕', label: 'Create Campaign' }
```

**Clicking this:**
- Navigates to `/build-plan-wizard`
- Launches the full campaign creation wizard
- After saving, returns to dashboard

---

### **2. From BuildPlanWizard Back to Dashboard**

**After Campaign Save:**
```jsx
// In BuildPlanWizard.jsx
const handleSaveCampaign = async () => {
  // Save campaign...
  
  // Redirect back to dashboard
  if (user.role === 'client_admin') {
    navigate('/dashboard/client-admin');
  } else if (user.role === 'client_user') {
    navigate('/dashboard/team-member');
  }
};
```

---

### **3. Campaign List Integration**

**Dashboard shows campaigns from BuildPlanWizard:**

```jsx
// In ClientAdminDashboard.jsx or TeamMemberDashboard.jsx
useEffect(() => {
  const loadCampaigns = async () => {
    const response = await axios.get('/api/campaign-workflow/my-campaigns');
    setCampaigns(response.data.campaigns);
  };
  loadCampaigns();
}, []);
```

**These campaigns were created in BuildPlanWizard!**

---

## 🗺️ **URL Map**

| URL | Component | Who Can Access | Purpose |
|-----|-----------|----------------|---------|
| `/` | Redirect → `/dashboard` | All | Home |
| `/login` | Login | Public | Legacy login |
| `/auth` | Auth | Public | Passwordless login |
| `/dashboard` | RoleDashboardRedirect | All logged in | Role-based redirect |
| `/dashboard/admin` | SystemAdminPanel | System Admin | User management |
| `/dashboard/sales` | SalesPersonDashboard | Sales Person | Client & booking mgmt |
| `/dashboard/client-admin` | ClientAdminDashboard | Client Admin | Team & approval mgmt |
| `/dashboard/team-member` | TeamMemberDashboard | Team Member | My campaigns |
| **`/build-plan-wizard`** | **BuildPlanWizard** | **Client Admin, Team Member** | **Create campaigns** |
| `/campaigns` | CampaignPlans | Client Admin, Team Member | View campaigns (legacy) |
| `/admin/formats` | AdminFormat | System Admin | Manage formats |
| `/admin/sites` | AdminSite | System Admin | Manage sites |
| `/admin/audience` | AdminAudience | System Admin | Manage audiences |

---

## 🔗 **Navigation Structure**

### **Visual Sidebar Menu**

#### **System Admin**
```
☰ KULT Planning Engine
├── 🏠 Home
├── 👥 Users
├── 🏢 Organizations
├── 💼 Sales People
├── 📊 All Campaigns
└── 📈 Analytics
```

#### **Sales Person**
```
☰ KULT Planning Engine
├── 🏠 Home
├── 🏢 My Clients
├── 📣 Bookings
└── 👤 Profile
```

#### **Client Admin**
```
☰ KULT Planning Engine
├── 🏠 Home
├── 📁 Team Campaigns
├── ⏳ Pending Approval
├── 👥 Team Members
└── ➕ Create Campaign → /build-plan-wizard ✅
```

#### **Team Member**
```
☰ KULT Planning Engine
├── 🏠 Home
├── 📝 My Campaigns
└── ➕ Create Campaign → /build-plan-wizard ✅
```

---

## 🎨 **Visual Flow Example**

### **Team Member Creates Campaign**

```
Step 1: Login
┌──────────────────────────────┐
│   Login Page                 │
│   admin@kult.my / kult2024   │
│   [Login Button]             │
└──────────────────────────────┘
           ↓
Step 2: Dashboard
┌──────────────────────────────┐
│   Team Member Dashboard      │
│   📝 My Campaigns            │
│   ➕ Create Campaign         │ ← Click here!
└──────────────────────────────┘
           ↓
Step 3: BuildPlanWizard
┌──────────────────────────────┐
│   Step 1: Campaign Details   │
│   Name, Objective, Industry  │
│   [Next →]                   │
└──────────────────────────────┘
           ↓
┌──────────────────────────────┐
│   Step 2: Audience           │
│   Select Personas, Filters   │
│   [Next →]                   │
└──────────────────────────────┘
           ↓
┌──────────────────────────────┐
│   Step 3: Formats            │
│   Select Ad Formats          │
│   [Next →]                   │
└──────────────────────────────┘
           ↓
┌──────────────────────────────┐
│   Step 4: Budget             │
│   Allocate Budget            │
│   [Save Campaign]            │
└──────────────────────────────┘
           ↓
Step 4: Back to Dashboard
┌──────────────────────────────┐
│   Team Member Dashboard      │
│   📝 My Campaigns            │
│   ├─ New Campaign (Draft)    │
│   └─ [Submit for Approval]   │ ← Click to submit!
└──────────────────────────────┘
           ↓
Step 5: Approval Flow
┌──────────────────────────────┐
│   Client Admin Dashboard     │
│   ⏳ Pending Approval (1)    │
│   ├─ New Campaign            │
│   └─ [✅ Approve] [❌ Reject]│
└──────────────────────────────┘
```

---

## 🎯 **Summary: How They Connect**

### **The Integration Points**

1. **Login** → Auto-redirects to role-based dashboard
2. **Dashboard Sidebar** → Has "Create Campaign" button
3. **"Create Campaign"** → Opens `/build-plan-wizard`
4. **BuildPlanWizard** → Saves campaign to database
5. **After Save** → Returns to dashboard
6. **Dashboard** → Shows campaigns created in BuildPlanWizard
7. **Campaign Actions** → Submit, Approve, Reject, Book
8. **Booking** → Triggers email to Sales Person
9. **Sales Dashboard** → Shows booked campaigns

### **The Main Flow**

```
Dashboard ↔ BuildPlanWizard ↔ Dashboard
    ↓           ↓              ↓
  View      Create/Edit     Workflow
Campaigns   Campaigns      (Submit/Approve/Book)
```

---

## 📝 **Key Takeaways**

✅ **BuildPlanWizard** = Campaign creation tool (the "engine")
✅ **Dashboards** = Campaign management & workflow
✅ **Integration** = Sidebar button + shared campaign data
✅ **Workflow** = Create → Submit → Approve → Book → Sales
✅ **Role-based** = Different views for different users

---

**The main engine (BuildPlanWizard) is accessed through the "Create Campaign" button in the sidebar of Client Admin and Team Member dashboards!**
