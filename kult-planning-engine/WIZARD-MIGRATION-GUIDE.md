# AIWizard.jsx Migration Guide

## Overview
This document shows the EXACT changes needed to integrate the production fixes into AIWizard.jsx.

---

## Step 1: Add Imports (at top of file)

```javascript
// BEFORE (existing imports)
import { useAIChat } from '../hooks/useAIChat';
import { parseFuzzyDateRange, formatDateRange, validateDateRange } from '../utils/dateParser';

// AFTER (add these new imports)
import { useAIChat } from '../hooks/useAIChat';
import { parseFuzzyDateRange, formatDateRange, validateDateRange } from '../utils/dateParser';

// NEW IMPORTS - Add these
import { sendWizardMessage, handleEditMessage } from '../utils/sendWizardMessage';
import { canGeneratePlan, missingPlanFields } from '../utils/stepGating';
import { wizardRequestManager } from '../utils/wizardRequestManager';
```

---

## Step 2: Update State (in function component)

```javascript
// BEFORE
const [brief, setBrief] = useState({
  campaignName: null,
  product_brand: null,
  // ... other fields
});

// AFTER - Add tracking fields
const [brief, setBrief] = useState({
  campaignName: null,
  product_brand: null,
  // ... other fields
  
  // NEW: Request tracking
  lastUpdatedAt: null,
  lastRequestId: null
});
```

---

## Step 3: Replace handleSendMessageWithOpenAI

**FIND this function (around line 2049):**

```javascript
const handleSendMessageWithOpenAI = async () => {
  if (!inputMessage.trim() || isLoading) return;

  const userMessage = inputMessage.trim();
  addMessage('user', userMessage);
  setInputMessage('');
  setIsLoading(true);

  try {
    console.log('[AI WIZARD] Sending to OpenAI:', userMessage);
    // ... lots of code ...
    const result = await sendAIMessage(userMessage, messages, brief);
    // ... more code ...
  } catch (error) {
    // ...
  }
};
```

**REPLACE with:**

