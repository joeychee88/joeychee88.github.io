/**
 * Export API
 * Handles exporting campaign plans to Excel, PDF, and other formats
 */

import express from 'express';
import xlsx from 'xlsx';
import ExcelJS from 'exceljs';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * POST /api/export/kult-template
 * Export campaign plan using KULT Media Plan template
 */
router.post('/kult-template', async (req, res) => {
  try {
    const { campaignPlan, budgetChannels = [], campaignName = 'Campaign Plan', availableSites = {} } = req.body;
    
    console.log('[EXPORT KULT TEMPLATE] Generating Excel from template for:', campaignName);
    console.log('[EXPORT KULT TEMPLATE] Campaign Plan Data:', JSON.stringify(campaignPlan, null, 2));
    console.log('[EXPORT KULT TEMPLATE] Budget channels:', budgetChannels.length);
    console.log('[EXPORT KULT TEMPLATE] Selected sites:', campaignPlan?.selectedSites?.length || 0);
    console.log('[EXPORT KULT TEMPLATE] Selected personas:', campaignPlan?.selectedPersonas?.length || 0);
    
    // Path to template
    const templatePath = path.join(__dirname, '../data/KULT_MEDIAPLAN_TEMPLATE.xlsx');
    console.log('[EXPORT KULT TEMPLATE] __dirname:', __dirname);
    console.log('[EXPORT KULT TEMPLATE] templatePath:', templatePath);
    
    // Check if file exists
    if (!fs.existsSync(templatePath)) {
      console.error('[EXPORT KULT TEMPLATE] Template file not found at:', templatePath);
      throw new Error(`Template file not found at: ${templatePath}`);
    }
    console.log('[EXPORT KULT TEMPLATE] Template file exists at:', templatePath);
    
    // Load template
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    
    const worksheet = workbook.getWorksheet('KULT MEDIA PLAN');
    
    if (!worksheet) {
      throw new Error('KULT MEDIA PLAN sheet not found in template');
    }
    
    // Set page setup for landscape orientation (A4 paper)
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0, // Auto height
      scale: 100, // Keep 100% scale
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    };
    
    // Set print area to ensure proper PDF export (columns A-E, rows 1-40)
    worksheet.pageSetup.printArea = 'A1:E40';
    
    // Add KULT logo programmatically
    // ExcelJS doesn't preserve template images, so we must add programmatically
    const logoPath = path.join(__dirname, '../data/original_logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        const logoId = workbook.addImage({
          filename: logoPath,
          extension: 'png'
        });
        
        // Position logo at top-right
        // Using larger original logo and letting Excel scale it
        worksheet.addImage(logoId, {
          tl: { col: 4, row: 0 },      // Top-left: Column E, Row 1
          ext: { width: 192, height: 62 }  // Size in pixels: 2.0" × 0.65" at 96 DPI
        });
        
        console.log('[EXPORT] Logo added successfully');
      } catch (err) {
        console.error('[EXPORT] Error adding logo:', err.message);
      }
    }
    
    // Fill in header fields based on new template structure
    // Row 1: ADVERTISER
    worksheet.getCell('B1').value = campaignPlan.brandProduct || campaignPlan.campaignName || '';
    
    // Row 2: CAMPAIGN
    worksheet.getCell('B2').value = campaignPlan.campaignName || '';
    
    // Row 3: OBJECTIVE
    worksheet.getCell('B3').value = campaignPlan.objective || '';
    
    // Row 4: CAMPAIGN BUDGET
    worksheet.getCell('B4').value = `RM ${parseFloat(campaignPlan.totalBudget || 0).toLocaleString()}`;
    
    // Row 5: CAMPAIGN PERIOD
    const startDate = campaignPlan.startDate || 'TBD';
    const endDate = campaignPlan.endDate || 'TBD';
    worksheet.getCell('B5').value = `${startDate} to ${endDate}`;
    
    // Row 6: PLAN EXPIRY DATE (14 days from download)
    const expiryLabelCell = worksheet.getCell('A6');
    expiryLabelCell.value = 'PLAN EXPIRY DATE:';
    expiryLabelCell.font = { name: 'Arial', size: 12, bold: true }; // Bold Arial 12
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14); // 14 days from today
    const expiryDateStr = expiryDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    worksheet.getCell('B6').value = expiryDateStr;
    
    // Fill in budget channels data (rows 10-25)
    // Header row is at 9: Entitlement | Description | Unit Cost | Unit | TOTAL
    
    // Format header row (row 9) - Arial 12, Bold, White text, BLACK background
    const headerRow = worksheet.getRow(9);
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }; // White text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' } // BLACK background
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Update column headers to include currency
      if (colNumber === 3) { // Column C: Unit Cost
        cell.value = 'Unit Cost (RM)';
      } else if (colNumber === 5) { // Column E: TOTAL
        cell.value = 'TOTAL (RM)';
      }
    });
    
    let currentRow = 10; // Start data at row 10
    const totalBudget = parseFloat(campaignPlan.totalBudget || 0);
    
    // Helper function to get site names from IDs
    const getSiteNames = (selectedSites = [], availableSites = {}) => {
      const siteNames = [];
      Object.values(availableSites).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(site => {
            if (selectedSites.includes(site.id)) {
              siteNames.push(site.name);
            }
          });
        }
      });
      return siteNames;
    };
    
    // Helper function to get sites for a specific format/channel
    const getSitesForChannel = (channelName, selectedSites, availableSites) => {
      const channelLower = channelName.toLowerCase();
      
      // Social formats -> ALWAYS show social platforms
      if (channelLower.includes('social') || channelLower.includes('stories')) {
        return ['Facebook', 'Instagram', 'TikTok'];
      }
      
      // Video formats -> ALWAYS show video sites
      if (channelLower.includes('video') || channelLower.includes('instream') || 
          channelLower.includes('masthead') || channelLower.includes('youtube')) {
        return ['YouTube', 'Astro Go', 'Sooka'];
      }
      
      // Display/Interactive/Banner formats -> get non-social sites from selected sites
      if (channelLower.includes('display') || channelLower.includes('banner') || 
          channelLower.includes('leaderboard') || channelLower.includes('mrec') ||
          channelLower.includes('interactive') || channelLower.includes('expandable') ||
          channelLower.includes('interstitial') || channelLower.includes('rich media')) {
        const displaySites = [];
        Object.values(availableSites).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(site => {
              if (selectedSites.includes(site.id) && 
                  !site.name.match(/Facebook|Instagram|TikTok|YouTube|Astro|Sooka/i)) {
                displaySites.push(site.name);
              }
            });
          }
        });
        // If no specific sites found, return a generic message
        if (displaySites.length === 0) {
          return ['News sites', 'Publisher sites', 'Premium portals'];
        }
        return [...new Set(displaySites)];
      }
      
      // Fallback: return all selected sites
      return getSiteNames(selectedSites, availableSites);
    };
    
    const siteNames = getSiteNames(campaignPlan?.selectedSites, availableSites);
    const personas = campaignPlan?.selectedPersonas || [];
    
    let actualTotalBudget = 0; // Calculate actual total from channels
    
    budgetChannels.forEach((channel, index) => {
      // Column A: Entitlement (Channel/Format Name)
      const cellA = worksheet.getCell(`A${currentRow}`);
      cellA.value = channel.name || `Channel ${index + 1}`;
      cellA.font = { name: 'Arial', size: 11 };
      cellA.alignment = { vertical: 'middle', wrapText: true };
      cellA.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Column B: Description (Impressions, Sites, Personas, Optimization Status)
      const impressions = (channel.impressions || 0);
      const formattedImpressions = impressions >= 1000000 
        ? `${(impressions / 1000000).toFixed(2)}M impressions`
        : impressions >= 1000
        ? `${(impressions / 1000).toFixed(2)}K impressions`
        : `${impressions.toLocaleString()} impressions`;
      
      // Build comprehensive description
      let description = formattedImpressions;
      
      // Add optimization status
      if (channel.hasLoading === false || channel.hasLoading === undefined) {
        description += ' | Optimised';
      } else {
        description += ' | Not Optimised (100% loading applied)';
      }
      
      // Add sites (up to 3, then "and X more") - USE CHANNEL-SPECIFIC SITES
      const channelSpecificSites = getSitesForChannel(
        channel.name,
        campaignPlan?.selectedSites || [],
        availableSites
      );
      
      if (channelSpecificSites.length > 0) {
        const displaySites = channelSpecificSites.slice(0, 3).join(', ');
        const remainingSites = channelSpecificSites.length - 3;
        description += ` | Sites: ${displaySites}`;
        if (remainingSites > 0) {
          description += ` and ${remainingSites} more`;
        }
      }
      
      // Add personas (up to 2, then "and X more")
      if (personas.length > 0) {
        const displayPersonas = personas.slice(0, 2).join(', ');
        const remainingPersonas = personas.length - 2;
        description += ` | Audience: ${displayPersonas}`;
        if (remainingPersonas > 0) {
          description += ` +${remainingPersonas} more`;
        }
      }
      
      const cellB = worksheet.getCell(`B${currentRow}`);
      cellB.value = description;
      cellB.font = { name: 'Arial', size: 10 }; // Reduced from 11 to 10 for better fit
      cellB.alignment = { vertical: 'middle', wrapText: true };
      cellB.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Column C: Unit Cost (CPM)
      const cellC = worksheet.getCell(`C${currentRow}`);
      cellC.value = parseFloat(channel.cpm || 0);
      cellC.font = { name: 'Arial', size: 11 };
      cellC.alignment = { vertical: 'middle', horizontal: 'right' };
      cellC.numFmt = '#,##0.00';
      cellC.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Column D: Unit (quantity in thousands)
      const quantity = Math.round((channel.impressions || 0) / 1000);
      const cellD = worksheet.getCell(`D${currentRow}`);
      cellD.value = quantity;
      cellD.font = { name: 'Arial', size: 11 };
      cellD.alignment = { vertical: 'middle', horizontal: 'right' };
      cellD.numFmt = '#,##0';
      cellD.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Column E: TOTAL (Budget for this channel)
      const channelBudget = parseFloat(channel.budget || 0);
      actualTotalBudget += channelBudget;
      const cellE = worksheet.getCell(`E${currentRow}`);
      cellE.value = channelBudget;
      cellE.font = { name: 'Arial', size: 11 };
      cellE.alignment = { vertical: 'middle', horizontal: 'right' };
      cellE.numFmt = '#,##0.00';
      cellE.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Set row height for better spacing (1.25x line spacing = ~38pt)
      worksheet.getRow(currentRow).height = 38;
      
      currentRow++;
    });
    
    // Add dynamic TOTAL row at the end of data
    const totalRow = currentRow; // Place total immediately after last data row
    
    // Clear old template TOTAL row at row 26 completely (all columns A-E)
    if (totalRow !== 26) {
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        const oldCell = worksheet.getCell(`${col}26`);
        oldCell.value = null;
        oldCell.fill = null;
        oldCell.font = { name: 'Arial', size: 11 };
        oldCell.border = null;
      });
      console.log('[EXPORT KULT TEMPLATE] Cleared old template row 26');
    }
    
    // Add empty cells with borders for columns A, B, C in TOTAL row
    ['A', 'B', 'C'].forEach(col => {
      const emptyCell = worksheet.getCell(`${col}${totalRow}`);
      emptyCell.value = null;
      emptyCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White text
      emptyCell.alignment = { vertical: 'middle', wrapText: true };
      emptyCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' } // Black background
      };
      emptyCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Column D: "TOTAL (ESTIMATED)" label
    const totalLabelCell = worksheet.getCell(`D${totalRow}`);
    totalLabelCell.value = 'TOTAL (ESTIMATED)';
    totalLabelCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White bold text
    totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    totalLabelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' } // Black background
    };
    totalLabelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Column E: Actual total (sum of all channel budgets)
    const totalValueCell = worksheet.getCell(`E${totalRow}`);
    totalValueCell.value = actualTotalBudget;
    totalValueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White bold text
    totalValueCell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    totalValueCell.numFmt = '#,##0.00';
    totalValueCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' } // Black background
    };
    totalValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Format header cells (rows 1-6) with Arial font
    for (let row = 1; row <= 6; row++) {
      worksheet.getRow(row).eachCell((cell) => {
        if (!cell.font) {
          cell.font = { name: 'Arial', size: 11 };
        } else {
          cell.font = { ...cell.font, name: 'Arial' };
        }
      });
    }
    
    // Set column widths for better readability
    worksheet.getColumn('A').width = 25; // Entitlement
    worksheet.getColumn('B').width = 60; // Description (wider for wrapped text)
    worksheet.getColumn('C').width = 15; // Unit Cost (RM)
    worksheet.getColumn('D').width = 15; // Unit (quantity in thousands)
    worksheet.getColumn('E').width = 18; // TOTAL (RM) - fits currency values well
    
    // Add Terms & Conditions section (4 rows after TOTAL row)
    const termsStartRow = totalRow + 4;
    
    // Title row: "TERMS & CONDITIONS:"
    const termsTitleCell = worksheet.getCell(`A${termsStartRow}`);
    termsTitleCell.value = 'TERMS & CONDITIONS:';
    termsTitleCell.font = { name: 'Arial', size: 12, bold: true };
    termsTitleCell.alignment = { vertical: 'top', wrapText: true };
    
    // Terms content (merged cells A to E)
    const termsContentRow = termsStartRow + 1;
    
    // Merge cells A to E for terms content
    worksheet.mergeCells(`A${termsContentRow}:E${termsContentRow}`);
    const termsContentCell = worksheet.getCell(`A${termsContentRow}`);
    
    // Use rich text to format terms with bold labels and numbers
    termsContentCell.value = {
      richText: [
        { font: { name: 'Arial', size: 9, bold: true }, text: '1. Planning Use Only:' },
        { font: { name: 'Arial', size: 9 }, text: ' This media plan is generated for planning and discussion purposes only and does not constitute a confirmed booking or media reservation.\n' },
        { font: { name: 'Arial', size: 9, bold: true }, text: '2. No Inventory Held:' },
        { font: { name: 'Arial', size: 9 }, text: ' Inventory is not reserved unless the plan is explicitly confirmed via the booking action within the KULT platform.\n' },
        { font: { name: 'Arial', size: 9, bold: true }, text: '3. Validity Period:' },
        { font: { name: 'Arial', size: 9 }, text: ' All rates, inventory, and projections are indicative and valid for a limited time (typically up to 14 days from plan generation), subject to availability.\n' },
        { font: { name: 'Arial', size: 9, bold: true }, text: '4. Subject to Availability & Revision:' },
        { font: { name: 'Arial', size: 9 }, text: ' KULT reserves the right to revise formats, sites, rates, or allocations due to inventory changes, market demand, or publisher constraints.\n' },
        { font: { name: 'Arial', size: 9, bold: true }, text: '5. Estimated Performance Only:' },
        { font: { name: 'Arial', size: 9 }, text: ' Reach, impressions, CTR, and other metrics are estimates based on benchmarks and assumptions. Actual delivery and performance may vary.\n' },
        { font: { name: 'Arial', size: 9, bold: true }, text: '6. Final Confirmation Required:' },
        { font: { name: 'Arial', size: 9 }, text: ' The plan becomes binding only after confirmation and acceptance by KULT.\n' },
        { font: { name: 'Arial', size: 9, bold: true }, text: '7. Optimisation Rights:' },
        { font: { name: 'Arial', size: 9 }, text: ' KULT may recommend or apply reasonable optimisations to improve delivery and campaign effectiveness.' }
      ]
    };
    
    termsContentCell.alignment = { 
      vertical: 'top', 
      horizontal: 'left',
      wrapText: true 
    };
    
    // Set row height for better readability of terms
    worksheet.getRow(termsContentRow).height = 150; // Taller row for terms text
    
    // Add Campaign Strategy Sheet
    console.log('[EXPORT KULT TEMPLATE] Adding Campaign Strategy sheet...');
    try {
      // Fetch formats data for strategy generation
      let formatsData = [];
      try {
        const formatsRes = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
        formatsData = formatsRes.data?.data || [];
      } catch (error) {
        console.error('[EXPORT KULT TEMPLATE] Error fetching formats:', error.message);
      }
      
      const selectedFormats = formatsData.filter(f => 
        campaignPlan.selectedFormats?.includes(f.id)
      );
      
      // Helper function to wrap long text at specified width for PDF display
      const wrapText = (text, maxWidth = 70) => {
        if (!text || typeof text !== 'string') return text;
        if (text.length <= maxWidth) return text;
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          if ((currentLine + ' ' + word).trim().length <= maxWidth) {
            currentLine = (currentLine + ' ' + word).trim();
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        
        if (currentLine) lines.push(currentLine);
        return lines.join('\n');
      };
      
      // Generate strategy content with text wrapping
      const executiveSummary = wrapText(generateExecutiveSummary(campaignPlan, selectedFormats));
      const objective = generateObjectiveSection(campaignPlan);
      objective.rationale = wrapText(objective.rationale);
      const audience = generateAudienceSection(campaignPlan);
      audience.strategy = wrapText(audience.strategy);
      const mediaStrategy = generateMediaStrategy(campaignPlan, selectedFormats);
      mediaStrategy.strategy = wrapText(mediaStrategy.strategy);
      const budget = generateBudgetSection(campaignPlan);
      const timeline = generateTimelineSection(campaignPlan);
      const outcomes = generateExpectedOutcomes(campaignPlan);
      const recommendations = generateKeyRecommendations(campaignPlan, selectedFormats).map(rec => wrapText(rec));
      const nextSteps = generateNextSteps(campaignPlan).map(step => wrapText(step));
      
      // Create Campaign Strategy worksheet
      const strategySheet = workbook.addWorksheet('Campaign Strategy');
      
      // Build strategy content
      const strategyData = [
        [`${(campaignPlan.campaignName || 'CAMPAIGN').toUpperCase()} - STRATEGY BRIEF`],
        [],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['EXECUTIVE SUMMARY'],
        [executiveSummary],
        [],
        ['CAMPAIGN OBJECTIVE'],
        [`Primary Objective: ${objective.primary}`],
        [objective.rationale],
        [`Industry: ${objective.industry}`],
        [`Geography: ${objective.geography}`],
        [],
        ['TARGET AUDIENCE'],
        [audience.strategy],
        [`Personas: ${audience.personas.join(', ')}`],
        [],
        ['MEDIA STRATEGY'],
        [mediaStrategy.strategy],
        ...(mediaStrategy.formats?.length > 0 ? [[`Selected Formats: ${mediaStrategy.formats.join(', ')}`]] : []),
        [],
        ['BUDGET ALLOCATION'],
        [`Total Budget: ${budget.total}`],
        ...budget.allocation.map(item => [`  • ${item.channel}: ${item.amount} (${item.percentage})`]),
        [],
        ['CAMPAIGN TIMELINE'],
        [`${timeline.period}`],
        [`Duration: ${timeline.duration}`],
        [],
        ['EXPECTED OUTCOMES'],
        [`Estimated Reach: ${outcomes.reach || 'TBD'}`],
        [`Estimated Impressions: ${outcomes.impressions || 'TBD'}`],
        [`Estimated CTR: ${outcomes.estimatedCTR || 'TBD'}`],
        [`Estimated Clicks: ${outcomes.estimatedClicks || 'TBD'}`],
        [`Brand Lift: ${outcomes.brandLift || 'TBD'}`],
        [outcomes.disclaimer || ''],
        [],
        ['KEY RECOMMENDATIONS'],
        ...recommendations.map((rec, idx) => [`${idx + 1}. ${rec}`]),
        [],
        ['NEXT STEPS'],
        ...nextSteps.map((step, idx) => [`${idx + 1}. ${step}`])
      ];
      
      // Add data to sheet
      strategyData.forEach((row, rowIndex) => {
        const excelRow = strategySheet.getRow(rowIndex + 1);
        let maxLines = 1; // Track max lines in this row for height calculation
        
        row.forEach((cell, colIndex) => {
          const excelCell = excelRow.getCell(colIndex + 1);
          excelCell.value = cell;
          
          // Count lines in this cell (for row height calculation)
          if (typeof cell === 'string' && cell.length > 0) {
            const lines = cell.split('\n').length;
            maxLines = Math.max(maxLines, lines);
          }
          
          // Style headers
          if (cell && typeof cell === 'string') {
            if (cell.toUpperCase() === cell && cell.length >= 10) {
              // Section headers (all caps, 10+ characters)
              excelCell.font = { name: 'Arial', size: 12, bold: true }; // Reduced from 14 to 12
              excelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
              };
            } else if (cell.startsWith('1.') || cell.startsWith('2.') || cell.startsWith('3.')) {
              // Numbered lists
              excelCell.font = { name: 'Arial', size: 10 }; // Reduced from 11 to 10
            } else {
              // Normal text
              excelCell.font = { name: 'Arial', size: 10 }; // Reduced from 11 to 10
            }
          }
          
          excelCell.alignment = { 
            vertical: 'top', 
            horizontal: 'left',
            wrapText: true 
          };
        });
        
        // Set row height based on number of lines (15 points per line + 5 padding)
        excelRow.height = Math.max(15, maxLines * 15 + 5);
      });
      
      // Set column width (narrower for better PDF export)
      strategySheet.getColumn(1).width = 70; // Reduced from 80 to 70 for guaranteed fit
      
      console.log('[EXPORT KULT TEMPLATE] Campaign Strategy sheet added successfully');
    } catch (strategyError) {
      console.error('[EXPORT KULT TEMPLATE] Error adding strategy sheet:', strategyError.message);
      // Continue even if strategy fails - main sheet is more important
    }
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set response headers
    const fileName = `KULT_${campaignName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Send file
    res.send(buffer);
    
    console.log('[EXPORT KULT TEMPLATE] Successfully generated:', fileName);
    
  } catch (error) {
    console.error('[EXPORT KULT TEMPLATE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel from template',
      message: error.message
    });
  }
});

/**
 * POST /api/export/excel
 * Export campaign plan to Excel file with multiple sheets
 */
router.post('/excel', async (req, res) => {
  try {
    const { campaignPlan, campaignName = 'Campaign Plan' } = req.body;
    
    console.log('[EXPORT EXCEL] Generating Excel file for:', campaignName);
    
    // Fetch formats and sites data
    let formatsData = [];
    let sitesData = [];
    
    try {
      const formatsRes = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
      formatsData = formatsRes.data?.data || [];
      
      const sitesRes = await axios.get('http://localhost:5001/api/sites', { timeout: 3000 });
      sitesData = sitesRes.data?.data || [];
    } catch (error) {
      console.error('[EXPORT] Error fetching data:', error.message);
    }
    
    // Create workbook
    const workbook = xlsx.utils.book_new();
    
    // 1. SUMMARY SHEET
    const summaryData = [
      ['KULT Planning Engine - Campaign Summary'],
      [],
      ['Campaign Name', campaignPlan.campaignName || 'Untitled'],
      ['Brand/Product', campaignPlan.brandProduct || ''],
      ['Objective', campaignPlan.objective || ''],
      ['Industry', campaignPlan.industry || ''],
      ['Geography', campaignPlan.selectedStates?.length > 0 
        ? campaignPlan.selectedStates.join(', ')
        : 'Nationwide (All States)'],
      [],
      ['Total Budget', `RM ${parseFloat(campaignPlan.totalBudget || 0).toLocaleString()}`],
      ['Start Date', campaignPlan.startDate || ''],
      ['End Date', campaignPlan.endDate || ''],
      [],
      ['Audience Personas', campaignPlan.selectedPersonas?.length || 0],
      ['Formats Selected', campaignPlan.selectedFormats?.length || 0],
      ['Sites Selected', campaignPlan.selectedSites?.length || 0],
      ['Optimized Groups', campaignPlan.optimisedGroups?.length || 0],
      [],
      ['Generated', new Date().toLocaleString()],
    ];
    
    const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 20 },
      { wch: 40 }
    ];
    
    xlsx.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // 2. AUDIENCE SHEET
    const audienceData = [
      ['AUDIENCE PERSONAS'],
      [],
      ['#', 'Persona Name']
    ];
    
    campaignPlan.selectedPersonas?.forEach((persona, idx) => {
      audienceData.push([idx + 1, persona]);
    });
    
    const audienceSheet = xlsx.utils.aoa_to_sheet(audienceData);
    audienceSheet['!cols'] = [{ wch: 5 }, { wch: 40 }];
    xlsx.utils.book_append_sheet(workbook, audienceSheet, 'Audiences');
    
    // 3. FORMATS SHEET
    const formatsHeaderData = [
      ['SELECTED FORMATS'],
      [],
      ['#', 'Format Name', 'Type', 'Dimensions', 'CPM (RM)', 'Description']
    ];
    
    const selectedFormats = formatsData.filter(f => 
      campaignPlan.selectedFormats?.includes(f.id)
    );
    
    selectedFormats.forEach((format, idx) => {
      formatsHeaderData.push([
        idx + 1,
        format.name,
        format.type,
        format.dimensions,
        format.baseCpm,
        format.description
      ]);
    });
    
    const formatsSheet = xlsx.utils.aoa_to_sheet(formatsHeaderData);
    formatsSheet['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 50 }
    ];
    xlsx.utils.book_append_sheet(workbook, formatsSheet, 'Formats');
    
    // 4. SITES SHEET
    const sitesHeaderData = [
      ['SELECTED SITES & GROUPS'],
      [],
      ['Type', 'Name', 'Category', 'Traffic', 'Status']
    ];
    
    // Add individual sites
    campaignPlan.selectedSites?.forEach(siteId => {
      const site = sitesData.find(s => s.id === siteId);
      if (site) {
        sitesHeaderData.push([
          'Site',
          site.name,
          site.category || '',
          site.traffic || '',
          'Selected'
        ]);
      } else if (siteId.startsWith('social_')) {
        // Handle hardcoded social platforms
        const socialNames = {
          'social_facebook': 'Facebook',
          'social_instagram': 'Instagram',
          'social_tiktok': 'TikTok'
        };
        sitesHeaderData.push([
          'Site',
          socialNames[siteId] || siteId,
          'Social Media',
          '',
          'Selected'
        ]);
      }
    });
    
    // Add optimized groups
    campaignPlan.optimisedGroups?.forEach(channel => {
      sitesHeaderData.push([
        'Group',
        channel,
        'AI-Optimized',
        '',
        'Optimized'
      ]);
    });
    
    const sitesSheet = xlsx.utils.aoa_to_sheet(sitesHeaderData);
    sitesSheet['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 }
    ];
    xlsx.utils.book_append_sheet(workbook, sitesSheet, 'Sites');
    
    // 5. BUDGET BREAKDOWN SHEET
    const budgetData = [
      ['BUDGET ALLOCATION'],
      [],
      ['Channel', 'Budget (RM)', 'Percentage', 'Impressions', 'CPM (RM)']
    ];
    
    // Calculate budget from budgetChannels if available
    if (campaignPlan.budgetChannels && campaignPlan.budgetChannels.length > 0) {
      const totalBudget = parseFloat(campaignPlan.totalBudget || 0);
      
      campaignPlan.budgetChannels.forEach(channel => {
        const percentage = totalBudget > 0 
          ? ((channel.budget / totalBudget) * 100).toFixed(1) 
          : 0;
        const impressions = channel.impressions || 0;
        const cpm = channel.cpm || 0;
        
        budgetData.push([
          channel.name,
          channel.budget,
          `${percentage}%`,
          impressions,
          cpm
        ]);
      });
      
      budgetData.push([]);
      budgetData.push(['TOTAL', totalBudget, '100%', '', '']);
    } else {
      budgetData.push(['No budget allocation yet', '', '', '', '']);
    }
    
    const budgetSheet = xlsx.utils.aoa_to_sheet(budgetData);
    budgetSheet['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 }
    ];
    xlsx.utils.book_append_sheet(workbook, budgetSheet, 'Budget');
    
    // 6. TIMELINE SHEET
    const timelineData = [
      ['CAMPAIGN TIMELINE'],
      [],
      ['Start Date', campaignPlan.startDate || 'Not set'],
      ['End Date', campaignPlan.endDate || 'Not set'],
      [],
      ['Duration', ''],
      [],
      ['Key Milestones'],
      [],
      ['Phase', 'Date', 'Activity']
    ];
    
    if (campaignPlan.startDate && campaignPlan.endDate) {
      const start = new Date(campaignPlan.startDate);
      const end = new Date(campaignPlan.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      timelineData[5] = ['Duration', `${duration} days`];
      
      // Add milestones
      timelineData.push(['Setup', campaignPlan.startDate, 'Campaign setup and creative preparation']);
      timelineData.push(['Launch', campaignPlan.startDate, 'Campaign goes live']);
      
      const midDate = new Date(start.getTime() + (end - start) / 2);
      timelineData.push(['Mid-Campaign Review', midDate.toISOString().split('T')[0], 'Performance review and optimization']);
      
      timelineData.push(['End', campaignPlan.endDate, 'Campaign ends']);
    }
    
    const timelineSheet = xlsx.utils.aoa_to_sheet(timelineData);
    timelineSheet['!cols'] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 50 }
    ];
    xlsx.utils.book_append_sheet(workbook, timelineSheet, 'Timeline');
    
    // 7. KPIs SHEET
    const kpisData = [
      ['EXPECTED KPIs & METRICS'],
      [],
      ['Metric', 'Target', 'Calculation Method']
    ];
    
    const totalBudget = parseFloat(campaignPlan.totalBudget || 0);
    const avgCPM = 15; // Average CPM estimate
    const estimatedImpressions = totalBudget > 0 ? Math.round((totalBudget / avgCPM) * 1000) : 0;
    const estimatedReach = Math.round(estimatedImpressions * 0.65); // 65% reach rate
    const estimatedCTR = 0.3; // 0.3% average CTR
    const estimatedClicks = Math.round(estimatedImpressions * (estimatedCTR / 100));
    
    kpisData.push(['Total Budget', `RM ${totalBudget.toLocaleString()}`, 'Campaign investment']);
    kpisData.push(['Estimated Impressions', estimatedImpressions.toLocaleString(), 'Budget / Avg CPM * 1000']);
    kpisData.push(['Estimated Reach', estimatedReach.toLocaleString(), 'Impressions × 65% unique rate']);
    kpisData.push(['Estimated CTR', `${estimatedCTR}%`, 'Industry benchmark']);
    kpisData.push(['Estimated Clicks', estimatedClicks.toLocaleString(), 'Impressions × CTR']);
    kpisData.push(['Avg CPM', `RM ${avgCPM}`, 'Weighted average across formats']);
    kpisData.push([]);
    kpisData.push(['Frequency', '3-5', 'Recommended ad frequency per user']);
    kpisData.push(['Campaign Duration', `${campaignPlan.startDate || ''} to ${campaignPlan.endDate || ''}`, 'Flight dates']);
    
    const kpisSheet = xlsx.utils.aoa_to_sheet(kpisData);
    kpisSheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 40 }
    ];
    xlsx.utils.book_append_sheet(workbook, kpisSheet, 'KPIs');
    
    // Generate buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    const fileName = `${campaignName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // Send file
    res.send(excelBuffer);
    
    console.log('[EXPORT EXCEL] Successfully generated:', fileName);
    
  } catch (error) {
    console.error('[EXPORT EXCEL ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel file',
      message: error.message
    });
  }
});

