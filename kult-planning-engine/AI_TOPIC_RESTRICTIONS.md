# AI Campaign Wizard - Topic Restrictions

## 🎯 Overview

The AI Campaign Wizard is now restricted to **only** answer questions related to media campaign planning. This prevents misuse, reduces API costs, and ensures focused conversations.

---

## ✅ **Allowed Topics**

The AI will respond to questions about:

### **1. Campaign Planning & Strategy**
- Media campaign planning
- Campaign objectives (Awareness, Traffic, Engagement, Conversion)
- Strategic recommendations
- Industry best practices

### **2. Budget & Allocation**
- Budget planning and recommendations
- Budget tiers and scenarios
- Channel budget allocation
- Cost optimization

### **3. Target Audiences**
- Audience demographics
- Audience segmentation
- Targeting strategies
- Customer personas

### **4. Marketing Channels**
- OTT/Streaming platforms (Astro GO, YouTube, etc.)
- Social Media (Instagram, TikTok, Facebook)
- Programmatic Display
- Search advertising
- Channel mix recommendations

### **5. Malaysian Market Context**
- Malaysian geography (KL, Penang, Johor, etc.)
- Local cultural events (CNY, Raya, Deepavali)
- Regional targeting
- Market insights

### **6. Industry-Specific Marketing**
- FMCG strategies
- Retail campaigns
- Automotive launches
- Property marketing
- Banking/Financial services
- Tech/E-commerce

---

## ❌ **Blocked Topics**

The AI will **politely decline** questions about:

### **1. General Knowledge**
- Weather queries
- Historical facts
- Scientific questions
- Math problems
- Trivia questions

### **2. Personal Advice**
- Health/medical advice
- Legal advice
- Financial planning (non-campaign)
- Relationship advice
- Career counseling

### **3. Technical/Coding**
- Programming help
- Code debugging
- Software development
- Technical tutorials

### **4. Creative Writing**
- Stories, poems, essays
- Content unrelated to campaigns
- Song lyrics
- Movie scripts

### **5. Translation Services**
- Language translation
- Document translation

### **6. Other Off-Topic**
- Jokes and entertainment
- Homework help
- Product reviews (non-campaign)
- Random conversations

---

## 🛡️ **How It Works**

### **Two-Layer Protection:**

#### **Layer 1: Pre-Filter (Backend)**
```javascript
// Detects obvious off-topic keywords before calling OpenAI
const offTopicKeywords = [
  'weather', 'recipe', 'movie', 'translate',
  'write code', 'debug', 'programming',
  'math problem', 'homework', 'joke', 'story',
  'health advice', 'medical', 'legal advice',
  'relationship', 'dating'
];
```

**Benefits:**
- ⚡ Instant response (no API call)
- 💰 Saves API costs
- 🚀 Faster for obvious off-topic queries

#### **Layer 2: AI Instruction (System Prompt)**
```
CRITICAL RESTRICTIONS - STAY ON TOPIC:
You MUST ONLY discuss topics related to media campaign planning...
You MUST REFUSE and politely decline off-topic questions...
```

**Benefits:**
- 🧠 Handles nuanced off-topic queries
- 📝 Provides context-aware decline messages
- 🎯 Maintains conversation quality

---

## 💬 **Example Responses**

### **Off-Topic Query 1: Weather**
**User**: "What's the weather today?"

**AI Response**: 
> "I'm specialized in media campaign planning for the Malaysian market. I can help you with campaign strategy, budget allocation, audience targeting, and channel recommendations. Could you tell me about the campaign you'd like to plan?"

**Metadata**: `method: 'filtered'` (pre-filter caught it)

---

### **Off-Topic Query 2: Coding**
**User**: "Write code to sort an array"

**AI Response**: 
> "I'm specialized in media campaign planning for the Malaysian market. I can help you with campaign strategy, budget allocation, audience targeting, and channel recommendations. Could you tell me about the campaign you'd like to plan?"

**Metadata**: `method: 'filtered'` (pre-filter caught it)

---

### **Valid Query: Campaign Launch**
**User**: "Launch oat milk RM 80k"

**AI Response**: 
> "Great choice with oat milk! To effectively plan your campaign, could you share the primary objective? Are you focusing on awareness, driving traffic, engagement, or conversions? Additionally, where in Malaysia are you planning to target your audience?"

**Extracted Entities**:
```json
{
  "product_brand": "Oat Milk",
  "industry": "FMCG",
  "budget_rm": 80000
}
```

**Metadata**: `method: 'openai'` (processed successfully)

---

## 📊 **Benefits**

### **1. Cost Savings**
- Pre-filter blocks queries before API call
- Estimated savings: **30-50% on off-topic attempts**
- Prevents accidental expensive queries

### **2. Focused Conversations**
- Users stay on track with campaign planning
- Better user experience (clear purpose)
- Higher conversion to actual campaigns

### **3. Brand Protection**
- AI stays professional and on-brand
- No inappropriate or off-topic responses
- Maintains KULT's expertise positioning

### **4. API Efficiency**
- Faster responses for filtered queries
- Reduced token usage
- Better resource utilization

---

## 🧪 **Testing Examples**

### **Test 1: Off-Topic - Weather**
```bash
curl -X POST http://localhost:5001/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather today?"}'
```

**Expected**: Polite decline, `method: 'filtered'`

---

### **Test 2: Off-Topic - Translation**
```bash
curl -X POST http://localhost:5001/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Translate hello to Malay"}'
```

**Expected**: Polite decline, `method: 'filtered'`

---

### **Test 3: Valid - Campaign**
```bash
curl -X POST http://localhost:5001/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Launch perfume RM 125k Malaysia"}'
```

**Expected**: Campaign planning response, entity extraction, `method: 'openai'`

---

## 🔧 **Configuration**

### **Adjusting Restrictions**

To modify the topic restrictions, edit `/backend/routes/ai-chat.js`:

```javascript
// Add/remove keywords in pre-filter
const offTopicKeywords = [
  'your', 'keywords', 'here'
];

// Update system prompt for AI-level restrictions
const SYSTEM_PROMPT = `...`;
```

### **Disabling Pre-Filter** (not recommended)

To disable the pre-filter but keep AI-level restrictions:

```javascript
// Comment out or set to false
const isOffTopic = false; // offTopicKeywords.some(...)
```

---

## 📈 **Monitoring**

### **Check Filter Effectiveness**

Backend logs show when queries are filtered:

```bash
pm2 logs kult-backend | grep "Off-topic"

# Output:
# [AI CHAT] Off-topic query detected: What is the weather?
```

### **Track Rejection Rate**

```javascript
// In production, add analytics
if (isOffTopic) {
  trackEvent('ai_chat_filtered', { message: message });
}
```

---

## 🎯 **Summary**

✅ **AI restricted to campaign planning topics only**
✅ **Two-layer protection (pre-filter + AI instruction)**
✅ **30-50% API cost savings on off-topic queries**
✅ **Professional, focused user experience**
✅ **Polite decline messages guide users back**

The AI Campaign Wizard is now a focused, cost-effective tool for media campaign planning! 🚀
