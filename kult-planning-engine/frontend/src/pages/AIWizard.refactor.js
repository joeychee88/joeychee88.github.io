/**
 * PRODUCTION-GRADE REFACTOR PATCH FOR AIWizard.jsx
 * 
 * This file contains the new sendWizardMessage() function that should be added to AIWizard.jsx
 * It becomes the SINGLE OWNER of all AI requests.
 * 
 * INTEGRATION STEPS:
 * 1. Add these imports at the top of AIWizard.jsx
 * 2. Replace useAIChat hook import
 * 3. Add sendWizardMessage function (below)
 * 4. Replace all calls to sendAIMessage() with sendWizardMessage()
 * 5. Update handleSendMessageWithOpenAI to use sendWizardMessage
 */

// ============================================================================
// STEP 1: UPDATE IMPORTS (Add to top of AIWizard.jsx)
// ============================================================================

import requestManager from '../utils/wizardRequestManager';
import { normalizeModelResponse, validateAssistantText } from '../utils/responseNormalizer';
import { canGeneratePlan, logBriefStatus, createMissingFieldsMessage } from '../utils/stepGating';
import { mergeBrief, validateBrief } from '../utils/briefMerge';

// ============================================================================
// STEP 2: REPLACE useAIChat HOOK (Update existing line)
// ============================================================================

// BEFORE:
// const { sendMessage: sendAIMessage, isLoading: aiChatLoading, error: aiChatError } = useAIChat();

// AFTER:
const { setIsLoading: setAILoading, setError: setAIError } = useAIChat();

// ============================================================================
// STEP 3: ADD sendWizardMessage FUNCTION
// Place this INSIDE the AIWizard component, after state declarations
// ============================================================================

/**
 * SINGLE OWNER of all AI requests
 * All UI entry points must call this function only
 * 
 * @param {string} userMessage - The user's input message
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Normalized response
 */
const sendWizardMessage = async (userMessage, options = {}) => {
  // Check if we can send (no in-flight request)
  if (!requestManager.canSendRequest()) {
    console.log('[WIZARD] Request blocked: another request in flight');
    return null;
  }

  // Start new request
  const { requestId, signal } = requestManager.startRequest();
  
  console.log(`[WIZARD] sendWizardMessage requestId=${requestId}`);
  logBriefStatus(brief, `requestId=${requestId}`);

  setIsLoading(true);
  setAILoading(true);

  try {
    // Prepare conversation history
    const conversationHistory = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    console.log('[WIZARD] Calling API with:', {
      requestId,
      messageLength: userMessage.length,
      historyLength: conversationHistory.length
    });

    // Make API call with abort signal
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        conversationHistory,
        currentBrief: brief,
        requestId // Include for tracking
      }),
      signal // Enable cancellation
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('[WIZARD] Raw response received:', {
      requestId,
      type: typeof rawData,
      keys: typeof rawData === 'object' ? Object.keys(rawData) : 'N/A'
    });

    // Check if response should be applied
    if (!requestManager.shouldApplyResponse(requestId)) {
      console.log(`[WIZARD] Response ignored (stale) requestId=${requestId} latest=${requestManager.latestRequestId}`);
      return null;
    }

    // Normalize response
    const normalized = normalizeModelResponse(rawData);
    console.log('[WIZARD] Response normalized:', {
      requestId,
      textLength: normalized.assistantText.length,
      entitiesCount: Object.keys(normalized.extractedEntities).length
    });

    // Validate assistant text (no JSON leaks)
    const safeText = validateAssistantText(normalized.assistantText);

    // Complete request
    requestManager.completeRequest(requestId);
    setIsLoading(false);
    setAILoading(false);

    return {
      success: true,
      requestId,
      assistantText: safeText,
      extractedEntities: normalized.extractedEntities,
      metadata: normalized.metadata
    };

  } catch (error) {
    requestManager.completeRequest(requestId);
    setIsLoading(false);
    setAILoading(false);

    // Check if error is from abort
    if (error.name === 'AbortError') {
      console.log(`[WIZARD] Request aborted requestId=${requestId}`);
      return null;
    }

    console.error('[WIZARD ERROR]:', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    setAIError(error.message);

    return {
      success: false,
      requestId,
      error: error.message,
      assistantText: "I apologize, but I encountered an error. Please try again.",
      extractedEntities: {}
    };
  }
};

