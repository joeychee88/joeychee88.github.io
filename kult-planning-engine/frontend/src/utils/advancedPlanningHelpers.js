/**
 * Advanced Planning Helpers for AI Campaign Wizard
 * Incorporates sophisticated logic from BuildPlanWizard
 * Version: 3.70.0
 */

// ============================================================================
// PHASE 1: DATA FOUNDATION
// ============================================================================

/**
 * Calculate persona targeting ratio for inventory filtering
 * @param {Array} selectedPersonas - Selected persona names
 * @param {Array} availablePersonas - Full persona dataset with sizes
 * @param {boolean} massTargeting - Whether mass targeting is enabled
 * @returns {number} - Ratio between 0 and 1
 */
export const calculatePersonaRatio = (selectedPersonas, availablePersonas, massTargeting = false) => {
  // If mass targeting is enabled, return 100% (no persona filtering)
  if (massTargeting) {
    return 1.0;
  }

  // If no personas selected, return 100%
  if (!selectedPersonas || selectedPersonas.length === 0) {
    return 1.0;
  }

  // Base population: 16.15M (total Malaysian digital audience)
  const BASE_POPULATION = 16150000;
  
  // Calculate total reach of selected personas
  let totalReach = 0;
  selectedPersonas.forEach(personaName => {
    const persona = availablePersonas.find(p => p.persona === personaName || p.name === personaName);
    if (persona && persona.totalAudience) {
      totalReach += persona.totalAudience;
    }
  });

  // Calculate ratio (e.g., 3.5M / 16.15M = 21.67%)
  const ratio = totalReach / BASE_POPULATION;
  
  console.log('🎯 Persona Targeting Ratio:', {
    selectedPersonas: selectedPersonas.slice(0, 3),
    totalReach: totalReach.toLocaleString(),
    basePopulation: BASE_POPULATION.toLocaleString(),
    ratio: `${(ratio * 100).toFixed(1)}%`
  });

  return Math.min(1.0, ratio); // Cap at 100%
};

/**
 * Calculate available inventory for selected formats
 * @param {Array} selectedFormats - Selected format objects
 * @param {Object} formatInventory - Inventory data by format
 * @param {Array} targetLanguages - Selected target languages
 * @param {number} personaRatio - Persona targeting ratio (0-1)
 * @returns {Object} - Inventory summary with totals and per-format breakdown
 */
