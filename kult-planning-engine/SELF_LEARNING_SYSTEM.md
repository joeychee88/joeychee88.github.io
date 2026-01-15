# 🧠 Self-Learning Media Planner - Complete Implementation

## 🎯 Overview

The KULT Planning Engine now includes a **fully functional self-learning system** that continuously improves based on real user feedback. Every rating, comment, and edit helps the AI become smarter and more accurate.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                             │
│  ┌───────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │ AI Generates  │ →  │ User Reviews │ →  │ Feedback Modal  │ │
│  │ Media Plan    │    │ & Rates Plan │    │ Submission      │ │
│  └───────────────┘    └──────────────┘    └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     DATA COLLECTION LAYER                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Feedback Store (JSON-based, upgradable to PostgreSQL)    │ │
│  │  • Overall ratings (1-5 stars)                             │ │
│  │  • Dimensional ratings (audience, budget, platform, format)│ │
│  │  • Specific issues (too broad, wrong personas, etc.)       │ │
│  │  • User comments                                           │ │
│  │  • Plan approval status                                    │ │
│  │  • Original plan data for comparison                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     LEARNING ENGINE                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Pattern Analysis                                          │ │
│  │  • Persona performance tracking                            │ │
│  │  • Platform success rates                                  │ │
│  │  • Format effectiveness                                    │ │
│  │  • Vertical-specific patterns                              │ │
│  │                                                             │ │
│  │  Weight Calculation                                        │ │
│  │  • Normalized scores (0-1)                                 │ │
│  │  • Confidence levels (based on sample size)                │ │
│  │  • Learning rate smoothing (30%)                           │ │
│  │  • Removal penalty for bad personas                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ADAPTIVE PLANNING                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Future Plan Generation                                    │ │
│  │  • Adjusted persona scores (0.5x - 1.5x multipliers)       │ │
│  │  • Platform budget recommendations                         │ │
│  │  • Format priority adjustments                             │ │
│  │  • Vertical-specific learnings                             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 What Gets Tracked

### 1. **Persona Performance**
- ✅ Selection frequency
- ✅ Average user rating when selected
- ✅ Removal rate (how often users remove it)
- ✅ Addition rate (how often users add it)
- ✅ Success score (approval rate weighted)

**Example:**
```json
{
  "car enthusiast": {
    "success_score": 0.85,
    "selection_count": 45,
    "removal_count": 2,
    "avg_rating": 4.5,
    "normalized_score": 0.85,
    "confidence": 0.90
  }
}
```

### 2. **Platform Performance**
- ✅ Budget allocation accuracy
- ✅ User satisfaction per platform
- ✅ Budget adjustment patterns
- ✅ Success rate by budget tier

### 3. **Format Performance**
- ✅ Format selection success
- ✅ User ratings per format
- ✅ Vertical-specific format preferences

### 4. **Vertical Patterns**
- ✅ Approval rate per vertical
- ✅ Most commonly added personas
- ✅ Most commonly removed personas
- ✅ Preferred platform mix
- ✅ Budget patterns

---

## 🔧 Key Features

### **1. Automatic Feedback Collection**
After every plan generation, a feedback modal appears asking users to:
- ⭐ Rate overall plan quality (1-5 stars)
- ⭐ Rate each dimension separately:
  - Target Audiences
  - Budget Allocation
  - Platform Mix
  - Ad Formats
- ✓ Identify specific issues:
  - Audience too broad/narrow
  - Wrong personas
  - Budget too high/low
  - Missing platforms
  - Wrong formats
- 💬 Provide open comments
- ✅ Approve or reject the plan

### **2. Learning Engine**
Runs automatically after each feedback submission (or manually via dashboard):
- **Pattern Analysis**: Identifies which personas/platforms/formats work best
- **Weight Calculation**: Computes normalized success scores (0-1)
- **Confidence Tracking**: Only applies learnings with sufficient data (5+ feedbacks)
- **Smooth Updates**: Uses 30% learning rate to avoid overcorrection
- **Vertical-Specific**: Maintains separate learnings per industry vertical

### **3. Adaptive Persona Scoring**
When generating future plans:
```javascript
// Persona scoring multiplier based on learnings
normalized_score: 0.0-0.5 → 0.5x-1.0x (reduce priority)
normalized_score: 0.5     → 1.0x (neutral)
normalized_score: 0.5-1.0 → 1.0x-1.5x (boost priority)
```

