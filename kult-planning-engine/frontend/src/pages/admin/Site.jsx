import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';

function Site() {
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true); // Separate loading state for table
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    property: [],
    ip: [],
    format: [],
    device: [],
    month: []
  });
  const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open
  const [ipSearchQuery, setIpSearchQuery] = useState(''); // Search query for IP filter
  const [sortConfig, setSortConfig] = useState({ key: 'ip', direction: 'asc' }); // Table sorting
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [donutTooltip, setDonutTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(20); // Rows per page (default 20)

  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FCBX0EDhPmPSe4-AjbuwxoDQwkLGuyBd8IrLYbnQ4xM/edit?gid=0#gid=0';

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const fetchInventoryData = async (skipCache = false) => {
    try {
      setLoading(true);
      setTableLoading(true);
      setError(null);
      
      const url = skipCache ? '/api/inventory?skipCache=true' : '/api/inventory';
      const response = await axios.get(url);
      
      if (response.data.success) {
        const data = response.data.data || [];
        setInventory(data);
        setHeaders(response.data.headers || []);
        setStats(response.data.stats || {});
        
        // Allow UI to render filters and charts first
        setLoading(false);
        
        // Delay table rendering slightly to show charts/filters first
        setTimeout(() => {
          setTableLoading(false);
        }, 100);
      } else {
        throw new Error('Failed to fetch inventory data');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.response?.data?.error || 'Failed to load inventory data. Please try again.');
      setLoading(false);
      setTableLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Call the refresh endpoint to force cache update
      await axios.post('/api/inventory/refresh');
      // Then fetch the fresh data
      await fetchInventoryData(true);
    } catch (err) {
      console.error('Error refreshing inventory:', err);
      setRefreshing(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Get unique filter options from data
  const getUniqueValues = (fieldName) => {
    if (!inventory.length) return [];
    const values = [...new Set(inventory.map(item => item[fieldName]).filter(v => v))];
    return values.sort();
  };

  // Handle multi-select checkbox toggle
  const toggleFilterValue = (filterKey, value) => {
    setFilters(prev => {
      const currentValues = prev[filterKey];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      // Reset dependent filters when a parent filter changes
      if (filterKey === 'property') {
        return { property: newValues, ip: [], format: [], device: [], month: [] };
      } else if (filterKey === 'ip') {
        return { ...prev, ip: newValues, format: [], device: [], month: [] };
      } else if (filterKey === 'format') {
        return { ...prev, format: newValues, device: [], month: [] };
      } else if (filterKey === 'device') {
        return { ...prev, device: newValues, month: [] };
      }
      return { ...prev, [filterKey]: newValues };
    });
  };

  // Select all values for a filter
  const selectAllFilterValues = (filterKey, fieldName) => {
    const allValues = getDynamicFilterOptions(fieldName);
    setFilters(prev => {
      // Reset dependent filters
      if (filterKey === 'property') {
        return { property: allValues, ip: [], format: [], device: [], month: [] };
      } else if (filterKey === 'ip') {
        return { ...prev, ip: allValues, format: [], device: [], month: [] };
      } else if (filterKey === 'format') {
        return { ...prev, format: allValues, device: [], month: [] };
      } else if (filterKey === 'device') {
        return { ...prev, device: allValues, month: [] };
      }
      return { ...prev, [filterKey]: allValues };
    });
  };

  // Get dynamic filter options based on current filter selections (cascade filtering)
  const getDynamicFilterOptions = (fieldName) => {
    if (!inventory.length) return [];
    
    // Filter data based on already selected filters (excluding the current field)
    let filteredData = inventory;
    
    // Apply Property filter if not querying Property field
    if (fieldName !== 'Property' && filters.property.length > 0) {
      filteredData = filteredData.filter(item => filters.property.includes(item.Property));
    }
    
    // Apply IP filter if not querying IP field
    if (fieldName !== 'IP' && filters.ip.length > 0) {
      filteredData = filteredData.filter(item => filters.ip.includes(item.IP));
    }
    
    // Apply Format filter if not querying Format field
    if (fieldName !== 'Format' && filters.format.length > 0) {
      filteredData = filteredData.filter(item => filters.format.includes(item.Format));
    }
    
    // Apply Device filter if not querying Device field
    if (fieldName !== 'Device category' && filters.device.length > 0) {
      filteredData = filteredData.filter(item => filters.device.includes(item['Device category']));
    }
    
    // Apply Month filter if not querying Month field
    if (fieldName !== 'Month and year' && filters.month.length > 0) {
      filteredData = filteredData.filter(item => filters.month.includes(item['Month and year']));
    }
    
    // Extract unique values from filtered data
    const values = [...new Set(filteredData.map(item => item[fieldName]).filter(v => v))];
    
    // Special sorting for Month and year field - chronological order
    if (fieldName === 'Month and year') {
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return values.sort((a, b) => {
        const monthA = monthOrder.indexOf(a);
        const monthB = monthOrder.indexOf(b);
        return monthA - monthB;
      });
    }
    
    return values.sort();
  };

  // Calculate filtered statistics
  const filteredInventory = inventory.filter(item => {
    if (filters.property.length > 0 && !filters.property.includes(item.Property)) return false;
    if (filters.ip.length > 0 && !filters.ip.includes(item.IP)) return false;
    if (filters.format.length > 0 && !filters.format.includes(item.Format)) return false;
    if (filters.device.length > 0 && !filters.device.includes(item['Device category'])) return false;
    if (filters.month.length > 0 && !filters.month.includes(item['Month and year'])) return false;
    return true;
  });

  // Calculate aggregated statistics for filtered data
  const calculateFilteredStats = () => {
    if (!filteredInventory.length) return { avgAdRequests: 0, avgImpressions: 0, avgFillRate: 0 };
    
    // Group by month and calculate totals per month
    const monthlyTotals = {};
    filteredInventory.forEach(item => {
      const month = item['Month and year'] || 'Unknown';
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = {
          adRequests: 0,
          impressions: 0
        };
      }
      monthlyTotals[month].adRequests += (item['Total ad requests'] || 0);
      monthlyTotals[month].impressions += (item['Total impressions'] || 0);
    });
    
    // Get array of monthly totals
    const monthlyValues = Object.values(monthlyTotals);
    
    if (monthlyValues.length === 0) {
      return { avgAdRequests: 0, avgImpressions: 0, avgFillRate: 0 };
    }
    
    // Calculate AVERAGE of monthly totals (not MIN)
    const totalAdRequests = monthlyValues.reduce((sum, m) => sum + m.adRequests, 0);
    const totalImpressions = monthlyValues.reduce((sum, m) => sum + m.impressions, 0);
    const avgAdRequests = totalAdRequests / monthlyValues.length;
    const avgImpressions = totalImpressions / monthlyValues.length;
    
    return {
      avgAdRequests: Math.round(avgAdRequests),
      avgImpressions: Math.round(avgImpressions),
      avgFillRate: totalAdRequests > 0 ? ((totalImpressions / totalAdRequests) * 100).toFixed(1) : 0
    };
  };

  const filteredStats = calculateFilteredStats();

  // Group data by month for chart
  const monthlyData = filteredInventory.reduce((acc, item) => {
    const month = item['Month and year'] || 'Unknown';
    if (!acc[month]) {
      acc[month] = {
        month,
        adRequests: 0,
        impressions: 0,
        count: 0
      };
    }
    acc[month].adRequests += item['Total ad requests'] || 0;
    acc[month].impressions += item['Total impressions'] || 0;
    acc[month].count += 1;
    return acc;
  }, {});

  // Calculate fill rate for each month
  Object.values(monthlyData).forEach(month => {
    month.fillRate = month.adRequests > 0 ? ((month.impressions / month.adRequests) * 100).toFixed(1) : 0;
  });

  const monthlyDataArray = Object.values(monthlyData).sort((a, b) => {
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
  });

  // Group data by device for chart
  const deviceData = filteredInventory.reduce((acc, item) => {
    const device = item['Device category'] || 'Unknown';
    if (!acc[device]) {
      acc[device] = {
        device,
        adRequests: 0,
        impressions: 0
      };
    }
    acc[device].adRequests += item['Total ad requests'] || 0;
    acc[device].impressions += item['Total impressions'] || 0;
    return acc;
  }, {});

  const deviceDataArray = Object.values(deviceData).sort((a, b) => b.adRequests - a.adRequests);
  const deviceColors = ['#3B82F6', '#FB923C', '#FF0080', '#10B981', '#F97316', '#A855F7'];

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    // Define month order
    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Determine which months to include
    // If no month filter is selected, include all 12 months
    // If month filter is selected, only include selected months
    const monthsToInclude = filters.month.length > 0 
      ? filters.month.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
      : monthOrder;
    
    // Build flat table: each row is one IP-Device-Month combination
    const rows = [];
    
    filteredInventory.forEach(item => {
      const month = item['Month and year'] || 'Unknown';
      
      // Only include months that match the filter (or all if no filter)
      if (monthsToInclude.includes(month)) {
        const adRequests = item['Total ad requests'] || 0;
        const impressions = item['Total impressions'] || 0;
        const fillRate = adRequests > 0 
          ? ((impressions / adRequests) * 100).toFixed(1) 
          : '0.0';
        
        rows.push({
          ip: item.IP || 'Unknown',
          device: item['Device category'] || 'Unknown',
          month: month,
          adRequests: adRequests,
          impressions: impressions,
          fillRate: fillRate
        });
      }
    });

    // Create CSV content
    const headers = ['IP', 'Device', 'Month', 'Ad Requests', 'Impressions', 'Fill Rate (%)'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => [
        `"${row.ip}"`,
        `"${row.device}"`,
        `"${row.month}"`,
        row.adRequests,
        row.impressions,
        row.fillRate
      ].join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `KULT_Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const exportToPDF = async () => {
    // Dynamically import libraries
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 10;

    // Set white background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Set black text color
    // Note: jsPDF uses Helvetica by default (similar to Inter)
    pdf.setTextColor(0, 0, 0);

    // Title (Left-aligned)
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Property Inventory Report', 15, yPosition);
    
    // Timestamp (Left-aligned, below title)
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    const timestamp = new Date().toLocaleString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '');
    pdf.text(`Generated: ${timestamp}`, 15, yPosition + 5);

    // Add KULT Logo on the right - invert colors for PDF (black logo on white background)
    try {
      const logoImg = await fetch('/kult-logo.png').then(res => res.blob());
      const logoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(logoImg);
      });
      
      // Create canvas to invert logo colors (white to black)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Get image data and invert colors
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            // If pixel is white or near-white (logo text), make it black
            if (data[i] > 200 && data[i+1] > 200 && data[i+2] > 200) {
              data[i] = 0;     // R
              data[i+1] = 0;   // G
              data[i+2] = 0;   // B
              // Keep alpha channel (transparency)
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          resolve();
        };
        img.src = logoDataUrl;
      });
      
      // Add inverted logo to PDF (right-aligned)
      const invertedLogoData = canvas.toDataURL('image/png');
      pdf.addImage(invertedLogoData, 'PNG', pageWidth - 45, yPosition - 2, 30, 10);
    } catch (error) {
      console.error('Error loading logo:', error);
      // Fallback: Just show "KULT" text in black (right-aligned)
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('KULT', pageWidth - 30, yPosition + 5);
    }
    
    yPosition += 12;

    // Active Filters Section (Compact)
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('Filters:', 15, yPosition);
    yPosition += 4;
    
    pdf.setFontSize(7);
    pdf.setFont(undefined, 'normal');
    
    const filterText = [];
    if (filters.property.length > 0) filterText.push(`Property: ${filters.property.slice(0, 3).join(', ')}${filters.property.length > 3 ? '...' : ''}`);
    if (filters.ip.length > 0) filterText.push(`IP: ${filters.ip.slice(0, 3).join(', ')}${filters.ip.length > 3 ? '...' : ''}`);
    if (filters.format.length > 0) filterText.push(`Format: ${filters.format.join(', ')}`);
    if (filters.device.length > 0) filterText.push(`Device: ${filters.device.join(', ')}`);
    if (filters.month.length > 0) filterText.push(`Month: ${filters.month.join(', ')}`);
    
    if (filterText.length === 0) {
      pdf.text('All data (no filters)', 15, yPosition);
      yPosition += 4;
    } else {
      filterText.forEach(text => {
        pdf.text(text, 15, yPosition);
        yPosition += 4;
      });
    }
    yPosition += 4;

    // Summary Stats (Compact - 2 columns)
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('Summary:', 15, yPosition);
    yPosition += 4;
    
    pdf.setFontSize(7);
    pdf.setFont(undefined, 'normal');
    const col1X = 15;
    const col2X = pageWidth / 2 + 5;
    
    pdf.text(`Avg. Ad Requests: ${formatNumber(filteredStats.avgAdRequests)}`, col1X, yPosition);
    pdf.text(`Avg. Impressions: ${formatNumber(filteredStats.avgImpressions)}`, col2X, yPosition);
    yPosition += 4;
    pdf.text(`Avg Fill Rate: ${filteredStats.avgFillRate}%`, col1X, yPosition);
    pdf.text(`Available IPs: ${[...new Set(filteredInventory.map(item => item.IP).filter(ip => ip))].length}`, col2X, yPosition);
    yPosition += 8;

    // Capture charts with white background and dark text/lines (no flash on page)
    const chartSection = document.getElementById('charts-section');
    if (chartSection) {
      const canvas = await html2canvas(chartSection, { 
        scale: 1.5,
        backgroundColor: '#FFFFFF', // White background for charts
        logging: false,
        onclone: (clonedDoc) => {
          // Modify ONLY the cloned element (no visible flash on actual page)
          const clonedSection = clonedDoc.getElementById('charts-section');
          if (clonedSection) {
            // Set white background
            clonedSection.style.backgroundColor = '#FFFFFF';
            
            // Change all background colors to white
            const allDivs = clonedSection.querySelectorAll('div');
            allDivs.forEach(div => {
              div.style.backgroundColor = '#FFFFFF';
            });
            
            // Change all text colors to black
            const textElements = clonedSection.querySelectorAll('text, tspan, div, span, h3, p');
            textElements.forEach(el => {
              el.style.color = '#000000';
              el.style.fill = '#000000';
            });
            
            // Change SVG stroke colors to black/dark
            const clonedSvgs = clonedSection.querySelectorAll('svg');
            clonedSvgs.forEach(svg => {
              // Change stroke colors on paths, lines, circles
              const paths = svg.querySelectorAll('path, line, polyline, circle, rect');
              paths.forEach(path => {
                const currentStroke = path.getAttribute('stroke');
                // If it has a stroke and it's not 'none', make it dark
                if (currentStroke && currentStroke !== 'none') {
                  // Blue lines -> keep blue but darker
                  if (currentStroke.includes('#3B82F6') || currentStroke.includes('59, 130, 246')) {
                    path.setAttribute('stroke', '#1E40AF');
                  }
                  // Green lines -> keep green but darker
                  else if (currentStroke.includes('#10B981') || currentStroke.includes('16, 185, 129')) {
                    path.setAttribute('stroke', '#047857');
                  }
                  // Pink/red lines -> keep pink but darker
                  else if (currentStroke.includes('#FF0080') || currentStroke.includes('255, 0, 128')) {
                    path.setAttribute('stroke', '#BE185D');
                  }
                  // Cyan lines -> darker cyan
                  else if (currentStroke.includes('#06B6D4') || currentStroke.includes('6, 182, 212')) {
                    path.setAttribute('stroke', '#0E7490');
                  }
                  // Other colored strokes -> make dark gray
                  else if (currentStroke.includes('#') || currentStroke.includes('rgb')) {
                    path.setAttribute('stroke', '#374151');
                  }
                }
                
                // Change fill colors for solid shapes
                const currentFill = path.getAttribute('fill');
                if (currentFill && currentFill !== 'none' && currentFill !== 'transparent') {
                  // Keep colored fills but make them more visible on white
                  if (!currentFill.includes('url(')) {
                    path.setAttribute('fill', currentFill);
                  }
                }
              });
              
              // Change text elements inside SVG
              const svgTexts = svg.querySelectorAll('text, tspan');
              svgTexts.forEach(text => {
                text.setAttribute('fill', '#000000');
                text.style.fill = '#000000';
              });
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if we need a new page for charts
      if (yPosition + imgHeight > pageHeight - 20) {
        pdf.addPage();
        yPosition = 15;
        // Set white background for new page
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.setTextColor(0, 0, 0);
      }
      
      pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 8;
    }

    // Check if we need a new page for table
    if (yPosition > pageHeight - 80) {
      pdf.addPage();
      yPosition = 15;
      // Set white background for new page
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(0, 0, 0);
    }

    // Table Section
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.text('Detailed Inventory', 15, yPosition);
    yPosition += 6;

    // Prepare table data (same as Excel export)
    const groups = {};
    filteredInventory.forEach(item => {
      const key = `${item.IP || 'Unknown'}_${item['Device category'] || 'Unknown'}`;
      if (!groups[key]) {
        groups[key] = {
          ip: item.IP || 'Unknown',
          device: item['Device category'] || 'Unknown',
          monthlyData: {}
        };
      }
      const month = item['Month and year'] || 'Unknown';
      if (!groups[key].monthlyData[month]) {
        groups[key].monthlyData[month] = {
          adRequests: 0,
          impressions: 0
        };
      }
      groups[key].monthlyData[month].adRequests += item['Total ad requests'] || 0;
      groups[key].monthlyData[month].impressions += item['Total impressions'] || 0;
    });

    const tableData = Object.values(groups).map(group => {
      const monthlyValues = Object.values(group.monthlyData);
      if (monthlyValues.length === 0) {
        return {
          ip: group.ip,
          device: group.device,
          avgAdRequests: 0,
          avgImpressions: 0,
          fillRate: 0
        };
      }
      
      const minAdRequests = Math.min(...monthlyValues.map(m => m.adRequests));
      const minImpressions = Math.min(...monthlyValues.map(m => m.impressions));
      const totalAdRequests = monthlyValues.reduce((sum, m) => sum + m.adRequests, 0);
      const totalImpressions = monthlyValues.reduce((sum, m) => sum + m.impressions, 0);
      const fillRate = totalAdRequests > 0 ? ((totalImpressions / totalAdRequests) * 100).toFixed(1) : 0;
      
      return {
        ip: group.ip,
        device: group.device,
        avgAdRequests: Math.round(minAdRequests),
        avgImpressions: Math.round(minImpressions),
        fillRate
      };
    });

    // Table headers
    pdf.setFontSize(7);
    pdf.setFont(undefined, 'bold');
    pdf.setFillColor(240, 240, 240); // Light gray header background
    pdf.rect(14, yPosition - 3, pageWidth - 28, 5, 'F');
    
    const colX = [15, 70, 110, 145, 175];
    
    pdf.text('IP', colX[0], yPosition);
    pdf.text('Device', colX[1], yPosition);
    pdf.text('Ad Requests', colX[2], yPosition);
    pdf.text('Impressions', colX[3], yPosition);
    pdf.text('Fill Rate', colX[4], yPosition);
    yPosition += 4;
    
    // Table rows - compact
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(6);
    
    // Limit rows to fit on one page (max ~30 rows)
    const maxRows = Math.min(tableData.length, 30);
    
    tableData.slice(0, maxRows).forEach((row, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        pdf.setFillColor(250, 250, 250);
        pdf.rect(14, yPosition - 3, pageWidth - 28, 4, 'F');
      }
      
      pdf.text(row.ip.substring(0, 35), colX[0], yPosition);
      pdf.text(row.device.substring(0, 20), colX[1], yPosition);
      pdf.text(row.avgAdRequests.toLocaleString(), colX[2], yPosition);
      pdf.text(row.avgImpressions.toLocaleString(), colX[3], yPosition);
      pdf.text(`${row.fillRate}%`, colX[4], yPosition);
      yPosition += 4;
    });
    
    // If more data exists, add a note
    if (tableData.length > maxRows) {
      yPosition += 2;
      pdf.setFontSize(6);
      pdf.setFont(undefined, 'italic');
      pdf.text(`Showing ${maxRows} of ${tableData.length} rows. Download Excel for complete data.`, 15, yPosition);
    }

    // Save PDF
    pdf.save(`KULT_Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Remove full-page loading blocker to enable progressive loading
  // The sidebar, filters, and charts will render immediately
  // Only the table will show a loading spinner via tableLoading state

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                [ ADMIN / INVENTORY MANAGEMENT ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Property Inventory</h1>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <a
                href={GOOGLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#2d3748] text-white rounded-md hover:bg-[#3d4758] transition-colors flex items-center text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                <span>Edit Source</span>
              </a>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-[#0891b2] text-white font-medium rounded-md hover:bg-[#0e7490] disabled:opacity-50 transition-all flex items-center text-sm"
              >
                <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Global Filters */}
          <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Global Filters</h3>
              </div>
              <button
                onClick={() => setFilters({ property: [], ip: [], format: [], device: [], month: [] })}
                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Property Filter */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1.5 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Property
                </label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'property' ? null : 'property')}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                >
                  <span>{filters.property.length > 0 ? `${filters.property.length} selected` : 'Select...'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'property' && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                      <button
                        onClick={() => selectAllFilterValues('property', 'Property')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, property: [] }))}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="p-2">
                      {getUniqueValues('Property').map(val => (
                        <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.property.includes(val)}
                            onChange={() => toggleFilterValue('property', val)}
                            className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                          />
                          <span className="text-sm text-white">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* IP Filter */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1.5 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  IP
                </label>
                <button
                  onClick={() => {
                    if (openDropdown === 'ip') {
                      setOpenDropdown(null);
                      setIpSearchQuery(''); // Clear search when closing
                    } else {
                      setOpenDropdown('ip');
                      setIpSearchQuery(''); // Clear search when opening
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                >
                  <span>{filters.ip.length > 0 ? `${filters.ip.length} selected` : 'Select...'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'ip' && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg">
                    {/* Search Input */}
                    <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2">
                      <input
                        type="text"
                        placeholder="Search IPs..."
                        value={ipSearchQuery}
                        onChange={(e) => setIpSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#161b22] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        autoFocus
                      />
                    </div>
                    {/* Action Buttons */}
                    <div className="sticky top-[52px] bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                      <button
                        onClick={() => {
                          const filteredOptions = getDynamicFilterOptions('IP').filter(val => 
                            val.toLowerCase().includes(ipSearchQuery.toLowerCase())
                          );
                          setFilters(prev => ({ ...prev, ip: [...new Set([...prev.ip, ...filteredOptions])], format: [], device: [], month: [] }));
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, ip: [] }))}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    {/* Options List */}
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {getDynamicFilterOptions('IP')
                        .filter(val => val.toLowerCase().includes(ipSearchQuery.toLowerCase()))
                        .map(val => (
                          <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.ip.includes(val)}
                              onChange={() => toggleFilterValue('ip', val)}
                              className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                            />
                            <span className="text-sm text-white">{val}</span>
                          </label>
                        ))}
                      {getDynamicFilterOptions('IP').filter(val => val.toLowerCase().includes(ipSearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-2">No IPs found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Format Filter */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1.5 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Format
                </label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'format' ? null : 'format')}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                >
                  <span>{filters.format.length > 0 ? `${filters.format.length} selected` : 'Select...'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'format' && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                      <button
                        onClick={() => selectAllFilterValues('format', 'Format')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, format: [] }))}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="p-2">
                      {getDynamicFilterOptions('Format').map(val => (
                        <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.format.includes(val)}
                            onChange={() => toggleFilterValue('format', val)}
                            className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                          />
                          <span className="text-sm text-white">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Device Filter */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1.5 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Device
                </label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'device' ? null : 'device')}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                >
                  <span>{filters.device.length > 0 ? `${filters.device.length} selected` : 'Select...'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'device' && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                      <button
                        onClick={() => selectAllFilterValues('device', 'Device category')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, device: [] }))}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="p-2">
                      {getDynamicFilterOptions('Device category').map(val => (
                        <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.device.includes(val)}
                            onChange={() => toggleFilterValue('device', val)}
                            className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                          />
                          <span className="text-sm text-white">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Month Filter */}
              <div className="relative">
                <label className="block text-xs text-gray-400 mb-1.5 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Month
                </label>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                >
                  <span>{filters.month.length > 0 ? `${filters.month.length} selected` : 'Select...'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'month' && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                      <button
                        onClick={() => selectAllFilterValues('month', 'Month and year')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, month: [] }))}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="p-2">
                      {getDynamicFilterOptions('Month and year').map(val => (
                        <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.month.includes(val)}
                            onChange={() => toggleFilterValue('month', val)}
                            className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                          />
                          <span className="text-sm text-white">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Property Section Header */}
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Property</h2>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-[#0d1117] border border-gray-800 rounded-lg p-5 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="h-8 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Avg. Monthly Ad Requests */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5">
              <div className="text-xs mb-2 font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#3B82F6' }}>
                Avg. Monthly Ad Requests
              </div>
              <div className="text-3xl font-black text-white">
                {formatNumber(filteredStats.avgAdRequests)}
              </div>
            </div>

            {/* Avg. Monthly Imp. Served */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5">
              <div className="text-xs mb-2 font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#10B981' }}>
                Avg. Monthly Imp. Served
              </div>
              <div className="text-3xl font-black text-white">
                {formatNumber(filteredStats.avgImpressions)}
              </div>
            </div>

            {/* Avg Fill Rate */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5">
              <div className="text-xs mb-2 font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#FF0080' }}>
                Avg Fill Rate
              </div>
              <div className="text-3xl font-black text-white">
                {filteredStats.avgFillRate}%
              </div>
              <div className="text-xs text-gray-500 mt-1">(Impressions / Requests)</div>
            </div>

            {/* Available IPs */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5">
              <div className="text-xs mb-2 font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#F97316' }}>
                Available IPs
              </div>
              <div className="text-3xl font-black text-white">
                {[...new Set(filteredInventory.map(item => item.IP).filter(ip => ip))].length}
              </div>
            </div>
          </div>
          )}

          {/* Charts Section */}
          {loading ? (
            <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Loading skeletons for charts */}
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5 lg:col-span-3 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-700 rounded"></div>
              </div>
              <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-64 bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : (
            <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Monthly Trend Line Chart - 3/4 width */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5 lg:col-span-3">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Monthly Trend</h3>
              </div>
              
              {/* SVG Line Chart */}
              <div className="relative w-full" style={{ height: '300px' }}>
                <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="adRequestsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  
                  {(() => {
                    if (!monthlyDataArray.length) return null;
                    
                    const padding = { top: 20, right: 50, bottom: 40, left: 50 };
                    const chartWidth = 800;
                    const chartHeight = 300;
                    const innerWidth = chartWidth - padding.left - padding.right;
                    const innerHeight = chartHeight - padding.top - padding.bottom;
                    
                    const maxAdRequests = Math.max(...monthlyDataArray.map(d => d.adRequests));
                    const maxImpressions = Math.max(...monthlyDataArray.map(d => d.impressions));
                    // Use the max of both Ad Requests and Impressions for left Y-axis scale
                    const maxLeftAxis = Math.max(maxAdRequests, maxImpressions);
                    const maxFillRate = Math.max(...monthlyDataArray.map(d => parseFloat(d.fillRate)));
                    
                    // Calculate points for all metrics
                    const pointsData = monthlyDataArray.map((item, i) => {
                      // Handle single month case - center the point
                      let x;
                      if (monthlyDataArray.length === 1) {
                        x = padding.left + innerWidth / 2; // Center the single point
                      } else {
                        x = padding.left + (i / (monthlyDataArray.length - 1)) * innerWidth;
                      }
                      
                      return {
                        x,
                        yRequests: padding.top + innerHeight - (item.adRequests / maxLeftAxis) * innerHeight,
                        yImpressions: padding.top + innerHeight - (item.impressions / maxLeftAxis) * innerHeight,
                        yFillRate: padding.top + innerHeight - (parseFloat(item.fillRate) / maxFillRate) * innerHeight
                      };
                    });
                    
                    // Helper function to create smooth curve path
                    const createCurvePath = (points) => {
                      if (points.length === 0) return '';
                      if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
                      
                      let path = `M ${points[0].x} ${points[0].y}`;
                      
                      for (let i = 0; i < points.length - 1; i++) {
                        const xMid = (points[i].x + points[i + 1].x) / 2;
                        const yMid = (points[i].y + points[i + 1].y) / 2;
                        const cpX1 = (xMid + points[i].x) / 2;
                        const cpX2 = (xMid + points[i + 1].x) / 2;
                        
                        path += ` Q ${cpX1} ${points[i].y}, ${xMid} ${yMid}`;
                        path += ` Q ${cpX2} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
                      }
                      
                      return path;
                    };
                    
                    // Create smooth curve paths
                    const pathAdRequests = createCurvePath(pointsData.map(p => ({ x: p.x, y: p.yRequests })));
                    const pathImpressions = createCurvePath(pointsData.map(p => ({ x: p.x, y: p.yImpressions })));
                    const pathFillRate = createCurvePath(pointsData.map(p => ({ x: p.x, y: p.yFillRate })));
                    
                    // Create area paths with curve for fill
                    const areaAdRequests = pathAdRequests + ` L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;
                    const areaImpressions = pathImpressions + ` L ${padding.left + innerWidth} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;
                    
                    // Helper function to format large numbers
                    const formatYAxis = (num) => {
                      if (num >= 1000000) return (num / 1000000).toFixed(0) + 'M';
                      if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
                      return num.toFixed(0);
                    };
                    
                    return (
                      <>
                        {/* Left Y-axis line */}
                        <line
                          x1={padding.left}
                          y1={padding.top}
                          x2={padding.left}
                          y2={padding.top + innerHeight}
                          stroke="#4B5563"
                          strokeWidth="1"
                        />
                        
                        {/* Right Y-axis line */}
                        <line
                          x1={padding.left + innerWidth}
                          y1={padding.top}
                          x2={padding.left + innerWidth}
                          y2={padding.top + innerHeight}
                          stroke="#4B5563"
                          strokeWidth="1"
                        />
                        
                        {/* Grid lines with Y-axis labels */}
                        {[0, 1, 2, 3, 4].map(i => {
                          const y = padding.top + (i / 4) * innerHeight;
                          const leftValue = maxLeftAxis * (1 - i / 4);
                          const rightValue = maxFillRate * (1 - i / 4);
                          
                          return (
                            <g key={i}>
                              <line
                                x1={padding.left}
                                y1={y}
                                x2={padding.left + innerWidth}
                                y2={y}
                                stroke="#374151"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                              
                              {/* Left Y-axis labels (Ad Requests/Impressions) */}
                              <text
                                x={padding.left - 10}
                                y={y + 4}
                                textAnchor="end"
                                fill="#9CA3AF"
                                fontSize="10"
                                fontWeight="500"
                              >
                                {formatYAxis(leftValue)}
                              </text>
                              
                              {/* Right Y-axis labels (Fill Rate %) */}
                              <text
                                x={padding.left + innerWidth + 10}
                                y={y + 4}
                                textAnchor="start"
                                fill="#9CA3AF"
                                fontSize="10"
                                fontWeight="500"
                              >
                                {rightValue.toFixed(0)}%
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Area fills */}
                        <path d={areaAdRequests} fill="url(#adRequestsGradient)" />
                        <path d={areaImpressions} fill="url(#impressionsGradient)" />
                        
                        {/* Smooth Curve Lines */}
                        <path
                          d={pathAdRequests}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={pathImpressions}
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={pathFillRate}
                          fill="none"
                          stroke="#FF0080"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="5 5"
                        />
                        
                        {/* Data points with hover areas */}
                        {pointsData.map((point, i) => {
                          const monthData = monthlyDataArray[i];
                          return (
                            <g key={i}>
                              {/* Invisible hover area */}
                              <rect
                                x={point.x - 15}
                                y={padding.top}
                                width={30}
                                height={innerHeight}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setTooltip({
                                    visible: true,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10,
                                    data: {
                                      month: monthData.month,
                                      adRequests: monthData.adRequests,
                                      impressions: monthData.impressions,
                                      fillRate: monthData.fillRate
                                    }
                                  });
                                }}
                                onMouseLeave={() => {
                                  setTooltip({ visible: false, x: 0, y: 0, data: null });
                                }}
                              />
                              
                              {/* Data point circles */}
                              <circle 
                                cx={point.x} 
                                cy={point.yRequests} 
                                r={tooltip.visible && tooltip.data?.month === monthData.month ? "6" : "4"} 
                                fill="#3B82F6" 
                                stroke="#0a0a0a" 
                                strokeWidth="2"
                                style={{ transition: 'r 0.2s', pointerEvents: 'none' }}
                              />
                              <circle 
                                cx={point.x} 
                                cy={point.yImpressions} 
                                r={tooltip.visible && tooltip.data?.month === monthData.month ? "6" : "4"} 
                                fill="#10B981" 
                                stroke="#0a0a0a" 
                                strokeWidth="2"
                                style={{ transition: 'r 0.2s', pointerEvents: 'none' }}
                              />
                              <circle 
                                cx={point.x} 
                                cy={point.yFillRate} 
                                r={tooltip.visible && tooltip.data?.month === monthData.month ? "5" : "3"} 
                                fill="#FF0080" 
                                stroke="#0a0a0a" 
                                strokeWidth="2"
                                style={{ transition: 'r 0.2s', pointerEvents: 'none' }}
                              />
                              
                              {/* X-axis labels */}
                              <text
                                x={point.x}
                                y={padding.top + innerHeight + 25}
                                textAnchor="middle"
                                fill="#9CA3AF"
                                fontSize="10"
                                fontWeight="600"
                                style={{ pointerEvents: 'none' }}
                              >
                                {monthData.month.substring(0, 3)}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Tooltip */}
              {tooltip.visible && tooltip.data && (
                <div 
                  className="fixed z-50 pointer-events-none"
                  style={{ 
                    left: `${tooltip.x}px`, 
                    top: `${tooltip.y}px`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px]">
                    <div className="text-white font-bold text-sm mb-2 border-b border-gray-700 pb-2">
                      {tooltip.data.month}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-gray-400">Ad Requests</span>
                        </div>
                        <span className="text-xs text-white font-semibold">{formatNumber(tooltip.data.adRequests)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-400">Impressions</span>
                        </div>
                        <span className="text-xs text-white font-semibold">{formatNumber(tooltip.data.impressions)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                          <span className="text-xs text-gray-400">Fill Rate</span>
                        </div>
                        <span className="text-xs text-white font-semibold">{tooltip.data.fillRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center justify-center space-x-4 mt-6 pt-4 border-t border-gray-800 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-0.5 bg-blue-500"></div>
                  <span className="text-xs text-gray-400 font-semibold">Ad Requests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-0.5 bg-green-500"></div>
                  <span className="text-xs text-gray-400 font-semibold">Impressions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-0.5 bg-pink-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FF0080 0, #FF0080 3px, transparent 3px, transparent 6px)' }}></div>
                  <span className="text-xs text-gray-400 font-semibold">Fill Rate</span>
                </div>
              </div>
            </div>

            {/* Device Breakdown - Donut Chart - 1/4 width */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-lg p-5 lg:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Device Breakdown</h3>
              </div>
              
              {/* Donut Chart - Vertical Layout */}
              <div className="flex flex-col items-center justify-center gap-6">
                {/* SVG Donut Chart */}
                <div className="relative mx-auto" style={{ width: '200px', height: '200px' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    {(() => {
                      const totalRequests = deviceDataArray.reduce((sum, d) => sum + d.adRequests, 0);
                      let currentAngle = 0;
                      const centerX = 100;
                      const centerY = 100;
                      const radius = 80;
                      const innerRadius = 50;
                      
                      return deviceDataArray.map((item, index) => {
                        const percentage = totalRequests > 0 ? (item.adRequests / totalRequests) * 100 : 0;
                        let angle = (percentage / 100) * 360;
                        
                        // Handle 100% case - use 359.99 to avoid full circle rendering issue
                        if (angle >= 360) {
                          angle = 359.99;
                        }
                        
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        currentAngle = endAngle;
                        
                        // Convert angles to radians
                        const startRad = (startAngle - 90) * (Math.PI / 180);
                        const endRad = (endAngle - 90) * (Math.PI / 180);
                        
                        // Calculate outer arc points
                        const x1 = centerX + radius * Math.cos(startRad);
                        const y1 = centerY + radius * Math.sin(startRad);
                        const x2 = centerX + radius * Math.cos(endRad);
                        const y2 = centerY + radius * Math.sin(endRad);
                        
                        // Calculate inner arc points
                        const x3 = centerX + innerRadius * Math.cos(endRad);
                        const y3 = centerY + innerRadius * Math.sin(endRad);
                        const x4 = centerX + innerRadius * Math.cos(startRad);
                        const y4 = centerY + innerRadius * Math.sin(startRad);
                        
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        
                        const pathData = `
                          M ${x1} ${y1}
                          A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                          L ${x3} ${y3}
                          A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
                          Z
                        `;
                        
                        return (
                          <path
                            key={index}
                            d={pathData}
                            fill={deviceColors[index % deviceColors.length]}
                            stroke="#0a0a0a"
                            strokeWidth="2"
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDonutTooltip({
                                visible: true,
                                x: rect.left + rect.width / 2,
                                y: rect.top + rect.height / 2,
                                data: {
                                  device: item.device,
                                  adRequests: item.adRequests,
                                  impressions: item.impressions,
                                  percentage: percentage.toFixed(1),
                                  color: deviceColors[index % deviceColors.length]
                                }
                              });
                            }}
                            onMouseLeave={() => {
                              setDonutTooltip({ visible: false, x: 0, y: 0, data: null });
                            }}
                          />
                        );
                      });
                    })()}
                    
                    {/* Center circle for donut effect */}
                    <circle
                      cx="100"
                      cy="100"
                      r="45"
                      fill="#0a0a0a"
                      stroke="#1f2937"
                      strokeWidth="2"
                    />
                    
                    {/* Center text */}
                    <text
                      x="100"
                      y="95"
                      textAnchor="middle"
                      fill="#9CA3AF"
                      fontSize="12"
                      fontWeight="600"
                    >
                      Avg. Monthly
                    </text>
                    <text
                      x="100"
                      y="110"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="16"
                      fontWeight="700"
                    >
                      {formatNumber(filteredStats.avgAdRequests)}
                    </text>
                  </svg>
                </div>

                {/* Donut Tooltip */}
                {donutTooltip.visible && donutTooltip.data && (
                  <div 
                    className="fixed z-50 pointer-events-none"
                    style={{ 
                      left: `${donutTooltip.x}px`, 
                      top: `${donutTooltip.y}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: donutTooltip.data.color }}
                        ></div>
                        <div className="text-white font-bold text-sm">
                          {donutTooltip.data.device}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-400">Percentage</span>
                          <span className="text-xs text-white font-semibold">{donutTooltip.data.percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-400">Ad Requests</span>
                          <span className="text-xs text-white font-semibold">{formatNumber(donutTooltip.data.adRequests)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-400">Impressions</span>
                          <span className="text-xs text-white font-semibold">{formatNumber(donutTooltip.data.impressions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Legend at bottom - compact grid */}
                <div className="w-full space-y-2">
                  {deviceDataArray.map((item, index) => {
                    const totalRequests = deviceDataArray.reduce((sum, d) => sum + d.adRequests, 0);
                    const percentage = totalRequests > 0 ? ((item.adRequests / totalRequests) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={index} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                          />
                          <span className="text-gray-300 font-semibold text-xs truncate">{item.device}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-white font-bold text-xs">{percentage}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Detailed Inventory Table */}
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>Detailed Inventory</h3>
                </div>
                <div className="flex items-center gap-4 pr-6">
                  {/* Excel Export Icon - Table/Spreadsheet */}
                  <button
                    onClick={exportToExcel}
                    className="group relative"
                    title="Export to Excel (CSV)"
                  >
                    <svg className="w-6 h-6 text-gray-400 hover:text-green-400 transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-700 text-white text-xs px-3 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      Excel (CSV)
                    </span>
                  </button>
                  {/* PDF Export Icon - Document with text */}
                  <button
                    onClick={exportToPDF}
                    className="group relative"
                    title="Export to PDF (Full Report)"
                  >
                    <svg className="w-6 h-6 text-gray-400 hover:text-red-400 transition-colors cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6" />
                    </svg>
                    <span className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-700 text-white text-xs px-3 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      PDF Report
                    </span>
                  </button>
                </div>
              </div>
            </div>
            
            {tableLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-gray-400 text-sm">Loading table data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0a0a0a] border-b border-gray-800">
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors" 
                      style={{ fontFamily: 'Inter, sans-serif' }}
                      onClick={() => setSortConfig({ key: 'ip', direction: sortConfig.key === 'ip' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    >
                      <div className="flex items-center gap-1">
                        IP
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors" 
                      style={{ fontFamily: 'Inter, sans-serif' }}
                      onClick={() => setSortConfig({ key: 'device', direction: sortConfig.key === 'device' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    >
                      <div className="flex items-center gap-1">
                        Device
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors" 
                      style={{ fontFamily: 'Inter, sans-serif' }}
                      onClick={() => setSortConfig({ key: 'avgAdRequests', direction: sortConfig.key === 'avgAdRequests' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg. Monthly Ad Requests
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors" 
                      style={{ fontFamily: 'Inter, sans-serif' }}
                      onClick={() => setSortConfig({ key: 'avgImpressions', direction: sortConfig.key === 'avgImpressions' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg. Monthly Imp. Served
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors" 
                      style={{ fontFamily: 'Inter, sans-serif' }}
                      onClick={() => setSortConfig({ key: 'fillRate', direction: sortConfig.key === 'fillRate' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Fill Rate
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group by IP and Device, calculate avg monthly values
                    const groupedData = {};
                    
                    filteredInventory.forEach(item => {
                      const key = `${item.IP || 'Unknown'}-${item['Device category'] || 'Unknown'}`;
                      if (!groupedData[key]) {
                        groupedData[key] = {
                          ip: item.IP || 'Unknown',
                          device: item['Device category'] || 'Unknown',
                          monthlyData: {}
                        };
                      }
                      
                      const month = item['Month and year'] || 'Unknown';
                      if (!groupedData[key].monthlyData[month]) {
                        groupedData[key].monthlyData[month] = {
                          adRequests: 0,
                          impressions: 0
                        };
                      }
                      
                      groupedData[key].monthlyData[month].adRequests += (item['Total ad requests'] || 0);
                      groupedData[key].monthlyData[month].impressions += (item['Total impressions'] || 0);
                    });
                    
                    // Calculate averages (MIN of monthly totals)
                    const tableData = Object.values(groupedData).map(group => {
                      const monthlyValues = Object.values(group.monthlyData);
                      
                      if (monthlyValues.length === 0) {
                        return {
                          ip: group.ip,
                          device: group.device,
                          avgAdRequests: 0,
                          avgImpressions: 0,
                          fillRate: 0
                        };
                      }
                      
                      const minAdRequests = Math.min(...monthlyValues.map(m => m.adRequests));
                      const minImpressions = Math.min(...monthlyValues.map(m => m.impressions));
                      const totalAdRequests = monthlyValues.reduce((sum, m) => sum + m.adRequests, 0);
                      const totalImpressions = monthlyValues.reduce((sum, m) => sum + m.impressions, 0);
                      const fillRate = totalAdRequests > 0 ? ((totalImpressions / totalAdRequests) * 100).toFixed(1) : 0;
                      
                      return {
                        ip: group.ip,
                        device: group.device,
                        avgAdRequests: Math.round(minAdRequests),
                        avgImpressions: Math.round(minImpressions),
                        fillRate
                      };
                    });
                    
                    // Apply sorting
                    tableData.sort((a, b) => {
                      const { key, direction } = sortConfig;
                      let aVal = a[key];
                      let bVal = b[key];
                      
                      // Handle numeric sorting
                      if (key === 'avgAdRequests' || key === 'avgImpressions' || key === 'fillRate') {
                        aVal = parseFloat(aVal);
                        bVal = parseFloat(bVal);
                        return direction === 'asc' ? aVal - bVal : bVal - aVal;
                      }
                      
                      // Handle string sorting
                      if (direction === 'asc') {
                        return aVal.localeCompare(bVal);
                      } else {
                        return bVal.localeCompare(aVal);
                      }
                    });
                    
                    // Pagination calculations
                    const totalRows = tableData.length;
                    const totalPages = Math.ceil(totalRows / rowsPerPage);
                    const startIndex = (currentPage - 1) * rowsPerPage;
                    const endIndex = startIndex + rowsPerPage;
                    const paginatedData = tableData.slice(startIndex, endIndex);
                    
                    return paginatedData.map((row, index) => {
                      // Determine fill rate color based on value
                      const fillRateValue = parseFloat(row.fillRate);
                      let fillRateColor;
                      if (fillRateValue >= 67) {
                        fillRateColor = '#10B981'; // Green - High fill rate (67-100%)
                      } else if (fillRateValue >= 34) {
                        fillRateColor = '#F97316'; // Orange - Medium fill rate (34-66%)
                      } else {
                        fillRateColor = '#EF4444'; // Red - Low fill rate (0-33%)
                      }
                      
                      return (
                        <tr key={index} className="border-b border-gray-800 hover:bg-[#0f1419] transition-colors">
                          <td className="px-6 py-4 text-sm text-white font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>{row.ip}</td>
                          <td className="px-6 py-4 text-sm text-gray-300" style={{ fontFamily: 'Inter, sans-serif' }}>{row.device}</td>
                          <td className="px-6 py-4 text-sm text-center font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>{row.avgAdRequests.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-center font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>{row.avgImpressions.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-center font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: fillRateColor }}>{row.fillRate}%</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              
              {filteredInventory.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="font-semibold">No data available</p>
                  <p className="text-sm mt-1">Apply filters to view inventory details</p>
                </div>
              )}
              
              {/* Pagination Controls */}
              {filteredInventory.length > 0 && (() => {
                // Calculate pagination info
                const groupedData = {};
                filteredInventory.forEach(item => {
                  const key = `${item.IP || 'Unknown'}-${item['Device category'] || 'Unknown'}`;
                  if (!groupedData[key]) {
                    groupedData[key] = { ip: item.IP, device: item['Device category'], monthlyData: {} };
                  }
                });
                const totalRows = Object.keys(groupedData).length;
                const totalPages = Math.ceil(totalRows / rowsPerPage);
                const startRow = (currentPage - 1) * rowsPerPage + 1;
                const endRow = Math.min(currentPage * rowsPerPage, totalRows);
                
                return (
                  <div className="px-6 py-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0a0a]">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>Rows per page:</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-[#0d1117] border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="ml-4">
                        {startRow}-{endRow} of {totalRows}
                      </span>
                    </div>
                    
                    {/* Page navigation */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-[#0d1117] border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="First page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-[#0d1117] border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-400">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded bg-[#0d1117] border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded bg-[#0d1117] border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Last page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}

export default Site;
