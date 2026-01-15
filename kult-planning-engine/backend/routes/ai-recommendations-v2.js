import express from 'express';
import axios from 'axios';
import { calculateImpressions } from '../utils/impressionCalculator.js';

const router = express.Router();

/**
 * Generate Campaign Analysis (v2) - Intent-Based Planning Quality Evaluation
 * Applies strategic guardrails and funnel-aware logic
 */
async function generateOverviewRecommendationsV2(brief, currentSelections = {}) {
  const { 
    campaign_objective = 'Awareness', 
    budget_rm = 100000,
    industry = 'retail_ecommerce',
    campaign_duration_weeks = 4,  // Default to 4 weeks
    geography = 'Nationwide'       // Default to Nationwide
  } = brief;
  
  const { 
    audiences = [], 
    formats = [], 
    sites = [],
    budgetChannels = [],
    audienceUniverse = null  // Target audience universe size
  } = currentSelections;
  
  console.log('[OVERVIEW ANALYSIS V2] Analyzing campaign plan:', {
    objective: campaign_objective,
    budget: budget_rm,
    audiences: audiences.length,
    formats: formats.length,
    sites: sites.length
  });
  
  // Fetch format details to analyze format types
  let formatDetails = [];
  try {
    const formatsResponse = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
    const allFormats = formatsResponse.data?.data || [];
    formatDetails = allFormats.filter(f => formats.includes(f.id));
  } catch (error) {
    console.error('[FORMAT FETCH ERROR]:', error.message);
  }
  
  // Categorize formats
  const formatCategories = categorizeFormats(formatDetails);
  
  // Normalize objective
  const objectiveLower = campaign_objective.toLowerCase();
  const isAwareness = objectiveLower.includes('awareness') || objectiveLower.includes('brand');
  const isEngagement = objectiveLower.includes('engagement') || objectiveLower.includes('traffic') || objectiveLower.includes('interest');
  const isConsideration = objectiveLower.includes('consideration');
  const isConversion = objectiveLower.includes('conversion') || objectiveLower.includes('lead') || objectiveLower.includes('sales');
  
  // ===== 1. CAMPAIGN HEALTH SCORE =====
  let healthScore = 50; // Base score
  let healthMessages = [];
  
  // Persona Quality Logic
  const personaScore = evaluatePersonaQuality(audiences.length, campaign_objective, formatCategories);
  healthScore += personaScore.points;
  healthMessages.push(...personaScore.messages);
  
  // Format × Objective Logic
  const formatScore = evaluateFormatObjectiveAlignment(campaign_objective, formatCategories);
  healthScore += formatScore.points;
  healthMessages.push(...formatScore.messages);
  
  // Channel Coverage
  const channelScore = evaluateChannelCoverage(sites.length, budget_rm);
  healthScore += channelScore.points;
  healthMessages.push(...channelScore.messages);
  
  // Budget Adequacy
  const budgetScore = evaluateBudgetAdequacy(budget_rm, audiences.length, formats.length, sites.length);
  healthScore += budgetScore.points;
  healthMessages.push(...budgetScore.messages);
  
  // Cap at 100
  healthScore = Math.max(0, Math.min(healthScore, 100));
  
  const healthReason = healthScore >= 80 
    ? 'Campaign demonstrates strong strategic alignment with clear targeting and appropriate format selection'
    : healthScore >= 60
    ? 'Campaign foundation is solid with opportunities to strengthen format-objective alignment'
    : 'This setup may limit effectiveness. Consider reviewing persona selection and format mix for better objective alignment';
  
  const recommendations = [];
  
  recommendations.push({
    id: 'health-score',
    name: 'Campaign Health Score',
    type: 'overview',
    subtype: 'health',
    confidence: healthScore,
    score: healthScore,
    reason: healthReason,
    icon: 'chart',
    color: healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'orange'
  });
  
  // ===== 2. CAMPAIGN STRENGTHS =====
  const strengths = identifyCampaignStrengths(
    campaign_objective,
    audiences.length,
    formatCategories,
    sites.length,
    budget_rm
  );
  
  if (strengths.length > 0) {
    recommendations.push({
      id: 'strengths',
      name: 'Campaign Strengths',
      type: 'overview',
      subtype: 'strengths',
      confidence: 95,
      items: strengths,
      reason: `${strengths.length} strategic advantage${strengths.length > 1 ? 's' : ''} identified`,
      icon: 'check',
      color: 'green'
    });
  }
  
  // ===== 3. OPTIMIZATION OPPORTUNITIES =====
  const optimizations = identifyOptimizationOpportunities(
    campaign_objective,
    audiences.length,
    formatCategories,
    formatDetails,
    sites.length,
    budget_rm
  );
  
  if (optimizations.length > 0) {
    recommendations.push({
      id: 'optimizations',
      name: 'Optimization Opportunities',
      type: 'overview',
      subtype: 'optimizations',
      confidence: 85,
      items: optimizations,
      reason: `${optimizations.length} strategic enhancement${optimizations.length > 1 ? 's' : ''} recommended`,
      icon: 'lightbulb',
      color: 'purple'
    });
  }
  
  // ===== 4. ESTIMATED PERFORMANCE =====
  const metrics = calculateExpectedPerformance(
    budget_rm,
    formatCategories,
    audiences.length,
    budgetChannels,
    formatDetails,
    campaign_duration_weeks,
    geography,
    audienceUniverse
  );
  
  recommendations.push({
    id: 'metrics',
    name: 'Estimated Performance',
    type: 'overview',
    subtype: 'metrics',
    confidence: 80,
    metrics,
    reason: 'Based on KULT benchmarks. Actual performance will be driven by the quality of your content, creative execution, and campaign offer.',
    disclaimer: `Estimated reach is modeled based on campaign duration (${metrics.reachCalculation.campaignDurationWeeks} weeks), frequency benchmarks (avg ${metrics.reachCalculation.avgFrequency}x), audience size, and geographic penetration. Actual delivery may vary.`,
    icon: 'chart-bar',
    color: 'cyan'
  });
  
  console.log(`[OVERVIEW V2] Health: ${healthScore}, Strengths: ${strengths.length}, Optimizations: ${optimizations.length}`);
  return recommendations;
}

