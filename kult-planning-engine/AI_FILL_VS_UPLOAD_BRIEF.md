# AI Fill vs Upload Brief - Feature Comparison

## Overview

The KULT Planning Engine has **TWO different AI features** that serve different purposes. This document clarifies the difference.

---

## 🧠 Feature 1: "Let AI Fill This Step For Me" (IN WIZARD)

**Location**: Inside the "Build Your Plan" wizard, on each step

**Purpose**: Progressive AI assistance as you build your campaign plan step-by-step

### How It Works

1. User starts filling the wizard manually
2. At any step, user clicks **"Let AI fill this step for me"**
3. AI analyzes what user has **already entered** in previous steps
4. AI generates smart recommendations for the **current step only**
5. User can accept, edit, or ignore the suggestion

### Example Flow

```
Step 1: User enters "Beauty" industry + "Awareness" objective
        ↓
Step 2: User clicks "Let AI fill this step for me"
        ↓
        AI analyzes: "Beauty + Awareness"
        AI recommends: "Fashion Icons, Young Working Adult, Youth Mom" (from playbook)
        ↓
Step 2: User reviews AI suggestions, selects 3 personas
        ↓
Step 3: User clicks "Let AI fill this step for me"
        ↓
        AI analyzes: "Beauty + Awareness + Fashion Icons/Young Adult/Youth Mom"
        AI recommends: "Focus on Klang Valley and Penang (urban, female-heavy markets)"
        ↓
Step 3: User accepts "Klang Valley"
```

### Step-Specific AI Assistance

| Step | AI Input (What it knows) | AI Output (What it suggests) |
|------|--------------------------|------------------------------|
| **1. Campaign Info** | Nothing yet | Campaign name, objective, industry |
| **2. Audience** | Industry + Objective | 3-5 personas from playbook |
| **3. Geography** | Industry + Personas | Geographic focus (Nationwide/Regional/States) |
| **4. Budget** | Industry + Objective | Budget range + buying preference |
| **5. Formats** | Objective | Recommended ad formats (Video/Display/etc.) |
| **6. Sites** | Industry + Personas | Recommended sites/channels |

### Key Characteristics

✅ **Progressive**: Helps at each step, building on previous inputs  
✅ **Contextual**: Uses what you've already entered  
✅ **Non-blocking**: You can ignore and fill manually  
✅ **Educational**: Users learn from AI suggestions  
✅ **Playbook-driven**: Uses KULT industry playbook data  

### API Call

```javascript
POST /api/ai-chat
{
  "message": "For my Beauty/Awareness campaign, suggest 3-5 personas",
  "brief": {
    "industry": "beauty",
    "campaign_objective": "Awareness"
  }
}
```

**Response**: AI returns text recommendations, user manually selects from wizard UI

---

## 📄 Feature 2: "Upload Brief" (SEPARATE PAGE)

**Location**: Separate page/feature (not yet built in this wizard)

**Purpose**: Batch extraction of ALL campaign details from a document at once

### How It Works

1. User uploads a campaign brief document (PDF, Word, etc.)
2. AI reads the **entire document**
3. AI extracts ALL campaign details in one go:
   - Campaign name, objective, industry
   - Target audience / personas
   - Geography
   - Budget
   - Dates
   - Key messages
   - Channel preferences
4. AI pre-fills the **entire wizard** with extracted data
5. User reviews and adjusts as needed

### Example Flow

```
User uploads: "Q3_2026_Beauty_Campaign_Brief.pdf"
        ↓
AI reads document content:
  "Campaign Name: Glow & Shine Spring Launch
   Objective: Brand Awareness
   Industry: Beauty & Cosmetics
   Target: Women 18-35, urban, fashion-conscious
   Budget: RM 150,000
   Geography: Klang Valley, Penang
   Dates: March 1 - April 30, 2026
   Formats: Video ads, social content, display banners
   Channels: Instagram, TikTok, beauty websites"
        ↓
AI extracts structured data:
  {
    campaignName: "Glow & Shine Spring Launch",
    objective: "Awareness",
    industry: "beauty",
    selectedPersonas: ["Fashion Icons", "Young Working Adult"],
    geoType: "custom",
    customGeo: "Klang Valley, Penang",
    totalBudget: "150000",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    selectedFormats: ["instream", "native", "banner"],
    selectedSites: ["meta", "tiktok", "nona"]
  }
        ↓
Wizard opens with ALL 7 steps pre-filled
        ↓
User reviews each step, makes adjustments, completes wizard
```

