/**
 * Refactored AI Chat Hook - Now a pure UI wrapper
 * CRITICAL: This hook NO LONGER calls the backend directly
 * All backend calls must go through sendWizardMessage() in AIWizard.jsx
 */

import { useState } from 'react';

export function useAIChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * DEPRECATED: This function is now a no-op wrapper
   * Use sendWizardMessage() from AIWizard.jsx instead
   * 
   * This is kept for backward compatibility during migration
   * but will log a warning if called directly
   */
  const sendMessage = async (message, conversationHistory = [], currentBrief = {}) => {
    console.warn(
      '[AI CHAT HOOK] ⚠️ DEPRECATED: sendMessage() called directly. ' +
      'Use sendWizardMessage() from AIWizard.jsx instead. ' +
      'This hook is now a pure UI wrapper and should not call backends.'
    );
    
    // Return a dummy response to prevent crashes
    // In production, this path should never be hit
    return {
      success: false,
      error: 'This hook is deprecated. Use sendWizardMessage() instead.',
      response: "I'm having trouble processing your request. Please try again.",
      extractedEntities: {},
      metadata: { deprecated: true }
    };
  };

  /**
   * Check if AI chat backend is available
   * This is safe to keep as it's read-only
   */
  const checkAvailability = async () => {
    try {
      const response = await fetch('/api/ai-chat/status');
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('[AI CHAT HOOK] Status check failed:', err);
      return { available: false, error: err.message };
    }
  };

  return {
    sendMessage, // Kept for compatibility but deprecated
    checkAvailability,
    isLoading,
    error,
    setIsLoading, // Expose setters for wizard to control loading state
    setError
  };
}
