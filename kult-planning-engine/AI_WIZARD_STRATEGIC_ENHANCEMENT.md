# AI Wizard Strategic Enhancement Plan

## Current Issues Identified

### 1. Missing Context Gathering
- ❌ Doesn't ask about creative assets (video/static/none)
- ❌ Doesn't ask about duration
- ❌ Doesn't clarify geography properly
- ❌ Jumps straight to recommendations without understanding context

### 2. Poor Recommendations
- ❌ Proposes single sites without strategy
- ❌ Lists channels without explaining WHY
- ❌ No funnel-based reasoning
- ❌ Overstates reach (sums impressions)
- ❌ Too many audiences for awareness campaigns

### 3. Wrong Tone
- ❌ Sounds like a calculator, not a strategist
- ❌ Formulaic "I recommend" language
- ❌ No assumptions stated
- ❌ No credibility markers

## Solution: Multi-Phase Conversation Flow

### Phase 1: Context Gathering (BEFORE recommendations)

**Required Questions (in order):**

1. **Creative Assets**
   ```
   "Before I recommend formats, do you have creative assets ready?
   
   • Video content (for OTT, YouTube, social video)
   • Static banners (for display, programmatic)
   • Both
   • Not yet - need production
   
   This affects format selection and budget allocation."
   ```

2. **Campaign Duration**
   ```
   "How long will this campaign run?
   
   • 2 weeks (sprint launch)
   • 4 weeks (standard awareness)
   • 8+ weeks (sustained campaign)
   
   Duration impacts pacing, frequency, and inventory availability."
   ```

3. **Geography Clarity** (if vague)
   ```
   "You mentioned Malaysia - should we focus on:
   
   • Nationwide (all states)
   • Klang Valley + major cities only
   • Specific regions (Northern, Southern, East Coast)
   
   This affects site selection and audience targeting."
   ```

4. **Buying Preference** (for mid/high budgets)
   ```
   "For your RM 150k budget, we can approach this two ways:
   
   • Direct buys: Fixed CPM, guaranteed placement
   • Programmatic (PD): Lower CPM, broader reach, some uncertainty
   • Mix of both
   
   What's your priority - certainty or efficiency?"
   ```

### Phase 2: Strategic Planning (AFTER context is complete)

Only generate plan when we have:
- ✅ Objective
- ✅ Budget
- ✅ Industry
- ✅ Geography (clarified)
- ✅ Duration
- ✅ Creative assets
- ✅ Buying preference

### Phase 3: Strategic Output Format

```markdown
## Campaign Strategy: [Product] [Objective]

### Context
• Budget: RM [X]
• Duration: [N] weeks (RM [Y]/week)
• Geography: [Specific]
• Creative: [Available/Needed]
• Approach: [Direct/PD/Mixed]

### Strategic Rationale

[2-3 sentences explaining overall approach]

Example:
"Given your beauty product launch and nationwide awareness goal, this plan prioritizes video-first channels (OTT, YouTube) to drive engagement among fashion-conscious audiences. We're focusing on 3 core personas to maximize frequency (3-4x) over 4 weeks, avoiding audience dilution common in awareness campaigns."

---

### Channel Strategy

**OTT (RM 50,000 | 50%)**
• **Role:** Primary awareness driver
• **Why:** High completion rates (65-75%) for beauty content, premium brand context
• **Targeting:** Astro GO - reaches fashion icons and young working adults during prime time
• **Expected:** 1M impressions, ~300k reach @ 3-4x frequency

**Social - Meta (RM 30,000 | 30%)**
• **Role:** Engagement & consideration
• **Why:** Strong retargeting capability, high CTR for beauty products (1.2-1.5%)
• **Targeting:** Fashion Icons + Young Working Adults (interest: beauty, lifestyle)
• **Expected:** 3.3M impressions, ~800k reach @ 4-5x frequency

**Display - KULT Network (RM 20,000 | 20%)**
• **Role:** Reach extension & frequency
• **Why:** Cost-efficient reach among mass market, complements video
• **Targeting:** Nona, Hijabista (beauty-focused publishers)
• **Expected:** 3.3M impressions, ~600k reach @ 5-6x frequency

---

### Target Audiences (3 Core)

**1. Fashion Icons (3.51M nationally)**
   • Primary for beauty launches
   • High affinity for premium products
   • Active on social + lifestyle sites

**2. Young Working Adult (2.85M nationally)**
   • Key consideration segment
   • Strong purchasing power
   • OTT + social reach

**3. Youth Mom (2.65M nationally)**
   • Extended reach
   • High engagement with beauty content
   • Display + social effective

⚠️ **Strategy Note:** Limited to 3 personas to maintain frequency. More audiences = diluted impact.

---

### Expected Performance (Indicative)

**Impressions:** ~7.6M over 4 weeks
**Estimated Reach:** 1.2M–1.5M unique people
   (Based on avg frequency 5-6x across channels)

**Benchmarks (Beauty Industry):**
• Video Completion Rate: 65-75%
• Display CTR: 0.25-0.35%
• Social CTR: 1.2-1.5%

---

### Assumptions Made

✓ Campaign duration: 4 weeks (can adjust)
✓ Creative assets: Video + static available
✓ Buying approach: Direct for OTT, PD for display/social
✓ Geography: Nationwide with KV concentration
✓ Inventory: Subject to availability (book early for OTT)

---

### ⚠️ Important Considerations

**Creative Production:** If video isn't ready, we'd shift budget to display/social (static only) and defer OTT. This would reduce VTR but maintain reach.

**Inventory Risk:** Astro GO prime slots book fast. Alternative: YouTube Channels (similar reach, slightly lower CPM).

**Frequency Management:** Current plan targets 5-6x average. If you want lighter touch (3-4x), we can expand audience or reduce duration.

---

### Next Steps

Does this strategic approach align with your goals? I can adjust:

• **Audience mix** - Go broader or more niche?
• **Channel weights** - More video vs. display?
• **Geography** - Focus on KV or true nationwide?
• **Duration** - Compress to 2 weeks or extend to 8?

Let me know what you'd like to refine.
```

