# 🚧 Logic Table Migration Status

**Created**: 2025-12-02  
**Status**: 🟡 IN PROGRESS - Backend Complete, Frontend Partial  
**Critical Issue**: AI Wizard still using wrong personas from old code

---

## ✅ What's Been Completed

### 1. **Backend Logic Table API** ✅ DONE

**File**: `backend/src/routes/logicTable.js` (283 lines)

**Endpoints Working:**
- ✅ `GET /api/logic-table` - Fetch all 17 industries
- ✅ `GET /api/logic-table/industry/:industry` - Get specific industry rules
- ✅ `POST /api/logic-table/validate-plan` - Validate plans
- ✅ `GET /api/logic-table/industries` - List industries

**Test URLs:**
```bash
# All rules
https://5001-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai/api/logic-table

# Automotive example
https://5001-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai/api/logic-table/industry/Automotive
```

**Data Structure:**
```json
{
  "industry": "Automotive",
  "objective": null,
  "personas": [
    "Automotive Enthusiasts",
    "Automotive Intent",
    "Gadget Gurus",
    "Emerging Affluents",
    "Young Working Adult"
  ],
  "key_formats": ["Product Collector Ad", "Data Capture", ...],
  "key_ips": [],
  "channels": ["OTT", "Sooka", "Stadium Astro", "Meta", "TikTok", "Display"],
  "kpis": ["CPL", "test drive bookings"],
  "watchouts": "do NOT use generic FMCG personas"
}
```

---

### 2. **AI Wizard Updates** 🟡 PARTIAL

**File**: `frontend/src/pages/AIWizard.jsx`

**Completed:**
- ✅ Removed hardcoded `verticalPlaybook.json` import
- ✅ Removed hardcoded `PERSONA_RULES` (215 lines deleted)
- ✅ Added `logicTable` state
- ✅ Added `loadLogicTable()` function
- ✅ Logic Table loads on mount
- ✅ Updated industry classification to use exact Logic Table names

**Console Output:**
```javascript
🚀 AI Wizard v3.0 - Logic Table Integration
🔄 Loading Logic Table from API...
✅ Logic Table loaded: 17 industries
📋 Industries: ["Automotive", "Property", "Finance / Insurance", ...]
📊 Sample (Automotive): { personas: [...], key_formats: [...] }
```

---

## ❌ What's Still Broken

### **CRITICAL: Persona Selection Logic**

The AI is **still using old persona matching logic** instead of Logic Table personas.

**Problem Location**: Lines ~1200-1800 in `AIWizard.jsx`

**Current (WRONG) Behavior:**
```javascript
// Line 1481: Still referencing old code
const verticalRules = PERSONA_RULES.verticals[audienceVerticalKey]; // ❌ DOESN'T EXIST ANYMORE

// Line 1478: Still using old playbook
const personaMapping = verticalPlaybook.persona_mapping?.[audienceVerticalKey]; // ❌ UNDEFINED

// Result: AI tries to match personas using old hardcoded rules that no longer exist
```

**What Happens:**
1. User says: "launch new SUV, test drive campaign, RM 200k"
2. AI correctly identifies industry as "Automotive"
3. AI loads Logic Table with correct Astro personas
4. **BUT** AI still tries to use old `PERSONA_RULES.verticals.automotive` ❌
5. Since PERSONA_RULES was deleted, it falls back to generic matching
6. Wrong personas are selected (not from Logic Table)

---

## 🔧 What Needs to Be Fixed

### **Fix 1: Update Persona Selection** (CRITICAL)

**Location**: `AIWizard.jsx` lines 1200-1800

**Current Code (BROKEN):**
```javascript
// Line ~1478
const personaMapping = verticalPlaybook.persona_mapping?.[audienceVerticalKey];

// Line ~1481  
const verticalRules = PERSONA_RULES.verticals[audienceVerticalKey];

if (verticalRules) {
  // This code path is now DEAD - PERSONA_RULES doesn't exist
  // ...
}
```

**Required Fix:**
```javascript
// Use Logic Table instead
const getIndustryRules = (industry) => {
  if (!logicTable) return null;
  
  // Find matching industry (case-insensitive)
  const rules = logicTable.find(rule => 
    rule.industry.toLowerCase() === industry.toLowerCase()
  );
  
  return rules;
};

// In persona selection:
const industryRules = getIndustryRules(industry);

if (industryRules) {
  // Match available audiences to Logic Table personas
  const validPersonas = industryRules.personas; // Exact Astro persona names
  
  selectedAudiences = currentDatasets.audiences.filter(a => {
    const personaName = (a.persona || a.name || '').toLowerCase();
    
    // Check if audience matches ANY Logic Table persona (flexible matching)
    return validPersonas.some(validPersona => {
      const validLower = validPersona.toLowerCase();
      // Match if audience name contains any word from valid persona
      const validWords = validLower.split(/\s+/);
      return validWords.some(word => personaName.includes(word));
    });
  });
  
  // Limit to budget tier
  selectedAudiences = selectedAudiences.slice(0, tierStrategy.audienceLimit);
}
```