/**
 * Categorize formats into strategic types
 */
function categorizeFormats(formatDetails) {
  const categories = {
    highImpact: [],
    video: [],
    interactive: [],
    native: [],
    standardDisplay: [],
    social: [],
    dataCapture: []
  };
  
  formatDetails.forEach(format => {
    const nameLower = (format.name || '').toLowerCase();
    const typeLower = (format.type || '').toLowerCase();
    const goalLower = (format.goal || '').toLowerCase();
    
    // High Impact
    if (typeLower.includes('high impact') || 
        nameLower.includes('masthead') || 
        nameLower.includes('takeover') || 
        nameLower.includes('skinner') ||
        nameLower.includes('wallpaper')) {
      categories.highImpact.push(format);
    }
    
    // Video (excluding social video)
    if ((typeLower.includes('video') || nameLower.includes('instream') || nameLower.includes('video')) &&
        !nameLower.includes('social')) {
      categories.video.push(format);
    }
    
    // Interactive
    if (typeLower.includes('interactive') || 
        nameLower.includes('quiz') || 
        nameLower.includes('game') || 
        nameLower.includes('calculator') ||
        nameLower.includes('hotspot') ||
        nameLower.includes('storytelling')) {
      categories.interactive.push(format);
    }
    
    // Native
    if (typeLower.includes('native') || 
        nameLower.includes('in article') || 
        nameLower.includes('in-article') ||
        nameLower.includes('in image')) {
      categories.native.push(format);
    }
    
    // Data Capture
    if (goalLower.includes('lead') || 
        goalLower.includes('capture') || 
        goalLower.includes('form') ||
        nameLower.includes('data capture')) {
      categories.dataCapture.push(format);
    }
    
    // Social
    if (nameLower.includes('social')) {
      categories.social.push(format);
    }
    
    // Standard Display
    if (typeLower.includes('banner') || 
        nameLower.includes('leaderboard') || 
        nameLower.includes('mrec') ||
        nameLower.includes('banner')) {
      categories.standardDisplay.push(format);
    }
  });
  
  return categories;
}

/**
 * Evaluate Persona Quality (Intent-Based)
 */
