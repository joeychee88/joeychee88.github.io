import express from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole, UserStatus } from '../models/User.js';
import Organization, { OrganizationStatus } from '../models/Organization.js';
import SalesPerson, { SalesPersonStatus } from '../models/SalesPerson.js';
import Campaign from '../models/Campaign.js';
import { sendWelcomeEmail } from '../services/emailService.js';

const router = express.Router();

// JWT secret - must match auth.js and demo-server.js
const JWT_SECRET = process.env.JWT_SECRET || 'kult_secret_key_change_in_production';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Admin-only middleware
const requireAdmin = async (req, res, next) => {
  const user = await User.getById(req.user.userId);
  if (!user || (user.role !== UserRole.SYSTEM_ADMIN && user.role !== UserRole.CLIENT_ADMIN)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  req.adminUser = user;
  next();
};

// System admin only
const requireSystemAdmin = async (req, res, next) => {
  const user = await User.getById(req.user.userId);
  if (!user || user.role !== UserRole.SYSTEM_ADMIN) {
    return res.status(403).json({ success: false, error: 'System admin access required' });
  }
  req.adminUser = user;
  next();
};

// ===== USER MANAGEMENT =====

// GET /api/admin/users
// Get all users (system admin) or organization users (client admin)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let users;
    
    if (req.adminUser.role === UserRole.SYSTEM_ADMIN) {
      // System admin sees all users
      users = await User.getAll();
    } else {
      // Client admin sees only their organization users
      users = await User.getByOrganization(req.adminUser.organizationId);
    }

    // Enrich with organization data
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const organization = user.organizationId ? await Organization.getById(user.organizationId) : null;
      return {
        ...user,
        organization: organization ? { id: organization.id, name: organization.name } : null
      };
    }));

    res.json({
      success: true,
      users: enrichedUsers,
      count: enrichedUsers.length
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// POST /api/admin/users
// Create a new user (system admin only)
router.post('/users', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { name, email, password, role, organizationId, status } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role' 
      });
    }

    // Validate organization if provided
    if (organizationId) {
      const org = await Organization.getById(organizationId);
      if (!org) {
        return res.status(400).json({ 
          success: false, 
          error: 'Organization not found' 
        });
      }
    }

    // Create user
    const newUser = await User.create({
      name,
      email,
      password, // Note: In production, this should be hashed
      role: role || UserRole.CLIENT_USER,
      organizationId: organizationId || null,
      status: status || UserStatus.ACTIVE
    });

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name, password);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send welcome email, but user was created:', emailError);
      // Don't fail the user creation if email fails
    }

    res.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:userId
// Update a user (system admin only)
router.put('/users/:userId', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, organizationId, assignedSalesPersonId, status } = req.body;

    // Check if user exists
    const user = await User.getById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Validation
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
    }

    // Check if email is taken by another user
    if (email !== user.email) {
      const existingUser = await User.getByEmail(email);
      // Handle both string and numeric IDs in comparison
      if (existingUser && existingUser.id != userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email is already in use by another user' 
        });
      }
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role' 
      });
    }

    // Validate organization if provided
    if (organizationId) {
      const org = await Organization.getById(organizationId);
      if (!org) {
        return res.status(400).json({ 
          success: false, 
          error: 'Organization not found' 
        });
      }
    }

    // Validate sales person if provided
    if (assignedSalesPersonId) {
      const salesPerson = await SalesPerson.getById(assignedSalesPersonId);
      if (!salesPerson) {
        return res.status(400).json({ 
          success: false, 
          error: 'Sales person not found' 
        });
      }
    }

    // Update user
    const updatedUser = await User.update(userId, {
      name,
      email,
      role: role || user.role,
      organizationId: organizationId || null,
      assignedSalesPersonId: assignedSalesPersonId || null,
      status: status || user.status
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:userId/promote
// Promote user to client admin
router.post('/users/:userId/promote', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check permissions
    if (req.adminUser.role === UserRole.CLIENT_ADMIN) {
      // Client admin can only promote users in their organization
      if (user.organizationId !== req.adminUser.organizationId) {
        return res.status(403).json({ success: false, error: 'Cannot promote users from other organizations' });
      }
    }

    const updatedUser = await User.promoteToClientAdmin(userId);

    res.json({
      success: true,
      message: 'User promoted to client admin',
      user: updatedUser
    });

  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ success: false, error: 'Failed to promote user' });
  }
});

// POST /api/admin/users/:userId/deactivate
// Deactivate user
router.post('/users/:userId/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check permissions
    if (req.adminUser.role === UserRole.CLIENT_ADMIN) {
      if (user.organizationId !== req.adminUser.organizationId) {
        return res.status(403).json({ success: false, error: 'Cannot deactivate users from other organizations' });
      }
    }

    const updatedUser = await User.update(userId, { status: UserStatus.INACTIVE });

    res.json({
      success: true,
      message: 'User deactivated',
      user: updatedUser
    });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate user' });
  }
});

