/**
 * PRODUCTION-GRADE AI WIZARD MESSAGE HANDLER
 * This is the SINGLE OWNER of all AI requests
 * 
 * Add this to AIWizard.jsx and replace all direct backend calls
 */

import { wizardRequestManager } from '../utils/wizardRequestManager';
import { normalizeModelResponse, validateCleanText } from '../utils/responseNormalizer';
import { mergeBriefSafely } from '../utils/briefMerger';
import { canGeneratePlan, missingPlanFields, formatMissingFieldsForPrompt } from '../utils/stepGating';

/**
 * Central function for sending wizard messages
 * THIS IS THE ONLY FUNCTION THAT SHOULD CALL THE BACKEND
 * 
 * @param {string} userMessage - User's message text
 * @param {Array} conversationHistory - Full conversation history
 * @param {Object} currentBrief - Current brief state
 * @param {Object} options - Additional options { onMessageAdded, onBriefUpdated, onPlanReady }
 * @returns {Promise<Object>} { success, assistantText, extractedEntities, requestId }
 */
export async function sendWizardMessage(
  userMessage,
  conversationHistory,
  currentBrief,
  options = {}
) {
  const {
    onMessageAdded = () => {},
    onBriefUpdated = () => {},
    onPlanReady = () => {},
    onError = () => {}
  } = options;

  // Step 1: Check if we can send (no duplicate requests)
  if (!wizardRequestManager.canSendRequest()) {
    console.log('[WIZARD] Request blocked - another request in flight');
    return {
      success: false,
      error: 'Another request is in progress',
      blocked: true
    };
  }

  // Step 2: Start request and get requestId + abort signal
  const { requestId, signal } = wizardRequestManager.startRequest();
  
  console.log('[WIZARD] sendWizardMessage', {
    requestId,
    messageLength: userMessage.length,
    historyLength: conversationHistory.length,
    briefCompleteness: calculateBriefCompleteness(currentBrief)
  });

  // Step 3: Add user message immediately for UI responsiveness
  onMessageAdded({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  });

  try {
    // Step 4: Build context-aware prompt
    const missingFields = missingPlanFields(currentBrief);
    const contextPrompt = missingFields.length > 0
      ? `\n\n[CONTEXT: ${formatMissingFieldsForPrompt(missingFields)} to generate a complete plan]`
      : '';

    // Step 5: Call backend with abort signal
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage + contextPrompt,
        conversationHistory,
        currentBrief,
        requestId // Include requestId in request for tracking
      }),
      signal // Enable request abortion
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const rawData = await response.json();
    
    // Step 6: Normalize response (handle malformed JSON, etc.)
    const normalized = normalizeModelResponse(rawData);
    
    // Step 7: Validate no JSON leaked to UI
    if (!validateCleanText(normalized.assistantText)) {
      console.error('[WIZARD] JSON artifacts detected in response, stripping...');
      // Re-normalize aggressively
      normalized.assistantText = stripAllJson(normalized.assistantText);
    }

    // Step 8: Check if this response should be applied (order guarantee)
    if (!wizardRequestManager.shouldApplyResponse(requestId)) {
      console.log('[WIZARD] Response ignored (stale)', { requestId });
      return {
        success: false,
        ignored: true,
        requestId
      };
    }

    // Step 9: Add assistant message to UI
    onMessageAdded({
      role: 'assistant',
      content: normalized.assistantText,
      timestamp: new Date().toISOString(),
      requestId
    });

    // Step 10: Merge extracted entities into brief
    let updatedBrief = currentBrief;
    if (normalized.extractedEntities && Object.keys(normalized.extractedEntities).length > 0) {
      updatedBrief = mergeBriefSafely(
        currentBrief,
        normalized.extractedEntities,
        requestId
      );
      onBriefUpdated(updatedBrief);
      
      console.log('[WIZARD] Brief updated via requestId:', requestId, {
        extractedFields: Object.keys(normalized.extractedEntities),
        briefCompleteness: calculateBriefCompleteness(updatedBrief)
      });
    }

    // Step 11: Check if we can generate plan
    if (canGeneratePlan(updatedBrief)) {
      console.log('[WIZARD] ✅ All required fields present, plan generation ready');
      onPlanReady(updatedBrief);
    } else {
      const missing = missingPlanFields(updatedBrief);
      console.log('[WIZARD] Plan generation not ready, missing:', missing);
    }

    // Step 12: Mark request as complete
    wizardRequestManager.completeRequest(requestId);

    return {
      success: true,
      assistantText: normalized.assistantText,
      extractedEntities: normalized.extractedEntities,
      metadata: normalized.metadata,
      requestId,
      updatedBrief
    };

  } catch (error) {
    wizardRequestManager.completeRequest(requestId);

    // Handle abort separately (not an error, just cancelled)
    if (error.name === 'AbortError') {
      console.log('[WIZARD] Request aborted (new request started):', requestId);
      return {
        success: false,
        aborted: true,
        requestId
      };
    }

    console.error('[WIZARD] Request failed:', error);
    onError(error);

    // Add error message to UI
    onMessageAdded({
      role: 'assistant',
      content: "I'm having trouble processing your request. Could you try rephrasing?",
      timestamp: new Date().toISOString(),
      error: true
    });

    return {
      success: false,
      error: error.message,
      requestId
    };
  }
}

/**
 * Helper: Calculate brief completeness percentage
 */
function calculateBriefCompleteness(brief) {
  const requiredFields = ['product_brand', 'campaign_objective', 'industry', 'geography', 'budget_rm'];
  const filled = requiredFields.filter(field => {
    const val = brief[field];
    if (val === null || val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  }).length;
  
  return Math.round((filled / requiredFields.length) * 100);
}

/**
 * Helper: Aggressively strip all JSON patterns from text
 */
function stripAllJson(text) {
  return text
    .replace(/\{[^}]*\}/g, '')
    .replace(/\[object Object\]/g, '')
    .replace(/"[^"]*":\s*/g, '')
    .replace(/[\{\}\[\]]/g, '')
    .trim();
}

/**
 * Helper: Edit message handler (creates NEW request)
 * Use this instead of calling sendWizardMessage directly for edits
 */
export async function handleEditMessage(
  editedMessage,
  conversationHistory,
  currentBrief,
  options
) {
  console.log('[WIZARD] Edit message - creating new request');
  
  // Editing creates a completely new request (new requestId)
  return sendWizardMessage(
    editedMessage,
    conversationHistory,
    currentBrief,
    options
  );
}
