/**
 * AI Wizard Intelligence Layer
 * 
 * Provides smart recommendations, scoring, and optimization strategies
 * to match or exceed BuildPlanWizard's intelligence
 */

import verticalPlaybook from '../data/verticalPlaybook.json';

/**
 * Score formats based on campaign context
 * Returns formats with confidence scores and reasoning
 */
export const scoreFormats = (formats, context) => {
  const {
    campaign_objective,
    industry,
    budget_rm,
    devices = [],
    creative_asset_type
  } = context;

  // Get vertical-specific format preferences
  const industryKey = normalizeIndustryKey(industry);
  const verticalConfig = verticalPlaybook.verticals?.[industryKey];
  
  // Map objective to funnel stage
  const funnelStageMap = {
    'Awareness': 'awareness',
    'VideoView': 'awareness',
    'Traffic': 'consideration',
    'Engagement': 'consideration',
    'LeadGen': 'conversion',
    'Conversion': 'conversion'
  };
  
  const funnelStage = funnelStageMap[campaign_objective] || 'awareness';
  
  // Get recommended formats from playbook
  const playbookFormats = verticalConfig?.funnel?.[funnelStage] || [];
  const bestFormats = verticalConfig?.creative_requirements?.best_formats || [];
  
  return formats.map(format => {
    let score = 50; // Base score
    let reasons = [];
    
    // Playbook match (strong signal)
    if (playbookFormats.includes(format.name) || playbookFormats.includes(format['Ad Format'])) {
      score += 30;
      reasons.push(`Recommended for ${funnelStage} in ${industry}`);
    }
    
    // Best format match
    if (bestFormats.includes(format.name) || bestFormats.includes(format['Ad Format'])) {
      score += 15;
      reasons.push('Top performer for this vertical');
    }
    
    // Objective alignment
    const formatName = format.name || format['Ad Format'] || '';
    const formatLower = formatName.toLowerCase();
    
    if (campaign_objective === 'Awareness' || campaign_objective === 'VideoView') {
      if (formatLower.includes('video') || formatLower.includes('masthead') || formatLower.includes('takeover')) {
        score += 20;
        reasons.push('High visibility for awareness goals');
      }
    } else if (campaign_objective === 'LeadGen') {
      if (formatLower.includes('lead') || formatLower.includes('form') || formatLower.includes('native')) {
        score += 20;
        reasons.push('Optimized for lead capture');
      }
    } else if (campaign_objective === 'Traffic') {
      if (formatLower.includes('banner') || formatLower.includes('native') || formatLower.includes('display')) {
        score += 20;
        reasons.push('Cost-effective for driving traffic');
      }
    }
    
    // Creative asset alignment
    if (creative_asset_type === 'video' && formatLower.includes('video')) {
      score += 15;
      reasons.push('Matches your video creative');
    } else if (creative_asset_type === 'static' && (formatLower.includes('banner') || formatLower.includes('display'))) {
      score += 15;
      reasons.push('Matches your static creative');
    }
    
    // Device optimization
    if (devices.includes('Mobile') && (formatLower.includes('mobile') || formatLower.includes('vertical'))) {
      score += 10;
      reasons.push('Mobile-optimized');
    }
    
    // Budget tier appropriateness
    if (budget_rm < 100000) {
      // Low budget: prefer cost-effective formats
      if (formatLower.includes('banner') || formatLower.includes('display')) {
        score += 10;
        reasons.push('Cost-efficient for your budget');
      }
      if (formatLower.includes('takeover') || formatLower.includes('masthead')) {
        score -= 20;
        reasons.push('⚠️ May be too premium for budget');
      }
    } else if (budget_rm > 200000) {
      // High budget: enable premium formats
      if (formatLower.includes('takeover') || formatLower.includes('masthead') || formatLower.includes('premium')) {
        score += 15;
        reasons.push('Premium format appropriate for budget');
      }
    }
    
    // Cap score at 100
    score = Math.min(100, Math.max(0, score));
    
    return {
      ...format,
      confidence: Math.round(score),
      reason: reasons.join(' • '),
      _reasons: reasons
    };
  }).sort((a, b) => b.confidence - a.confidence);
};

/**
 * Score sites based on campaign context
 */