// ===== ORGANIZATION MANAGEMENT =====

// GET /api/admin/organizations
// Get all organizations (system admin only)
router.get('/organizations', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const organizations = await Organization.getAll();
    
    // Enrich with stats
    const enrichedOrgs = await Promise.all(organizations.map(async (org) => {
      const users = await User.getByOrganization(org.id);
      const campaigns = await Campaign.getByOrganization(org.id);
      const salesPerson = org.assignedSalesPersonId ? await SalesPerson.getById(org.assignedSalesPersonId) : null;
      
      return {
        ...org,
        stats: {
          userCount: users.length,
          campaignCount: campaigns.length
        },
        salesPerson: salesPerson ? { id: salesPerson.id, name: salesPerson.name } : null
      };
    }));

    res.json({
      success: true,
      organizations: enrichedOrgs,
      count: enrichedOrgs.length
    });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get organizations' });
  }
});

// GET /api/admin/organizations/:orgId
// Get organization details
router.get('/organizations/:orgId', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const organization = await Organization.getById(orgId);
    
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const users = await User.getByOrganization(orgId);
    const campaigns = await Campaign.getByOrganization(orgId);
    const salesPerson = organization.assignedSalesPersonId ? 
      await SalesPerson.getById(organization.assignedSalesPersonId) : null;

    res.json({
      success: true,
      organization: {
        ...organization,
        users,
        campaigns,
        salesPerson
      }
    });

  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ success: false, error: 'Failed to get organization' });
  }
});

// POST /api/admin/organizations
// Create a new organization (system admin only)
router.post('/organizations', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { name, industry, assignedSalesPersonId } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Organization name is required' 
      });
    }

    // Check if organization already exists
    const existingOrg = await Organization.getByName(name);
    if (existingOrg) {
      return res.status(400).json({ 
        success: false, 
        error: 'Organization with this name already exists' 
      });
    }

    // Validate sales person if provided
    if (assignedSalesPersonId) {
      const salesPerson = await SalesPerson.getById(assignedSalesPersonId);
      if (!salesPerson) {
        return res.status(400).json({ 
          success: false, 
          error: 'Sales person not found' 
        });
      }
    }

    // Create organization
    const newOrg = await Organization.create({
      name,
      industry: industry || '',
      assignedSalesPersonId: assignedSalesPersonId || null,
      status: 'active'
    });

    res.json({
      success: true,
      message: 'Organization created successfully',
      organization: newOrg
    });

  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ success: false, error: 'Failed to create organization' });
  }
});

// PUT /api/admin/organizations/:orgId
// Update organization (system admin only)
router.put('/organizations/:orgId', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, industry, assignedSalesPersonId } = req.body;

    // Check if organization exists
    const organization = await Organization.getById(orgId);
    if (!organization) {
      return res.status(404).json({ 
        success: false, 
        error: 'Organization not found' 
      });
    }

    // Validation
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Organization name is required' 
      });
    }

    // Check if name is taken by another organization
    if (name !== organization.name) {
      const existingOrg = await Organization.getByName(name);
      if (existingOrg && existingOrg.id !== orgId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Organization name is already in use' 
        });
      }
    }

    // Validate sales person if provided
    if (assignedSalesPersonId) {
      const salesPerson = await SalesPerson.getById(assignedSalesPersonId);
      if (!salesPerson) {
        return res.status(400).json({ 
          success: false, 
          error: 'Sales person not found' 
        });
      }
    }

    // Update organization
    const updatedOrg = await Organization.update(orgId, {
      name,
      industry: industry || '',
      assignedSalesPersonId: assignedSalesPersonId || null
    });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: updatedOrg
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ success: false, error: 'Failed to update organization' });
  }
});

// POST /api/admin/organizations/:orgId/assign-sales
// Assign sales person to organization
router.post('/organizations/:orgId/assign-sales', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { salesPersonId } = req.body;
    
    const organization = await Organization.getById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const salesPerson = await SalesPerson.getById(salesPersonId);
    if (!salesPerson) {
      return res.status(404).json({ success: false, error: 'Sales person not found' });
    }

    // Update organization
    const updatedOrg = await Organization.update(orgId, {
      assignedSalesPersonId: salesPersonId
    });

    // Assign organization to sales person
    await SalesPerson.assignOrganization(salesPersonId, orgId);

    // Update all organization users' assigned sales person
    const users = await User.getByOrganization(orgId);
    await Promise.all(users.map(user => 
      User.update(user.id, { assignedSalesPersonId: salesPersonId })
    ));

    res.json({
      success: true,
      message: 'Sales person assigned successfully',
      organization: updatedOrg
    });

  } catch (error) {
    console.error('Assign sales person error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign sales person' });
  }
});

