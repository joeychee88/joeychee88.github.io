/**
 * Production-grade request manager for AI Wizard
 * Handles single-flight requests, request ordering, and deduplication
 */

let requestCounter = 0;

export class WizardRequestManager {
  constructor() {
    this.inFlightRequestId = null;
    this.latestRequestId = null;
    this.abortController = null;
    this.requestCounter = 0;
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId() {
    this.requestCounter++;
    return `req_${Date.now()}_${this.requestCounter}`;
  }

  /**
   * Check if a request can be sent (not blocked by in-flight request)
   */
  canSendRequest() {
    return this.inFlightRequestId === null;
  }

  /**
   * Start a new request, aborting any previous in-flight request
   */
  startRequest() {
    // Abort previous request if exists
    if (this.abortController) {
      console.log('[REQUEST_MGR] Aborting previous request:', this.inFlightRequestId);
      this.abortController.abort();
    }

    const requestId = this.generateRequestId();
    this.inFlightRequestId = requestId;
    this.latestRequestId = requestId;
    this.abortController = new AbortController();

    console.log('[REQUEST_MGR] Started request:', requestId);
    return { requestId, signal: this.abortController.signal };
  }

  /**
   * Mark request as complete
   */
  completeRequest(requestId) {
    if (this.inFlightRequestId === requestId) {
      this.inFlightRequestId = null;
      this.abortController = null;
      console.log('[REQUEST_MGR] Completed request:', requestId);
    }
  }

  /**
   * Check if a response should be applied (is it the latest?)
   */
  shouldApplyResponse(requestId) {
    const shouldApply = requestId === this.latestRequestId;
    if (!shouldApply) {
      console.log('[REQUEST_MGR] Response ignored (stale)', {
        responseId: requestId,
        latestId: this.latestRequestId
      });
    }
    return shouldApply;
  }

  /**
   * Reset manager state
   */
  reset() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.inFlightRequestId = null;
    this.latestRequestId = null;
    this.abortController = null;
    console.log('[REQUEST_MGR] Reset');
  }
}

// Singleton instance
export const wizardRequestManager = new WizardRequestManager();
