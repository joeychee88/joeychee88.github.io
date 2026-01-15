/**
 * Audience Groups API Routes
 * Manage user's saved audience groups
 */

import express from 'express';

const router = express.Router();

// In-memory storage for audience groups (in production, this would be a database)
// Structure: { userId: [audienceGroups] }
const audienceGroupsStorage = {};

/**
 * GET /api/audience-groups
 * Get all audience groups for the authenticated user
 */
router.get('/', (req, res) => {
  try {
    // In demo mode, we'll use a query parameter for userId
    // In production, this would come from req.user (authenticated token)
    const userId = req.query.userId || req.headers['x-user-id'] || '1';
    
    const userGroups = audienceGroupsStorage[userId] || [];
    
    res.json({
      success: true,
      data: userGroups,
      count: userGroups.length
    });
  } catch (error) {
    console.error('Error fetching audience groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience groups'
    });
  }
});

/**
 * POST /api/audience-groups
 * Create a new audience group
 */
router.post('/', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || '1';
    const groupData = req.body;
    
    // Validate required fields
    if (!groupData.name || !groupData.personas || !Array.isArray(groupData.personas)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid group data: name and personas are required'
      });
    }
    
    // Initialize user's groups if not exists
    if (!audienceGroupsStorage[userId]) {
      audienceGroupsStorage[userId] = [];
    }
    
    // Create new group with server-generated ID and timestamp
    const newGroup = {
      id: Date.now(), // Simple ID generation for demo
      userId: userId,
      name: groupData.name,
      personas: groupData.personas,
      demographics: groupData.demographics || { race: [], generation: [], income: [] },
      totalAudience: groupData.totalAudience || groupData.totalReach || 0,
      uniqueReach: groupData.uniqueReach || groupData.unduplicated || 0,
      unduplicated: groupData.unduplicated || groupData.uniqueReach || 0,
      overlapFactor: groupData.overlapFactor || 0,
      industry: groupData.industry || null,
      objective: groupData.objective || null,
      geography: groupData.geography || [],
      createdBy: groupData.createdBy || 'User',
      createdAt: groupData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to storage
    audienceGroupsStorage[userId].push(newGroup);
    
    res.status(201).json({
      success: true,
      data: newGroup,
      message: 'Audience group created successfully'
    });
  } catch (error) {
    console.error('Error creating audience group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create audience group'
    });
  }
});

/**
 * PUT /api/audience-groups/:id
 * Update an existing audience group
 */
router.put('/:id', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || '1';
    const groupId = parseInt(req.params.id);
    const updateData = req.body;
    
    if (!audienceGroupsStorage[userId]) {
      return res.status(404).json({
        success: false,
        error: 'No audience groups found for this user'
      });
    }
    
    const groupIndex = audienceGroupsStorage[userId].findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }
    
    // Update the group
    const existingGroup = audienceGroupsStorage[userId][groupIndex];
    const updatedGroup = {
      ...existingGroup,
      name: updateData.name !== undefined ? updateData.name : existingGroup.name,
      personas: updateData.personas !== undefined ? updateData.personas : existingGroup.personas,
      demographics: updateData.demographics !== undefined ? updateData.demographics : existingGroup.demographics,
      totalAudience: updateData.totalAudience !== undefined ? updateData.totalAudience : existingGroup.totalAudience,
      unduplicated: updateData.unduplicated !== undefined ? updateData.unduplicated : existingGroup.unduplicated,
      overlapFactor: updateData.overlapFactor !== undefined ? updateData.overlapFactor : existingGroup.overlapFactor,
      updatedAt: new Date().toISOString()
    };
    
    audienceGroupsStorage[userId][groupIndex] = updatedGroup;
    
    res.json({
      success: true,
      data: updatedGroup,
      message: 'Audience group updated successfully'
    });
  } catch (error) {
    console.error('Error updating audience group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update audience group'
    });
  }
});

/**
 * DELETE /api/audience-groups/:id
 * Delete an audience group
 */
router.delete('/:id', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || '1';
    const groupId = parseInt(req.params.id);
    
    if (!audienceGroupsStorage[userId]) {
      return res.status(404).json({
        success: false,
        error: 'No audience groups found for this user'
      });
    }
    
    const groupIndex = audienceGroupsStorage[userId].findIndex(g => g.id === groupId);
    
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Audience group not found'
      });
    }
    
    // Remove the group
    const deletedGroup = audienceGroupsStorage[userId].splice(groupIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedGroup,
      message: 'Audience group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting audience group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audience group'
    });
  }
});

/**
 * DELETE /api/audience-groups
 * Delete all audience groups for the user
 */
router.delete('/', (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || '1';
    
    const deletedCount = audienceGroupsStorage[userId] ? audienceGroupsStorage[userId].length : 0;
    audienceGroupsStorage[userId] = [];
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} audience group(s)`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting all audience groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audience groups'
    });
  }
});

export default router;