/**
 * POST /api/export/ai-narrative
 * Generate AI campaign narrative as Word document with KULT logo
 */
router.post('/ai-narrative', async (req, res) => {
  try {
    const { campaignPlan } = req.body;
    
    console.log('[AI NARRATIVE] Generating campaign narrative Word document...');
    
    // Import docx
    const docx = await import('docx');
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } = docx;
    
    // Fetch formats data for context
    let formatsData = [];
    try {
      const formatsRes = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
      formatsData = formatsRes.data?.data || [];
    } catch (error) {
      console.error('[AI NARRATIVE] Error fetching formats:', error.message);
    }
    
    const selectedFormats = formatsData.filter(f => 
      campaignPlan.selectedFormats?.includes(f.id)
    );
    
    // Read KULT logo
    const logoPath = path.join(__dirname, '../data/original_logo.png');
    let logoBuffer = null;
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath);
    }
    
    // Build narrative sections
    const executiveSummary = generateExecutiveSummary(campaignPlan, selectedFormats);
    const objective = generateObjectiveSection(campaignPlan);
    const audience = generateAudienceSection(campaignPlan);
    const mediaStrategy = generateMediaStrategy(campaignPlan, selectedFormats);
    const budget = generateBudgetSection(campaignPlan);
    const timeline = generateTimelineSection(campaignPlan);
    const outcomes = generateExpectedOutcomes(campaignPlan);
    const recommendations = generateKeyRecommendations(campaignPlan, selectedFormats);
    const nextSteps = generateNextSteps(campaignPlan);
    
    // Create Word document
    const sections = [{
      properties: {},
      children: [
        // Logo at top-right
        ...(logoBuffer ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: {
                  width: 192,
                  height: 62
                }
              })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 }
          })
        ] : []),
        
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: `${(campaignPlan.campaignName || 'Campaign').toUpperCase()} - STRATEGY BRIEF`,
              font: "Arial",
              size: 32,
              bold: true
            })
          ],
          spacing: { before: 200, after: 400 }
        }),
        
        // Generated date
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${new Date().toLocaleString()}`,
              font: "Arial",
              italics: true,
              color: "666666"
            })
          ],
          spacing: { after: 400 }
        }),
        
        // Executive Summary
        new Paragraph({
          children: [
            new TextRun({
              text: 'EXECUTIVE SUMMARY',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: executiveSummary,
              font: "Arial"
            })
          ],
          spacing: { after: 400 }
        }),
        
        // Campaign Objective
        new Paragraph({
          children: [
            new TextRun({
              text: 'CAMPAIGN OBJECTIVE',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Primary Objective: ', font: "Arial", bold: true }),
            new TextRun({ text: objective.primary, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: objective.rationale, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Industry: ', font: "Arial", bold: true }),
            new TextRun({ text: objective.industry, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Geography: ', font: "Arial", bold: true }),
            new TextRun({ text: objective.geography, font: "Arial" })
          ],
          spacing: { after: 400 }
        }),
        
        // Target Audience
        new Paragraph({
          children: [
            new TextRun({
              text: 'TARGET AUDIENCE',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: audience.strategy, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Personas: ', font: "Arial", bold: true }),
            new TextRun({ text: audience.personas.join(', '), font: "Arial" })
          ],
          spacing: { after: 400 }
        }),
        
        // Media Strategy
        new Paragraph({
          children: [
            new TextRun({
              text: 'MEDIA STRATEGY',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: mediaStrategy.strategy, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        ...(mediaStrategy.formats?.length > 0 ? [
          new Paragraph({
            children: [
              new TextRun({ text: 'Selected Formats: ', font: "Arial", bold: true }),
              new TextRun({ text: mediaStrategy.formats.join(', '), font: "Arial" })
            ],
            spacing: { after: 400 }
          })
        ] : []),
        
        // Budget Allocation
        new Paragraph({
          children: [
            new TextRun({
              text: 'BUDGET ALLOCATION',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Budget: ', font: "Arial", bold: true }),
            new TextRun({ text: budget.total, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        ...budget.allocation.map(item => 
          new Paragraph({
            children: [
              new TextRun({ text: `  • ${item.channel}: ${item.amount} (${item.percentage})`, font: "Arial" })
            ],
            spacing: { after: 100 }
          })
        ),
        
        // Timeline
        new Paragraph({
          children: [
            new TextRun({
              text: 'CAMPAIGN TIMELINE',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: timeline.period, font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Duration: ', font: "Arial", bold: true }),
            new TextRun({ text: timeline.duration, font: "Arial" })
          ],
          spacing: { after: 400 }
        }),
        
        // Expected Outcomes
        new Paragraph({
          children: [
            new TextRun({
              text: 'EXPECTED OUTCOMES',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Estimated Reach: ', font: "Arial", bold: true }),
            new TextRun({ text: outcomes.reach || 'TBD', font: "Arial" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Estimated Impressions: ', font: "Arial", bold: true }),
            new TextRun({ text: outcomes.impressions || 'TBD', font: "Arial" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Estimated CTR: ', font: "Arial", bold: true }),
            new TextRun({ text: outcomes.estimatedCTR || 'TBD', font: "Arial" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Estimated Clicks: ', font: "Arial", bold: true }),
            new TextRun({ text: outcomes.estimatedClicks || 'TBD', font: "Arial" })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Brand Lift: ', font: "Arial", bold: true }),
            new TextRun({ text: outcomes.brandLift || 'TBD', font: "Arial" })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: outcomes.disclaimer || '',
              font: "Arial",
              italics: true,
              size: 20,
              color: "666666"
            })
          ],
          spacing: { after: 400 }
        }),
        
        // Key Recommendations
        new Paragraph({
          children: [
            new TextRun({
              text: 'KEY RECOMMENDATIONS',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        ...recommendations.map((rec, idx) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. ${rec}`, font: "Arial" })
            ],
            spacing: { after: 100 }
          })
        ),
        
        // Next Steps
        new Paragraph({
          children: [
            new TextRun({
              text: 'NEXT STEPS',
              font: "Arial",
              size: 28,
              bold: true
            })
          ],
          spacing: { before: 400, after: 200 }
        }),
        ...nextSteps.map((step, idx) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${idx + 1}. ${step}`, font: "Arial" })
            ],
            spacing: { after: 100 }
          })
        )
      ]
    }];
    
    const doc = new Document({ 
      sections,
      styles: {
        default: {
          document: {
            run: {
              font: "Arial",
              size: 22
            }
          },
          paragraph: {
            spacing: {
              line: 276,
              before: 0,
              after: 0
            }
          }
        },
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: {
              font: "Arial",
              size: 22
            }
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Arial",
              size: 32,
              bold: true
            },
            paragraph: {
              spacing: { before: 400, after: 200 }
            }
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Arial",
              size: 28,
              bold: true
            },
            paragraph: {
              spacing: { before: 400, after: 200 }
            }
          }
        ]
      }
    });
    
    // Generate buffer
    const buffer = await docx.Packer.toBuffer(doc);
    
    // Set response headers for Word document
    const filename = `KULT_Campaign_Narrative_${(campaignPlan.campaignName || 'Campaign').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
    console.log('[AI NARRATIVE] Successfully generated Word document:', filename);
    
  } catch (error) {
    console.error('[AI NARRATIVE ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI narrative',
      message: error.message
    });
  }
});

