# KULT Planning Engine - Web App

This is the deployed web application for the KULT Planning Engine.

## ⚠️ Backend Configuration Required

This frontend requires a backend API to function. You need to:

1. **Deploy the backend** to Railway, Vercel, or another service
2. **Configure the API URL** in your frontend build

See the deployment guides below for instructions.

## 📖 Documentation

- [Railway Deployment Guide](RAILWAY_DEPLOYMENT.md) - Deploy to Railway
- [Full Deployment Guide](DEPLOYMENT.md) - All deployment options
- [Changes Summary](CHANGES_SUMMARY.md) - Latest features

## 🔧 Source Code

The source code is available in the `backend/` and `frontend/` directories:
- `backend/` - Node.js + Express API
- `frontend/` - React + Vite application

## 🚀 Quick Deploy

### Option 1: Railway (Recommended)
```bash
# See RAILWAY_DEPLOYMENT.md for step-by-step guide
# Backend + Frontend deployment in 10 minutes
```

### Option 2: Local Development
```bash
# Clone repo
git clone https://github.com/joeychee88/joeychee88.github.io.git
cd joeychee88.github.io/kult-planning-engine

# Backend
cd backend && npm install && npm start

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

## 📞 Login Credentials

Default credentials for testing:
- Email: `admin@kult.my`
- Password: `kult2024`

---

**Note**: This GitHub Pages deployment shows the frontend app, but requires a separately deployed backend API to function fully.
