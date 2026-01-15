import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

function AudienceSegments() {
  const navigate = useNavigate();
  const [savedGroups, setSavedGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name' | 'reach' | 'usage'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // Load saved audience groups
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/audience-groups');
      if (response.data.success) {
        setSavedGroups(response.data.data || []);
        console.log('✅ Loaded', response.data.data?.length || 0, 'audience groups');
      }
    } catch (error) {
      console.error('❌ Error loading audience groups:', error);
      // Fallback to localStorage
      const localGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
      setSavedGroups(localGroups);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete group
  const handleDeleteClick = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;

    try {
      await axios.delete(`/api/audience-groups/${groupToDelete.id}`);
      setSavedGroups(prev => prev.filter(g => g.id !== groupToDelete.id));
      console.log('✅ Deleted group:', groupToDelete.name);
    } catch (error) {
      console.error('❌ Error deleting group:', error);
      // Fallback: remove from localStorage
      const localGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
      const updated = localGroups.filter(g => g.id !== groupToDelete.id);
      localStorage.setItem('savedAudienceGroups', JSON.stringify(updated));
      setSavedGroups(updated);
    } finally {
      setShowDeleteModal(false);
      setGroupToDelete(null);
    }
  };

  // Toggle group selection
  const toggleGroupSelection = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Select all groups
  const selectAllGroups = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(filteredGroups.map(g => g.id));
    }
  };

  // Download selected groups as Excel
  const downloadAsExcel = () => {
    const groupsToDownload = selectedGroups.length > 0
      ? savedGroups.filter(g => selectedGroups.includes(g.id))
      : savedGroups;

    if (groupsToDownload.length === 0) {
      alert('No audience groups to download');
      return;
    }

    // Create CSV content
    let csvContent = 'Group Name,Personas,Unique Reach,Total Audience,Industry,Objective,Geography,Created By,Created At\n';
    
    groupsToDownload.forEach(group => {
      const personas = group.personas.join('; ');
      const reach = (group.uniqueReach || 0) / 1000000;
      const total = (group.totalAudience || 0) / 1000000;
      const createdAt = new Date(group.createdAt).toLocaleDateString();
      
      csvContent += `"${group.name}","${personas}",${reach.toFixed(2)}M,${total.toFixed(2)}M,"${group.industry || ''}","${group.objective || ''}","${group.geography || ''}","${group.createdBy || ''}",${createdAt}\n`;
    });

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audience-segments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Downloaded ${groupsToDownload.length} audience groups as Excel`);
  };

  // Push to Build Plan Wizard
  const handlePushToBuildPlan = (group) => {
    // Store the selected group in localStorage for Build Plan to pick up
    localStorage.setItem('selectedAudienceGroup', JSON.stringify(group));
    console.log('✅ Pushing audience group to Build Plan:', group.name);
    
    // Navigate to Build Plan Wizard
    navigate('/build-plan', { 
      state: { 
        audienceGroup: group,
        fromAudienceSegments: true 
      } 
    });
  };

  // Filter and sort groups
  const filteredGroups = savedGroups
    .filter(group => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        group.name.toLowerCase().includes(query) ||
        group.industry?.toLowerCase().includes(query) ||
        group.objective?.toLowerCase().includes(query) ||
        group.personas.some(p => p.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'reach':
          return (b.uniqueReach || 0) - (a.uniqueReach || 0);
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'date':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Audience Segments</h1>
            {!isLoading && savedGroups.length > 0 && (
              <div className="flex items-center gap-3">
                {selectedGroups.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {selectedGroups.length} selected
                  </span>
                )}
                <button
                  onClick={downloadAsExcel}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {selectedGroups.length > 0 
                    ? `Download Selected (${selectedGroups.length})`
                    : 'Download All as Excel'
                  }
                </button>
              </div>
            )}
          </div>
          <p className="text-gray-400">
            Manage your saved audience groups from AI Wizard campaigns
          </p>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, industry, objective, or personas..."
              className="w-full px-4 py-3 pl-10 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="date">Sort by Date (Newest)</option>
            <option value="name">Sort by Name (A-Z)</option>
            <option value="reach">Sort by Reach (Largest)</option>
            <option value="usage">Sort by Usage (Most Used)</option>
          </select>

          {/* Select All - Dynamic Checkbox */}
          {!isLoading && filteredGroups.length > 0 && (
            <button
              onClick={selectAllGroups}
              className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {selectedGroups.length === filteredGroups.length && filteredGroups.length > 0 ? (
                  <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-600 rounded-full"></div>
                )}
              </div>
              <span className="text-white text-sm font-medium">Select All</span>
            </button>
          )}
        </div>

        {/* Stats */}
        {!isLoading && savedGroups.length > 0 && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Groups</div>
              <div className="text-white text-2xl font-bold">{savedGroups.length}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Personas</div>
              <div className="text-white text-2xl font-bold">
                {savedGroups.reduce((sum, g) => sum + g.personas.length, 0)}
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Combined Reach</div>
              <div className="text-white text-2xl font-bold">
                {(savedGroups.reduce((sum, g) => sum + (g.uniqueReach || 0), 0) / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading audience groups...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && savedGroups.length === 0 && (
          <div className="text-center py-20 bg-[#0f0f0f] border border-gray-800 rounded-xl">
            <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No Audience Groups Yet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              Create audience groups in the AI Wizard by generating campaign plans and saving your target audiences.
            </p>
            <button
              onClick={() => window.location.href = '/ai-wizard'}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
            >
              Go to AI Wizard
            </button>
          </div>
        )}

        {/* Groups Grid */}
        {!isLoading && filteredGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, index) => (
              <div
                key={group.id || index}
                onClick={() => toggleGroupSelection(group.id)}
                className={`bg-[#0f0f0f] border rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer ${
                  selectedGroups.includes(group.id) 
                    ? 'border-cyan-500 bg-cyan-900/10 shadow-lg shadow-cyan-500/20' 
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Header with Dynamic Checkbox */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Dynamic Checkbox - Cyan circle with checkmark when selected */}
                    <div className="mt-1 w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {selectedGroups.includes(group.id) && (
                        <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-2 truncate">{group.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{group.personas.length} personas</span>
                        <span>•</span>
                        <span>{((group.uniqueReach || 0) / 1000000).toFixed(2)}M reach</span>
                      </div>
                    </div>
                  </div>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(group);
                    }}
                    className="p-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 hover:border-red-600 text-red-400 hover:text-red-300 rounded-lg transition-colors flex-shrink-0"
                    title="Delete group"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Personas */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Personas</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.personas.slice(0, 4).map((persona, pIndex) => (
                      <span
                        key={pIndex}
                        className="px-2 py-1 bg-cyan-900/20 border border-cyan-700/50 rounded text-xs text-cyan-300"
                      >
                        {persona}
                      </span>
                    ))}
                    {group.personas.length > 4 && (
                      <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400">
                        +{group.personas.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Meta Info */}
                <div className="pt-4 border-t border-gray-800 mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {group.industry && <span className="text-gray-400">{group.industry}</span>}
                      {group.objective && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400">{group.objective}</span>
                        </>
                      )}
                    </div>
                    {group.createdAt && (
                      <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {group.usageCount > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Used {group.usageCount} {group.usageCount === 1 ? 'time' : 'times'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && savedGroups.length > 0 && filteredGroups.length === 0 && (
          <div className="text-center py-12 bg-[#0f0f0f] border border-gray-800 rounded-xl">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-gray-400 text-sm">
              Try adjusting your search query or filters
            </p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && groupToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Delete Audience Group?</h3>
                  <p className="text-gray-400 text-sm mb-2">
                    Are you sure you want to delete <strong className="text-white">"{groupToDelete.name}"</strong>?
                  </p>
                  <p className="text-gray-500 text-xs">
                    This action cannot be undone. The group will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setGroupToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AudienceSegments;