export const calculateAvailableInventory = (
  selectedFormats, 
  formatInventory, 
  targetLanguages = [], 
  personaRatio = 1.0
) => {
  if (!selectedFormats || selectedFormats.length === 0) {
    return { 
      totalRequests: 0, 
      totalImpressions: 0, 
      availableInventory: 0, 
      formats: [], 
      personaRatio: 1.0 
    };
  }

  const selectedLanguages = (targetLanguages || []).map(l => l.toLowerCase());
  const allLanguages = ['bahasa malaysia', 'english', 'chinese'];
  
  // Check if all languages are selected (treat as mass targeting - no language filter)
  const isAllLanguagesSelected = allLanguages.every(lang => 
    selectedLanguages.some(sl => sl.includes(lang.split(' ')[0]))
  );
  
  let totalRequests = 0;
  let totalImpressions = 0;
  const formatDetails = [];
  
  // Format name mappings for inventory lookup
  const formatMappings = {
    'leaderboard': 'leaderboard',
    'mrec': 'mrec',
    'masthead': 'masthead',
    'half page': 'mrec',
    'mobile banner': 'leaderboard',
    'interstitial': 'interstitial',
    'in-article': 'in article',
    'in-image': 'in image',
    'catfish': 'catfish',
    'instream video': 'pre/midroll',
    'in-stream video': 'pre/midroll',
    'pre-roll': 'preroll',
    'mid-roll': 'midroll',
    'image social ad': 'social static ad',
    'video social ad': 'social video ad',
    'skinner': 'masthead',
    'wallpaper': 'masthead',
    'takeover': 'interstitial'
  };

  selectedFormats.forEach(format => {
    const formatName = (format.name || format['Ad format'] || '').toLowerCase();
    const formatType = (format.type || '').toLowerCase();
    
    // Check if this is an interactive format (combines multiple inventories)
    const isInteractive = formatType.includes('interactive');
    let inventory = null;
    let useMultipleInventories = false;
    
    if (isInteractive) {
      // Interactive formats use combined inventory from 6 digital sizes
      useMultipleInventories = true;
    } else {
      // Try exact match first
      inventory = formatInventory[formatName];
      
      // Try mappings if no exact match
      if (!inventory) {
        for (const [key, value] of Object.entries(formatMappings)) {
          if (formatName.includes(key)) {
            inventory = formatInventory[value];
            break;
          }
        }
      }
    }

    if (!inventory && !useMultipleInventories) {
      console.warn(`⚠️ No inventory data found for format: ${format.name}`);
      return;
    }

    // Calculate inventory based on selected languages
    let formatRequests = 0;
    let formatImpressions = 0;

    if (useMultipleInventories) {
      // Interactive formats: combine inventory from multiple standard formats
      const interactiveInventoryKeys = ['leaderboard', 'mrec', 'masthead', 'interstitial', 'catfish', 'in article'];
      interactiveInventoryKeys.forEach(key => {
        const inv = formatInventory[key];
        if (inv) {
          if (selectedLanguages.length === 0 || isAllLanguagesSelected) {
            formatRequests += inv.avgMonthlyRequests;
            formatImpressions += inv.avgMonthlyImpressions;
          } else {
            inv.byLanguage.forEach(langData => {
              const langKey = langData.language.toLowerCase();
              if (selectedLanguages.some(sl => langKey.includes(sl) || langKey.includes('multi'))) {
                formatRequests += langData.totalRequests / 12;
                formatImpressions += langData.totalImpressions / 12;
              }
            });
          }
        }
      });
    } else {
      // Single inventory source
      if (selectedLanguages.length === 0 || isAllLanguagesSelected) {
        // Mass targeting - use total inventory without language filter
        formatRequests = inventory.avgMonthlyRequests;
        formatImpressions = inventory.avgMonthlyImpressions;
      } else {
        // Specific language(s) selected - filter by language
        inventory.byLanguage.forEach(langData => {
          const langKey = langData.language.toLowerCase();
          if (selectedLanguages.some(sl => langKey.includes(sl) || langKey.includes('multi'))) {
            formatRequests += langData.totalRequests / 12;
            formatImpressions += langData.totalImpressions / 12;
          }
        });
      }
    }

    totalRequests += formatRequests;
    totalImpressions += formatImpressions;

    // Apply 75% safety buffer (show only 25% of capacity) to avoid overbooking
    const rawAvailable = formatRequests - formatImpressions;
    const safeAvailable = rawAvailable * 0.25;
    
    // Apply persona targeting ratio (e.g., Entertainment = 21% of base)
    const personaTargetedAvailable = safeAvailable * personaRatio;
    
    formatDetails.push({
      name: format.name,
      avgMonthlyRequests: Math.round(formatRequests),
      avgMonthlyImpressions: Math.round(formatImpressions),
      availableInventory: Math.round(personaTargetedAvailable)
    });
  });

  // Apply 75% safety buffer to total available inventory (show only 25%)
  const rawTotalAvailable = totalRequests - totalImpressions;
  const safeTotalAvailable = rawTotalAvailable * 0.25;
  
  // Apply persona targeting ratio
  const personaTargetedTotal = safeTotalAvailable * personaRatio;

  return {
    totalRequests: Math.round(totalRequests),
    totalImpressions: Math.round(totalImpressions),
    availableInventory: Math.round(personaTargetedTotal),
    formats: formatDetails,
    personaRatio: personaRatio
  };
};

/**
 * Validate if budget is feasible with available inventory
 * @param {number} budget - Campaign budget in RM
 * @param {Array} selectedFormats - Selected format objects
 * @param {Object} formatInventory - Inventory data
 * @param {Array} targetLanguages - Target languages
 * @param {number} personaRatio - Persona ratio (0-1)
 * @returns {Object} - Validation result with warnings
 */
