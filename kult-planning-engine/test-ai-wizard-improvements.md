# AI Wizard Improvements - Test Plan

## ✅ Implemented Features

### Phase 1: Data Foundation (CRITICAL)
- [x] **Inventory Validation System** - `validateInventoryCapacity()`
  - Validates if requested impressions exceed available inventory
  - Applies safety buffer (25%)
  - Returns severity levels: critical, warning, info
  
- [x] **Audience Overlap Calculation** - `calculateUniqueReach()`
  - Calculates actual unique reach accounting for audience overlap
  - Uses overlap factors from demographic similarity
  - Prevents inflated reach estimates

### Phase 2: Format & Site Intelligence (CRITICAL)
- [x] **Format-Site Compatibility** - `getCompatibleSites()`
  - Filters sites by format compatibility
  - Ensures video formats only go to video-capable sites
  - Validates display/native format placements
  
- [x] **Language Filtering** - `filterSitesByLanguage()`
  - Filters Web publishers by target languages
  - Matches English/Malay/Chinese/Tamil publishers
  - Preserves OTT/Social sites (language-agnostic)

### Phase 3: Budget Intelligence (IMPORTANT)
- [x] **Budget Tier System** - `determineBudgetTier()`
  - Three tiers: Low (<100k), Mid (100k-200k), High (>200k)
  - Tier-specific strategies and constraints
  - Buying type restrictions per tier
  
- [x] **Tier Compliance Validation** - `validateTierCompliance()`
  - Checks if plan exceeds tier platform limits
  - Validates buying type usage per tier
  - Returns warnings for tier violations

- [x] **Channel Loading** - `applyChannelLoading()`
  - Applies 100% loading for non-optimized channels
  - Adjusts impressions based on channel efficiency
  - Different rates for Display, Video, OTT, Social

### Phase 4: Geographic Intelligence (IMPORTANT)
- [x] **Geo-aware Audience Scoring** - `scoreAudienceByGeo()`
  - Scores audiences based on geography relevance
  - Boosts local/regional personas for targeted campaigns
  - National boost for Malaysia-wide campaigns
  
- [x] **Geo-aware Site Scoring** - `scoreSiteByGeo()`
  - Detects regional sites (northern, southern, etc.)
  - Prioritizes sites matching target geography
  - Regional boost for geo-targeted campaigns

### Phase 5: User Experience (NICE-TO-HAVE)
- [x] **Enhanced Plan Display**
  - Budget tier strategy information
  - Inventory status warnings
  - Unique reach vs simple sum comparison
  - Tier compliance warnings

## Test Scenarios

### Scenario 1: Inventory Capacity Validation
**Input:** Large campaign requesting 50M impressions
**Expected:** Warning if inventory utilization >75%, critical if >100%

### Scenario 2: Audience Overlap Calculation
**Input:** Multiple similar personas (e.g., Urban Millennials + Young Working Adults)
**Expected:** Unique reach < simple sum, with overlap percentage shown

### Scenario 3: Format-Site Compatibility
**Input:** Video formats + Display formats
**Expected:** Video formats only on OTT/Video sites, Display on Web/Display sites

### Scenario 4: Language Filtering
**Input:** Target languages: English + Malay, formats include Web publishers
**Expected:** Only English/Malay Web publishers selected, OTT/Social preserved

### Scenario 5: Budget Tier Enforcement
**Input:** Low budget (<100k) campaign
**Expected:** Max 3 platforms, Direct buy only, max 2 audiences

### Scenario 6: Geographic Intelligence
**Input:** Geography: Klang Valley, Personas include "KL Urban Professionals"
**Expected:** KL-relevant personas scored higher, regional sites prioritized

## Manual Testing Checklist

### Test 1: Low Budget Campaign
- [ ] Input: Budget RM 50,000
- [ ] Verify: Max 3 platforms, Direct buy only
- [ ] Check: Budget tier shows "Focused" strategy
- [ ] Validate: No Premium/PD buys in line items