/**
 * POST /api/export/ai-narrative-text
 * Generate AI campaign narrative as plain text for clipboard
 */
router.post('/ai-narrative-text', async (req, res) => {
  try {
    const { campaignPlan } = req.body;
    
    console.log('[AI NARRATIVE TEXT] Generating campaign narrative text...');
    
    // Fetch formats data for context
    let formatsData = [];
    try {
      const formatsRes = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
      formatsData = formatsRes.data?.data || [];
    } catch (error) {
      console.error('[AI NARRATIVE TEXT] Error fetching formats:', error.message);
    }
    
    const selectedFormats = formatsData.filter(f => 
      campaignPlan.selectedFormats?.includes(f.id)
    );
    
    // Build narrative sections
    const executiveSummary = generateExecutiveSummary(campaignPlan, selectedFormats);
    const objective = generateObjectiveSection(campaignPlan);
    const audience = generateAudienceSection(campaignPlan);
    const mediaStrategy = generateMediaStrategy(campaignPlan, selectedFormats);
    const budget = generateBudgetSection(campaignPlan);
    const timeline = generateTimelineSection(campaignPlan);
    const outcomes = generateExpectedOutcomes(campaignPlan);
    const recommendations = generateKeyRecommendations(campaignPlan, selectedFormats);
    const nextSteps = generateNextSteps(campaignPlan);
    
    // Build text document
    let text = `${(campaignPlan.campaignName || 'CAMPAIGN').toUpperCase()} - STRATEGY BRIEF\n\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    text += `EXECUTIVE SUMMARY\n\n`;
    text += `${executiveSummary}\n\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    text += `CAMPAIGN OBJECTIVE\n\n`;
    text += `Primary Objective: ${objective.primary}\n`;
    text += `${objective.rationale}\n\n`;
    text += `Industry: ${objective.industry}\n`;
    text += `Geography: ${objective.geography}\n\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    text += `TARGET AUDIENCE\n\n`;
    text += `${audience.strategy}\n\n`;
    text += `Personas: ${audience.personas.join(', ')}\n\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    text += `MEDIA STRATEGY\n\n`;
    text += `${mediaStrategy.strategy}\n\n`;
    if (mediaStrategy.formats && mediaStrategy.formats.length > 0) {
      text += `Selected Formats: ${mediaStrategy.formats.join(', ')}\n\n`;
    }
    text += `${'='.repeat(80)}\n\n`;
    
    text += `BUDGET ALLOCATION\n\n`;
    text += `Total Budget: ${budget.total}\n\n`;
    budget.allocation.forEach(item => {
      text += `  • ${item.channel}: ${item.amount} (${item.percentage})\n`;
    });
    text += `\n${'='.repeat(80)}\n\n`;
    
    text += `CAMPAIGN TIMELINE\n\n`;
    text += `${timeline.period}\n`;
    text += `Duration: ${timeline.duration}\n\n`;
    text += `${'='.repeat(80)}\n\n`;
    
    text += `EXPECTED OUTCOMES\n\n`;
    text += `${outcomes.summary}\n\n`;
    if (outcomes.kpis && outcomes.kpis.length > 0) {
      text += `Key Performance Indicators:\n`;
      outcomes.kpis.forEach(kpi => {
        text += `  • ${kpi}\n`;
      });
      text += `\n`;
    }
    text += `${'='.repeat(80)}\n\n`;
    
    text += `KEY RECOMMENDATIONS\n\n`;
    recommendations.forEach((rec, idx) => {
      text += `${idx + 1}. ${rec}\n`;
    });
    text += `\n${'='.repeat(80)}\n\n`;
    
    text += `NEXT STEPS\n\n`;
    nextSteps.forEach((step, idx) => {
      text += `${idx + 1}. ${step}\n`;
    });
    
    res.json({
      success: true,
      text: text
    });
    
    console.log('[AI NARRATIVE TEXT] Successfully generated text');
    
  } catch (error) {
    console.error('[AI NARRATIVE TEXT ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI narrative text',
      message: error.message
    });
  }
});

