import React from 'react';

/**
 * RecommendationCard - AI recommendation card with Add to Plan button
 */
const RecommendationCard = ({ recommendation, onAdd, isAdded = false }) => {
  const {
    id,
    name,
    type,
    confidence,
    reach,
    cost,
    reason,
    stats = {},
    weight
  } = recommendation;

  const getConfidenceColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  return (
    <div className={`mb-3 p-4 rounded-lg border-2 transition-all ${
      isAdded 
        ? 'bg-indigo-900/20 border-indigo-500' 
        : 'bg-[#0f0f0f] border-gray-800 hover:border-cyan-500'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-white font-semibold text-sm">{name}</h4>
        {confidence && (
          <span className={`text-xs px-2 py-1 rounded-full text-white ${getConfidenceColor(confidence)}`}>
            {confidence}%
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        {reach && (
          <div>
            <span className="text-gray-400">Reach:</span>
            <span className="text-white ml-1 font-semibold">{formatNumber(reach)}</span>
          </div>
        )}
        {type === 'budget' && cost && (
          <div>
            <span className="text-gray-400">Budget:</span>
            <span className="text-white ml-1 font-semibold">RM {formatNumber(cost)}</span>
          </div>
        )}
        {/* Only show CPM for format, site, and budget types - NOT for audience */}
        {type !== 'budget' && type !== 'audience' && cost && (
          <div>
            <span className="text-gray-400">CPM:</span>
            <span className="text-white ml-1 font-semibold">RM {cost}</span>
          </div>
        )}
        {weight && (
          <div>
            <span className="text-gray-400">Weight:</span>
            <span className="text-white ml-1 font-semibold">{weight}%</span>
          </div>
        )}
        {stats.impressions && type !== 'audience' && (
          <div>
            <span className="text-gray-400">Impressions:</span>
            <span className="text-white ml-1 font-semibold">{formatNumber(stats.impressions)}</span>
          </div>
        )}
      </div>

      {/* Reason */}
      {reason && (
        <div className="mb-3 p-2 bg-cyan-900/20 border-l-2 border-cyan-500 rounded text-xs text-gray-300">
          <strong className="text-cyan-400">Why:</strong> {reason}
        </div>
      )}

      {/* Add/Remove Toggle Button */}
      <button
        onClick={() => onAdd(recommendation)}
        className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
          isAdded
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700'
        }`}
      >
        {isAdded ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove from Plan
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add to Plan
          </span>
        )}
      </button>
    </div>
  );
};

export default RecommendationCard;