function evaluatePersonaQuality(personaCount, objective, formatCategories) {
  const objectiveLower = objective.toLowerCase();
  let points = 0;
  const messages = [];
  
  // Mass targeting flag (8+ personas)
  const isMassTargeting = personaCount >= 8;
  
  if (objectiveLower.includes('awareness') || objectiveLower.includes('brand')) {
    // AWARENESS LOGIC
    if (personaCount >= 3 && personaCount <= 5) {
      points += 15; // Optimal
      messages.push('Optimal persona selection for awareness campaigns');
    } else if (personaCount === 1 || personaCount === 2) {
      // Acceptable only with high-impact or video
      if (formatCategories.highImpact.length > 0 || formatCategories.video.length > 0) {
        points += 12;
        messages.push('Focused targeting supported by high-impact formats');
      } else {
        points += 6;
        messages.push('Narrow targeting for awareness - consider adding high-impact or video formats');
      }
    } else if (personaCount >= 6 && personaCount <= 7) {
      points += 10; // Diluted but acceptable
      messages.push('Broad targeting may dilute message precision');
    } else if (isMassTargeting) {
      // Mass targeting requires high-impact OR OTT/Video
      if (formatCategories.highImpact.length > 0 || formatCategories.video.length > 0) {
        points += 10;
        messages.push('Mass targeting approach with supporting formats');
      } else {
        points += 3; // Heavy penalty
        messages.push('Mass targeting without scale-appropriate formats may reduce efficiency');
      }
    }
  } else if (objectiveLower.includes('engagement') || objectiveLower.includes('traffic') || objectiveLower.includes('interest')) {
    // ENGAGEMENT LOGIC
    if (personaCount >= 3 && personaCount <= 5) {
      points += 15; // Optimal
      messages.push('Well-balanced persona targeting for engagement');
    } else if (personaCount === 1 || personaCount === 2) {
      points += 5; // Under-targeted
      messages.push('Engagement objectives typically benefit from 3-5 persona segments');
    } else if (personaCount > 5) {
      points += 3; // Poor planning
      messages.push('Broad targeting may dilute engagement potential - consider focusing on 3-5 core segments');
    }
  } else if (objectiveLower.includes('conversion') || objectiveLower.includes('lead') || objectiveLower.includes('sales')) {
    // CONVERSION LOGIC
    if (personaCount >= 1 && personaCount <= 3) {
      points += 15; // Optimal
      messages.push('Precise targeting aligns with conversion focus');
    } else if (personaCount >= 4 && personaCount <= 5) {
      points += 5; // Diluted
      messages.push('Conversion campaigns perform best with 1-3 highly targeted personas');
    } else if (personaCount > 5) {
      points += 0; // Hard fail
      messages.push('This setup may limit effectiveness - conversion campaigns require focused targeting (1-3 personas recommended)');
    }
  }
  
  return { points, messages };
}

/**
 * Evaluate Format × Objective Alignment
 */
function evaluateFormatObjectiveAlignment(objective, formatCategories) {
  const objectiveLower = objective.toLowerCase();
  let points = 0;
  const messages = [];
  
  if (objectiveLower.includes('awareness') || objectiveLower.includes('brand')) {
    // AWARENESS - Requires high-impact OR video
    const hasRequiredFormats = formatCategories.highImpact.length > 0 || formatCategories.video.length > 0;
    
    if (hasRequiredFormats) {
      points += 20;
      messages.push('Format selection supports awareness objectives effectively');
    } else if (formatCategories.standardDisplay.length > 0) {
      points += 8;
      messages.push('Standard display formats alone may limit awareness impact - consider adding video or high-impact placements');
    } else {
      points += 5;
      messages.push('Awareness campaigns typically perform better with high-impact or video formats');
    }
  } else if (objectiveLower.includes('engagement') || objectiveLower.includes('traffic')) {
    // ENGAGEMENT - Requires interactive OR video
    const hasRequiredFormats = formatCategories.interactive.length > 0 || formatCategories.video.length > 0;
    
    if (hasRequiredFormats) {
      points += 20;
      messages.push('Interactive and video formats align well with engagement goals');
    } else {
      points += 7;
      messages.push('Engagement objectives typically perform better with interactive or in-read video formats');
    }
  } else if (objectiveLower.includes('consideration')) {
    // CONSIDERATION - Requires interactive OR native
    const hasRequiredFormats = formatCategories.interactive.length > 0 || formatCategories.native.length > 0;
    
    if (hasRequiredFormats) {
      points += 20;
      messages.push('Format mix supports consideration phase effectively');
    } else {
      points += 7;
      messages.push('Consideration campaigns benefit from interactive or native content formats');
    }
  } else if (objectiveLower.includes('conversion') || objectiveLower.includes('lead') || objectiveLower.includes('sales')) {
    // CONVERSION - Requires native OR data capture
    const hasRequiredFormats = formatCategories.native.length > 0 || formatCategories.dataCapture.length > 0;
    const hasTooManyReachFormats = formatCategories.highImpact.length > 0 || formatCategories.video.length > 2;
    
    if (hasRequiredFormats && !hasTooManyReachFormats) {
      points += 20;
      messages.push('Format selection aligns with lower-funnel conversion focus');
    } else if (hasTooManyReachFormats) {
      points += 5;
      messages.push('Conversion plans typically benefit from performance-oriented formats rather than reach-focused placements');
    } else {
      points += 7;
      messages.push('Consider adding native or data capture formats for stronger conversion performance');
    }
  }
  
  return { points, messages };
}

