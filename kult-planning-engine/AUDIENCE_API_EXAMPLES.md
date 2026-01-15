# Audience API - Code Examples

## Quick Integration Examples

### 1. React Component

```jsx
import { useState, useEffect } from 'react';

function AudienceList() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAudience();
  }, []);

  const fetchAudience = async () => {
    try {
      const response = await fetch(
        'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience'
      );
      const data = await response.json();
      
      if (data.success) {
        setPersonas(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await fetch(
        'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/refresh',
        { method: 'POST' }
      );
      await fetchAudience();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Audience Personas ({personas.length})</h1>
      <button onClick={refreshData}>Refresh Data</button>
      <ul>
        {personas.map(persona => (
          <li key={persona.id}>
            <strong>{persona.Personas}</strong>
            <div>KL: {persona['Federal Territory of Kuala Lumpur']}</div>
            <div>Selangor: {persona.Selangor}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AudienceList;
```

### 2. Vanilla JavaScript

```javascript
// Fetch and display audience data
async function loadAudience() {
  try {
    const response = await fetch(
      'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience'
    );
    const data = await response.json();

    if (data.success) {
      console.log(`Loaded ${data.count} personas`);
      displayAudience(data.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function displayAudience(personas) {
  const container = document.getElementById('audience-list');
  
  container.innerHTML = personas.map(p => `
    <div class="persona-card">
      <h3>${p.Personas}</h3>
      <p>KL: ${p['Federal Territory of Kuala Lumpur']}</p>
      <p>Selangor: ${p.Selangor}</p>
    </div>
  `).join('');
}

// Call on page load
loadAudience();
```

### 3. jQuery

```javascript
// Fetch audience with jQuery
$.ajax({
  url: 'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience',
  method: 'GET',
  success: function(data) {
    if (data.success) {
      console.log('Total personas:', data.count);
      
      // Display personas
      $('#audience-list').empty();
      data.data.forEach(function(persona) {
        $('#audience-list').append(`
          <div class="persona">
            <h4>${persona.Personas}</h4>
            <p>Total audience in KL: ${persona['Federal Territory of Kuala Lumpur']}</p>
          </div>
        `);
      });
    }
  },
  error: function(err) {
    console.error('Error fetching audience:', err);
  }
});

// Refresh data
$('#refresh-btn').click(function() {
  $.ajax({
    url: 'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/refresh',
    method: 'POST',
    success: function() {
      location.reload(); // Reload to fetch fresh data
    }
  });
});
```

### 4. Node.js Backend

```javascript
import axios from 'axios';

// Fetch audience data
async function getAudienceData() {
  try {
    const response = await axios.get(
      'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience'
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('Error fetching audience:', error.message);
    return [];
  }
}

// Get statistics
async function getAudienceStats() {
  const response = await axios.get(
    'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/stats'
  );
  return response.data.stats;
}

// Refresh cache
async function refreshAudienceCache() {
  await axios.post(
    'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience/refresh'
  );
}

// Usage
(async () => {
  const personas = await getAudienceData();
  console.log(`Loaded ${personas.length} personas`);
  
  const stats = await getAudienceStats();
  console.log('Stats:', stats);
})();
```

### 5. Python

```python
import requests
import json

# Base URL
BASE_URL = 'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai'

def get_audience_data():
    """Fetch all audience data"""
    response = requests.get(f'{BASE_URL}/api/audience')
    data = response.json()
    
    if data['success']:
        print(f"Loaded {data['count']} personas")
        return data['data']
    else:
        print(f"Error: {data.get('message')}")
        return []

def get_audience_stats():
    """Get statistics only"""
    response = requests.get(f'{BASE_URL}/api/audience/stats')
    return response.json()

def refresh_cache():
    """Force refresh cache"""
    response = requests.post(f'{BASE_URL}/api/audience/refresh')
    return response.json()

# Usage
if __name__ == '__main__':
    # Get all audience data
    personas = get_audience_data()
    for persona in personas[:5]:  # Print first 5
        print(f"- {persona['Personas']}: KL={persona['Federal Territory of Kuala Lumpur']}")
    
    # Get stats
    stats = get_audience_stats()
    print(f"\nTotal records: {stats['stats']['totalRecords']}")
    
    # Refresh cache
    result = refresh_cache()
    print(f"\nCache refresh: {result['message']}")
```

### 6. cURL Scripts

```bash
#!/bin/bash
# save as: test-audience-api.sh

BASE_URL="https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai"

echo "Testing Audience API"
echo "===================="
echo ""

# Test 1: Get all data
echo "1. Fetching all audience data..."
curl -s "$BASE_URL/api/audience" | jq '{success, count, cached}'
echo ""

# Test 2: Get stats
echo "2. Fetching statistics..."
curl -s "$BASE_URL/api/audience/stats" | jq '.'
echo ""

# Test 3: Refresh cache
echo "3. Refreshing cache..."
curl -s -X POST "$BASE_URL/api/audience/refresh" | jq '.'
echo ""

echo "All tests completed!"
```