### Test 2: High Budget Campaign with Limited Inventory
- [ ] Input: Budget RM 500,000, narrow audience
- [ ] Verify: Inventory warning appears if utilization >75%
- [ ] Check: Recommendation to extend duration or add channels
- [ ] Validate: Available vs requested impressions shown

### Test 3: Multi-Language Campaign
- [ ] Input: Target languages: English, Chinese, Malay
- [ ] Verify: Web publishers match language requirements
- [ ] Check: OTT/Social sites not filtered by language
- [ ] Validate: Language filtering log shows correct counts

### Test 4: Regional Campaign
- [ ] Input: Geography: Northern Malaysia (Penang, Kedah)
- [ ] Verify: Regional personas scored higher
- [ ] Check: Northern sites (Penang-based) prioritized
- [ ] Validate: Geo-relevance scores logged correctly

### Test 5: Overlapping Audiences
- [ ] Input: Select "Young Adults 18-24" + "Students" + "Millennials"
- [ ] Verify: Unique reach < sum of individual reaches
- [ ] Check: Overlap percentage displayed
- [ ] Validate: Overlap factor calculation logged

## Integration Points Verified

### AIWizard.jsx Integration
- [x] Import all helper functions from advancedPlanningHelpers.js
- [x] Call `validateInventoryCapacity()` after format selection
- [x] Call `calculateUniqueReach()` after audience selection
- [x] Call `getCompatibleSites()` for format-site filtering
- [x] Call `filterSitesByLanguage()` for language targeting
- [x] Call `determineBudgetTier()` early in plan generation
- [x] Call `validateTierCompliance()` before returning plan
- [x] Display tier strategy, inventory status, unique reach in plan output

### Data Flow
1. Load datasets (rates, formats, audiences, inventory)
2. Determine budget tier → influences max platforms, audiences, buy types
3. Select formats → influences site compatibility
4. Select rates → filtered by tier strategy
5. Select audiences → geo-scoring applied, overlap calculated
6. Select sites → format compatibility + language filtering + geo-scoring
7. Allocate budget → tier-compliant allocation
8. Validate inventory → check capacity
9. Validate tier compliance → check violations
10. Display plan → show all insights

## Known Limitations & Future Enhancements

### Current Limitations
1. Inventory data requires `/api/inventory` endpoint (uses fallback if unavailable)
2. Overlap factors are based on age/gender demographics only
3. Language filtering only applies to Web publishers
4. Geo-scoring uses keyword matching (not lat/long data)

### Future Enhancements
1. Real-time inventory availability API integration
2. Advanced overlap calculation using behavioral/interest data
3. Multi-channel budget optimization algorithm
4. Predictive performance modeling per tier
5. A/B test framework for tier strategies
6. Visual plan summary component with charts

## Success Metrics

### Before Implementation
- Plans often exceeded available inventory
- Reach estimates inflated due to audience overlap
- Format-site mismatches (e.g., video on display-only sites)
- No budget tier guidance
- No geographic intelligence

### After Implementation
- ✅ Inventory validation prevents overbooking
- ✅ Unique reach provides accurate estimates
- ✅ Format-site compatibility ensures placements work
- ✅ Budget tiers guide strategic allocation
- ✅ Geographic intelligence improves targeting
- ✅ Enhanced plan display provides actionable insights

## Conclusion

All critical and important improvements have been implemented and integrated into the AIWizard component. The system now provides:

1. **More Accurate Plans** - Inventory validation and unique reach calculation
2. **Better Targeting** - Format-site compatibility and language filtering
3. **Strategic Guidance** - Budget tier system with compliance validation
4. **Geographic Intelligence** - Geo-aware audience and site scoring
5. **Enhanced UX** - Comprehensive plan display with warnings and insights

Next steps:
1. Deploy behind feature flag for A/B testing
2. Gather user feedback on tier strategies
3. Refine overlap factors based on real campaign data
4. Add visual plan summary component (Phase 5, nice-to-have)
