import express from 'express';
import jwt from 'jsonwebtoken';
import Campaign, { CampaignStatus } from '../models/Campaign.js';
import User, { UserRole } from '../models/User.js';
import Organization from '../models/Organization.js';
import SalesPerson from '../models/SalesPerson.js';
import { sendCampaignBookingEmail, sendCampaignPendingApprovalEmail } from '../services/emailService.js';

const router = express.Router();

// JWT secret
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

// GET /api/campaign-workflow/my-campaigns
// Get campaigns for current user (filtered by role)
router.get('/my-campaigns', authenticateToken, async (req, res) => {
  try {
    const user = await User.getById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let campaigns = [];

    if (user.role === UserRole.CLIENT_USER || user.role === UserRole.CLIENT_ADMIN) {
      // Client users see their own campaigns
      // Client admins see all organization campaigns
      if (user.role === UserRole.CLIENT_ADMIN) {
        campaigns = await Campaign.getByOrganization(user.organizationId);
      } else {
        campaigns = await Campaign.getByUser(user.id);
      }
    } else if (user.role === UserRole.SALES_PERSON) {
      // Sales people see campaigns assigned to them
      campaigns = await Campaign.getBySalesPerson(user.id);
    } else if (user.role === UserRole.SYSTEM_ADMIN) {
      // System admins see all campaigns
      campaigns = await Campaign.getAll();
    }

    res.json({
      success: true,
      campaigns,
      count: campaigns.length
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: 'Failed to get campaigns' });
  }
});

// GET /api/campaign-workflow/pending-approval
// Get campaigns pending approval for client admin
router.get('/pending-approval', authenticateToken, async (req, res) => {
  try {
    const user = await User.getById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role !== UserRole.CLIENT_ADMIN) {
      return res.status(403).json({ success: false, error: 'Only client admins can view pending approvals' });
    }

    const campaigns = await Campaign.getPendingApprovalForOrganization(user.organizationId);

    res.json({
      success: true,
      campaigns,
      count: campaigns.length
    });

  } catch (error) {
    console.error('Get pending approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending campaigns' });
  }
});

// POST /api/campaign-workflow/:campaignId/submit
// Submit campaign for approval (team member)
router.post('/:campaignId/submit', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const user = await User.getById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const campaign = await Campaign.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check if user owns the campaign
    if (campaign.userId !== user.id) {
      return res.status(403).json({ success: false, error: 'You can only submit your own campaigns' });
    }

    // Check if campaign is in draft status
    if (campaign.status !== CampaignStatus.DRAFT) {
      return res.status(400).json({ success: false, error: 'Only draft campaigns can be submitted' });
    }

    // Submit for approval
    const updatedCampaign = await Campaign.submitForApproval(campaignId, user.id);

    // Get organization and client admin
    const organization = await Organization.getById(campaign.organizationId);
    if (organization && organization.adminUserId) {
      const clientAdmin = await User.getById(organization.adminUserId);
      if (clientAdmin) {
        // Send email notification to client admin
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
        const reviewUrl = `${baseUrl}/dashboard/campaigns/${campaignId}`;
        
        await sendCampaignPendingApprovalEmail(
          clientAdmin.email,
          clientAdmin.name,
          user.name,
          campaign.campaignName,
          {
            budget: campaign.totalBudget,
            objective: campaign.objective
          },
          reviewUrl
        );
      }
    }

    res.json({
      success: true,
      message: 'Campaign submitted for approval',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Submit campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit campaign' });
  }
});

// POST /api/campaign-workflow/:campaignId/approve
// Approve campaign (client admin)
router.post('/:campaignId/approve', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const user = await User.getById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role !== UserRole.CLIENT_ADMIN) {
      return res.status(403).json({ success: false, error: 'Only client admins can approve campaigns' });
    }

    const campaign = await Campaign.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check if campaign belongs to user's organization
    if (campaign.organizationId !== user.organizationId) {
      return res.status(403).json({ success: false, error: 'You can only approve campaigns from your organization' });
    }

    // Check if campaign is pending approval
    if (campaign.status !== CampaignStatus.PENDING_APPROVAL) {
      return res.status(400).json({ success: false, error: 'Only pending campaigns can be approved' });
    }

    // Approve campaign
    const updatedCampaign = await Campaign.approve(campaignId, user.id);

    res.json({
      success: true,
      message: 'Campaign approved successfully',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Approve campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve campaign' });
  }
});

// POST /api/campaign-workflow/:campaignId/reject
// Reject campaign (client admin)
router.post('/:campaignId/reject', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { reason } = req.body;
    const user = await User.getById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role !== UserRole.CLIENT_ADMIN) {
      return res.status(403).json({ success: false, error: 'Only client admins can reject campaigns' });
    }

    const campaign = await Campaign.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check if campaign belongs to user's organization
    if (campaign.organizationId !== user.organizationId) {
      return res.status(403).json({ success: false, error: 'You can only reject campaigns from your organization' });
    }

    // Check if campaign is pending approval
    if (campaign.status !== CampaignStatus.PENDING_APPROVAL) {
      return res.status(400).json({ success: false, error: 'Only pending campaigns can be rejected' });
    }

    // Reject campaign
    const updatedCampaign = await Campaign.reject(campaignId, user.id, reason);

    res.json({
      success: true,
      message: 'Campaign rejected',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Reject campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject campaign' });
  }
});

