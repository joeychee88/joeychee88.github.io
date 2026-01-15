import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';

function Audience() {
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audience, setAudience] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    personas: [],
    states: []
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [personaSearchQuery, setPersonaSearchQuery] = useState('');
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'TotalAudience', direction: 'desc' }); // Default: Audience High→Low
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [expandedPersonas, setExpandedPersonas] = useState([]);
  const [selectedPersonas, setSelectedPersonas] = useState([]);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [audienceGroups, setAudienceGroups] = useState([]); // Store multiple audience groups
  const [editingGroupId, setEditingGroupId] = useState(null); // Track which group is being edited
  const [modalDemographicFilters, setModalDemographicFilters] = useState({
    race: [],
    generation: [],
    income: []
  });
  const [openDemographicDropdown, setOpenDemographicDropdown] = useState(null);

  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1LN4ADESlgJs-IlqUHX4z3BYxAfF1ej6JOqhLslKuQmc/edit?gid=0#gid=0';

  // Persona categories mapping for auto-complete
  const PERSONA_CATEGORIES = {
    'Entertainment': ['Entertaiment', 'Comedy Lover', 'Horror', 'Romantic Comedy', 'Action & Adventure', 'Animation', 'Sci-Fi & Fantasy', 'Music & Concert Goers'],
    'Sports': ['Sports', 'EPL Super Fans', 'Badminton', 'Golf Fans', 'Sepak Takraw', 'Esports Fan'],
    'Lifestyle': ['Active Lifestyle Seekers', 'Adventure Enthuasiasts', 'Health & Wellness Shoppers', 'Foodies', 'Travel & Experience Seekers', 'Fashion Icons'],
    'Technology': ['Tech & Gadget Enthuasiasts', 'Gadget Gurus', 'Online Shoppers'],
    'Automotive': ['Automative Ethuasiasts', 'Automative Intent'],
    'Business': ['Business & Professional', 'Corporate Visionaries', 'SME', 'Start-ups', 'Emerging Affluents'],
    'Luxury': ['Luxury Buyers', 'Luxury Seekers'],
    'Family': ['Family Dynamic ( Experienced Family )', 'Little Steps Advocates ( Young Family)', 'Mommy Pros ( Experienced Mother)', 'Youth Mom', 'The Dynamic Duo'],
    'Life Stage': ['Students', 'Young Working Adult', 'Soloist'],
    'Home & Living': ['Home Buyers', 'Eco Enthuasiasts']
  };

  // Demographic personas (Zero overlap rule - Tier 1)
  const DEMOGRAPHIC_PERSONAS = {
    'Race': ['Malay', 'Chinese', 'Indian'],
    'Income': ['B40 (Bottom 40%)', 'M40 (Middle 40%)', 'T20 (Top 20%)'],
    'Generation': ['Generation Z (Gen Z)', 'Millennials (Gen Y)', 'Generation X (Gen X)', 'Baby Boomers'],
    'Age': [] // Age groups - add if available
  };

  // Malaysia Population Demographics (as percentages for filtering)
  const MALAYSIA_DEMOGRAPHICS = {
    'Race': {
      'Malay': 0.697,      // 69.7% of Malaysian population
      'Chinese': 0.228,    // 22.8% of Malaysian population
      'Indian': 0.067,     // 6.7% of Malaysian population
      'Other': 0.008       // 0.8% (Others)
    },
    'Generation': {
      'Generation Z (Gen Z)': 0.254,      // ~25.4% (Born 1997-2012, ages 12-27)
      'Millennials (Gen Y)': 0.303,       // ~30.3% (Born 1981-1996, ages 28-43)
      'Generation X (Gen X)': 0.245,      // ~24.5% (Born 1965-1980, ages 44-59)
      'Baby Boomers': 0.198               // ~19.8% (Born 1946-1964, ages 60+)
    },
    'Income': {
      'B40 (Bottom 40%)': 0.40,   // Bottom 40% income group
      'M40 (Middle 40%)': 0.40,   // Middle 40% income group
      'T20 (Top 20%)': 0.20       // Top 20% income group
    }
  };

  // Affinity Matrix - Overlap factors for non-demographic personas (Tier 2)
  const AFFINITY_MATRIX = {
    // Same content cluster
    'Entertainment-Entertainment': 0.75,
    'Sports-Sports': 0.75,
    
    // Same behaviour cluster
    'Lifestyle-Lifestyle': 0.60,
    'Technology-Technology': 0.60,
    
    // Same demographic-aligned behaviour
    'Sports-Lifestyle': 0.55,
    
    // Same tier cluster
    'Business-Luxury': 0.45,
    'Luxury-Business': 0.45,
    
    // Cross-cluster related
    'Entertainment-Technology': 0.30,
    'Technology-Entertainment': 0.30,
    'Lifestyle-Technology': 0.30,
    'Technology-Lifestyle': 0.30,
    
    // Default cross-cluster unrelated
    'default': 0.20
  };

  // Persona descriptions
  const PERSONA_DESCRIPTIONS = {
    'Comedy Lover': 'Seek laughter, light-hearted entertainment, enjoy witty dialogue and humor, use comedy to unwind. They gravitate to films, stand-up, satire and social commentary.',
    'Romantic Comedy': 'Enjoy heartwarming love stories, humor, escapism and optimistic narratives about relationships across classic and modern rom-coms.',
    'Animation': 'Drawn to visually captivating storytelling, emotional depth and family-friendly content. Appreciate variety from CGI to stop-motion and family bonding via animation.',
    'Start-ups': 'Ambitious and driven individuals building ventures across diverse industries. They value brand identity, digital presence, learning and adaptability.',
    'Emerging Affluents': 'Aim to enhance lifestyle through better homes, travel and luxury. Seek balance between financial responsibility and indulgence.',
    'Students': 'Lower income group working multiple jobs, tech-savvy despite constraints. Prioritize affordability and cost-effective content and lifestyle decisions.',
    'Young Working Adult': 'Digital-native generation valuing authenticity, instant connectivity and self-expression. They are financially cautious but entrepreneurial.',
    'Action & Adventure': 'Seek thrilling and high-energy entertainment, intense storylines, immersive cinematic experiences and strong visual narratives.',
    'Music & Concert Goers': 'Value immersive live events and exclusive performances. Music is self-expression and social identity, with strong interest in VIP access and discovery.',
    'Online Shoppers': 'Use digital platforms to discover products, read reviews and compare options. Influenced by social content, influencers, and promotions.',
    'Horror': 'Follow horror media across platforms, engage in deep thematic discussions and behind-the-scenes content, and enjoy analyzing fear and symbolism.',
    'Active Lifestyle Seekers': 'Health-conscious individuals who prioritize fitness, outdoor activities and balanced living. Seek products and experiences that support active lifestyles.',
    'Foodies': 'Passionate about culinary experiences, discovering new restaurants, and exploring diverse cuisines. Share food experiences on social media.',
    'Sports': 'Avid followers of various sports, attend live events, and engage with sports content regularly. Value athletic performance and team loyalty.',
    'EPL Super Fans': 'Dedicated English Premier League followers who watch every match, follow team news, and engage in football discussions passionately.',
    'Badminton': 'Enthusiasts of badminton as players or spectators. Follow tournaments, players, and engage with badminton community.',
    'Tech & Gadget Enthuasiasts': 'Early adopters of technology, follow latest gadget releases, and value innovation. Stay updated on tech trends and reviews.',
    'Gadget Gurus': 'Expert-level technology users who deeply understand specifications, compare products, and influence others\' tech purchasing decisions.',
    'Automative Ethuasiasts': 'Car enthusiasts who follow automotive news, appreciate vehicle design, performance, and enjoy driving experiences.',
    'Automative Intent': 'Active car buyers researching vehicles, comparing models, and planning automotive purchases in near future.',
    'Business & Professional': 'Career-focused professionals seeking growth, networking, and business insights. Value professional development and industry knowledge.',
    'Corporate Visionaries': 'Senior business leaders and decision-makers who drive organizational strategy, innovation, and corporate transformation.',
    'SME': 'Small and medium enterprise owners balancing multiple business roles, seeking practical solutions and growth strategies.',
    'Luxury Buyers': 'High-net-worth individuals making premium purchases, valuing exclusivity, quality craftsmanship, and prestigious brands.',
    'Luxury Seekers': 'Aspirational consumers attracted to luxury lifestyle, premium experiences, and high-end products.',
    'Health & Wellness Shoppers': 'Consumers prioritizing health products, organic options, supplements, and wellness services for better living.',
    'Travel & Experience Seekers': 'Adventure travelers seeking unique destinations, cultural experiences, and memorable journeys over material possessions.',
    'Fashion Icons': 'Style-conscious individuals following fashion trends, designer collections, and expressing identity through clothing.',
    'Family Dynamic ( Experienced Family )': 'Established families with older children, balancing multiple needs, and seeking family-oriented products and services.',
    'Little Steps Advocates ( Young Family)': 'New parents with young children, learning parenting skills, and seeking child development resources.',
    'Mommy Pros ( Experienced Mother)': 'Experienced mothers confident in parenting, sharing advice, and seeking advanced parenting solutions.',
    'Youth Mom': 'Young mothers navigating early parenthood, seeking support, community, and practical parenting guidance.',
    'The Dynamic Duo': 'Couples without children, dual-income households focusing on career, relationship, and lifestyle experiences.',
    'Soloist': 'Single individuals prioritizing personal growth, independence, and self-fulfillment in various life aspects.',
    'Home Buyers': 'Active property seekers researching real estate, comparing locations, and planning home purchases.',
    'Eco Enthuasiasts': 'Environmentally conscious consumers choosing sustainable products, supporting green initiatives, and reducing environmental impact.',
    'Sci-Fi & Fantasy': 'Fans of science fiction and fantasy genres, engaging with complex narratives, world-building, and speculative content.',
    'Golf Fans': 'Golf enthusiasts who play regularly or follow professional tournaments, appreciating the sport\'s strategy and tradition.',
    'Sepak Takraw': 'Fans of this Southeast Asian sport, following local tournaments and supporting national teams.',
    'Esports Fan': 'Competitive gaming enthusiasts following esports tournaments, professional players, and gaming community culture.',
    'Adventure Enthuasiasts': 'Thrill-seekers pursuing outdoor adventures, extreme sports, and challenging physical activities.',
    'Entertaiment': 'General entertainment consumers seeking diverse content across multiple platforms and genres for leisure and relaxation.'
  };

  useEffect(() => {
    fetchAudienceData();
    loadSavedAudienceGroups(); // Load user's saved groups on mount
  }, []);

  // API Functions for Audience Groups
  const API_BASE_URL = '/api'; // Use relative path for proxy
  const USER_ID = '1'; // In production, this would come from auth context

  const loadSavedAudienceGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/audience-groups?userId=${USER_ID}`);
      if (response.data.success) {
        setAudienceGroups(response.data.data);
        console.log(`Loaded ${response.data.count} saved audience groups`);
      }
    } catch (error) {
      console.error('Error loading audience groups:', error);
      // Don't show error to user - just start with empty groups
    }
  };

  const saveAudienceGroup = async (groupData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/audience-groups?userId=${USER_ID}`,
        groupData
      );
      if (response.data.success) {
        console.log('Audience group saved:', response.data.data);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error saving audience group:', error);
      throw error;
    }
  };

  const updateAudienceGroup = async (groupId, updateData) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/audience-groups/${groupId}?userId=${USER_ID}`,
        updateData
      );
      if (response.data.success) {
        console.log('Audience group updated:', response.data.data);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error updating audience group:', error);
      throw error;
    }
  };

  const deleteAudienceGroup = async (groupId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/audience-groups/${groupId}?userId=${USER_ID}`
      );
      if (response.data.success) {
        console.log('Audience group deleted');
        return true;
      }
    } catch (error) {
      console.error('Error deleting audience group:', error);
      throw error;
    }
  };

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

  // Close demographic dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDemographicDropdown && !event.target.closest('.demographic-filter-dropdown')) {
        setOpenDemographicDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDemographicDropdown]);

  const fetchAudienceData = async () => {
    try {
      setLoading(true);
      setTableLoading(true);
      setError(null);
      
      const response = await axios.get('/api/audience');
      
      if (response.data.success) {
        const data = response.data.data || [];
        setAudience(data);
        setHeaders(response.data.headers || []);
        
        // Allow UI to render filters first
        setLoading(false);
        
        // Delay table rendering slightly
        setTimeout(() => {
          setTableLoading(false);
        }, 100);
      } else {
        throw new Error('Failed to fetch audience data');
      }
    } catch (err) {
      console.error('Error fetching audience:', err);
      setError(err.response?.data?.error || 'Failed to load audience data. Please try again.');
      setLoading(false);
      setTableLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      await axios.post('/api/audience/refresh');
      await fetchAudienceData();
    } catch (err) {
      console.error('Error refreshing audience:', err);
      setRefreshing(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    // Remove commas from string numbers
    const cleanNum = typeof num === 'string' ? parseInt(num.replace(/,/g, '')) : num;
    
    if (cleanNum >= 1000000) {
      return (cleanNum / 1000000).toFixed(1) + 'M';
    } else if (cleanNum >= 1000) {
      return (cleanNum / 1000).toFixed(1) + 'K';
    }
    return cleanNum.toLocaleString();
  };

  // Get unique filter options
  const getUniquePersonas = () => {
    if (!audience.length) return [];
    const values = [...new Set(audience.map(item => item.Personas).filter(v => v))];
    return values.sort();
  };

  // Get category for a persona
  const getPersonaCategory = (persona) => {
    for (const [category, personas] of Object.entries(PERSONA_CATEGORIES)) {
      if (personas.includes(persona)) {
        return category;
      }
    }
    return null;
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      'Entertainment': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'Sports': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Lifestyle': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Technology': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Automotive': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Business': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Luxury': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Family': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      'Life Stage': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'Home & Living': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Get category text color only (for persona titles)
  const getCategoryTextColor = (category) => {
    const colors = {
      'Entertainment': 'text-cyan-400',
      'Sports': 'text-green-400',
      'Lifestyle': 'text-purple-400',
      'Technology': 'text-blue-400',
      'Automotive': 'text-orange-400',
      'Business': 'text-pink-400',
      'Luxury': 'text-yellow-400',
      'Family': 'text-rose-400',
      'Life Stage': 'text-indigo-400',
      'Home & Living': 'text-emerald-400'
    };
    return colors[category] || 'text-gray-400';
  };

  // Get state columns (all columns except Personas)
  const getStateColumns = () => {
    if (!headers.length) return [];
    return headers.filter(h => h !== 'Personas');
  };

  // Handle multi-select checkbox toggle with auto-complete for related personas
  const toggleFilterValue = (filterKey, value) => {
    setFilters(prev => {
      const currentValues = prev[filterKey];
      
      if (filterKey === 'personas') {
        // Check if this persona is being added (not removed)
        const isAdding = !currentValues.includes(value);
        
        if (isAdding) {
          // Find the category this persona belongs to
          const category = Object.keys(PERSONA_CATEGORIES).find(cat => 
            PERSONA_CATEGORIES[cat].includes(value)
          );
          
          if (category) {
            // Get all personas in this category
            const relatedPersonas = PERSONA_CATEGORIES[category];
            // Add all related personas that exist in the data
            const allPersonas = [...new Set([...currentValues, value, ...relatedPersonas])];
            return { ...prev, [filterKey]: allPersonas };
          }
        }
        
        // If removing, just remove the one value
        if (!isAdding) {
          return { ...prev, [filterKey]: currentValues.filter(v => v !== value) };
        }
      }
      
      // Default behavior for other filters
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  };

  // Select all values for a filter
  const selectAllFilterValues = (filterKey, options) => {
    setFilters(prev => ({ ...prev, [filterKey]: options }));
  };

  // Calculate filtered data
  const filteredAudience = audience.filter(item => {
    if (filters.personas.length > 0 && !filters.personas.includes(item.Personas)) return false;
    return true;
  });

  // Apply sorting to filtered audience for tile display
  const sortedFilteredAudience = [...filteredAudience].sort((a, b) => {
    // Special handling for audience size sorting
    if (sortConfig.key === 'audience') {
      const stateColumns = getStateColumns();
      
      // Calculate total audience for persona A
      let aTotal = 0;
      stateColumns.forEach(state => {
        const val = a[state];
        if (val && typeof val === 'string') {
          aTotal += parseInt(val.replace(/,/g, '')) || 0;
        } else if (typeof val === 'number') {
          aTotal += val;
        }
      });
      
      // Calculate total audience for persona B
      let bTotal = 0;
      stateColumns.forEach(state => {
        const val = b[state];
        if (val && typeof val === 'string') {
          bTotal += parseInt(val.replace(/,/g, '')) || 0;
        } else if (typeof val === 'number') {
          bTotal += val;
        }
      });
      
      return sortConfig.direction === 'asc' ? aTotal - bTotal : bTotal - aTotal;
    }
    
    // Handle alphabetical sorting by Personas name (default)
    if (sortConfig.key === 'Personas') {
      const aVal = a.Personas || '';
      const bVal = b.Personas || '';
      return sortConfig.direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return 0;
  });

  // Calculate statistics
  const calculateStats = () => {
    if (!filteredAudience.length) return { totalPersonas: 0, totalAudience: 0, avgPerState: 0 };
    
    const stateColumns = getStateColumns();
    const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
    
    let totalAudience = 0;
    filteredAudience.forEach(persona => {
      selectedStates.forEach(state => {
        const value = persona[state];
        const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
        totalAudience += numValue || 0;
      });
    });
    
    const avgPerState = selectedStates.length > 0 ? totalAudience / selectedStates.length : 0;
    
    return {
      totalPersonas: filteredAudience.length,
      totalAudience: totalAudience,
      avgPerState: Math.round(avgPerState)
    };
  };

  const stats = calculateStats();

  // Prepare data for display (transpose if states filter is active)
  const displayData = () => {
    const stateColumns = getStateColumns();
    const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
    
    // If states filter is active, show state-centric view
    if (filters.states.length > 0) {
      return selectedStates.map(state => {
        const stateData = { state: state };
        filteredAudience.forEach(persona => {
          stateData[persona.Personas] = persona[state];
        });
        return stateData;
      });
    }
    
    // Default: show persona-centric view
    return filteredAudience.map(persona => {
      const row = { Personas: persona.Personas };
      selectedStates.forEach(state => {
        row[state] = persona[state];
      });
      return row;
    });
  };

  // Get display headers
  const getDisplayHeaders = () => {
    const stateColumns = getStateColumns();
    const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
    
    if (filters.states.length > 0) {
      // State-centric view: State column + Persona columns
      return ['State', ...filteredAudience.map(p => p.Personas)];
    }
    
    // Default: Personas column + State columns
    return ['Personas', ...selectedStates];
  };

  // Sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedData = () => {
    const data = displayData();
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      // Special handling for audience size sorting
      if (sortConfig.key === 'audience') {
        const stateColumns = getStateColumns();
        
        // Calculate total audience for persona A
        let aTotal = 0;
        stateColumns.forEach(state => {
          const val = a[state];
          if (val && typeof val === 'string') {
            aTotal += parseInt(val.replace(/,/g, '')) || 0;
          } else if (typeof val === 'number') {
            aTotal += val;
          }
        });
        
        // Calculate total audience for persona B
        let bTotal = 0;
        stateColumns.forEach(state => {
          const val = b[state];
          if (val && typeof val === 'string') {
            bTotal += parseInt(val.replace(/,/g, '')) || 0;
          } else if (typeof val === 'number') {
            bTotal += val;
          }
        });
        
        return sortConfig.direction === 'asc' ? aTotal - bTotal : bTotal - aTotal;
      }
      
      // Handle alphabetical sorting by Personas name
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle numeric values (with commas)
      if (typeof aVal === 'string' && aVal.includes(',')) {
        aVal = parseInt(aVal.replace(/,/g, ''));
        bVal = parseInt(bVal.replace(/,/g, ''));
      }
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  // Pagination
  const paginatedData = () => {
    const sorted = sortedData();
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(sortedData().length / rowsPerPage);

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const data = sortedData();
    const displayHeaders = getDisplayHeaders();
    
    const csvContent = [
      displayHeaders.join(','),
      ...data.map(row => 
        displayHeaders.map(header => {
          const value = row[header] || row[header.toLowerCase()] || row.state || '';
          return `"${value}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `KULT_Audience_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if persona is demographic (Tier 1 - Zero overlap)
  const isDemographicPersona = (persona) => {
    return Object.values(DEMOGRAPHIC_PERSONAS).flat().includes(persona);
  };

  // Get overlap factor between two personas
  const getOverlapFactor = (persona1, persona2) => {
    // Check if both are demographic personas - ZERO overlap
    if (isDemographicPersona(persona1) && isDemographicPersona(persona2)) {
      return 0.00;
    }

    // Check if one is demographic and one isn't - minimal overlap
    if (isDemographicPersona(persona1) || isDemographicPersona(persona2)) {
      return 0.10;
    }

    // Both are non-demographic - use affinity matrix
    const cat1 = getPersonaCategory(persona1);
    const cat2 = getPersonaCategory(persona2);

    // Same category - high overlap
    if (cat1 === cat2) {
      const key = `${cat1}-${cat2}`;
      return AFFINITY_MATRIX[key] || 0.75;
    }

    // Different categories - check matrix
    const key1 = `${cat1}-${cat2}`;
    const key2 = `${cat2}-${cat1}`;
    
    return AFFINITY_MATRIX[key1] || AFFINITY_MATRIX[key2] || AFFINITY_MATRIX['default'];
  };

  // Calculate overlap estimation with demographic filters
  const calculateOverlapEstimation = () => {
    // Calculate demographic multiplier based on Malaysia population
    let demographicMultiplier = 1.0;
    
    // Apply Race filter (use combined percentage if multiple races selected)
    if (modalDemographicFilters.race.length > 0) {
      const raceMultiplier = modalDemographicFilters.race.reduce((sum, race) => {
        return sum + (MALAYSIA_DEMOGRAPHICS.Race[race] || 0);
      }, 0);
      demographicMultiplier *= raceMultiplier;
    }
    
    // Apply Generation filter (use combined percentage if multiple generations selected)
    if (modalDemographicFilters.generation.length > 0) {
      const generationMultiplier = modalDemographicFilters.generation.reduce((sum, gen) => {
        return sum + (MALAYSIA_DEMOGRAPHICS.Generation[gen] || 0);
      }, 0);
      demographicMultiplier *= generationMultiplier;
    }
    
    // Apply Income filter (use combined percentage if multiple income groups selected)
    if (modalDemographicFilters.income.length > 0) {
      const incomeMultiplier = modalDemographicFilters.income.reduce((sum, income) => {
        return sum + (MALAYSIA_DEMOGRAPHICS.Income[income] || 0);
      }, 0);
      demographicMultiplier *= incomeMultiplier;
    }

    // Calculate segments from selected personas (NOT including demographic filters as segments)
    const segments = selectedPersonas.map(personaName => {
      const personaData = filteredAudience.find(p => p.Personas === personaName);
      if (!personaData) return null;

      const stateColumns = getStateColumns();
      const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
      
      let total = 0;
      selectedStates.forEach(state => {
        const value = personaData[state];
        const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : (value || 0);
        total += numValue;
      });

      // Apply demographic multiplier to each persona's audience
      const filteredTotal = Math.round(total * demographicMultiplier);

      return {
        name: personaName,
        audience: filteredTotal,
        originalAudience: total,
        category: getPersonaCategory(personaName),
        isDemographic: isDemographicPersona(personaName)
      };
    }).filter(Boolean);

    // Calculate pairwise overlaps
    let totalOverlapFactor = 0;
    let pairCount = 0;

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const factor = getOverlapFactor(segments[i].name, segments[j].name);
        totalOverlapFactor += factor;
        pairCount++;
      }
    }

    const totalRawAudience = segments.reduce((sum, s) => sum + s.audience, 0);
    
    // Handle single persona case (no overlap calculation needed)
    if (selectedPersonas.length === 1) {
      return {
        overlapFactor: 0,
        estimatedOverlap: 0,
        uniqueCombined: totalRawAudience, // Same as total for single persona
        segments,
        totalAudience: segments[0]?.originalAudience || 0, // Show original total
        demographicMultiplier
      };
    }

    // Handle multiple personas case (calculate overlap)
    const avgOverlapFactor = pairCount > 0 ? totalOverlapFactor / pairCount : 0;
    const estimatedOverlap = Math.round(totalRawAudience * avgOverlapFactor);
    const uniqueCombined = totalRawAudience - estimatedOverlap;

    return {
      overlapFactor: avgOverlapFactor,
      estimatedOverlap,
      uniqueCombined,
      segments,
      totalAudience: totalRawAudience,
      demographicMultiplier
    };
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a]">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0f0f0f] px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-cyan-400 font-black mb-2 tracking-wider uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                [ ADMIN / AUDIENCE MANAGEMENT ]
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Audience Estimation</h1>
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

        {/* Loading Skeleton for Stats and Filters */}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#0f1419] border border-gray-800 rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
                  <div className="h-8 bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-10 bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Active Filters Bar */}
            {(filters.personas.length > 0 || filters.states.length > 0 || selectedPersonas.length > 0) && (
              <div className="border border-cyan-500/30 rounded-lg p-3 mb-6 bg-[#0a0a0a]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Active Filters:
                    </span>
                    {personaSearchQuery && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Search: "{personaSearchQuery}"
                      </span>
                    )}
                    {selectedPersonas.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {selectedPersonas.length} Personas
                      </span>
                    )}
                    {filters.states.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {filters.states.length} States
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setFilters({ personas: [], states: [] });
                      setPersonaSearchQuery('');
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Filter Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Personas Multi-Select Filter */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 relative">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                    SEARCH BY PERSONA
                  </label>
                  <button
                    onClick={() => {
                      if (openDropdown === 'personas') {
                        setOpenDropdown(null);
                        setPersonaSearchQuery('');
                      } else {
                        setOpenDropdown('personas');
                        setPersonaSearchQuery('');
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                  >
                    <span>{filters.personas.length > 0 ? `${filters.personas.length} personas selected` : 'Select Persona...'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'personas' && (
                    <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-96 overflow-hidden">
                      {/* Search Input */}
                      <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2">
                        <input
                          type="text"
                          placeholder="Search Persona..."
                          value={personaSearchQuery}
                          onChange={(e) => setPersonaSearchQuery(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#161b22] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                      </div>
                      {/* Info Banner */}
                      <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-3 py-2">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-cyan-300">
                            <span className="font-semibold">Auto-complete:</span> Selecting a persona automatically includes related personas in the same category
                          </p>
                        </div>
                      </div>
                      {/* Action Buttons */}
                      <div className="sticky top-[52px] bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                        <button
                          onClick={() => {
                            const filteredOptions = getUniquePersonas().filter(val => 
                              val.toLowerCase().includes(personaSearchQuery.toLowerCase())
                            );
                            selectAllFilterValues('personas', filteredOptions);
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, personas: [] }))}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                      {/* Options List */}
                      <div className="p-2 max-h-60 overflow-y-auto">
                        {getUniquePersonas()
                          .filter(val => val.toLowerCase().includes(personaSearchQuery.toLowerCase()))
                          .map(val => {
                            const category = getPersonaCategory(val);
                            return (
                              <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={filters.personas.includes(val)}
                                  onChange={() => toggleFilterValue('personas', val)}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-sm text-white">{val}</span>
                                  {category && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(category)} transition-opacity opacity-60 group-hover:opacity-100`}>
                                      {category}
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        {getUniquePersonas().filter(val => val.toLowerCase().includes(personaSearchQuery.toLowerCase())).length === 0 && (
                          <div className="text-sm text-gray-500 text-center py-2">No personas found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* States Multi-Select Filter */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4 relative">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                    FILTER BY STATES (MULTI-SELECT)
                  </label>
                  <button
                    onClick={() => {
                      if (openDropdown === 'states') {
                        setOpenDropdown(null);
                      } else {
                        setOpenDropdown('states');
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white text-left focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                  >
                    <span>{filters.states.length > 0 ? `${filters.states.length} states selected` : 'Select states...'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'states' && (
                    <div className="absolute z-50 mt-1 w-full bg-[#0a0a0a] border border-gray-700 rounded shadow-lg">
                      {/* Search Input */}
                      <div className="sticky top-0 bg-[#0a0a0a] border-b border-gray-700 p-2">
                        <input
                          type="text"
                          placeholder="Search states..."
                          value={stateSearchQuery}
                          onChange={(e) => setStateSearchQuery(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#161b22] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                      </div>
                      {/* Action Buttons */}
                      <div className="sticky top-[52px] bg-[#0a0a0a] border-b border-gray-700 p-2 flex justify-between">
                        <button
                          onClick={() => {
                            const filteredOptions = getStateColumns().filter(val => 
                              val.toLowerCase().includes(stateSearchQuery.toLowerCase())
                            );
                            selectAllFilterValues('states', filteredOptions);
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, states: [] }))}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                      {/* Options List */}
                      <div className="p-2 max-h-60 overflow-y-auto">
                        {getStateColumns()
                          .filter(val => val.toLowerCase().includes(stateSearchQuery.toLowerCase()))
                          .map(val => (
                            <label key={val} className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-800 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.states.includes(val)}
                                onChange={() => toggleFilterValue('states', val)}
                                className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                              />
                              <span className="text-sm text-white">{val}</span>
                            </label>
                          ))}
                        {getStateColumns().filter(val => val.toLowerCase().includes(stateSearchQuery.toLowerCase())).length === 0 && (
                          <div className="text-sm text-gray-500 text-center py-2">No states found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort By */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                    SORT BY
                  </label>
                  <select
                    value={`${sortConfig.key}-${sortConfig.direction}`}
                    onChange={(e) => {
                      const [key, direction] = e.target.value.split('-');
                      setSortConfig({ key, direction });
                    }}
                    className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <option value="audience-desc">Audience: High to Low</option>
                    <option value="audience-asc">Audience: Low to High</option>
                    <option value="Personas-asc">Alphabet: A-Z</option>
                    <option value="Personas-desc">Alphabet: Z-A</option>
                  </select>
                </div>
            </div>

            {/* Results Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Audience Segments - Left Panel (2/3 width) */}
              <div className="lg:col-span-2 bg-[#0f1419] border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Audience Segments ({filteredAudience.length})
                </h3>
                {filters.personas.length > 0 && (
                  <div className="mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Category: {getPersonaCategory(filters.personas[0]) || 'Mixed'}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Showing all related segments</p>
                  </div>
                )}
                
                {/* Collapsible Persona Tiles - Show all without scrollbar */}
                <div className="space-y-2">
                  {sortedFilteredAudience.map((persona) => {
                    const isExpanded = expandedPersonas.includes(persona.Personas);
                    const isSelected = selectedPersonas.includes(persona.Personas);
                    const category = getPersonaCategory(persona.Personas);
                    const stateColumns = getStateColumns();
                    
                    // Calculate total audience across selected states (or all if none selected)
                    const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
                    const totalAudience = selectedStates.reduce((sum, state) => {
                      const value = persona[state];
                      const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : (parseFloat(value) || 0);
                      return sum + numValue;
                    }, 0);
                    
                    return (
                      <div key={persona.id} className="border border-gray-700 rounded-lg overflow-hidden">
                        {/* Tile Header */}
                        <div className="w-full px-4 py-3 bg-[#0a0a0a] hover:bg-gray-800 transition-colors flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {/* Checkbox at persona level */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedPersonas(prev => 
                                  prev.includes(persona.Personas)
                                    ? prev.filter(p => p !== persona.Personas)
                                    : [...prev, persona.Personas]
                                );
                              }}
                              className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500"
                            />
                            <div className="text-left flex-1">
                              <div className={`text-sm font-medium ${getCategoryTextColor(category)}`}>{persona.Personas}</div>
                              <div className="text-xs font-bold text-white mt-1">
                                Audience Size: {formatNumber(totalAudience)}
                              </div>
                              {PERSONA_DESCRIPTIONS[persona.Personas] && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                  {PERSONA_DESCRIPTIONS[persona.Personas]}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Collapse arrow at the end */}
                          <button
                            onClick={() => {
                              setExpandedPersonas(prev => 
                                prev.includes(persona.Personas)
                                  ? prev.filter(p => p !== persona.Personas)
                                  : [...prev, persona.Personas]
                              );
                            }}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Expandable State List - Without checkboxes */}
                        {isExpanded && (
                          <div className="bg-[#161b22] border-t border-gray-700">
                            <div className="p-3 space-y-2">
                              {stateColumns.map(state => {
                                const value = persona[state];
                                
                                return (
                                  <div 
                                    key={state} 
                                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-800 rounded"
                                  >
                                    <span className="text-sm text-gray-300">{state}</span>
                                    <span className="text-sm font-medium text-cyan-400">
                                      {formatNumber(value)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {filteredAudience.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No audience segments found</p>
                      <p className="text-xs mt-1">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - State Distribution, Audience Summary, Selected Segments */}
              <div className="lg:col-span-1 space-y-6">
                {/* State Distribution */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                  <h3 className="text-base font-bold text-white mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                    State Distribution
                  </h3>
                
                {(() => {
                    // Calculate aggregated state data across all selected personas (or all personas if none selected)
                    const stateColumns = getStateColumns();
                    // Use filtered states if any are selected, otherwise use all states
                    const selectedStates = filters.states.length > 0 ? filters.states : stateColumns;
                    const aggregatedData = {};
                    let grandTotal = 0;
                    
                    // Use selected personas, or all filtered personas if none selected
                    const personasToAggregate = selectedPersonas.length > 0 
                      ? selectedPersonas 
                      : filteredAudience.map(p => p.Personas);
                    
                    personasToAggregate.forEach(personaName => {
                      const personaData = filteredAudience.find(p => p.Personas === personaName);
                      if (personaData) {
                        selectedStates.forEach(state => {
                          const value = personaData[state];
                          const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : (value || 0);
                          aggregatedData[state] = (aggregatedData[state] || 0) + numValue;
                          grandTotal += numValue;
                        });
                      }
                    });
                    
                    // Sort states by value (descending)
                    // If states are filtered, show all filtered states (up to 5)
                    // Otherwise, show top 5 states
                    const allSortedStates = Object.entries(aggregatedData)
                      .sort((a, b) => b[1] - a[1]);
                    
                    const sortedStates = filters.states.length > 0 && filters.states.length <= 5
                      ? allSortedStates // Show all filtered states if 5 or fewer
                      : allSortedStates.slice(0, 5); // Otherwise show top 5
                    
                    // Calculate "Others" category (only if there are more states than shown)
                    const topTotal = sortedStates.reduce((sum, [, val]) => sum + val, 0);
                    const othersTotal = grandTotal - topTotal;
                    
                    // Prepare data for donut chart with colors
                    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#6b7280'];
                    const chartData = [
                      ...sortedStates.map(([state, value], idx) => ({
                        state,
                        value,
                        percentage: ((value / grandTotal) * 100).toFixed(1),
                        color: colors[idx]
                      })),
                      ...(othersTotal > 0 ? [{
                        state: 'Others',
                        value: othersTotal,
                        percentage: ((othersTotal / grandTotal) * 100).toFixed(1),
                        color: colors[5]
                      }] : [])
                    ];
                    
                    // Calculate SVG paths for donut chart (30% larger)
                    const radius = 91; // 70 * 1.3 = 91
                    const strokeWidth = 36; // 28 * 1.3 ≈ 36
                    const circumference = 2 * Math.PI * radius;
                    let currentAngle = -90; // Start from top
                    
                    return (
                      <div className="space-y-4">
                        <p className="text-xs text-gray-400">
                          {selectedPersonas.length > 0 
                            ? `Selected ${selectedPersonas.length} persona(s)` 
                            : `All ${filteredAudience.length} personas`}
                        </p>
                        
                        {/* Donut Chart */}
                        <div className="flex justify-center mb-3 relative">
                          <svg width="240" height="240" viewBox="0 0 240 240">
                            {/* Donut segments */}
                            <g className="transform -rotate-90" style={{ transformOrigin: '120px 120px' }}>
                              {chartData.map((item, idx) => {
                                const angle = (item.value / grandTotal) * 360;
                                const startAngle = currentAngle;
                                const endAngle = currentAngle + angle;
                                
                                // Special handling for full circle (100%)
                                if (angle >= 359.9) {
                                  const innerRadius = radius - strokeWidth;
                                  currentAngle = endAngle;
                                  
                                  return (
                                    <g 
                                      key={idx}
                                      onMouseEnter={() => setHoveredSegment(item)}
                                      onMouseLeave={() => setHoveredSegment(null)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {/* Outer circle */}
                                      <circle
                                        cx="120"
                                        cy="120"
                                        r={radius}
                                        fill="none"
                                        stroke={item.color}
                                        strokeWidth={strokeWidth}
                                        className="hover:opacity-80 transition-opacity"
                                      />
                                      {/* Inner circle to create donut effect */}
                                      <circle
                                        cx="120"
                                        cy="120"
                                        r={innerRadius}
                                        fill="#0f1419"
                                      />
                                    </g>
                                  );
                                }
                                
                                // Convert angles to radians
                                const startRad = (startAngle * Math.PI) / 180;
                                const endRad = (endAngle * Math.PI) / 180;
                                
                                // Calculate path coordinates
                                const innerRadius = radius - strokeWidth;
                                const x1 = 120 + radius * Math.cos(startRad);
                                const y1 = 120 + radius * Math.sin(startRad);
                                const x2 = 120 + radius * Math.cos(endRad);
                                const y2 = 120 + radius * Math.sin(endRad);
                                const x3 = 120 + innerRadius * Math.cos(endRad);
                                const y3 = 120 + innerRadius * Math.sin(endRad);
                                const x4 = 120 + innerRadius * Math.cos(startRad);
                                const y4 = 120 + innerRadius * Math.sin(startRad);
                                
                                const largeArc = angle > 180 ? 1 : 0;
                                
                                const path = `
                                  M ${x1} ${y1}
                                  A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
                                  L ${x3} ${y3}
                                  A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
                                  Z
                                `;
                                
                                currentAngle = endAngle;
                                
                                return (
                                  <path
                                    key={idx}
                                    d={path}
                                    fill={item.color}
                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                    onMouseEnter={() => setHoveredSegment(item)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                  />
                                );
                              })}
                            </g>
                            
                            {/* Total Audience in center */}
                            <g>
                              <text
                                x="120"
                                y="108"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-xs fill-gray-400"
                                style={{ pointerEvents: 'none' }}
                              >
                                Total Audience
                              </text>
                              <text
                                x="120"
                                y="132"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="text-2xl font-bold fill-cyan-400"
                                style={{ pointerEvents: 'none' }}
                              >
                                {formatNumber(grandTotal)}
                              </text>
                            </g>
                          </svg>
                          
                          {/* Tooltip on hover */}
                          {hoveredSegment && (
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-xs whitespace-nowrap z-10 pointer-events-none">
                              <div className="font-semibold">{hoveredSegment.state}</div>
                              <div className="text-gray-300">{hoveredSegment.percentage}% ({formatNumber(hoveredSegment.value)})</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Legend */}
                        <div className="space-y-2 text-xs">
                          {chartData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-gray-300">{item.state}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400">{item.percentage}%</span>
                                <span className="text-cyan-400 font-medium">{formatNumber(item.value)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Personal Affinity Overlap Button - Show when 1+ personas selected */}
                        {selectedPersonas.length >= 1 && (
                          <button
                            onClick={() => setShowOverlapModal(true)}
                            className="w-full mt-4 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Personal Affinity Overlap
                          </button>
                        )}

                        {/* Clear All Button */}
                        <button
                          onClick={() => setSelectedPersonas([])}
                          className="w-full mt-4 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Audience Groups List */}
                {audienceGroups.length > 0 && (
                  <div className="space-y-4">
                    {audienceGroups.map((group, groupIndex) => {
                      // Format demographics for display
                      const formatDemographics = (demographics) => {
                        const result = [];
                        if (demographics.race.length > 0) {
                          result.push(...demographics.race);
                        }
                        if (demographics.generation.length > 0) {
                          result.push(...demographics.generation.map(g => {
                            if (g.includes('Generation Z')) return 'Gen Z';
                            if (g.includes('Millennials')) return 'Millennials';
                            if (g.includes('Generation X')) return 'Gen X';
                            if (g.includes('Baby Boomers')) return 'Boomers';
                            return g;
                          }));
                        }
                        if (demographics.income.length > 0) {
                          result.push(...demographics.income.map(i => {
                            if (i.includes('B40')) return 'B40';
                            if (i.includes('M40')) return 'M40';
                            if (i.includes('T20')) return 'T20';
                            return i;
                          }));
                        }
                        return result;
                      };

                      const selectedDemographics = formatDemographics(group.demographics);

                      const inputRef = React.createRef();
                      
                      return (
                        <div key={group.id} className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                          <div className="space-y-3">
                            {/* Group Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center flex-1">
                                {/* Name display - directly editable */}
                                <input
                                  ref={inputRef}
                                  type="text"
                                  value={group.name}
                                  onChange={(e) => {
                                    // Update local state immediately for responsive UI
                                    setAudienceGroups(prev => prev.map(g => 
                                      g.id === group.id ? { ...g, name: e.target.value } : g
                                    ));
                                  }}
                                  onBlur={async (e) => {
                                    // Save to backend when user finishes editing
                                    try {
                                      await updateAudienceGroup(group.id, { name: e.target.value });
                                      console.log('Group name updated');
                                    } catch (error) {
                                      console.error('Error updating group name:', error);
                                    }
                                  }}
                                  className="text-base font-bold text-white bg-transparent border-none outline-none focus:outline-none hover:bg-gray-800/30 px-2 py-1 rounded transition-colors"
                                  style={{ 
                                    fontFamily: 'Inter, sans-serif',
                                    width: `${Math.max(150, (group.name.length || 15) * 10)}px`
                                  }}
                                  placeholder="Group Name"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Edit Audience Selections Icon */}
                                <button
                                  onClick={() => {
                                    // Restore selections to state and open modal
                                    setSelectedPersonas([...group.personas]);
                                    setModalDemographicFilters({
                                      race: [...group.demographics.race],
                                      generation: [...group.demographics.generation],
                                      income: [...group.demographics.income]
                                    });
                                    setEditingGroupId(group.id); // Set editing mode
                                    setShowOverlapModal(true);
                                  }}
                                  className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                                  title="Edit audience selections"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {/* Delete Icon */}
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Delete "${group.name}"?`)) {
                                      try {
                                        // Delete from backend
                                        await deleteAudienceGroup(group.id);
                                        // Remove from local state
                                        setAudienceGroups(prev => prev.filter(g => g.id !== group.id));
                                      } catch (error) {
                                        console.error('Error deleting group:', error);
                                        alert('Failed to delete group. Please try again.');
                                      }
                                    }
                                  }}
                                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                                  title="Delete group"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Audience Segments */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-gray-400 font-medium">Audience Segments:</span>
                              {group.personas.map((persona, idx) => {
                                const category = getPersonaCategory(persona);
                                return (
                                  <span 
                                    key={idx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryTextColor(category)} bg-gray-800/50 border border-gray-700`}
                                  >
                                    {persona}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Demographics - Separate Line */}
                            {selectedDemographics.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-400 font-medium">Demographics:</span>
                                {selectedDemographics.map((demo, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-cyan-400 bg-cyan-900/20 border border-cyan-700/30"
                                  >
                                    {demo}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Audience Metrics - Simple Text */}
                            <div className="flex items-center gap-6 text-sm pt-2 border-t border-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Total Audience:</span>
                                <span className="font-bold text-white">{formatNumber(group.totalAudience)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">Unduplicated:</span>
                                <span className="font-bold text-purple-400">{formatNumber(group.unduplicated)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </>
        )}
        </div>
      </div>

      {/* Personal Affinity Overlap Modal */}
      {showOverlapModal && (() => {
        const overlapData = calculateOverlapEstimation();
        const hasZeroOverlap = overlapData.overlapFactor === 0;
        
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header with Close Button */}
              <div className="p-6 flex items-center justify-between border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">
                  {selectedPersonas.length >= 2 ? 'Persona Affinity & Overlap Estimation' : 'Audience Group Builder'}
                </h2>
                <button
                  onClick={() => {
                    setShowOverlapModal(false);
                    // Clear editing state and selections
                    setEditingGroupId(null);
                    setSelectedPersonas([]);
                    setModalDemographicFilters({
                      race: [],
                      generation: [],
                      income: []
                    });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Demographic Filters */}
                <div className="bg-[#0f1419] border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Demographic Filters
                    </h3>
                    {(modalDemographicFilters.race.length > 0 || modalDemographicFilters.generation.length > 0 || modalDemographicFilters.income.length > 0) && (
                      <button
                        onClick={() => setModalDemographicFilters({ race: [], generation: [], income: [] })}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Race Filter - Multi-select */}
                    <div className="relative demographic-filter-dropdown">
                      <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
                        Race
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDemographicDropdown(openDemographicDropdown === 'race' ? null : 'race')}
                          className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-left text-white focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">
                            {modalDemographicFilters.race.length === 0 ? 'Select Race...' : `${modalDemographicFilters.race.length} selected`}
                          </span>
                          <svg className={`w-4 h-4 transition-transform ${openDemographicDropdown === 'race' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openDemographicDropdown === 'race' && (
                          <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                            {['Malay', 'Chinese', 'Indian'].map(option => (
                              <label key={option} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={modalDemographicFilters.race.includes(option)}
                                  onChange={(e) => {
                                    const newRace = e.target.checked
                                      ? [...modalDemographicFilters.race, option]
                                      : modalDemographicFilters.race.filter(r => r !== option);
                                    setModalDemographicFilters(prev => ({ ...prev, race: newRace }));
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                                />
                                <span className="text-sm text-white">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Selected badges */}
                      {modalDemographicFilters.race.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {modalDemographicFilters.race.map(item => (
                            <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {item}
                              <button
                                onClick={() => setModalDemographicFilters(prev => ({ ...prev, race: prev.race.filter(r => r !== item) }))}
                                className="ml-1 hover:text-cyan-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Generation / Category Filter - Multi-select */}
                    <div className="relative demographic-filter-dropdown">
                      <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
                        Generation / Category
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDemographicDropdown(openDemographicDropdown === 'generation' ? null : 'generation')}
                          className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-left text-white focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">
                            {modalDemographicFilters.generation.length === 0 ? 'Select Generation...' : `${modalDemographicFilters.generation.length} selected`}
                          </span>
                          <svg className={`w-4 h-4 transition-transform ${openDemographicDropdown === 'generation' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openDemographicDropdown === 'generation' && (
                          <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                            {['Generation Z (Gen Z)', 'Millennials (Gen Y)', 'Generation X (Gen X)', 'Baby Boomers'].map(option => (
                              <label key={option} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={modalDemographicFilters.generation.includes(option)}
                                  onChange={(e) => {
                                    const newGen = e.target.checked
                                      ? [...modalDemographicFilters.generation, option]
                                      : modalDemographicFilters.generation.filter(g => g !== option);
                                    setModalDemographicFilters(prev => ({ ...prev, generation: newGen }));
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                                />
                                <span className="text-sm text-white">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Selected badges */}
                      {modalDemographicFilters.generation.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {modalDemographicFilters.generation.map(item => (
                            <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {item}
                              <button
                                onClick={() => setModalDemographicFilters(prev => ({ ...prev, generation: prev.generation.filter(g => g !== item) }))}
                                className="ml-1 hover:text-cyan-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Income Group Filter - Multi-select */}
                    <div className="relative demographic-filter-dropdown">
                      <label className="block text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">
                        Income Group
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDemographicDropdown(openDemographicDropdown === 'income' ? null : 'income')}
                          className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-700 rounded text-sm text-left text-white focus:outline-none focus:border-cyan-500 transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">
                            {modalDemographicFilters.income.length === 0 ? 'Select Income...' : `${modalDemographicFilters.income.length} selected`}
                          </span>
                          <svg className={`w-4 h-4 transition-transform ${openDemographicDropdown === 'income' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openDemographicDropdown === 'income' && (
                          <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
                            {['B40 (Bottom 40%)', 'M40 (Middle 40%)', 'T20 (Top 20%)'].map(option => (
                              <label key={option} className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={modalDemographicFilters.income.includes(option)}
                                  onChange={(e) => {
                                    const newIncome = e.target.checked
                                      ? [...modalDemographicFilters.income, option]
                                      : modalDemographicFilters.income.filter(i => i !== option);
                                    setModalDemographicFilters(prev => ({ ...prev, income: newIncome }));
                                  }}
                                  className="w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 mr-2"
                                />
                                <span className="text-sm text-white">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Selected badges */}
                      {modalDemographicFilters.income.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {modalDemographicFilters.income.map(item => (
                            <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {item}
                              <button
                                onClick={() => setModalDemographicFilters(prev => ({ ...prev, income: prev.income.filter(i => i !== item) }))}
                                className="ml-1 hover:text-cyan-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Cards - Total Additive Reach & Estimated Unduplicated */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Audience Card - Teal */}
                  <div className="bg-teal-900/40 border border-teal-700/50 rounded-lg p-6">
                    <div className="text-xs text-teal-200 mb-2 uppercase tracking-wide">
                      Total Audience
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">
                      {formatNumber(overlapData.totalAudience)}
                    </div>
                    <div className="text-xs text-teal-300">
                      {overlapData.demographicMultiplier < 1.0 
                        ? `Filtered by demographics (${(overlapData.demographicMultiplier * 100).toFixed(1)}%)`
                        : 'Sum of all selected segments'}
                    </div>
                  </div>

                  {/* Estimated Unduplicated Card - Purple */}
                  <div className="bg-purple-900/40 border border-purple-700/50 rounded-lg p-6">
                    <div className="text-xs text-purple-200 mb-2 uppercase tracking-wide">
                      Estimated Unduplicated
                    </div>
                    <div className="text-4xl font-bold text-purple-300">
                      {formatNumber(overlapData.uniqueCombined)}
                    </div>
                    <div className="text-xs text-purple-300">
                      After {(overlapData.overlapFactor * 100).toFixed(0)}% overlap adjustment
                    </div>
                  </div>
                </div>

                {/* Overlap Breakdown - Only show when 2+ personas */}
                {selectedPersonas.length >= 2 && (
                  <div className="bg-[#0f1419] rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Overlap Breakdown</h3>
                    
                    <div className="space-y-4">
                      {/* Demographic Filter Applied */}
                      {overlapData.demographicMultiplier < 1.0 && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-800">
                          <span className="text-sm text-gray-300">Demographic Filter Applied</span>
                          <span className="text-2xl font-bold text-blue-400">
                            {(overlapData.demographicMultiplier * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-3 border-b border-gray-800">
                        <span className="text-sm text-gray-300">Overlap Factor Applied</span>
                        <span className="text-2xl font-bold text-cyan-400">
                          {(overlapData.overlapFactor * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-gray-300">Estimated Overlap</span>
                        <span className="text-2xl font-bold text-orange-400">
                          -{formatNumber(overlapData.estimatedOverlap)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Segments */}
                <div className="bg-[#0f1419] rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-6">
                    Selected Segments ({overlapData.segments.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {overlapData.segments.map((segment, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-base font-medium text-white mb-1">{segment.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                                Cluster: {segment.category}
                              </span>
                              {segment.isDemographic && (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-300 border border-green-700/50">
                                  race
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-medium text-white">
                          {formatNumber(segment.audience)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowOverlapModal(false)}
                    className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Calculate overlap data for this group
                        const overlapData = calculateOverlapEstimation();
                        
                        if (editingGroupId) {
                          // Update existing group
                          const updateData = {
                            personas: [...selectedPersonas],
                            demographics: {
                              race: [...modalDemographicFilters.race],
                              generation: [...modalDemographicFilters.generation],
                              income: [...modalDemographicFilters.income]
                            },
                            totalAudience: overlapData.totalAudience,
                            unduplicated: overlapData.uniqueCombined,
                            overlapFactor: overlapData.overlapFactor
                          };
                          
                          // Update in backend
                          const updatedGroup = await updateAudienceGroup(editingGroupId, updateData);
                          
                          // Update local state
                          setAudienceGroups(prev => prev.map(g => 
                            g.id === editingGroupId ? updatedGroup : g
                          ));
                          setEditingGroupId(null);
                        } else {
                          // Create new audience group
                          const groupNumber = audienceGroups.length + 1;
                          const newGroupData = {
                            name: `Audience Group #${groupNumber}`,
                            personas: [...selectedPersonas],
                            demographics: {
                              race: [...modalDemographicFilters.race],
                              generation: [...modalDemographicFilters.generation],
                              income: [...modalDemographicFilters.income]
                            },
                            totalAudience: overlapData.totalAudience,
                            unduplicated: overlapData.uniqueCombined,
                            overlapFactor: overlapData.overlapFactor
                          };
                          
                          // Save to backend
                          const savedGroup = await saveAudienceGroup(newGroupData);
                          
                          // Add to local state
                          setAudienceGroups(prev => [...prev, savedGroup]);
                        }
                        
                        // Reset selections
                        setSelectedPersonas([]);
                        setModalDemographicFilters({
                          race: [],
                          generation: [],
                          income: []
                        });
                        
                        // Close modal
                        setShowOverlapModal(false);
                      } catch (error) {
                        console.error('Error saving audience group:', error);
                        alert('Failed to save audience group. Please try again.');
                      }
                    }}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingGroupId ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                    </svg>
                    {editingGroupId ? 'Save' : 'Add to Plan'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}

export default Audience;
