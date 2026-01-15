# 🎯 KULT Campaign Planning System - Complete Architecture

## Overview
A comprehensive multi-path campaign planning system that gives users flexibility in how they input data and build their media plans.

---

## 🚀 **3 Data Input Methods**

### 1. **AI Campaign Wizard** (Conversational)
- **Path**: Dashboard → "AI Campaign Wizard" button → `/ai-wizard`
- **Experience**: Conversational AI-guided data collection
- **Features**:
  - Natural language conversation
  - Smart entity extraction
  - Clarification questions
  - Real-time validation
  - Industry playbook application
- **Output**: Structured brief data ready for planning

### 2. **Upload Brief** (Document-based)
- **Path**: Dashboard → "Upload Brief" button → `/upload-brief`
- **Experience**: Upload PDF/DOCX/TXT campaign brief
- **Features**:
  - Drag-and-drop interface
  - File validation (type, size)
  - Document parsing (PDF, DOCX, TXT)
  - Entity extraction from text
  - Brief summary preview
- **Output**: Extracted brief data with post-upload choice

### 3. **Manual Form** (Traditional) [TO BE BUILT]
- **Path**: Dashboard → "Build Your Plan" → Brief Form
- **Experience**: Traditional form-based input
- **Features**:
  - Structured fields (product, budget, geography, etc.)
  - Dropdowns and validation
  - Step-by-step form wizard
  - Field-level help text
- **Output**: Structured brief data ready for planning

---

## 🛠️ **2 Planning Methods**

### Method A: **AI-Powered Auto-Generate** (Recommended)
- **How it works**: 
  - Takes collected brief data
  - Applies strategic planner logic:
    - Industry playbook matching
    - Geo-aware audience selection
    - Channel preference enforcement
    - Budget-tier-based allocation
  - Generates complete media plan automatically
- **Best for**: Speed, strategic recommendations, guided planning
- **Features**:
  - Smart format selection
  - Audience persona matching
  - Site/publisher recommendations
  - Budget allocation across platforms
  - CPM optimization

### Method B: **Manual Plan Builder** (Expert Mode)
- **How it works**: 
  - Takes collected brief data as context
  - User manually builds plan in 3 steps:
    1. **Choose Audience** - Select from available personas
    2. **Select Ad Formats** - Pick display, video, native, etc.
    3. **Choose Sites** - Select publishers/platforms
  - System calculates impressions, reach, CPM
- **Best for**: Experienced planners, specific requirements, full control
- **Features**:
  - Full manual control
  - Real-time budget calculations
  - Multi-select audiences, formats, sites
  - Custom allocation percentages

---

## 📊 **Complete User Journey Matrix**

| Data Input Method | After Data Collection | Planning Method Options |
|-------------------|----------------------|-------------------------|
| **AI Wizard** | Auto-generates plan OR allows manual override | AI Auto-Generate, Manual Builder |
| **Upload Brief** | User chooses: AI Wizard OR Manual Plan | AI Auto-Generate, Manual Builder |
| **Manual Form** | User chooses planning method | AI Auto-Generate, Manual Builder |

---

## 🎨 **Current Implementation Status**

### ✅ **COMPLETED**
1. **AI Campaign Wizard** (`/ai-wizard`)
   - ✅ Conversational interface
   - ✅ Entity extraction
   - ✅ Strategic planner logic
   - ✅ Auto-generate media plan
   - ✅ Industry playbook integration
   - ✅ Geography-aware planning

2. **Upload Brief Page** (`/upload-brief`)
   - ✅ UI/UX design complete
   - ✅ Drag-and-drop upload
   - ✅ File validation
   - ✅ Mock processing workflow
   - ✅ Brief summary display
   - ✅ Post-upload choice dialog
   - ✅ Routing integration

3. **Dashboard Integration**
   - ✅ "AI Campaign Wizard" button → `/ai-wizard`
   - ✅ "Upload Brief" button → `/upload-brief`
   - ✅ "Build Your Plan" button → `/build-plan` (exists but needs enhancement)

