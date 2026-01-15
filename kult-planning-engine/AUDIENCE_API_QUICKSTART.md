# Audience API - Quick Start Guide

## 🚀 Instant Access

### Live API Endpoints
```bash
# Get all audience data (42 personas)
GET https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience

# Get statistics only
GET https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/stats

# Force refresh from Google Sheets
POST https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/refresh
```

## 📋 One-Line Tests

### cURL
```bash
# Test audience endpoint
curl https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience

# Test stats endpoint  
curl https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/stats

# Refresh cache
curl -X POST https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/refresh
```

### JavaScript (Browser Console)
```javascript
// Quick test - paste in browser console
fetch('https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience')
  .then(r => r.json())
  .then(d => console.log(`✅ ${d.count} personas loaded`, d.data));
```

## 📊 Response Example
```json
{
  "success": true,
  "count": 42,
  "data": [
    {
      "id": "aud_1",
      "Personas": "Entertainment",
      "Federal Territory of Kuala Lumpur": "1,540,000",
      "Selangor": "944,000",
      ...
    }
  ],
  "headers": ["Personas", "Federal Territory of Kuala Lumpur", ...],
  "stats": {
    "totalRecords": 42
  },
  "cached": false,
  "cacheAge": 0,
  "lastUpdated": "2025-11-29T15:18:19.772Z",
  "metadata": {
    "source": "Google Sheets CSV",
    "sheetId": "1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc",
    "gid": "0",
    "type": "audience"
  }
}
```

## 🎯 Key Features

✅ **42 Audience Personas** - Entertainment, Sports, Tech, Fashion, etc.  
✅ **17 Geographic Columns** - All Malaysian states and territories  
✅ **5-Minute Caching** - Fast response times  
✅ **Auto-Refresh** - Always up-to-date from Google Sheets  
✅ **Error Fallback** - Returns cached data if Google Sheets unavailable  

## 📁 Files

- **API Route**: `/backend/src/routes/audience.js`
- **Documentation**: `/AUDIENCE_API.md`
- **Test Page**: `/audience-test.html`
- **Summary**: `/AUDIENCE_API_SUMMARY.md`

## 🔧 Management Commands

```bash
# View backend logs
pm2 logs kult-backend --nostream

# Restart backend
cd /home/user/webapp && pm2 restart kult-backend

# Check backend status
pm2 list | grep kult-backend
```

## 📖 Full Documentation

See `AUDIENCE_API.md` for:
- Detailed endpoint descriptions
- Integration examples
- Error handling
- Performance optimization
- Frontend integration guide

## 🌐 Google Sheet Source

📊 **Live Data**: https://docs.google.com/spreadsheets/d/1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc/edit?gid=0#gid=0

---

**Status**: ✅ Operational  
**Last Updated**: 2025-11-29  
**Total Personas**: 42  
**Cache Duration**: 5 minutes  
