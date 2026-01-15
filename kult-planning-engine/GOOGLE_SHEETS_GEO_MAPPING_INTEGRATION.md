# Google Sheets Geo Mapping Integration - Implementation Guide

**Date**: 2025-12-06  
**Status**: READY FOR IMPLEMENTATION  
**Google Sheet URL**: https://docs.google.com/spreadsheets/d/1DlzmYDejtZGvhI8xDXZju13QHefIY8kcT2i93r3baLg/edit#gid=0

---

## 📋 Overview

This document describes how to integrate the Google Sheets-based geography mapping system as the **single source of truth** for Malaysian geography classification in the AI Wizard.

---

## 🗺️ Google Sheet Structure

The sheet contains **13 region definitions** (rows 2-14) with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| **Region Group** | Human-readable grouping | "Central Region", "East Malaysia" |
| **Standard Region Name** | Normalized label | "Central", "East Malaysia" |
| **Included States** | Semicolon-separated states | "KL; Selangor; Putrajaya" |
| **Alternative Keywords** | Semicolon-separated synonyms | "Klang Valley; KV; Greater KL" |
| **Industry Targeting Notes** | Planner guidance | "Highest ADEX & conversions" |
| **AI Mapping Tag** | Internal ID | `central`, `east_malaysia`, `klang_valley` |

###  Defined Regions

1. **Peninsular Malaysia** (`peninsular`) - All Peninsular states
2. **East Malaysia** (`east_malaysia`) - Sabah, Sarawak, Labuan
3. **Central Region** (`central`) - KL, Selangor, Putrajaya
4. **Northern Region** (`northern`) - Penang, Kedah, Perlis, Perak
5. **Southern Region** (`southern`) - Johor, Melaka, Negeri Sembilan
6. **East Coast Region** (`east_coast`) - Kelantan, Terengganu, Pahang
7. **West Coast Region** (`west_coast`) - Penang, Perak, Selangor, KL, Melaka, Johor
8. **Klang Valley Market Cluster** (`klang_valley`) - KL, Selangor
9. **Borneo Market** (`borneo`) - Sabah, Sarawak
10. **University Belt** (`youth_belt`) - KL, Selangor, Penang, Johor
11. **Industrial Belt** (`industrial_belt`) - Selangor, Penang, Johor
12. **Muslim Majority Belt** (`muslim_belt`) - Kelantan, Terengganu, Kedah, Perlis
13. **Affluent Belt** (`affluent_belt`) - KL, Selangor, Penang

---

## 🏗️ Implementation Architecture

### Phase 1: Backend API Endpoint (Python/Flask)

Create `/api/geo-mapping` endpoint that:
1. Fetches Google Sheet data at runtime
2. Parses and structures the data
3. Caches for performance (TTL: 1 hour)
4. Returns structured geo mapping

**File**: `backend/server.py`

```python
import requests
from flask import Flask, jsonify
from functools import lru_cache
import time

# Google Sheet public CSV export URL
GEO_SHEET_URL = "https://docs.google.com/spreadsheets/d/1DlzmYDejtZGvhI8xDXZju13QHefIY8kcT2i93r3baLg/export?format=csv&gid=0"

# Cache for 1 hour
@lru_cache(maxsize=1)
def load_geo_mapping_cached(timestamp):
    """Load and parse geo mapping from Google Sheet"""
    try:
        response = requests.get(GEO_SHEET_URL, timeout=10)
        response.raise_for_status()
        
        # Parse CSV
        lines = response.text.strip().split('\n')
        headers = lines[0].split(',')
        
        geo_regions = []
        for line in lines[1:]:  # Skip header
            if not line.strip():
                continue
            
            parts = line.split(',')
            if len(parts) < 6:
                continue
            
            region = {
                'region_group': parts[0].strip(),
                'standard_name': parts[1].strip(),
                'included_states': [s.strip() for s in parts[2].split(';') if s.strip()],
                'alternative_keywords': [k.strip() for k in parts[3].split(';') if k.strip()],
                'targeting_notes': parts[4].strip(),
                'ai_mapping_tag': parts[5].strip()
            }
            geo_regions.append(region)
        
        return geo_regions
    except Exception as e:
        print(f"Error loading geo mapping: {e}")
        return []

@app.route('/api/geo-mapping', methods=['GET'])
def get_geo_mapping():
    """API endpoint to get geo mapping data"""
    # Cache key rotates every hour
    cache_key = int(time.time() / 3600)
    geo_data = load_geo_mapping_cached(cache_key)
    
    return jsonify({
        'success': True,
        'data': geo_data,
        'count': len(geo_data),
        'source': 'Google Sheets',
        'cached_until': (cache_key + 1) * 3600
    })
```