export const validateInventoryCapacity = (
  budget, 
  selectedFormats, 
  formatInventory, 
  targetLanguages = [], 
  personaRatio = 1.0
) => {
  if (!budget || budget <= 0) {
    return { valid: true };
  }

  const inventory = calculateAvailableInventory(
    selectedFormats, 
    formatInventory, 
    targetLanguages, 
    personaRatio
  );
  
  // Estimate if budget is feasible based on CPM and available inventory
  // Average CPM is around RM 3-10, let's use RM 5 as baseline
  const estimatedCPM = 5;
  const requestedImpressions = (budget / estimatedCPM) * 1000;
  
  const availableInv = inventory.availableInventory;
  
  // If requested impressions exceed available inventory by a large margin
  if (availableInv > 0 && requestedImpressions > availableInv * 0.8) {
    const capacityPercentage = Math.round((availableInv * estimatedCPM / 1000) / budget * 100);
    
    if (capacityPercentage < 20) {
      // Critical: Inventory is too low for this budget
      return {
        valid: false,
        severity: 'critical',
        message: `Selected formats have insufficient available inventory (${(availableInv / 1000000).toFixed(1)}M available). This budget would require ~${(requestedImpressions / 1000000).toFixed(1)}M impressions. Please select formats with more inventory or reduce your budget to RM ${Math.round(availableInv * estimatedCPM / 1000 / 1000) * 1000}.`,
        suggestedBudget: Math.round(availableInv * estimatedCPM / 1000 / 1000) * 1000,
        availableImpressions: availableInv,
        requestedImpressions
      };
    } else if (capacityPercentage < 50) {
      // Warning: Limited inventory
      return {
        valid: true,
        severity: 'warning',
        message: `Limited inventory alert: Selected formats have ~${(availableInv / 1000000).toFixed(1)}M available inventory. Consider selecting additional formats with higher inventory for optimal delivery.`,
        availableImpressions: availableInv,
        requestedImpressions
      };
    }
  }
  
  // Budget warning for low budgets
  if (budget < 20000) {
    return {
      valid: true,
      severity: 'info',
      message: 'Budgets under RM 20k may limit the number of channels and formats we can use',
      availableImpressions: availableInv,
      requestedImpressions
    };
  }
  
  return { 
    valid: true, 
    availableImpressions: availableInv,
    requestedImpressions 
  };
};

// ============================================================================
// PHASE 1B: AUDIENCE OVERLAP & UNIQUE REACH
// ============================================================================

/**
 * Persona category mappings for overlap estimation
 */
export const PERSONA_CATEGORIES = {
  'Entertainment': ['Entertainment', 'Comedy Lover', 'Horror', 'Romantic Comedy', 'Action & Adventure', 'Animation', 'Sci-Fi & Fantasy', 'Music & Concert Goers'],
  'Sports': ['Sports', 'EPL Super Fans', 'Badminton', 'Golf Fans', 'Sepak Takraw', 'Esports Fan'],
  'Lifestyle': ['Active Lifestyle Seekers', 'Adventure Enthusiasts', 'Health & Wellness Shoppers', 'Foodies', 'Travel & Experience Seekers', 'Fashion Icons'],
  'Technology': ['Tech & Gadget Enthusiasts', 'Gadget Gurus', 'Online Shoppers'],
  'Automotive': ['Automotive Enthusiasts', 'Automotive Intent'],
  'Business': ['Business & Professional', 'Corporate Visionaries', 'SME', 'Start-ups', 'Emerging Affluents'],
  'Luxury': ['Luxury Buyers', 'Luxury Seekers'],
  'Family': ['Family Dynamic ( Experienced Family )', 'Little Steps Advocates ( Young Family)', 'Mommy Pros ( Experienced Mother)', 'Youth Mom', 'The Dynamic Duo'],
  'Life Stage': ['Students', 'Young Working Adult', 'Soloist'],
  'Home & Living': ['Home Buyers', 'Eco Enthusiasts']
};

/**
 * Get persona category
 * @param {string} personaName - Persona name
 * @returns {string} - Category name
 */
export const getPersonaCategory = (personaName) => {
  for (const [category, personas] of Object.entries(PERSONA_CATEGORIES)) {
    if (personas.some(p => personaName.includes(p) || p.includes(personaName))) {
      return category;
    }
  }
  return 'Other';
};

/**
 * Calculate overlap factor between two personas
 * @param {string} persona1 - First persona name
 * @param {string} persona2 - Second persona name
 * @returns {number} - Overlap factor between 0 and 1
 */
export const getOverlapFactor = (persona1, persona2) => {
  const cat1 = getPersonaCategory(persona1);
  const cat2 = getPersonaCategory(persona2);
  
  // Same category = higher overlap
  if (cat1 === cat2) {
    if (['Entertainment', 'Sports'].includes(cat1)) return 0.75;
    if (['Lifestyle', 'Technology'].includes(cat1)) return 0.60;
    return 0.50;
  }
  
  // Related categories
  if ((cat1 === 'Sports' && cat2 === 'Lifestyle') || (cat1 === 'Lifestyle' && cat2 === 'Sports')) return 0.55;
  if ((cat1 === 'Business' && cat2 === 'Luxury') || (cat1 === 'Luxury' && cat2 === 'Business')) return 0.45;
  if ((cat1 === 'Entertainment' && cat2 === 'Technology') || (cat1 === 'Technology' && cat2 === 'Entertainment')) return 0.30;
  if ((cat1 === 'Lifestyle' && cat2 === 'Technology') || (cat1 === 'Technology' && cat2 === 'Lifestyle')) return 0.30;
  
  // Different categories = lower overlap
  return 0.25;
};

/**
 * Calculate unique reach across selected personas (accounting for overlap)
 * @param {Array} selectedPersonas - Array of selected persona names
 * @param {Array} audienceData - Full audience dataset
 * @returns {number} - Unique reach estimate
 */