**Example:**
- If "Car Enthusiast" has 85% success rate → 1.35x boost
- If "Badminton" has 20% success rate → 0.7x penalty

### **4. Learning Dashboard**
Access at `/learning-dashboard` to view:
- 📊 Overall stats (total feedback, approval rate, avg rating)
- 🎯 Top performing personas
- 📈 Platform performance metrics
- ⚠️ Common issues identified
- 💬 Recent feedback submissions
- 🔄 Learning system status
- 🎓 Manual learning trigger button

---

## 🚀 How It Works - Step by Step

### **User Journey:**

1. **User gets a media plan from AI**
   ```
   User: "launch new car, RM 200k"
   AI: [Generates plan with audiences, platforms, budget]
   ```

2. **Feedback modal appears 2 seconds later**
   ```
   Modal: "How satisfied are you with this plan?"
   User rates: 4⭐ overall, 3⭐ for audiences (too broad)
   ```

3. **Feedback is saved to backend**
   ```javascript
   POST /api/feedback
   {
     plan_id: "plan_1234567890",
     overall_rating: 4,
     dimensional_feedback: {
       audience_rating: 3,
       audience_too_broad: true
     },
     plan_data: { ... },
     approved: true
   }
   ```

4. **Learning engine analyzes feedback**
   ```
   • Identifies which personas were in the plan
   • Updates persona success scores
   • Adjusts platform weights
   • Tracks vertical patterns
   ```

5. **Future plans are improved**
   ```
   Next automotive plan:
   • Personas with high scores get priority
   • Personas with low scores are deprioritized
   • Platform budget allocations are adjusted
   ```

---

## 📡 API Endpoints

### **POST /api/feedback**
Submit feedback for a generated plan
```javascript
Request Body:
{
  plan_id: string,
  overall_rating: number (1-5),
  dimensional_feedback: {
    audience_rating: number,
    budget_rating: number,
    platform_rating: number,
    format_rating: number,
    audience_too_broad: boolean,
    audience_too_narrow: boolean,
    wrong_personas: boolean,
    budget_too_high: boolean,
    budget_too_low: boolean,
    missing_platforms: boolean,
    wrong_formats: boolean
  },
  comments: string,
  approved: boolean,
  plan_data: object
}

Response:
{
  success: true,
  feedback: { id, timestamp, ... },
  message: "Feedback received. Thank you for helping improve our AI!"
}
```

### **GET /api/feedback/stats**
Get overall feedback statistics
```javascript
Response:
{
  total_feedback: number,
  approved_plans: number,
  approval_rate: string,
  avg_rating: string,
  vertical_breakdown: object,
  common_issues: object
}
```

### **GET /api/feedback/weights**
Get current learning weights
```javascript
Response:
{
  personas: { [key: string]: PersonaWeight },
  platforms: { [key: string]: PlatformWeight },
  formats: { [key: string]: FormatWeight },
  verticals: { [key: string]: VerticalData },
  last_updated: string
}
```

### **POST /api/feedback/learn**
Manually trigger learning engine analysis
```javascript
Response:
{
  success: true,
  message: "Learning analysis completed",
  weights: {
    personas_tracked: number,
    platforms_tracked: number,
    formats_tracked: number,
    verticals_tracked: number,
    last_updated: string
  }
}
```

### **GET /api/feedback/recommendations/:verticalKey**
Get AI recommendations for a specific vertical
```javascript
Response:
{
  has_sufficient_data: boolean,
  approval_rate: number,
  avg_rating: number,
  recommended_personas: Array<{ persona, count }>,
  personas_to_avoid: Array<{ persona, count }>,
  preferred_platforms: Array<{ platform, count }>
}
```

### **POST /api/feedback/adjust-personas**
Adjust persona scores based on learnings
```javascript
Request Body:
{
  personas: Array<Persona>,
  verticalKey: string
}

Response:
Array<{
  ...persona,
  adjusted_score: number,
  learning_confidence: number,
  learning_data: {
    selection_count: number,
    avg_rating: string,
    removal_rate: string
  }
}>
```

---

## 🎓 Learning Thresholds & Parameters

```javascript
// Minimum feedback before applying learnings
MIN_FEEDBACK_COUNT = 5

// High confidence threshold
HIGH_CONFIDENCE_COUNT = 20

// Learning rate (how aggressively to adjust)
LEARNING_RATE = 0.3 (30%)

// Confidence levels
CONFIDENCE = {
  HIGH: 0.9,
  MEDIUM: 0.6,
  LOW: 0.3
}
```

