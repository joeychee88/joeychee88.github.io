# Strategic Planner Testing Guide

## Test URL
**https://3002-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai/ai-wizard**

**Login:** `admin@kult.my` / `kult2024`

---

## Test Scenarios

### ✅ Test 1: Beauty Campaign - Industry Playbook & Persona Fit

**Objective:** Verify Beauty industry gets correct playbook and strategic personas (NOT generic reach-based audiences)

**Steps:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Open browser console (F12)
3. Input: `launch new perfume`
4. Budget: `150K`
5. Channel: `2` (Social Media focus)
6. Creative: `yes`
7. Geography: `1` (Nationwide)
8. Duration: `1.5 months`

**Expected Console Logs:**
```javascript
📖 [PLAYBOOK] Found industry playbook: beauty
📖 PLAYBOOK SOURCE: INDUSTRY
   Industry Key: beauty → Playbook: Beauty
   Strategy DNA: Social + Video
✅ PLAYBOOK APPLIED: Beauty (source: industry)
   Selected formats: Product Collector, Video in Banner, Hotspot, Mini Game, Carousel
📖 Using persona mapping for beauty (industry playbook)
   Primary personas: ['Fashion Icons', 'Young Working Adult', 'Youth Mom']
✅ Persona-mapped audiences: 2-4 (tier limit)
   🌍 Geo-weighted for: Malaysia
```

**Expected Results:**
- ✅ Industry: Beauty (from "perfume")
- ✅ Playbook source: INDUSTRY (not generic)
- ✅ Formats: Beauty-specific (Product Collector, Hotspot, etc.)
- ✅ Personas: Fashion Icons, Young Working Adult, Youth Mom
- ❌ NO: Badminton, Entertaiment, Active Lifestyle Seekers, Romantic Comedy

**Pass Criteria:**
- No console warning: "⚠️ WARNING: Using generic fallback"
- Personas match Beauty playbook (Fashion Icons, Young Working Adult, Youth Mom)
- Formats are Beauty-specific, not generic (In-stream Video, Leaderboard)

---

### ✅ Test 2: OTT Focus - Channel Preference Enforcement

**Objective:** Verify OTT focus ensures >= 60% budget allocated to OTT/Streaming

**Steps:**
1. Hard refresh browser
2. Open browser console
3. Input: `promote new car`
4. Budget: `250K`
5. Channel: `1` (OTT/Streaming focus)
6. Creative: `yes`
7. Geography: `1` (Nationwide)
8. Duration: `2 months`

**Expected Console Logs:**
```javascript
📺 Channel preference: OTT - Filtering formats
   Found X OTT/Streaming formats
   ✅ Prioritizing OTT formats

🎯 ENFORCING CHANNEL PREFERENCE: OTT
   Minimum share required: 60%
   Current OTT/Streaming budget: RM XXX,XXX
   Current OTT/Streaming share: XX.X%
   
[If below 60%:]
   ⚠️ Below minimum! Rebalancing...
   ✅ Adjusted OTT/Streaming budget: RM XXX,XXX
   ✅ New OTT/Streaming share: 65.2%

[If already above 60%:]
   ✅ Already meets minimum requirement
```

**Expected Results:**
- ✅ Final budget allocation: OTT/Stream >= 60% of RM 250,000
- ✅ Line items: Majority are OTT/Video platforms
- ✅ Console shows enforcement applied
- ❌ NOT: 5 line items with only 1 OTT platform (20%)

**Pass Criteria:**
- OTT/Streaming share >= 60% in final allocation
- Console logs show "ENFORCING CHANNEL PREFERENCE: OTT"
- Validation confirms: "✅ New OTT/Streaming share: XX.X%" where XX >= 60

---

### ✅ Test 3: East Malaysia - Geo-Aware Scoring

**Objective:** Verify regional campaigns use geo-weighted audiences and regional sites

**Steps:**
1. Hard refresh browser
2. Open browser console
3. Input: `launch new credit card in east malaysia`
4. Budget: `200K`
5. Channel: `3` (Balanced)
6. Creative: `yes`
7. Geography: (Should auto-extract) OR answer: `east malaysia`
8. Duration: `4 weeks`

**Expected Console Logs:**
```javascript
🌍 Final geography: ['Sabah', 'Sarawak', 'Labuan']

👥 Using geo-weighted audience scores for Sabah, Sarawak, Labuan
✅ Persona-mapped audiences: 4 (tier limit: 4)
   🌍 Geo-weighted for: Sabah, Sarawak, Labuan
   Top audience geo-relevance: XX.X%

🌐 Geo-aware site selection for regional campaign: Sabah, Sarawak, Labuan
   ✅ Selected 2-3 regional sites out of 5
✅ Selected sites: [site names including regional ones]
```