/**
 * Evaluate Channel Coverage
 */
function evaluateChannelCoverage(siteCount, budget) {
  let points = 0;
  const messages = [];
  
  if (siteCount >= 5) {
    points += 10;
    messages.push('Strong multi-channel distribution');
  } else if (siteCount >= 3) {
    points += 7;
    messages.push('Adequate channel coverage');
  } else if (siteCount >= 1) {
    points += 4;
    messages.push('Limited channel coverage - consider expanding to 3-5 sites for better reach');
  } else {
    points += 0;
    messages.push('No channels selected - campaign cannot be executed');
  }
  
  return { points, messages };
}

/**
 * Evaluate Budget Adequacy (Complexity Check)
 */
function evaluateBudgetAdequacy(budget, personaCount, formatCount, siteCount) {
  let points = 0;
  const messages = [];
  
  const complexity = personaCount + formatCount + siteCount;
  
  if (budget >= 100000) {
    points += 10;
    if (complexity <= 10) {
      messages.push('Budget supports planned complexity effectively');
    } else if (complexity > 15 && budget < 200000) {
      points -= 3;
      messages.push('High complexity relative to budget - consider simplifying or increasing budget');
    }
  } else if (budget >= 50000) {
    points += 5;
    if (complexity > 10) {
      points -= 2;
      messages.push('Budget may be stretched across selected targeting - consider simplifying for better performance');
    }
  } else {
    points += 0;
    messages.push('Budget may be insufficient for effective reach and frequency - consider minimum RM 50k');
  }
  
  return { points, messages };
}

/**
 * Identify Campaign Strengths (Only genuine strengths)
 */
function identifyCampaignStrengths(objective, personaCount, formatCategories, siteCount, budget) {
  const strengths = [];
  const objectiveLower = objective.toLowerCase();
  
  // Strong Audience Targeting
  if (objectiveLower.includes('awareness') && personaCount >= 3 && personaCount <= 5) {
    strengths.push({
      title: 'Strong Audience Targeting',
      description: `${personaCount} targeted personas ensure precise reach while maintaining scale`
    });
  } else if (objectiveLower.includes('conversion') && personaCount >= 1 && personaCount <= 3) {
    strengths.push({
      title: 'Strong Audience Targeting',
      description: `${personaCount} focused persona${personaCount > 1 ? 's' : ''} align with conversion objectives`
    });
  }
  
  // Format Diversity (only if strategically aligned)
  const totalFormats = Object.values(formatCategories).reduce((sum, arr) => sum + arr.length, 0);
  if (totalFormats >= 3) {
    if (objectiveLower.includes('awareness') && (formatCategories.highImpact.length > 0 || formatCategories.video.length > 0)) {
      strengths.push({
        title: 'Format Diversity',
        description: `${totalFormats} formats with appropriate high-impact and video mix for awareness`
      });
    } else if (objectiveLower.includes('engagement') && formatCategories.interactive.length > 0) {
      strengths.push({
        title: 'Format Diversity',
        description: `${totalFormats} formats including interactive elements to drive engagement`
      });
    }
  }
  
  // Funnel Alignment
  if (objectiveLower.includes('awareness') && formatCategories.highImpact.length > 0 && formatCategories.video.length > 0) {
    strengths.push({
      title: 'Funnel Alignment',
      description: 'High-impact and video formats create strong awareness foundation'
    });
  } else if (objectiveLower.includes('conversion') && formatCategories.native.length > 0) {
    strengths.push({
      title: 'Funnel Alignment',
      description: 'Native and performance formats support lower-funnel objectives'
    });
  }
  
  // Budget-to-Strategy Fit
  if (budget >= 100000 && totalFormats >= 3 && personaCount >= 3) {
    strengths.push({
      title: 'Budget-to-Strategy Fit',
      description: `RM ${(budget / 1000).toFixed(0)}k budget appropriately supports multi-format, multi-persona approach`
    });
  }
  
  // Contextual Relevance (if multiple channels)
  if (siteCount >= 5) {
    strengths.push({
      title: 'Contextual Relevance',
      description: `${siteCount} channels provide diverse contextual touchpoints`
    });
  }
  
  return strengths;
}

