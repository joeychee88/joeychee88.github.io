# Audience API Documentation

## Overview

The Audience API provides access to audience data from Google Sheets, with automatic CSV parsing, caching, and statistics calculation.

## Google Sheet Source

- **Sheet URL**: https://docs.google.com/spreadsheets/d/1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc/edit?gid=0#gid=0
- **Sheet ID**: `1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc`
- **GID**: `0`
- **Type**: Audience personas with geographical distribution data

## Endpoints

### 1. Get All Audience Data

**GET** `/api/audience`

Fetches all audience data from Google Sheets with automatic parsing.

**Response:**
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
      "Johor": "197,000",
      ...
    }
  ],
  "headers": [
    "Personas",
    "Federal Territory of Kuala Lumpur",
    "Selangor",
    ...
  ],
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

**Response Fields:**
- `success`: Boolean indicating request success
- `count`: Total number of audience records
- `data`: Array of audience objects with unique IDs
- `headers`: Array of column headers from the spreadsheet
- `stats`: Statistical information about the dataset
- `cached`: Whether data was served from cache
- `cacheAge`: Age of cached data in seconds
- `lastUpdated`: ISO timestamp of last cache update
- `metadata`: Information about the data source

### 2. Get Audience Statistics

**GET** `/api/audience/stats`

Returns statistical information about the audience data.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRecords": 42
  },
  "cached": true,
  "cacheAge": 6
}
```

### 3. Force Refresh Cache

**POST** `/api/audience/refresh`

Forces a refresh of the cached data from Google Sheets.

**Response:**
```json
{
  "success": true,
  "message": "Cache refreshed successfully",
  "count": 42,
  "stats": {
    "totalRecords": 42
  }
}
```

## Caching Behavior

- **Cache Duration**: 5 minutes
- **Automatic Refresh**: Cache automatically refreshes after expiration
- **Manual Refresh**: Use the `/api/audience/refresh` endpoint to force refresh
- **Fallback**: If Google Sheets is unavailable, returns last cached data

## Data Structure

Each audience record contains:
- `id`: Unique identifier (e.g., "aud_1", "aud_2")
- `Personas`: Name of the audience persona
- **State/Territory columns**: Numerical values representing audience size in each Malaysian state

### Current Headers (Columns)
1. Personas
2. Federal Territory of Kuala Lumpur
3. Selangor
4. Johor
5. Perak
6. Sabah
7. Sarawak
8. Penang
9. Kedah
10. Negeri Sembilan
11. Malacca
12. Kelantan
13. Terengganu
14. Pahang
15. Putrajaya
16. Perlis
17. Labuan Federal Territory

## Sample Personas

The dataset includes 42 audience personas:
- Entertainment
- Active Lifestyle Seekers
- Badminton
- Romantic Comedy
- Adventure Enthusiasts
- Health & Wellness Shoppers
- Foodies
- Sports
- Travel & Experience Seekers
- Young Working Adult
- EPL Super Fans
- Tech & Gadget Enthusiasts
- Online Shoppers
- Family segments
- And more...

## Usage Examples

### JavaScript (Frontend)
```javascript
// Fetch all audience data
const response = await fetch('http://localhost:5001/api/audience');
const data = await response.json();

if (data.success) {
  console.log(`Total personas: ${data.count}`);
  console.log('Audience data:', data.data);
  console.log('Headers:', data.headers);
}

// Get statistics only
const statsResponse = await fetch('http://localhost:5001/api/audience/stats');
const stats = await statsResponse.json();
console.log('Stats:', stats);

// Force refresh cache
const refreshResponse = await fetch('http://localhost:5001/api/audience/refresh', {
  method: 'POST'
});
const refreshResult = await refreshResponse.json();
console.log('Refresh result:', refreshResult);
```

### cURL
```bash
# Get all audience data
curl http://localhost:5001/api/audience

# Get statistics
curl http://localhost:5001/api/audience/stats

# Force refresh
curl -X POST http://localhost:5001/api/audience/refresh
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Failed to fetch audience data",
  "message": "Detailed error message here"
}
```

**HTTP Status Codes:**
- `200`: Success
- `500`: Internal server error (Google Sheets fetch failed, parsing error, etc.)

## Implementation Details

### CSV Parsing
- Handles quoted fields correctly
- Preserves text casing for persona names
- Converts numerical values with commas to numbers
- Skips empty rows

### Data Processing
- Automatically generates unique IDs for each record
- Preserves original column headers from Google Sheets
- Maintains geographical data integrity
- Calculates statistics for numerical fields

### Performance
- 5-minute cache reduces Google Sheets API calls
- Fast response times from cache (~10ms)
- Automatic failover to cached data on fetch errors
- CSV parsing optimized for large datasets

## Integration with Frontend

To use the Audience API in your React frontend:

```jsx
import { useState, useEffect } from 'react';

function AudienceComponent() {
  const [audience, setAudience] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudienceData();
  }, []);

  const fetchAudienceData = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/audience');
      const data = await response.json();
      
      if (data.success) {
        setAudience(data.data);
      }
    } catch (error) {
      console.error('Error fetching audience:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:5001/api/audience/refresh', {
        method: 'POST'
      });
      await fetchAudienceData();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Audience Data</h1>
      <button onClick={handleRefresh}>Refresh</button>
      <p>Total Personas: {audience.length}</p>
      <ul>
        {audience.map(item => (
          <li key={item.id}>{item.Personas}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API Comparison with Inventory API

Both APIs follow the same pattern:

| Feature | Audience API | Inventory API |
|---------|--------------|---------------|
| Base Route | `/api/audience` | `/api/inventory` |
| Sheet ID | `1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc` | `1FCBX0EDhPmPSe4-AjbuwxoDQwkLGuyBd8IrLYbnQ4xM` |
| Cache Duration | 5 minutes | 5 minutes |
| Data Type | Audience personas | Site inventory |
| Record Prefix | `aud_` | `inv_` |

## Support

For issues or questions:
1. Check the backend logs: `pm2 logs kult-backend`
2. Verify the Google Sheet is accessible
3. Test the API endpoints manually with cURL
4. Check cache status in the response

## Version History

- **v1.0.0** (2025-11-29): Initial release
  - CSV parsing from Google Sheets
  - 5-minute caching
  - Statistics calculation
  - Manual refresh endpoint