---

### **Fix 2: Remove All verticalPlaybook References**

**Locations to Update:**

```bash
# Find all references
cd /home/user/webapp/frontend/src/pages
grep -n "verticalPlaybook" AIWizard.jsx

# Results:
# Line 428: const playbooks = verticalPlaybook.vertical_playbook;
# Line 446: const playbooks = verticalPlaybook.vertical_playbook;
# Line 694: const config = verticalPlaybook.vertical_playbook[verticalKey];
# Line 1478: const personaMapping = verticalPlaybook.persona_mapping?.[audienceVerticalKey];
# Line 1647: const personaMapping = verticalPlaybook.persona_mapping?.[audienceVerticalKey];
# Line 3093: const benchmarks = verticalPlaybook.performance_benchmarks?.[benchmarkVerticalKey];
# Line 3113: const personaModifiers = verticalPlaybook.persona_performance_modifiers;
```

**Required Changes:**

**Line 428, 446** (findVerticalFromText):
```javascript
// OLD:
const playbooks = verticalPlaybook.vertical_playbook;

// NEW:
if (!logicTable) return null;
const industries = logicTable.map(rule => rule.industry);
```

**Line 694** (getVerticalConfig):
```javascript
// OLD:
const config = verticalPlaybook.vertical_playbook[verticalKey];

// NEW:
const config = logicTable.find(rule => rule.industry === industryLabel);
```

**Lines 1478, 1647** (persona mapping):
```javascript
// OLD:
const personaMapping = verticalPlaybook.persona_mapping?.[audienceVerticalKey];

// NEW:
const industryRules = logicTable.find(rule => 
  rule.industry.toLowerCase() === industry.toLowerCase()
);
const validPersonas = industryRules?.personas || [];
```

**Lines 3093, 3113** (benchmarks):
```javascript
// OLD:
const benchmarks = verticalPlaybook.performance_benchmarks?.[benchmarkVerticalKey];

// NEW:
// Remove benchmarks feature or fetch from separate endpoint
// Logic Table doesn't contain performance benchmarks
```

---

### **Fix 3: Add Plan Validation Before Presentation**

**Location**: End of `generateMediaPlan()` function

**Add Before Returning Plan:**
```javascript
// After generating plan, before returning to user
const validatePlan = async (plan) => {
  try {
    const response = await axios.post('/api/logic-table/validate-plan', {
      industry: plan.industry,
      personas: plan.audiences.map(a => a.persona),
      formats: plan.formats.map(f => f.name || f['Ad format']),
      channels: plan.platforms.map(p => p.pillar),
      kpis: plan.kpis || []
    });
    
    if (!response.data.valid) {
      console.error('❌ Plan validation failed:', response.data.errors);
      
      // Log warnings but don't block (for now)
      console.warn('⚠️ Plan has validation issues but proceeding');
      console.warn('Errors:', response.data.errors);
      console.warn('Warnings:', response.data.warnings);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Validation error:', error);
    return { valid: false, errors: [error.message] };
  }
};

// Before returning plan:
const validation = await validatePlan(generatedPlan);
generatedPlan._validation = validation;
```

---

### **Fix 4: Show Watchouts in Plan**

**Location**: Plan presentation/rendering

**Add to Plan Display:**
```javascript
// After showing personas, formats, channels
if (industryRules?.watchouts) {
  planText += `\n\n⚠️ **WATCHOUT**: ${industryRules.watchouts}\n`;
}
```

**Example Output:**
```
✅ Selected Personas:
- Automotive Enthusiasts (high automotive affinity)
- Automotive Intent (active research behavior)

⚠️ WATCHOUT: do NOT use generic FMCG personas

✅ Channels: OTT, Meta, Display
✅ Primary KPIs: CPL, test drive bookings
```

---

## 📋 Complete Migration Checklist

### Backend ✅
- [x] Create Logic Table API endpoint
- [x] Fetch from Google Sheets
- [x] Parse and transform data
- [x] Add validation endpoint
- [x] Test all endpoints
- [x] Add to demo-server.js

### Frontend 🟡
- [x] Remove hardcoded PERSONA_RULES
- [x] Remove verticalPlaybook.json import
- [x] Add logicTable state
- [x] Add loadLogicTable() function
- [x] Update industry classification
- [ ] **FIX persona selection** (CRITICAL)
- [ ] Remove all verticalPlaybook references
- [ ] Add plan validation
- [ ] Show watchouts in plans
- [ ] Use exact Astro persona names
- [ ] Test with all 17 industries

### Documentation ✅
- [x] API documentation (LOGIC_TABLE_INTEGRATION.md)
- [x] Migration status (this file)
- [x] Training guides

---

## 🚀 How to Complete the Migration

### Step 1: Fix Persona Selection (30 min)

**File**: `frontend/src/pages/AIWizard.jsx`

**Search for**: `const verticalRules = PERSONA_RULES`  
**Replace with**: Logic Table lookup (see Fix 1 above)

