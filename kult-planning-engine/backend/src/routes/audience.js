/**
 * Audience API
 * Fetches and parses audience data from Google Sheets CSV in real-time
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Google Sheet CSV URL for Audience Data
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc/export?format=csv&gid=0';

// Cache configuration
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Convert text to sentence case
 */
function toSentenceCase(text) {
  if (!text) return '';
  const str = text.toString().toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parse CSV line respecting quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV string to audience array
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV has no data rows');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  
  console.log('Audience CSV Headers:', headers);

  // Parse data rows
  const audience = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(cell => cell.replace(/^"|"$/g, '').trim());
    
    // Skip empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    // Extract data with proper formatting
    const rowData = {};
    
    headers.forEach((header, index) => {
      const value = row[index] || '';
      const lowerHeader = header.toLowerCase();
      
      // Special handling for numeric fields
      if (lowerHeader.includes('count') || lowerHeader.includes('number') || 
          lowerHeader.includes('total') || lowerHeader.includes('percentage') ||
          lowerHeader.includes('rate') || lowerHeader.includes('age') ||
          lowerHeader.includes('score') || lowerHeader.includes('index')) {
        // Remove commas, percentage signs, and parse as number
        const cleanedValue = value.replace(/[,%]/g, '').trim();
        const numValue = parseFloat(cleanedValue);
        rowData[header] = isNaN(numValue) ? 0 : numValue;
      }
      // Keep text fields as-is (preserve original casing for audience data)
      else {
        rowData[header] = value;
      }
    });
    
    audience.push({
      id: `aud_${i}`,
      ...rowData
    });
  }

  console.log(`Parsed ${audience.length} audience records`);

  // Calculate statistics
  const stats = calculateStats(audience, headers);

  return {
    audience,
    headers,
    stats
  };
}

/**
 * Calculate statistics from audience data
 */
function calculateStats(audience, headers) {
  if (audience.length === 0) return {};
  
  const stats = {
    totalRecords: audience.length
  };
  
  // Calculate sums and averages for numeric columns
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('count') || lowerHeader.includes('number') || 
        lowerHeader.includes('total') || lowerHeader.includes('percentage') ||
        lowerHeader.includes('rate') || lowerHeader.includes('score') ||
        lowerHeader.includes('index')) {
      
      const values = audience.map(item => parseFloat(item[header]) || 0);
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      stats[`total_${header}`] = Math.round(sum);
      stats[`avg_${header}`] = parseFloat(avg.toFixed(2));
      stats[`max_${header}`] = max;
      stats[`min_${header}`] = min;
    }
  });
  
  // Get unique values for categorical fields
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('category') || lowerHeader.includes('type') || 
        lowerHeader.includes('segment') || lowerHeader.includes('group') ||
        lowerHeader.includes('gender') || lowerHeader.includes('location') ||
        lowerHeader.includes('device') || lowerHeader.includes('interest')) {
      const unique = [...new Set(audience.map(item => item[header]).filter(v => v))];
      stats[`unique_${header}`] = unique.length;
      stats[`${header}_list`] = unique;
    }
  });
  
  return stats;
}

/**
 * Fetch data from Google Sheets
 */
async function fetchGoogleSheetData() {
  try {
    console.log('Fetching audience data from Google Sheets...');
    const response = await axios.get(GOOGLE_SHEET_CSV_URL, {
      timeout: 15000,
      headers: {
        'User-Agent': 'KULT-Planning-Engine/1.0'
      }
    });

    console.log('Google Sheets response received, parsing CSV...');
    const parsed = parseCSV(response.data);
    
    // Update cache
    cachedData = parsed;
    cacheTimestamp = Date.now();
    
    console.log('Audience cache updated successfully');
    return parsed;
  } catch (error) {
    console.error('Error fetching Google Sheet:', error.message);
    
    // Return cached data if available
    if (cachedData) {
      console.log('Returning cached data due to fetch error');
      return cachedData;
    }
    
    throw error;
  }
}

/**
 * Get cached data or fetch fresh data
 */
async function getAudienceData() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached audience data');
    return {
      ...cachedData,
      cached: true,
      cacheAge: Math.round((now - cacheTimestamp) / 1000)
    };
  }
  
  // Fetch fresh data
  console.log('Cache expired or empty, fetching fresh audience data...');
  const data = await fetchGoogleSheetData();
  return {
    ...data,
    cached: false,
    cacheAge: 0
  };
}

/**
 * GET /api/audience
 * Returns all audience data
 */
router.get('/', async (req, res) => {
  try {
    const data = await getAudienceData();
    
    res.json({
      success: true,
      count: data.audience.length,
      data: data.audience,
      headers: data.headers,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge,
      lastUpdated: new Date(cacheTimestamp || Date.now()).toISOString(),
      metadata: {
        source: 'Google Sheets CSV',
        sheetId: '1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc',
        gid: '0',
        type: 'audience'
      }
    });
  } catch (error) {
    console.error('Error in /api/audience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience data',
      message: error.message
    });
  }
});

/**
 * GET /api/audience/stats
 * Returns audience statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const data = await getAudienceData();
    
    res.json({
      success: true,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge
    });
  } catch (error) {
    console.error('Error in /api/audience/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audience stats',
      message: error.message
    });
  }
});

/**
 * POST /api/audience/refresh
 * Force refresh cache
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('Manual refresh requested for audience');
    cachedData = null;
    cacheTimestamp = null;
    
    const data = await fetchGoogleSheetData();
    
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      count: data.audience.length,
      stats: data.stats
    });
  } catch (error) {
    console.error('Error in /api/audience/refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: error.message
    });
  }
});

export default router;