### 🚧 **TO BE IMPLEMENTED**

#### Phase 1: Upload Brief Enhancement
- [ ] **File Parsing Logic**
  - Implement PDF text extraction
  - Implement DOCX text extraction
  - Implement TXT file reading
  - Entity extraction from parsed text
  - Brief validation and error handling

- [ ] **Post-Upload Flow Integration**
  - Pass extracted data to AI Wizard
  - Pass extracted data to Manual Plan Builder
  - Handle incomplete brief data
  - Allow user to edit extracted information

#### Phase 2: Manual Plan Builder (3-Step Flow)
- [ ] **Step 1: Choose Audience**
  - Display available audiences with filters
  - Multi-select audience interface
  - Show reach estimates
  - Brief context display (budget, geography, etc.)
  - Audience recommendations based on brief

- [ ] **Step 2: Select Ad Formats**
  - Display available formats with previews
  - Multi-select format interface
  - Show CPM ranges
  - Format recommendations based on objective
  - Device compatibility indicators

- [ ] **Step 3: Choose Sites**
  - Display available sites/publishers
  - Multi-select site interface
  - Show monthly traffic
  - Geographic relevance scoring
  - Premium vs. direct buying indicators

- [ ] **Budget Allocation Interface**
  - Real-time budget calculator
  - Percentage or absolute allocation
  - Impression estimates
  - Reach projections
  - CPM optimization suggestions

- [ ] **Plan Review & Export**
  - Complete plan summary
  - Edit/adjust allocations
  - Export to Excel/PDF
  - Save to dashboard

#### Phase 3: Manual Form Input
- [ ] **Brief Form Wizard**
  - Multi-step form (5-6 steps)
  - Field validation
  - Progress indicator
  - Auto-save functionality
  - Help text and tooltips

- [ ] **Form Fields Structure**
  - Campaign basics (name, client, objective)
  - Budget and duration
  - Geography selection
  - Target audience description
  - Channel preferences
  - Special requirements

---

## 🔄 **Recommended User Flow Integration**

### Scenario 1: New User (Guided Experience)
```
Dashboard → AI Campaign Wizard → [Conversation] → Auto-Generate Plan → Review & Export
```

### Scenario 2: Document Upload
```
Dashboard → Upload Brief → [File Processing] → Choose: AI Wizard OR Manual Builder
  → Option A: AI Wizard → [Refine Brief] → Auto-Generate Plan
  → Option B: Manual Builder → Step 1-2-3 → Review & Export
```

### Scenario 3: Expert Planner
```
Dashboard → Build Your Plan → Manual Form → Manual Builder → Step 1-2-3 → Review & Export
```

### Scenario 4: Quick AI Plan
```
Dashboard → AI Campaign Wizard → [Brief Conversation] → Auto-Generate → Done ✅
```

---

## 🏗️ **Technical Architecture**

### Frontend Components Needed
```
/pages
  ├── Dashboard.jsx ✅
  ├── AIWizard.jsx ✅
  ├── UploadBrief.jsx ✅ (UI complete, parsing needed)
  ├── BuildPlan.jsx ⚠️ (needs enhancement)
  ├── ManualPlanBuilder/
  │   ├── BriefForm.jsx 🔲 (TO BUILD)
  │   ├── AudienceSelector.jsx 🔲 (TO BUILD)
  │   ├── FormatSelector.jsx 🔲 (TO BUILD)
  │   ├── SiteSelector.jsx 🔲 (TO BUILD)
  │   ├── BudgetAllocator.jsx 🔲 (TO BUILD)
  │   └── PlanReview.jsx 🔲 (TO BUILD)
  └── PlanExport.jsx 🔲 (TO BUILD)
```

