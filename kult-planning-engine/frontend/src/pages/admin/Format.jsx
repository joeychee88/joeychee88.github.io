import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

function AdminFormat() {
  const [formats, setFormats] = useState([]);
  const [stats, setStats] = useState(null);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    types: [],
    dimensions: [],
    categories: [],
    formatGoal: [],
    industry: []
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const navigate = useNavigate();

  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1dYylynygKbRb1NNwWQodZGG78m3jYf8BiPsJPGXp3Dg/edit';

  const fetchFormats = async (skipCache = false) => {
    try {
      setError(null);
      const url = skipCache ? '/api/formats?skipCache=true' : '/api/formats';
      const response = await axios.get(url);
      
      if (response.data.success) {
        setFormats(response.data.data || []); // API returns 'data' not 'formats'
        setStats(response.data.stats);
        setTypes(response.data.types || []);
      } else {
        throw new Error('Failed to fetch formats');
      }
    } catch (err) {
      console.error('Error fetching formats:', err);
      setError(err.response?.data?.error || 'Failed to load formats. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFormats(true);
  };

  // Extract unique filter options
  const uniqueTypes = [...new Set(formats.map(f => f.type).filter(Boolean))];
  
  // Filter out composite dimensions from dropdown and split them into individual options
  const COMPOSITE_DIMENSIONS = {
    '300x250, 300x600, 970x250, 640x960, 800x600, 320x480': ['300x250', '300x600', '970x250', '640x960', '800x600', '320x480'],
    '16:9, 4:3': ['16:9', '4:3']
  };
  
  const rawDimensions = [...new Set(formats.map(f => f.dimensions).filter(Boolean))];
  const uniqueDimensions = [];
  
  rawDimensions.forEach(dim => {
    if (COMPOSITE_DIMENSIONS[dim]) {
      // If it's a composite dimension, add its individual parts
      COMPOSITE_DIMENSIONS[dim].forEach(individualDim => {
        if (!uniqueDimensions.includes(individualDim)) {
          uniqueDimensions.push(individualDim);
        }
      });
    } else if (!Object.keys(COMPOSITE_DIMENSIONS).includes(dim)) {
      // Only add if it's not a composite dimension itself
      uniqueDimensions.push(dim);
    }
  });
  
  const uniqueCategories = [...new Set(formats.map(f => {
    // Extract category from type (e.g., "standard iab banner" -> "Standard IAB Banner")
    const nameLower = (f.name || '').toLowerCase();
    const typeLower = (f.type || '').toLowerCase();
    
    // Check for Social formats first (name contains "social ad")
    if (nameLower.includes('social ad') || nameLower.includes('social video')) return 'Social';
    if (typeLower.includes('static image')) return 'Social';
    if (typeLower.includes('banner')) return 'Banner';
    if (typeLower.includes('video')) return 'Video';
    if (typeLower.includes('native')) return 'Native';
    if (typeLower.includes('high impact')) return 'High Impact';
    return 'Other';
  }))];

  // Format goals
  const formatGoals = ['Awareness', 'Engagement', 'Traffic', 'Conversion'];

  // Extract unique industries from the industry field (comma-separated values)
  const uniqueIndustries = [...new Set(
    formats.flatMap(f => 
      (f.industry || '').split(',').map(i => i.trim()).filter(Boolean)
    )
  )].sort();

  // Apply filters
  const filteredFormats = formats.filter(format => {
    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(format.type)) {
      return false;
    }
    
    // Dimensions filter - special handling for composite dimensions
    if (filters.dimensions.length > 0) {
      const formatDimensions = format.dimensions;
      
      // Check if format dimension matches any selected dimension
      let dimensionMatches = filters.dimensions.includes(formatDimensions);
      
      // If format has a composite dimension, check if any selected dimension is included in it
      if (!dimensionMatches && Object.keys(COMPOSITE_DIMENSIONS).includes(formatDimensions)) {
        // Check if any selected dimension is in the composite dimension string
        dimensionMatches = filters.dimensions.some(selectedDim => 
          formatDimensions.includes(selectedDim)
        );
      }
      
      if (!dimensionMatches) {
        return false;
      }
    }
    
    // Category filter
    if (filters.categories.length > 0) {
      const nameLower = (format.name || '').toLowerCase();
      const typeLower = (format.type || '').toLowerCase();
      
      let category = 'Other';
      // Check for Social formats first
      if (nameLower.includes('social ad') || nameLower.includes('social video')) {
        category = 'Social';
      } else if (typeLower.includes('static image')) {
        category = 'Social';
      } else if (typeLower.includes('banner')) {
        category = 'Banner';
      } else if (typeLower.includes('video')) {
        category = 'Video';
      } else if (typeLower.includes('native')) {
        category = 'Native';
      } else if (typeLower.includes('high impact')) {
        category = 'High Impact';
      }
      
      if (!filters.categories.includes(category)) {
        return false;
      }
    }
    
    // Industry filter - handles comma-separated values
    if (filters.industry.length > 0) {
      const formatIndustries = (format.industry || '').split(',').map(i => i.trim());
      const industryMatch = filters.industry.some(selectedIndustry =>
        formatIndustries.includes(selectedIndustry)
      );
      if (!industryMatch) {
        return false;
      }
    }
    
    return true;
  });

  const groupedFormats = filteredFormats.reduce((acc, format) => {
    const type = format.type || 'Other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(format);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                [ ADMIN / FORMAT MANAGEMENT ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Ad Format Configuration</h1>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <a
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#2d3748] text-white rounded-md hover:bg-[#3d4758] transition-colors flex items-center text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                <span>Edit Source</span>
              </a>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-md hover:bg-[#0e7490] disabled:opacity-50 transition-all flex items-center text-sm"
              >
                <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="space-y-6">
              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#111] border border-gray-800 rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
              {/* Filters Skeleton */}
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
              {/* Content Skeleton */}
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-5 min-h-[280px]">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* Global Filters */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Filters</h3>
              {(filters.types.length > 0 || filters.dimensions.length > 0 || filters.categories.length > 0 || filters.formatGoal.length > 0 || filters.industry.length > 0) && (
                <button
                  onClick={() => setFilters({ types: [], dimensions: [], categories: [], formatGoal: [], industry: [] })}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Category Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-2">Category</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">
                    {filters.categories.length === 0 ? 'All Categories' : `${filters.categories.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${openDropdown === 'category' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'category' && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {uniqueCategories.map(category => (
                      <label key={category} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(category)}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              categories: e.target.checked
                                ? [...prev.categories, category]
                                : prev.categories.filter(c => c !== category)
                            }));
                          }}
                          className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                        />
                        <span className="text-sm text-white">{category}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-2">Type</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">
                    {filters.types.length === 0 ? 'All Types' : `${filters.types.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${openDropdown === 'type' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'type' && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {uniqueTypes.map(type => (
                      <label key={type} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.types.includes(type)}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              types: e.target.checked
                                ? [...prev.types, type]
                                : prev.types.filter(t => t !== type)
                            }));
                          }}
                          className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                        />
                        <span className="text-sm text-white capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Dimensions Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-2">Dimensions</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'dimensions' ? null : 'dimensions')}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">
                    {filters.dimensions.length === 0 ? 'All Dimensions' : `${filters.dimensions.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${openDropdown === 'dimensions' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'dimensions' && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {uniqueDimensions.map(dimension => (
                      <label key={dimension} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.dimensions.includes(dimension)}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              dimensions: e.target.checked
                                ? [...prev.dimensions, dimension]
                                : prev.dimensions.filter(d => d !== dimension)
                            }));
                          }}
                          className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                        />
                        <span className="text-sm text-white font-mono">{dimension}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Format Goal Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-2">Format Goal</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'formatGoal' ? null : 'formatGoal')}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">
                    {filters.formatGoal.length === 0 ? 'All Goals' : `${filters.formatGoal.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${openDropdown === 'formatGoal' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'formatGoal' && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {formatGoals.map(goal => (
                      <label key={goal} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.formatGoal.includes(goal)}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              formatGoal: e.target.checked
                                ? [...prev.formatGoal, goal]
                                : prev.formatGoal.filter(g => g !== goal)
                            }));
                          }}
                          className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                        />
                        <span className="text-sm text-white">{goal}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Industry Filter */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-400 mb-2">Industry</label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'industry' ? null : 'industry')}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-md text-left text-sm text-white hover:border-gray-600 transition-colors flex items-center justify-between"
                >
                  <span className="truncate">
                    {filters.industry.length === 0 ? 'All Industries' : `${filters.industry.length} selected`}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${openDropdown === 'industry' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'industry' && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                    {uniqueIndustries.map(industry => (
                      <label key={industry} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.industry.includes(industry)}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              industry: e.target.checked
                                ? [...prev.industry, industry]
                                : prev.industry.filter(i => i !== industry)
                            }));
                          }}
                          className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                        />
                        <span className="text-sm text-white">{industry}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.types.length > 0 || filters.dimensions.length > 0 || filters.categories.length > 0 || filters.formatGoal.length > 0 || filters.industry.length > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {filters.categories.map(category => (
                    <span key={category} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Category: {category}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, categories: prev.categories.filter(c => c !== category) }))}
                        className="ml-1 hover:text-cyan-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {filters.types.map(type => (
                    <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Type: {type}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }))}
                        className="ml-1 hover:text-purple-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {filters.dimensions.map(dimension => (
                    <span key={dimension} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">
                      {dimension}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, dimensions: prev.dimensions.filter(d => d !== dimension) }))}
                        className="ml-1 hover:text-green-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {filters.formatGoal.map(goal => (
                    <span key={goal} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Goal: {goal}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, formatGoal: prev.formatGoal.filter(g => g !== goal) }))}
                        className="ml-1 hover:text-orange-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {filters.industry.map(industry => (
                    <span key={industry} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Industry: {industry}
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, industry: prev.industry.filter(i => i !== industry) }))}
                        className="ml-1 hover:text-blue-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>



        {/* Formats Display - Grouped by Category */}
        {filteredFormats.length === 0 ? (
          <div className="bg-[#111] border border-gray-800 rounded-xl p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">No formats found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding formats in your Google Sheet.
            </p>
            <div className="mt-6">
              <a
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open Google Sheet
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {(() => {
              // Group formats by category
              const formatGroups = {
                'IAB Standard Banner': [],
                'High Impact Rich Media': [],
                'Video': [],
                'Interactive Rich Media': [],
                'Social': []
              };

              filteredFormats.forEach(format => {
                const nameLower = (format.name || '').toLowerCase();
                const typeLower = (format.type || '').toLowerCase();
                
                // Check for Social formats first (by name or type)
                if (nameLower.includes('social ad') || nameLower.includes('social video') || typeLower.includes('static image')) {
                  console.log('✅ Social format detected:', format.name, format.type);
                  formatGroups['Social'].push(format);
                } else if (format.type === 'standard iab banner') {
                  formatGroups['IAB Standard Banner'].push(format);
                } else if (format.type === 'high impact') {
                  formatGroups['High Impact Rich Media'].push(format);
                } else if (format.type === 'video') {
                  formatGroups['Video'].push(format);
                } else if (format.type === 'interactive banner') {
                  formatGroups['Interactive Rich Media'].push(format);
                }
              });

              return Object.entries(formatGroups).map(([groupName, groupFormats]) => {
                if (groupFormats.length === 0) return null;

                return (
                  <div key={groupName} className="bg-[#111] border border-gray-800 rounded-xl p-6">
                    {/* Group Header */}
                    <h3 className="text-lg font-black text-white uppercase mb-4 tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {groupName}
                      <span className="ml-3 text-sm font-normal text-gray-400">({groupFormats.length})</span>
                    </h3>

                    {/* Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {groupFormats.map((format) => (
                        <div 
                          key={format.id} 
                          className={`bg-[#0a0a0a] border border-gray-700 rounded-lg p-5 hover:border-cyan-500/50 transition-colors relative min-h-[280px] flex flex-col ${format.demoUrl ? 'cursor-pointer' : ''}`}
                          onClick={() => format.demoUrl && window.open(format.demoUrl, '_blank')}
                        >
                          {/* Benchmark Pills - Top Right Corner */}
                          {(format.benchmarkCtr || format.benchmarkVtr) && (
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                              {format.benchmarkCtr && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-900/40 text-cyan-300 border border-cyan-500/30">
                                  CTR: {format.benchmarkCtr}
                                </span>
                              )}
                              {format.benchmarkVtr && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-900/40 text-purple-300 border border-purple-500/30">
                                  VTR: {format.benchmarkVtr}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Format Name and Premium Badge */}
                          <div className="flex items-start justify-between mb-2 pr-20">
                            <div className={`text-sm font-bold ${format.premium ? 'text-purple-400' : 'text-cyan-400'} flex-1`}>
                              {format.name}
                            </div>
                            {format.premium && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white ml-2">
                                Premium
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {format.description && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                              {format.description}
                            </p>
                          )}

                          {/* Goal */}
                          {format.goal && (
                            <div className="mb-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                                {format.goal}
                              </span>
                            </div>
                          )}

                          {/* Industry */}
                          {format.industry && (
                            <div className="text-xs text-gray-400 mb-2">
                              <span className="text-gray-500">Best for:</span> {format.industry}
                            </div>
                          )}

                          {/* Dimensions */}
                          {format.dimensions && (
                            <div className="text-xs text-gray-400 font-mono mb-2">
                              {format.dimensions === '300x250, 300x600, 970x250, 640x960, 800x600, 320x480' 
                                ? 'Any Dimension' 
                                : format.dimensions}
                            </div>
                          )}

                          {/* Base CPM */}
                          <div className="mb-2">
                            <span className="font-normal text-gray-600 uppercase mr-1" style={{ fontSize: '0.6rem' }}>FROM</span>
                            <span className="text-sm font-bold text-white">
                              RM {typeof format.baseCpm === 'number' ? format.baseCpm.toFixed(2) : format.baseCpm}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
          </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default AdminFormat;
