/**
 * Campaigns API
 * Handles saving, loading, and managing campaign plans (drafts and completed)
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage paths
const STORAGE_DIR = path.join(__dirname, '../data');
const CAMPAIGNS_FILE = path.join(STORAGE_DIR, 'campaigns.json');
const AUDIENCE_GROUPS_FILE = path.join(STORAGE_DIR, 'audience-groups.json');
const VERSIONS_DIR = path.join(STORAGE_DIR, 'versions');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(VERSIONS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

// Save campaign version (for version history)
async function saveCampaignVersion(campaignId, campaignData, changeNote = 'Auto-save') {
  try {
    await ensureStorageDir();
    
    const versionFile = path.join(VERSIONS_DIR, `${campaignId}.json`);
    
    // Load existing versions or create new
    let versions = [];
    try {
      const data = await fs.readFile(versionFile, 'utf-8');
      versions = JSON.parse(data);
    } catch (error) {
      // File doesn't exist, start fresh
    }
    
    // Add new version
    const version = {
      versionId: `v${Date.now()}`,
      timestamp: new Date().toISOString(),
      changeNote,
      data: campaignData
    };
    
    versions.push(version);
    
    // Keep only last 50 versions to prevent file bloat
    if (versions.length > 50) {
      versions = versions.slice(-50);
    }
    
    await fs.writeFile(versionFile, JSON.stringify(versions, null, 2), 'utf-8');
    
    console.log(`[VERSION] Saved version for campaign ${campaignId}`);
    return version;
  } catch (error) {
    console.error('[VERSION SAVE ERROR]:', error);
    return null;
  }
}

// Load campaign versions
async function loadCampaignVersions(campaignId) {
  try {
    const versionFile = path.join(VERSIONS_DIR, `${campaignId}.json`);
    const data = await fs.readFile(versionFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // No versions yet
    return [];
  }
}

// Load campaigns from file
async function loadCampaigns() {
  try {
    const data = await fs.readFile(CAMPAIGNS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

// Save campaigns to file
async function saveCampaigns(campaigns) {
  await ensureStorageDir();
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), 'utf-8');
}

// Load audience groups from file
async function loadAudienceGroups() {
  try {
    const data = await fs.readFile(AUDIENCE_GROUPS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

// Save audience groups to file
async function saveAudienceGroups(groups) {
  await ensureStorageDir();
  await fs.writeFile(AUDIENCE_GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf-8');
}

/**
 * GET /api/campaigns
 * Get all campaigns
 */
