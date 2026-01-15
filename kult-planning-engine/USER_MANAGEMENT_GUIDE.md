# User Management Platform - Complete Guide (v3.59.0)

## 🎯 Overview

The KULT Planning Engine now includes a complete **User Management System** with passwordless authentication and role-based dashboards. Here's how to access and use it.

---

## 🔐 Authentication System

### Passwordless Magic Link Login
- **No passwords required** - Users receive login links via email
- **Secure 15-minute tokens** - Magic links expire after 15 minutes
- **7-day sessions** - Once logged in, users stay authenticated for 7 days

### Sign Up Flow
1. Visit `/auth` (the main auth page)
2. Enter: Email, Name, Company Name, Industry
3. Click "Create Account"
4. Check email for magic link
5. Click link to auto-login

### Login Flow
1. Visit `/auth`
2. Enter your email
3. Check email for magic link
4. Click link to login

---

## 👥 User Roles & Access

### 4 Role-Based Dashboards

#### 1. **Team Member** (client_user)
- **Route**: `/dashboard/team-member`
- **Who**: Individual users creating campaigns
- **Features**:
  - View my campaigns
  - Create new campaigns
  - Edit drafts
  - Submit campaigns for approval
  - View campaign status

#### 2. **Client Admin** (client_admin)
- **Route**: `/dashboard/client-admin`
- **Who**: Team leads managing their team's campaigns
- **Features**:
  - View all team campaigns
  - Approve/reject campaigns
  - Book approved campaigns (triggers email to sales)
  - Reassign campaigns to team members
  - Team management

#### 3. **Sales Person** (sales_person)
- **Route**: `/dashboard/sales`
- **Who**: Sales staff managing assigned clients
- **Features**:
  - View my assigned clients
  - View all client campaigns
  - See booked campaigns
  - Contact client admins
  - Track revenue & bookings

#### 4. **System Admin** (system_admin)
- **Route**: `/dashboard/admin`
- **Who**: Internal KULT administrators
- **Features**:
  - User management (promote, deactivate users)
  - Organization management (assign sales people)
  - Sales people management (add, edit territories)
  - System analytics & statistics
  - Full platform oversight

---

## 📍 How to Access the User Management Platform

### From the Admin UI (NEW in v3.59.0)

When you log in, the system automatically redirects you to your role-specific dashboard:

1. **Login** at: `https://3006-ii2u2a7dw2eck8g09a9sb-02b9cc79.sandbox.novita.ai/auth`

2. **Auto-redirect based on role:**
   - System Admin → `/dashboard/admin` (User Management Panel)
   - Sales Person → `/dashboard/sales`
   - Client Admin → `/dashboard/client-admin`
   - Team Member → `/dashboard/team-member`

3. **Navigation Sidebar** (visible on all dashboard pages):
   - Click the hamburger menu (☰) to open/close sidebar
   - Role-specific menu items appear based on your permissions
   - Quick access to all features

### Direct URLs

- **Auth/Login**: `/auth`
- **Magic Link Verify**: `/auth/verify?token=...`
- **Team Member Dashboard**: `/dashboard/team-member`
- **Client Admin Dashboard**: `/dashboard/client-admin`
- **Sales Dashboard**: `/dashboard/sales`
- **System Admin Panel**: `/dashboard/admin`

---

## 🔄 Campaign Workflow

### For Team Members:
1. Create campaign → Save as draft
2. Submit for approval → Status: `pending_approval`
3. Wait for Client Admin review

### For Client Admins:
1. Review pending campaigns
2. Approve → Status: `approved`
3. Book campaign → Status: `booked` + Email to Sales Person

### For Sales People:
1. Receive booking email notification
2. View campaign details
3. Contact client admin
4. Follow up on booking

---

## 📧 Email Notifications

### Magic Link Emails
- **Sign Up**: "Welcome to KULT Planning Engine"
- **Login**: "Your KULT Planning Engine Login Link"
- Expires in 15 minutes

### Campaign Emails
- **Booking**: Sent to assigned Sales Person when Client Admin books a campaign
  - Includes: Campaign details, budget, client contact info
- **Approval Request**: Sent to Client Admin when team member submits campaign
  - Includes: Campaign summary, review link

---

## 🏢 Organization & Team Structure

### Organization
- Created automatically during sign-up
- First user becomes Client Admin
- Assigned a Sales Person automatically (round-robin or by industry)

### Team Members
- Additional users from same company
- Automatically join the organization
- Can be promoted to Client Admin by System Admin

---

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account & send magic link
- `POST /api/auth/login` - Request magic link
- `GET /api/auth/verify?token=...` - Verify magic link & create session
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

