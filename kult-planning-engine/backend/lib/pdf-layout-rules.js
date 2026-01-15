/**
 * PDF Layout Rules for KULT Media Plan Exports
 * 
 * This module defines comprehensive layout rules to ensure:
 * - Stable logo positioning and sizing
 * - Consistent header and body spacing
 * - Professional table formatting
 * - Graceful page breaks
 * - Print-ready output
 */

const PDFLayoutRules = {
  // Logo Configuration
  logo: {
    // Logo dimensions (cannot be set via ExcelJS - must be done in template manually)
    targetWidth: 2.0,  // inches
    targetHeight: 0.65, // inches
    position: 'E1:E3',  // Top-right position in template
    // Note: Logo must be manually resized in KULT_MEDIAPLAN_TEMPLATE.xlsx
    // See FIX_LOGO.md for instructions
  },

  // Page Setup
  page: {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // Auto height to prevent content squashing
    scale: 100, // Keep at 100% to maintain readability
    margins: {
      left: 0.7,   // Increased from 0.5 for better spacing
      right: 0.7,  // Increased from 0.5 for better spacing
      top: 0.75,   // Increased to give header more space
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    },
    printArea: 'A1:E45', // Extended to row 45 for longer content
  },

  // Header Section (Rows 1-8)
  header: {
    startRow: 1,
    endRow: 8,
    fixedHeight: true, // Prevent header from collapsing
    rowHeights: {
      1: 20, // Advertiser
      2: 20, // Campaign
      3: 20, // Objective
      4: 20, // Budget
      5: 20, // Period
      6: 20, // Expiry Date
      7: 15, // Spacer
      8: 15, // Spacer before table
    },
    font: {
      name: 'Arial',
      size: 11,
      bold: false,
    },
    labelFont: {
      name: 'Arial',
      size: 11,
      bold: true,
    }
  },

  // Table Header (Row 9)
  tableHeader: {
    row: 9,
    height: 25, // Fixed height for header row
    font: {
      name: 'Arial',
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' } // White text
    },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4788' } // Dark blue background
    },
    alignment: {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  },

  // Table Data Rows (Starting from row 10)
  tableData: {
    startRow: 10,
    minRowHeight: 40, // Minimum height for data rows (1.5x line spacing)
    maxRowHeight: 80, // Maximum height to prevent excessive spacing
    font: {
      entitlement: { name: 'Arial', size: 11, bold: false },
      description: { name: 'Arial', size: 10, bold: false }, // Smaller for long text
      numeric: { name: 'Arial', size: 11, bold: false }
    },
    alignment: {
      entitlement: { vertical: 'middle', horizontal: 'left', wrapText: true },
      description: { vertical: 'middle', horizontal: 'left', wrapText: true },
      numeric: { vertical: 'middle', horizontal: 'right', wrapText: false }
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  },

  // Total Row
  totalRow: {
    height: 25,
    font: {
      name: 'Arial',
      size: 12,
      bold: true
    },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' } // Light gray background
    },
    alignment: {
      vertical: 'middle',
      horizontal: 'right'
    },
    border: {
      top: { style: 'medium' }, // Thicker top border
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    }
  },

  // Terms & Conditions Section
  terms: {
    startRowOffset: 2, // 2 rows after total row
    titleRow: {
      height: 20,
      font: {
        name: 'Arial',
        size: 12,
        bold: true
      },
      alignment: {
        vertical: 'middle',
        horizontal: 'left'
      }
    },
    contentRow: {
      height: 180, // Tall row for multi-line terms
      font: {
        name: 'Arial',
        size: 9,
        bold: false
      },
      alignment: {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true
      },
      mergeRange: 'A:E' // Merge all columns for terms
    }
  },

  // Column Widths (in characters)
  columns: {
    A: 28, // Entitlement - wider for channel names
    B: 65, // Description - much wider for long text with sites/audience
    C: 16, // Unit Cost (RM) - narrower for numbers
    D: 14, // Unit - narrower for numbers
    E: 20  // TOTAL (RM) - adequate for currency
  },

  // Page Break Rules
  pageBreaks: {
    preventOrphans: true, // Don't leave headers alone at bottom
    minRowsBeforeBreak: 3, // Keep at least 3 rows together
    keepTermsTogether: true, // Don't split T&Cs across pages
  }
};

