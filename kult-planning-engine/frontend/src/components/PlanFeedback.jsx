/**
 * Plan Feedback Component - Simple ChatGPT-style feedback
 * Thumbs up/down and regenerate options
 */

import React, { useState } from 'react';

const PlanFeedback = ({ planData, onFeedback, onRegenerate }) => {
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'good' or 'bad'
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleThumbsUp = async () => {
    setFeedbackGiven('good');
    setShowCommentBox(true);
    
    // Submit positive feedback immediately
    await submitFeedback('good', '');
  };

  const handleThumbsDown = () => {
    setFeedbackGiven('bad');
    setShowCommentBox(true);
  };

  const submitFeedback = async (type, commentText) => {
    setSubmitting(true);
    try {
      const feedback = {
        plan_id: planData?.plan_id || `plan_${Date.now()}`,
        plan_data: planData,
        feedback_type: type, // 'good' or 'bad'
        overall_rating: type === 'good' ? 5 : 2,
        comments: commentText,
        approved: type === 'good',
        timestamp: new Date().toISOString()
      };
      
      await onFeedback(feedback);
      
      if (type === 'bad' && commentText) {
        setShowCommentBox(false);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    await submitFeedback('bad', comment);
    setComment('');
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      {!feedbackGiven ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Was this response helpful?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleThumbsUp}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
              title="Good response"
            >
              <svg 
                className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button
              onClick={handleThumbsDown}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
              title="Bad response"
            >
              <svg 
                className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>
          <div className="h-4 w-px bg-gray-600"></div>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-400 hover:text-cyan-400 hover:bg-gray-700 rounded-lg transition-colors"
            title="Regenerate response"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Regenerate</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbackGiven === 'good' ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Thanks for your feedback!</span>
            </div>
          ) : showCommentBox ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">What was the issue with this response?</p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional: Tell us what went wrong..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                rows="2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCommentSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  onClick={() => {
                    setShowCommentBox(false);
                    submitFeedback('bad', '');
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Thanks for your feedback!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlanFeedback;
