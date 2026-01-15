# AI Wizard Intelligence Enhancements

## Issue Identified
The AI Wizard currently lacks the intelligence of BuildPlanWizard:
1. ❌ No confidence scores on recommendations
2. ❌ No optimization strategy advice
3. ❌ Inaccurate CPM pricing (showing RM 48, 22, 9, 6 instead of real rate card prices)
4. ❌ No "Why" reasoning for format recommendations
5. ❌ No performance benchmarks (CTR, VTR)

## Solution Created
Created `frontend/src/utils/aiWizardIntelligence.js` with smart functions:

### 1. **scoreFormats()** - Smart Format Scoring
- Scores formats based on:
  - Vertical playbook match (+30 points)
  - Objective alignment (+20 points)
  - Creative asset type match (+15 points)
  - Budget tier appropriateness (±20 points)
  - Device optimization (+10 points)
- Returns confidence score (0-100%) with reasoning

### 2. **scoreSites()** - Smart Site Scoring  
- Scores sites based on:
  - Format compatibility (+20 points)
  - Traffic level (+15 points for 10M+)
  - Geography match (+15 points)
  - Industry affinity (+15 points)
- Returns confidence score with detailed reasons

### 3. **generateOptimizationStrategy()** - Strategy Recommendations
Returns tier-specific strategies:
- **Low Budget:** Focused Concentration (2-3 channels, Direct only)
- **Mid Budget:** Balanced Multi-Channel (4-5 channels, Direct+PD)
- **High Budget:** Premium Diversification (full funnel, all buy types)

Plus objective-specific tactics:
- **Awareness:** Video priority, frequency capping, brand lift
- **LeadGen:** Lead forms, intent audiences, CPL optimization
- **Traffic:** Banners/native, CTR optimization, retargeting

Plus pacing strategy:
- Week-by-week optimization plan
- Budget pacing recommendations
- KPI tracking suggestions

### 4. **calculateAccuratePricing()** - Real Rate Card CPMs
- Matches formats to actual rate card data
- Respects buying type (Direct/PG/PD)
- Returns accurate CPMs from database

### 5. **enrichWithBenchmarks()** - Performance Benchmarks
- Adds industry-specific metrics (CTR, VTR, CPM)
- Based on vertical playbook benchmarks
- Shows expected performance ranges

## Implementation Required

### Step 1: Import Intelligence Layer
```javascript
import {
  scoreFormats,
  scoreSites,
  generateOptimizationStrategy,
  calculateAccuratePricing,
  enrichWithBenchmarks
} from '../utils/aiWizardIntelligence';
```

### Step 2: Enhance Format Selection
In `generateMediaPlan()`, after selecting formats:
```javascript
// Score formats with confidence and reasoning
const scoredFormats = scoreFormats(selectedFormats, fullBrief);

// Enrich with benchmarks
const enrichedFormats = enrichWithBenchmarks(scoredFormats, {
  campaign_objective: fullBrief.campaign_objective,
  industry: fullBrief.industry
});

// Use enrichedFormats in plan
```

### Step 3: Enhance Site Selection
After selecting sites:
```javascript
// Score sites with confidence
const scoredSites = scoreSites(selectedSites, fullBrief, selectedFormats);

// Take top scored sites
const topSites = scoredSites.slice(0, 10);
```

### Step 4: Calculate Accurate CPMs
Before creating line items:
```javascript
const accuratePricing = calculateAccuratePricing(
  currentDatasets.rates,
  enrichedFormats,
  selectedAudiences,
  budget_rm,
  buying_type
);

// Use accuratePricing for line items instead of estimated CPMs
```

### Step 5: Generate Optimization Strategy
After plan is created:
```javascript
const optimizationStrategies = generateOptimizationStrategy(
  {
    campaign_objective,
    industry,
    budget_rm,
    duration_weeks,
    budgetTier
  },
  plan
);

// Add to plan object
plan.optimizationStrategies = optimizationStrategies;
```