// Helper functions for narrative generation

function generateExecutiveSummary(plan, formats) {
  const budget = parseFloat(plan.totalBudget || 0);
  const audienceCount = plan.selectedPersonas?.length || 0;
  const formatCount = formats.length;
  const siteCount = plan.selectedSites?.length || 0;
  
  return `This ${plan.objective || 'awareness'} campaign for ${plan.brandProduct || 'the brand'} in the ${plan.industry || 'consumer'} industry targets ${audienceCount} key audience segment${audienceCount > 1 ? 's' : ''} across Malaysia with a total investment of RM ${budget.toLocaleString()}. The campaign leverages ${formatCount} format${formatCount > 1 ? 's' : ''} across ${siteCount} publisher${siteCount > 1 ? 's' : ''} to maximize reach and engagement.`;
}

function generateObjectiveSection(plan) {
  const objectiveLower = (plan.objective || '').toLowerCase();
  
  let rationale = '';
  if (objectiveLower.includes('awareness')) {
    rationale = 'Building brand awareness through high-reach placements and engaging formats to maximize visibility among target audiences.';
  } else if (objectiveLower.includes('consideration')) {
    rationale = 'Driving consideration through interactive and engaging formats that encourage audience engagement and product exploration.';
  } else if (objectiveLower.includes('conversion') || objectiveLower.includes('lead')) {
    rationale = 'Generating qualified leads and conversions through performance-focused formats and strategic audience targeting.';
  } else {
    rationale = `Achieving ${plan.objective} objectives through data-driven targeting and optimized media placements.`;
  }
  
  return {
    primary: plan.objective || 'Campaign objective',
    rationale,
    industry: plan.industry || 'Not specified',
    geography: plan.selectedStates?.length > 0 
      ? plan.selectedStates.join(', ') 
      : 'Nationwide (All Malaysian States)'
  };
}