export const scoreSites = (sites, context, selectedFormats = []) => {
  const {
    campaign_objective,
    industry,
    geography = [],
    audience,
    budget_rm
  } = context;

  const industryKey = normalizeIndustryKey(industry);
  
  // Ensure geography is always an array
  const geoArray = Array.isArray(geography) ? geography : 
                   (geography ? [geography] : []);
  
  return sites.map(site => {
    let score = 50; // Base score
    let reasons = [];
    
    // Category match with selected formats
    const siteCategory = site.category || site.Category || '';
    const formatCategories = selectedFormats.map(f => 
      (f.category || f.Category || '').toLowerCase()
    );
    
    if (formatCategories.some(cat => siteCategory.toLowerCase().includes(cat))) {
      score += 20;
      reasons.push('Matches selected formats');
    }
    
    // Traffic/Reach consideration
    const traffic = site.monthlyTraffic || site['Total impressions'] || 0;
    if (traffic > 10000000) {
      score += 15;
      reasons.push('High traffic premium publisher');
    } else if (traffic > 5000000) {
      score += 10;
      reasons.push('Strong reach');
    }
    
    // Geography match
    const siteName = (site.name || site.siteName || site.Property || '').toLowerCase();
    const isNational = siteName.includes('malaysia') || siteName.includes('national');
    
    if (geoArray.includes('Malaysia') && isNational) {
      score += 10;
      reasons.push('National coverage');
    }
    
    // Check for regional matches
    geoArray.forEach(geo => {
      const geoLower = (geo || '').toString().toLowerCase();
      if (siteName.includes(geoLower)) {
        score += 15;
        reasons.push(`Strong ${geo} presence`);
      }
    });
    
    // Industry affinity
    const siteIndustry = (site.industry || '').toLowerCase();
    const industryLower = (industry || '').toLowerCase();
    if (siteIndustry && industryLower && siteIndustry.includes(industryLower)) {
      score += 15;
      reasons.push('Industry-relevant audience');
    }
    
    // Cap score at 100
    score = Math.min(100, Math.max(0, score));
    
    return {
      ...site,
      confidence: Math.round(score),
      reason: reasons.join(' • '),
      _reasons: reasons
    };
  }).sort((a, b) => b.confidence - a.confidence);
};

/**
 * Generate optimization strategy recommendations
 */
export const generateOptimizationStrategy = (context, plan) => {
  const {
    campaign_objective,
    industry,
    budget_rm,
    duration_weeks,
    budgetTier
  } = context;

  const strategies = [];
  
  // Budget tier specific strategies
  if (budgetTier === 'low') {
    strategies.push({
      title: 'Focused Concentration Strategy',
      description: 'Concentrate budget on 2-3 high-performing channels for maximum impact',
      tactics: [
        'Start with Direct buys for cost efficiency',
        'Focus on 2 core audience segments',
        'Use cost-effective display and native formats',
        'Run for minimum 4 weeks for learning phase'
      ],
      expectedOutcome: 'Maximize reach within budget constraints while maintaining quality placements'
    });
  } else if (budgetTier === 'mid') {
    strategies.push({
      title: 'Balanced Multi-Channel Strategy',
      description: 'Diversify across 4-5 channels with mix of Direct and PD buys',
      tactics: [
        'Mix Direct (60%) and PD (40%) for balance',
        'Target 3-4 complementary audience segments',
        'Combine video and display for format diversity',
        'Include at least one premium site for brand lift'
      ],
      expectedOutcome: 'Balanced reach and frequency with good cost efficiency and brand safety'
    });
  } else if (budgetTier === 'high') {
    strategies.push({
      title: 'Premium Diversification Strategy',
      description: 'Full-funnel approach with premium placements and optimization',
      tactics: [
        'Enable PD and Premium buys for maximum reach',
        'Target 5-6 audience segments across funnel',
        'Include high-impact formats (Masthead, Takeover)',
        'Add OTT for premium video exposure',
        'Reserve 20% budget for mid-flight optimization'
      ],
      expectedOutcome: 'Maximum reach, brand lift, and performance with full optimization flexibility'
    });
  }
  
  // Objective-specific tactics
  if (campaign_objective === 'Awareness' || campaign_objective === 'VideoView') {
    strategies.push({
      title: 'Awareness Maximization',
      description: 'Optimize for maximum unique reach and brand exposure',
      tactics: [
        'Prioritize video formats for engagement',
        'Target broad, high-reach audiences',
        'Use frequency capping (3-5 per user)',
        'Mix premium and scale inventory',
        'Measure brand lift via surveys'
      ],
      kpis: ['Unique Reach', 'Video Completion Rate', 'Brand Awareness Lift']
    });
  } else if (campaign_objective === 'LeadGen') {
    strategies.push({
      title: 'Lead Generation Optimization',
      description: 'Drive qualified leads with clear CTAs and forms',
      tactics: [
        'Use lead form and native article formats',
        'Target in-market audiences with intent signals',
        'A/B test different value propositions',
        'Optimize for CPL (Cost Per Lead)',
        'Implement lead verification'
      ],
      kpis: ['Leads Generated', 'CPL', 'Lead Quality Score', 'Conversion Rate']
    });
  } else if (campaign_objective === 'Traffic') {
    strategies.push({
      title: 'Traffic & Engagement Optimization',
      description: 'Drive qualified site traffic with strong CTAs',
      tactics: [
        'Use banner, native, and carousel formats',
        'Target audiences with high CTR history',
        'Optimize for CPC (Cost Per Click)',
        'Use retargeting for repeat visitors',
        'Track on-site engagement metrics'
      ],
      kpis: ['Clicks', 'CTR', 'CPC', 'Landing Page Views', 'Bounce Rate']
    });
  }
  
  // Pacing strategy
  strategies.push({
    title: 'Pacing & Optimization',
    description: 'Smart budget pacing with continuous optimization',
    tactics: [
      duration_weeks >= 4 ? 'Week 1-2: Learning phase, gather data' : 'Week 1: Fast learning phase',
      duration_weeks >= 4 ? 'Week 3: Optimize based on early signals' : 'Week 2: Quick optimization',
      duration_weeks >= 4 ? 'Week 4+: Scale winners, pause underperformers' : 'End: Final push on best performers',
      'Daily budget pacing to avoid overspend',
      'Reserve 15-20% for mid-flight reallocation'
    ],
    expectedOutcome: 'Efficient budget utilization with continuous performance improvement'
  });
  
  return strategies;
};