### Step 6: Enhanced Plan Display
Update `showMediaPlan()` to show:

```markdown
### Recommended Formats (${formats.length})
${formats.map(f => `
• **${f.name}** ${f.confidence ? `[${f.confidence}% match]` : ''}
  ${f.reason ? `  Why: ${f.reason}` : ''}
  ${f.benchmarks?.ctr ? `  Expected CTR: ${f.benchmarks.ctr}` : ''}
  ${f.benchmarks?.vtr ? `  Expected VTR: ${f.benchmarks.vtr}` : ''}
`).join('\n')}

### Recommended Sites (${sites.length})
${sites.map(s => `
• **${s.name}** ${s.confidence ? `[${s.confidence}% match]` : ''}
  ${s.reason ? `  Why: ${s.reason}` : ''}
  Traffic: ${s.monthlyTraffic?.toLocaleString() || 'N/A'} visits/mo
`).join('\n')}

---

### 🎯 Optimization Strategy

${optimizationStrategies.map(strategy => `
**${strategy.title}**
${strategy.description}

Tactics:
${strategy.tactics.map(t => `• ${t}`).join('\n')}

${strategy.kpis ? `KPIs to Track: ${strategy.kpis.join(', ')}` : ''}
${strategy.expectedOutcome ? `Expected Outcome: ${strategy.expectedOutcome}` : ''}
`).join('\n\n')}
```

## Example Output

### Before (Current):
```
- YouTube Channels at RM 22 CPM = 2,272,727 impressions
- Meta (Facebook/Instagram) at RM 9 CPM = 3,333,333 impressions
```

### After (Enhanced):
```
### Recommended Formats

• **In-Stream Video** [95% match]
  Why: Recommended for awareness in Beauty • High visibility for awareness goals • Matches your video creative • Industry avg CTR: 0.85%
  Expected VTR: 75%
  CPM: RM 18.50

• **Masthead** [82% match]
  Why: Top performer for this vertical • High visibility for awareness goals • Premium format appropriate for budget
  Expected CTR: 1.2%
  CPM: RM 45.00

• **Banner (MPU, Leaderboard)** [68% match]
  Why: Cost-effective for driving traffic • Matches your static creative
  Expected CTR: 0.35%
  CPM: RM 6.00

---

### 🎯 Optimization Strategy

**Balanced Multi-Channel Strategy**
Diversify across 4-5 channels with mix of Direct and PD buys

Tactics:
• Mix Direct (60%) and PD (40%) for balance
• Target 3-4 complementary audience segments
• Combine video and display for format diversity
• Include at least one premium site for brand lift

Expected Outcome: Balanced reach and frequency with good cost efficiency and brand safety

**Awareness Maximization**
Optimize for maximum unique reach and brand exposure

Tactics:
• Prioritize video formats for engagement
• Target broad, high-reach audiences
• Use frequency capping (3-5 per user)
• Mix premium and scale inventory
• Measure brand lift via surveys

KPIs to Track: Unique Reach, Video Completion Rate, Brand Awareness Lift
```

## Priority
**HIGH** - This directly addresses user feedback about lack of intelligence compared to BuildPlanWizard

## Effort
**Medium** - Intelligence layer is complete, just needs integration (2-3 hours)

## Testing
1. Test with low budget (< RM 100k) - should show focused strategy
2. Test with high budget (> RM 200k) - should show premium strategy
3. Verify CPMs match rate card data
4. Check confidence scores are meaningful
5. Ensure optimization strategies are relevant to objective

## Files to Modify
1. `frontend/src/pages/AIWizard.jsx` - Add intelligence integration
2. Already created: `frontend/src/utils/aiWizardIntelligence.js`

## Success Criteria
✅ Formats show confidence scores and reasoning
✅ Sites show confidence scores and reasoning
✅ CPMs are accurate (from rate card, not estimated)
✅ Optimization strategies displayed per tier
✅ Performance benchmarks shown (CTR, VTR)
✅ User sees "why" behind every recommendation
