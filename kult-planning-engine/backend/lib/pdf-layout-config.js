/**
 * Professional PDF Layout Configuration
 * Implements consistent spacing, page breaks, and formatting rules
 */

export const PDF_LAYOUT_CONFIG = {
  // Page Setup
  pageSetup: {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: false, // Disable auto-fit for consistent layout
    fitToWidth: 1,
    fitToHeight: 0,
    scale: 100, // Fixed scale prevents content resizing
    margins: {
      left: 0.75,
      right: 0.75,
      top: 1.0,    // Extra space for header/logo
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    },
    horizontalCentered: false,
    verticalCentered: false,
    showGridLines: false
  },

  // Fixed Row Heights for Consistent Layout
  rowHeights: {
    logo: 20,           // Row 1: Logo area
    header: 18,         // Rows 2-6: Campaign info
    spacer: 15,         // Rows 7-8: Space before table
    tableHeader: 25,    // Row 9: Table header
    dataRow: 40,        // Rows 10+: Budget channels (1.5x spacing)
    totalRow: 30,       // TOTAL row
    termsHeader: 25,    // Terms & Conditions header
    termsContent: 150   // Terms content block
  },

  // Column Configuration
  columns: {
    A: { width: 25, align: 'left' },   // Entitlement
    B: { width: 60, align: 'left' },   // Description
    C: { width: 15, align: 'right' },  // Unit Cost
    D: { width: 13, align: 'right' },  // Unit
    E: { width: 18, align: 'right' }   // Total
  },

  // Font Configuration
  fonts: {
    headerLabel: { name: 'Arial', size: 11, bold: true },
    headerValue: { name: 'Arial', size: 11, bold: false },
    tableHeader: { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
    tableData: { name: 'Arial', size: 11, bold: false },
    description: { name: 'Arial', size: 10, bold: false }, // Smaller for long text
    terms: { name: 'Arial', size: 9, bold: false }
  },

  // Section Spacing (rows between sections)
  sectionSpacing: {
    afterHeader: 2,     // Rows 7-8
    afterTable: 2,      // Before Terms
    beforeTerms: 1      // Space before T&C
  },

  // Page Break Rules
  pageBreaks: {
    minRowsAtBottom: 3,    // Min rows before page break
    keepTableTogether: true,
    keepTermsTogether: true,
    preventOrphans: true    // Prevent single row at page bottom
  }
};

/**
 * Apply consistent cell styling
 */
export function applyCellStyle(cell, type, value, alignment = 'left') {
  const config = PDF_LAYOUT_CONFIG;
  
  switch (type) {
    case 'header-label':
      cell.font = config.fonts.headerLabel;
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      break;
      
    case 'header-value':
      cell.font = config.fonts.headerValue;
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      break;
      
    case 'table-header':
      cell.font = config.fonts.tableHeader;
      cell.alignment = { vertical: 'middle', horizontal: alignment, wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF000000' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      break;
      
    case 'table-data':
      cell.font = config.fonts.tableData;
      cell.alignment = { vertical: 'middle', horizontal: alignment, wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      break;
      
    case 'description':
      cell.font = config.fonts.description;
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      break;
  }
  
  if (value !== undefined) {
    cell.value = value;
  }
}

/**
 * Initialize worksheet with professional layout
 */
export function initializeWorksheetLayout(worksheet) {
  const config = PDF_LAYOUT_CONFIG;
  
  // Apply page setup
  worksheet.pageSetup = config.pageSetup;
  worksheet.pageSetup.printArea = 'A1:E50';
  worksheet.pageSetup.printTitlesRow = '9:9'; // Repeat header on each page
  
  // Set fixed column widths
  Object.entries(config.columns).forEach(([col, settings]) => {
    worksheet.getColumn(col).width = settings.width;
  });
  
  // Set fixed row heights for header area
  worksheet.getRow(1).height = config.rowHeights.logo;
  for (let i = 2; i <= 6; i++) {
    worksheet.getRow(i).height = config.rowHeights.header;
  }
  worksheet.getRow(7).height = config.rowHeights.spacer;
  worksheet.getRow(8).height = config.rowHeights.spacer;
  worksheet.getRow(9).height = config.rowHeights.tableHeader;
}

export default PDF_LAYOUT_CONFIG;