/**
 * Identify Optimization Opportunities (Strategic, Constructive)
 */
function identifyOptimizationOpportunities(objective, personaCount, formatCategories, formatDetails, siteCount, budget) {
  const optimizations = [];
  const objectiveLower = objective.toLowerCase();
  const totalFormats = Object.values(formatCategories).reduce((sum, arr) => sum + arr.length, 0);
  
  // Format-Objective Misalignments
  if (objectiveLower.includes('awareness')) {
    if (formatCategories.highImpact.length === 0 && formatCategories.video.length === 0) {
      optimizations.push({
        title: 'Add High-Impact or Video Formats',
        description: 'Awareness objectives typically benefit from high-visibility placements. Consider adding Masthead, In-stream Video, or Takeover formats',
        impact: 'high'
      });
    }
    
    if (formatCategories.social.length === 0 && budget >= 80000) {
      optimizations.push({
        title: 'Include Social Formats',
        description: 'Social platforms (RM 5-9 CPM) can extend awareness reach cost-effectively',
        impact: 'high'
      });
    }
  }
  
  if (objectiveLower.includes('engagement')) {
    if (formatCategories.interactive.length === 0) {
      optimizations.push({
        title: 'Add Interactive Formats',
        description: 'Engagement campaigns perform better with interactive formats like Quiz Ads, Mini Games, or Hotspots',
        impact: 'high'
      });
    }
  }
  
  if (objectiveLower.includes('conversion')) {
    if (formatCategories.dataCapture.length === 0 && formatCategories.native.length === 0) {
      optimizations.push({
        title: 'Add Lower-Funnel Formats',
        description: 'Data Capture or Native formats can improve conversion efficiency by 30-40%',
        impact: 'high'
      });
    }
    
    if (formatCategories.highImpact.length > 1 || formatCategories.video.length > 2) {
      optimizations.push({
        title: 'Rebalance Format Mix',
        description: 'This plan uses high-impact or video formats that drive awareness. Consider shifting budget toward performance-oriented formats for better conversion rates',
        impact: 'medium'
      });
    }
  }
  
  // Persona Optimization
  if (objectiveLower.includes('engagement') && personaCount < 3) {
    optimizations.push({
      title: 'Expand Persona Targeting',
      description: 'Engagement campaigns typically perform better with 3-5 persona segments to maximize interaction opportunities',
      impact: 'medium'
    });
  }
  
  if (objectiveLower.includes('conversion') && personaCount > 3) {
    optimizations.push({
      title: 'Focus Persona Selection',
      description: 'Conversion campaigns benefit from tighter targeting (1-3 personas) to improve cost per acquisition',
      impact: 'medium'
    });
  }
  
  // Budget Strategy
  if (totalFormats >= 3 && budget >= 100000) {
    optimizations.push({
      title: 'Test Budget Splits',
      description: 'Consider 60/30/10 allocation: 60% to proven top performer, 30% to support formats, 10% to testing new approaches',
      impact: 'medium'
    });
  }
  
  return optimizations;
}

/**
 * Calculate Estimated Performance
 * 
 * REACH CALCULATION RULES (STRICT):
 * 1. Base Reach = Total Impressions ÷ Avg Frequency
 * 2. Avg Frequency determined by campaign duration
 * 3. Adjusted by geo penetration factor
 * 4. Capped by audience universe (never exceed)
 * 5. Conservative estimates preferred
 * 
 * CTR is calculated from actual format benchmark CTRs weighted by impressions
 */
