# Persona Matching Issues & Solutions

## Problem Summary
The AI (GPT-4o-mini) is not correctly suggesting "Golf Fans" persona for golf-related campaigns, despite multiple explicit instructions.

##  What We've Tried

### Attempt 1: Added Golf Fans to Backend Persona Lists ✅
- **Commit**: cb58c6f
- **What**: Added "Golf Fans" to both persona lists in backend (lines 392 & 661)
- **Result**: Golf Fans now in database, but AI still doesn't suggest it

### Attempt 2: Defined API_BASE_URL for Feedback ✅  
- **Commit**: cb58c6f
- **What**: Added `const API_BASE_URL = '/api'` in AIWizard.jsx
- **Result**: Fixed ReferenceError, feedback feature now works

### Attempt 3: Enforced Exact Persona Names ⚠️
- **Commit**: b62745f
- **What**: Added instruction to use EXACT names (not rephrase)
- **Result**: AI still rephrases to "Golf Enthusiasts"

### Attempt 4: Added Keyword Matching Rules ⚠️
- **Commit**: 5b80cc0
- **What**: golf → Golf Fans, cars → Automotive Enthusiasts, etc.
- **Result**: AI ignores keyword mapping

### Attempt 5: Made Matching MANDATORY (MUST include) ⚠️
- **Commit**: e2ef697
- **What**: Changed "should" to "MUST include Golf Fans"
- **Result**: AI still suggests other personas

### Attempt 6: Moved Rule to Top-Level CRITICAL Section ⚠️
- **Commit**: dcd0232
- **What**: Put golf → Golf Fans rule in prominent CRITICAL section
- **Result**: AI still ignores

### Attempt 7: Added Example Conversation ⚠️
- **Commit**: 74799c8
- **What**: Full example showing "Golf Fans" suggestion for golf campaign
- **Result**: **AI HALLUCINATES "Sports Enthusiasts" (doesn't exist!)**

## Root Cause Analysis

The issue is **GPT-4o-mini semantic interpretation**:
1. Model sees "golf tournament sponsorship"
2. Interprets as high-level corporate/business event
3. Suggests business-related personas (Corporate, Affluent, Professional)
4. **Ignores specific instructions** to match "golf" → "Golf Fans"
5. **Even invents personas** like "Sports Enthusiasts" not in database

## Current Workaround

### Option A: User Manual Selection
Users can manually type "Golf Fans" when asked about audience, and the system will accept it.

Example:
```
AI: "Who should we target?"
User: "Golf Fans, Luxury Buyers"
AI: ✅ "Great! Golf Fans and Luxury Buyers..."
```

### Option B: Post-Processing (Recommended)
Add backend post-processing to detect keywords and inject correct personas:

```javascript
// In backend/routes/ai-chat.js
function injectKeywordPersonas(conversationHistory, suggestedPersonas) {
  const fullConversation = conversationHistory.map(m => m.content).join(' ').toLowerCase();
  
  const keywordMap = {
    'golf': 'Golf Fans',
    'tournament': 'Golf Fans',
    'automotive': 'Automotive Enthusiasts',
    'car': 'Automotive Enthusiasts',
    'property': 'Home Buyers',
    'epl': 'EPL Fans',
    'football': 'EPL Fans'
  };
  
  for (const [keyword, persona] of Object.entries(keywordMap)) {
    if (fullConversation.includes(keyword) && !suggestedPersonas.includes(persona)) {
      // Replace first generic persona with keyword persona
      suggestedPersonas[0] = persona;
      break;
    }
  }
  
  return suggestedPersonas;
}
```

## Next Steps

1. **Immediate**: Document this issue in PR
2. **Short-term**: Implement Option B (post-processing)
3. **Medium-term**: Test with GPT-4o (more instruction-following) instead of mini
4. **Long-term**: Build persona matching rules in frontend

## Testing

To verify Golf Fans works when manually specified:
```bash
curl -X POST http://localhost:5001/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Golf Fans and Luxury Buyers",
    "conversationHistory": [...],
    "brief": {"currentStep": 2}
  }'
```

## Commits Reference
- cb58c6f: Add Golf Fans persona and fix feedback API_BASE_URL
- b62745f: Enforce exact persona names in Step 2
- 5b80cc0: Add keyword-to-persona matching guidance
- 7d90cd3: Improve persona keyword matching with history check
- e2ef697: ENFORCE primary persona for keyword matches
- dcd0232: Move keyword-persona rule to top-level CRITICAL section
- 74799c8: Add explicit Golf Fans example conversation
