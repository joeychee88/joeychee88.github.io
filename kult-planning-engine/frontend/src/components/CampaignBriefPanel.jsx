import React, { useState } from 'react';

/**
 * CampaignBriefPanel - Collapsible right panel showing campaign brief context
 * Shows across Upload Brief and AI Wizard pages
 * Auto-updates as data is collected from conversation or file upload
 */
function CampaignBriefPanel({ brief, onUpdate, isCollapsed = false, onCollapseChange }) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Handle collapse toggle
  const toggleCollapse = () => {
    if (onCollapseChange) {
      onCollapseChange(!isCollapsed);
    }
  };

  // SVG icon components
  const getIcon = (iconName) => {
    const icons = {
      target: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      building: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      package: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      flag: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
      briefcase: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      currency: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      location: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      calendar: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      users: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      device: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
      tv: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      bolt: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    };
    return icons[iconName] || icons.target;
  };

  // Brief field definitions with labels and validation
  const fieldDefinitions = [
    { key: 'campaignName', label: 'Campaign Name', iconName: 'target', type: 'text', required: true },
    { key: 'client', label: 'Client/Brand', iconName: 'building', type: 'text', required: false },
    { key: 'product_brand', label: 'Product/Service', iconName: 'package', type: 'text', required: true },
    { key: 'campaign_objective', label: 'Objective', iconName: 'flag', type: 'select', 
      options: ['Awareness', 'Traffic', 'Engagement', 'Conversion'], required: true },
    { key: 'industry', label: 'Industry', iconName: 'briefcase', type: 'text', required: true },
    { key: 'budget_rm', label: 'Budget (RM)', iconName: 'currency', type: 'number', required: true },
    { key: 'startDate', label: 'Campaign Start Date', iconName: 'calendar', type: 'date', required: false },
    { key: 'geography', label: 'Geography', iconName: 'location', type: 'text', required: true },
    { key: 'duration_weeks', label: 'Duration (weeks)', iconName: 'calendar', type: 'number', required: true },
    { key: 'targetAudience', label: 'Target Audience', iconName: 'users', type: 'textarea', required: false },
    { key: 'devices', label: 'Devices', iconName: 'device', type: 'text', required: false },
    { key: 'channel_preference', label: 'Channel Focus', iconName: 'tv', type: 'select',
      options: ['OTT', 'Social', 'Display', 'Balanced'], required: false },
    { key: 'priority', label: 'Priority', iconName: 'bolt', type: 'select',
      options: ['Max Reach', 'Performance'], required: false },
  ];

  // Calculate completion percentage
  const calculateCompletion = () => {
    const requiredFields = fieldDefinitions.filter(f => f.required);
    const filledRequired = requiredFields.filter(f => {
      const value = brief?.[f.key];
      // Check for truly filled values
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    });
    return Math.round((filledRequired.length / requiredFields.length) * 100);
  };

  const completion = calculateCompletion();

  // Start editing a field
  const startEditing = (field) => {
    setEditingField(field.key);
    const currentValue = brief?.[field.key];
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || ''));
  };

  // Save edited field
  const saveEdit = () => {
    if (editingField && onUpdate) {
      onUpdate(editingField, editValue);
    }
    setEditingField(null);
    setEditValue('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Format display value
  const formatValue = (key, value) => {
    if (!value) return '—';
    if (Array.isArray(value)) return value.join(', ');
    if (key === 'budget_rm' && typeof value === 'number') {
      return `RM ${value.toLocaleString()}`;
    }
    if (key === 'startDate') {
      // Format date nicely (e.g., "28 Feb 2026" or "Q2 2026")
      if (typeof value === 'string') {
        // If it's already formatted (like "Q2 2026"), return as is
        if (value.match(/^Q[1-4]\s+\d{4}$/i)) return value;
        
        // Try to parse and format dates
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            });
          }
        } catch (e) {
          // If parsing fails, return original value
        }
      }
      return value;
    }
    return value;
  };

  // Check if field is filled
  const isFilled = (key) => {
    const value = brief?.[key];
    // Check for truly filled values
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  };

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-20 z-40">
        <button
          onClick={toggleCollapse}
          className="bg-[#1A1F35] border-l-2 border-t-2 border-b-2 border-[#00E5CC] rounded-l-lg p-3 hover:bg-[#00E5CC]/10 transition-colors"
          title="Show Campaign Strategy"
        >
          <svg className="w-5 h-5 text-[#00E5CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-[#0F1420] border-l border-[#1E293B] z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#1A1F35] border-b border-[#1E293B] p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Campaign Strategy</h3>
          <button
            onClick={toggleCollapse}
            className="text-[#94A3B8] hover:text-white transition-colors"
            title="Collapse panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Completion Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#94A3B8]">Completion</span>
            <span className={`font-semibold ${completion === 100 ? 'text-[#00E5CC]' : 'text-[#FF0080]'}`}>
              {completion}%
            </span>
          </div>
          <div className="w-full bg-[#0F1420] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                completion === 100 ? 'bg-[#00E5CC]' : 'bg-[#FF0080]'
              }`}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Brief Fields */}
      <div className="p-4 space-y-3">
        {fieldDefinitions.map((field) => {
          const value = brief?.[field.key];
          const filled = isFilled(field.key);
          const isEditing = editingField === field.key;

          return (
            <div
              key={field.key}
              className={`bg-[#1A1F35] rounded-lg p-3 border transition-all ${
                filled
                  ? 'border-[#00E5CC]/30'
                  : field.required
                  ? 'border-[#FF0080]/30'
                  : 'border-[#1E293B]'
              }`}
            >
              {/* Field Label */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[#94A3B8]">{getIcon(field.iconName)}</span>
                  <span className="text-xs text-[#94A3B8] uppercase tracking-wider">
                    {field.label}
                    {field.required && <span className="text-[#FF0080] ml-1">*</span>}
                  </span>
                </div>
                {!isEditing && onUpdate && (
                  <button
                    onClick={() => startEditing(field)}
                    className="text-[#94A3B8] hover:text-[#00E5CC] transition-colors"
                    title={filled ? "Edit field" : "Add value"}
                  >
                    {filled ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Field Value */}
              {isEditing ? (
                <div className="space-y-2">
                  {field.type === 'textarea' ? (
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full bg-[#0F1420] text-white text-sm rounded px-2 py-1.5 border border-[#00E5CC] focus:outline-none focus:ring-1 focus:ring-[#00E5CC]"
                      rows={3}
                      autoFocus
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full bg-[#0F1420] text-white text-sm rounded px-2 py-1.5 border border-[#00E5CC] focus:outline-none focus:ring-1 focus:ring-[#00E5CC]"
                      autoFocus
                    >
                      <option value="">Select...</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full bg-[#0F1420] text-white text-sm rounded px-2 py-1.5 border border-[#00E5CC] focus:outline-none focus:ring-1 focus:ring-[#00E5CC]"
                      autoFocus
                    />
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-[#00E5CC] text-[#0A0E1A] text-xs font-semibold py-1.5 rounded hover:bg-[#00E5CC]/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-[#1E293B] text-[#94A3B8] text-xs font-semibold py-1.5 rounded hover:bg-[#1E293B]/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`text-sm font-medium ${filled ? 'text-white' : 'text-[#94A3B8] italic'}`}>
                  {formatValue(field.key, value)}
                </div>
              )}

              {/* Status Indicator */}
              {!isEditing && (
                <div className="flex items-center mt-2">
                  {filled ? (
                    <div className="flex items-center text-[#00E5CC] text-xs">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Collected
                    </div>
                  ) : field.required ? (
                    <div className="flex items-center text-[#FF0080] text-xs">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Required
                    </div>
                  ) : (
                    <div className="text-[#94A3B8] text-xs">Optional</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      {completion === 100 && (
        <div className="sticky bottom-0 bg-[#1A1F35] border-t border-[#1E293B] p-4">
          <div className="flex items-center text-[#00E5CC] text-sm mb-3">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Brief Complete!
          </div>
          <p className="text-xs text-[#94A3B8]">
            All required information has been collected. Ready to generate your media plan.
          </p>
        </div>
      )}
    </div>
  );
}

export default CampaignBriefPanel;