**Search for**: `const personaMapping = verticalPlaybook`  
**Replace with**: Logic Table lookup (see Fix 1 above)

### Step 2: Remove All verticalPlaybook References (20 min)

**Command**:
```bash
cd /home/user/webapp/frontend/src/pages
grep -n "verticalPlaybook" AIWizard.jsx
```

Replace each reference with Logic Table equivalent (see Fix 2 above)

### Step 3: Add Validation (10 min)

Add validation call before returning plan (see Fix 3 above)

### Step 4: Test (15 min)

```bash
# Test Automotive
Input: "launch new SUV, test drive campaign, RM 200k"
Expected Personas: Automotive Enthusiasts, Automotive Intent, Gadget Gurus, Emerging Affluents, Young Working Adult

# Test FMCG
Input: "new oat milk, health-conscious, RM 100k"
Expected Personas: Foodies, Health & Wellness Shoppers, Youth Mom, Family Dynamic

# Test Beauty
Input: "premium skincare, young women, RM 150k"
Expected Personas: Fashion Icons, Young Working Adult, Youth Mom
```

### Step 5: Commit and Deploy

```bash
git add frontend/src/pages/AIWizard.jsx
git commit -m "fix: Complete Logic Table integration in AI Wizard

- Replace all PERSONA_RULES references with Logic Table
- Replace all verticalPlaybook references with Logic Table
- Use exact Astro persona names from Logic Table
- Add plan validation before presentation
- Show industry watchouts in plans
- Fix persona selection to use logicTable state

AI now strictly constrained to KULT Logic Table personas"

git push
pm2 restart kult-frontend
```

---

## 🧪 Testing the Fix

### Before Fix (Current State):
```bash
# Open AI Wizard
Input: "launch new SUV, test drive campaign, RM 200k"

# Wrong Output:
Personas: Car Enthusiast, Tech Lover, Music Fan (❌ NOT IN LOGIC TABLE)
```

### After Fix (Expected):
```bash
# Open AI Wizard
Input: "launch new SUV, test drive campaign, RM 200k"

# Correct Output:
✅ Industry: Automotive (from Logic Table)
✅ Personas: 
   - Automotive Enthusiasts (Astro persona from Logic Table)
   - Automotive Intent (Astro persona from Logic Table)
   - Gadget Gurus (Astro persona from Logic Table)
   - Emerging Affluents (Astro persona from Logic Table)
   - Young Working Adult (Astro persona from Logic Table)
   
⚠️ WATCHOUT: do NOT use generic FMCG personas

✅ Channels: OTT, Meta, Display (from Logic Table)
✅ KPIs: CPL, test drive bookings (from Logic Table)
```

---

## 📊 Migration Progress

| Component | Status | Progress |
|-----------|--------|----------|
| Logic Table API | ✅ Complete | 100% |
| AI Wizard Loading | ✅ Complete | 100% |
| Industry Classification | ✅ Complete | 100% |
| **Persona Selection** | ❌ **Broken** | **0%** |
| verticalPlaybook Removal | ❌ Not Started | 0% |
| Plan Validation | ❌ Not Started | 0% |
| Watchouts Display | ❌ Not Started | 0% |
| **Overall** | 🟡 **43%** | **43%** |

---

## 🎯 Why It's Still Using Wrong Personas

**Root Cause**: The persona selection code (lines 1200-1800) still references the old `PERSONA_RULES` and `verticalPlaybook` objects that were deleted.

**Flow:**
1. ✅ Logic Table loads successfully with correct Astro personas
2. ✅ Industry identified as "Automotive"
3. ❌ Code tries to access `PERSONA_RULES.verticals.automotive` → **UNDEFINED**
4. ❌ Falls back to generic audience matching
5. ❌ Selects wrong personas not in Logic Table

**Evidence:**
```javascript
// This code is now broken:
const verticalRules = PERSONA_RULES.verticals[audienceVerticalKey];
//                     ^^^^^^^^^^^^^^^^^^^^^^ DOESN'T EXIST - was deleted

if (verticalRules) {
  // This block never executes
  // Falls through to generic fallback
}
```

---

## 💡 Quick Fix Guide

**Fastest way to fix:**

1. Open `frontend/src/pages/AIWizard.jsx`
2. Search for: `PERSONA_RULES` (should find ~5 references)
3. Replace each with Logic Table lookup
4. Search for: `verticalPlaybook` (should find ~7 references)
5. Replace each with Logic Table lookup
6. Test with Automotive campaign
7. Commit and restart

**Estimated Time**: 1 hour

---

## 📞 Support

If you need help completing the migration:

1. Check this file for exact code changes needed
2. Review `LOGIC_TABLE_INTEGRATION.md` for API usage
3. Test each change with console.log to verify Logic Table is being used
4. Validate final output matches Logic Table personas exactly

---

**Created**: 2025-12-02  
**Last Updated**: 2025-12-02  
**Status**: 🟡 IN PROGRESS (43% complete)  
**Critical Issue**: Persona selection not using Logic Table  
**ETA to Complete**: 1-2 hours