export const calculateUniqueReach = (selectedPersonas, audienceData) => {
  if (!selectedPersonas || selectedPersonas.length === 0) return 0;
  
  const personas = selectedPersonas.map(name => 
    audienceData.find(a => (a.persona || a.name) === name)
  ).filter(Boolean);
  
  if (personas.length === 0) return 0;
  if (personas.length === 1) return personas[0].totalAudience || 0;
  
  // Use inclusion-exclusion principle for 2+ personas
  let totalReach = 0;
  
  // Add individual reaches
  personas.forEach(p => totalReach += p.totalAudience || 0);
  
  // Subtract overlaps (pairwise)
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const overlap = getOverlapFactor(personas[i].persona || personas[i].name, personas[j].persona || personas[j].name);
      const minReach = Math.min(personas[i].totalAudience || 0, personas[j].totalAudience || 0);
      totalReach -= minReach * overlap;
    }
  }
  
  return Math.max(0, totalReach);
};

// ============================================================================
// PHASE 2: FORMAT & SITE INTELLIGENCE
// ============================================================================

/**
 * Get compatible sites based on selected formats
 * @param {Array} selectedFormats - Selected format objects
 * @param {Object} allSites - All sites grouped by channel
 * @returns {Object} - Compatible sites grouped by channel
 */
export const getCompatibleSites = (selectedFormats, allSites) => {
  if (!selectedFormats || selectedFormats.length === 0) {
    return allSites; // No formats selected, show all
  }

  const hasVideoFormat = selectedFormats.some(f => {
    const nameLower = (f.name || '').toLowerCase();
    const typeLower = (f.type || '').toLowerCase();
    
    // EXCLUDE social video from OTT detection
    if (nameLower.includes('social')) return false;
    
    // Only true streaming video
    return typeLower === 'video' || 
           nameLower.includes('instream') || 
           nameLower.includes('in-stream') ||
           nameLower.includes('pre-roll') || 
           nameLower.includes('mid-roll') ||
           nameLower.includes('preroll') || 
           nameLower.includes('midroll');
  });
  
  const hasDisplayFormat = selectedFormats.some(f => {
    const nameLower = (f.name || '').toLowerCase();
    const typeLower = (f.type || '').toLowerCase();
    
    // Exclude social formats
    if (nameLower.includes('social')) return false;
    
    return typeLower === 'standard iab banner' || 
           typeLower === 'high impact' ||
           typeLower === 'interactive banner' ||
           nameLower.includes('banner') ||
           nameLower.includes('leaderboard') ||
           nameLower.includes('mrec') ||
           nameLower.includes('masthead') ||
           nameLower.includes('display');
  });
  
  const hasSocialFormat = selectedFormats.some(f => {
    const nameLower = (f.name || '').toLowerCase();
    const typeLower = (f.type || '').toLowerCase();
    
    return nameLower.includes('social') ||
           nameLower.includes('stories') ||
           nameLower.includes('story') ||
           nameLower.includes('reel') ||
           nameLower.includes('tiktok') ||
           nameLower.includes('carousel') ||
           nameLower.includes('feed') ||
           nameLower.includes('instagram') ||
           nameLower.includes('facebook') ||
           typeLower === 'static image'; // Social static ads
  });
  
  console.log('🎯 Smart Channel Filtering:', {
    hasVideoFormat,
    hasDisplayFormat,
    hasSocialFormat
  });
  
  const compatibleChannels = {};
  
  Object.entries(allSites).forEach(([channel, sites]) => {
    let shouldShow = false;
    
    if (channel === 'OTT') {
      shouldShow = hasVideoFormat; // Only show for streaming video
    } else if (channel === 'Web') {
      shouldShow = hasVideoFormat || hasDisplayFormat;
    } else if (channel === 'Social') {
      shouldShow = hasSocialFormat; // ONLY for social formats
    } else {
      shouldShow = true; // Other channels
    }
    
    if (shouldShow) {
      // Further filter sites within channel
      const compatibleSites = sites.filter(site => {
        const siteFormats = ((site.formats || []).map(f => f.toLowerCase()));
        
        // If no format info, include by default
        if (siteFormats.length === 0) return true;
        
        if (hasVideoFormat && siteFormats.some(f => f.includes('roll') || f.includes('video'))) {
          return true;
        }
        if (hasDisplayFormat && siteFormats.some(f => 
          f.includes('banner') || 
          f.includes('leaderboard') || 
          f.includes('mrec') ||
          f.includes('masthead')
        )) {
          return true;
        }
        if (hasSocialFormat && channel === 'Social') {
          return true;
        }
        
        return false;
      });
      
      if (compatibleSites.length > 0) {
        compatibleChannels[channel] = compatibleSites;
      }
    }
  });
  
  console.log('✅ Compatible channels:', Object.keys(compatibleChannels));
  
  return compatibleChannels;
};

