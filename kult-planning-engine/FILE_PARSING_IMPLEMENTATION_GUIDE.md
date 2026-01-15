# 📄 File Parsing & Entity Extraction - Implementation Guide

## 🎯 Current Status

### ✅ What's Built
- **Upload Brief UI/UX**: Complete drag-and-drop interface
- **Campaign Brief Panel**: Real-time context display with auto-fill
- **Mock Processing**: Simulated file parsing workflow
- **State Management**: Brief data flows between components

### 🚧 What's Missing
- **Real File Parsing**: Extract text from PDF, DOCX, TXT files
- **Entity Extraction**: Identify campaign parameters from unstructured text
- **Validation & Confidence**: Score extraction accuracy
- **Error Handling**: Handle malformed or non-standard documents

---

## 💡 Smart Entity Extraction Options

### **Option 1: AI-Powered Extraction (RECOMMENDED)** ⭐

**Best for**: Unstructured, varied, real-world briefs

**Approach**: Use OpenAI GPT to extract entities from document text

**Pros**:
- ✅ **Handles any format** - Works with bullet points, tables, paragraphs, messy docs
- ✅ **Context-aware** - Understands "250K budget" vs "250K impressions" vs "250K audience"
- ✅ **Flexible** - Adapts to different writing styles and structures
- ✅ **Confidence scores** - Can indicate uncertainty for manual review
- ✅ **Multi-language support** - Can extract from Malay, Chinese, English briefs
- ✅ **Handles ambiguity** - Makes intelligent inferences

**Cons**:
- ❌ **API costs** - Each parsing call costs ~$0.01-0.05 depending on file size
- ❌ **Latency** - Takes 2-5 seconds per document
- ❌ **Requires API key** - Need OpenAI account

**Implementation**:
```javascript
// Example: AI-powered entity extraction
async function extractWithAI(documentText) {
  const prompt = `
Extract campaign brief information from this document:

${documentText}

Return JSON with these fields:
{
  "campaignName": string | null,
  "client": string | null,
  "product_brand": string | null,
  "campaign_objective": "Awareness" | "Traffic" | "Engagement" | "Conversion" | null,
  "industry": string | null,
  "budget_rm": number | null,
  "geography": string[] | null,
  "duration_weeks": number | null,
  "targetAudience": string | null,
  "devices": string[] | null,
  "channel_preference": "OTT" | "Social" | "Display" | "Balanced" | null,
  "confidence": {
    "campaignName": 0-1,
    "budget_rm": 0-1,
    // ... confidence scores for each field
  }
}

