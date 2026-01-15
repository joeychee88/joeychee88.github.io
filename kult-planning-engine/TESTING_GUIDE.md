# 🧪 Testing Guide - User Management System (v3.59.1)

## 🔐 Test Accounts (Legacy Login)

All test accounts use the same password: **`kult2024`**

### Test Users by Role

| Role | Email | Password | Dashboard URL | What You Can Test |
|------|-------|----------|---------------|-------------------|
| **System Admin** | `admin@kult.my` | `kult2024` | `/dashboard/admin` | Full user management, org management, sales assignment |
| **Sales Person** | `sarah.tan@kult.my` | `kult2024` | `/dashboard/sales` | View assigned clients, booked campaigns, contact clients |
| **Client Admin** | `clientadmin@test.com` | `kult2024` | `/dashboard/client-admin` | Approve campaigns, book campaigns, manage team |
| **Team Member** | `teammember@test.com` | `kult2024` | `/dashboard/team-member` | Create campaigns, submit for approval |

---

## 🚀 Quick Start Testing

### **Step 1: Access the Login Page**

Visit: **https://3006-ii2u2a7dw2eck8g09a9sb-02b9cc79.sandbox.novita.ai/login**

### **Step 2: Test Each Role**

#### **Test 1: System Admin Dashboard** 👑

1. **Login**: `admin@kult.my` / `kult2024`
2. **Auto-redirect to**: `/dashboard/admin`
3. **What you see**:
   - **Users Tab**: View all users, promote/deactivate
   - **Organizations Tab**: View all client companies, assign sales people
   - **Sales People Tab**: Add/edit sales staff
   - **Stats Tab**: System analytics

**Test Actions**:
- ✅ View all users
- ✅ Promote a user to Client Admin
- ✅ Deactivate/activate a user
- ✅ View organizations
- ✅ Assign sales person to organization
- ✅ View system statistics

---

#### **Test 2: Sales Person Dashboard** 💼

1. **Login**: `sarah.tan@kult.my` / `kult2024`
2. **Auto-redirect to**: `/dashboard/sales`
3. **What you see**:
   - My Clients (assigned organizations)
   - Recent Campaign Bookings
   - All Client Campaigns
   - Revenue stats

**Test Actions**:
- ✅ View assigned clients
- ✅ See client details (team size, campaigns)
- ✅ View booked campaigns
- ✅ Contact client admins (opens mailto:)
- ✅ Track revenue

---

#### **Test 3: Client Admin Dashboard** 👨‍💼

