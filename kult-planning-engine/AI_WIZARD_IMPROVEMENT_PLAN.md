# AI Campaign Wizard Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to enhance the AI Campaign Wizard by incorporating advanced features from the completed Campaign Planning Wizard (BuildPlanWizard). The goal is to create a more accurate, data-driven, and user-friendly conversational planning experience.

---

## Key Findings: BuildPlanWizard vs AIWizard

### What BuildPlanWizard Does Better

1. **Real Inventory Validation**
   - Loads format inventory data from `/api/inventory/by-format`
   - Calculates available inventory: `(Requests - Impressions) * 25% (safety buffer) * PersonaRatio`
   - Validates budget against actual capacity
   - Provides specific warnings when inventory is insufficient

2. **Advanced Audience Intelligence**
   - **Overlap Calculation**: Uses persona categories to estimate audience overlap between selected personas
   - **Persona Ratio Calculation**: `totalReach / BASE_POPULATION (16.15M)` 
   - **Geographic Weighting**: Scores audiences by state-level data relevance
   - **Unique Reach Estimation**: Accounts for persona overlap in total reach calculations

3. **Format-Site Compatibility Matrix**
   - **Smart Channel Filtering**: Shows only channels that support selected format types
   - **Video Detection**: Distinguishes between OTT video (streaming) and social video
   - **Language Filtering**: Excludes Web sites that don't match selected languages
   - **Format Type Mapping**: Maps formats to channels (Video → OTT/Web, Social formats → Social only, Display → Web)

4. **Budget Tier Strategy Framework**
   - **Tier Determination**: Low (≤100k), Mid (100-200k), High (200k+)
   - **Tier-Specific Constraints**:
     - Low: Max 3 platforms, Direct buying only, 2 audience limit
     - Mid: Max 5 platforms, Direct+PD, 4 audience limit
     - High: Max 6 platforms, All buying types, 6 audience limit
   - **Loading Calculation**: Applies 100% loading (2x CPM and budget) for non-optimized channels

5. **Geography Intelligence**
   - **State-Level Data**: Uses audience data broken down by Malaysian states
   - **Regional Site Detection**: Identifies and prioritizes regional publishers
   - **Geo-Relevance Scoring**: `calculateGeoRelevance(audience, geography)`

### What AIWizard Does Better

1. **Conversational Flow**: Natural language entity extraction
2. **Context Awareness**: Seasonal/cultural/festive campaign detection
3. **Budget Suggestion**: Provides 3-tier budget recommendations with rationale
4. **Channel Preference**: Asks users about OTT/Social/Display preference
5. **Vertical Playbook Integration**: Maps industries to recommended formats and personas

---

## Improvement Roadmap

### Phase 1: Data Foundation (High Priority)

#### 1.1 Inventory Validation System ⚠️ CRITICAL

**Problem**: AI Wizard doesn't validate if requested budget can be fulfilled with available inventory.

**Solution**: Integrate `calculateAvailableInventory()` from BuildPlanWizard

```javascript
// NEW: Add to AIWizard state
const [formatInventory, setFormatInventory] = useState({});

// NEW: Load inventory data on mount
useEffect(() => {
  fetch('/api/inventory/by-format')
    .then(res => res.json())
    .then(data => {
      const inventoryMap = {};
      data.formats.forEach(fmt => {
        inventoryMap[fmt.formatName.toLowerCase()] = {
          avgMonthlyRequests: fmt.avgMonthlyRequests,
          avgMonthlyImpressions: fmt.avgMonthlyImpressions,
          byLanguage: fmt.byLanguage
        };
      });
      setFormatInventory(inventoryMap);
    });
}, []);

// NEW: Add validation before generating plan
const validateInventoryCapacity = (selectedFormats, budget, targetLanguages) => {
  const estimatedCPM = 5; // baseline
  const requestedImpressions = (budget / estimatedCPM) * 1000;
  
  let totalAvailable = 0;
  selectedFormats.forEach(format => {
    const inv = formatInventory[format.name.toLowerCase()];
    if (inv) {
      // Apply 25% safety buffer + persona ratio
      const rawAvailable = inv.avgMonthlyRequests - inv.avgMonthlyImpressions;
      const safeAvailable = rawAvailable * 0.25;
      const personaTargeted = safeAvailable * calculatePersonaRatio();
      totalAvailable += personaTargeted;
    }
  });
  
  if (requestedImpressions > totalAvailable * 0.8) {
    return {
      valid: false,
      message: `Selected formats have insufficient inventory (${(totalAvailable / 1000000).toFixed(1)}M available). Budget would require ~${(requestedImpressions / 1000000).toFixed(1)}M impressions.`,
      suggestedBudget: Math.round(totalAvailable * estimatedCPM / 1000 / 1000) * 1000
    };
  }
  
  return { valid: true };
};
```