**Expected Results:**
- ✅ Geography: ['Sabah', 'Sarawak', 'Labuan'] (includes Labuan!)
- ✅ Audiences: Scored by (Sabah + Sarawak + Labuan) columns, not total reach
- ✅ Sites: Regional East Malaysia sites prioritized
- ✅ Console shows geo-weighting applied
- ❌ NOT: Identical to a Klang Valley or nationwide plan

**Pass Criteria:**
- Console shows "Using geo-weighted audience scores for Sabah, Sarawak, Labuan"
- Console shows "Geo-aware site selection for regional campaign"
- At least 2 sites are regional (Borneo, Sabah, Sarawak in name)
- Audiences have geoRelevance scores logged

---

### ✅ Test 4: Banking (Critical-Fit Industry) - Strategic Fallback

**Objective:** Verify Banking uses strategic personas even without perfect playbook match

**Steps:**
1. Hard refresh browser
2. Open browser console
3. Input: `launch credit card promotion`
4. Budget: `180K`
5. Channel: `2` (Social focus)
6. Creative: `don't have`
7. Geography: `2` (Klang Valley)
8. Duration: `3` (4 weeks)

**Expected Console Logs:**
```javascript
📖 [PLAYBOOK] Found industry playbook: finance_insurance (or banking)
   OR
⚠️ No persona mapping, but banking is CRITICAL-FIT industry
   Using fallback whitelist: ['Business & Professional', 'Emerging Affluents', 'Young Working Adult', 'Family Dynamic']
✅ Selected X strategic-fit audiences
```

**Expected Results:**
- ✅ Industry: Banking (from "credit card")
- ✅ Personas: Business & Professional, Emerging Affluents, Young Working Adult
- ❌ NO: Badminton, Entertaiment, Romantic Comedy, Active Lifestyle Seekers

**Pass Criteria:**
- If playbook exists: Uses playbook personas
- If no playbook: Falls back to Banking whitelist (Business & Professional, etc.)
- NEVER falls back to generic "top reach" for Banking
- Console shows "CRITICAL-FIT industry" if fallback used

---

### ✅ Test 5: Social Focus - Channel Preference Enforcement

**Objective:** Verify Social Media focus ensures >= 60% budget to Social

**Steps:**
1. Hard refresh browser
2. Open browser console
3. Input: `promote new app`
4. Budget: `120K`
5. Channel: `2` (Social Media focus)
6. Creative: `yes`
7. Geography: `1` (Nationwide)
8. Duration: `6 weeks`

**Expected Console Logs:**
```javascript
📺 Channel preference: Social - Filtering formats
   Found X Social Media formats
   ✅ Prioritizing Social formats

🎯 ENFORCING CHANNEL PREFERENCE: Social
   Minimum share required: 60%
   Current Social Media budget: RM XX,XXX
   Current Social Media share: XX.X%
```

**Expected Results:**
- ✅ Final budget allocation: Social >= 60% of RM 120,000
- ✅ Line items: Majority are Social platforms (Facebook, Instagram, TikTok, Meta)
- ✅ Console shows enforcement applied

**Pass Criteria:**
- Social Media share >= 60% in final allocation
- Console logs show "ENFORCING CHANNEL PREFERENCE: Social"
- Validation confirms share meets minimum

---

### ✅ Test 6: Peninsular Malaysia - Regional Differentiation

**Objective:** Verify Peninsular campaigns properly scope to 13 states

**Steps:**
1. Hard refresh browser
2. Open browser console
3. Input: `launch new car in peninsula`
4. Budget: `300K`
5. Channel: `1` (OTT focus)
6. Creative: `yes`
7. Geography: (Should auto-extract) OR confirm: `peninsula`
8. Duration: `8 weeks`

**Expected Console Logs:**
```javascript
🌍 Final geography: ['Kuala Lumpur', 'Selangor', 'Putrajaya', 'Johor', 'Melaka', 'Negeri Sembilan', 'Penang', 'Kedah', 'Perlis', 'Perak', 'Kelantan', 'Terengganu', 'Pahang']

👥 Using geo-weighted audience scores for [all 13 states]
🌐 Geo-aware site selection for regional campaign: [all 13 states]
```

