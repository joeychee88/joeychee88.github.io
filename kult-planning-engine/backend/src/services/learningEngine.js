/**
 * Learning Engine - Analyzes feedback and adjusts planning weights
 */

import { getAllFeedback, getLearningWeights, updateLearningWeights } from '../store/feedbackStore.js';

// Confidence thresholds
const MIN_FEEDBACK_COUNT = 5; // Minimum feedback needed before applying learnings
const HIGH_CONFIDENCE_COUNT = 20; // High confidence threshold
const LEARNING_RATE = 0.3; // How aggressively to adjust weights (0-1)

/**
 * Analyze all feedback and update learning weights
 */
export async function analyzeFeedbackAndLearn() {
  console.log('🧠 Learning Engine: Starting analysis...');
  
  const feedback = await getAllFeedback();
  const weights = await getLearningWeights();
  
  if (feedback.length < MIN_FEEDBACK_COUNT) {
    console.log(`⏳ Not enough feedback yet (${feedback.length}/${MIN_FEEDBACK_COUNT})`);
    return weights;
  }
  
  console.log(`📊 Analyzing ${feedback.length} feedback entries...`);
  
  // Analyze persona performance
  const personaAnalysis = analyzePersonaPerformance(feedback);
  weights.personas = mergeWeights(weights.personas, personaAnalysis, LEARNING_RATE);
  
  // Analyze platform performance
  const platformAnalysis = analyzePlatformPerformance(feedback);
  weights.platforms = mergeWeights(weights.platforms, platformAnalysis, LEARNING_RATE);
  
  // Analyze format performance
  const formatAnalysis = analyzeFormatPerformance(feedback);
  weights.formats = mergeWeights(weights.formats, formatAnalysis, LEARNING_RATE);
  
  // Analyze vertical-specific patterns
  const verticalAnalysis = analyzeVerticalPatterns(feedback);
  weights.verticals = verticalAnalysis;
  
  // Save updated weights
  await updateLearningWeights(weights);
  
  console.log('✅ Learning weights updated successfully');
  console.log(`   - Personas tracked: ${Object.keys(weights.personas).length}`);
  console.log(`   - Platforms tracked: ${Object.keys(weights.platforms).length}`);
  console.log(`   - Formats tracked: ${Object.keys(weights.formats).length}`);
  console.log(`   - Verticals tracked: ${Object.keys(weights.verticals).length}`);
  
  return weights;
}

/**
 * Analyze persona selection performance
 */
function analyzePersonaPerformance(feedback) {
  const personaScores = {};
  
  feedback.forEach(f => {
    if (!f.plan_data?.audiences) return;
    
    const rating = f.overall_rating || 3;
    const audienceFeedback = f.dimensional_feedback?.audience_rating || rating;
    const approved = f.approved ? 1 : 0;
    
    f.plan_data.audiences.forEach(audience => {
      const personaKey = (audience.persona || audience.name || '').toLowerCase();
      if (!personaKey) return;
      
      if (!personaScores[personaKey]) {
        personaScores[personaKey] = {
          success_score: 0,
          selection_count: 0,
          edit_count: 0,
          removal_count: 0,
          total_rating: 0
        };
      }
      
      personaScores[personaKey].selection_count++;
      personaScores[personaKey].total_rating += audienceFeedback;
      personaScores[personaKey].success_score += (audienceFeedback / 5) * 0.5 + approved * 0.5;
      
      // Check if this persona was removed in edits
      if (f.edits?.audiences_removed?.includes(personaKey)) {
        personaScores[personaKey].removal_count++;
        personaScores[personaKey].success_score -= 0.3; // Penalty for removal
      }
    });
    
    // Check for personas that were added (high value signal)
    if (f.edits?.audiences_added) {
      f.edits.audiences_added.forEach(persona => {
        const personaKey = persona.toLowerCase();
        if (!personaScores[personaKey]) {
          personaScores[personaKey] = {
            success_score: 0,
            selection_count: 0,
            edit_count: 0,
            removal_count: 0,
            total_rating: 0
          };
        }
        personaScores[personaKey].success_score += 0.5; // Bonus for being added
        personaScores[personaKey].edit_count++;
      });
    }
  });
  
  // Normalize scores
  Object.keys(personaScores).forEach(persona => {
    const data = personaScores[persona];
    const count = data.selection_count || 1;
    
    data.success_score = data.success_score / count;
    data.avg_rating = data.total_rating / count;
    data.removal_rate = data.removal_count / count;
    data.confidence = Math.min(count / HIGH_CONFIDENCE_COUNT, 1);
    
    // Normalized score: 0-1, where 0.5 is neutral
    data.normalized_score = Math.max(0, Math.min(1, data.success_score));
  });
  
  return personaScores;
}

