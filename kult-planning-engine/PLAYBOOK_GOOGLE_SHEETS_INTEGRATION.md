# Industry Playbook Google Sheets Integration

## Problem Statement

The AI Wizard's media plan output was **not following the industry playbook** guidelines. The playbook data was hardcoded and outdated, missing critical industry-specific:
- ❌ Format recommendations
- ❌ Persona mappings  
- ❌ Key IP/site recommendations
- ❌ Watchouts and guidelines
- ❌ Strategy DNA positioning

---

## Solution

Created a **Google Sheets integration** that fetches live data from the KULT Logic Table.

### 📊 Data Source

**Google Sheet:** [KULT Logic Table](https://docs.google.com/spreadsheets/d/1MxEB4SpLeP9JTvUF9_g9pGNhUjVEx7lLEKCt6UCdxQQ/edit?gid=2047200995#gid=2047200995)

**Sheet Structure (12 columns):**
1. **Industry** - Industry name/vertical
2. **Astro Personas** - Primary personas for targeting
3. **Malaysia Market Truths** - Local market insights
4. **Core Consumer Triggers** - Key motivators
5. **Strategy DNA** - Industry positioning strategy
6. **Key Formats** - Recommended ad formats
7. **Key IPs** - Recommended sites/channels
8. **Channels** - Distribution channels
9. **Mandatory Channels** - Must-have channels
10. **Never Do** - Restrictions
11. **KPIs** - Success metrics
12. **Watchouts** - Critical guidelines

---

## Implementation

### New Script: `backend/src/fetchPlaybook.js`

**Features:**
- ✅ Fetches from public Google Sheet (no authentication)
- ✅ Uses CSV export for reliability
- ✅ Proper CSV parsing (handles quoted fields)
- ✅ Splits data by semicolons AND commas
- ✅ Deduplicates arrays
- ✅ Generates industry keys automatically
- ✅ Creates funnel-stage structure
- ✅ Saves to `frontend/src/data/verticalPlaybook.json`

**How It Works:**

```javascript
// 1. Fetch CSV export from Google Sheets
const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const response = await axios.get(csvUrl);

// 2. Parse CSV with proper quote handling
const rows = parseCSV(response.data);

// 3. Transform into playbook structure
const playbookData = {
  persona_mapping: {...},     // Industry -> Personas
  vertical_playbook: {...},   // Industry -> Formats
  metadata: {...}             // Metadata
};

// 4. Save to JSON
fs.writeFileSync('frontend/src/data/verticalPlaybook.json', JSON.stringify(playbookData));
```

---

## Data Structure

### Output Format: `verticalPlaybook.json`

```json
{
  "persona_mapping": {
    "automotive_ice": {
      "primary_personas": [
        "Automotive Enthusiasts",
        "Automotive Intent",
        "Gadget Gurus"
      ],
      "secondary_personas": [],
      "key_ips": [
        "Sooka",
        "YouTube Channels",
        "Astro GO"
      ],
      "watchouts": [
        "Never use FMCG personas"
      ]
    }
  },
  "vertical_playbook": {
    "automotive_ice": {
      "label": "Automotive (ICE)",
      "strategy_dna": "Awareness + High Consideration",
      "funnel": {
        "awareness": ["Product Collector", "In-stream", "Video In-Banner"],
        "consideration": ["Data Capture", "In-Read", "Carousel"],
        "conversion": ["Interstitial", "Mini Game", "Countdown"]
      }
    }
  },
  "metadata": {
    "last_updated": "2025-12-04T12:00:00.000Z",
    "source": "Google Sheets Logic Table",
    "total_industries": 20
  }
}
```

---

## Industries Covered

The updated playbook includes **20 industries**:

| Industry Key | Label | Strategy DNA |
|--------------|-------|--------------|
| `automotive_ice` | Automotive (ICE) | Awareness + High Consideration |
| `automotive_ev` | Automotive (EV) | Innovation + Early Adopter Focus |
| `property_luxury` | Property (Luxury) | Aspirational + Lifestyle Driven |
| `property_mid_range` | Property (Mid-Range) | Practical + Value Focus |
| `property_affordable` | Property (Affordable) | Access + Family Needs |
| `fmcg` | FMCG | Mass Reach + Frequency |
| `beauty` | Beauty & Cosmetics | Visual + Demonstration |
| `retail_ecommerce` | Retail / E-commerce | Conversion + Promo |
| `finance_insurance` | Finance & Insurance | Trust + Credibility |
| `telco` | Telco | Offer + Value Communication |
| `travel` | Travel | Aspiration + Experience |
| `education` | Education | Long Consideration + Trust |
| `f_b` | F&B | Craving + Social |
| `healthcare` | Healthcare | Trust + Authority |
| `entertainment` | Entertainment | Engagement + Excitement |
| `gaming` | Gaming | Community + Competitive |
| `parenting` | Parenting | Support + Guidance |
| `tech_gadgets` | Tech & Gadgets | Innovation + Early Adopter |
| `fashion` | Fashion | Trend + Lifestyle |
| `sports_fitness` | Sports & Fitness | Performance + Health |

---

## Usage

### Fetch Latest Playbook Data

```bash
cd /home/user/webapp/backend
node src/fetchPlaybook.js
```

**Output:**
```
🔄 Fetching playbook data from Google Sheets...
📥 Fetching from: https://docs.google.com/spreadsheets/d/...
✅ Fetched 21 rows from Google Sheet
📋 Headers: ['Industry', 'Astro Personas', ...]
✅ Playbook data saved to: frontend/src/data/verticalPlaybook.json
📊 Industries processed: 20
✅ Playbook data fetch completed successfully
```

### Rebuild Frontend

```bash
cd /home/user/webapp/frontend
npm run build
pm2 restart kult-frontend
```

---

## Key Improvements

### 1. **Industry-Specific Personas**

**BEFORE:**
```javascript
// Generic personas for all industries
audiences = ['Young Working Adult', 'Family Dynamic']
```

**AFTER:**
```javascript
// Automotive gets:
audiences = ['Automotive Enthusiasts', 'Automotive Intent', 'Gadget Gurus']

// Beauty gets:
audiences = ['Fashion Icons', 'Young Working Adult', 'Youth Mom']
```

---

### 2. **Industry-Specific Formats**

**BEFORE:**
```javascript
// Generic formats
formats = ['Leaderboard', 'Mobile Banner', 'Masthead']
```

**AFTER:**
```javascript
// Automotive gets:
formats = ['Product Collector', 'Data Capture', 'In-stream', 'Video In-Banner']

// Beauty gets:
formats = ['Carousel', 'Video Tutorial', 'Product Demo', 'Influencer Content']
```

---

### 3. **Key IP Recommendations**

**NEW FEATURE:**
```javascript
// Automotive campaigns prioritize:
key_ips = ['Sooka', 'YouTube Channels', 'Astro GO', 'Stadium Astro']

// Beauty campaigns prioritize:
key_ips = ['Hijabista', 'Remaja', 'Nona', 'Gempak', 'Mingguan Wanita']
```

---

### 4. **Watchouts/Guidelines**

**NEW FEATURE:**
```javascript
// Automotive:
watchouts = ['Never use FMCG personas']

// Beauty:
watchouts = ['Avoid over-targeting one female segment']

// Property:
watchouts = ['Persona must match price tier']
```

---

## Technical Details

### CSV Parsing

The script handles complex CSV with proper quote parsing:

```javascript
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const rows = [];
  
  for (const line of lines) {
    let currentField = '';
    let inQuotes = false;
    
    // Handle quoted fields: "Value with, comma"
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  
  return rows;
}
```

### List Field Parsing

Handles both semicolons and commas:

```javascript
// Input: "Persona A; Persona B, Persona C"
const personas = text.split(/[;,\n]+/)
  .map(p => p.trim())
  .filter(p => p.length > 0);

// Output: ['Persona A', 'Persona B', 'Persona C']
```

### Industry Key Generation

Automatically generates clean keys:

```javascript
const industryKey = industry
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric
  .replace(/^_+|_+$/g, '');      // Remove leading/trailing

// "Property (Luxury)" → "property_luxury"
// "Finance & Insurance" → "finance_insurance"
```

---

## Testing

### Verify Data Update

```bash
# Check generated file
cat frontend/src/data/verticalPlaybook.json | jq '.metadata'

# Should show:
{
  "last_updated": "2025-12-04T...",
  "source": "Google Sheets Logic Table",
  "spreadsheet_id": "1MxEB4SpLeP9JTvUF9_g9pGNhUjVEx7lLEKCt6UCdxQQ",
  "total_industries": 20
}
```

### Test in AI Wizard

1. Start a campaign: "launching new car"
2. Check console logs: Should show "Automotive (ICE)" playbook
3. Verify formats match Google Sheet
4. Verify personas match Google Sheet

---

## Maintenance

### Update Playbook Data

Whenever the Google Sheet is updated:

```bash
cd backend
node src/fetchPlaybook.js
cd ../frontend
npm run build
pm2 restart kult-frontend
```

### Automate Updates (Optional)

Add to cron job:

```bash
# Update playbook daily at 2 AM
0 2 * * * cd /path/to/backend && node src/fetchPlaybook.js && cd ../frontend && npm run build && pm2 restart kult-frontend
```

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `backend/package.json` | Modified | Added `googleapis` dependency |
| `backend/src/fetchPlaybook.js` | NEW | Google Sheets fetcher script |
| `frontend/src/data/verticalPlaybook.json` | Modified | Updated with real data (20 industries) |

---

## Benefits

1. **✅ Real Data** - Fetches live data from Google Sheets
2. **✅ Easy Updates** - Non-technical team can update sheet
3. **✅ No Auth** - Uses public CSV export (no API key needed)
4. **✅ Robust Parsing** - Handles quotes, commas, semicolons
5. **✅ Automated** - Can be scheduled with cron
6. **✅ Documented** - Includes metadata and source tracking
7. **✅ Industry-Specific** - 20 industries with unique strategies
8. **✅ Comprehensive** - Personas, formats, IPs, watchouts

---

## Status

✅ **IMPLEMENTED** - Google Sheets integration complete  
✅ **DATA LOADED** - 20 industries with full playbook data  
✅ **DEPLOYED** - Frontend rebuilt with new data  
✅ **TESTED** - Verified playbook loading in AI Wizard  

---

**Last Updated:** 2025-12-04  
**Branch:** `fix/geography-kl-word-boundary`  
**Script:** `backend/src/fetchPlaybook.js`  
**Data File:** `frontend/src/data/verticalPlaybook.json`
