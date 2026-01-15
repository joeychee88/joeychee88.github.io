/**
 * Rates API
 * Fetches and parses rate card data from Google Sheets CSV in real-time
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Google Sheet CSV URL for Rates
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1yuwCrClue85lEv40EJpWc_b3Qef9vk3B3kouE2IByPE/export?format=csv';

// Cache configuration
let cachedData = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
 * Parse CSV string to rates array
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV has no data rows');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  
  console.log('CSV Headers:', headers);

  // Parse data rows - just return all data as is for now
  const rates = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]).map(cell => cell.replace(/^"|"$/g, '').trim());
    
    // Skip empty rows
    if (row.length === 0 || !row[0]) {
      continue;
    }

    // Create object with headers as keys
    const rateObj = { id: `rate_${i}` };
    headers.forEach((header, index) => {
      rateObj[header] = row[index] || '';
    });

    rates.push(rateObj);
  }

  console.log(`Parsed ${rates.length} rates`);

  return {
    rates,
    headers,
    stats: {
      total: rates.length
    }
  };
}

/**
 * Fetch data from Google Sheets
 */
async function fetchGoogleSheetData() {
  try {
    console.log('Fetching rates from Google Sheets...');
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
    
    console.log('Rates cache updated successfully');
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
async function getRatesData(skipCache = false) {
  const now = Date.now();
  
  // Return cached data if still valid and not skipping cache
  if (!skipCache && cachedData && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('Returning cached rates data');
    return {
      ...cachedData,
      cached: true,
      cacheAge: Math.round((now - cacheTimestamp) / 1000)
    };
  }
  
  // Fetch fresh data
  console.log('Cache expired or empty, fetching fresh rates data...');
  const data = await fetchGoogleSheetData();
  return {
    ...data,
    cached: false,
    cacheAge: 0
  };
}

/**
 * GET /api/rates
 * Returns all rate data
 * Query params:
 *   - skipCache: if true, forces fresh data fetch from Google Sheets
 */
router.get('/', async (req, res) => {
  try {
    const skipCache = req.query.skipCache === 'true';
    
    let data;
    if (skipCache) {
      console.log('skipCache=true - forcing fresh data fetch');
      cachedData = null;
      cacheTimestamp = null;
      data = await fetchGoogleSheetData();
      data.cached = false;
      data.cacheAge = 0;
    } else {
      data = await getRatesData();
    }
    
    res.json({
      success: true,
      count: data.rates.length,
      data: data.rates,
      headers: data.headers,
      stats: data.stats,
      cached: data.cached,
      cacheAge: data.cacheAge,
      lastUpdated: new Date(cacheTimestamp || Date.now()).toISOString(),
      metadata: {
        source: 'Google Sheets CSV',
        sheetId: '1yuwCrClue85lEv40EJpWc_b3Qef9vk3B3kouE2IByPE',
        type: 'rate_cards'
      }
    });
  } catch (error) {
    console.error('Error in /api/rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rates',
      message: error.message
    });
  }
});

export default router;
