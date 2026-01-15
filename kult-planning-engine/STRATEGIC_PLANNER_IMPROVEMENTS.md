# Strategic Planner Improvements - Implementation Plan

## Overview
This document outlines the strategic improvements to the AI Wizard media planner to behave like a real strategist, not just a generic DSP.

## Problems Identified

### 1. Industry Playbook Wiring
**Current Issue:**
- System logs "⚠️ No playbook found, using generic selection"
- Then claims "✅ PLAYBOOK DIFFERENTIATION: Beauty & Cosmetics" 
- Formats selected are generic (In-stream Video, Leaderboard, Interstitial)
- Misleading logs about what playbook is actually used

**Root Cause:**
- Industry key mismatch: "Beauty & Cosmetics" vs "beauty" vs "beauty_cosmetics"
- No clear separation between industry-specific and generic fallback
- Silent fallback to generic without proper logging

### 2. Persona Selection Too Loose
**Current Issue:**
- When no persona mapping found, falls back to "top audiences by reach"
- Beauty campaigns get: "Entertaiment", "Active Lifestyle Seekers", "Badminton", "Romantic Comedy"
- Strategically wrong for category-fit critical industries

**Root Cause:**
- No industry_tags filtering in audience dataset
- Immediate fallback to reach without industry whitelist
- No special handling for critical-fit categories (Beauty, Finance, Luxury)

### 3. Channel Preference Not Enforced
**Current Issue:**
- User selects "OTT/Streaming focus"
- Final mix: KULT: Social, KULT: Display, KULT: Display, KULT: Display, KULT: Stream
- OTT is only 1 of 5 channels, not prioritized

**Root Cause:**
- Format filtering exists but budget allocation doesn't enforce channel share
- No min/max share constraints per channel type
- No post-allocation validation

### 4. Geography Not Used Beyond Text
**Current Issue:**
- Geography correctly extracted: ['Sabah', 'Sarawak']
- But personas chosen purely by total reach
- Sites chosen by total traffic, not regional relevance
- East Malaysia plan looks identical to national plan

**Root Cause:**
- Audience dataset has state columns but they're not used for scoring
- No geo-weighted relevance calculation
- No regional differentiation in persona/site selection

## Solutions Design

### 1. Fix Industry Playbook Wiring

**Implementation:**
```javascript
// NEW: Robust playbook lookup
function getIndustryPlaybook(industryKey) {
  // Normalize the industry key
  const normalized = normalizeIndustryKey(industryKey);
  
  // Try direct lookup
  if (verticalPlaybook.vertical_playbook?.[normalized]) {
    return {
      config: verticalPlaybook.vertical_playbook[normalized],
      source: 'industry',
      key: normalized
    };
  }
  
  // Try alias matching
  const aliases = INDUSTRY_KEY_ALIASES[normalized];
  if (aliases) {
    for (const alias of aliases) {
      if (verticalPlaybook.vertical_playbook?.[alias]) {
        return {
          config: verticalPlaybook.vertical_playbook[alias],
          source: 'industry',
          key: alias
        };
      }
    }
  }
  
  // No industry-specific found
  return null;
}

function getGenericPlaybook() {
  return {
    config: GENERIC_FALLBACK_CONFIG,
    source: 'generic',
    key: 'generic'
  };
}
```

**Key Changes:**
- Clear separation: `getIndustryPlaybook()` returns `null` if not found
- Explicit fallback: `getGenericPlaybook()` used only when needed
- Normalized keys with alias mapping
- `playbookSource` field tracks which was used
- Proper logging prevents misleading messages

**Industry Key Aliases:**
```javascript
const INDUSTRY_KEY_ALIASES = {
  'beauty_cosmetics': ['beauty', 'beauty_&_cosmetics'],
  'automotive': ['automotive_ice', 'automotive_ev'],
  'property': ['property_luxury', 'property_mid_range', 'property_affordable'],
  // ... more aliases
};
```

### 2. Tighten Persona Selection Logic