/**
 * Analyze platform/channel performance
 */
function analyzePlatformPerformance(feedback) {
  const platformScores = {};
  
  feedback.forEach(f => {
    if (!f.plan_data?.lineItems) return;
    
    const rating = f.overall_rating || 3;
    const budgetFeedback = f.dimensional_feedback?.budget_rating || rating;
    const approved = f.approved ? 1 : 0;
    
    f.plan_data.lineItems.forEach(item => {
      const platform = (item.platform || '').toLowerCase();
      if (!platform) return;
      
      if (!platformScores[platform]) {
        platformScores[platform] = {
          success_score: 0,
          selection_count: 0,
          total_budget_allocated: 0,
          budget_adjustment_sum: 0,
          budget_adjustment_count: 0,
          total_rating: 0
        };
      }
      
      platformScores[platform].selection_count++;
      platformScores[platform].total_rating += budgetFeedback;
      platformScores[platform].total_budget_allocated += item.budget || 0;
      platformScores[platform].success_score += (budgetFeedback / 5) * 0.5 + approved * 0.5;
      
      // Track budget adjustments from edits
      if (f.edits?.budget_changes?.[platform]) {
        const change = f.edits.budget_changes[platform];
        platformScores[platform].budget_adjustment_sum += change.percentage_change;
        platformScores[platform].budget_adjustment_count++;
      }
    });
  });
  
  // Normalize scores
  Object.keys(platformScores).forEach(platform => {
    const data = platformScores[platform];
    const count = data.selection_count || 1;
    
    data.success_score = data.success_score / count;
    data.avg_rating = data.total_rating / count;
    data.avg_budget_allocated = data.total_budget_allocated / count;
    data.budget_adjustment_avg = data.budget_adjustment_count > 0
      ? data.budget_adjustment_sum / data.budget_adjustment_count
      : 0;
    data.confidence = Math.min(count / HIGH_CONFIDENCE_COUNT, 1);
    data.normalized_score = Math.max(0, Math.min(1, data.success_score));
  });
  
  return platformScores;
}

/**
 * Analyze ad format performance
 */
function analyzeFormatPerformance(feedback) {
  const formatScores = {};
  
  feedback.forEach(f => {
    if (!f.plan_data?.formats) return;
    
    const rating = f.overall_rating || 3;
    const formatFeedback = f.dimensional_feedback?.format_rating || rating;
    const approved = f.approved ? 1 : 0;
    
    f.plan_data.formats.forEach(format => {
      const formatKey = (format.name || format['Ad format'] || '').toLowerCase();
      if (!formatKey) return;
      
      if (!formatScores[formatKey]) {
        formatScores[formatKey] = {
          success_score: 0,
          selection_count: 0,
          total_rating: 0
        };
      }
      
      formatScores[formatKey].selection_count++;
      formatScores[formatKey].total_rating += formatFeedback;
      formatScores[formatKey].success_score += (formatFeedback / 5) * 0.5 + approved * 0.5;
    });
  });
  
  // Normalize scores
  Object.keys(formatScores).forEach(format => {
    const data = formatScores[format];
    const count = data.selection_count || 1;
    
    data.success_score = data.success_score / count;
    data.avg_rating = data.total_rating / count;
    data.confidence = Math.min(count / HIGH_CONFIDENCE_COUNT, 1);
    data.normalized_score = Math.max(0, Math.min(1, data.success_score));
  });
  
  return formatScores;
}

/**
 * Analyze vertical-specific patterns
 */
