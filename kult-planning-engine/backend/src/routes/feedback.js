/**
 * Feedback API Routes
 */

import express from 'express';
import {
  saveFeedback,
  getAllFeedback,
  getRecentFeedback,
  getFeedbackStats,
  getFeedbackByVertical,
  getLearningWeights
} from '../store/feedbackStore.js';
import {
  analyzeFeedbackAndLearn,
  getVerticalRecommendations,
  adjustPersonaScores
} from '../services/learningEngine.js';

const router = express.Router();

/**
 * POST /api/feedback
 * Submit feedback for a generated plan
 */
router.post('/', async (req, res) => {
  try {
    const feedback = req.body;
    
    // Validate required fields
    if (!feedback.plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }
    
    // Save feedback
    const saved = await saveFeedback(feedback);
    
    // Trigger learning engine (async, don't wait)
    analyzeFeedbackAndLearn().catch(err => {
      console.error('Learning engine error:', err);
    });
    
    res.status(201).json({
      success: true,
      feedback: saved,
      message: 'Feedback received. Thank you for helping improve our AI!'
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * GET /api/feedback/stats
 * Get overall feedback statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getFeedbackStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ error: 'Failed to get feedback stats' });
  }
});

/**
 * GET /api/feedback/recent
 * Get recent feedback entries
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const feedback = await getRecentFeedback(limit);
    res.json(feedback);
  } catch (error) {
    console.error('Error getting recent feedback:', error);
    res.status(500).json({ error: 'Failed to get recent feedback' });
  }
});

/**
 * GET /api/feedback/vertical/:verticalKey
 * Get feedback for a specific vertical
 */
router.get('/vertical/:verticalKey', async (req, res) => {
  try {
    const { verticalKey } = req.params;
    const feedback = await getFeedbackByVertical(verticalKey);
    res.json(feedback);
  } catch (error) {
    console.error('Error getting vertical feedback:', error);
    res.status(500).json({ error: 'Failed to get vertical feedback' });
  }
});

/**
 * POST /api/feedback/learn
 * Manually trigger learning engine analysis
 */
router.post('/learn', async (req, res) => {
  try {
    console.log('🎓 Manual learning trigger requested');
    const weights = await analyzeFeedbackAndLearn();
    res.json({
      success: true,
      message: 'Learning analysis completed',
      weights: {
        personas_tracked: Object.keys(weights.personas).length,
        platforms_tracked: Object.keys(weights.platforms).length,
        formats_tracked: Object.keys(weights.formats).length,
        verticals_tracked: Object.keys(weights.verticals).length,
        last_updated: weights.last_updated
      }
    });
  } catch (error) {
    console.error('Error running learning engine:', error);
    res.status(500).json({ error: 'Failed to run learning engine' });
  }
});

/**
 * GET /api/feedback/weights
 * Get current learning weights
 */
router.get('/weights', async (req, res) => {
  try {
    const weights = await getLearningWeights();
    res.json(weights);
  } catch (error) {
    console.error('Error getting learning weights:', error);
    res.status(500).json({ error: 'Failed to get learning weights' });
  }
});

/**
 * GET /api/feedback/recommendations/:verticalKey
 * Get AI recommendations for a vertical based on learnings
 */
router.get('/recommendations/:verticalKey', async (req, res) => {
  try {
    const { verticalKey } = req.params;
    const recommendations = await getVerticalRecommendations(verticalKey);
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * POST /api/feedback/adjust-personas
 * Adjust persona scores based on learnings
 */
router.post('/adjust-personas', async (req, res) => {
  try {
    const { personas, verticalKey } = req.body;
    
    if (!personas || !Array.isArray(personas)) {
      return res.status(400).json({ error: 'personas array is required' });
    }
    
    const adjusted = await adjustPersonaScores(personas, verticalKey);
    res.json(adjusted);
  } catch (error) {
    console.error('Error adjusting personas:', error);
    res.status(500).json({ error: 'Failed to adjust personas' });
  }
});

export default router;