### Key Characteristics

✅ **Batch extraction**: All details at once  
✅ **Document parsing**: Reads PDF/Word/Text  
✅ **Time-saving**: Skips manual entry  
✅ **Full wizard population**: All 7 steps filled  
✅ **Review-and-adjust**: User still has control  

### API Call (Conceptual)

```javascript
POST /api/upload-brief
{
  "file": <file upload>,
  "fileType": "application/pdf"
}
```

**Response**: Structured JSON with all wizard fields populated

---

## 🔀 Key Differences

| Feature | "Let AI Fill This Step" | "Upload Brief" |
|---------|------------------------|----------------|
| **Location** | Inside wizard, per step | Separate upload page |
| **Scope** | ONE step at a time | ALL steps at once |
| **Input** | Previous wizard steps | Uploaded document |
| **Use Case** | Progressive assistance | Fast bulk import |
| **AI Model** | Chat-based, conversational | Document extraction |
| **User Control** | High (step-by-step) | Medium (batch review) |
| **When to Use** | Building plan from scratch | Have existing brief doc |

---

## 📊 Use Case Scenarios

### Scenario 1: New Campaign (No Brief Document)

**User has**: Just an idea ("I want to launch a new car")  
**Best approach**: Use "Let AI fill this step" progressively

1. User enters basic info in Step 1
2. AI helps suggest personas in Step 2
3. AI helps with geography in Step 3
4. Continue step-by-step with AI guidance

### Scenario 2: Client Brief Document

**User has**: PDF/Word brief from client  
**Best approach**: Use "Upload Brief" to pre-fill entire wizard

1. User uploads client brief document
2. AI extracts all details instantly
3. Wizard opens with all steps pre-filled
4. User reviews and adjusts as needed

### Scenario 3: Hybrid Approach

**User has**: Partial information + document  
**Best approach**: Upload brief first, then use AI fill for missing steps

1. Upload brief → pre-fills Steps 1-4
2. Step 5 (Formats) is empty → click "Let AI fill"
3. Step 6 (Sites) is empty → click "Let AI fill"
4. Complete and finalize

---

## 🛠️ Implementation Status

### "Let AI Fill This Step For Me" ✅ **IMPLEMENTED**

- ✅ UI buttons on all 6 steps (Steps 1-6)
- ✅ Step-specific prompt generation
- ✅ Integration with `/api/ai-chat`
- ✅ Loading states and error handling
- ✅ Contextual recommendations
- ✅ Budget auto-apply with confirmation
- ✅ Prerequisite validation (alerts if previous steps incomplete)

**Test it**: https://3002-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai/build-plan

### "Upload Brief" ❌ **NOT YET BUILT**

This is a separate feature that would require:

- [ ] Document upload UI (PDF/Word parser)
- [ ] Backend document extraction API
- [ ] Full wizard state population logic
- [ ] Document text extraction (OCR if needed)
- [ ] Entity extraction for all wizard fields
- [ ] Wizard pre-fill and redirect

**Note**: This is a future enhancement, not part of the current wizard.

---

## 💡 User Communication

### What to Tell Users

**When they see "Let AI fill this step for me"**:

> "The AI can suggest recommendations for this step based on what you've already entered. For example, if you selected 'Beauty' as your industry, the AI will recommend relevant audience personas from our playbook. You can accept, edit, or ignore the suggestions."

**When they ask about uploading a brief**:

> "If you have an existing campaign brief document (PDF or Word), we have a separate 'Upload Brief' feature that can extract all the details at once and pre-fill the entire wizard. This is different from the step-by-step AI assistance."

---

## 🎯 Summary

- **"Let AI fill this step for me"** = Progressive, step-by-step AI guidance **(LIVE NOW)**
- **"Upload Brief"** = Batch document extraction and full wizard pre-fill **(FUTURE FEATURE)**
- Both are valuable, serve different use cases
- Current wizard focuses on progressive assistance
- Upload Brief would be a separate workflow

---

**Questions?**

If users ask: "Can I upload my brief?", the answer is:

> "Not yet in this wizard. The 'Let AI fill this step' feature helps you build your plan progressively by analyzing what you've entered so far. A separate 'Upload Brief' feature for bulk document import is planned for a future release."