### Phase 2: Frontend Integration

**File**: `frontend/src/pages/AIWizard.jsx`

#### 2.1: Load Geo Mapping on Init

```javascript
const [geoMapping, setGeoMapping] = useState([]);

useEffect(() => {
  loadGeoMapping();
}, []);

const loadGeoMapping = async () => {
  try {
    const response = await axios.get('/api/geo-mapping');
    console.log('🗺️ Geo mapping loaded:', response.data.count, 'regions');
    setGeoMapping(response.data.data);
  } catch (error) {
    console.error('❌ Error loading geo mapping:', error);
    // Fallback to hardcoded if sheet unavailable
  }
};
```

#### 2.2: Geography Resolution Function

```javascript
/**
 * Resolve user geography input to states using Google Sheet mapping
 * @param {string} userInput - Raw user input (e.g., "Klang Valley", "East Malaysia", "nationwide")
 * @param {Array} geoMapping - Loaded geo mapping data
 * @returns {Object} - Resolved geography with tags, states, and explanation
 */
const resolveGeography = (userInput, geoMapping) => {
  const lower = userInput.toLowerCase();
  const result = {
    geo_raw_user_input: userInput,
    geo_mapping_tags: [],
    geo_states_resolved: [],
    geo_scope_type: '',
    geo_explanation: ''
  };
  
  // 1. Nationwide detection
  if (lower.match(/nationwide|all malaysia|whole malaysia|entire malaysia|seluruh malaysia/i)) {
    // Include all states from both Peninsular and East Malaysia
    const peninsular = geoMapping.find(r => r.ai_mapping_tag === 'peninsular');
    const eastMalaysia = geoMapping.find(r => r.ai_mapping_tag === 'east_malaysia');
    
    if (peninsular && eastMalaysia) {
      result.geo_mapping_tags = ['peninsular', 'east_malaysia'];
      result.geo_states_resolved = [
        ...peninsular.included_states,
        ...eastMalaysia.included_states
      ];
      result.geo_scope_type = 'nationwide';
      result.geo_explanation = 'Targeting all of Malaysia (Peninsular + East Malaysia)';
      return result;
    }
  }
  
  // 2. Keyword/phrase matching
  const matchedRegions = [];
  
  for (const region of geoMapping) {
    // Check alternative keywords
    const keywordMatch = region.alternative_keywords.some(keyword => 
      lower.includes(keyword.toLowerCase())
    );
    
    // Check region group and standard name
    const nameMatch = lower.includes(region.region_group.toLowerCase()) ||
                     lower.includes(region.standard_name.toLowerCase());
    
    // Check individual state mentions
    const stateMatch = region.included_states.some(state =>
      lower.includes(state.toLowerCase())
    );
    
    if (keywordMatch || nameMatch || stateMatch) {
      matchedRegions.push(region);
    }
  }
  
  // 3. Deduplicate and merge states
  const allTags = new Set();
  const allStates = new Set();
  
  for (const region of matchedRegions) {
    allTags.add(region.ai_mapping_tag);
    region.included_states.forEach(state => allStates.add(state));
  }
  
  result.geo_mapping_tags = Array.from(allTags);
  result.geo_states_resolved = Array.from(allStates);
  
  // 4. Determine scope type
  if (allTags.has('peninsular') && !allTags.has('east_malaysia')) {
    result.geo_scope_type = 'peninsular_only';
  } else if (allTags.has('east_malaysia') && !allTags.has('peninsular')) {
    result.geo_scope_type = 'east_malaysia_only';
  } else if (allTags.has('klang_valley')) {
    result.geo_scope_type = 'klang_valley_focus';
  } else {
    result.geo_scope_type = 'partial';
  }
  
  // 5. Build explanation
  const regionNames = matchedRegions.map(r => r.standard_name);
  result.geo_explanation = `Targeting ${regionNames.join(' + ')} (${result.geo_states_resolved.length} states: ${result.geo_states_resolved.slice(0, 3).join(', ')}${result.geo_states_resolved.length > 3 ? '...' : ''})`;
  
  return result;
};
```

#### 2.3: Update Geography Question Handler

Replace hardcoded geography logic with Google Sheet-based resolution:

```javascript
// OLD CODE (Hardcoded):
if (lower.match(/nationwide|national/i)) {
  newBrief.geography = ['Malaysia'];
} else if (lower.match(/klang valley|kv/i)) {
  newBrief.geography = ['Selangor', 'Kuala Lumpur'];
} // ... more hardcoded logic

// NEW CODE (Google Sheet-based):
const geoResolution = resolveGeography(userMessage, geoMapping);

if (geoResolution.geo_states_resolved.length > 0) {
  newBrief.geography = geoResolution.geo_states_resolved;
  newBrief._geo_mapping_tags = geoResolution.geo_mapping_tags;
  newBrief._geo_scope_type = geoResolution.geo_scope_type;
  newBrief._geo_explanation = geoResolution.geo_explanation;
  
  console.log('🗺️ Geography resolved:', geoResolution);
  setBrief(newBrief);
}
```

---

## 🎯 User Input Examples & Expected Output

| User Input | Matched Tags | Resolved States | Explanation |
|------------|--------------|-----------------|-------------|
| "nationwide" | `peninsular`, `east_malaysia` | All 13 states | Targeting all of Malaysia |
| "Klang Valley" | `klang_valley`, `central` | KL, Selangor | Targeting Klang Valley (2 states) |
| "East Malaysia" | `east_malaysia`, `borneo` | Sabah, Sarawak, Labuan | Targeting East Malaysia (3 states) |
| "KV and Johor" | `klang_valley`, `southern` | KL, Selangor, Johor | Targeting Klang Valley + Southern (3 states) |
| "Penang region" | `northern` | Penang, Kedah, Perlis, Perak | Targeting Northern Region (4 states) |
| "East Coast" | `east_coast` | Kelantan, Terengganu, Pahang | Targeting East Coast (3 states) |
| "Borneo" | `east_malaysia`, `borneo` | Sabah, Sarawak | Targeting Borneo (2 states) |
| "just Peninsular" | `peninsular` | 10 Peninsular states | Targeting Peninsular Malaysia only |

---

## 🔄 Migration Plan

### Step 1: Add Backend Endpoint (30 min)
- Add geo mapping endpoint to `backend/server.py`
- Test endpoint returns correct data
- Verify caching works

### Step 2: Update Frontend Loading (15 min)
- Add `geoMapping` state
- Load on component mount
- Handle loading errors gracefully

### Step 3: Replace Hardcoded Logic (1 hour)
- Create `resolveGeography()` function
- Replace all hardcoded geography checks
- Update geography question handler
- Update geography processing logic

### Step 4: Testing (30 min)
- Test all example inputs
- Verify state resolution
- Check explanation accuracy
- Test edge cases (typos, ambiguous input)

### Step 5: Documentation (15 min)
- Add console logging
- Update CLAUDE.md
- Document new geography flow

**Total Estimated Time**: 2.5 hours

---

## ✅ Benefits

1. **Single Source of Truth**: All geo logic comes from one Google Sheet
2. **Easy Updates**: Change sheet, no code deployment needed
3. **Flexible Matching**: Supports natural language, keywords, and state names
4. **Industry Context**: Targeting notes inform strategy
5. **Scalable**: Easy to add new regions or update state mappings
6. **Transparent**: Clear explanation of what was matched
7. **Cacheable**: Performance-optimized with 1-hour TTL

---

## 🚨 Important Notes

1. **Always load from sheet** - Never hardcode states or regions
2. **Generous matching** - Accept typos and variants
3. **Explicit explanations** - Always tell user what was inferred
4. **Fallback gracefully** - If sheet unavailable, use cached/default
5. **Log thoroughly** - Console log all matching for debugging

---

## 📝 Next Steps

1. **Implement backend endpoint** (`/api/geo-mapping`)
2. **Add frontend loading** (useEffect hook)
3. **Create resolution function** (`resolveGeography`)
4. **Replace hardcoded logic** (geography question handler)
5. **Test thoroughly** (all user input variations)
6. **Update plan display** (show geo explanation in assumptions)
7. **Commit changes** (with descriptive message)

---

## 🎊 Status

- ✅ **Google Sheet Created**: 13 regions defined
- ✅ **Structure Validated**: All required columns present
- ✅ **Documentation Complete**: This guide
- ⏳ **Backend Endpoint**: Ready for implementation
- ⏳ **Frontend Integration**: Ready for implementation
- ⏳ **Testing**: Pending implementation

**Ready for development!** 🚀