### 7. Excel/VBA

```vba
Sub FetchAudienceData()
    Dim http As Object
    Dim json As Object
    Dim url As String
    
    ' API URL
    url = "https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience"
    
    ' Create HTTP request
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.Open "GET", url, False
    http.send
    
    ' Parse JSON response
    Set json = JsonConverter.ParseJson(http.responseText)
    
    ' Clear existing data
    Sheets("Audience").Range("A2:Z1000").Clear
    
    ' Write headers
    Sheets("Audience").Range("A1").Value = "Persona"
    Sheets("Audience").Range("B1").Value = "Kuala Lumpur"
    Sheets("Audience").Range("C1").Value = "Selangor"
    
    ' Write data
    Dim i As Integer
    i = 2
    For Each persona In json("data")
        Sheets("Audience").Range("A" & i).Value = persona("Personas")
        Sheets("Audience").Range("B" & i).Value = persona("Federal Territory of Kuala Lumpur")
        Sheets("Audience").Range("C" & i).Value = persona("Selangor")
        i = i + 1
    Next persona
    
    MsgBox "Loaded " & json("count") & " personas"
End Sub
```

### 8. Google Apps Script (Google Sheets)

```javascript
function importAudienceData() {
  const url = 'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience';
  
  try {
    // Fetch data
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Get active sheet
    const sheet = SpreadsheetApp.getActiveSheet();
    sheet.clear();
    
    // Write headers
    const headers = data.headers;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Write data
    const personas = data.data;
    const rows = personas.map(p => headers.map(h => p[h]));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    
    // Format
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
    
    SpreadsheetApp.getUi().alert(`Imported ${data.count} personas successfully!`);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}
```

## Common Use Cases

### Filter by State
```javascript
// Get all personas with > 1M audience in KL
const response = await fetch('https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience');
const data = await response.json();

const popularInKL = data.data.filter(p => {
  const count = parseInt(p['Federal Territory of Kuala Lumpur'].replace(/,/g, ''));
  return count > 1000000;
});

console.log(`Found ${popularInKL.length} personas with 1M+ in KL`);
```

### Calculate Total Audience
```javascript
// Sum total audience across all states for a persona
function getTotalAudience(persona) {
  const states = [
    'Federal Territory of Kuala Lumpur', 'Selangor', 'Johor', 'Perak',
    'Sabah', 'Sarawak', 'Penang', 'Kedah', 'Negeri Sembilan', 'Malacca',
    'Kelantan', 'Terengganu', 'Pahang', 'Putrajaya', 'Perlis',
    'Labuan Federal Territory'
  ];
  
  return states.reduce((total, state) => {
    const value = persona[state].replace(/,/g, '');
    return total + parseInt(value);
  }, 0);
}

// Usage
const response = await fetch('https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience');
const data = await response.json();

data.data.forEach(persona => {
  const total = getTotalAudience(persona);
  console.log(`${persona.Personas}: ${total.toLocaleString()} total`);
});
```

### Top Personas by State
```javascript
// Find top 5 personas in Selangor
const response = await fetch('https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience');
const data = await response.json();

const topSelangor = data.data
  .map(p => ({
    name: p.Personas,
    count: parseInt(p.Selangor.replace(/,/g, ''))
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 5);

console.log('Top 5 in Selangor:', topSelangor);
```

## Error Handling Example

```javascript
async function safeAudienceFetch() {
  try {
    const response = await fetch(
      'https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/audience',
      { timeout: 10000 } // 10 second timeout
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API returned success: false');
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch audience data:', error);
    
    // Return cached data or empty array
    return {
      success: false,
      error: error.message,
      data: [],
      count: 0
    };
  }
}
```

## Integration Tips

1. **Caching**: The API caches data for 5 minutes. Don't implement your own caching unless needed.

2. **Error Handling**: Always check `data.success` before accessing `data.data`.

3. **Number Formatting**: Values include commas (e.g., "1,540,000"). Remove with `.replace(/,/g, '')` before parsing.

4. **Column Access**: State names have spaces. Use bracket notation: `persona['Federal Territory of Kuala Lumpur']`

5. **Refresh Strategy**: Only refresh when data is stale. Check `data.cached` and `data.cacheAge`.

6. **CORS**: API has CORS enabled. Safe to call from any frontend.

7. **Rate Limiting**: No rate limiting currently. Cache is refreshed automatically every 5 minutes.

---

For more examples and full API documentation, see `AUDIENCE_API.md`