// ===== SALES PERSON MANAGEMENT =====

// GET /api/admin/salespeople
// Get all sales people (system admin only)
router.get('/salespeople', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const salesPeople = await SalesPerson.getAll();
    
    // Enrich with stats
    const enrichedSalesPeople = await Promise.all(salesPeople.map(async (sp) => {
      const organizations = await Organization.getBySalesPerson(sp.id);
      const campaigns = await Campaign.getBySalesPerson(sp.id);
      
      return {
        ...sp,
        stats: {
          organizationCount: organizations.length,
          campaignCount: campaigns.length
        }
      };
    }));

    res.json({
      success: true,
      salesPeople: enrichedSalesPeople,
      count: enrichedSalesPeople.length
    });

  } catch (error) {
    console.error('Get sales people error:', error);
    res.status(500).json({ success: false, error: 'Failed to get sales people' });
  }
});

// POST /api/admin/salespeople
// Create new sales person (creates both SalesPerson and User records)
router.post('/salespeople', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, department, territory, industries } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    // Check if user with this email already exists
    const existingUser = await User.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Create SalesPerson record
    const salesPerson = await SalesPerson.create({
      name,
      email,
      phone,
      department,
      territory,
      industries: industries || [],
      status: SalesPersonStatus.ACTIVE
    });

    // Create User account for login
    const user = await User.create({
      name,
      email,
      password, // Note: In production, hash this password
      role: UserRole.SALES_PERSON,
      status: UserStatus.ACTIVE
    });

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, name, password);
      console.log(`✅ Welcome email sent to sales person ${email}`);
    } catch (emailError) {
      console.error('⚠️ Failed to send welcome email to sales person, but account was created:', emailError);
      // Don't fail the creation if email fails
    }

    res.json({
      success: true,
      message: 'Sales person created successfully',
      salesPerson,
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Create sales person error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create sales person' });
  }
});

// PUT /api/admin/salespeople/:salesPersonId
// Update sales person
router.put('/salespeople/:salesPersonId', authenticateToken, requireSystemAdmin, async (req, res) => {
  try {
    const { salesPersonId } = req.params;
    const updates = req.body;
    
    const salesPerson = await SalesPerson.getById(salesPersonId);
    if (!salesPerson) {
      return res.status(404).json({ success: false, error: 'Sales person not found' });
    }

    const updatedSalesPerson = await SalesPerson.update(salesPersonId, updates);

    res.json({
      success: true,
      message: 'Sales person updated successfully',
      salesPerson: updatedSalesPerson
    });

  } catch (error) {
    console.error('Update sales person error:', error);
    res.status(500).json({ success: false, error: 'Failed to update sales person' });
  }
});

// ===== DASHBOARD STATS =====

// GET /api/admin/stats
// Get dashboard statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let stats = {};

    if (req.adminUser.role === UserRole.SYSTEM_ADMIN) {
      // System admin stats
      const users = await User.getAll();
      const organizations = await Organization.getAll();
      const salesPeople = await SalesPerson.getAll();
      const campaigns = await Campaign.getAll();
      const campaignStats = await Campaign.getStats();

      stats = {
        users: {
          total: users.length,
          active: users.filter(u => u.status === UserStatus.ACTIVE).length,
          clientAdmins: users.filter(u => u.role === UserRole.CLIENT_ADMIN).length,
          clientUsers: users.filter(u => u.role === UserRole.CLIENT_USER).length
        },
        organizations: {
          total: organizations.length,
          active: organizations.filter(o => o.status === OrganizationStatus.ACTIVE).length
        },
        salesPeople: {
          total: salesPeople.length,
          active: salesPeople.filter(s => s.status === SalesPersonStatus.ACTIVE).length
        },
        campaigns: campaignStats
      };
    } else {
      // Client admin stats
      const users = await User.getByOrganization(req.adminUser.organizationId);
      const campaigns = await Campaign.getByOrganization(req.adminUser.organizationId);
      const pendingApproval = campaigns.filter(c => c.status === 'pending_approval');

      stats = {
        users: {
          total: users.length,
          teamMembers: users.filter(u => u.role === UserRole.CLIENT_USER).length
        },
        campaigns: {
          total: campaigns.length,
          draft: campaigns.filter(c => c.status === 'draft').length,
          pending: pendingApproval.length,
          approved: campaigns.filter(c => c.status === 'approved').length,
          booked: campaigns.filter(c => c.status === 'booked').length
        }
      };
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

export default router;
