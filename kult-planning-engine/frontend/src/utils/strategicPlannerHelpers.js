/**
 * Strategic Planner Helper Functions
 * 
 * These functions improve the AI Wizard's strategic decision-making to behave
 * like a real media strategist, not just a generic DSP.
 * 
 * Key improvements:
 * 1. Robust industry playbook lookup with fallback handling
 * 2. Industry-fit persona selection (no more "Badminton" for Beauty campaigns)
 * 3. Channel preference enforcement in budget allocation
 * 4. Geo-aware audience and site scoring
 */

// ============================================================================
// 1. INDUSTRY PLAYBOOK WIRING
// ============================================================================

/**
 * Industry key normalization map
 * Maps common variations to standardized playbook keys
 */
export const INDUSTRY_KEY_ALIASES = {
  // Beauty variations
  'beauty': ['beauty', 'beauty_cosmetics', 'beauty_&_cosmetics'],
  'beauty_cosmetics': ['beauty', 'beauty_&_cosmetics'],
  'beauty_&_cosmetics': ['beauty', 'beauty_cosmetics'],
  
  // Automotive variations
  'automotive': ['automotive', 'automotive_ice', 'automotive_ev'],
  'automotive_ice': ['automotive'],
  'automotive_ev': ['automotive'],
  
  // Property variations
  'property': ['property', 'property_luxury', 'property_mid_range', 'property_affordable'],
  'property_luxury': ['property'],
  'property_mid_range': ['property'],
  'property_affordable': ['property'],
  
  // Finance variations
  'finance': ['finance_insurance', 'finance', 'banking'],
  'banking': ['finance_insurance', 'finance', 'banking'],
  'finance_insurance': ['finance', 'banking'],
  
  // Retail variations
  'retail': ['retail_ecommerce', 'retail', 'ecommerce'],
  'retail_ecommerce': ['retail', 'ecommerce'],
  'ecommerce': ['retail_ecommerce', 'retail'],
  
  // FMCG
  'fmcg': ['fmcg'],
  
  // Telco
  'telco': ['telco', 'telecommunications'],
  'telecommunications': ['telco'],
  
  // F&B
  'f&b': ['f_b', 'food_beverage', 'fnb'],
  'food_beverage': ['f&b', 'f_b', 'fnb'],
  
  // Travel
  'travel': ['travel_tourism', 'travel', 'tourism'],
  'travel_tourism': ['travel', 'tourism'],
  'tourism': ['travel_tourism', 'travel']
};

/**
 * Normalize industry key for consistent playbook lookups
 */
export function normalizeIndustryKey(industry) {
  if (!industry) return null;
  
  // Convert to lowercase and replace spaces/special chars with underscores
  let normalized = industry.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  return normalized;
}

/**
 * Get industry-specific playbook configuration
 * Returns null if no industry-specific playbook found
 * 
 * @param {string} industryKey - The industry identifier
 * @param {object} verticalPlaybook - The playbook data structure
 * @returns {object|null} - Playbook config with source metadata or null
 */
export function getIndustryPlaybook(industryKey, verticalPlaybook) {
  if (!industryKey || !verticalPlaybook) return null;
  
  const normalized = normalizeIndustryKey(industryKey);
  
  // Try direct lookup
  if (verticalPlaybook.vertical_playbook?.[normalized]) {
    console.log(`📖 [PLAYBOOK] Found industry playbook: ${normalized}`);
    return {
      config: verticalPlaybook.vertical_playbook[normalized],
      personas: verticalPlaybook.persona_mapping?.[normalized] || null,
      source: 'industry',
      key: normalized,
      label: verticalPlaybook.vertical_playbook[normalized].label || industryKey
    };
  }
  
  // Try alias matching
  const aliases = INDUSTRY_KEY_ALIASES[normalized] || [];
  for (const alias of aliases) {
    if (verticalPlaybook.vertical_playbook?.[alias]) {
      console.log(`📖 [PLAYBOOK] Found via alias: ${normalized} → ${alias}`);
      return {
        config: verticalPlaybook.vertical_playbook[alias],
        personas: verticalPlaybook.persona_mapping?.[alias] || null,
        source: 'industry',
        key: alias,
        label: verticalPlaybook.vertical_playbook[alias].label || industryKey
      };
    }
  }
  
  // No industry-specific playbook found
  console.log(`⚠️ [PLAYBOOK] No industry-specific playbook found for: ${normalized}`);
  return null;
}

/**
 * Get generic fallback playbook configuration
 * Used only when no industry-specific playbook exists
 */
export function getGenericPlaybook() {
  console.log(`🔧 [PLAYBOOK] Using GENERIC fallback playbook`);
  
  return {
    config: {
      label: 'Generic',
      strategy_dna: 'Balanced multi-channel approach',
      funnel: {
        awareness: ['video', 'display', 'native'],
        consideration: ['interactive', 'rich media', 'carousel'],
        conversion: ['display', 'native', 'retargeting']
      }
    },
    personas: null,
    source: 'generic',
    key: 'generic',
    label: 'Generic'
  };
}

