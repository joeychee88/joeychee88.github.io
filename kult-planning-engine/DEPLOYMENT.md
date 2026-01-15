# KULT Planning Engine - Public Repository

This is a **public copy** of the KULT Planning Engine source code.

## 📦 Repository Contents

This repository contains the complete source code for the KULT Planning Engine, including:

- **Frontend**: React-based web application
- **Backend**: Node.js/Express API server
- **Documentation**: Comprehensive guides and feature documentation

## 🚀 How to Deploy

This application requires both frontend and backend to function. GitHub Pages only supports static sites, so you'll need a proper hosting solution.

### Option 1: Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/joeychee88/joeychee88.github.io.git
   cd joeychee88.github.io/kult-planning-engine
   ```

2. **Install dependencies**:
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Backend: Create .env file
   cd ../backend
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Start the servers**:
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

5. **Access the app**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

### Option 2: Cloud Deployment

For a production deployment, consider:

- **Vercel** (Recommended for frontend + serverless)
- **Railway** (Full stack hosting)
- **Render** (Full stack hosting)
- **Heroku** (Full stack hosting)
- **AWS** / **Google Cloud** / **Azure** (Enterprise)

## 📚 Documentation

See the main [README.md](./README.md) for full documentation.

## 🔗 Links

- **Original Repository**: https://github.com/joeychee88/kult-planning-engine
- **Branch**: fix/geography-kl-word-boundary
- **Latest Changes**: See [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md)

## ⚠️ Important Notes

1. **This is a code repository** - You need to deploy it to a server to use it
2. **Backend required** - The frontend alone won't function without the API
3. **API Keys needed** - You'll need OpenAI API keys for AI features
4. **Database optional** - The app includes a demo mode without database

## 📧 Support

For questions or issues, refer to the original repository.

---

**Last Updated**: January 15, 2026