**Expected Results:**
- ✅ Geography: All 13 peninsula states
- ✅ Excludes: Sabah, Sarawak, Labuan
- ✅ Geo-weighting applied across peninsula
- ✅ Console shows proper regional scope

**Pass Criteria:**
- Geography array has exactly 13 states
- Console shows geo-weighted scoring
- Different from nationwide (Malaysia) plan

---

## Common Issues & Debugging

### Issue: "⚠️ WARNING: Using generic fallback"

**Root Cause:** Industry key mismatch or playbook missing

**Debug:**
1. Check console: `Industry Key: X → Playbook: Y`
2. Verify industry key matches playbook data structure
3. Check `frontend/src/data/verticalPlaybook.json` for exact key

**Fix:**
- If key mismatch: Add alias to `INDUSTRY_KEY_ALIASES`
- If playbook missing: Fetch latest playbook data

---

### Issue: Beauty Campaign Gets "Badminton" Persona

**Root Cause:** Persona selection falling back to generic reach

**Debug:**
1. Check console: Should see "Using persona mapping for beauty"
2. If see "⚠️ No audiences matched industry": Playbook data issue

**Fix:**
- Verify `verticalPlaybook.json` has `persona_mapping.beauty` with correct personas
- Check audience dataset has matching persona names

---

### Issue: OTT Focus Only Gets 30% OTT Budget

**Root Cause:** Channel enforcement not applying or line items missing format info

**Debug:**
1. Check console: Should see "ENFORCING CHANNEL PREFERENCE: OTT"
2. Check: "Current OTT/Streaming share: XX.X%"
3. If no enforcement logged: Check `CHANNEL_CONSTRAINTS` import

**Fix:**
- Verify `channelPref` is set in brief (not 'Balanced')
- Check line items have `format` or `formatName` fields
- Verify `calculateChannelShares()` keywords match actual platform names

---

### Issue: East Malaysia Plan Looks Same as National

**Root Cause:** Geo-weighting not applied or all audiences have 0 in regional columns

**Debug:**
1. Check console: Should see "Using geo-weighted audience scores for Sabah, Sarawak, Labuan"
2. Check: "Top audience geo-relevance: XX.X%"
3. If 0.0%: Audience dataset missing regional data

**Fix:**
- Verify audience dataset has Sabah, Sarawak, Labuan columns
- Check columns have non-zero values for some audiences
- Verify `scoreAudienceByGeo()` is correctly summing state columns

---

## Success Metrics

### Playbook Hit Rate
**Target:** 95%+ campaigns use industry-specific playbooks

**Measure:** Count console logs with "PLAYBOOK SOURCE: INDUSTRY" vs "PLAYBOOK SOURCE: GENERIC"

**Pass:** < 5% see generic fallback warning

---

### Persona Quality
**Target:** 0% "Badminton"/"Entertaiment" in Beauty/Banking campaigns

**Measure:** Check final audience list for category-inappropriate personas

**Pass:** All Beauty campaigns get Fashion Icons, Young Working Adult, Youth Mom (or similar)

---

### Channel Compliance
**Target:** 100% of channel-preference campaigns meet minimum share

**Measure:** Final OTT/Social/Display share >= 60% when preference set

**Pass:** Console shows "✅ Already meets minimum" OR "✅ New share: XX.X%" where XX >= 60

---

### Geo Differentiation
**Target:** East Malaysia plans visibly different from KV plans

**Measure:** Compare audience and site lists for regional vs national campaigns

**Pass:** Regional campaigns show:
- Different audience rankings (geo-weighted)
- At least 40% regional sites
- Console logs confirm geo-aware selection

---

## Final Checklist

Before marking this feature complete, verify:

- [ ] Test 1 (Beauty): No Badminton, gets Beauty playbook ✅
- [ ] Test 2 (OTT): >= 60% OTT budget ✅
- [ ] Test 3 (East Malaysia): Geo-weighted audiences & sites ✅
- [ ] Test 4 (Banking): Strategic personas (not generic reach) ✅
- [ ] Test 5 (Social): >= 60% Social budget ✅
- [ ] Test 6 (Peninsular): Proper 13-state scope ✅
- [ ] All console logs clear and non-misleading ✅
- [ ] No build errors or warnings ✅
- [ ] Code committed and pushed ✅
- [ ] Documentation updated ✅

---

**Status:** READY FOR TESTING  
**Deployment:** https://3002-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai/ai-wizard  
**PR:** https://github.com/joeychee88/kult-planning-engine/pull/1  
**Commit:** `ae9b0be`