// ============================================================================
// 2. PERSONA SELECTION LOGIC
// ============================================================================

/**
 * Industries that require strategic fit, not just top reach
 */
export const CRITICAL_FIT_INDUSTRIES = [
  'beauty',
  'beauty_cosmetics',
  'beauty_&_cosmetics',
  'finance',
  'finance_insurance',
  'banking',
  'automotive',
  'automotive_ice',
  'automotive_ev',
  'property',
  'property_luxury',
  'property_mid_range',
  'property_affordable'
];

/**
 * Fallback persona whitelists for critical industries
 * Used when playbook personas are missing but we need category fit
 */
export const INDUSTRY_FALLBACK_PERSONAS = {
  'beauty': ['Fashion Icons', 'Young Working Adult', 'Youth Mom', 'Emerging Affluents'],
  'beauty_cosmetics': ['Fashion Icons', 'Young Working Adult', 'Youth Mom', 'Emerging Affluents'],
  'beauty_&_cosmetics': ['Fashion Icons', 'Young Working Adult', 'Youth Mom', 'Emerging Affluents'],
  
  'finance': ['Business & Professional', 'Emerging Affluents', 'Young Working Adult', 'Family Dynamic'],
  'finance_insurance': ['Business & Professional', 'Emerging Affluents', 'Young Working Adult', 'Family Dynamic'],
  'banking': ['Business & Professional', 'Emerging Affluents', 'Young Working Adult', 'Family Dynamic'],
  
  'automotive': ['Automotive Enthusiasts', 'Gadget Gurus', 'Emerging Affluents', 'Young Working Adult'],
  'automotive_ice': ['Automotive Enthusiasts', 'Gadget Gurus', 'Emerging Affluents', 'Young Working Adult'],
  'automotive_ev': ['Automotive Enthusiasts', 'Tech & Gadget Enthusiasts', 'Emerging Affluents'],
  
  'property': ['Home Buyers', 'Emerging Affluents', 'Business & Professional', 'Family Dynamic'],
  'property_luxury': ['Home Buyers', 'Luxury Buyers', 'Emerging Affluents', 'Business & Professional'],
  'property_mid_range': ['Home Buyers', 'Family Dynamic', 'Emerging Affluents'],
  'property_affordable': ['Family Dynamic', 'Students', 'Youth Mom']
};

/**
 * Calculate geo-weighted audience score
 * 
 * @param {object} audience - Audience object with state columns
 * @param {array} geography - Array of state names or ['Malaysia'] for national
 * @returns {number} - Geo-weighted score
 */
export function scoreAudienceByGeo(audience, geography) {
  if (!geography || geography.length === 0 || geography.includes('Malaysia')) {
    // National: use total audience
    return audience.totalAudience || 0;
  }
  
  // Regional: sum state-specific columns
  let geoScore = 0;
  for (const state of geography) {
    geoScore += audience[state] || 0;
  }
  
  return geoScore;
}

/**
 * Check if industry requires strategic fit (not just reach)
 */
export function isCriticalFitIndustry(industryKey) {
  const normalized = normalizeIndustryKey(industryKey);
  return CRITICAL_FIT_INDUSTRIES.includes(normalized);
}

/**
 * Get fallback persona whitelist for an industry
 */
export function getFallbackPersonas(industryKey) {
  const normalized = normalizeIndustryKey(industryKey);
  return INDUSTRY_FALLBACK_PERSONAS[normalized] || [];
}

// ============================================================================
// 3. CHANNEL PREFERENCE ENFORCEMENT
// ============================================================================

/**
 * Channel enforcement constraints
 */
export const CHANNEL_CONSTRAINTS = {
  'OTT': {
    minShare: 0.60,  // OTT must be >= 60% of budget
    maxOtherShare: 0.30,  // Other individual channels <= 30%
    keywords: ['stream', 'video', 'ott', 'ctv', 'youtube', 'astro', 'viu', 'iflix', 'sooka'],
    channelLabel: 'OTT/Streaming'
  },
  'Social': {
    minShare: 0.60,  // Social must be >= 60% of budget
    maxOtherShare: 0.30,  // Other individual channels <= 30%
    keywords: ['social', 'facebook', 'instagram', 'tiktok', 'meta', 'feed', 'story', 'reel'],
    channelLabel: 'Social Media'
  },
  'Display': {
    minShare: 0.60,  // Display must be >= 60% of budget
    maxOtherShare: 0.30,  // Other individual channels <= 30%
    keywords: ['display', 'banner', 'native', 'programmatic', 'leaderboard', 'mrec', 'skyscraper'],
    channelLabel: 'Display/Programmatic'
  }
};