1. **Login**: `clientadmin@test.com` / `kult2024`
2. **Auto-redirect to**: `/dashboard/client-admin`
3. **What you see**:
   - Team Campaigns (all team's campaigns)
   - Pending Approvals
   - Stats: Total, Pending, Approved, Booked

**Test Actions**:
- ✅ View all team campaigns
- ✅ Approve pending campaigns
- ✅ Reject campaigns (with reason)
- ✅ Book approved campaigns → Triggers email to sales
- ✅ Reassign campaigns to team members
- ✅ Create new campaign

---

#### **Test 4: Team Member Dashboard** 👤

1. **Login**: `teammember@test.com` / `kult2024`
2. **Auto-redirect to**: `/dashboard/team-member`
3. **What you see**:
   - My Campaigns (own campaigns only)
   - Stats: Total, Draft, Pending, Approved, Booked
   - Campaign workflow help

**Test Actions**:
- ✅ Create new campaign
- ✅ Edit draft campaigns
- ✅ Submit campaign for approval
- ✅ View campaign status
- ✅ Revise rejected campaigns

---

## 🔄 Complete Workflow Test

### **Scenario: From Campaign Creation to Sales Booking**

#### **Step 1: Team Member Creates Campaign**

1. Login as: `teammember@test.com` / `kult2024`
2. Click **"Create New Campaign"**
3. Go through BuildPlanWizard:
   - Step 1: Campaign details (name, objective, industry)
   - Step 2: Audience (select personas, demographics)
   - Step 3: Formats (select ad formats)
   - Step 4: Budget (allocate budget)
4. Save as Draft
5. **Submit for Approval** → Status becomes `pending_approval`

#### **Step 2: Client Admin Reviews**

1. Logout → Login as: `clientadmin@test.com` / `kult2024`
2. Dashboard shows **"1 Pending Approval"**
3. Click on pending campaign
4. Review campaign details
5. Click **"✅ Approve"** → Status becomes `approved`

#### **Step 3: Client Admin Books Campaign**

1. Find approved campaign in list
2. Click **"📅 Book"**
3. Confirm booking
4. **Email sent to Sales Person** (Sarah Tan)
5. Status becomes `booked`

#### **Step 4: Sales Person Receives Notification**

1. Logout → Login as: `sarah.tan@kult.my` / `kult2024`
2. Dashboard shows new booking in **"Recent Campaign Bookings"**
3. View campaign details
4. Click **"📧 Contact"** to reach client admin
5. Follow up on booking

---

## 🎯 Feature Testing Checklist

### **Authentication** ✅
- [x] Legacy password login works
- [x] Auto-redirect based on role
- [x] Session persists (7 days)
- [x] Logout clears session

### **System Admin Features** 🔧
- [ ] View all users
- [ ] Promote user to Client Admin
- [ ] Deactivate user
- [ ] Activate user
- [ ] View all organizations
- [ ] Assign sales person to org
- [ ] View all sales people
- [ ] Add new sales person
- [ ] View system stats

### **Sales Person Features** 💼
- [ ] View assigned clients
- [ ] View client campaigns
- [ ] View booked campaigns
- [ ] Contact client admin
- [ ] Track revenue
- [ ] See client team size

### **Client Admin Features** 👔
- [ ] View all team campaigns
- [ ] Approve campaign
- [ ] Reject campaign (with reason)
- [ ] Book campaign (sends email)
- [ ] Reassign campaign to team member
- [ ] Create new campaign
- [ ] View pending approvals

### **Team Member Features** 👤
- [ ] Create campaign
- [ ] Edit draft
- [ ] Submit for approval
- [ ] View my campaigns
- [ ] View campaign status
- [ ] Revise rejected campaign

### **UI/UX** 🎨
- [ ] Sidebar navigation works
- [ ] Sidebar collapses on mobile
- [ ] Status badges display correctly
- [ ] Currency formatting (MYR)
- [ ] Date formatting
- [ ] Responsive design
- [ ] Hover states
- [ ] Loading states

---

## 🐛 Known Issues / Limitations

### Current Limitations:
1. **Email Service**: Uses Ethereal (test mode) - emails don't actually send
   - In production, configure SendGrid or AWS SES
2. **Magic Link**: Currently using legacy login for testing
   - Magic link flow is functional but requires email access
3. **Campaign Data**: Uses JSON file storage (backend/data/*.json)
   - In production, migrate to PostgreSQL
4. **Reassignment**: Can only reassign to users in same organization
5. **No Campaign Details Page**: View campaign opens placeholder

### To Test Later:
- [ ] Magic link signup flow
- [ ] Magic link login flow
- [ ] Email notifications (when email service configured)
- [ ] Campaign editing after booking
- [ ] Multi-organization scenarios
- [ ] Sales territory assignment

---

## 📊 Test Data Locations

All test data is stored in JSON files:

```
backend/data/
├── users.json              # All users
├── organizations.json      # Client companies
├── salespeople.json        # Sales staff
├── magic_tokens.json       # Magic link tokens
└── campaigns.json          # Campaigns (from BuildPlanWizard)
```

You can inspect or modify these files for testing.

---

## 🔍 Debugging Tips

### Check Backend Logs
```bash
tail -f /tmp/backend.log
```

### Check Backend API
```bash
# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kult.my","password":"kult2024"}'

# Get user info (requires token)
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Frontend Console
Open browser DevTools → Console tab to see:
- API requests/responses
- Redux state changes
- Component render logs

---

## 🎓 User Roles Explained

### Role Hierarchy

```
┌─────────────────────────────────────┐
│      System Admin (KULT Team)       │ ← Full platform control
└─────────────────────────────────────┘
              ↓ manages
┌─────────────────────────────────────┐
│      Sales Person (KULT Team)       │ ← Manages clients
└─────────────────────────────────────┘
              ↓ assigned to
┌─────────────────────────────────────┐
│     Organization (Client Company)   │
│  ├─ Client Admin (Team Lead)        │ ← Approves & books
│  └─ Client Users (Team Members)     │ ← Creates campaigns
└─────────────────────────────────────┘
```

### Permission Matrix

| Feature | System Admin | Sales Person | Client Admin | Team Member |
|---------|-------------|--------------|--------------|-------------|
| Create Campaign | ✅ | ❌ | ✅ | ✅ |
| Approve Campaign | ✅ | ❌ | ✅ | ❌ |
| Book Campaign | ✅ | ❌ | ✅ | ❌ |
| View All Campaigns | ✅ | Own clients | Own org | Own only |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Assign Sales | ✅ | ❌ | ❌ | ❌ |
| Contact Clients | ✅ | ✅ | N/A | N/A |
| Reassign Campaign | ✅ | ❌ | ✅ | ❌ |

---

## 🚨 Important Notes

1. **Legacy Login is for Testing Only**
   - In production, use magic link authentication
   - Legacy login will be removed in production

2. **All Passwords are: `kult2024`**
   - Easy to remember during testing
   - Not secure - only for development

3. **Backend Must Be Running**
   - Check: `http://localhost:5001/health`
   - Should return: `{"status":"healthy","mode":"demo"}`

4. **Frontend Must Be Running**
   - Port: 3006
   - URL: https://3006-ii2u2a7dw2eck8g09a9sb-02b9cc79.sandbox.novita.ai

---

## 📞 Need Help?

If you encounter issues:
1. Check backend logs: `tail -f /tmp/backend.log`
2. Check frontend console (F12 → Console)
3. Verify backend is running: `curl http://localhost:5001/health`
4. Clear browser cache and localStorage
5. Try a different test account

---

## ✅ Quick Verification

After logging in, you should see:

### **System Admin** `/dashboard/admin`
- Tabs: Users | Organizations | Sales People | Stats
- User table with Promote/Deactivate buttons

### **Sales Person** `/dashboard/sales`
- Stats: My Clients | Total Campaigns | Booked | Revenue
- Client cards with contact buttons

### **Client Admin** `/dashboard/client-admin`
- Stats: Total | Pending | Approved | Booked
- Pending Approvals section (if any)
- All Team Campaigns list

### **Team Member** `/dashboard/team-member`
- Stats: Total | Draft | Pending | Approved | Booked
- My Campaigns list
- Create Campaign button

---

**Last Updated**: December 26, 2025  
**Version**: v3.59.1  
**Status**: ✅ Ready for Testing  
**Login Type**: Legacy Password (Testing Mode)