```javascript
const handleSendMessageWithOpenAI = async () => {
  if (!inputMessage.trim() || isLoading) return;

  const userMessage = inputMessage.trim();
  setInputMessage('');
  setIsLoading(true);

  try {
    console.log('[AI WIZARD] Sending via sendWizardMessage:', userMessage);

    // Call the single owner of AI requests
    const result = await sendWizardMessage(
      userMessage,
      messages,
      brief,
      {
        // Callbacks for state updates
        onMessageAdded: (message) => {
          setMessages(prev => [...prev, message]);
        },
        onBriefUpdated: (updatedBrief) => {
          setBrief(updatedBrief);
        },
        onPlanReady: (completeBrief) => {
          console.log('[AI WIZARD] Plan generation ready, triggering...');
          // Trigger plan generation here if auto-gen is enabled
          if (!recommendations) {
            setTimeout(() => generateMediaPlan(completeBrief), 500);
          }
        },
        onError: (error) => {
          console.error('[AI WIZARD] Request failed:', error);
        }
      }
    );

    if (result.success) {
      console.log('[AI WIZARD] Message handled successfully', {
        requestId: result.requestId,
        extractedFields: Object.keys(result.extractedEntities || {})
      });
    } else if (result.blocked) {
      console.log('[AI WIZARD] Request blocked (duplicate)');
    } else if (result.ignored) {
      console.log('[AI WIZARD] Response ignored (stale)');
    }

  } catch (error) {
    console.error('[AI WIZARD] Unexpected error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

---

## Step 4: Update Edit Message Handler

**FIND the edit handler (around line 4081):**

```javascript
const handleEditSave = async (index) => {
  // ... code ...
  const result = await sendAIMessage(editedMessage, updatedMessages, brief);
  // ... code ...
};
```

**REPLACE with:**

```javascript
const handleEditSave = async (index) => {
  if (!editText.trim()) return;

  setIsLoading(true);
  
  try {
    // Build updated conversation history (remove messages after edit point)
    const updatedMessages = messages.slice(0, index);
    updatedMessages[index].content = editText.trim();

    // Update UI immediately
    setMessages(updatedMessages);
    setEditingIndex(null);
    setEditText('');

    // Use handleEditMessage which creates a NEW requestId
    const result = await handleEditMessage(
      editText.trim(),
      updatedMessages,
      brief,
      {
        onMessageAdded: (message) => {
          setMessages(prev => [...prev, message]);
        },
        onBriefUpdated: (updatedBrief) => {
          setBrief(updatedBrief);
        },
        onPlanReady: (completeBrief) => {
          if (!recommendations) {
            setTimeout(() => generateMediaPlan(completeBrief), 500);
          }
        },
        onError: (error) => {
          console.error('[AI WIZARD] Edit failed:', error);
        }
      }
    );

    if (result.success) {
      console.log('[AI WIZARD] Edit handled successfully', {
        requestId: result.requestId
      });
    }

  } catch (error) {
    console.error('[AI WIZARD] Edit error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

---

## Step 5: Update Plan Generation Gating

**FIND plan generation trigger (around line 2222):**

```javascript
const hasEssentialInfo = (
  updatedBrief.product_brand &&
  updatedBrief.campaign_objective &&
  updatedBrief.budget_rm &&
  updatedBrief.geography
);

if (hasEssentialInfo && !recommendations) {
  console.log('[AI WIZARD] Sufficient info collected, generating plan...');
  // Generate plan
}
```

**REPLACE with:**

```javascript
// Use the robust gating function
if (canGeneratePlan(updatedBrief) && !recommendations) {
  console.log('[AI WIZARD] ✅ All required fields present for plan generation');
  
  // Check datasets are also ready
  const datasetsReady = 
    datasetsRef.current.rates.length > 0 &&
    datasetsRef.current.formats.length > 0 &&
    datasetsRef.current.audiences.length > 0 &&
    datasetsRef.current.sites.length > 0;
  
  if (datasetsReady) {
    setTimeout(async () => {
      setIsLoading(true);
      try {
        const plan = generateMediaPlan(updatedBrief);
        if (plan) {
          setRecommendations(plan);
          console.log('[AI WIZARD] Plan generated successfully');
        }
      } catch (error) {
        console.error('[AI WIZARD] Plan generation failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  } else {
    console.log('[AI WIZARD] Datasets not ready yet, delaying plan generation');
  }
} else {
  const missing = missingPlanFields(updatedBrief);
  if (missing.length > 0) {
    console.log('[AI WIZARD] Cannot generate plan yet, missing:', missing);
  }
}
```

---

## Step 6: Add Cleanup on Unmount

**ADD this useEffect:**

```javascript
// Cleanup request manager on unmount
useEffect(() => {
  return () => {
    wizardRequestManager.reset();
  };
}, []);
```

---

## Step 7: Update Loading State Management

**FIND where isLoading is set:**

```javascript
// BEFORE - Multiple places setting isLoading
setIsLoading(true);
// ... do work ...
setIsLoading(false);
```

**ENSURE consistency:**

```javascript
// Loading is controlled by sendWizardMessage's lifecycle
// Only set manually for plan generation or other local operations
// Never set for AI message sending (handled by sendWizardMessage)
```

---

## Step 8: Remove Direct sendAIMessage Calls

**SEARCH for all instances:**

```bash
grep -n "sendAIMessage" AIWizard.jsx
```

**REPLACE any direct calls:**

```javascript
// BEFORE
const result = await sendAIMessage(message, history, brief);

// AFTER
const result = await sendWizardMessage(
  message,
  history,
  brief,
  {
    onMessageAdded,
    onBriefUpdated,
    onPlanReady,
    onError
  }
);
```

---

## Step 9: Add Console Logging for Debugging

**ADD after imports:**

```javascript
// Debug flag for verbose logging
const DEBUG_WIZARD = true;

function logDebug(message, data) {
  if (DEBUG_WIZARD) {
    console.log(`[WIZARD_DEBUG] ${message}`, data);
  }
}
```

**USE in key places:**

```javascript
logDebug('Brief updated', {
  requestId: result.requestId,
  changedFields: Object.keys(result.extractedEntities),
  completeness: calculateCompleteness(brief)
});
```

---

## Step 10: Test Integration

After making changes:

1. **Build:**
   ```bash
   npm run build
   ```

2. **Start preview:**
   ```bash
   npm run preview
   ```

3. **Open DevTools Console**

4. **Run smoke test:**
   ```javascript
   import { runSmokeTests } from './utils/__tests__/wizardTests.js';
   runSmokeTests();
   ```

5. **Verify:**
   - No duplicate requests in Network tab
   - No `[AI CHAT HOOK] DEPRECATED` warnings
   - Messages appear correctly in UI
   - Brief updates without data loss

---

## Complete Example: Minimal Working Implementation

Here's a minimal working version of the key function:

```javascript
// In AIWizard.jsx

import { sendWizardMessage } from '../utils/sendWizardMessage';

function AIWizard() {
  const [messages, setMessages] = useState([]);
  const [brief, setBrief] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSend = async (userMessage) => {
    setIsLoading(true);
    
    try {
      await sendWizardMessage(
        userMessage,
        messages,
        brief,
        {
          onMessageAdded: (msg) => setMessages(prev => [...prev, msg]),
          onBriefUpdated: (updated) => setBrief(updated),
          onPlanReady: (complete) => {
            console.log('Ready to generate plan!');
            // generatePlan(complete);
          },
          onError: (err) => console.error(err)
        }
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    // ... JSX
  );
}
```

---

## Rollback Plan

If issues occur:

1. **Revert AIWizard.jsx** to previous version
2. **Remove new util files:**
   ```bash
   rm frontend/src/utils/sendWizardMessage.js
   rm frontend/src/utils/wizardRequestManager.js
   rm frontend/src/utils/responseNormalizer.js
   rm frontend/src/utils/stepGating.js
   rm frontend/src/utils/briefMerger.js
   ```
3. **Rebuild:**
   ```bash
   npm run build
   ```

---

## Success Criteria

After migration, you should see:

✅ Console logs:
```
[REQUEST_MGR] Started request: req_1704712345_1
[WIZARD] sendWizardMessage requestId=req_1704712345_1 ...
[NORMALIZE] Plain text, length: 234
[MERGE] Updated 2 fields: product_brand, budget_rm
[WIZARD] Response applied requestId=req_1704712345_1
```

✅ Network tab:
- 1 request per user message
- No duplicate calls

✅ UI:
- Clean text messages (no JSON)
- Smooth conversation flow
- No data loss in brief

---

**Ready to implement?** Follow steps 1-10 in order, test after each step.

**Questions?** Check `WIZARD-FIXES-VERIFICATION.md` for detailed test cases.