router.get('/', async (req, res) => {
  try {
    const campaigns = await loadCampaigns();
    
    // Sort by updatedAt descending (most recent first)
    campaigns.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.json({
      success: true,
      campaigns,
      count: campaigns.length
    });
  } catch (error) {
    console.error('[CAMPAIGNS GET ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load campaigns',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get a specific campaign
 */
router.get('/:id', async (req, res) => {
  try {
    const campaigns = await loadCampaigns();
    const campaign = campaigns.find(c => c.id === req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('[CAMPAIGN GET ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load campaign',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns
 * Create or update a campaign (draft or completed)
 */
router.post('/', async (req, res) => {
  try {
    const { campaignPlan, status = 'draft' } = req.body;
    
    console.log('[SAVE CAMPAIGN] Status:', status, 'Name:', campaignPlan.campaignName);
    
    const campaigns = await loadCampaigns();
    
    const now = new Date().toISOString();
    
    // Check if updating existing campaign
    let campaign;
    if (campaignPlan.id) {
      const index = campaigns.findIndex(c => c.id === campaignPlan.id);
      if (index >= 0) {
        campaign = {
          ...campaigns[index],
          ...campaignPlan,
          status,
          updatedAt: now
        };
        campaigns[index] = campaign;
        console.log('[CAMPAIGN] Updated existing:', campaign.id);
      } else {
        // ID provided but not found, create new
        campaign = {
          ...campaignPlan,
          id: campaignPlan.id,
          status,
          createdAt: now,
          updatedAt: now
        };
        campaigns.push(campaign);
        console.log('[CAMPAIGN] Created with provided ID:', campaign.id);
      }
    } else {
      // No ID, create new
      campaign = {
        ...campaignPlan,
        id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status,
        createdAt: now,
        updatedAt: now
      };
      campaigns.push(campaign);
      console.log('[CAMPAIGN] Created new:', campaign.id);
    }
    
    await saveCampaigns(campaigns);
    
    res.json({
      success: true,
      message: `Campaign ${status === 'draft' ? 'draft saved' : 'completed'}`,
      campaign,
      campaignId: campaign.id
    });
    
  } catch (error) {
    console.error('[CAMPAIGN SAVE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save campaign',
      message: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update an existing campaign
 */
router.put('/:id', async (req, res) => {
  try {
    const { campaignPlan, status } = req.body;
    const campaigns = await loadCampaigns();
    
    const index = campaigns.findIndex(c => c.id === req.params.id);
    
    if (index < 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const now = new Date().toISOString();
    
    const updatedCampaign = {
      ...campaigns[index],
      ...campaignPlan,
      id: req.params.id, // Preserve original ID
      status: status || campaigns[index].status,
      updatedAt: now
    };
    
    campaigns[index] = updatedCampaign;
    
    await saveCampaigns(campaigns);
    
    // Save version history
    await saveCampaignVersion(req.params.id, updatedCampaign, 'Auto-save update');
    
    console.log('[CAMPAIGN] Updated:', req.params.id);
    
    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign: campaigns[index]
    });
    
  } catch (error) {
    console.error('[CAMPAIGN UPDATE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete a campaign
 */
router.delete('/:id', async (req, res) => {
  try {
    const campaigns = await loadCampaigns();
    const index = campaigns.findIndex(c => c.id === req.params.id);
    
    if (index < 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const deleted = campaigns.splice(index, 1)[0];
    await saveCampaigns(campaigns);
    
    console.log('[CAMPAIGN] Deleted:', req.params.id);
    
    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      campaign: deleted
    });
    
  } catch (error) {
    console.error('[CAMPAIGN DELETE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id/versions
 * Get version history for a campaign
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await loadCampaignVersions(req.params.id);
    
    res.json({
      success: true,
      versions,
      count: versions.length
    });
  } catch (error) {
    console.error('[VERSIONS GET ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load version history',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/restore/:versionId
 * Restore a specific version
 */
router.post('/:id/restore/:versionId', async (req, res) => {
  try {
    const versions = await loadCampaignVersions(req.params.id);
    const version = versions.find(v => v.versionId === req.params.versionId);
    
    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Version not found'
      });
    }
    
    // Update current campaign with version data
    const campaigns = await loadCampaigns();
    const index = campaigns.findIndex(c => c.id === req.params.id);
    
    if (index < 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const now = new Date().toISOString();
    campaigns[index] = {
      ...version.data,
      id: req.params.id,
      updatedAt: now
    };
    
    await saveCampaigns(campaigns);
    
    // Save new version noting the restore
    await saveCampaignVersion(req.params.id, campaigns[index], `Restored from version ${req.params.versionId}`);
    
    console.log('[CAMPAIGN] Restored version:', req.params.versionId);
    
    res.json({
      success: true,
      message: 'Version restored successfully',
      campaign: campaigns[index]
    });
    
  } catch (error) {
    console.error('[VERSION RESTORE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore version',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/duplicate
 * Duplicate a campaign
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const campaigns = await loadCampaigns();
    const original = campaigns.find(c => c.id === req.params.id);
    
    if (!original) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const now = new Date().toISOString();
    const duplicate = {
      ...original,
      id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaignName: `${original.campaignName} (Copy)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };
    
    campaigns.push(duplicate);
    await saveCampaigns(campaigns);
    
    console.log('[CAMPAIGN] Duplicated:', req.params.id, '→', duplicate.id);
    
    res.json({
      success: true,
      message: 'Campaign duplicated successfully',
      campaign: duplicate
    });
    
  } catch (error) {
    console.error('[CAMPAIGN DUPLICATE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/audience-groups
 * Get all saved audience groups
 */
router.get('/audience-groups/all', async (req, res) => {
  try {
    const groups = await loadAudienceGroups();
    
    res.json({
      success: true,
      groups,
      count: groups.length
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS GET ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load audience groups',
      message: error.message
    });
  }
});

/**
 * POST /api/audience-groups
 * Save an audience group
 */
router.post('/audience-groups', async (req, res) => {
  try {
    const { name, personas } = req.body;
    
    if (!name || !personas || personas.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name and personas are required'
      });
    }
    
    const groups = await loadAudienceGroups();
    
    const now = new Date().toISOString();
    const group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      personas,
      createdAt: now,
      updatedAt: now
    };
    
    groups.push(group);
    await saveAudienceGroups(groups);
    
    console.log('[AUDIENCE GROUP] Saved:', group.name);
    
    res.json({
      success: true,
      message: 'Audience group saved successfully',
      group
    });
    
  } catch (error) {
    console.error('[AUDIENCE GROUP SAVE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save audience group',
      message: error.message
    });
  }
});

/**
 * DELETE /api/audience-groups/:id
 * Delete an audience group
 */
router.delete('/audience-groups/:id', async (req, res) => {
  try {
    const groups = await loadAudienceGroups();
    const index = groups.findIndex(g => g.id === req.params.id);
    
    if (index < 0) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }
    
    const deleted = groups.splice(index, 1)[0];
    await saveAudienceGroups(groups);
    
    console.log('[AUDIENCE GROUP] Deleted:', req.params.id);
    
    res.json({
      success: true,
      message: 'Audience group deleted successfully',
      group: deleted
    });
    
  } catch (error) {
    console.error('[AUDIENCE GROUP DELETE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audience group',
      message: error.message
    });
  }
});

export default router;
