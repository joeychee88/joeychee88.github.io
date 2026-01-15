/**
 * Fuzzy date parser for campaign planning
 * Supports natural language like "Mid March to Mid June"
 */

const MONTHS = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 7,
  august: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12
};

/**
 * Parse fuzzy date expressions
 * @param {string} dateText - Natural language date like "Mid March to Mid June"
 * @returns {Object} - {startDate, endDate, durationWeeks, confidence, parsed}
 */
export const parseFuzzyDateRange = (dateText) => {
  if (!dateText || typeof dateText !== 'string') {
    return { startDate: null, endDate: null, durationWeeks: null, confidence: 0, parsed: false };
  }

  const text = dateText.toLowerCase().trim();
  const currentYear = new Date().getFullYear();
  
  // Try to extract month names
  const monthMatches = [];
  Object.keys(MONTHS).forEach(monthName => {
    const regex = new RegExp(`\\b${monthName}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      monthMatches.push({ month: MONTHS[monthName], name: monthName, index: text.indexOf(monthName.toLowerCase()) });
    }
  });

  if (monthMatches.length === 0) {
    return { startDate: null, endDate: null, durationWeeks: null, confidence: 0, parsed: false };
  }

  // Sort by index to get chronological order
  monthMatches.sort((a, b) => a.index - b.index);

  let startMonth, endMonth;
  
  if (monthMatches.length >= 2) {
    // Range detected: "March to June"
    startMonth = monthMatches[0].month;
    endMonth = monthMatches[monthMatches.length - 1].month;
  } else {
    // Single month: "March"
    startMonth = monthMatches[0].month;
    endMonth = startMonth;
  }

  // Detect position hints: early, mid, late, end, start, beginning
  // OR explicit day numbers like "15 March"
  let startDay = 1; // Default to beginning
  let endDay = 28; // Default to near end

  // Check for explicit day number (e.g., "15 March", "March 15")
  const dayMatch = text.match(/(\d{1,2})\s*(?:march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec|january|jan|february|feb)|(?:march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec|january|jan|february|feb)\s*(\d{1,2})/i);
  
  if (dayMatch) {
    const day = parseInt(dayMatch[1] || dayMatch[2]);
    if (day >= 1 && day <= 31) {
      startDay = day;
    }
  } else {
    // Fallback to position hints
    if (/(early|start|beginning)/.test(text)) {
      startDay = 1;
    } else if (/mid/.test(text)) {
      startDay = 15;
    } else if (/(late|end)/.test(text)) {
      startDay = 21;
    }
  }

  // For end date
  if (monthMatches.length >= 2) {
    const endPart = text.substring(monthMatches[1].index);
    if (/(early|start|beginning)/.test(endPart)) {
      endDay = 7;
    } else if (/mid/.test(endPart)) {
      endDay = 15;
    } else if (/(late|end)/.test(endPart)) {
      endDay = 28;
    }
  } else {
    // Single month - default to full month
    endDay = 28;
  }

  // Determine year - ALWAYS ensure future dates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  let startYear = currentYear;
  let endYear = currentYear;

  // If start month is before current month, OR if same month but day has passed, use next year
  if (startMonth < currentMonth || (startMonth === currentMonth && startDay < currentDay)) {
    startYear = currentYear + 1;
    endYear = currentYear + 1;
  }

  // If end month is before start month, assume it spans to next year
  if (endMonth < startMonth) {
    endYear = startYear + 1;
  }

  const startDate = new Date(startYear, startMonth, startDay);
  const endDate = new Date(endYear, endMonth, endDay);

  // Calculate duration in weeks
  let diffMs = endDate - startDate;
  let diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  let durationWeeks = Math.max(1, Math.round(diffDays / 7));
  
  // Check for explicit week duration (e.g., "20 weeks", "4 weeks")
  const weekMatch = text.match(/(\d{1,3})\s*(?:week|wk|weeks|wks)/i);
  if (weekMatch) {
    const explicitWeeks = parseInt(weekMatch[1]);
    if (explicitWeeks >= 1 && explicitWeeks <= 52) {
      durationWeeks = explicitWeeks;
      // Recalculate endDate based on explicit duration
      const calculatedEndDate = new Date(startDate);
      calculatedEndDate.setDate(calculatedEndDate.getDate() + (durationWeeks * 7));
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: calculatedEndDate.toISOString().split('T')[0],
        durationWeeks,
        confidence: 90, // High confidence for explicit duration
        parsed: true,
        rawInput: dateText
      };
    }
  }

  // Confidence score
  let confidence = 50; // Base confidence
  if (monthMatches.length >= 2) confidence += 30; // Range detected
  if (/(mid|early|late|start|end|beginning)/.test(text)) confidence += 20; // Position hints

  return {
    startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
    endDate: endDate.toISOString().split('T')[0],
    durationWeeks,
    confidence: Math.min(100, confidence),
    parsed: true,
    rawInput: dateText
  };
};

/**
 * Format date range for display
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate) return 'No dates specified';
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  
  if (end && end > start) {
    const endStr = end.toLocaleDateString('en-US', options);
    return `${startStr} to ${endStr}`;
  }
  
  return startStr;
};

/**
 * Validate and suggest date corrections
 */
export const validateDateRange = (startDate, endDate, minWeeks = 1, maxWeeks = 52) => {
  if (!startDate || !endDate) {
    return { valid: false, message: 'Start and end dates are required' };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start >= end) {
    return { valid: false, message: 'End date must be after start date' };
  }

  const weeks = Math.round((end - start) / (1000 * 60 * 60 * 24 * 7));

  if (weeks < minWeeks) {
    return { valid: false, message: `Campaign must be at least ${minWeeks} weeks long` };
  }

  if (weeks > maxWeeks) {
    return { valid: false, message: `Campaign cannot exceed ${maxWeeks} weeks` };
  }

  return { valid: true, weeks, message: 'Valid date range' };
};
