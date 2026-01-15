/**
 * Feedback Store - Simple JSON-based persistence for self-learning system
 * This can be migrated to PostgreSQL/MongoDB later
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const LEARNING_FILE = path.join(DATA_DIR, 'learning_weights.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Initialize files if they don't exist
async function initFiles() {
  await ensureDataDir();
  
  try {
    await fs.access(FEEDBACK_FILE);
  } catch {
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify([], null, 2));
  }
  
  try {
    await fs.access(LEARNING_FILE);
  } catch {
    const initialWeights = {
      personas: {}, // persona_name -> { success_score, selection_count, edit_count }
      platforms: {}, // platform_name -> { success_score, budget_adjustment_avg }
      formats: {}, // format_name -> { success_score, selection_count }
      verticals: {}, // vertical_key -> { persona_adjustments, platform_preferences }
      last_updated: new Date().toISOString()
    };
    await fs.writeFile(LEARNING_FILE, JSON.stringify(initialWeights, null, 2));
  }
}

// Read feedback data
export async function getAllFeedback() {
  await initFiles();
  const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save feedback
export async function saveFeedback(feedback) {
  await initFiles();
  const allFeedback = await getAllFeedback();
  
  const newFeedback = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...feedback
  };
  
  allFeedback.push(newFeedback);
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(allFeedback, null, 2));
  
  return newFeedback;
}

// Read learning weights
export async function getLearningWeights() {
  await initFiles();
  const data = await fs.readFile(LEARNING_FILE, 'utf-8');
  return JSON.parse(data);
}

// Update learning weights
export async function updateLearningWeights(weights) {
  await initFiles();
  weights.last_updated = new Date().toISOString();
  await fs.writeFile(LEARNING_FILE, JSON.stringify(weights, null, 2));
  return weights;
}

// Get feedback by plan ID
export async function getFeedbackByPlanId(planId) {
  const allFeedback = await getAllFeedback();
  return allFeedback.filter(f => f.plan_id === planId);
}

// Get feedback by vertical
export async function getFeedbackByVertical(verticalKey) {
  const allFeedback = await getAllFeedback();
  return allFeedback.filter(f => f.plan_data?.vertical_key === verticalKey);
}

// Get recent feedback (last N entries)
export async function getRecentFeedback(limit = 50) {
  const allFeedback = await getAllFeedback();
  return allFeedback.slice(-limit).reverse();
}

// Get feedback statistics
export async function getFeedbackStats() {
  const allFeedback = await getAllFeedback();
  
  const totalFeedback = allFeedback.length;
  const approvedPlans = allFeedback.filter(f => f.approved).length;
  const avgRating = allFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / (totalFeedback || 1);
  
  const verticalBreakdown = {};
  const commonIssues = {
    audience_too_broad: 0,
    audience_too_narrow: 0,
    wrong_personas: 0,
    budget_too_high: 0,
    budget_too_low: 0,
    missing_platforms: 0,
    wrong_formats: 0
  };
  
  allFeedback.forEach(f => {
    const vertical = f.plan_data?.vertical_key || 'unknown';
    verticalBreakdown[vertical] = (verticalBreakdown[vertical] || 0) + 1;
    
    if (f.dimensional_feedback) {
      Object.keys(commonIssues).forEach(issue => {
        if (f.dimensional_feedback[issue]) {
          commonIssues[issue]++;
        }
      });
    }
  });
  
  return {
    total_feedback: totalFeedback,
    approved_plans: approvedPlans,
    approval_rate: (approvedPlans / (totalFeedback || 1) * 100).toFixed(1) + '%',
    avg_rating: avgRating.toFixed(2),
    vertical_breakdown: verticalBreakdown,
    common_issues: commonIssues
  };
}

export default {
  getAllFeedback,
  saveFeedback,
  getLearningWeights,
  updateLearningWeights,
  getFeedbackByPlanId,
  getFeedbackByVertical,
  getRecentFeedback,
  getFeedbackStats
};
