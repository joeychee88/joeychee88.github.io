# AI Wizard Feedback UI Enhancement

## Overview
Complete redesign of the feedback system with outline icons, regenerate functionality, and comprehensive reporting options.

---

## ✨ What's New

### 1. 👍👎 **Outline Icons (No Background)**

**Before:**
- Filled icons with colored backgrounds
- `bg-gray-700` inactive state
- `bg-green-600` / `bg-red-600` active states

**After:**
- Clean outline icons (stroke-based)
- No background colors
- Colored only when active:
  - 👍 Green when liked: `text-green-500`
  - 👎 Red when disliked: `text-red-500`
  - Gray hover state: `hover:text-gray-200`

**Visual:**
```
[👍]  [👎]  [🔄]  [⚠️]
 ↑     ↑     ↑     ↑
Like  Dislike Regen Report
```

---

### 2. 🔄 **Regenerate Button**

**Functionality:**
- Resends the same user message
- Gets a new AI response
- Replaces the current assistant message

**Implementation:**
```javascript
const handleRegenerateResponse = async (messageIndex) => {
  // Get user message that triggered this response
  const userMessage = messages[messageIndex - 1]?.content;
  
  // Resend to AI
  const result = await sendAIMessage(
    userMessage,
    messages.slice(0, messageIndex - 1),
    brief
  );
  
  // Replace assistant message
  setMessages(prev => {
    const newMessages = [...prev];
    newMessages[messageIndex] = {
      ...newMessages[messageIndex],
      content: result.response,
      regenerated: true
    };
    return newMessages;
  });
};
```

**Icon:**
- Refresh/cycle icon (outline)
- Disabled when loading
- Tooltip: "Regenerate response"

---

### 3. ⚠️ **Report Button with Dropdown**

**Features:**
- Click to open dropdown menu
- 6 preset report options
- Sends report to backend
- Shows confirmation message

**Report Options:**
1. **Response is not relevant** - AI didn't address the user's question
2. **Incorrect information** - Factually wrong or misleading
3. **Incomplete response** - Missing important details
4. **Confusing or unclear** - Hard to understand
5. **Offensive content** - Inappropriate or offensive
6. **Other issue** - General catch-all

**UI Implementation:**
```javascript
{/* Report Button with Dropdown */}
<div className="relative">
  <button onClick={() => setShowReportMenu(idx)}>
    <svg>{/* Alert triangle icon */}</svg>
  </button>
  
  {showReportMenu === idx && (
    <div className="absolute left-0 mt-2 w-64 bg-gray-800 
                    border border-gray-700 rounded-lg shadow-lg z-10">
      <div className="p-2">
        <div className="text-xs text-gray-400 font-semibold mb-2 px-2">
          Report an issue:
        </div>
        {reportOptions.map(option => (
          <button onClick={() => handleReport(idx, option.value)}
                  className="w-full text-left px-3 py-2 text-sm 
                           text-gray-300 hover:bg-gray-700 rounded">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )}
</div>
```

**Backend Integration:**
```javascript
const handleReport = async (messageIndex, reason) => {
  await axios.post('/api/ai-chat/feedback', {
    conversationId,
    messageIndex,
    messageContent: messages[messageIndex]?.content,
    feedback: 'report',
    reportReason: reason, // 'not_relevant', 'incorrect_info', etc.
    context: { brief, timestamp }
  });
  
  setMessageFeedback(prev => ({
    ...prev,
    [messageIndex]: 'reported'
  }));
  
  setShowReportMenu(null);
};
```

---

## 🎨 Visual Design

### Icon Styles
```css
/* All icons use outline style */
.feedback-icon {
  width: 16px;  /* w-4 */
  height: 16px; /* h-4 */
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

/* Inactive state */
.inactive {
  color: #9CA3AF; /* text-gray-400 */
}

/* Hover state */
.inactive:hover {
  color: #E5E7EB; /* text-gray-200 */
}

/* Active state - Like */
.active-like {
  color: #10B981; /* text-green-500 */
}

/* Active state - Dislike */
.active-dislike {
  color: #EF4444; /* text-red-500 */
}
```

### Layout
```
┌─────────────────────────────────────────────────┐
│  Assistant Message Content                      │
├─────────────────────────────────────────────────┤
│  [👍]  [👎]  [🔄]  [⚠️]  "Thanks for feedback!" │
│   ↑     ↑     ↑     ↑                           │
│  Like Dislike Regen Report                      │
└─────────────────────────────────────────────────┘

When Report clicked:
                     ┌────────────────────────────┐
                     │ Report an issue:           │
                     ├────────────────────────────┤
                     │ Response is not relevant   │
                     │ Incorrect information      │
                     │ Incomplete response        │
                     │ Confusing or unclear       │
                     │ Offensive content          │
                     │ Other issue                │
                     └────────────────────────────┘
```

---

## 📊 Feedback States

