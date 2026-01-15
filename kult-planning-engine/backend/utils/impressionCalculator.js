/**
 * Unified Impression Calculator
 * 
 * This utility ensures consistent impression calculations across all parts of the app:
 * - Step 4: Budget Breakdown
 * - Step 5: Campaign Overview  
 * - Step 5: Expected Performance (AI Brief Analysis)
 * 
 * Formula: Impressions = (Budget / Weighted Average CPM) × 1000
 */

/**
 * Calculate impressions based on selected formats and budget
 * @param {number} budget - Total budget in RM
 * @param {Array} selectedFormats - Array of format objects with {id, name, baseCpm}
 * @returns {Object} - { impressions, avgCPM, breakdown }
 */
export function calculateImpressions(budget, selectedFormats = []) {
  if (!budget || budget <= 0) {
    return {
      impressions: 0,
      avgCPM: 0,
      breakdown: []
    };
  }
  
  // If no formats selected, use default CPM of 12
  if (!selectedFormats || selectedFormats.length === 0) {
    const impressions = Math.round((budget / 12) * 1000);
    return {
      impressions,
      avgCPM: 12,
      breakdown: [{
        category: 'Default',
        budget: budget,
        cpm: 12,
        impressions: impressions
      }]
    };
  }
  
  // Create breakdown by format category FIRST
  const breakdown = categorizeAndBreakdown(budget, selectedFormats);
  
  // Calculate TOTAL impressions by summing breakdown (NOT weighted average!)
  const impressions = breakdown.reduce((sum, item) => sum + item.impressions, 0);
  
  // Calculate effective average CPM based on actual allocation
  const avgCPM = impressions > 0 ? Math.round((budget / impressions) * 1000 * 10) / 10 : 0;
  
  return {
    impressions,
    avgCPM,
    breakdown
  };
}

/**
 * Categorize formats and create budget breakdown
 * @param {number} budget - Total budget
 * @param {Array} selectedFormats - Array of format objects
 * @returns {Array} - Breakdown by category
 */
function categorizeAndBreakdown(budget, selectedFormats) {
  const categories = {
    'Video': { formats: [], totalCpm: 0, count: 0 },
    'Social': { formats: [], totalCpm: 0, count: 0 },
    'Interactive': { formats: [], totalCpm: 0, count: 0 },
    'Display': { formats: [], totalCpm: 0, count: 0 }
  };
  
  // Categorize each format
  selectedFormats.forEach(format => {
    const formatName = (format.name || '').toLowerCase();
    const formatType = (format.type || '').toLowerCase();
    const cpm = format.baseCpm || format.cpm || 10;
    
    let category = 'Display'; // Default
    
    // CHECK SOCIAL FIRST (before video)
    if (formatName.includes('social ad') || formatName.includes('social video') || 
        formatName.includes('facebook') || formatName.includes('instagram') || 
        formatName.includes('tiktok')) {
      category = 'Social';
    }
    // Then Video
    else if (formatType.includes('video') || formatType.includes('instream') || 
             formatName.includes('video') || formatName.includes('instream')) {
      category = 'Video';
    }
    // Then Interactive
    else if (formatType.includes('interactive') || formatType.includes('high impact') ||
             formatName.includes('interactive') || formatName.includes('high impact')) {
      category = 'Interactive';
    }
    
    categories[category].formats.push(format);
    categories[category].totalCpm += cpm;
    categories[category].count++;
  });
  
  // Calculate breakdown
  const breakdown = [];
  const totalFormats = selectedFormats.length;
  
  for (const [categoryName, data] of Object.entries(categories)) {
    if (data.count === 0) continue;
    
    const categoryAvgCpm = data.totalCpm / data.count;
    const weight = Math.round((data.count / totalFormats) * 100);
    const categoryBudget = Math.round(budget * (weight / 100));
    const categoryImpressions = Math.round((categoryBudget / categoryAvgCpm) * 1000);
    
    breakdown.push({
      category: categoryName,
      budget: categoryBudget,
      cpm: Math.round(categoryAvgCpm * 10) / 10,
      impressions: categoryImpressions,
      weight: weight,
      formatCount: data.count
    });
  }
  
  // Sort by budget (descending)
  breakdown.sort((a, b) => b.budget - a.budget);
  
  return breakdown;
}

/**
 * Calculate impressions with format-based recommendations
 * (For Step 4: Budget tab AI recommendations)
 * @param {number} budget - Total budget in RM
 * @param {Array} selectedFormats - Array of selected format objects
 * @returns {Array} - Recommendations with impressions
 */
export function generateBudgetRecommendationsWithImpressions(budget, selectedFormats) {
  const { breakdown } = calculateImpressions(budget, selectedFormats);
  
  return breakdown.map(item => ({
    id: item.category.toLowerCase(),
    name: item.category,
    type: 'budget',
    confidence: 95,
    weight: item.weight,
    cost: item.budget,
    cpm: item.cpm,
    reason: `Based on ${item.formatCount} selected ${item.category.toLowerCase()} format${item.formatCount > 1 ? 's' : ''}`,
    stats: {
      impressions: item.impressions,
      cpm: item.cpm
    }
  }));
}

export default {
  calculateImpressions,
  generateBudgetRecommendationsWithImpressions
};