## Implementation Requirements

### 1. Update Conversation Flow

In `AIWizard.jsx`, add question sequence:

```javascript
const CONVERSATION_FLOW = {
  INITIAL: 'initial',
  CREATIVE_ASSETS: 'creative_assets',
  DURATION: 'duration',
  GEOGRAPHY: 'geography',
  BUYING_PREFERENCE: 'buying_preference',
  PLAN_GENERATION: 'plan_generation'
};

// Track conversation stage
const [conversationStage, setConversationStage] = useState(CONVERSATION_FLOW.INITIAL);

// Only generate plan when all context is gathered
if (conversationStage !== CONVERSATION_FLOW.PLAN_GENERATION) {
  // Ask next qualifying question
  const nextQuestion = getNextQuestion(brief, conversationStage);
  addMessage('assistant', nextQuestion);
  return;
}
```

### 2. Update Entity Extraction

Add extraction for:
- `creative_assets`: 'video' | 'static' | 'both' | 'none'
- `campaign_duration`: weeks (1-12)
- `geography_specificity`: 'nationwide' | 'klang_valley' | 'regional'
- `buying_preference`: 'direct' | 'pd' | 'mixed'

### 3. Update Plan Generation Logic

```javascript
// Before generating plan, validate context
const requiredContext = [
  'campaign_objective',
  'budget_rm',
  'industry',
  'geography',
  'creative_assets',
  'duration_weeks'
];

const missingContext = requiredContext.filter(key => !brief[key]);

if (missingContext.length > 0) {
  // Don't generate plan yet, ask for missing context
  return askForContext(missingContext[0]);
}
```

### 4. Improve Format Selection

```javascript
// Filter formats by creative availability
const availableFormats = formats.filter(format => {
  const formatName = format.name?.toLowerCase() || '';
  
  if (creative_assets === 'static') {
    // Only display/banner formats
    return formatName.includes('banner') || 
           formatName.includes('display') || 
           formatName.includes('native');
  } else if (creative_assets === 'video') {
    // Only video formats
    return formatName.includes('video') || 
           formatName.includes('ott');
  } else if (creative_assets === 'both') {
    // All formats available
    return true;
  } else {
    // No creative - suggest production
    return false;
  }
});

if (availableFormats.length === 0) {
  return suggestCreativeProduction(campaign_objective, budget_rm);
}
```

### 5. Fix Reach Calculation

