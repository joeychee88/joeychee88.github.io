# AI Planner Critical Fixes

## Issues to Fix:

1. ✅ Side panel not auto-filling from AI responses
2. ✅ AI not proposing ad formats (should ask BEFORE channels/sites)
3. ✅ Standard banner CPM wrong (should be RM 10, not RM 6)

## Changes Required:

### 1. Update 7-Step Flow to Include Format Selection

**OLD FLOW:**
```
Step 0: Kickoff
Step 1: Campaign Setup (dates, geography)
Step 2: Audience Targeting
Step 3: Budget
Step 4: Channels & Formats  ← WRONG: Channels first
Step 5: Summary
Step 6: Generate Plan
Step 7: Next Actions
```

**NEW FLOW:**
```
Step 0: Kickoff
Step 1: Campaign Setup (dates, geography)
Step 2: Audience Targeting
Step 3: Budget
Step 4: Ad Formats  ← NEW: Formats FIRST
Step 5: Channels & Sites  ← THEN channels/sites
Step 6: Summary
Step 7: Generate Plan
Step 8: Next Actions
```

### 2. Fix extractedEntities to Include Arrays

Current extractedEntities only returns:
- campaignName
- product_brand
- campaign_objective
- industry
- startDate
- duration_weeks
- geography
- targetAudience (string)
- budget_rm
- channels (string)
- hasCreativeAssets

**MISSING:**
- `selectedFormats`: [] array
- `selectedSites`: [] array
- `selectedPersonas`: [] array (currently only targetAudience string)

### 3. Update System Prompt to Output Structured Arrays

Need to instruct AI to return:
```json
{
  "response": "...",
  "extractedEntities": {
    "currentStep": 4,
    "...": "...",
    "selectedPersonas": ["Travel Seekers", "Adventure Enthusiasts"],
    "selectedFormats": ["Leaderboard 728x90", "MREC 300x250"],
    "selectedChannels": ["OTT", "Social"],
    "selectedSites": ["Astro GO", "YouTube", "Meta"]
  }
}
```

### 4. Fix Standard Banner CPM

The AI is told to use "RM 6 CPM" but should use "RM 10 CPM" for standard banners.

**Location:** System prompt context where we mention Display CPM rates

---

## Implementation Plan:

1. Update SYSTEM_PROMPT in `backend/routes/ai-chat.js`:
   - Change Step 4 to "Ad Formats"
   - Add new Step 5 "Channels & Sites"
   - Renumber remaining steps
   - Add format selection questions
   - Fix CPM rate mention (6 → 10)
   - Add instructions to output selectedFormats, selectedPersonas, selectedSites arrays

2. Update extractedEntities schema to include:
   - selectedPersonas: array
   - selectedFormats: array
   - selectedChannels: array
   - selectedSites: array

3. Update KULT context to show correct Display CPM (10 instead of 6)

4. Add format recommendations based on industry/objective

---

## Testing Checklist:

- [ ] AI asks about formats BEFORE channels
- [ ] Side panel auto-fills with personas
- [ ] Side panel auto-fills with formats
- [ ] Side panel auto-fills with sites/channels
- [ ] Display CPM shows as RM 10 (not RM 6)
- [ ] extractedEntities includes arrays
- [ ] 8-step flow works correctly

---

## Next: Implement the fixes