**Impact**: Prevents overbooking; provides realistic budget recommendations

---

#### 1.2 Audience Overlap & Unique Reach

**Problem**: AI Wizard sums audiences directly, overestimating total reach.

**Solution**: Implement `getOverlapFactor()` and unique reach calculation

```javascript
// NEW: Persona category mapping
const PERSONA_CATEGORIES = {
  'Entertainment': ['Comedy Lover', 'Horror', 'Romantic Comedy', 'Music & Concert Goers'],
  'Sports': ['Sports', 'EPL Super Fans', 'Badminton', 'Golf Fans'],
  'Lifestyle': ['Active Lifestyle Seekers', 'Foodies', 'Travel & Experience Seekers'],
  'Technology': ['Tech & Gadget Enthusiasts', 'Gadget Gurus', 'Online Shoppers'],
  'Family': ['Family Dynamic', 'Little Steps Advocates', 'Mommy Pros']
};

// NEW: Calculate overlap between two personas
const getOverlapFactor = (persona1, persona2) => {
  const cat1 = getPersonaCategory(persona1);
  const cat2 = getPersonaCategory(persona2);
  
  // Same category = higher overlap
  if (cat1 === cat2) {
    if (['Entertainment', 'Sports'].includes(cat1)) return 0.75;
    if (['Lifestyle', 'Technology'].includes(cat1)) return 0.60;
    return 0.50;
  }
  
  // Related categories
  if ((cat1 === 'Sports' && cat2 === 'Lifestyle') || 
      (cat1 === 'Lifestyle' && cat2 === 'Sports')) return 0.55;
  
  // Different categories = lower overlap
  return 0.25;
};

// NEW: Calculate unique reach across selected personas
const calculateUniqueReach = (selectedPersonas, audienceData) => {
  if (selectedPersonas.length === 0) return 0;
  if (selectedPersonas.length === 1) {
    const persona = audienceData.find(a => a.persona === selectedPersonas[0]);
    return persona?.totalAudience || 0;
  }
  
  // Use inclusion-exclusion principle for 2+ personas
  let totalReach = 0;
  const personas = selectedPersonas.map(name => 
    audienceData.find(a => a.persona === name)
  ).filter(Boolean);
  
  // Add individual reaches
  personas.forEach(p => totalReach += p.totalAudience);
  
  // Subtract overlaps
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const overlap = getOverlapFactor(personas[i].persona, personas[j].persona);
      const minReach = Math.min(personas[i].totalAudience, personas[j].totalAudience);
      totalReach -= minReach * overlap;
    }
  }
  
  return Math.max(0, totalReach);
};
```

**Impact**: More accurate reach estimates; prevents over-promising

---

### Phase 2: Format & Site Intelligence (High Priority)

#### 2.1 Format-Site Compatibility Filtering

**Problem**: AI Wizard may recommend sites that don't support selected formats.

**Solution**: Implement `getFilteredSites()` logic from BuildPlanWizard