### State Management
```javascript
const [messageFeedback, setMessageFeedback] = useState({});
// Structure: { 
//   0: 'like',     // Message 0 was liked
//   2: 'dislike',  // Message 2 was disliked
//   4: 'reported'  // Message 4 was reported
// }

const [showReportMenu, setShowReportMenu] = useState(null);
// null = no menu open
// number = message index with open menu
```

### Confirmation Messages
```javascript
{messageFeedback[idx] && (
  <span className="text-xs text-gray-500 ml-2">
    {messageFeedback[idx] === 'like' && 'Thanks for your feedback!'}
    {messageFeedback[idx] === 'dislike' && "Thanks! We'll improve."}
    {messageFeedback[idx] === 'reported' && 'Report submitted. Thank you!'}
  </span>
)}
```

---

## 🔄 User Flows

### Like/Dislike Flow
```
1. User clicks thumbs up/down
2. Icon changes color (green/red)
3. Feedback sent to backend
4. Confirmation message shows
5. State persists in session
```

### Regenerate Flow
```
1. User clicks regenerate button
2. Loading state activates
3. Same user message resent to AI
4. New response generated
5. Assistant message replaced
6. Loading state clears
```

### Report Flow
```
1. User clicks report button (⚠️)
2. Dropdown menu appears
3. User selects issue type
4. Report sent to backend
5. Confirmation "Report submitted"
6. Menu closes
7. State saved (prevents duplicate reports)
```

---

## 📡 Backend Integration

### Feedback Endpoint
```javascript
POST /api/ai-chat/feedback

Body: {
  conversationId: string,
  messageIndex: number,
  messageContent: string,
  feedback: 'like' | 'dislike' | 'report',
  reportReason?: string, // Only for reports
  context: {
    brief: object,
    timestamp: string
  }
}
```

### Report Reasons (sent to backend)
- `not_relevant` - Response is not relevant
- `incorrect_info` - Incorrect information
- `incomplete` - Incomplete response
- `confusing` - Confusing or unclear
- `offensive` - Offensive content
- `other` - Other issue

---

## 🧪 Testing Instructions

### 1. Visual Test
- **Hard refresh:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Check icons:** Should be outline style, no backgrounds
- **Check colors:** Gray when inactive, green/red when active

### 2. Like/Dislike Test
```
1. Start a conversation
2. Get an AI response
3. Click thumbs up
   ✓ Icon turns green
   ✓ Shows "Thanks for your feedback!"
4. Click thumbs down
   ✓ Icon turns red
   ✓ Shows "Thanks! We'll improve."
```

### 3. Regenerate Test
```
1. Start a conversation
2. Get an AI response
3. Click regenerate button (🔄)
   ✓ Loading indicator shows
   ✓ New response appears
   ✓ Old response is replaced
4. Verify response is different
```

### 4. Report Test
```
1. Get an AI response
2. Click report button (⚠️)
   ✓ Dropdown menu appears
   ✓ Shows 6 report options
3. Click any option (e.g., "Response is not relevant")
   ✓ Menu closes
   ✓ Shows "Report submitted. Thank you!"
   ✓ Network tab shows POST to /api/ai-chat/feedback
```

### 5. Console Test
```javascript
// Check logs after feedback
// Like/Dislike:
📊 Feedback recorded: like for message 2

// Report:
[REPORT] Message 2 reported: not_relevant
📊 Report recorded: not_relevant for message 2

// Regenerate:
[REGENERATE] Regenerating response for message 2
```

---

## 📦 Bundle Info

**New Build:**
- `AIWizard-CMjzHx6R-1767801851580.js` (100.08 kB)
- Built: 2026-01-07
- +3 KB (new features)

**Files Changed:**
- `frontend/src/pages/AIWizard.jsx` (+139 lines, -9 lines)

---

## 🎯 Success Criteria

✅ **Visual:**
- Icons are outline style (no fill)
- No background colors on buttons
- Clean, minimal design

✅ **Functionality:**
- Like/Dislike works and saves feedback
- Regenerate fetches new AI response
- Report dropdown shows all 6 options
- All feedback sent to backend

✅ **UX:**
- Hover states work properly
- Tooltips show on hover
- Confirmation messages appear
- Report menu closes after selection

✅ **Performance:**
- No lag when clicking buttons
- Regenerate completes in 3-5 seconds
- Report menu opens instantly

---

## 🚀 Deployment

**Live URL:**
https://3000-ii2u2a7dw2eck8g09a9sb-cc2fbc16.sandbox.novita.ai/

**Status:** ✅ DEPLOYED & READY

**Commit:** `64f17ff feat(ai-wizard): Enhanced feedback UI`

---

## 📝 Summary

**Before:**
- Filled icons with backgrounds
- Only like/dislike options
- No way to regenerate responses
- No detailed feedback options

**After:**
- Clean outline icons
- Like/dislike + regenerate + report
- 6 preset report options
- Full backend integration
- Professional appearance

**Impact:**
- Better user feedback collection
- More control over AI responses
- Cleaner, more professional UI
- Enhanced user experience

---

**Date:** 2026-01-07  
**Branch:** fix/geography-kl-word-boundary  
**Commit:** 64f17ff  
**Status:** ✅ LIVE