### **Score Calculation Formula:**
```javascript
success_score = (
  (average_rating / 5) * 0.5 +  // 50% weight on rating
  (approval_rate) * 0.5           // 50% weight on approval
) - (removal_rate * 0.3)          // Penalty for removals

normalized_score = clamp(success_score, 0, 1)
```

---

## 🔮 Future Enhancements

### **Phase 2: Advanced Learning (Next Steps)**

1. **A/B Testing**
   - Test different persona combinations
   - Compare rule engine vs. learned weights
   - Measure improvement over time

2. **Contextual Learning**
   - Learn seasonal patterns
   - Budget tier optimization
   - Geographic preferences

3. **Real-time Adaptation**
   - Adjust plans during editing
   - Suggest improvements based on patterns
   - Predict approval probability

4. **Multi-objective Optimization**
   - Balance reach vs. precision
   - Optimize for different KPIs
   - Learn user preferences

### **Phase 3: Production Migration**

1. **Database Migration**
   - Move from JSON to PostgreSQL
   - Implement feedback versioning
   - Add user tracking

2. **Advanced Analytics**
   - Cohort analysis
   - Conversion tracking
   - ROI prediction

3. **Integration**
   - Connect to campaign performance data
   - Learn from actual campaign results
   - Close the feedback loop

---

## 🧪 Testing the System

### **Test Flow:**

1. **Generate a test plan:**
   ```
   Visit: https://3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/ai-wizard
   Input: "launch new car, RM 200k"
   ```

2. **Review the generated plan**
   - Check personas (should include Car Enthusiast, Tech, etc.)
   - Review budget allocation
   - Note platform mix

3. **Provide feedback when modal appears:**
   - Rate overall: 4 stars
   - Rate audiences: 3 stars (check "wrong personas" if you see irrelevant ones)
   - Add comment: "Good overall but too many lifestyle personas"
   - Approve or skip

4. **View learning dashboard:**
   ```
   Visit: https://3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/learning-dashboard
   ```
   - Check feedback stats
   - See persona performance
   - Trigger learning manually

5. **Generate another plan:**
   - Input: "launch new electric vehicle, RM 200k"
   - Check if personas improved based on feedback
   - Personas with high scores should appear first
   - Personas with low scores should be deprioritized

---

## 📈 Expected Improvements

After **20+ feedback submissions**, the system should:

✅ **Prioritize high-performing personas** (85%+ success rate)
✅ **Avoid low-performing personas** (<30% success rate)
✅ **Optimize budget allocations** (learn preferred platform splits)
✅ **Improve approval rates** (+15-25% improvement expected)
✅ **Reduce common issues** (50% reduction in "wrong personas" flags)

---

## 🎯 Key Success Metrics

Track these in the Learning Dashboard:

1. **Approval Rate**: % of plans approved by users
   - Target: 70%+ (from baseline ~50%)

2. **Average Rating**: Mean star rating across all plans
   - Target: 4.0+ / 5.0

3. **Persona Accuracy**: Removal rate for selected personas
   - Target: <15% removal rate

4. **Issue Reduction**: Decrease in common feedback issues
   - Target: 50% reduction in "wrong personas" flags

5. **Learning Confidence**: % of personas with high confidence scores
   - Target: 60%+ personas with confidence >0.8

---

## 🚨 Important Notes

1. **Data Persistence**: Currently uses JSON files. Migrate to PostgreSQL for production.

2. **Learning Trigger**: Runs automatically after each feedback OR manually via dashboard.

3. **Confidence Threshold**: Learnings only apply with 5+ feedback entries to avoid overfitting.

4. **Smooth Updates**: 30% learning rate prevents wild swings from single feedback.

5. **Vertical Isolation**: Learnings are tracked separately per vertical (automotive, FMCG, etc.)

---

## 🔗 Access URLs

- **AI Wizard**: https://3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/ai-wizard
- **Learning Dashboard**: https://3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/learning-dashboard
- **Backend API**: http://localhost:5001/api/feedback/*

---

## 🎉 Summary

You now have a **fully functional self-learning media planner** that:

✅ Collects structured user feedback
✅ Analyzes patterns to identify what works
✅ Adjusts persona/platform/format weights automatically
✅ Improves future plan recommendations
✅ Provides transparency via Learning Dashboard
✅ Runs continuously without manual intervention

**Every user interaction makes the AI smarter!** 🧠✨