function generateAudienceSection(plan) {
  const personas = plan.selectedPersonas || [];
  
  return {
    count: personas.length,
    personas: personas,
    strategy: personas.length > 1
      ? `Multi-persona targeting approach focusing on ${personas.slice(0, 2).join(' and ')}${personas.length > 2 ? ` along with ${personas.length - 2} other segment${personas.length > 2 ? 's' : ''}` : ''}.`
      : personas.length === 1
      ? `Focused targeting strategy concentrating on ${personas[0]}.`
      : 'Audience targeting to be defined.',
    reasoning: 'Selected based on high affinity with campaign objectives and brand positioning.'
  };
}

function generateMediaStrategy(plan, formats) {
  const formatsByType = {};
  formats.forEach(f => {
    const type = f.type || 'other';
    if (!formatsByType[type]) formatsByType[type] = [];
    formatsByType[type].push(f.name);
  });
  
  const strategy = [];
  
  Object.entries(formatsByType).forEach(([type, names]) => {
    if (type.includes('video')) {
      strategy.push(`Video formats (${names.join(', ')}) drive high engagement and brand recall.`);
    } else if (type.includes('interactive')) {
      strategy.push(`Interactive formats (${names.join(', ')}) boost user engagement and dwell time.`);
    } else if (type.includes('social')) {
      strategy.push(`Social formats (${names.join(', ')}) leverage platform-native placements for maximum reach.`);
    } else {
      strategy.push(`${type.charAt(0).toUpperCase() + type.slice(1)} formats (${names.join(', ')}) provide consistent brand presence.`);
    }
  });
  
  return {
    totalFormats: formats.length,
    formatMix: formatsByType,
    strategy: strategy.join(' '),
    siteCount: plan.selectedSites?.length || 0,
    optimizedGroups: plan.optimisedGroups || []
  };
}

