export const users = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@kult.my',
    role: 'system_admin',
    organizationId: null
  },
  {
    id: 2,
    name: 'Sarah Tan',
    email: 'sarah.tan@kult.my',
    role: 'sales_person',
    organizationId: null
  },
  {
    id: 3,
    name: 'John Client Admin',
    email: 'clientadmin@test.com',
    role: 'client_admin',
    organizationId: 'org_001'
  },
  {
    id: 4,
    name: 'Jane Team Member',
    email: 'teammember@test.com',
    role: 'client_user',
    organizationId: 'org_001'
  }
];

export const clients = [
  {
    id: 1,
    name: 'Acme Corporation',
    industry: 'Technology',
    contactPerson: 'John Doe',
    email: 'john@acme.com',
    phone: '+60123456789'
  }
];

export const campaigns = [
  {
    id: 1,
    clientId: 1,
    name: 'Q4 2024 Campaign',
    status: 'active',
    budget: 50000,
    startDate: '2024-10-01',
    endDate: '2024-12-31'
  }
];

export const dashboardStats = {
  campaigns: {
    total: 12,
    active: 5,
    completed: 7,
    draft: 2
  },
  clients: {
    total: 8,
    active: 6
  },
  revenue: {
    total: 250000,
    thisMonth: 45000
  }
};