/**
 * Filter sites by target languages (Web channel only)
 * @param {Object} sitesByChannel - Sites grouped by channel
 * @param {Array} targetLanguages - Target languages
 * @returns {Object} - Filtered sites
 */
export const filterSitesByLanguage = (sitesByChannel, targetLanguages) => {
  if (!targetLanguages || targetLanguages.length === 0) {
    return sitesByChannel; // No language filter
  }
  
  const allLanguages = ['bahasa malaysia', 'english', 'chinese'];
  const isAllLanguages = allLanguages.every(lang => 
    targetLanguages.some(tl => tl.toLowerCase().includes(lang.split(' ')[0]))
  );
  
  if (isAllLanguages) {
    return sitesByChannel; // Mass targeting - no filter
  }
  
  const filtered = {};
  
  Object.entries(sitesByChannel).forEach(([channel, sites]) => {
    // OTT and Social: universal platforms, don't filter
    if (channel === 'OTT' || channel === 'Social') {
      filtered[channel] = sites;
      return;
    }
    
    // Web: filter by language
    const languageMatchedSites = sites.filter(site => {
      const siteLanguages = (site.languages || []).map(l => l.toLowerCase());
      
      // No language info - include by default
      if (siteLanguages.length === 0) return true;
      
      const hasMatch = targetLanguages.some(targetLang => {
        const targetLower = targetLang.toLowerCase();
        return siteLanguages.some(siteLang => 
          siteLang.includes(targetLower) || siteLang.includes('multi')
        );
      });
      
      return hasMatch;
    });
    
    if (languageMatchedSites.length > 0) {
      filtered[channel] = languageMatchedSites;
    }
  });
  
  console.log('🌍 Language-filtered channels:', Object.keys(filtered));
  
  return filtered;
};

// Continue in next message due to length...
/**
 * Advanced Planning Helpers for AI Campaign Wizard - Part 2
 * Budget Tier Strategy, Geographic Intelligence, and Visual Components
 * Version: 3.70.0
 */

// ============================================================================
// PHASE 3: BUDGET INTELLIGENCE
// ============================================================================

/**
 * Determine budget tier and strategic constraints
 * @param {number} budget - Campaign budget in RM
 * @returns {Object} - Tier info and strategy constraints
 */
export const determineBudgetTier = (budget) => {
  let tier = 'low';
  let strategy = {};
  
  if (budget <= 100000) {
    tier = 'low';
    strategy = {
      name: 'Focused Concentration',
      maxPlatforms: 3,
      buyingTypes: ['Direct'],
      allowPD: false,
      allowPremium: false,
      audienceLimit: 2,
      focusStrategy: 'single-platform concentration',
      channelMix: { primary: 0.60, secondary: 0.30, tertiary: 0.10 }
    };
  } else if (budget > 100000 && budget <= 200000) {
    tier = 'mid';
    strategy = {
      name: 'Balanced Multi-Channel',
      maxPlatforms: 5,
      buyingTypes: ['Direct', 'PD'],
      allowPD: true,
      allowPremium: false,
      audienceLimit: 4,
      focusStrategy: 'balanced diversification',
      channelMix: { primary: 0.40, secondary: 0.30, tertiary: 0.20, quaternary: 0.10 }
    };
  } else {
    tier = 'high';
    strategy = {
      name: 'Premium Diversification',
      maxPlatforms: 6,
      buyingTypes: ['Direct', 'PD', 'PG'],
      allowPD: true,
      allowPremium: true,
      audienceLimit: 6,
      focusStrategy: 'multi-platform premium',
      channelMix: { primary: 0.35, secondary: 0.25, tertiary: 0.20, quaternary: 0.12, quinary: 0.08 }
    };
  }
  
  console.log(`💰 BUDGET TIER: ${tier.toUpperCase()} (${strategy.name})`);
  console.log(`   Max Platforms: ${strategy.maxPlatforms}, Audience Limit: ${strategy.audienceLimit}`);
  
  return { tier, strategy };
};

/**
 * Validate platform mix matches tier constraints
 * @param {Array} lineItems - Media plan line items
 * @param {string} tier - Budget tier (low/mid/high)
 * @param {Object} strategy - Tier strategy object
 * @returns {Array} - Array of warning messages
 */