```javascript
// NEW: Smart site filtering based on selected formats
const getCompatibleSites = (selectedFormats, allSites) => {
  const hasVideoFormat = selectedFormats.some(f => {
    const nameLower = f.name.toLowerCase();
    const typeLower = (f.type || '').toLowerCase();
    
    // EXCLUDE social video from OTT detection
    if (nameLower.includes('social')) return false;
    
    // Only true streaming video
    return typeLower === 'video' || 
           nameLower.includes('instream') || 
           nameLower.includes('pre-roll');
  });
  
  const hasDisplayFormat = selectedFormats.some(f => {
    const nameLower = f.name.toLowerCase();
    // Exclude social formats
    if (nameLower.includes('social')) return false;
    
    return nameLower.includes('banner') || 
           nameLower.includes('leaderboard') || 
           nameLower.includes('mrec');
  });
  
  const hasSocialFormat = selectedFormats.some(f => {
    const nameLower = f.name.toLowerCase();
    return nameLower.includes('social') || 
           nameLower.includes('stories') || 
           nameLower.includes('reel');
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
    }
    
    if (shouldShow) {
      // Further filter sites within channel
      const compatibleSites = sites.filter(site => {
        const siteFormats = (site.formats || []).map(f => f.toLowerCase());
        
        if (hasVideoFormat && siteFormats.some(f => f.includes('roll') || f.includes('video'))) {
          return true;
        }
        if (hasDisplayFormat && siteFormats.some(f => f.includes('banner') || f.includes('leaderboard'))) {
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
  
  return compatibleChannels;
};
```

**Impact**: Prevents recommending incompatible channel/format combinations

---

#### 2.2 Language-Based Web Filtering

**Problem**: Recommends Chinese/Malay sites for English-only campaigns.

**Solution**: Add language compatibility check

```javascript
// NEW: Filter Web sites by target languages
const filterSitesByLanguage = (sites, targetLanguages, geography) => {
  if (!targetLanguages || targetLanguages.length === 0) {
    return sites; // No language filter
  }
  
  const allLanguages = ['bahasa malaysia', 'english', 'chinese'];
  const isAllLanguages = allLanguages.every(lang => 
    targetLanguages.some(tl => tl.toLowerCase().includes(lang.split(' ')[0]))
  );
  
  if (isAllLanguages) {
    return sites; // Mass targeting - no filter
  }
  
  // Filter by language for Web channel only
  return sites.filter(site => {
    const siteLanguages = (site.languages || []).map(l => l.toLowerCase());
    
    // OTT and Social: universal platforms, don't filter
    if (site.category === 'OTT' || site.category === 'Social') {
      return true;
    }
    
    // Web: filter by language
    const hasMatch = targetLanguages.some(targetLang => {
      const targetLower = targetLang.toLowerCase();
      return siteLanguages.some(siteLang => 
        siteLang.includes(targetLower) || siteLang.includes('multi')
      );
    });
    
    return hasMatch;
  });
};
```

**Impact**: More culturally relevant publisher recommendations

---

### Phase 3: Budget Intelligence (Medium Priority)

#### 3.1 Budget Tier Validation

**Problem**: AI Wizard doesn't enforce tier-appropriate buying types and platform limits.

**Solution**: Implement tier strategy from BuildPlanWizard

