/**
 * Audience Groups API
 * Allows users to save and reuse audience segments across campaigns
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// In-memory storage for audience groups (fallback)
let audienceGroups = [];

// File path for persistent storage
const STORAGE_FILE = path.join(__dirname, '../data/audience-groups.json');

// Load audience groups from file on startup
const loadAudienceGroups = () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      audienceGroups = JSON.parse(data);
      console.log(`[AUDIENCE GROUPS] Loaded ${audienceGroups.length} groups from file`);
    }
  } catch (error) {
    console.error('[AUDIENCE GROUPS] Error loading from file:', error.message);
  }
};

// Save audience groups to file
const saveAudienceGroups = () => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(audienceGroups, null, 2));
    console.log(`[AUDIENCE GROUPS] Saved ${audienceGroups.length} groups to file`);
  } catch (error) {
    console.error('[AUDIENCE GROUPS] Error saving to file:', error.message);
  }
};

// Initialize on startup
loadAudienceGroups();

/**
 * GET /api/audience-groups
 * Get all saved audience groups
 */
router.get('/', (req, res) => {
  try {
    console.log(`[AUDIENCE GROUPS] GET - Returning ${audienceGroups.length} groups`);
    res.json({
      success: true,
      groups: audienceGroups
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS] GET Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience groups'
    });
  }
});

/**
 * POST /api/audience-groups
 * Save a new audience group
 */
router.post('/', (req, res) => {
  try {
    const { name, personas, totalReach, uniqueReach, industry, objective, geography, createdBy } = req.body;

    if (!name || !personas || !Array.isArray(personas) || personas.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid audience group data. Name and personas are required.'
      });
    }

    const newGroup = {
      id: Date.now().toString(),
      name,
      personas,
      totalReach: totalReach || 0,
      uniqueReach: uniqueReach || 0,
      industry: industry || null,
      objective: objective || null,
      geography: geography || [],
      createdAt: new Date().toISOString(),
      createdBy: createdBy || 'User',
      usageCount: 0
    };

    audienceGroups.push(newGroup);
    saveAudienceGroups();

    console.log(`[AUDIENCE GROUPS] POST - Created group: ${name} (${personas.length} personas)`);

    res.json({
      success: true,
      message: 'Audience group saved successfully',
      group: newGroup
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS] POST Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save audience group'
    });
  }
});

/**
 * GET /api/audience-groups/:id
 * Get a specific audience group by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const group = audienceGroups.find(g => g.id === id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }

    // Increment usage count
    group.usageCount = (group.usageCount || 0) + 1;
    saveAudienceGroups();

    console.log(`[AUDIENCE GROUPS] GET /:id - Loaded group: ${group.name}`);

    res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS] GET /:id Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience group'
    });
  }
});

/**
 * DELETE /api/audience-groups/:id
 * Delete an audience group
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = audienceGroups.findIndex(g => g.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }

    const deletedGroup = audienceGroups.splice(index, 1)[0];
    saveAudienceGroups();

    console.log(`[AUDIENCE GROUPS] DELETE - Removed group: ${deletedGroup.name}`);

    res.json({
      success: true,
      message: 'Audience group deleted successfully'
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS] DELETE Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audience group'
    });
  }
});

/**
 * PUT /api/audience-groups/:id
 * Update an audience group
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, personas } = req.body;

    const group = audienceGroups.find(g => g.id === id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }

    // Update fields
    if (name) group.name = name;
    if (personas) group.personas = personas;
    group.updatedAt = new Date().toISOString();

    saveAudienceGroups();

    console.log(`[AUDIENCE GROUPS] PUT - Updated group: ${group.name}`);

    res.json({
      success: true,
      message: 'Audience group updated successfully',
      group
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS] PUT Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update audience group'
    });
  }
});

/**
 * POST /api/audience-groups/:id/use
 * Increment usage count for an audience group
 */
router.post('/:id/use', (req, res) => {
  try {
    const { id } = req.params;
    const group = audienceGroups.find(g => g.id === id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }

    // Increment usage count
    group.usageCount = (group.usageCount || 0) + 1;
    group.lastUsedAt = new Date().toISOString();

    saveAudienceGroups();

    console.log(`[AUDIENCE GROUPS] POST /:id/use - Incremented usage for: ${group.name} (count: ${group.usageCount})`);

    res.json({
      success: true,
      message: 'Usage count incremented',
      usageCount: group.usageCount
    });
  } catch (error) {
    console.error('[AUDIENCE GROUPS] POST /:id/use Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment usage count'
    });
  }
});

module.exports = router;