export const validateTierCompliance = (lineItems, tier, strategy) => {
  const uniquePillars = new Set(lineItems.map(item => item.pillar));
  const hasPD = lineItems.some(item => item.buyType === 'PD');
  const hasPG = lineItems.some(item => item.buyType === 'PG');
  
  const warnings = [];
  
  if (tier === 'high' && !hasPD) {
    warnings.push('⚠️ Strategy warning: High budget should include PD buying type for efficiency');
  }
  
  if (tier === 'low' && (hasPD || hasPG)) {
    warnings.push('⚠️ Strategy warning: Low budget should not include PD/PG - stick to Direct for simplicity');
  }
  
  if (lineItems.length > strategy.maxPlatforms) {
    warnings.push(`⚠️ Platform count (${lineItems.length}) exceeds tier limit (${strategy.maxPlatforms})`);
  }
  
  if (lineItems.length === strategy.maxPlatforms && uniquePillars.size < 2) {
    warnings.push('⚠️ Strategy failure: platform mix lacks diversification');
  }
  
  console.log(`✅ TIER VALIDATION: ${warnings.length === 0 ? 'PASSED' : warnings.length + ' warnings'}`);
  
  return warnings;
};

/**
 * Get channel category from line item
 * @param {Object} lineItem - Media plan line item
 * @returns {string} - Channel category (OTT/Web/Social)
 */
export const getChannelCategory = (lineItem) => {
  const nameLower = (lineItem.platform || lineItem.name || '').toLowerCase();
  const pillarLower = (lineItem.pillar || '').toLowerCase();
  
  if (nameLower.includes('ott') || nameLower.includes('video') || pillarLower.includes('video')) return 'OTT';
  if (nameLower.includes('social') || pillarLower.includes('social')) return 'Social';
  if (nameLower.includes('web') || nameLower.includes('display') || nameLower.includes('interactive')) return 'Web';
  
  return 'Web'; // Default
};

/**
 * Apply 100% loading to non-optimized channels
 * @param {Array} lineItems - Media plan line items
 * @param {Array} optimizedGroups - Array of optimized channel categories
 * @returns {Array} - Updated line items with loading applied
 */
export const applyChannelLoading = (lineItems, optimizedGroups = []) => {
  console.log('🔄 Applying channel loading...', {
    lineItemsCount: lineItems.length,
    optimizedGroups
  });
  
  return lineItems.map(item => {
    const channelCategory = getChannelCategory(item);
    const isOptimized = optimizedGroups.includes(channelCategory);
    const shouldHaveLoading = !isOptimized; // Apply loading if NOT optimized
    
    if (shouldHaveLoading) {
      // Store base values before applying loading
      const baseCpm = item.baseCpm || item.cpm;
      const baseBudget = item.baseBudget || item.budget;
      
      // Apply 100% loading: double CPM and budget
      const newCpm = baseCpm * 2;
      const newBudget = baseBudget * 2;
      const newImpressions = Math.round((newBudget / newCpm) * 1000);
      
      console.log(`   Loading APPLIED for ${item.platform}: CPM ${baseCpm} → ${newCpm}, Budget RM ${baseBudget.toLocaleString()} → RM ${newBudget.toLocaleString()}`);
      
      return {
        ...item,
        hasLoading: true,
        baseCpm,
        baseBudget,
        cpm: newCpm,
        budget: newBudget,
        impressions: newImpressions
      };
    }
    
    return { 
      ...item, 
      hasLoading: false,
      baseCpm: item.cpm,
      baseBudget: item.budget
    };
  });
};

// ============================================================================
// PHASE 4: GEOGRAPHIC INTELLIGENCE
// ============================================================================

/**
 * Score audience by geographic relevance
 * @param {Object} audience - Audience object with state-level data
 * @param {Array} targetGeography - Target states/regions
 * @returns {number} - Score between 0 and 2 (higher = more relevant)
 */
export const scoreAudienceByGeo = (audience, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0) return 1.0;
  if (targetGeography.includes('Malaysia')) return 1.0; // Nationwide
  
  // Sum audience size in target states
  let targetStateReach = 0;
  let totalReach = audience.totalAudience || 0;
  
  targetGeography.forEach(state => {
    const stateValue = audience[state];
    if (stateValue) {
      const parsed = parseInt(String(stateValue).replace(/,/g, ''), 10);
      targetStateReach += parsed || 0;
    }
  });
  
  // Return percentage of total audience in target geography
  return totalReach > 0 ? (targetStateReach / totalReach) : 0;
};

/**
 * Calculate geographic relevance percentage
 * @param {Object} audience - Audience object
 * @param {Array} targetGeography - Target states
 * @returns {number} - Relevance percentage (0-100)
 */
export const calculateGeoRelevance = (audience, targetGeography) => {
  const score = scoreAudienceByGeo(audience, targetGeography);
  return Math.round(score * 100);
};