/**
 * Apply comprehensive layout rules to worksheet
 */
function applyLayoutRules(worksheet) {
  // Set column widths
  worksheet.columns = [
    { key: 'A', width: PDFLayoutRules.columns.A },
    { key: 'B', width: PDFLayoutRules.columns.B },
    { key: 'C', width: PDFLayoutRules.columns.C },
    { key: 'D', width: PDFLayoutRules.columns.D },
    { key: 'E', width: PDFLayoutRules.columns.E }
  ];

  // Apply page setup
  worksheet.pageSetup = {
    paperSize: PDFLayoutRules.page.paperSize,
    orientation: PDFLayoutRules.page.orientation,
    fitToPage: PDFLayoutRules.page.fitToPage,
    fitToWidth: PDFLayoutRules.page.fitToWidth,
    fitToHeight: PDFLayoutRules.page.fitToHeight,
    scale: PDFLayoutRules.page.scale,
    margins: PDFLayoutRules.page.margins,
    horizontalCentered: false, // Align to left
    verticalCentered: false    // Align to top
  };

  // Set print area
  worksheet.pageSetup.printArea = PDFLayoutRules.page.printArea;

  // Apply fixed header row heights
  Object.entries(PDFLayoutRules.header.rowHeights).forEach(([row, height]) => {
    worksheet.getRow(parseInt(row)).height = height;
  });

  return worksheet;
}

/**
 * Apply cell styling based on layout rules
 */
function applyCellStyle(cell, type, colNumber) {
  const rules = PDFLayoutRules;

  switch (type) {
    case 'tableHeader':
      cell.font = rules.tableHeader.font;
      cell.fill = rules.tableHeader.fill;
      cell.alignment = rules.tableHeader.alignment;
      cell.border = rules.tableHeader.border;
      break;

    case 'tableData':
      if (colNumber === 1) {
        // Entitlement column
        cell.font = rules.tableData.font.entitlement;
        cell.alignment = rules.tableData.alignment.entitlement;
      } else if (colNumber === 2) {
        // Description column
        cell.font = rules.tableData.font.description;
        cell.alignment = rules.tableData.alignment.description;
      } else {
        // Numeric columns (C, D, E)
        cell.font = rules.tableData.font.numeric;
        cell.alignment = rules.tableData.alignment.numeric;
      }
      cell.border = rules.tableData.border;
      break;

    case 'totalRow':
      cell.font = rules.totalRow.font;
      cell.fill = rules.totalRow.fill;
      cell.alignment = rules.totalRow.alignment;
      cell.border = rules.totalRow.border;
      break;

    case 'termsTitle':
      cell.font = rules.terms.titleRow.font;
      cell.alignment = rules.terms.titleRow.alignment;
      break;

    case 'termsContent':
      cell.font = rules.terms.contentRow.font;
      cell.alignment = rules.terms.contentRow.alignment;
      break;

    default:
      // Default styling
      cell.font = { name: 'Arial', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  return cell;
}

/**
 * Calculate dynamic row height based on content length
 */
function calculateRowHeight(content, columnWidth, fontSize = 10) {
  const rules = PDFLayoutRules.tableData;
  
  // Estimate characters per line based on column width
  const charsPerLine = Math.floor(columnWidth * 1.8); // Rough estimate
  const contentLength = (content || '').toString().length;
  const lines = Math.ceil(contentLength / charsPerLine);
  
  // Calculate height: base + (lines * line height)
  const lineHeight = fontSize * 1.5; // 1.5x line spacing
  const calculatedHeight = Math.max(
    rules.minRowHeight,
    Math.min(rules.maxRowHeight, 20 + (lines * lineHeight))
  );
  
  return calculatedHeight;
}

// ES Module exports
export {
  PDFLayoutRules,
  applyLayoutRules,
  applyCellStyle,
  calculateRowHeight
};