function calculateExpectedPerformance(
  budget, 
  formatCategories, 
  personaCount, 
  budgetChannels = [], 
  formatDetails = [],
  campaignDurationWeeks = 4,
  geography = 'Nationwide',
  audienceUniverse = null
) {
  let estimatedImpressions = 0;
  let avgCPM = 0;
  
  // Priority 1: If user has allocated budget in Step 4, use that
  if (budgetChannels && budgetChannels.length > 0) {
    estimatedImpressions = budgetChannels.reduce((sum, channel) => {
      return sum + (channel.impressions || 0);
    }, 0);
    
    // Calculate effective average CPM from budget allocation
    const totalBudget = budgetChannels.reduce((sum, channel) => sum + (channel.budget || 0), 0);
    avgCPM = estimatedImpressions > 0 ? Math.round((totalBudget / estimatedImpressions) * 1000 * 10) / 10 : 0;
    
    console.log(`[ESTIMATED PERFORMANCE] Using Step 4 budget allocation: ${(estimatedImpressions/1000000).toFixed(1)}M impressions from ${budgetChannels.length} channels`);
  } 
  // Priority 2: Calculate from formats
  else {
    // Collect all format objects
    const allFormatObjects = [
      ...(formatCategories.highImpact || []),
      ...(formatCategories.video || []),
      ...(formatCategories.interactive || []),
      ...(formatCategories.social || []),
      ...(formatCategories.native || []),
      ...(formatCategories.standardDisplay || []),
      ...(formatCategories.dataCapture || [])
    ];
    
    // Use unified impression calculator
    const result = calculateImpressions(budget, allFormatObjects);
    estimatedImpressions = result.impressions;
    avgCPM = result.avgCPM;
    
    console.log(`[ESTIMATED PERFORMANCE] Calculated from formats: ${(estimatedImpressions/1000000).toFixed(1)}M impressions`);
  }
  
  // ===== STEP 2: FREQUENCY ASSUMPTION (MANDATORY) =====
  let avgFrequency = 3.0; // Default for 4 weeks
  
  if (campaignDurationWeeks <= 1) {
    avgFrequency = 1.3;
  } else if (campaignDurationWeeks === 2) {
    avgFrequency = 2.0;
  } else if (campaignDurationWeeks <= 4) {
    avgFrequency = 3.0;
  } else if (campaignDurationWeeks <= 8) {
    avgFrequency = 4.0;
  } else {
    avgFrequency = 5.0;
  }
  
  console.log(`[REACH CALC] Duration: ${campaignDurationWeeks} weeks → Avg Frequency: ${avgFrequency}`);
  
  // ===== STEP 3: BASE REACH CALCULATION =====
  const baseReach = Math.round(estimatedImpressions / avgFrequency);
  
  console.log(`[REACH CALC] Base Reach: ${(baseReach/1000000).toFixed(1)}M (${estimatedImpressions.toLocaleString()} impressions ÷ ${avgFrequency} frequency)`);
  
  // ===== STEP 4: GEO & DEVICE ADJUSTMENT =====
  let geoPenetrationFactor = 1.0; // Default: Nationwide
  const geoLower = (geography || '').toLowerCase();
  
  if (geoLower.includes('klang valley') || geoLower.includes('kl')) {
    geoPenetrationFactor = 0.85;
  } else if (geoLower.includes('east malaysia') || geoLower.includes('sabah') || geoLower.includes('sarawak')) {
    geoPenetrationFactor = 0.65;
  } else if (geoLower.includes('rural')) {
    geoPenetrationFactor = 0.55;
  }
  // Nationwide stays at 1.0
  
  const geoAdjusted = geoLower.includes('klang') || geoLower.includes('east') || geoLower.includes('rural');
  const adjustedReach = Math.round(baseReach * geoPenetrationFactor);
  
  console.log(`[REACH CALC] Geo Adjustment: ${geography} (Factor: ${geoPenetrationFactor}) → ${(adjustedReach/1000000).toFixed(1)}M`);
  
  // ===== STEP 5: AUDIENCE CAP (CRITICAL) =====
  let finalReach = adjustedReach;
  let audienceCapApplied = false;
  
  if (audienceUniverse && audienceUniverse > 0) {
    if (adjustedReach > audienceUniverse) {
      finalReach = audienceUniverse;
      audienceCapApplied = true;
      console.log(`[REACH CALC] ⚠️ Audience Cap Applied: ${(finalReach/1000000).toFixed(1)}M (capped at universe size)`);
    }
  }
  
  // ===== STEP 6: SANITY CHECK =====
  // Never allow reach to exceed impressions
  if (finalReach > estimatedImpressions) {
    finalReach = Math.round(estimatedImpressions * 0.7); // Conservative fallback
    console.log(`[REACH CALC] ⚠️ Sanity Check: Reach capped at 70% of impressions`);
  }
  
  const estimatedReach = finalReach;
  
  console.log(`[REACH CALC] ✅ Final Reach: ${(estimatedReach/1000000).toFixed(1)}M unique users`);
  
  // Calculate weighted CTR based on actual format benchmarks and impression distribution
  let estimatedCTR = 0;
  let totalWeightedCTR = 0;
  
  if (budgetChannels && budgetChannels.length > 0 && formatDetails.length > 0) {
    // Use budgetChannels to weight CTR by actual impression distribution
    budgetChannels.forEach(channel => {
      const channelImpressions = channel.impressions || 0;
      if (channelImpressions === 0) return;
      
      // Find formats in this channel category
      const channelFormatsCTR = formatDetails
        .filter(format => {
          const formatType = (format.type || '').toLowerCase();
          const formatName = (format.name || '').toLowerCase();
          const channelName = (channel.name || '').toLowerCase();
          
          if (channelName.includes('video')) {
            return formatType.includes('video') || formatName.includes('video');
          } else if (channelName.includes('social')) {
            return formatName.includes('social');
          } else if (channelName.includes('display')) {
            return formatType.includes('banner') || formatType.includes('display');
          } else if (channelName.includes('interactive')) {
            return formatType.includes('interactive');
          }
          return false;
        })
        .map(f => parseBenchmarkCTR(f.benchmarkCtr));
      
      // Average CTR for this channel's formats
      const avgChannelCTR = channelFormatsCTR.length > 0
        ? channelFormatsCTR.reduce((sum, ctr) => sum + ctr, 0) / channelFormatsCTR.length
        : 0.15; // Fallback
      
      totalWeightedCTR += avgChannelCTR * (channelImpressions / estimatedImpressions);
    });
    
    estimatedCTR = totalWeightedCTR;
  } else if (formatDetails.length > 0) {
    // Fallback: Simple average of all selected format CTRs
    const ctrs = formatDetails.map(f => parseBenchmarkCTR(f.benchmarkCtr));
    estimatedCTR = ctrs.length > 0 ? ctrs.reduce((sum, ctr) => sum + ctr, 0) / ctrs.length : 0.15;
  } else {
    // Final fallback
    estimatedCTR = 0.15;
  }
  
  const estimatedClicks = Math.round(estimatedImpressions * (estimatedCTR / 100));
  
  console.log(`[ESTIMATED PERFORMANCE] CTR: ${estimatedCTR.toFixed(2)}%, Clicks: ${estimatedClicks.toLocaleString()}`);
  
  return {
    reach: estimatedReach,
    impressions: estimatedImpressions,
    ctr: estimatedCTR.toFixed(2) + '%',
    clicks: estimatedClicks,
    cpm: avgCPM,
    frequency: avgFrequency,
    // Metadata for transparency
    reachCalculation: {
      baseReach: baseReach,
      avgFrequency: avgFrequency,
      campaignDurationWeeks: campaignDurationWeeks,
      geoPenetrationFactor: geoPenetrationFactor,
      geoAdjustmentApplied: geoAdjusted,
      audienceCapApplied: audienceCapApplied,
      geography: geography
    }
  };
}

/**
 * Parse benchmark CTR string (e.g., ">0.15%", "0.25%") to number
 */
function parseBenchmarkCTR(ctrString) {
  if (!ctrString) return 0.15; // Default
  
  // Remove ">" and "%" and parse
  const cleaned = ctrString.replace(/[>%]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0.15 : parsed;
}

export { generateOverviewRecommendationsV2 };