**Implementation:**
```javascript
function selectPersonasForIndustry(industry, geography, audienceLimit, datasets) {
  const industryKey = normalizeIndustryKey(industry);
  
  // Step 1: Get industry-specific persona mapping
  const personaMapping = verticalPlaybook.persona_mapping?.[industryKey];
  
  if (personaMapping && personaMapping.primary_personas.length > 0) {
    // Use playbook personas
    return selectFromPersonaMapping(personaMapping, geography, audienceLimit, datasets);
  }
  
  // Step 2: Check if this is a critical-fit industry
  const CRITICAL_FIT_INDUSTRIES = ['beauty', 'beauty_cosmetics', 'finance_insurance', 'automotive', 'property'];
  
  if (CRITICAL_FIT_INDUSTRIES.includes(industryKey)) {
    // Use curated fallback whitelist
    const whitelist = INDUSTRY_FALLBACK_PERSONAS[industryKey];
    console.log(`⚠️ Using fallback whitelist for critical industry: ${industry}`);
    return selectFromWhitelist(whitelist, geography, audienceLimit, datasets);
  }
  
  // Step 3: Only now fall back to top reach (with warning)
  console.log(`⚠️ Falling back to top reach audiences due to missing industry mapping`);
  return selectTopByReach(geography, audienceLimit, datasets);
}
```

**Fallback Whitelists:**
```javascript
const INDUSTRY_FALLBACK_PERSONAS = {
  'beauty': ['Fashion Icons', 'Young Working Adult', 'Youth Mom', 'Emerging Affluents'],
  'beauty_cosmetics': ['Fashion Icons', 'Young Working Adult', 'Youth Mom', 'Emerging Affluents'],
  'finance_insurance': ['Business & Professional', 'Emerging Affluents', 'Young Working Adult'],
  'automotive': ['Automotive Enthusiasts', 'Gadget Gurus', 'Emerging Affluents', 'Young Working Adult'],
  'property': ['Home Buyers', 'Emerging Affluents', 'Business & Professional', 'Family Dynamic']
};
```

**Geo-Aware Scoring:**
```javascript
function scoreAudienceByGeo(audience, geography) {
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
```

### 3. Enforce Channel Preference in Budget Allocation

**Implementation:**
```javascript
function enforceChannelPreference(lineItems, channelPref, totalBudget) {
  if (!channelPref || channelPref === 'Balanced') {
    return lineItems; // No enforcement needed
  }
  
  // Define channel constraints
  const CHANNEL_CONSTRAINTS = {
    'OTT': {
      minShare: 0.60,  // OTT must be >= 60%
      maxOtherShare: 0.30,  // Display <= 30%
      keywords: ['stream', 'video', 'ott', 'ctv', 'youtube']
    },
    'Social': {
      minShare: 0.60,  // Social must be >= 60%
      maxOtherShare: 0.30,  // Display <= 30%
      keywords: ['social', 'facebook', 'instagram', 'tiktok', 'meta']
    },
    'Display': {
      minShare: 0.60,  // Display must be >= 60%
      maxOtherShare: 0.30,  // Others <= 30%
      keywords: ['display', 'banner', 'native', 'programmatic']
    }
  };
  
  const constraint = CHANNEL_CONSTRAINTS[channelPref];
  if (!constraint) return lineItems;
  
  console.log(`🎯 Applying channel preference: ${channelPref} (min ${constraint.minShare * 100}%)`);
  
  // Calculate current shares
  const channelBudgets = calculateChannelShares(lineItems, constraint.keywords);
  const preferredShare = channelBudgets.preferred / totalBudget;
  
  console.log(`   Current ${channelPref} share: ${(preferredShare * 100).toFixed(1)}%`);
  
  if (preferredShare < constraint.minShare) {
    // Adjust allocation to meet minimum
    lineItems = rebalanceToMeetMinShare(lineItems, constraint, totalBudget);
    
    // Recalculate
    const newShares = calculateChannelShares(lineItems, constraint.keywords);
    const newShare = newShares.preferred / totalBudget;
    console.log(`   ✅ Adjusted ${channelPref} share: ${(newShare * 100).toFixed(1)}%`);
  } else {
    console.log(`   ✅ ${channelPref} share already meets minimum`);
  }
  
  return lineItems;
}
```

### 4. Geo-Aware Audience/Site Scoring