function generateBudgetSection(plan) {
  const totalBudget = parseFloat(plan.totalBudget || 0);
  const channels = plan.budgetChannels || [];
  
  const allocation = channels.map(ch => ({
    channel: ch.name,
    amount: `RM ${ch.budget.toLocaleString()}`,
    percentage: totalBudget > 0 ? `${((ch.budget / totalBudget) * 100).toFixed(1)}%` : '0%',
    rationale: `Allocated based on ${ch.name.toLowerCase()} format performance and reach potential.`
  }));
  
  return {
    total: `RM ${totalBudget.toLocaleString()}`,
    allocation,
    approach: 'Budget allocation optimized for maximum ROI based on format CPMs and expected performance.'
  };
}

function generateTimelineSection(plan) {
  const start = plan.startDate || 'TBD';
  const end = plan.endDate || 'TBD';
  
  // Generate period string (e.g., "1 January 2025 - 31 January 2025")
  let period = 'TBD';
  if (plan.startDate && plan.endDate) {
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    period = `${startDate.toLocaleDateString('en-GB', options)} - ${endDate.toLocaleDateString('en-GB', options)}`;
  }
  
  let duration = 'To be determined';
  if (plan.startDate && plan.endDate) {
    const days = Math.ceil((new Date(plan.endDate) - new Date(plan.startDate)) / (1000 * 60 * 60 * 24));
    duration = `${days} days`;
  }
  
  return {
    period, // Add period property
    startDate: start,
    endDate: end,
    duration,
    phases: [
      { phase: 'Setup & Creative', duration: '1-2 weeks', activities: 'Campaign setup, creative production, trafficking' },
      { phase: 'Launch', duration: '1 day', activities: 'Campaign goes live, monitoring begins' },
      { phase: 'Optimization', duration: 'Ongoing', activities: 'Performance monitoring, budget optimization, creative refresh' },
      { phase: 'Wrap-up', duration: '1 week', activities: 'Campaign ends, final reporting, insights' }
    ]
  };
}

function generateExpectedOutcomes(plan) {
  const budget = parseFloat(plan.totalBudget || 0);
  const avgCPM = 15;
  const impressions = budget > 0 ? Math.round((budget / avgCPM) * 1000) : 0;
  const reach = Math.round(impressions * 0.65);
  const ctr = 0.3;
  const clicks = Math.round(impressions * (ctr / 100));
  
  return {
    reach: `${(reach / 1000000).toFixed(1)}M`,
    impressions: `${(impressions / 1000000).toFixed(1)}M`,
    estimatedCTR: `${ctr}%`,
    estimatedClicks: `${(clicks / 1000).toFixed(0)}K`,
    brandLift: 'Expected 15-20% increase in brand awareness',
    disclaimer: 'Estimates based on KULT benchmarks and industry standards. Actual results may vary.'
  };
}

function generateKeyRecommendations(plan, formats) {
  const recommendations = [];
  
  // Check for video presence
  const hasVideo = formats.some(f => f.type.includes('video'));
  if (!hasVideo) {
    recommendations.push('Consider adding video formats to boost engagement by 3x');
  }
  
  // Check for social presence
  const hasSocial = formats.some(f => f.name.toLowerCase().includes('social'));
  if (!hasSocial && plan.objective?.toLowerCase().includes('awareness')) {
    recommendations.push('Include social formats (RM 5-9 CPM) for cost-effective awareness');
  }
  
  // Budget optimization
  if (plan.budgetChannels && plan.budgetChannels.length > 2) {
    recommendations.push('Monitor performance closely in first 2 weeks and reallocate budget to top performers');
  }
  
  // Creative best practices
  recommendations.push('Develop 3-5 creative variations for A/B testing');
  recommendations.push('Ensure mobile-first creative approach for maximum reach');
  
  // Measurement
  recommendations.push('Set up conversion tracking and attribution before launch');
  
  return recommendations;
}

function generateNextSteps(plan) {
  return [
    'Finalize creative assets and trafficking materials',
    'Set up campaign tracking and measurement framework',
    'Coordinate with publishers for campaign launch',
    'Schedule mid-campaign review meeting',
    'Prepare reporting dashboard for stakeholders'
  ];
}

/**
 * POST /api/export/kult-template-pdf
 * Export campaign plan as PDF (converts Excel to PDF)
 * Applies comprehensive layout rules for professional, print-ready output
 */