Rules:
- Extract exact values when clear
- Return null if information is missing or ambiguous
- For budget, convert to numbers (e.g., "RM 250K" → 250000)
- For duration, convert to weeks (e.g., "2 months" → 8)
- For geography, extract all mentioned locations as array
- Set confidence to 1.0 if certain, 0.5 if inferred, 0.0 if guessed
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Or gpt-4 for better accuracy
    messages: [
      { role: "system", content: "You are a campaign brief parser. Extract structured data from unstructured documents." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2 // Low temperature for consistent extraction
  });

  return JSON.parse(response.choices[0].message.content);
}
```

**Cost Estimation**:
- Average brief: 2,000 tokens (input) + 500 tokens (output)
- Cost with GPT-4o-mini: ~$0.00075 per brief
- Cost with GPT-4: ~$0.03 per brief
- **Recommendation**: Start with GPT-4o-mini, upgrade to GPT-4 if accuracy issues

---

### **Option 2: Pattern Matching + NLP (HYBRID)**

**Best for**: Cost-conscious, predictable brief formats

**Approach**: Use regex patterns for structured data, NLP for complex fields

**Pros**:
- ✅ **Fast** - No API latency
- ✅ **Free** - No API costs
- ✅ **Reliable for numbers** - Regex excellent for budgets, dates, currencies
- ✅ **Privacy** - All processing happens locally

**Cons**:
- ❌ **Limited flexibility** - Struggles with variations in phrasing
- ❌ **Manual maintenance** - Need to update patterns for new formats
- ❌ **Poor context awareness** - May confuse budget with impressions
- ❌ **Requires fallbacks** - Needs AI assist for complex fields

**Implementation**:
```javascript
// Example: Hybrid pattern matching
function extractWithPatterns(text) {
  const brief = {};

  // Budget extraction (reliable with regex)
  const budgetMatches = text.match(/(?:budget|cost|spend)[:\s]*RM\s*([\d,]+\.?\d*)\s*([KkMm])?/i);
  if (budgetMatches) {
    let amount = parseFloat(budgetMatches[1].replace(/,/g, ''));
    const multiplier = budgetMatches[2]?.toUpperCase();
    if (multiplier === 'K') amount *= 1000;
    if (multiplier === 'M') amount *= 1000000;
    brief.budget_rm = amount;
  }

  // Duration extraction (reliable with regex)
  const durationMatches = text.match(/(?:duration|period|campaign length)[:\s]*(\d+)\s*(week|month|day)/i);
  if (durationMatches) {
    let weeks = parseInt(durationMatches[1]);
    const unit = durationMatches[2].toLowerCase();
    if (unit === 'month') weeks *= 4;
    if (unit === 'day') weeks = Math.ceil(weeks / 7);
    brief.duration_weeks = weeks;
  }

  // Geography extraction (pattern matching + list lookup)
  const geoKeywords = ['Penang', 'Kedah', 'Johor', 'Selangor', 'Kuala Lumpur', 'KL', 'Nationwide'];
  const foundGeos = geoKeywords.filter(geo => 
    new RegExp(`\\b${geo}\\b`, 'i').test(text)
  );
  if (foundGeos.length > 0) {
    brief.geography = foundGeos;
  }

  // Objective extraction (keyword matching)
  const objectiveMap = {
    'awareness': ['awareness', 'brand', 'reach', 'visibility'],
    'traffic': ['traffic', 'visits', 'clicks', 'website'],
    'engagement': ['engagement', 'interaction', 'social', 'community'],
    'conversion': ['conversion', 'sales', 'leads', 'purchase', 'sign up']
  };
  
  for (const [objective, keywords] of Object.entries(objectiveMap)) {
    if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(text))) {
      brief.campaign_objective = objective.charAt(0).toUpperCase() + objective.slice(1);
      break;
    }
  }

  // For complex fields like targetAudience, campaignName, industry:
  // Fall back to AI extraction or prompt user
  brief.needsManualReview = ['campaignName', 'targetAudience', 'industry'];

  return brief;
}
```

---

### **Option 3: Pure Regex (BASIC)**

**Best for**: MVP, highly standardized brief templates

**Approach**: Only regex pattern matching

**Pros**:
- ✅ **Simplest** - Minimal dependencies
- ✅ **Fastest** - Instant parsing
- ✅ **Free** - No costs

**Cons**:
- ❌ **Very limited** - Only works with consistent formats
- ❌ **Fragile** - Breaks easily with variations
- ❌ **Low accuracy** - Many false positives/negatives
- ❌ **Not recommended** for production

---

## 🏗️ **Recommended Architecture: AI + Pattern Hybrid**

### **Best Practice Approach**:

1. **Parse document** to extract text
2. **Quick pattern matching** for structured fields (budget, duration, dates)
3. **AI extraction** for complex fields (objective, audience, campaign name)
4. **Confidence scoring** for all extractions
5. **User review** for low-confidence fields (<0.7)
6. **Save to brief** and auto-populate Campaign Brief Panel

### **Implementation Flow**:

```javascript
async function processUploadedFile(file) {
  setUploadState('processing');

  // Step 1: Parse document to text
  let documentText = '';
  if (file.type === 'application/pdf') {
    documentText = await parsePDF(file);
  } else if (file.type.includes('wordprocessingml')) {
    documentText = await parseDOCX(file);
  } else if (file.type === 'text/plain') {
    documentText = await parseTXT(file);
  }

  // Step 2: Quick pattern extraction (fast, cheap)
  const patternsExtracted = extractWithPatterns(documentText);

  // Step 3: AI extraction for remaining fields
  const aiExtracted = await extractWithAI(documentText);

  // Step 4: Merge results (patterns override AI for structured fields)
  const mergedBrief = {
    ...aiExtracted,
    ...patternsExtracted, // Pattern results take priority
    _rawText: documentText, // Keep for reference
    _extractionMethod: 'hybrid'
  };

  // Step 5: Validate and set confidence
  const validatedBrief = validateExtraction(mergedBrief);

  // Step 6: Update UI
  setBriefSummary({
    fileName: file.name,
    fileSize: (file.size / 1024).toFixed(2) + ' KB',
    extractedInfo: validatedBrief
  });
  setBrief(validatedBrief);
  setUploadState('processed');
}
```

---

## 📦 **Required Libraries**

### **For File Parsing**:

#### PDF Parsing:
```bash
npm install pdf-parse
```
```javascript
import pdfParse from 'pdf-parse';

async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = await pdfParse(buffer);
  return data.text;
}
```

#### DOCX Parsing:
```bash
npm install mammoth
```
```javascript
import mammoth from 'mammoth';

async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
```

#### TXT Parsing:
```javascript
async function parseTXT(file) {
  return await file.text();
}
```

### **For AI Extraction**:
```bash
npm install openai
```
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only if doing client-side
});
```

**⚠️ Security Note**: For production, implement AI extraction on backend API to protect API keys.

---

## 🔐 **Security & Privacy Considerations**

### **Client-Side vs Server-Side Parsing**

#### **Client-Side Parsing** (Current setup):
- **Pros**: Fast, no server load, privacy-friendly
- **Cons**: Exposes API keys if using AI, limited to browser capabilities
- **Recommendation**: Use for file parsing (PDF/DOCX/TXT), do AI extraction server-side

#### **Server-Side Parsing** (Recommended for AI):
- **Pros**: Secure API keys, more powerful processing, can use advanced NLP libraries
- **Cons**: Requires backend API endpoint, file upload overhead
- **Recommendation**: Implement `/api/brief/parse` endpoint for AI extraction

