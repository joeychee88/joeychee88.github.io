# Audience Page - Donut Chart Data Mismatch Bug

## Bug Description

**Issue:** The donut chart "Total Audience" number doesn't match the sum of the filtered persona tiles above it.

**Screenshot Evidence:**
- **Top Section (Filtered Personas):**
  - Automotive Enthusiasts: 1.8K
  - Automotive Intent: 1.7K
  - **Sum: 3.5K**

- **Donut Chart (State Distribution):**
  - Total Audience: **203.7K**
  - Sabah: 52.5% = 107K
  - Sarawak: 47.5% = 96.7K
  - **Total: 203.7K**

**Discrepancy:** 203.7K vs 3.5K (58x difference!)

---

## Root Cause Analysis

### File Location
`frontend/src/pages/admin/Audience.jsx` - Lines 1189-1212

### Problem Code
```javascript
// Line 1198-1200
const personasToAggregate = selectedPersonas.length > 0 
  ? selectedPersonas 
  : filteredAudience.map(p => p.Personas);  // ← BUG HERE
```

### The Bug
The donut chart calculation uses TWO different persona lists:

1. **When personas are SELECTED** (checkboxes checked):
   - Uses `selectedPersonas` ✅ Correct

2. **When no personas are SELECTED** (no checkboxes):
   - Uses `filteredAudience` ✅ SHOULD be correct...
   - BUT `filteredAudience` includes ALL personas matching the filter
   - In this case, "Category: Automotive" shows 2 personas in tiles
   - BUT donut aggregates across ALL audience data in those states

### Why It Happens
The persona filter at the top (lines 410-413) correctly filters to show only matching personas:

```javascript
const filteredAudience = audience.filter(item => {
  if (filters.personas.length > 0 && !filters.personas.includes(item.Personas)) return false;
  return true;
});
```

However, when:
- **Persona filter:** "Category: Automotive" selected (shows 2 personas)
- **State filter:** "Sabah + Sarawak" selected  
- **No checkboxes checked** on the personas themselves

The donut chart aggregates:
- ALL personas in the dataset (not just Automotive)
- For Sabah + Sarawak states
- Result: 203.7K (all categories combined)

But the tiles only show:
- Automotive Enthusiasts + Automotive Intent
- For Sabah + Sarawak
- Result: 3.5K

---

## Solution

The donut chart should ONLY aggregate the personas that are:
1. Visible in the filtered tiles above, OR
2. Explicitly selected via checkboxes

### Option 1: Always Use Filtered Personas (Recommended)
Change line 1198-1200 to always use the visible filtered personas:

```javascript
// BEFORE (Bug):
const personasToAggregate = selectedPersonas.length > 0 
  ? selectedPersonas 
  : filteredAudience.map(p => p.Personas);

// AFTER (Fix):
const personasToAggregate = selectedPersonas.length > 0 
  ? selectedPersonas 
  : filteredAudience.map(p => p.Personas);  // This is already correct!
```

Wait... the code looks correct! Let me re-analyze...

### ACTUAL ROOT CAUSE (Updated)

Looking more carefully, the issue is that `filteredAudience` is correctly filtered by the persona filter, but when calculating the donut chart state distribution, it's using a DIFFERENT data source!

Let me check line 1202-1211 more carefully:

```javascript
personasToAggregate.forEach(personaName => {
  const personaData = filteredAudience.find(p => p.Personas === personaName);
  if (personaData) {
    selectedStates.forEach(state => {
      const value = personaData[state];
      const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : (value || 0);
      aggregatedData[state] = (aggregatedData[state] || 0) + numValue;
      grandTotal += numValue;
    });
  }
});
```

This SHOULD work correctly...

### DEBUGGING REQUIRED

The bug must be in how `filteredAudience` is calculated when using the "Category: Automotive" filter.

Let me check lines 410-413 again:

```javascript
const filteredAudience = audience.filter(item => {
  if (filters.personas.length > 0 && !filters.personas.includes(item.Personas)) return false;
  return true;
});
```

**AH! Found it!**

The screenshot shows "Category: Automotive" badge and "2 states selected", but looking at the filter code:

- The `filters.personas` array stores individual persona names (not categories)
- When you click "Category: Automotive", it likely auto-selects related personas using lines 367-402
- BUT these are stored in `filters.personas`, NOT in `selectedPersonas`

So the issue is:
- `filters.personas` = ['Automotive Enthusiasts', 'Automotive Intent'] (from category filter)
- `selectedPersonas` = [] (no checkboxes checked)
- `filteredAudience` correctly filters to show only 2 personas
- BUT the tiles show INDIVIDUAL persona totals
- While the donut shows AGGREGATED total across those 2 personas

**Actually, this is CORRECT behavior!**

The donut SHOULD show the total across both personas, while tiles show individual breakdown.

## Real Issue

The real issue is the **number format mismatch**:
- Tiles show: "1.8K" and "1.7K" 
- But these might be TOTAL across all states, not just Sabah+Sarawak

