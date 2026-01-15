import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMPAIGNS_FILE = path.join(__dirname, '../data/campaigns.json');

// Campaign status
export const CampaignStatus = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  BOOKED: 'booked',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

class Campaign {
  constructor() {
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      await fs.access(CAMPAIGNS_FILE);
    } catch {
      await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify([], null, 2));
    }
  }

  async getAll() {
    try {
      const data = await fs.readFile(CAMPAIGNS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading campaigns:', error);
      return [];
    }
  }

  async getById(id) {
    const campaigns = await this.getAll();
    return campaigns.find(c => c.id === id);
  }

  async getByUser(userId) {
    const campaigns = await this.getAll();
    return campaigns.filter(c => c.userId === userId);
  }

  async getByOrganization(organizationId) {
    const campaigns = await this.getAll();
    return campaigns.filter(c => c.organizationId === organizationId);
  }

  async getBySalesPerson(salesPersonId) {
    const campaigns = await this.getAll();
    return campaigns.filter(c => c.assignedSalesPersonId === salesPersonId);
  }

  async getByStatus(status) {
    const campaigns = await this.getAll();
    return campaigns.filter(c => c.status === status);
  }

  async getPendingApprovalForOrganization(organizationId) {
    const campaigns = await this.getAll();
    return campaigns.filter(c => 
      c.organizationId === organizationId && 
      c.status === CampaignStatus.PENDING_APPROVAL
    );
  }

  async create(campaignData) {
    const campaigns = await this.getAll();
    
    const newCampaign = {
      id: campaignData.id || `camp_${crypto.randomBytes(8).toString('hex')}`,
      userId: campaignData.userId,
      organizationId: campaignData.organizationId,
      assignedSalesPersonId: campaignData.assignedSalesPersonId || null,
      
      // Campaign details
      campaignName: campaignData.campaignName || '',
      advertiserName: campaignData.advertiserName || '',
      brandProduct: campaignData.brandProduct || '',
      objective: campaignData.objective || '',
      industry: campaignData.industry || '',
      
      // Dates
      startDate: campaignData.startDate || '',
      endDate: campaignData.endDate || '',
      
      // Audience
      selectedPersonas: campaignData.selectedPersonas || [],
      massTargeting: campaignData.massTargeting || false,
      targetLanguages: campaignData.targetLanguages || [],
      audienceIntent: campaignData.audienceIntent || '',
      audienceExclusions: campaignData.audienceExclusions || '',
      demographicFilters: campaignData.demographicFilters || {
        race: [],
        generation: [],
        income: []
      },
      audienceGroups: campaignData.audienceGroups || [],
      selectedStates: campaignData.selectedStates || [],
      
      // Formats and Sites
      selectedFormats: campaignData.selectedFormats || [],
      selectedSites: campaignData.selectedSites || [],
      
      // Budget
      totalBudget: campaignData.totalBudget || '',
      budgetFlexibility: campaignData.budgetFlexibility || 'fixed',
      buyingPreference: campaignData.buyingPreference || 'no_preference',
      budgetChannels: campaignData.budgetChannels || [],
      optimisedGroups: campaignData.optimisedGroups || [],
      
      // Workflow
      status: campaignData.status || CampaignStatus.DRAFT,
      currentStep: campaignData.currentStep || 1,
      
      workflow: {
        createdBy: campaignData.userId,
        createdAt: new Date().toISOString(),
        submittedAt: null,
        submittedBy: null,
        
        approvedByClientAdmin: false,
        clientAdminApprovedAt: null,
        clientAdminApprovedBy: null,
        
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: '',
        
        bookedAt: null,
        bookedBy: null,
        salesPersonNotified: false,
        salesPersonNotifiedAt: null
      },
      
      // Reassignments history
      reassignments: campaignData.reassignments || [],
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    campaigns.push(newCampaign);
    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
    
    return newCampaign;
  }

  async update(id, updates) {
    const campaigns = await this.getAll();
    const index = campaigns.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error('Campaign not found');
    }

    // Merge updates
    campaigns[index] = {
      ...campaigns[index],
      ...updates,
      id: campaigns[index].id, // Preserve ID
      userId: campaigns[index].userId, // Preserve original creator
      workflow: {
        ...campaigns[index].workflow,
        ...(updates.workflow || {})
      },
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
    
    return campaigns[index];
  }

  // Submit campaign for approval
  async submitForApproval(campaignId, userId) {
    return this.update(campaignId, {
      status: CampaignStatus.PENDING_APPROVAL,
      workflow: {
        submittedAt: new Date().toISOString(),
        submittedBy: userId
      }
    });
  }

  // Approve campaign (client admin)
  async approve(campaignId, approverUserId) {
    return this.update(campaignId, {
      status: CampaignStatus.APPROVED,
      workflow: {
        approvedByClientAdmin: true,
        clientAdminApprovedAt: new Date().toISOString(),
        clientAdminApprovedBy: approverUserId
      }
    });
  }

  // Reject campaign (client admin)
  async reject(campaignId, rejectorUserId, reason = '') {
    return this.update(campaignId, {
      status: CampaignStatus.REJECTED,
      workflow: {
        rejectedAt: new Date().toISOString(),
        rejectedBy: rejectorUserId,
        rejectionReason: reason
      }
    });
  }

  // Book campaign (client admin)
  async book(campaignId, bookerUserId) {
    return this.update(campaignId, {
      status: CampaignStatus.BOOKED,
      workflow: {
        bookedAt: new Date().toISOString(),
        bookedBy: bookerUserId
      }
    });
  }

  // Mark sales person as notified
  async markSalesPersonNotified(campaignId) {
    return this.update(campaignId, {
      workflow: {
        salesPersonNotified: true,
        salesPersonNotifiedAt: new Date().toISOString()
      }
    });
  }

  // Reassign campaign to another user
  async reassign(campaignId, fromUserId, toUserId, reassignedBy, reason = '') {
    const campaign = await this.getById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const reassignment = {
      fromUserId,
      toUserId,
      reassignedBy,
      reassignedAt: new Date().toISOString(),
      reason
    };

    const reassignments = [...(campaign.reassignments || []), reassignment];

    return this.update(campaignId, {
      userId: toUserId, // Change owner
      status: CampaignStatus.DRAFT, // Reset to draft when reassigned
      reassignments,
      workflow: {
        ...campaign.workflow,
        submittedAt: null, // Clear submission
        submittedBy: null,
        approvedByClientAdmin: false,
        clientAdminApprovedAt: null,
        clientAdminApprovedBy: null
      }
    });
  }

  async delete(id) {
    const campaigns = await this.getAll();
    const filtered = campaigns.filter(c => c.id !== id);
    
    if (filtered.length === campaigns.length) {
      throw new Error('Campaign not found');
    }

    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(filtered, null, 2));
    
    return true;
  }

  // Get campaign statistics
  async getStats() {
    const campaigns = await this.getAll();
    
    return {
      total: campaigns.length,
      byStatus: {
        draft: campaigns.filter(c => c.status === CampaignStatus.DRAFT).length,
        pending_approval: campaigns.filter(c => c.status === CampaignStatus.PENDING_APPROVAL).length,
        approved: campaigns.filter(c => c.status === CampaignStatus.APPROVED).length,
        booked: campaigns.filter(c => c.status === CampaignStatus.BOOKED).length,
        rejected: campaigns.filter(c => c.status === CampaignStatus.REJECTED).length,
        in_progress: campaigns.filter(c => c.status === CampaignStatus.IN_PROGRESS).length,
        live: campaigns.filter(c => c.status === CampaignStatus.LIVE).length,
        completed: campaigns.filter(c => c.status === CampaignStatus.COMPLETED).length
      }
    };
  }
}

export default new Campaign();