function analyzeVerticalPatterns(feedback) {
  const verticalData = {};
  
  feedback.forEach(f => {
    const vertical = f.plan_data?.vertical_key || 'unknown';
    
    if (!verticalData[vertical]) {
      verticalData[vertical] = {
        total_plans: 0,
        approved_plans: 0,
        avg_rating: 0,
        total_rating: 0,
        common_personas_added: {},
        common_personas_removed: {},
        preferred_platforms: {},
        budget_preferences: {}
      };
    }
    
    const vd = verticalData[vertical];
    vd.total_plans++;
    vd.total_rating += f.overall_rating || 0;
    if (f.approved) vd.approved_plans++;
    
    // Track persona changes
    if (f.edits?.audiences_added) {
      f.edits.audiences_added.forEach(persona => {
        vd.common_personas_added[persona] = (vd.common_personas_added[persona] || 0) + 1;
      });
    }
    if (f.edits?.audiences_removed) {
      f.edits.audiences_removed.forEach(persona => {
        vd.common_personas_removed[persona] = (vd.common_personas_removed[persona] || 0) + 1;
      });
    }
    
    // Track platform preferences
    if (f.plan_data?.lineItems) {
      f.plan_data.lineItems.forEach(item => {
        const platform = item.platform;
        if (platform) {
          vd.preferred_platforms[platform] = (vd.preferred_platforms[platform] || 0) + 1;
        }
      });
    }
  });
  
  // Calculate averages and rankings
  Object.keys(verticalData).forEach(vertical => {
    const vd = verticalData[vertical];
    vd.avg_rating = vd.total_rating / (vd.total_plans || 1);
    vd.approval_rate = vd.approved_plans / (vd.total_plans || 1);
    
    // Rank personas by frequency
    vd.top_personas_to_add = Object.entries(vd.common_personas_added)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([persona, count]) => ({ persona, count }));
    
    vd.top_personas_to_avoid = Object.entries(vd.common_personas_removed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([persona, count]) => ({ persona, count }));
    
    vd.top_platforms = Object.entries(vd.preferred_platforms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([platform, count]) => ({ platform, count }));
  });
  
  return verticalData;
}

/**
 * Merge new weights with existing weights using learning rate
 */
function mergeWeights(existing, newWeights, learningRate) {
  const merged = { ...existing };
  
  Object.keys(newWeights).forEach(key => {
    if (!merged[key]) {
      merged[key] = newWeights[key];
    } else {
      // Smooth update using learning rate
      const existingScore = merged[key].normalized_score || 0.5;
      const newScore = newWeights[key].normalized_score || 0.5;
      
      merged[key] = {
        ...merged[key],
        ...newWeights[key],
        normalized_score: existingScore * (1 - learningRate) + newScore * learningRate
      };
    }
  });
  
  return merged;
}

/**
 * Get recommendations for a specific vertical based on learnings
 */
export async function getVerticalRecommendations(verticalKey) {
  const weights = await getLearningWeights();
  const verticalData = weights.verticals?.[verticalKey];
  
  if (!verticalData || verticalData.total_plans < MIN_FEEDBACK_COUNT) {
    return {
      has_sufficient_data: false,
      message: 'Not enough feedback data for this vertical yet'
    };
  }
  
  return {
    has_sufficient_data: true,
    approval_rate: verticalData.approval_rate,
    avg_rating: verticalData.avg_rating,
    recommended_personas: verticalData.top_personas_to_add || [],
    personas_to_avoid: verticalData.top_personas_to_avoid || [],
    preferred_platforms: verticalData.top_platforms || []
  };
}

/**
 * Adjust persona scores based on learnings
 */
export async function adjustPersonaScores(personas, verticalKey) {
  const weights = await getLearningWeights();
  
  return personas.map(persona => {
    const personaKey = (persona.persona || persona.name || '').toLowerCase();
    const personaWeight = weights.personas[personaKey];
    
    if (!personaWeight || personaWeight.confidence < 0.3) {
      // Not enough data, return as-is
      return { ...persona, adjusted_score: 1.0, learning_confidence: 0 };
    }
    
    // Adjust score: normalized_score ranges 0-1, where 0.5 is neutral
    // We convert this to a multiplier: 0.5 -> 1.0x, 1.0 -> 1.5x, 0 -> 0.5x
    const multiplier = 0.5 + personaWeight.normalized_score;
    
    return {
      ...persona,
      adjusted_score: multiplier,
      learning_confidence: personaWeight.confidence,
      learning_data: {
        selection_count: personaWeight.selection_count,
        avg_rating: personaWeight.avg_rating?.toFixed(2),
        removal_rate: (personaWeight.removal_rate * 100).toFixed(1) + '%'
      }
    };
  });
}

export default {
  analyzeFeedbackAndLearn,
  getVerticalRecommendations,
  adjustPersonaScores
};