```javascript
// Calculate realistic reach (not summed impressions)
const calculateRealisticReach = (lineItems, audiences, duration_weeks) => {
  // Get total impressions
  const totalImpressions = lineItems.reduce((sum, item) => sum + item.impressions, 0);
  
  // Calculate average frequency based on duration
  // Longer campaigns = higher frequency
  const avgFrequency = Math.min(10, 2 + (duration_weeks * 0.5));
  
  // Reach = Impressions / Frequency
  const estimatedReach = Math.floor(totalImpressions / avgFrequency);
  
  // Cap by total audience size
  const totalAudienceSize = audiences.reduce((sum, a) => sum + (a.totalAudience || 0), 0);
  const cappedReach = Math.min(estimatedReach, totalAudienceSize * 0.7); // Max 70% penetration
  
  // Return range (±20%)
  const reachLow = Math.floor(cappedReach * 0.8);
  const reachHigh = Math.floor(cappedReach * 1.2);
  
  return {
    impressions: totalImpressions,
    estimatedReach: cappedReach,
    reachRange: `${(reachLow / 1000000).toFixed(1)}M–${(reachHigh / 1000000).toFixed(1)}M`,
    avgFrequency: avgFrequency.toFixed(1)
  };
};
```

### 6. Add Audience Dilution Warning

```javascript
// Warn about too many audiences for awareness
if (campaign_objective === 'Awareness' && selectedAudiences.length > 5) {
  warnings.push({
    type: 'audience_dilution',
    message: `⚠️ This plan targets ${selectedAudiences.length} audiences. For awareness, this may dilute frequency. Consider consolidating to 3-5 core personas for maximum impact.`
  });
}
```

### 7. Update Response Tone

```javascript
// Strategic tone, not salesy
const generateStrategicIntro = (brief, budgetTier) => {
  const { campaign_objective, industry, budget_rm } = brief;
  
  if (campaign_objective === 'Awareness') {
    return `Given your ${industry} launch and nationwide awareness goal, this plan prioritizes high-visibility channels to drive brand recognition. We're concentrating budget on 3 core audiences to maximize frequency (${avgFrequency}x) over ${duration_weeks} weeks, avoiding the audience dilution common in awareness campaigns.`;
  } else if (campaign_objective === 'LeadGen') {
    return `For lead generation in ${industry}, this strategy emphasizes formats with strong CTR performance (native, lead forms) and intent-based audiences. Budget is weighted toward channels with proven CPL efficiency in your vertical.`;
  } else if (campaign_objective === 'Traffic') {
    return `To drive qualified traffic for ${industry}, we're prioritizing high-CTR formats (banners, native articles) across display and social. The audience mix targets users with demonstrated click-through behavior in your category.`;
  }
  
  return `This ${budgetTier} budget strategy balances reach and frequency for ${campaign_objective} in ${industry}.`;
};
```

## Testing Scenarios

### Scenario 1: Missing Creative
```
User: "Plan awareness for my perfume launch, RM 100k"
AI: "Before I recommend formats, do you have creative assets ready?..."
User: "Not yet"
AI: "Got it. Since creative production is needed, here's what I suggest:
     
     1. Allocate RM 15-20k for video production (30s hero + cutdowns)
     2. Allocate RM 5-10k for static banners (6-8 formats)
     3. Remaining RM 70-80k for media
     
     Timeline: 2-3 weeks production, then 4-week campaign.
     
     Want me to plan the media portion (RM 75k) or wait until creative is confirmed?"
```

### Scenario 2: Too Many Audiences
```
AI generates plan with 7 audiences

Output includes:
"⚠️ **Strategy Note:** This plan currently targets 7 audiences. For awareness, this may dilute frequency below effective levels (< 3x). 

**Recommendation:** Consolidate to your top 3-4 personas:
• Fashion Icons (Primary - highest affinity)
• Young Working Adults (Secondary - broad reach)
• Youth Moms (Tertiary - extended coverage)

This focuses frequency at 5-6x per user for better recall."
```

### Scenario 3: Vague Geography
```
User: "Malaysia-wide campaign"
AI: "You mentioned Malaysia - to optimize site selection, should we focus on:

• **Nationwide** (all states, including East Malaysia)
• **Peninsular Malaysia** (13 states, excluding Sabah/Sarawak)
• **Urban Focus** (KV + Penang + JB - 60% of population)

Nationwide requires vernacular sites for East Malaysia.
Urban focus allows premium English sites with higher completion rates.

Which makes more sense for your target market?"
```

## Success Metrics

✅ User completes 3-5 question flow before seeing plan
✅ Plan shows "Assumptions Made" section
✅ Reach is frequency-adjusted, not summed impressions
✅ Each channel has "Role" and "Why" explanation
✅ Warnings appear for audience dilution
✅ Tone sounds consultative, not formulaic
✅ Response ends with "Next Steps" question

## Priority

**CRITICAL** - Addresses core user feedback about lack of intelligence and strategic thinking