/**
 * Calculate channel budget shares from line items
 * 
 * @param {array} lineItems - Array of budget line items
 * @param {array} channelKeywords - Keywords to identify preferred channel
 * @returns {object} - { preferred: number, other: number, items: { preferred: [], other: [] } }
 */
export function calculateChannelShares(lineItems, channelKeywords) {
  let preferredBudget = 0;
  let otherBudget = 0;
  const preferredItems = [];
  const otherItems = [];
  
  for (const item of lineItems) {
    const platform = (item.platform || '').toLowerCase();
    const format = (item.format || item.formatName || '').toLowerCase();
    const combined = `${platform} ${format}`;
    
    const isPreferred = channelKeywords.some(keyword => combined.includes(keyword));
    
    if (isPreferred) {
      preferredBudget += item.allocatedBudget || 0;
      preferredItems.push(item);
    } else {
      otherBudget += item.allocatedBudget || 0;
      otherItems.push(item);
    }
  }
  
  return {
    preferred: preferredBudget,
    other: otherBudget,
    items: { preferred: preferredItems, other: otherItems }
  };
}

/**
 * Rebalance line items to meet minimum channel share
 * 
 * @param {array} lineItems - Original line items
 * @param {object} constraint - Channel constraint object
 * @param {number} totalBudget - Total campaign budget
 * @returns {array} - Rebalanced line items
 */
export function rebalanceToMeetMinShare(lineItems, constraint, totalBudget) {
  const channelShares = calculateChannelShares(lineItems, constraint.keywords);
  const currentShare = channelShares.preferred / totalBudget;
  const targetBudget = totalBudget * constraint.minShare;
  const deficitBudget = targetBudget - channelShares.preferred;
  
  if (deficitBudget <= 0) return lineItems; // Already meets minimum
  
  console.log(`   🔧 Rebalancing: Need additional ${deficitBudget.toLocaleString()} for ${constraint.channelLabel}`);
  
  // Strategy: Boost preferred items proportionally, reduce others
  const preferredItems = channelShares.items.preferred;
  const otherItems = channelShares.items.other;
  
  if (preferredItems.length === 0) {
    console.log(`   ⚠️ No ${constraint.channelLabel} items to boost!`);
    return lineItems;
  }
  
  // Boost preferred items proportionally
  const boostFactor = targetBudget / channelShares.preferred;
  preferredItems.forEach(item => {
    item.allocatedBudget *= boostFactor;
  });
  
  // Reduce other items to fit remaining budget
  const remainingBudget = totalBudget - targetBudget;
  if (otherItems.length > 0 && channelShares.other > 0) {
    const reductionFactor = remainingBudget / channelShares.other;
    otherItems.forEach(item => {
      item.allocatedBudget *= reductionFactor;
    });
  }
  
  return lineItems;
}

// ============================================================================
// 4. GEO-AWARE SCORING
// ============================================================================

/**
 * Score site by geographic relevance
 * 
 * @param {object} site - Site object
 * @param {array} geography - Array of state names
 * @returns {number} - Geo relevance score (0-1)
 */
export function scoreSiteByGeo(site, geography) {
  if (!geography || geography.length === 0 || geography.includes('Malaysia')) {
    return 1.0; // National - all sites equally relevant
  }
  
  const siteName = (site.name || site.site || '').toLowerCase();
  
  // Regional keyword matching
  const regionalKeywords = {
    'sabah': ['sabah', 'borneo', 'kota kinabalu'],
    'sarawak': ['sarawak', 'borneo', 'kuching'],
    'penang': ['penang', 'pulau pinang', 'georgetown'],
    'johor': ['johor', 'jb', 'johor bahru'],
    'kelantan': ['kelantan', 'kota bharu'],
    'terengganu': ['terengganu', 'kuala terengganu'],
    'pahang': ['pahang', 'kuantan']
  };
  
  // Check if site name contains regional keywords
  for (const state of geography) {
    const stateNorm = state.toLowerCase();
    const keywords = regionalKeywords[stateNorm] || [stateNorm];
    
    if (keywords.some(keyword => siteName.includes(keyword))) {
      return 2.0; // Boost regional sites
    }
  }
  
  return 0.5; // Non-regional sites get lower relevance for regional campaigns
}

/**
 * Detect if site is regional (for sorting)
 */
export function detectRegionalSite(site, geography) {
  return scoreSiteByGeo(site, geography) > 1.0;
}

/**
 * Calculate geo relevance percentage for logging
 */
export function calculateGeoRelevance(audience, geography) {
  const geoScore = scoreAudienceByGeo(audience, geography);
  const totalScore = audience.totalAudience || 1;
  return ((geoScore / totalScore) * 100).toFixed(1);
}