```javascript
// NEW: Determine budget tier and constraints
const determineBudgetTier = (budget) => {
  let tier = 'low';
  let strategy = {};
  
  if (budget <= 100000) {
    tier = 'low';
    strategy = {
      name: 'Focused Concentration',
      maxPlatforms: 3,
      buyingTypes: ['Direct'],
      audienceLimit: 2,
      channelMix: { primary: 0.60, secondary: 0.30, tertiary: 0.10 }
    };
  } else if (budget <= 200000) {
    tier = 'mid';
    strategy = {
      name: 'Balanced Multi-Channel',
      maxPlatforms: 5,
      buyingTypes: ['Direct', 'PD'],
      audienceLimit: 4,
      channelMix: { primary: 0.40, secondary: 0.30, tertiary: 0.20, quaternary: 0.10 }
    };
  } else {
    tier = 'high';
    strategy = {
      name: 'Premium Diversification',
      maxPlatforms: 6,
      buyingTypes: ['Direct', 'PD', 'PG'],
      audienceLimit: 6,
      channelMix: { primary: 0.35, secondary: 0.25, tertiary: 0.20, quaternary: 0.12, quinary: 0.08 }
    };
  }
  
  return { tier, strategy };
};

// NEW: Validate platform mix matches tier
const validateTierCompliance = (lineItems, tier, strategy) => {
  const uniquePillars = new Set(lineItems.map(item => item.pillar));
  const hasPD = lineItems.some(item => item.buyType === 'PD');
  const hasPG = lineItems.some(item => item.buyType === 'PG');
  
  const warnings = [];
  
  if (tier === 'high' && !hasPD) {
    warnings.push('⚠️ High budget should include PD buying type for efficiency');
  }
  
  if (tier === 'low' && (hasPD || hasPG)) {
    warnings.push('⚠️ Low budget should not include PD/PG - stick to Direct for simplicity');
  }
  
  if (lineItems.length > strategy.maxPlatforms) {
    warnings.push(`⚠️ Platform count (${lineItems.length}) exceeds tier limit (${strategy.maxPlatforms})`);
  }
  
  if (uniquePillars.size < 2) {
    warnings.push('⚠️ Lack of channel diversification');
  }
  
  return warnings;
};
```

**Impact**: More strategic, tier-appropriate media plans

---

#### 3.2 100% Loading Calculation

**Problem**: AI Wizard doesn't account for non-optimized channel loading.

**Solution**: Implement loading calculation for non-optimized channels

```javascript
// NEW: Apply loading to non-optimized channels
const applyChannelLoading = (lineItems, optimizedGroups) => {
  return lineItems.map(item => {
    const channelCategory = getChannelCategory(item);
    const isOptimized = optimizedGroups.includes(channelCategory);
    const shouldHaveLoading = !isOptimized; // Apply loading if NOT optimized
    
    if (shouldHaveLoading) {
      // Store base values before applying loading
      const baseCpm = item.cpm;
      const baseBudget = item.budget;
      
      // Apply 100% loading: double CPM and budget
      const newCpm = baseCpm * 2;
      const newBudget = baseBudget * 2;
      const newImpressions = Math.round((newBudget / newCpm) * 1000);
      
      console.log(`🔄 Loading APPLIED for ${item.platform}: CPM ${baseCpm} → ${newCpm}, Budget RM ${baseBudget.toLocaleString()} → RM ${newBudget.toLocaleString()}`);
      
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
    
    return { ...item, hasLoading: false };
  });
};

const getChannelCategory = (lineItem) => {
  const nameLower = lineItem.platform.toLowerCase();
  
  if (nameLower.includes('ott') || nameLower.includes('video')) return 'OTT';
  if (nameLower.includes('social')) return 'Social';
  return 'Web';
};
```

**Impact**: More accurate budget allocation and cost transparency

---

### Phase 4: Geographic Intelligence (Medium Priority)

#### 4.1 Geo-Aware Audience Selection

**Problem**: AI Wizard doesn't prioritize audiences by geographic relevance.

**Solution**: Implement `scoreAudienceByGeo()` from BuildPlanWizard

```javascript
// NEW: Score audiences by geographic relevance
const scoreAudienceByGeo = (audience, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0) return 1.0;
  if (targetGeography.includes('Malaysia')) return 1.0; // Nationwide
  
  // Sum audience size in target states
  let targetStateReach = 0;
  let totalReach = audience.totalAudience;
  
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

// NEW: Calculate geographic relevance percentage
const calculateGeoRelevance = (audience, targetGeography) => {
  const score = scoreAudienceByGeo(audience, targetGeography);
  return Math.round(score * 100); // Return as percentage
};
```

**Impact**: Better audience targeting for regional campaigns

---

#### 4.2 Regional Site Prioritization

