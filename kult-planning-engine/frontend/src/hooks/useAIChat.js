/**
 * Custom hook for OpenAI-powered AI chat in the Campaign Wizard
 */

import { useState, useRef } from 'react';

export function useAIChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Cancel the current AI request
   */
  const cancelRequest = () => {
    if (abortControllerRef.current) {
      console.log('[AI CHAT HOOK] Cancelling request...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  /**
   * Send message to AI and get response with entity extraction
   * @param {string} message - User's message
   * @param {Array} conversationHistory - Previous messages [{role, content}]
   * @param {Object} currentBrief - Current campaign brief state
   * @param {Object} extractedEntities - Last AI message's extracted entities (contains currentStep)
   * @returns {Promise<Object>} {response, extractedEntities, metadata}
   */
  const sendMessage = async (message, conversationHistory = [], currentBrief = {}, extractedEntities = {}) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('[AI CHAT HOOK] Sending message:', message);
      console.log('[AI CHAT HOOK] History length:', conversationHistory.length);
      console.log('[AI CHAT HOOK] Current brief:', currentBrief);
      console.log('[AI CHAT HOOK] Extracted entities:', extractedEntities);

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory,
          currentBrief,
          extractedEntities, // Include last AI message's entities (currentStep)
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      console.log('[AI CHAT HOOK] Response received:', data);

      abortControllerRef.current = null;
      setIsLoading(false);
      return {
        success: true,
        response: data.response,
        extractedEntities: data.extractedEntities || {},
        metadata: data.metadata || {},
      };
    } catch (err) {
      // Handle abort differently from other errors
      if (err.name === 'AbortError') {
        console.log('[AI CHAT HOOK] Request cancelled by user');
        setIsLoading(false);
        return {
          success: false,
          cancelled: true,
          error: 'Request cancelled',
          response: '',
          extractedEntities: {},
        };
      }

      console.error('[AI CHAT HOOK ERROR]:', err);
      setError(err.message);
      abortControllerRef.current = null;
      setIsLoading(false);

      return {
        success: false,
        error: err.message,
        response: "I'm having trouble processing your request. Could you try rephrasing?",
        extractedEntities: {},
      };
    }
  };

  /**
   * Check if AI chat is available
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
    sendMessage,
    cancelRequest,
    checkAvailability,
    isLoading,
    error,
  };
}