### **Recommended Setup**:
```
Client-Side:
1. User uploads file
2. Parse to text (PDF/DOCX/TXT)
3. Send text to backend API

Server-Side:
4. Receive document text
5. Extract with AI + patterns
6. Return structured brief
7. Client updates Campaign Brief Panel
```

---

## 🎯 **Implementation Priority**

### **Phase 1: Basic File Parsing** (1-2 days)
- [ ] Install pdf-parse, mammoth libraries
- [ ] Implement parsePDF(), parseDOCX(), parseTXT()
- [ ] Test with sample documents
- [ ] Update processUploadedFile() to use real parsing
- [ ] Show extracted text in console

### **Phase 2: Pattern Matching** (1 day)
- [ ] Build regex patterns for budget, duration, geography
- [ ] Implement extractWithPatterns()
- [ ] Test with various brief formats
- [ ] Update Campaign Brief Panel with extracted data

### **Phase 3: AI Extraction** (2-3 days)
- [ ] Set up OpenAI API (or use existing)
- [ ] Create /api/brief/parse backend endpoint
- [ ] Implement AI extraction prompt
- [ ] Test accuracy with real briefs
- [ ] Add confidence scoring
- [ ] Handle low-confidence fields with user review UI

### **Phase 4: User Review & Validation** (1-2 days)
- [ ] Add "Review Extraction" UI step
- [ ] Show low-confidence fields highlighted
- [ ] Allow inline editing before proceeding
- [ ] Add "Mark as Reviewed" confirmation

### **Total Estimated Time**: 5-8 days for full implementation

---

## 💰 **Cost Analysis**

### **AI Extraction Costs** (using GPT-4o-mini):
- Per brief: ~$0.00075
- 100 briefs/month: ~$0.075
- 1,000 briefs/month: ~$0.75
- 10,000 briefs/month: ~$7.50

**Verdict**: Extremely cost-effective, especially with GPT-4o-mini

### **Alternative: Fine-tuned Model**:
- Fine-tune on 500+ real briefs: One-time cost ~$50-100
- Per brief after fine-tuning: ~$0.0005
- **ROI**: Pays off after ~50,000 briefs

---

## 🧪 **Testing Strategy**

### **Test Cases to Prepare**:
1. **Well-structured brief** - Clean format, all fields present
2. **Messy brief** - Paragraphs, no clear sections
3. **Incomplete brief** - Missing key fields (budget, geography)
4. **Multi-page brief** - Tables, images, long descriptions
5. **Mixed language brief** - English + Malay
6. **Budget variations** - "RM 250K", "$250,000", "250000", "Quarter million"
7. **Geography variations** - "KL", "Kuala Lumpur", "Klang Valley", "Northern states"
8. **Duration variations** - "8 weeks", "2 months", "Q1 2025", "Jan-Mar"

### **Accuracy Metrics**:
- **Precision**: % of extracted fields that are correct
- **Recall**: % of present fields that were extracted
- **Confidence Correlation**: Do confidence scores match accuracy?

**Target**: 90%+ precision and 85%+ recall for production readiness

---

## 📝 **Next Steps**

### **Immediate Actions**:
1. **Decision**: Choose extraction approach (Recommend: AI + Pattern Hybrid)
2. **Setup**: Install pdf-parse and mammoth libraries
3. **Implement**: Basic file parsing (Phase 1)
4. **Test**: Upload real briefs and inspect extracted text
5. **Iterate**: Add pattern matching, then AI extraction

### **For AI Extraction**:
- Need OpenAI API key (already have one? Check /api docs)
- Decide: Client-side or server-side extraction?
- Test with various brief formats
- Tune prompt for best accuracy

---

## 🎯 **Success Criteria**

Upload Brief feature is **production-ready** when:
- ✅ Users can upload PDF/DOCX/TXT briefs
- ✅ Text is extracted accurately (90%+ success rate)
- ✅ Key fields extracted automatically (budget, geography, objective)
- ✅ Campaign Brief Panel auto-populates with extracted data
- ✅ Users can review and edit extractions
- ✅ Low-confidence fields flagged for manual review
- ✅ Extraction completes in <10 seconds
- ✅ Clear error messages for unsupported files

---

## 📚 **Reference Documentation**

### **Libraries**:
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF text extraction
- [mammoth](https://www.npmjs.com/package/mammoth) - DOCX conversion
- [OpenAI API](https://platform.openai.com/docs/api-reference) - AI extraction

### **Related Files**:
- `/frontend/src/pages/UploadBrief.jsx` - Upload UI (line 49-75: processUploadedFile)
- `/frontend/src/components/CampaignBriefPanel.jsx` - Brief display component
- `/frontend/src/pages/AIWizard.jsx` - AI conversation logic for reference

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-09  
**Status**: Awaiting Phase 1 Implementation  
**Recommended Approach**: **AI + Pattern Hybrid** ⭐