/**
 * Detect if site serves specific region
 * @param {Object} site - Site object
 * @param {Array} targetGeography - Target states
 * @returns {boolean} - True if regional site
 */
export const detectRegionalSite = (site, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0) return false;
  if (targetGeography.includes('Malaysia')) return false; // Nationwide
  
  const siteName = (site.name || site.site || '').toLowerCase();
  
  // Regional publisher keywords
  const regionalKeywords = {
    'Penang': ['penang', 'pulau pinang', 'kwong wah', 'penang-based'],
    'Johor': ['johor', 'jb', 'johor bahru', 'singaporean'],
    'Sabah': ['sabah', 'kota kinabalu', 'daily express', 'borneo'],
    'Sarawak': ['sarawak', 'kuching', 'borneo post', 'utusan borneo'],
    'Kelantan': ['kelantan', 'kota bharu', 'kota bahru'],
    'Terengganu': ['terengganu', 'kuala terengganu'],
    'Kedah': ['kedah', 'alor setar'],
    'Perak': ['perak', 'ipoh'],
    'Melaka': ['melaka', 'malacca'],
    'Pahang': ['pahang', 'kuantan']
  };
  
  // Check if site matches any target state
  for (const state of targetGeography) {
    const keywords = regionalKeywords[state] || [];
    if (keywords.some(keyword => siteName.includes(keyword))) {
      return true;
    }
  }
  
  return false;
};

/**
 * Score sites by geographic fit
 * @param {Object} site - Site object
 * @param {Array} targetGeography - Target states
 * @returns {number} - Score (0.5 = national, 2.0 = regional match)
 */
export const scoreSiteByGeo = (site, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0) return 1.0;
  if (targetGeography.includes('Malaysia')) return 1.0;
  
  // Regional sites get 2x score
  if (detectRegionalSite(site, targetGeography)) {
    return 2.0;
  }
  
  // National sites still viable but lower priority
  return 0.5;
};

/**
 * Sort and prioritize audiences by geographic relevance
 * @param {Array} audiences - Array of audience objects
 * @param {Array} targetGeography - Target states
 * @returns {Array} - Sorted audiences with geoScore and geoRelevance
 */
export const prioritizeAudiencesByGeo = (audiences, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0 || targetGeography.includes('Malaysia')) {
    // Nationwide - sort by total reach only
    return audiences.sort((a, b) => (b.totalAudience || 0) - (a.totalAudience || 0));
  }
  
  // Add geo scores
  const scored = audiences.map(a => ({
    ...a,
    geoScore: scoreAudienceByGeo(a, targetGeography),
    geoRelevance: calculateGeoRelevance(a, targetGeography)
  }));
  
  // Sort by geo score first, then by total reach
  scored.sort((a, b) => {
    if (Math.abs(a.geoScore - b.geoScore) > 0.1) {
      return b.geoScore - a.geoScore;
    }
    return (b.totalAudience || 0) - (a.totalAudience || 0);
  });
  
  const regionalCount = scored.filter(a => a.geoRelevance > 50).length;
  console.log(`🌍 Geo-prioritized audiences: ${regionalCount} regional out of ${scored.length}`);
  
  return scored;
};

/**
 * Sort and prioritize sites by geographic relevance
 * @param {Array} sites - Array of site objects
 * @param {Array} targetGeography - Target states
 * @returns {Array} - Sorted sites with geoScore and isRegional
 */
export const prioritizeSitesByGeo = (sites, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0 || targetGeography.includes('Malaysia')) {
    // Nationwide - sort by traffic only
    return sites.sort((a, b) => (b.monthlyTraffic || 0) - (a.monthlyTraffic || 0));
  }
  
  // Add geo scores
  const scored = sites.map(s => ({
    ...s,
    geoScore: scoreSiteByGeo(s, targetGeography),
    isRegional: detectRegionalSite(s, targetGeography)
  }));
  
  // Sort: regional first, then by traffic within each group
  scored.sort((a, b) => {
    if (a.isRegional !== b.isRegional) {
      return b.isRegional - a.isRegional;
    }
    return (b.monthlyTraffic || 0) * b.geoScore - (a.monthlyTraffic || 0) * a.geoScore;
  });
  
  const regionalCount = scored.filter(s => s.isRegional).length;
  console.log(`🌍 Geo-prioritized sites: ${regionalCount} regional out of ${scored.length}`);
  
  return scored;
};

// ============================================================================
// PHASE 5: HELPER UTILITIES
// ============================================================================

/**
 * Format large numbers with K/M suffix
 * @param {number} num - Number to format
 * @returns {string} - Formatted string
 */
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

