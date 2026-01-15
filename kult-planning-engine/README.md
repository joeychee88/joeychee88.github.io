# KULT Planning Engine

## Project Overview
KULT Planning Engine is a comprehensive advertising campaign planning and management platform built with React and Express.js, featuring Google Sheets integration for real-time data management.

### Key Features
- **User Authentication** - Secure login with JWT tokens
- **Dashboard Analytics** - Real-time campaign and client statistics
- **Ad Format Management** - Google Sheets integration for format configuration
- **Campaign Planning** - Tools for planning and managing advertising campaigns
- **Demo Mode** - Pre-configured demo data for testing and exploration

## 🌐 Live URLs

### Production URLs
- **Frontend**: https://3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai
- **Backend API**: https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai
- **API Health**: https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/health
- **Formats API**: https://5001-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai/api/formats

### Google Sheets Data Source
- **Ad Formats Sheet**: https://docs.google.com/spreadsheets/d/1dYylynygKbRb1NNwWQodZGG78m3jYf8BiPsJPGXp3Dg/edit

## 📊 Data Architecture

### Storage Services
- **Google Sheets** - Primary data source for ad formats
- **Local Storage** - Frontend state persistence
- **JWT Tokens** - Session management

### Data Models

#### Ad Format
```javascript
{
  id: string,           // Format identifier (fmt_1, fmt_2, ...)
  name: string,         // Format name (e.g., "Leaderboard")
  formatType: string,   // Type category (Standard IAB Banner, High Impact, etc.)
  dimensions: string,   // Size in pixels (e.g., "728x90")
  description: string,  // Format description
  baseCpm: number,      // Base CPM rate in RM
  premium: boolean,     // Premium format flag
  platform: string,     // Platform (Desktop, Mobile, All)
  placement: string,    // Placement location
  active: boolean       // Active status
}
```

#### User
```javascript
{
  id: number,
  name: string,
  email: string,
  role: string          // 'admin' or 'user'
}
```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires auth)

#### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics (requires auth)

#### Ad Formats (Google Sheets Integration)
- `GET /api/formats` - Get all ad formats
  - Query params: `?skipCache=true` to force refresh
- `GET /api/formats/types` - Get format type breakdown
- `GET /api/formats/stats` - Get format statistics
- `POST /api/formats/filter` - Filter formats by criteria
- `POST /api/formats/refresh` - Force cache refresh

### Data Flow
```
Google Sheets (Source)
    ↓
Backend API (5-minute cache)
    ↓
Frontend (Real-time display)
```

## 🚀 Deployment Status

### Current Status
✅ **ACTIVE** - All services running

### Technology Stack
- **Frontend**: React 18, Vite, TailwindCSS, React Router
- **Backend**: Express.js, Node.js
- **Data Integration**: Google Sheets CSV Export, Axios
- **Process Management**: PM2
- **Version Control**: Git

### Environment
- **Backend Port**: 5001
- **Frontend Port**: 3002
- **Node Version**: Latest LTS
- **Mode**: Demo (No database required)

## 📖 User Guide

### Getting Started

1. **Access the Application**
   - Open: https://3002-imrdn9yo7mbn8if7j02x7-d0b9e1e2.sandbox.novita.ai
   
2. **Login Credentials**
   ```
   Admin Account:
   Email: admin@kult.my
   Password: kult2024
   
   User Account:
   Email: sarah.tan@kult.my
   Password: kult2024
   ```

3. **Navigate to Ad Formats**
   - Click "Ad Formats" button from Dashboard
   - View all configured advertising formats
   - Filter by format type
   - See real-time statistics

### Managing Ad Formats

#### View Formats
- Formats are grouped by type (Standard IAB Banner, High Impact, Video, Interactive Banner)
- Each format card shows:
  - Format name and dimensions
  - Base CPM pricing
  - Platform and placement
  - Premium status
  - Active/Inactive status

#### Edit Formats (Google Sheets)
1. Click "Edit in Google Sheets" button
2. Make changes directly in the spreadsheet
3. Return to the app
4. Click "Refresh Data" to see updates

#### Format Statistics
- **Total Formats**: Count of all available formats
- **Premium Formats**: Special high-value formats
- **Average CPM**: Mean cost per thousand impressions
- **Format Types**: Number of distinct format categories

### Dashboard Features
- View total clients and active campaigns
- Monitor total revenue and impressions
- Access quick navigation to various modules

## 🔧 Development