// POST /api/campaign-workflow/:campaignId/reassign
// Reassign campaign to another team member (client admin)
router.post('/:campaignId/reassign', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { toUserId, reason } = req.body;
    const user = await User.getById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role !== UserRole.CLIENT_ADMIN) {
      return res.status(403).json({ success: false, error: 'Only client admins can reassign campaigns' });
    }

    const campaign = await Campaign.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check if campaign belongs to user's organization
    if (campaign.organizationId !== user.organizationId) {
      return res.status(403).json({ success: false, error: 'You can only reassign campaigns from your organization' });
    }

    // Check if target user exists and belongs to same organization
    const targetUser = await User.getById(toUserId);
    if (!targetUser || targetUser.organizationId !== user.organizationId) {
      return res.status(400).json({ success: false, error: 'Invalid target user' });
    }

    // Reassign campaign
    const updatedCampaign = await Campaign.reassign(
      campaignId,
      campaign.userId,
      toUserId,
      user.id,
      reason
    );

    res.json({
      success: true,
      message: 'Campaign reassigned successfully',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Reassign campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to reassign campaign' });
  }
});

// POST /api/campaign-workflow/:campaignId/book
// Book campaign and send notification to sales person (client admin)
router.post('/:campaignId/book', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const user = await User.getById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role !== UserRole.CLIENT_ADMIN) {
      return res.status(403).json({ success: false, error: 'Only client admins can book campaigns' });
    }

    const campaign = await Campaign.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check if campaign belongs to user's organization
    if (campaign.organizationId !== user.organizationId) {
      return res.status(403).json({ success: false, error: 'You can only book campaigns from your organization' });
    }

    // Check if campaign is approved
    if (campaign.status !== CampaignStatus.APPROVED) {
      return res.status(400).json({ success: false, error: 'Only approved campaigns can be booked' });
    }

    // Book campaign
    const updatedCampaign = await Campaign.book(campaignId, user.id);

    // Get organization and sales person
    const organization = await Organization.getById(campaign.organizationId);
    const salesPerson = await SalesPerson.getById(campaign.assignedSalesPersonId);

    if (salesPerson) {
      // Send booking email to sales person
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3006';
      const campaignUrl = `${baseUrl}/sales/campaigns/${campaignId}`;
      
      const formatsCount = campaign.selectedFormats?.length || 0;
      
      await sendCampaignBookingEmail(
        salesPerson.email,
        salesPerson.name,
        user.name,
        organization?.name || 'Unknown Company',
        campaign.campaignName,
        {
          email: user.email,
          phone: user.phone,
          budget: campaign.totalBudget,
          objective: campaign.objective,
          industry: campaign.industry,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          formats: formatsCount > 0 ? `${formatsCount} formats selected` : 'Multiple'
        },
        campaignUrl
      );

      // Mark sales person as notified
      await Campaign.markSalesPersonNotified(campaignId);
    }

    res.json({
      success: true,
      message: 'Campaign booked successfully. Sales person has been notified.',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Book campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to book campaign' });
  }
});

// GET /api/campaign-workflow/:campaignId
// Get campaign details with full workflow info
router.get('/:campaignId', authenticateToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const user = await User.getById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const campaign = await Campaign.getById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // Check permissions
    const canView = 
      user.role === UserRole.SYSTEM_ADMIN ||
      (user.role === UserRole.SALES_PERSON && campaign.assignedSalesPersonId === user.id) ||
      (user.role === UserRole.CLIENT_ADMIN && campaign.organizationId === user.organizationId) ||
      (user.role === UserRole.CLIENT_USER && campaign.userId === user.id);

    if (!canView) {
      return res.status(403).json({ success: false, error: 'You do not have permission to view this campaign' });
    }

    // Get related data
    const creator = await User.getById(campaign.userId);
    const organization = campaign.organizationId ? await Organization.getById(campaign.organizationId) : null;
    const salesPerson = campaign.assignedSalesPersonId ? await SalesPerson.getById(campaign.assignedSalesPersonId) : null;

    res.json({
      success: true,
      campaign: {
        ...campaign,
        creator: creator ? { id: creator.id, name: creator.name, email: creator.email } : null,
        organization: organization ? { id: organization.id, name: organization.name } : null,
        salesPerson: salesPerson ? { id: salesPerson.id, name: salesPerson.name, email: salesPerson.email } : null
      }
    });

  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ success: false, error: 'Failed to get campaign' });
  }
});

export default router;
