/**
 * KULT Planning Engine - Demo Server (No Database Required)
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { users as mockUsers, clients, campaigns, dashboardStats } from './mockData.js';
import User from '../models/User.js';

// Load real users from database
let users = mockUsers; // Start with mock users as fallback
try {
  users = await User.getAll();
  console.log(`✅ Loaded ${users.length} users from database`);
} catch (error) {
  console.warn('⚠️  Could not load users from database, using mock data:', error.message);
}

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'kult_secret_key_change_in_production'; // Match auth router

// Middleware
app.use(cors({ 
  origin: true,
  credentials: true 
}));
app.use(express.json());

// Serve static files from public directory
app.use('/public', express.static('public'));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = users.find(u => u.id === decoded.userId);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'KULT Planning Engine API (Demo Mode)',
    version: '1.0.0',
    status: 'operational',
    mode: 'demo',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'demo' });
});

// Auth routes - removed simple password login, using full auth router with magic links
// The auth router is imported below and handles all /api/auth routes

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Dashboard routes
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  res.json(dashboardStats);
});

// Formats endpoint (Google Sheets integration)
import formatsRouter from './routes/formats.js';
app.use('/api/formats', formatsRouter);

// Rates endpoint (Google Sheets integration)
import ratesRouter from './routes/rates.js';
app.use('/api/rates', ratesRouter);

// Inventory endpoint (Google Sheets integration)
import inventoryRouter from './routes/inventory.js';
app.use('/api/inventory', inventoryRouter);

// Sites endpoint (Curated from inventory data)
import sitesRouter from '../routes/sites.js';
app.use('/api/sites', sitesRouter);

// Audience endpoint (Google Sheets integration)
import audienceRouter from './routes/audience.js';
app.use('/api/audience', audienceRouter);

// Audience Groups endpoint (User's saved groups)
import audienceGroupsRouter from './routes/audienceGroups.js';
app.use('/api/audience-groups', audienceGroupsRouter);

// Brief parsing endpoint (File upload + AI extraction)
import briefRouter from '../routes/brief.js';
app.use('/api/brief', briefRouter);

// AI Chat endpoint (OpenAI-powered conversations)
import aiChatRouter from '../routes/ai-chat.js';
app.use('/api/ai-chat', aiChatRouter);

// Feedback Analytics endpoint
import feedbackAnalyticsRouter from '../routes/feedback-analytics.js';
app.use('/api/feedback-analytics', feedbackAnalyticsRouter);

// AI Recommendations endpoint (Co-Pilot)
import aiRecommendationsRouter from '../routes/ai-recommendations.js';
app.use('/api/ai-recommendations', aiRecommendationsRouter);

// Impression Calculator endpoint
import { calculateImpressions } from '../utils/impressionCalculator.js';
app.post('/api/calculate-impressions', async (req, res) => {
  try {
    const { budget, selectedFormatIds = [] } = req.body;
    
    if (!budget || budget <= 0) {
      return res.json({ 
        success: true, 
        impressions: 0, 
        avgCPM: 0 
      });
    }
    
    // Fetch format details if format IDs provided
    let selectedFormats = [];
    if (selectedFormatIds.length > 0) {
      const formatsResponse = await fetch('http://localhost:5001/api/formats');
      const formatsData = await formatsResponse.json();
      const allFormats = formatsData.data || [];
      selectedFormats = allFormats.filter(f => selectedFormatIds.includes(f.id));
    }
    
    // Calculate using unified calculator
    const result = calculateImpressions(budget, selectedFormats);
    
    res.json({
      success: true,
      impressions: result.impressions,
      avgCPM: result.avgCPM,
      breakdown: result.breakdown
    });
  } catch (error) {
    console.error('[CALCULATE IMPRESSIONS ERROR]:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export endpoint (Excel, PDF generation)
import exportRouter from '../routes/export.js';
app.use('/api/export', exportRouter);

// Campaigns endpoint (Save/Load campaign plans)
import campaignsRouter from '../routes/campaigns.js';
app.use('/api/campaigns', campaignsRouter);

// Authentication API (Passwordless Magic Link)
import authRouter from '../routes/auth.js';
app.use('/api/auth', authRouter);

// Campaign Workflow API (Submit, Approve, Reject, Reassign, Book)
import campaignWorkflowRouter from '../routes/campaign-workflow.js';
app.use('/api/campaign-workflow', campaignWorkflowRouter);

// Admin API (User, Organization, Sales Person management)
import adminRouter from '../routes/admin.js';
app.use('/api/admin', adminRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║     KULT PLANNING ENGINE - DEMO API SERVER                ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  🚀 Server running on port ${PORT}`);
  console.log(`  🌍 Mode: DEMO (No database required)`);
  console.log(`  📡 API URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  Demo Credentials:');
  console.log('  ├─ admin@kult.my / kult2024');
  console.log('  └─ sarah.tan@kult.my / kult2024');
  console.log('');
  console.log('  Note: This is a demo server with mock data.');
  console.log('  For full functionality, set up PostgreSQL and use the main server.');
  console.log('');
});

export default app;
