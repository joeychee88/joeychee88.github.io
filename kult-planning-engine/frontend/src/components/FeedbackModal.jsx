/**
 * Feedback Modal Component - Collect user feedback on generated plans
 */

import React, { useState } from 'react';

const FeedbackModal = ({ isOpen, onClose, planData, onSubmit }) => {
  const [feedbackData, setFeedbackData] = useState({
    overall_rating: 0,
    dimensional_feedback: {
      audience_rating: 0,
      budget_rating: 0,
      platform_rating: 0,
      format_rating: 0,
      audience_too_broad: false,
      audience_too_narrow: false,
      wrong_personas: false,
      budget_too_high: false,
      budget_too_low: false,
      missing_platforms: false,
      wrong_formats: false
    },
    comments: '',
    approved: false
  });
  
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleRatingClick = (category, rating) => {
    if (category === 'overall') {
      setFeedbackData(prev => ({ ...prev, overall_rating: rating }));
    } else {
      setFeedbackData(prev => ({
        ...prev,
        dimensional_feedback: {
          ...prev.dimensional_feedback,
          [`${category}_rating`]: rating
        }
      }));
    }
  };

  const handleIssueToggle = (issue) => {
    setFeedbackData(prev => ({
      ...prev,
      dimensional_feedback: {
        ...prev.dimensional_feedback,
        [issue]: !prev.dimensional_feedback[issue]
      }
    }));
  };

  const handleSubmit = async () => {
    const feedback = {
      plan_id: planData.plan_id || `plan_${Date.now()}`,
      plan_data: planData,
      ...feedbackData,
      timestamp: new Date().toISOString()
    };

    try {
      await onSubmit(feedback);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        // Reset form
        setFeedbackData({
          overall_rating: 0,
          dimensional_feedback: {
            audience_rating: 0,
            budget_rating: 0,
            platform_rating: 0,
            format_rating: 0,
            audience_too_broad: false,
            audience_too_narrow: false,
            wrong_personas: false,
            budget_too_high: false,
            budget_too_low: false,
            missing_platforms: false,
            wrong_formats: false
          },
          comments: '',
          approved: false
        });
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const StarRating = ({ rating, onRate, label }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className={`text-2xl transition-colors ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-500`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating === 0 ? 'Not rated' : `${rating}/5`}
        </span>
      </div>
    </div>
  );

  const CheckboxOption = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-blue-600 rounded"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h3>
          <p className="text-gray-600">
            Your feedback helps our AI learn and improve. Every response makes the planner smarter!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold mb-2">📊 Help Our AI Learn</h2>
          <p className="text-blue-100">
            Your feedback directly improves future recommendations
          </p>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Overall Rating */}
          <div className="mb-6">
            <StarRating
              rating={feedbackData.overall_rating}
              onRate={(rating) => handleRatingClick('overall', rating)}
              label="Overall, how satisfied are you with this media plan?"
            />
          </div>

          <hr className="my-6" />

          {/* Dimensional Ratings */}
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Rate Each Aspect:</h3>
          
          <StarRating
            rating={feedbackData.dimensional_feedback.audience_rating}
            onRate={(rating) => handleRatingClick('audience', rating)}
            label="Target Audiences"
          />
          
          <StarRating
            rating={feedbackData.dimensional_feedback.budget_rating}
            onRate={(rating) => handleRatingClick('budget', rating)}
            label="Budget Allocation"
          />
          
          <StarRating
            rating={feedbackData.dimensional_feedback.platform_rating}
            onRate={(rating) => handleRatingClick('platform', rating)}
            label="Platform Mix"
          />
          
          <StarRating
            rating={feedbackData.dimensional_feedback.format_rating}
            onRate={(rating) => handleRatingClick('format', rating)}
            label="Ad Formats"
          />

          <hr className="my-6" />

          {/* Specific Issues */}
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            What could be improved? (Optional)
          </h3>
          <div className="space-y-1 bg-gray-50 p-4 rounded-lg">
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.audience_too_broad}
              onChange={() => handleIssueToggle('audience_too_broad')}
              label="Audience targeting is too broad"
            />
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.audience_too_narrow}
              onChange={() => handleIssueToggle('audience_too_narrow')}
              label="Audience targeting is too narrow"
            />
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.wrong_personas}
              onChange={() => handleIssueToggle('wrong_personas')}
              label="Wrong personas selected"
            />
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.budget_too_high}
              onChange={() => handleIssueToggle('budget_too_high')}
              label="Budget allocation is too high for some platforms"
            />
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.budget_too_low}
              onChange={() => handleIssueToggle('budget_too_low')}
              label="Budget allocation is too low"
            />
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.missing_platforms}
              onChange={() => handleIssueToggle('missing_platforms')}
              label="Missing important platforms"
            />
            <CheckboxOption
              checked={feedbackData.dimensional_feedback.wrong_formats}
              onChange={() => handleIssueToggle('wrong_formats')}
              label="Wrong ad formats recommended"
            />
          </div>

          <hr className="my-6" />

          {/* Comments */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={feedbackData.comments}
              onChange={(e) => setFeedbackData(prev => ({ ...prev, comments: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Any other thoughts on how we can improve?"
            />
          </div>

          {/* Approval */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={feedbackData.approved}
                onChange={(e) => setFeedbackData(prev => ({ ...prev, approved: e.target.checked }))}
                className="w-5 h-5 text-green-600 rounded"
              />
              <div>
                <div className="font-semibold text-gray-800">
                  ✓ I approve this plan and will proceed with it
                </div>
                <div className="text-sm text-gray-600">
                  Approved plans help the AI understand what works best
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSubmit}
            disabled={feedbackData.overall_rating === 0}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              feedbackData.overall_rating === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
