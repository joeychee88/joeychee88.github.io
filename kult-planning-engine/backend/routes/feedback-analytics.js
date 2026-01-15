/**
 * Feedback Analytics API Routes
 * Provides endpoints for viewing feedback analytics and improvement suggestions
 */

import express from 'express';
import FeedbackAnalyzer from '../analytics/feedbackAnalyzer.js';

const router = express.Router();
const analyzer = new FeedbackAnalyzer();

/**
 * GET /api/feedback-analytics/summary
 * Get weekly feedback summary
 */
router.get('/summary', async (req, res) => {
  try {
    const daysBack = parseInt(req.query.days) || 7;
    const summary = analyzer.generateWeeklySummary(daysBack);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[ANALYTICS] Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
});

/**
 * GET /api/feedback-analytics/disliked
 * Get recent disliked messages
 */
router.get('/disliked', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const disliked = analyzer.findDislikedMessages(limit);
    
    res.json({
      success: true,
      data: disliked
    });
  } catch (error) {
    console.error('[ANALYTICS] Error fetching disliked messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch disliked messages'
    });
  }
});

/**
 * GET /api/feedback-analytics/suggestions
 * Get improvement suggestions based on feedback
 */
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = analyzer.generateImprovementSuggestions();
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('[ANALYTICS] Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions'
    });
  }
});

/**
 * GET /api/feedback-analytics/report
 * Generate and return full weekly report
 */
router.get('/report', async (req, res) => {
  try {
    const report = analyzer.exportReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('[ANALYTICS] Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

export default router;