router.post('/kult-template-pdf', async (req, res) => {
  try {
    const { campaignPlan, budgetChannels = [], campaignName = 'Campaign Plan', availableSites = {} } = req.body;
    
    console.log('[EXPORT PDF] Generating PDF for:', campaignName);
    console.log('[EXPORT PDF] Campaign Plan Data:', JSON.stringify(campaignPlan, null, 2));
    console.log('[EXPORT PDF] Budget Channels:', budgetChannels.length);
    
    // Import layout rules (using dynamic import for ES modules)
    const layoutModule = await import('../lib/pdf-layout-rules.js');
    const { applyLayoutRules, applyCellStyle, calculateRowHeight, PDFLayoutRules } = layoutModule;
    console.log('[EXPORT PDF] Loaded layout rules');
    
    // First generate Excel file
    const templatePath = path.join(__dirname, '../data/KULT_MEDIAPLAN_TEMPLATE.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }
    
    // Load and populate Excel template
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet('KULT MEDIA PLAN');
    
    if (!worksheet) {
      throw new Error('KULT MEDIA PLAN sheet not found in template');
    }
    
    // ========================================
    // APPLY COMPREHENSIVE LAYOUT RULES
    // ========================================
    console.log('[EXPORT PDF] Applying comprehensive layout rules...');
    applyLayoutRules(worksheet);
    console.log('[EXPORT PDF] Layout rules applied: margins, columns, page setup');
    
    // Add KULT logo programmatically
    // ExcelJS doesn't preserve template images, so we must add programmatically
    const logoPath = path.join(__dirname, '../data/original_logo.png');
    if (fs.existsSync(logoPath)) {
      const logoId = workbook.addImage({
        filename: logoPath,
        extension: 'png'
      });
      
      // Position logo at top-right using fixed size
      worksheet.addImage(logoId, {
        tl: { col: 4, row: 0 },      // Top-left: Column E, Row 1
        ext: { width: 192, height: 62 }  // Size in pixels: 2.0" × 0.65" at 96 DPI
      });
      console.log('[EXPORT PDF] Logo added successfully');
    }
    
    // Fill in header fields
    worksheet.getCell('B1').value = campaignPlan.brandProduct || campaignPlan.campaignName || '';
    worksheet.getCell('B2').value = campaignPlan.campaignName || '';
    worksheet.getCell('B3').value = campaignPlan.objective || '';
    worksheet.getCell('B4').value = `RM ${parseFloat(campaignPlan.totalBudget || 0).toLocaleString()}`;
    
    const startDate = campaignPlan.startDate || 'TBD';
    const endDate = campaignPlan.endDate || 'TBD';
    worksheet.getCell('B5').value = `${startDate} to ${endDate}`;
    
    // Plan expiry date
    const expiryLabelCell = worksheet.getCell('A6');
    expiryLabelCell.value = 'PLAN EXPIRY DATE:';
    expiryLabelCell.font = { name: 'Arial', size: 12, bold: true };
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];
    worksheet.getCell('B6').value = expiryDateStr;
    
    // Format header row (row 9) with layout rules
    console.log('[EXPORT PDF] Formatting table header row...');
    const headerRow = worksheet.getRow(9);
    headerRow.height = PDFLayoutRules.tableHeader.height;
    headerRow.eachCell((cell, colNumber) => {
      applyCellStyle(cell, 'table-header', 'center');
      
      // Set column headers
      if (colNumber === 3) {
        cell.value = 'Unit Cost (RM)';
      } else if (colNumber === 5) {
        cell.value = 'TOTAL (RM)';
      }
    });
    
    // Helper function to get site names
    const getSiteNames = (selectedSites = [], availableSites = {}) => {
      const siteNames = [];
      Object.values(availableSites).forEach(category => {
        if (Array.isArray(category)) {
          category.forEach(site => {
            if (selectedSites.includes(site.id)) {
              siteNames.push(site.name);
            }
          });
        }
      });
      return siteNames;
    };
    
    // Helper function to get sites for a specific format/channel
    const getSitesForChannel = (channelName, selectedSites, availableSites) => {
      const channelLower = channelName.toLowerCase();
      
      // Social formats -> ALWAYS show social platforms
      if (channelLower.includes('social') || channelLower.includes('stories')) {
        return ['Facebook', 'Instagram', 'TikTok'];
      }
      
      // Video formats -> ALWAYS show video sites
      if (channelLower.includes('video') || channelLower.includes('instream') || 
          channelLower.includes('masthead') || channelLower.includes('youtube')) {
        return ['YouTube', 'Astro Go', 'Sooka'];
      }
      
      // Display/Interactive/Banner formats -> get non-social sites from selected sites
      if (channelLower.includes('display') || channelLower.includes('banner') || 
          channelLower.includes('leaderboard') || channelLower.includes('mrec') ||
          channelLower.includes('interactive') || channelLower.includes('expandable') ||
          channelLower.includes('interstitial') || channelLower.includes('rich media')) {
        const displaySites = [];
        Object.values(availableSites).forEach(category => {
          if (Array.isArray(category)) {
            category.forEach(site => {
              if (selectedSites.includes(site.id) && 
                  !site.name.match(/Facebook|Instagram|TikTok|YouTube|Astro|Sooka/i)) {
                displaySites.push(site.name);
              }
            });
          }
        });
        // If no specific sites found, return a generic message
        if (displaySites.length === 0) {
          return ['News sites', 'Publisher sites', 'Premium portals'];
        }
        return [...new Set(displaySites)];
      }
      
      // Fallback: return all selected sites
      return getSiteNames(selectedSites, availableSites);
    };
    
    const siteNames = getSiteNames(campaignPlan?.selectedSites, availableSites);
    const personas = campaignPlan?.selectedPersonas || [];
    
    let actualTotalBudget = 0;
    let currentRow = 10;
    
    // Populate budget channels with dynamic row heights
    console.log('[EXPORT PDF] Populating budget channels with layout rules...');
    budgetChannels.forEach((channel, index) => {
      // Column A: Entitlement
      const cellA = worksheet.getCell(`A${currentRow}`);
      cellA.value = channel.name || `Channel ${index + 1}`;
      applyCellStyle(cellA, 'tableData', 1);
      
      // Column B: Description
      const impressions = (channel.impressions || 0);
      const formattedImpressions = impressions >= 1000000 
        ? `${(impressions / 1000000).toFixed(2)}M impressions`
        : impressions >= 1000
        ? `${(impressions / 1000).toFixed(2)}K impressions`
        : `${impressions.toLocaleString()} impressions`;
      
      let description = formattedImpressions;
      
      if (channel.hasLoading === false || channel.hasLoading === undefined) {
        description += ' | Optimised';
      } else {
        description += ' | Not Optimised (100% loading applied)';
      }
      
      // Get channel-specific sites
      const channelSpecificSites = getSitesForChannel(
        channel.name,
        campaignPlan?.selectedSites || [],
        availableSites
      );
      
      if (channelSpecificSites.length > 0) {
        const displaySites = channelSpecificSites.slice(0, 3).join(', ');
        const moreSites = channelSpecificSites.length > 3 ? ` and ${channelSpecificSites.length - 3} more` : '';
        description += ` | Sites: ${displaySites}${moreSites}`;
      }
      
      if (personas.length > 0) {
        const displayPersonas = personas.slice(0, 2).join(', ');
        const morePersonas = personas.length > 2 ? ` +${personas.length - 2} more` : '';
        description += ` | Audience: ${displayPersonas}${morePersonas}`;
      }
      
      const cellB = worksheet.getCell(`B${currentRow}`);
      const descriptionText = description;
      cellB.value = descriptionText;
      applyCellStyle(cellB, 'tableData', 2);
      
      // Column C: Unit Cost (CPM)
      const cellC = worksheet.getCell(`C${currentRow}`);
      cellC.value = parseFloat(channel.cpm || 0);
      cellC.numFmt = '#,##0.00';
      applyCellStyle(cellC, 'tableData', 3);
      
      // Column D: Unit (Quantity in thousands)
      const cellD = worksheet.getCell(`D${currentRow}`);
      const quantity = Math.round((channel.impressions || 0) / 1000);
      cellD.value = quantity;
      cellD.numFmt = '#,##0';
      applyCellStyle(cellD, 'tableData', 4);
      
      // Column E: Channel Budget
      const cellE = worksheet.getCell(`E${currentRow}`);
      const channelBudget = parseFloat(channel.budget || 0);
      cellE.value = channelBudget;
      cellE.numFmt = '#,##0.00';
      applyCellStyle(cellE, 'tableData', 5);
      
      actualTotalBudget += channelBudget;
      
      // Calculate dynamic row height based on description length
      const rowHeight = calculateRowHeight(
        descriptionText,
        PDFLayoutRules.columns.B,
        10 // font size for description
      );
      worksheet.getRow(currentRow).height = rowHeight;
      console.log(`[EXPORT PDF] Row ${currentRow}: height=${rowHeight}px for ${descriptionText.length} chars`);
      
      currentRow++;
    });
    
    // Add TOTAL row
    const totalRow = currentRow;
    
    ['A', 'B', 'C'].forEach(col => {
      const cell = worksheet.getCell(`${col}${totalRow}`);
      cell.value = col === 'A' ? 'TOTAL (ESTIMATED)' : '';
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' }
      };
      cell.alignment = { vertical: 'middle', horizontal: col === 'A' ? 'left' : 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    const totalValueCell = worksheet.getCell(`E${totalRow}`);
    totalValueCell.value = actualTotalBudget;
    totalValueCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    totalValueCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' }
    };
    totalValueCell.alignment = { vertical: 'middle', horizontal: 'right' };
    totalValueCell.numFmt = '#,##0.00';
    totalValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    const totalQuantityCell = worksheet.getCell(`D${totalRow}`);
    totalQuantityCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    totalQuantityCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' }
    };
    totalQuantityCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    
    // Clear old template row 26
    ['D', 'E'].forEach(col => {
      const cell = worksheet.getCell(`${col}26`);
      cell.value = null;
      cell.fill = null;
      cell.font = null;
      cell.border = null;
    });
    
    console.log('[EXPORT PDF] Cleared old template row 26');
    
    // Add Terms & Conditions with layout rules
    console.log('[EXPORT PDF] Adding Terms & Conditions...');
    const termsStartRow = totalRow + PDFLayoutRules.terms.startRowOffset;
    
    const termsTitleCell = worksheet.getCell(`A${termsStartRow}`);
    termsTitleCell.value = 'TERMS & CONDITIONS:';
    applyCellStyle(termsTitleCell, 'termsTitle');
    worksheet.mergeCells(`A${termsStartRow}:E${termsStartRow}`);
    worksheet.getRow(termsStartRow).height = PDFLayoutRules.terms.titleRow.height;
    
    const termsContentRow = termsStartRow + 1;
    const termsText = `1. Planning Use Only: This media plan is generated for planning and discussion purposes only and does not constitute a confirmed booking or media reservation.
2. No Inventory Held: Inventory is not reserved unless the plan is explicitly confirmed via the booking action within the KULT platform.
3. Validity Period: All rates, inventory, and projections are indicative and valid for a limited time (typically up to 14 days from plan generation), subject to availability.
4. Subject to Availability & Revision: KULT reserves the right to revise formats, sites, rates, or allocations due to inventory changes, market demand, or publisher constraints.
5. Estimated Performance Only: Reach, impressions, CTR, and other metrics are estimates based on benchmarks and assumptions. Actual delivery and performance may vary.
6. Final Confirmation Required: The plan becomes binding only after confirmation and acceptance by KULT.
7. Optimisation Rights: KULT may recommend or apply reasonable optimisations to improve delivery and campaign effectiveness.`;
    
    const termsContentCell = worksheet.getCell(`A${termsContentRow}`);
    termsContentCell.value = termsText;
    applyCellStyle(termsContentCell, 'termsContent');
    worksheet.mergeCells(`A${termsContentRow}:E${termsContentRow}`);
    worksheet.getRow(termsContentRow).height = PDFLayoutRules.terms.contentRow.height;
    
    // Add Campaign Strategy Sheet (will be second page in PDF)
    console.log('[EXPORT PDF] Adding Campaign Strategy sheet...');
    try {
      // Fetch formats data for strategy generation
      let formatsData = [];
      try {
        const formatsRes = await axios.get('http://localhost:5001/api/formats', { timeout: 3000 });
        formatsData = formatsRes.data?.data || [];
      } catch (error) {
        console.error('[EXPORT PDF] Error fetching formats:', error.message);
      }
      
      const selectedFormats = formatsData.filter(f => 
        campaignPlan.selectedFormats?.includes(f.id)
      );
      
      // Helper function to wrap long text at specified width for PDF display
      const wrapText = (text, maxWidth = 70) => {
        if (!text || typeof text !== 'string') return text;
        if (text.length <= maxWidth) return text;
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          if ((currentLine + ' ' + word).trim().length <= maxWidth) {
            currentLine = (currentLine + ' ' + word).trim();
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        
        if (currentLine) lines.push(currentLine);
        return lines.join('\n');
      };
      
      // Generate strategy content with text wrapping
      const executiveSummary = wrapText(generateExecutiveSummary(campaignPlan, selectedFormats));
      const objective = generateObjectiveSection(campaignPlan);
      objective.rationale = wrapText(objective.rationale);
      const audience = generateAudienceSection(campaignPlan);
      audience.strategy = wrapText(audience.strategy);
      const mediaStrategy = generateMediaStrategy(campaignPlan, selectedFormats);
      mediaStrategy.strategy = wrapText(mediaStrategy.strategy);
      const budget = generateBudgetSection(campaignPlan);
      const timeline = generateTimelineSection(campaignPlan);
      const outcomes = generateExpectedOutcomes(campaignPlan);
      const recommendations = generateKeyRecommendations(campaignPlan, selectedFormats).map(rec => wrapText(rec));
      const nextSteps = generateNextSteps(campaignPlan).map(step => wrapText(step));
      
      // Create Campaign Strategy worksheet
      const strategySheet = workbook.addWorksheet('Campaign Strategy');
      
      // Build strategy content
      const strategyData = [
        [`${(campaignPlan.campaignName || 'CAMPAIGN').toUpperCase()} - STRATEGY BRIEF`],
        [],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['EXECUTIVE SUMMARY'],
        [executiveSummary],
        [],
        ['CAMPAIGN OBJECTIVE'],
        [`Primary Objective: ${objective.primary}`],
        [objective.rationale],
        [`Industry: ${objective.industry}`],
        [`Geography: ${objective.geography}`],
        [],
        ['TARGET AUDIENCE'],
        [audience.strategy],
        [`Personas: ${audience.personas.join(', ')}`],
        [],
        ['MEDIA STRATEGY'],
        [mediaStrategy.strategy],
        ...(mediaStrategy.formats?.length > 0 ? [[`Selected Formats: ${mediaStrategy.formats.join(', ')}`]] : []),
        [],
        ['BUDGET ALLOCATION'],
        [`Total Budget: ${budget.total}`],
        ...budget.allocation.map(item => [`  • ${item.channel}: ${item.amount} (${item.percentage})`]),
        [],
        ['CAMPAIGN TIMELINE'],
        [`${timeline.period}`],
        [`Duration: ${timeline.duration}`],
        [],
        ['EXPECTED OUTCOMES'],
        [`Estimated Reach: ${outcomes.reach || 'TBD'}`],
        [`Estimated Impressions: ${outcomes.impressions || 'TBD'}`],
        [`Estimated CTR: ${outcomes.estimatedCTR || 'TBD'}`],
        [`Estimated Clicks: ${outcomes.estimatedClicks || 'TBD'}`],
        [`Brand Lift: ${outcomes.brandLift || 'TBD'}`],
        [outcomes.disclaimer || ''],
        [],
        ['KEY RECOMMENDATIONS'],
        ...recommendations.map((rec, idx) => [`${idx + 1}. ${rec}`]),
        [],
        ['NEXT STEPS'],
        ...nextSteps.map((step, idx) => [`${idx + 1}. ${step}`])
      ];
      
      // Add data to strategy sheet
      strategyData.forEach((row, rowIndex) => {
        const excelRow = strategySheet.getRow(rowIndex + 1);
        let maxLines = 1; // Track max lines in this row for height calculation
        
        row.forEach((value, colIndex) => {
          const cell = excelRow.getCell(colIndex + 1);
          cell.value = value;
          
          // Count lines in this cell (for row height calculation)
          if (typeof value === 'string' && value.length > 0) {
            const lines = value.split('\n').length;
            maxLines = Math.max(maxLines, lines);
          }
          
          // Format headers (all caps lines >= 10 chars)
          if (typeof value === 'string' && value === value.toUpperCase() && value.length >= 10) {
            cell.font = { name: 'Arial', size: 12, bold: true }; // Reduced from 14 to 12
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' }
            };
          } else {
            cell.font = { name: 'Arial', size: 10 }; // Reduced from 11 to 10
          }
          
          cell.alignment = { 
            vertical: 'top', 
            horizontal: 'left',
            wrapText: true 
          };
        });
        
        // Set row height based on number of lines (15 points per line + 5 padding)
        excelRow.height = Math.max(15, maxLines * 15 + 5);
      });
      
      // Set column width for PDF (very narrow to ensure no cutoff)
      strategySheet.getColumn(1).width = 70; // Further reduced from 80 to 70 for guaranteed fit
      
      // Set page setup for Campaign Strategy sheet
      strategySheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0, // Allow multiple pages
        margins: {
          left: 1.0,   // Increased from 0.7 to 1.0
          right: 1.0,  // Increased from 0.7 to 1.0
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3
        },
        scale: 90 // Scale down to 90% to fit content better
      };
      
      console.log('[EXPORT PDF] Campaign Strategy sheet added successfully');
    } catch (error) {
      console.error('[EXPORT PDF] Error adding Campaign Strategy sheet:', error);
      // Continue with PDF generation even if strategy fails
    }
    
    // Generate Excel buffer
    console.time('[EXPORT PDF] Excel generation');
    const excelBuffer = await workbook.xlsx.writeBuffer();
    console.timeEnd('[EXPORT PDF] Excel generation');
    
    // Convert to PDF using LibreOffice directly (better quality than libreoffice-convert)
    const { spawn } = await import('child_process');
    const os = await import('os');
    
    console.log('[EXPORT PDF] Converting Excel to PDF using LibreOffice...');
    console.time('[EXPORT PDF] LibreOffice conversion');
    
    // Create temporary directory for conversion
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kult-pdf-'));
    const tmpExcelPath = path.join(tmpDir, 'temp.xlsx');
    const tmpPdfPath = path.join(tmpDir, 'temp.pdf');
    
    try {
      // Write Excel buffer to temporary file
      await fs.promises.writeFile(tmpExcelPath, excelBuffer);
      
      // Convert using LibreOffice command-line (produces better PDF than the library)
      const libreoffice = spawn('libreoffice', [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        tmpDir,
        tmpExcelPath
      ]);
      
      let stderr = '';
      libreoffice.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      await new Promise((resolve, reject) => {
        libreoffice.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`LibreOffice conversion failed with code ${code}: ${stderr}`));
          } else {
            resolve();
          }
        });
        libreoffice.on('error', reject);
      });
      
      console.timeEnd('[EXPORT PDF] LibreOffice conversion');
      
      // Read the generated PDF
      const pdfBuffer = await fs.promises.readFile(tmpPdfPath);
      
      // Send PDF file
      const filename = `KULT_${(campaignPlan.campaignName || 'Campaign_Plan').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log('[EXPORT PDF] Successfully generated:', filename, `(${pdfBuffer.length} bytes)`);
      res.send(pdfBuffer);
      
      // Cleanup temporary files
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
      
    } catch (conversionError) {
      // Cleanup on error
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch {}
      throw conversionError;
    }
    
  } catch (error) {
    console.error('[EXPORT PDF ERROR]:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

export default router;