**Problem**: Recommends national publishers for localized campaigns.

**Solution**: Detect and prioritize regional sites

```javascript
// NEW: Detect if site serves specific region
const detectRegionalSite = (site, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0) return false;
  if (targetGeography.includes('Malaysia')) return false; // Nationwide
  
  const siteName = (site.name || '').toLowerCase();
  
  // Regional publisher keywords
  const regionalKeywords = {
    'Penang': ['penang', 'pulau pinang', 'kwong wah'],
    'Johor': ['johor', 'jb', 'singaporeans'],
    'Sabah': ['sabah', 'daily express', 'borneo'],
    'Sarawak': ['sarawak', 'borneo post', 'utusan borneo'],
    'Kelantan': ['kelantan', 'kota bharu'],
    'Terengganu': ['terengganu', 'kuala terengganu']
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

// NEW: Score sites by geographic fit
const scoreSiteByGeo = (site, targetGeography) => {
  if (!targetGeography || targetGeography.length === 0) return 1.0;
  if (targetGeography.includes('Malaysia')) return 1.0;
  
  // Regional sites get 2x score
  if (detectRegionalSite(site, targetGeography)) {
    return 2.0;
  }
  
  // National sites still viable but lower priority
  return 0.5;
};
```

**Impact**: More geographically relevant publisher recommendations

---

### Phase 5: User Experience (Low Priority)

#### 5.1 Visual Plan Summary

**Problem**: AI Wizard shows text-only recommendations; BuildPlanWizard has visual summary component.

**Solution**: Create `<AIPlanSummary>` component with charts

```javascript
// NEW: Visual summary component
const AIPlanSummary = ({ plan }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Budget Breakdown Chart */}
      <div className="mb-6">
        <h3 className="font-bold mb-4">Budget Allocation</h3>
        {plan.lineItems.map(item => (
          <div key={item.platform} className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{item.platform}</span>
              <span>RM {item.budget.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(item.budget / plan.summary.totalBudget) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">
            {(plan.summary.totalImpressions / 1000000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Impressions</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            RM {plan.summary.avgCPM.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Avg CPM</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">
            {plan.lineItems.length}
          </div>
          <div className="text-sm text-gray-600">Platforms</div>
        </div>
      </div>
      
      {/* Audiences */}
      <div className="mb-6">
        <h3 className="font-bold mb-2">Target Audiences</h3>
        <div className="flex flex-wrap gap-2">
          {plan.audiences.map(audience => (
            <span 
              key={audience.persona} 
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {audience.persona}
              {audience.geoRelevance && ` (${audience.geoRelevance}% geo-match)`}
            </span>
          ))}
        </div>
      </div>
      
      {/* Inventory Validation Badge */}
      {plan.inventoryValidation && !plan.inventoryValidation.valid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div>
              <div className="font-semibold text-yellow-800">Inventory Alert</div>
              <div className="text-sm text-yellow-700">{plan.inventoryValidation.message}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Impact**: Better comprehension of recommended plan

---

#### 5.2 Real-Time Brief Panel

**Problem**: Users can't see extracted brief in real-time.

**Solution**: Add collapsible brief panel (already exists in AIWizard)

✅ Already implemented via `<CampaignBriefPanel>` component

---

## Implementation Priority

### 🔴 Critical (Week 1)
1. Inventory Validation System (prevents overbooking)
2. Format-Site Compatibility Filtering (prevents invalid recommendations)
3. Budget Tier Strategy (ensures strategic plans)

### 🟡 Important (Week 2)
4. Audience Overlap Calculation (accurate reach estimates)
5. Language-Based Web Filtering (cultural relevance)
6. 100% Loading Calculation (cost transparency)

### 🟢 Nice-to-Have (Week 3)
7. Geo-Aware Audience Selection (regional optimization)
8. Regional Site Prioritization (local relevance)
9. Visual Plan Summary Component (UX improvement)

---

## Success Metrics

1. **Accuracy**: Recommended budgets match actual inventory capacity
2. **Relevance**: Recommended sites support selected formats
3. **Strategic Fit**: Platform mix matches budget tier
4. **Reach Accuracy**: Estimated reach accounts for persona overlap
5. **User Satisfaction**: Fewer "why did you recommend this?" questions

---

## Technical Debt

### Current Limitations in AIWizard

1. **No state-level audience data** - Uses national totals only
2. **No format inventory mapping** - Can't validate capacity
3. **No site format compatibility check** - May recommend incompatible channels
4. **Simple audience summing** - Overestimates unique reach
5. **No tier-based validation** - Doesn't enforce strategic constraints

### Proposed Solutions

All addressed in Phases 1-4 above.

---

## Testing Plan

### Unit Tests

```javascript
describe('Inventory Validation', () => {
  test('should warn when budget exceeds available inventory', () => {
    const formats = [{ name: 'Leaderboard', inventory: 1000000 }];
    const budget = 500000; // Would need 100M impressions at RM5 CPM
    const result = validateInventoryCapacity(formats, budget, []);
    expect(result.valid).toBe(false);
  });
});