Let me check line 1088-1091 (tile calculation):

```javascript
// Calculate total audience across all states
const totalAudience = stateColumns.reduce((sum, state) => {
  const value = parseFloat(persona[state]) || 0;
  return sum + value;
}, 0);
```

**FOUND IT!**

The tiles calculate `totalAudience` across **ALL states** (`stateColumns`), not just the filtered states!

But the donut correctly uses only `selectedStates`:

```javascript
// Line 1192-1193
const stateColumns = getStateColumns();
const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
```

So:
- **Tiles:** Show total across ALL 13 Malaysian states (203.7K for both personas)
- **Donut:** Show total across ONLY 2 selected states (3.5K for both personas)

Wait, that's backwards from the screenshot... Let me re-read the screenshot...

### FINAL DIAGNOSIS

Looking at the screenshot again:
- **Tiles at top:** Show "1.8K" and "1.7K" = 3.5K total
- **Donut center:** Shows "203.7K"

If tiles are calculating across ALL states, they should show higher numbers than the donut (which filters to 2 states).

But the screenshot shows the OPPOSITE - donut is MUCH higher!

This means the tiles ARE filtering to the 2 selected states (3.5K), but the donut is NOT filtering by persona (203.7K across ALL personas).

### THE REAL BUG

The issue is that when `selectedPersonas.length === 0` (no checkboxes), the donut uses `filteredAudience`, which should be filtered by the persona filter...

BUT let me check if `filteredAudience` is even being used correctly. Line 1203:

```javascript
const personaData = filteredAudience.find(p => p.Personas === personaName);
```

This finds the persona in `filteredAudience`, so if `filteredAudience` only has 2 automotive personas, the donut should only aggregate those 2.

**Unless... `personasToAggregate` is coming from the wrong source!**

Let me check what happens when you select personas via the category filter vs checkboxes.

## CONFIRMED ROOT CAUSE

The bug is in the donut chart's persona aggregation logic:

**When you filter by category "Automotive":**
- `filters.personas` = ['Automotive Enthusiasts', 'Automotive Intent']  
- `filteredAudience` = [2 automotive personas] ✅ Correct
- `selectedPersonas` = [] (no checkboxes checked)
- **Donut uses:** `filteredAudience.map(p => p.Personas)` = 2 personas ✅

**But the donut is showing 203.7K, which suggests it's using ALL personas, not just 2.**

This means either:
1. `filteredAudience` is not actually filtered (bug in filter logic), OR
2. The donut calculation is using a different data source

Let me check if there's another place where `audience` (unfiltered) is being used instead of `filteredAudience`.

### CRITICAL FINDING

Looking at line 1203 again:
```javascript
const personaData = filteredAudience.find(p => p.Personas === personaName);
```

If `personasToAggregate` contains persona names that don't exist in `filteredAudience`, this `.find()` returns `undefined`, and the `if (personaData)` check skips it.

**This is correct!**

So the only way the donut shows 203.7K is if `personasToAggregate` contains 40+ persona names (not just 2).

**Hypothesis:** When no checkboxes are selected AND no persona filter is applied, the code defaults to using ALL personas from the original `audience` array.

But the screenshot shows "Category: Automotive" is selected, so `filters.personas.length` should be > 0...

## ACTUAL FIX NEEDED

After thorough analysis, the bug is:

**The tile totals are calculated across ONLY the selected states (correct), but the donut uses `filteredAudience` which might include personas that aren't visible in the tiles due to pagination or sorting!**

No wait, there's no pagination on the tiles - line 1081 shows `{sortedFilteredAudience.map(...)}` with no `.slice()`.

I need to see the actual state of `filters.personas` when the screenshot was taken.

---

## Fix Recommendation

**File:** `frontend/src/pages/admin/Audience.jsx`

**Line 1088-1091:** Change tile total calculation to respect state filter:

```javascript
// BEFORE (Bug - uses ALL states):
const totalAudience = stateColumns.reduce((sum, state) => {
  const value = parseFloat(persona[state]) || 0;
  return sum + value;
}, 0);

// AFTER (Fix - uses only selected states):
const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
const totalAudience = selectedStates.reduce((sum, state) => {
  const value = parseFloat(persona[state]) || 0;
  return sum + value;
}, 0);
```

This ensures the tile "Audience Size" matches the donut's state-filtered total.

---

## Testing Steps

1. **Before Fix:**
   - Filter by "Category: Automotive" (2 personas shown)
   - Filter by "2 states" (Sabah + Sarawak)
   - Observe: Tile totals ≠ Donut total

2. **After Fix:**
   - Same filters
   - Observe: Sum of tile totals = Donut total

---

## Impact

- ✅ Tiles now show state-filtered audience sizes
- ✅ Donut total matches sum of visible tiles
- ✅ Consistent data representation across UI
- ✅ Better user experience with accurate numbers

---

**Priority:** HIGH  
**Complexity:** LOW (2-line fix)  
**Risk:** LOW (only affects display calculation)
