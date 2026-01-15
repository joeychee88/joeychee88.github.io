import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Sheet configuration
const SPREADSHEET_ID = '1MxEB4SpLeP9JTvUF9_g9pGNhUjVEx7lLEKCt6UCdxQQ';
const SHEET_GID = '2047200995'; // From the URL gid parameter

async function fetchPlaybookData() {
  try {
    console.log('🔄 Fetching playbook data from Google Sheets...');
    
    // Fetch CSV export of the sheet (publicly accessible)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    console.log('📥 Fetching from:', csvUrl);
    
    const response = await axios.get(csvUrl);
    const csvData = response.data;
    
    // Parse CSV
    const rows = parseCSV(csvData);
    
    if (!rows || rows.length === 0) {
      console.error('❌ No data found in the sheet');
      return;
    }
    
    console.log(`✅ Fetched ${rows.length} rows from Google Sheet`);
    
    // Parse the sheet structure
    const headers = rows[0];
    console.log('📋 Headers:', headers);
    
    // Transform data into playbook format
    const playbookData = parsePlaybookData(rows);
    
    // Save to frontend data folder
    const outputPath = path.join(__dirname, '../../frontend/src/data/verticalPlaybook.json');
    fs.writeFileSync(outputPath, JSON.stringify(playbookData, null, 2));
    
    console.log(`✅ Playbook data saved to: ${outputPath}`);
    console.log(`📊 Industries processed: ${Object.keys(playbookData.vertical_playbook || {}).length}`);
    
    return playbookData;
  } catch (error) {
    console.error('❌ Error fetching playbook data:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const rows = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Simple CSV parsing (handles quoted fields)
    const row = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField.trim());
    rows.push(row);
  }
  
  return rows;
}

function parsePlaybookData(rows) {
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  // Find column indices
  const getColumnIndex = (headerName) => {
    const variations = Array.isArray(headerName) ? headerName : [headerName];
    for (const name of variations) {
      const index = headers.findIndex(h => 
        h && h.toLowerCase().includes(name.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  };
  
  const industryCol = getColumnIndex(['industry', 'vertical']);
  const objectiveCol = getColumnIndex(['objective', 'campaign objective']);
  const funnelCol = getColumnIndex(['funnel', 'funnel stage']);
  const formatsCol = getColumnIndex(['formats', 'recommended formats', 'format']);
  const personasCol = getColumnIndex(['personas', 'primary personas', 'persona']);
  const secondaryPersonasCol = getColumnIndex(['secondary', 'secondary personas']);
  const keyIPsCol = getColumnIndex(['key ip', 'keyips', 'key ips']);
  const strategyCol = getColumnIndex(['strategy', 'strategy dna']);
  const watchoutsCol = getColumnIndex(['watchout', 'watchouts']);
  
  console.log('📍 Column mapping:', {
    industry: industryCol,
    objective: objectiveCol,
    funnel: funnelCol,
    formats: formatsCol,
    personas: personasCol,
    secondaryPersonas: secondaryPersonasCol,
    keyIPs: keyIPsCol,
    strategy: strategyCol,
    watchouts: watchoutsCol
  });
  
  const verticalPlaybook = {};
  const personaMapping = {};
  
  dataRows.forEach((row, index) => {
    if (!row || row.length === 0) return;
    
    const industry = row[industryCol]?.trim();
    if (!industry) return;
    
    // Generate industry key
    const industryKey = industry.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Get formats (split by semicolon AND comma)
    const formatsStr = row[formatsCol]?.trim() || '';
    const formats = formatsStr
      .split(/[;,\n]+/)
      .map(f => f.trim())
      .filter(f => f.length > 0);
    
    // Initialize industry if not exists
    if (!verticalPlaybook[industryKey]) {
      verticalPlaybook[industryKey] = {
        label: industry,
        strategy_dna: row[strategyCol]?.trim() || 'Balanced approach',
        funnel: {
          awareness: [],
          consideration: [],
          conversion: []
        }
      };
    }
    
    // Add formats to all funnel stages (since sheet doesn't specify funnel stages)
    verticalPlaybook[industryKey].funnel.awareness.push(...formats);
    verticalPlaybook[industryKey].funnel.consideration.push(...formats);
    verticalPlaybook[industryKey].funnel.conversion.push(...formats);
    
    // Parse personas (split by semicolon AND comma)
    const primaryPersonas = (row[personasCol] || '')
      .split(/[;,\n]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const secondaryPersonas = secondaryPersonasCol !== -1
      ? (row[secondaryPersonasCol] || '')
          .split(/[;,\n]+/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
      : [];
    
    // Parse Key IPs (split by semicolon AND comma)
    const keyIPs = keyIPsCol !== -1
      ? (row[keyIPsCol] || '')
          .split(/[;,\n]+/)
          .map(ip => ip.trim())
          .filter(ip => ip.length > 0)
      : [];
    
    // Parse Watchouts (split by semicolon AND comma)
    const watchouts = watchoutsCol !== -1
      ? (row[watchoutsCol] || '')
          .split(/[;,\n]+/)
          .map(w => w.trim())
          .filter(w => w.length > 0)
      : [];
    
    // Add to persona mapping
    if (!personaMapping[industryKey]) {
      personaMapping[industryKey] = {
        primary_personas: [],
        secondary_personas: [],
        key_ips: [],
        watchouts: []
      };
    }
    
    // Merge personas (deduplicate)
    personaMapping[industryKey].primary_personas = [
      ...new Set([...personaMapping[industryKey].primary_personas, ...primaryPersonas])
    ];
    
    personaMapping[industryKey].secondary_personas = [
      ...new Set([...personaMapping[industryKey].secondary_personas, ...secondaryPersonas])
    ];
    
    personaMapping[industryKey].key_ips = [
      ...new Set([...personaMapping[industryKey].key_ips, ...keyIPs])
    ];
    
    personaMapping[industryKey].watchouts = [
      ...new Set([...personaMapping[industryKey].watchouts, ...watchouts])
    ];
  });
  
  // Deduplicate formats in funnel stages
  for (const industry in verticalPlaybook) {
    for (const funnelStage in verticalPlaybook[industry].funnel) {
      verticalPlaybook[industry].funnel[funnelStage] = [
        ...new Set(verticalPlaybook[industry].funnel[funnelStage])
      ];
    }
  }
  
  return {
    persona_mapping: personaMapping,
    vertical_playbook: verticalPlaybook,
    metadata: {
      last_updated: new Date().toISOString(),
      source: 'Google Sheets Logic Table',
      spreadsheet_id: SPREADSHEET_ID,
      total_industries: Object.keys(verticalPlaybook).length
    }
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPlaybookData()
    .then(() => {
      console.log('✅ Playbook data fetch completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to fetch playbook data:', error);
      process.exit(1);
    });
}

export { fetchPlaybookData };