### Backend API Endpoints Needed
```
POST /api/brief/parse           - Parse uploaded document
POST /api/brief/extract         - Extract entities from text
GET  /api/audiences/recommend   - Get audience recommendations
GET  /api/formats/recommend     - Get format recommendations
GET  /api/sites/recommend       - Get site recommendations
POST /api/plan/calculate        - Calculate impressions/reach
POST /api/plan/generate         - AI auto-generate plan
POST /api/plan/save             - Save manual plan
POST /api/plan/export           - Export plan to Excel/PDF
```

### Data Flow
```javascript
// Brief Data Structure
{
  campaignName: string,
  client: string,
  product: string,
  objective: "Awareness" | "Traffic" | "Engagement" | "Conversion",
  industry: string,
  budget_rm: number,
  geography: string[], // e.g., ["Penang", "Kedah", "Perlis", "Perak"]
  duration_weeks: number,
  targetAudience: string,
  devices: string[], // ["Mobile", "Desktop", "CTV"]
  channel_preference?: "OTT" | "Social" | "Display" | "Balanced",
  priority: "Max Reach" | "Performance",
  buying_type?: string[], // ["Direct", "PD", "PG"]
}

// Generated Media Plan Structure
{
  brief: BriefData,
  lineItems: [
    {
      platform: string,
      pillar: string,
      format: string,
      audience: string,
      budget_rm: number,
      cpm: number,
      impressions: number,
      buy_type: string,
    }
  ],
  summary: {
    totalBudget: number,
    totalImpressions: number,
    totalReach: number,
    averageCPM: number,
    platformCount: number,
  }
}
```

---

## 🎯 **Next Immediate Steps**

### Priority 1: Complete Upload Brief Flow
1. Implement file parsing (PDF/DOCX/TXT)
2. Build entity extraction from parsed text
3. Connect extracted data to AI Wizard
4. Connect extracted data to Manual Plan Builder

### Priority 2: Build Manual Plan Builder
1. Create AudienceSelector component
2. Create FormatSelector component
3. Create SiteSelector component
4. Create BudgetAllocator component
5. Create PlanReview component
6. Integrate 3-step flow with navigation

### Priority 3: Enhance BuildPlan.jsx
1. Add brief form wizard
2. Integrate with Manual Plan Builder
3. Add choice dialog: AI vs Manual planning

### Priority 4: Plan Export & Persistence
1. Build plan export to Excel
2. Build plan export to PDF
3. Add save plan functionality
4. Add plan versioning

---

## 📈 **Success Metrics**
- ✅ Users can input data via 3 different methods
- ✅ Users can choose between AI-powered or manual planning
- ✅ Manual planners can select audiences, formats, and sites step-by-step
- ✅ All paths lead to a complete, exportable media plan
- ✅ Brief data is preserved and passed between components
- ✅ Real-time budget calculations and recommendations

---

## 🚀 **Deployment Status**

**Current Live URL**: https://3002-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai

**Login Credentials**:
- Email: `admin@kult.my`
- Password: `kult2024`

**Available Features**:
- ✅ Dashboard with all action buttons
- ✅ AI Campaign Wizard (fully functional)
- ✅ Upload Brief (UI complete, parsing pending)
- ⚠️ Build Plan (exists, needs Manual Plan Builder integration)

---

## 📝 **Developer Notes**

### Key Design Principles
1. **Flexibility First**: Users choose their preferred input and planning method
2. **Progressive Enhancement**: Start simple, add complexity as needed
3. **Data Preservation**: Brief data flows seamlessly between components
4. **Context Awareness**: Show relevant recommendations based on brief context
5. **Real-time Feedback**: Calculations and validations happen instantly
6. **Graceful Fallbacks**: Handle incomplete data gracefully

### Integration Points
- Upload Brief → AI Wizard: Pass `briefData` via route state
- Upload Brief → Manual Builder: Pass `briefData` via route state
- AI Wizard → Plan Review: Use existing media plan generation
- Manual Builder → Plan Review: Build plan from user selections
- All paths → Dashboard: Save completed plans to dashboard

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-09  
**Status**: Upload Brief UI/UX Complete ✅ - File Parsing & Manual Builder Pending 🚧