### Project Structure
```
webapp/
├── backend/
│   ├── src/
│   │   ├── demo-server.js         # Main server entry
│   │   ├── mockData.js            # Demo data
│   │   └── routes/
│   │       └── formats.js         # Formats API routes
│   ├── package.json
│   └── ecosystem.config.cjs       # PM2 config
├── frontend/
│   ├── src/
│   │   ├── main.jsx               # App entry point
│   │   ├── App.jsx                # Main app component
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Login page
│   │   │   ├── Dashboard.jsx     # Dashboard page
│   │   │   └── admin/
│   │   │       └── Format.jsx    # Format management
│   │   └── index.css              # Global styles
│   ├── public/                    # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── ecosystem.config.cjs
└── README.md
```

### Local Development

#### Backend
```bash
cd /home/user/webapp/backend
npm install
pm2 start ecosystem.config.cjs
pm2 logs kult-backend --nostream
```

#### Frontend
```bash
cd /home/user/webapp/frontend
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 logs kult-frontend --nostream
```

### Testing
```bash
# Test backend API
curl http://localhost:5001/health
curl http://localhost:5001/api/formats | jq '.stats'

# Test frontend
curl -I http://localhost:3002

# View PM2 processes
pm2 list

# Check logs
pm2 logs --nostream
```

### Google Sheets Integration

#### Sheet Structure
The Google Sheet must have these columns:
- **Format Name** (Required)
- **Format Type** (Required)
- **Dimensions** (Optional)
- **Description** (Optional)
- **Base CPM (RM)** (Required, numeric)
- **Premium** (Optional, TRUE/FALSE)
- **Platform** (Optional)
- **Placement** (Optional)
- **Active** (Optional, TRUE/FALSE)

#### Cache Management
- Data is cached for 5 minutes
- Use `?skipCache=true` parameter to force refresh
- Click "Refresh Data" button in UI to update

## 🎯 Next Steps (Recommended Development)

### High Priority
1. **Implement Campaign Planning Module**
   - Create campaign creation wizard
   - Add line item management
   - Integrate audience targeting

2. **Add Inventory Management**
   - Site property configuration
   - Ad unit management
   - Availability tracking

3. **Enhance Format Management**
   - Add format usage analytics
   - Implement format recommendations
   - Create format performance reports

### Medium Priority
4. **Client Management System**
   - Client profiles and contacts
   - Client-specific pricing
   - Historical campaign data

5. **Reporting Dashboard**
   - Campaign performance metrics
   - Revenue analytics
   - Export capabilities

6. **User Management**
   - User roles and permissions
   - Activity logging
   - Team collaboration features

### Low Priority
7. **Advanced Features**
   - AI-powered recommendations
   - Budget optimization tools
   - Automated proposal generation

## 🔒 Security Notes

### Demo Mode
- Uses mock data for testing
- JWT secret is simplified for demo
- All users have default password: `kult2024`

### Production Recommendations
- Change JWT secret to secure random string
- Implement proper password hashing
- Add rate limiting
- Enable HTTPS only
- Add environment-based configuration
- Implement proper user management

## 📝 API Documentation

### Authentication Required
Most API endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Example Requests

#### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kult.my","password":"kult2024"}'
```

#### Get Formats
```bash
curl http://localhost:5001/api/formats
```

#### Get Dashboard Stats
```bash
curl http://localhost:5001/api/dashboard/stats \
  -H "Authorization: Bearer <token>"
```

## 🐛 Troubleshooting

### Services Not Running
```bash
pm2 restart all
pm2 logs --nostream
```

### Port Conflicts
```bash
fuser -k 3002/tcp 2>/dev/null || true
fuser -k 5001/tcp 2>/dev/null || true
pm2 restart all
```

### Google Sheets Not Loading
1. Check sheet URL is accessible
2. Verify sheet is published to web
3. Click "Refresh Data" button
4. Check backend logs: `pm2 logs kult-backend --nostream`

### Build Issues
```bash
cd /home/user/webapp/frontend
rm -rf node_modules dist
npm install
npm run build
pm2 restart kult-frontend
```

## 📞 Support

For issues or questions:
- Check PM2 logs: `pm2 logs --nostream`
- Review backend logs for API errors
- Verify Google Sheets accessibility
- Check browser console for frontend errors

## 📄 License

Internal KULT Planning Engine - Proprietary Software

---

**Last Updated**: 2025-11-28
**Version**: 1.0.0
**Status**: ✅ Active Development