/**
 * Calculate accurate CPMs and line items from rates
 */
export const calculateAccuratePricing = (rates, formats, audiences, budget_rm, buying_type = 'Direct') => {
  const lineItems = [];
  
  // Match formats to rates
  formats.forEach(format => {
    const formatName = format.name || format['Ad Format'];
    const matchingRates = rates.filter(r => {
      const ratePillar = r['Pillar'] || r.pillar || '';
      const rateFormat = r['Ad Format'] || r.format || '';
      return ratePillar.toLowerCase() === formatName.toLowerCase() || 
             rateFormat.toLowerCase() === formatName.toLowerCase();
    });
    
    if (matchingRates.length > 0) {
      // Take best rate (lowest CPM)
      const bestRate = matchingRates.reduce((best, r) => {
        const cpm = getBestCPM(r, buying_type);
        const bestCpm = getBestCPM(best, buying_type);
        return cpm < bestCpm ? r : best;
      });
      
      const cpm = getBestCPM(bestRate, buying_type);
      const platform = bestRate.Platform || bestRate.platform || 'Unknown';
      
      lineItems.push({
        format: formatName,
        platform,
        cpm,
        buyType: buying_type,
        rate: bestRate
      });
    }
  });
  
  return lineItems;
};

/**
 * Get best CPM from rate card based on buying type
 */
const getBestCPM = (rate, buying_type) => {
  let cpm = 999;
  
  if (buying_type === 'Direct') {
    cpm = parseFloat(rate['CPM Direct (RM)']) || 999;
  } else if (buying_type === 'PG') {
    cpm = parseFloat(rate['CPM PG (RM)']) || parseFloat(rate['CPM Direct (RM)']) || 999;
  } else if (buying_type === 'PD') {
    cpm = parseFloat(rate['CPM PD (RM)']) || parseFloat(rate['CPM PG (RM)']) || parseFloat(rate['CPM Direct (RM)']) || 999;
  } else {
    // Premium or unspecified: take lowest available
    const pdCpm = parseFloat(rate['CPM PD (RM)']) || 999;
    const pgCpm = parseFloat(rate['CPM PG (RM)']) || 999;
    const directCpm = parseFloat(rate['CPM Direct (RM)']) || 999;
    cpm = Math.min(pdCpm, pgCpm, directCpm);
  }
  
  return cpm;
};

/**
 * Normalize industry key to match playbook
 */
const normalizeIndustryKey = (industry) => {
  if (!industry) return null;
  
  const normalized = industry.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  // Try exact match first
  if (verticalPlaybook.verticals?.[normalized]) {
    return normalized;
  }
  
  // Try partial matches
  const keys = Object.keys(verticalPlaybook.verticals || {});
  for (const key of keys) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return key;
    }
  }
  
  return normalized;
};

/**
 * Add performance benchmarks to recommendations
 */
export const enrichWithBenchmarks = (recommendations, context) => {
  const { campaign_objective, industry } = context;
  const industryKey = normalizeIndustryKey(industry);
  const benchmarks = verticalPlaybook.performance_benchmarks?.[industryKey];
  
  if (!benchmarks) return recommendations;
  
  // Map objective to benchmark category
  let benchmarkCategory = 'awareness';
  if (campaign_objective === 'LeadGen') benchmarkCategory = 'leads';
  else if (campaign_objective === 'Traffic') benchmarkCategory = 'traffic';
  else if (campaign_objective === 'Conversion') benchmarkCategory = 'sales';
  
  const categoryBenchmarks = benchmarks[benchmarkCategory];
  if (!categoryBenchmarks) return recommendations;
  
  return recommendations.map(rec => {
    const formatName = (rec.name || '').toLowerCase();
    let enriched = { ...rec };
    
    // Find matching benchmark
    Object.entries(categoryBenchmarks).forEach(([key, metrics]) => {
      if (formatName.includes(key.replace('_', ' '))) {
        enriched.benchmarks = {
          ctr: metrics.expected_ctr ? `${(metrics.expected_ctr * 100).toFixed(2)}%` : null,
          vtr: metrics.expected_vtr ? `${(metrics.expected_vtr * 100).toFixed(0)}%` : null,
          avgCpm: metrics.avg_cpm_rm ? `RM ${metrics.avg_cpm_rm}` : null
        };
        enriched.reason = `${enriched.reason} • Industry avg CTR: ${enriched.benchmarks.ctr || 'N/A'}`;
      }
    });
    
    return enriched;
  });
};

export default {
  scoreFormats,
  scoreSites,
  generateOptimizationStrategy,
  calculateAccuratePricing,
  enrichWithBenchmarks
};