**Implementation:**
```javascript
// In audience selection
function selectAudiences(industry, geography, audienceLimit, datasets) {
  let audiences = datasets.audiences;
  
  // Apply persona filtering first (from playbook or fallback)
  audiences = filterByIndustryFit(audiences, industry);
  
  // Score by geography
  audiences = audiences.map(a => ({
    ...a,
    geoScore: scoreAudienceByGeo(a, geography),
    geoRelevance: calculateGeoRelevance(a, geography)
  }));
  
  // Sort by geo-weighted score
  audiences.sort((a, b) => b.geoScore - a.geoScore);
  
  console.log(`👥 Using geo-weighted audience scores for ${geography.join(', ')}`);
  
  return audiences.slice(0, audienceLimit);
}

// In site selection
function selectSites(geography, siteLimit, datasets) {
  let sites = datasets.sites;
  
  // For regional campaigns, prioritize regional sites
  if (geography && geography.length > 0 && !geography.includes('Malaysia')) {
    console.log(`🌐 Prioritizing sites for regional campaign: ${geography.join(', ')}`);
    
    // Score sites by geo relevance (future: use geo columns if available)
    sites = sites.map(s => ({
      ...s,
      geoScore: scoreSiteByGeo(s, geography),
      isRegional: detectRegionalSite(s, geography)
    }));
    
    // Sort: regional first, then by traffic
    sites.sort((a, b) => {
      if (a.isRegional !== b.isRegional) {
        return b.isRegional - a.isRegional;
      }
      return (b.monthlyTraffic || 0) - (a.monthlyTraffic || 0);
    });
    
    console.log(`   ${sites.filter(s => s.isRegional).length} regional sites prioritized`);
  } else {
    // National: sort by traffic
    sites.sort((a, b) => (b.monthlyTraffic || 0) - (a.monthlyTraffic || 0));
  }
  
  return sites.slice(0, siteLimit);
}
```

## Implementation Order

1. ✅ **Industry Playbook Wiring** - Foundation for all other improvements
2. ✅ **Persona Selection Logic** - Requires playbook wiring to be fixed first
3. ✅ **Geo-Aware Scoring** - Can be done alongside persona improvements
4. ✅ **Channel Preference Enforcement** - Final step, requires allocation logic
5. ✅ **Comprehensive Logging** - Throughout all changes

## Testing Scenarios

### Test 1: Beauty Campaign
**Input:** "launch new perfume"
- Budget: 150K
- Channel: Social Media focus
- Geography: Nationwide
- Duration: 1.5 months

**Expected:**
- ✅ Industry: Beauty & Cosmetics (playbook source: 'industry')
- ✅ Formats: Product Collector, Video in Banner, Hotspot, Mini Game (from Beauty playbook)
- ✅ Personas: Fashion Icons, Young Working Adult, Youth Mom (NOT Badminton, Entertaiment)
- ✅ Channel allocation: Social >= 60% of budget
- ✅ Clear logs showing playbook used and why

### Test 2: East Malaysia Campaign
**Input:** "launch new credit card in east malaysia"
- Budget: 200K
- Geography: Sabah, Sarawak
- Duration: 4 weeks

**Expected:**
- ✅ Geography: ['Sabah', 'Sarawak', 'Labuan']
- ✅ Personas scored by (Sabah + Sarawak + Labuan) columns, not total
- ✅ Sites: Regional East Malaysia sites prioritized
- ✅ Logs: "Using geo-weighted audience scores for Sabah, Sarawak, Labuan"

### Test 3: OTT Focus Campaign
**Input:** "promote new car"
- Budget: 250K
- Channel: OTT/Streaming focus
- Geography: Nationwide
- Duration: 2 months

**Expected:**
- ✅ Channel allocation: OTT/Stream >= 60% of budget
- ✅ Formats: Mostly video/streaming formats
- ✅ Logs: "Applying channel preference: OTT (min 60%)"
- ✅ Final validation: "OTT share: 65% ✅"

## Success Metrics

1. **Playbook Hit Rate:** 95%+ campaigns use industry-specific playbooks
2. **Persona Quality:** 0 "Badminton"/"Entertaiment" in Beauty campaigns
3. **Channel Compliance:** 100% of channel-preference campaigns meet min share
4. **Geo Differentiation:** East Malaysia plans visibly different from KV plans
5. **Log Clarity:** Every strategic decision has clear, non-misleading logs

---

**Status:** Ready for implementation  
**Priority:** HIGH - Core strategic improvements
**Estimated Effort:** 4-6 hours