describe('Audience Overlap', () => {
  test('should calculate overlap between Entertainment personas', () => {
    const overlap = getOverlapFactor('Comedy Lover', 'Horror');
    expect(overlap).toBe(0.75); // Same category
  });
  
  test('should calculate unique reach for 3 personas', () => {
    const personas = ['Comedy Lover', 'Sports Fan', 'Foodies'];
    const reach = calculateUniqueReach(personas, mockAudienceData);
    expect(reach).toBeLessThan(
      personas.reduce((sum, p) => sum + mockAudienceData.find(a => a.persona === p).totalAudience, 0)
    ); // Should be less than simple sum
  });
});

describe('Format-Site Compatibility', () => {
  test('should only show OTT for streaming video formats', () => {
    const formats = [{ name: 'In-stream Video', type: 'video' }];
    const sites = getCompatibleSites(formats, mockSitesData);
    expect(sites).toHaveProperty('OTT');
    expect(sites).not.toHaveProperty('Social'); // Not social video
  });
  
  test('should only show Social for social formats', () => {
    const formats = [{ name: 'Image Social Ad', type: 'static image' }];
    const sites = getCompatibleSites(formats, mockSitesData);
    expect(sites).toHaveProperty('Social');
    expect(sites).not.toHaveProperty('OTT'); // Social video ≠ OTT
  });
});

describe('Budget Tier Strategy', () => {
  test('should limit low-tier to 3 platforms', () => {
    const { strategy } = determineBudgetTier(50000);
    expect(strategy.maxPlatforms).toBe(3);
    expect(strategy.buyingTypes).toEqual(['Direct']);
  });
  
  test('should allow PD for mid-tier', () => {
    const { strategy } = determineBudgetTier(150000);
    expect(strategy.buyingTypes).toContain('PD');
  });
});
```

---

## Migration Strategy

### Backward Compatibility

✅ All new features are **additive** - no breaking changes to existing AIWizard API

### Deployment Plan

1. **Feature Flag**: Deploy behind `ENABLE_ADVANCED_VALIDATION` flag
2. **A/B Test**: Compare plan quality between old and new logic
3. **Gradual Rollout**: Enable for internal users first
4. **Monitor**: Track success metrics
5. **Full Release**: Enable for all users

---

## Conclusion

By incorporating these enhancements from BuildPlanWizard, the AI Campaign Wizard will provide:

✅ **More Accurate Plans**: Validated against real inventory data  
✅ **Better Targeting**: Geo-aware audiences and sites  
✅ **Strategic Rigor**: Budget-tier-appropriate platform mixes  
✅ **Cultural Relevance**: Language-matched publishers  
✅ **Cost Transparency**: Loading calculations for non-optimized channels

The conversational UX remains intact while the underlying planning logic becomes significantly more sophisticated.

---

**Next Steps**: Begin Phase 1 implementation (Inventory Validation System)