// ============================================================================
// STEP 4: REFACTOR handleSendMessageWithOpenAI
// Replace the existing function with this version
// ============================================================================

const handleSendMessageWithOpenAI = async () => {
  if (!inputMessage.trim() || isLoading) return;

  const userMessage = inputMessage.trim();
  addMessage('user', userMessage);
  setInputMessage('');

  try {
    // PERSONA CONSTRAINT DETECTION (keep existing logic)
    const userMessageLower = userMessage.toLowerCase();
    const currentDatasets = datasetsRef.current;
    
    // [Keep existing blacklist/whitelist detection code here]
    // ... persona detection logic ...

    // SINGLE CALL to sendWizardMessage
    const result = await sendWizardMessage(userMessage);

    if (!result || !result.success) {
      console.log('[WIZARD] No valid response received');
      return;
    }

    console.log(`[WIZARD] Response applied requestId=${result.requestId}`);

    // Add AI response to chat (ONLY assistantText, never JSON)
    addMessage('assistant', result.assistantText);

    // Merge extracted entities into brief
    if (result.extractedEntities && Object.keys(result.extractedEntities).length > 0) {
      console.log('[WIZARD] Merging entities:', Object.keys(result.extractedEntities));
      
      setBrief(prev => {
        const merged = mergeBrief(prev, result.extractedEntities, result.requestId);
        
        // Validate merged brief
        if (!validateBrief(merged)) {
          console.error('[WIZARD] Brief validation failed, keeping previous');
          return prev;
        }
        
        console.log('[WIZARD] Brief updated:', {
          requestId: result.requestId,
          fields: Object.keys(merged).filter(k => !k.startsWith('_'))
        });
        
        return merged;
      });
    }

    // Check if we should generate plan
    const { canGenerate, missingFields, datasetsReady } = canGeneratePlan(
      brief, 
      datasetsRef.current
    );

    if (canGenerate) {
      console.log('[WIZARD] All requirements met, will generate plan');
      // [Keep existing auto-generation logic]
    } else {
      console.log('[WIZARD] Cannot generate plan:', {
        missingFields,
        datasetsReady,
        reason: createMissingFieldsMessage(missingFields)
      });
    }

  } catch (error) {
    console.error('[WIZARD] handleSendMessage error:', error);
    addMessage('assistant', 'I apologize, but something went wrong. Please try again.');
  }
};

// ============================================================================
// STEP 5: UPDATE EDIT MESSAGE HANDLER
// Replace the edit send logic
// ============================================================================

const handleEditSend = async (index) => {
  if (!editText.trim() || isLoading) return;

  const editedMessage = editText.trim();
  
  // Remove messages after the edited one
  setMessages(prev => prev.slice(0, index));
  
  // Add the edited message
  addMessage('user', editedMessage);
  
  setEditingIndex(null);
  setEditText('');

  // Use sendWizardMessage (creates new requestId)
  const result = await sendWizardMessage(editedMessage);
  
  if (result && result.success) {
    addMessage('assistant', result.assistantText);
    
    if (result.extractedEntities && Object.keys(result.extractedEntities).length > 0) {
      setBrief(prev => mergeBrief(prev, result.extractedEntities, result.requestId));
    }
  }
};

// ============================================================================
// STEP 6: VERIFICATION CHECKLIST
// ============================================================================

/**
 * After applying this patch:
 * 
 * ✓ Search for "sendAIMessage(" - should find ZERO occurrences (except in imports)
 * ✓ Search for "sendWizardMessage(" - should find ALL request calls
 * ✓ Verify requestManager is imported
 * ✓ Verify normalizeModelResponse is imported
 * ✓ Verify stepGating utilities are imported
 * ✓ Verify briefMerge is imported
 * ✓ Test in browser console: window.runWizardTests()
 * ✓ Test duplicate sends: click send button rapidly
 * ✓ Test JSON leaks: check chat for any "{" or "extractedEntities"
 * ✓ Test step gating: try to generate plan without budget
 */

export default {
  sendWizardMessage,
  handleSendMessageWithOpenAI,
  handleEditSend
};
