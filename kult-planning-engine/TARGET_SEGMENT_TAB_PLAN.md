# Target Segment Tab - Implementation Plan

## Overview
Add a "Target Segment" subtab to BuildPlanWizard Step 2 (Audience selection) to display and load saved audience groups from AI Wizard.

## Requirements
Based on the Samsung screenshot provided, users should be able to:
1. View saved audience groups in a card layout
2. See group details: name, personas, reach
3. Load a saved group into the current campaign
4. Download/export the group (optional)
5. Delete saved groups

## UI Design

### Location
**Step 2: Audience Selection**
- Add a subtab system with two tabs:
  - "Select Audiences" (default, current behavior)
  - "Target Segment" (NEW - saved groups)

### Layout
```
┌────────────────────────────────────────────────────────┐
│ 2. Select your target audience                        │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────┬──────────────────┐               │
│ │ Select Audiences │ Target Segment   │               │
│ └──────────────────┴──────────────────┘               │
│                                                        │
│ ┌────────────────────────────────────────────────┐    │
│ │ Samsung                                        │    │
│ │ 5 personas • Unique Reach: 7.81M               │    │
│ │ • Gadget Gurus                                 │    │
│ │ • Tech & Gadget Enthusiasts                    │    │
│ │ +2 more                                        │    │
│ │                     [↓ Download] [Load Group]  │    │
│ └────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

### Card Design (per saved group)
```
┌──────────────────────────────────────────────────────┐
│ [Group Name]                               [× Delete] │
│                                                       │
│ [N] personas                                          │
│ Unique Reach: [X.XXM]                                 │
│                                                       │
│ • Persona 1                                           │
│ • Persona 2                                           │
│ • Persona 3                                           │
│ +N more                                               │
│                                                       │
│ [↓ Download this group]  [Load this group]           │
└──────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Add Tab State
```javascript
const [audienceSubtab, setAudienceSubtab] = useState('select'); // 'select' | 'saved'
const [savedAudienceGroups, setSavedAudienceGroups] = useState([]);
```

### 2. Load Saved Groups on Mount
```javascript
useEffect(() => {
  const loadSavedGroups = async () => {
    try {
      const response = await axios.get('/api/audience-groups');
      if (response.data.success) {
        setSavedAudienceGroups(response.data.groups || []);
      }
    } catch (error) {
      // Fallback to localStorage
      const localGroups = JSON.parse(localStorage.getItem('savedAudienceGroups') || '[]');
      setSavedAudienceGroups(localGroups);
    }
  };
  
  loadSavedGroups();
}, []);
```

### 3. Add Tab UI in Step 2
```javascript
{currentStep === 2 && (
  <div>
    {/* Tab Headers */}
    <div className="flex border-b border-gray-800 mb-6">
      <button
        onClick={() => setAudienceSubtab('select')}
        className={`px-6 py-3 font-semibold ${
          audienceSubtab === 'select'
            ? 'text-cyan-400 border-b-2 border-cyan-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Select Audiences
      </button>
      <button
        onClick={() => setAudienceSubtab('saved')}
        className={`px-6 py-3 font-semibold ${
          audienceSubtab === 'saved'
            ? 'text-cyan-400 border-b-2 border-cyan-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Target Segment ({savedAudienceGroups.length})
      </button>
    </div>
    
    {/* Tab Content */}
    {audienceSubtab === 'select' ? (
      // Existing audience selection UI
    ) : (
      // NEW: Saved groups UI
    )}
  </div>
)}
```

### 4. Saved Groups Display
```javascript
{audienceSubtab === 'saved' && (
  <div className="space-y-4">
    {savedAudienceGroups.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">
          No saved audience groups yet.
        </p>
        <p className="text-gray-500 text-sm">
          Create audience groups in AI Wizard and they'll appear here.
        </p>
      </div>
    ) : (
      savedAudienceGroups.map(group => (
        <div key={group.id} className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
          {/* Group header */}
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-white font-semibold text-lg">{group.name}</h4>
            <button
              onClick={() => handleDeleteGroup(group.id)}
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Group stats */}
          <div className="flex gap-4 text-sm text-gray-400 mb-3">
            <span>{group.personas.length} personas</span>
            <span>•</span>
            <span>Unique Reach: {(group.uniqueReach / 1000000).toFixed(2)}M</span>
          </div>
          
          {/* Persona list */}
          <div className="mb-4">
            {group.personas.slice(0, 3).map((persona, idx) => (
              <div key={idx} className="text-cyan-400 text-sm py-1">
                • {persona}
              </div>
            ))}
            {group.personas.length > 3 && (
              <div className="text-gray-500 text-sm">
                +{group.personas.length - 3} more
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadGroup(group)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download this group
            </button>
            <button
              onClick={() => handleLoadGroup(group)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors font-semibold"
            >
              Load this group
            </button>
          </div>
        </div>
      ))
    )}
  </div>
)}
```

### 5. Handler Functions
```javascript
const handleLoadGroup = (group) => {
  // Load personas into campaign plan
  updatePlan({
    selectedPersonas: group.personas,
    massTargeting: false
  });
  
  // Increment usage count
  axios.post(`/api/audience-groups/${group.id}/use`).catch(console.error);
  
  // Switch back to Select tab
  setAudienceSubtab('select');
  
  // Show success message
  showToast(`Loaded ${group.personas.length} personas from "${group.name}"`);
};

const handleDeleteGroup = async (groupId) => {
  if (!confirm('Are you sure you want to delete this audience group?')) return;
  
  try {
    await axios.delete(`/api/audience-groups/${groupId}`);
    setSavedAudienceGroups(prev => prev.filter(g => g.id !== groupId));
    showToast('Audience group deleted');
  } catch (error) {
    console.error('Error deleting group:', error);
    showToast('Failed to delete group', 'error');
  }
};

const handleDownloadGroup = (group) => {
  const csv = `Group Name,${group.name}\n` +
    `Personas,Reach\n` +
    group.personas.map(p => `${p},`).join('\n') +
    `\nTotal Reach,${group.totalReach}\n` +
    `Unique Reach,${group.uniqueReach}\n`;
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${group.name.replace(/\s+/g, '_')}_audience_group.csv`;
  a.click();
};
```

## Benefits
1. **Workflow Efficiency**: Reuse audience segments across campaigns
2. **Consistency**: Maintain consistent targeting across campaigns
3. **Time Savings**: No need to re-select personas for similar campaigns
4. **Analytics**: Track which audience groups are most used
5. **Collaboration**: Share standardized audience groups across team

## Files to Modify
- `frontend/src/pages/BuildPlanWizard.jsx` (add tab UI and handlers)
- `backend/routes/audience-groups.js` (add usage tracking endpoint)

## Testing Checklist
- [ ] Tab switching works correctly
- [ ] Saved groups load from API
- [ ] Load group applies personas to campaign
- [ ] Delete group removes from list and backend
- [ ] Download group exports CSV
- [ ] Empty state shows when no groups
- [ ] Group count badge updates
- [ ] Usage count increments on load

## Future Enhancements
- Search/filter saved groups
- Sort by usage count, date, reach
- Edit group name inline
- Share groups between users
- Duplicate groups
- Merge multiple groups

---

**Status**: Ready for implementation
**Priority**: High (requested feature)
**Estimated Time**: 2-3 hours