/**
 * Generate plan summary text for conversational display
 * @param {Object} plan - Media plan object
 * @returns {string} - Formatted summary text
 */
export const generatePlanSummaryText = (plan) => {
  const { brief, summary, lineItems, audiences, formats, inventoryValidation } = plan;
  
  let text = `## 📊 Your ${brief.campaign_objective} Media Plan\n\n`;
  
  // Budget & Reach
  text += `**Budget:** RM ${summary.totalBudget.toLocaleString()}\n`;
  text += `**Estimated Impressions:** ${formatNumber(summary.totalImpressions)}\n`;
  text += `**Estimated Unique Reach:** ${formatNumber(summary.estimatedReach)}\n`;
  text += `**Average CPM:** RM ${summary.avgCPM.toFixed(2)}\n`;
  text += `**Duration:** ${summary.durationWeeks} weeks\n\n`;
  
  // Inventory warning if applicable
  if (inventoryValidation && !inventoryValidation.valid) {
    text += `⚠️ **Inventory Alert:** ${inventoryValidation.message}\n\n`;
  }
  
  // Platform Mix
  text += `### Platform Mix\n\n`;
  lineItems.forEach((item, idx) => {
    const percentage = ((item.budget / summary.totalBudget) * 100).toFixed(0);
    const loadingBadge = item.hasLoading ? ' [+100% Loading]' : '';
    text += `${idx + 1}. **${item.platform}** (${item.pillar})${loadingBadge}\n`;
    text += `   - Budget: RM ${item.budget.toLocaleString()} (${percentage}%)\n`;
    text += `   - CPM: RM ${item.cpm.toFixed(2)} | Impressions: ${formatNumber(item.impressions)}\n`;
    text += `   - Buying: ${item.buyType}\n\n`;
  });
  
  // Audiences
  text += `### Target Audiences\n\n`;
  audiences.slice(0, 4).forEach((aud, idx) => {
    const geoTag = aud.geoRelevance ? ` (${aud.geoRelevance}% geo-match)` : '';
    text += `${idx + 1}. ${aud.persona || aud.name}${geoTag} - ${formatNumber(aud.totalAudience)} reach\n`;
  });
  
  if (audiences.length > 4) {
    text += `\n...and ${audiences.length - 4} more audiences\n`;
  }
  
  text += `\n`;
  
  // Formats
  text += `### Ad Formats\n\n`;
  formats.slice(0, 5).forEach((fmt, idx) => {
    text += `${idx + 1}. ${fmt.name}\n`;
  });
  
  if (formats.length > 5) {
    text += `\n...and ${formats.length - 5} more formats\n`;
  }
  
  text += `\n`;
  
  // Geography
  text += `**Geographic Targeting:** ${summary.geography}\n\n`;
  
  // Next steps
  text += `Would you like to:\n`;
  text += `• Export this plan\n`;
  text += `• Make adjustments (budget, geography, formats)\n`;
  text += `• Load to Campaign Planner for detailed customization\n`;
  
  return text;
};

/**
 * Calculate tier-appropriate allocation percentages
 * @param {number} platformCount - Number of platforms
 * @param {Object} tierStrategy - Tier strategy object
 * @returns {Array} - Array of allocation percentages
 */
export const calculateTierAllocations = (platformCount, tierStrategy) => {
  const mixValues = Object.values(tierStrategy.channelMix);
  const allocations = [];
  
  for (let i = 0; i < platformCount; i++) {
    allocations.push(mixValues[i] || mixValues[mixValues.length - 1]);
  }
  
  // Normalize to ensure sum = 1
  const sum = allocations.reduce((a, b) => a + b, 0);
  return allocations.map(a => a / sum);
};

export default {
  // Phase 1: Data Foundation
  calculatePersonaRatio,
  calculateAvailableInventory,
  validateInventoryCapacity,
  
  // Phase 1B: Audience Overlap
  PERSONA_CATEGORIES,
  getPersonaCategory,
  getOverlapFactor,
  calculateUniqueReach,
  
  // Phase 2: Format & Site Intelligence
  getCompatibleSites,
  filterSitesByLanguage,
  
  // Phase 3: Budget Intelligence
  determineBudgetTier,
  validateTierCompliance,
  getChannelCategory,
  applyChannelLoading,
  calculateTierAllocations,
  
  // Phase 4: Geographic Intelligence
  scoreAudienceByGeo,
  calculateGeoRelevance,
  detectRegionalSite,
  scoreSiteByGeo,
  prioritizeAudiencesByGeo,
  prioritizeSitesByGeo,
  
  // Phase 5: Utilities
  formatNumber,
  generatePlanSummaryText
};