### Campaign Workflow
- `GET /api/campaign-workflow/my-campaigns` - Get my campaigns
- `GET /api/campaign-workflow/pending-approval` - Get pending approvals (Client Admin)
- `POST /api/campaign-workflow/:id/submit` - Submit for approval
- `POST /api/campaign-workflow/:id/approve` - Approve campaign (Client Admin)
- `POST /api/campaign-workflow/:id/reject` - Reject campaign (Client Admin)
- `POST /api/campaign-workflow/:id/reassign` - Reassign to team member
- `POST /api/campaign-workflow/:id/book` - Book campaign (triggers email to sales)

### Admin Management
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/:id/promote` - Promote to Client Admin
- `POST /api/admin/users/:id/deactivate` - Deactivate user
- `GET /api/admin/organizations` - List all organizations
- `POST /api/admin/organizations/:id/assign-sales` - Assign sales person
- `GET /api/admin/salespeople` - List sales people
- `POST /api/admin/salespeople` - Create sales person
- `GET /api/admin/stats` - Get system statistics

---

## 🎨 UI Features

### Dashboard Layout
- **Top Navigation Bar**: Logo, user info, logout
- **Collapsible Sidebar**: Role-based menu items
- **Main Content Area**: Dashboard content
- **Responsive Design**: Works on mobile, tablet, desktop

### Common UI Elements
- Status badges (Draft, Pending, Approved, Booked, etc.)
- Currency formatting (MYR)
- Date formatting (locale-aware)
- Action buttons (Edit, View, Approve, Reject, Book, etc.)

---

## 📊 Version History

- **v3.59.0** (Current): 4 role-based dashboards added
- **v3.58.3**: Passwordless auth pages (signup, login, verify)
- **v3.58.2**: Campaign workflow & admin management APIs
- **v3.58.1**: Magic link authentication system & email service
- **v3.58.0**: Database models (Users, Organizations, MagicTokens, SalesPeople)

---

## 🚀 Deployment Status

- **Version**: v3.59.0
- **Frontend URL**: https://3006-ii2u2a7dw2eck8g09a9sb-02b9cc79.sandbox.novita.ai
- **Backend Port**: 5001
- **Status**: ✅ PRODUCTION READY

---

## 🧪 Testing Instructions

### Test User Sign Up
1. Visit: `/auth`
2. Sign up with test email
3. Check Ethereal email for magic link
4. Click link to auto-login
5. Should redirect to role-specific dashboard

### Test Campaign Workflow
1. Login as Team Member
2. Create campaign → Submit for approval
3. Login as Client Admin
4. Approve campaign
5. Book campaign → Check sales person receives email

### Test System Admin Panel
1. Login as system_admin role
2. Navigate to `/dashboard/admin`
3. View users, organizations, sales people
4. Test user promotion
5. Test organization management

---

## 📝 Default Sales People

Three default sales people are created:
1. **Sarah Tan** - Tech & E-commerce industries
2. **Kevin Lim** - Automotive & Property industries
3. **Michelle Wong** - Beauty & FMCG industries

---

## 🔑 Key Features Summary

✅ Passwordless authentication (magic links)
✅ 4 role-based dashboards
✅ Team hierarchy & organization management
✅ Campaign approval workflow
✅ Campaign reassignment
✅ Booking email notifications to sales
✅ User promotion & deactivation
✅ Sales person assignment
✅ System analytics
✅ Responsive UI with sidebar navigation
✅ Auto-redirect based on user role

---

## 🎯 What's Working Now

1. **Authentication**: Passwordless magic link sign up & login
2. **Dashboards**: All 4 role-specific dashboards
3. **Navigation**: Sidebar with role-based menu
4. **Campaign Workflow**: Submit → Approve → Book flow
5. **Email Notifications**: Booking emails to sales
6. **User Management**: Admin panel for user/org management

---

## 🆘 Troubleshooting

### Can't find User Management?
- After login, you'll be auto-redirected to your role-specific dashboard
- If you're a system_admin, you'll go to `/dashboard/admin`
- Check the sidebar menu (☰) for navigation options

### Not seeing sidebar?
- Click the hamburger menu icon (☰) in top-left
- Sidebar collapses automatically on mobile

### Magic link not working?
- Links expire after 15 minutes
- Request a new link from `/auth`
- Check spam folder for emails

---

## 📞 Support

For questions or issues with the User Management Platform, please contact the development team or check the API documentation at `/api/docs` (if available).

---

**Last Updated**: December 26, 2025
**Version**: v3.59.0
**Status**: ✅ Production Ready
