# Running KULT Planning Engine on GitHub Pages - Complete Guide

## Current Status

✅ **Deployment Info Page Live**: https://joeychee88.github.io/kult-planning-engine/  
⚠️ **Full App**: Requires backend deployment (see solutions below)

## Why GitHub Pages Shows Info Page Instead of App

**GitHub Pages Limitation**: GitHub Pages can **only serve static HTML/CSS/JS files**. It cannot:
- Run Node.js servers
- Execute backend APIs
- Connect to databases
- Process server-side code

**KULT Planning Engine Architecture**:
- **Frontend**: React app (can be static after build)
- **Backend**: Node.js/Express API with OpenAI integration
- **Requires**: Backend API running somewhere

## ✅ SOLUTION: Deploy Backend + Frontend Properly

### Option 1: Vercel (Recommended - FREE & 5 Minutes)

**Why Vercel**: Free tier, automatic deployments, supports both frontend and serverless functions.

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Clone and Deploy Backend
```bash
# Clone repo
git clone https://github.com/joeychee88/joeychee88.github.io.git
cd joeychee88.github.io/kult-planning-engine/backend

# Create .env file
cat > .env << 'EOF'
OPENAI_API_KEY=your_openai_key_here
JWT_SECRET=your_secret_here
NODE_ENV=production
EOF

# Deploy
vercel
```

**Follow prompts:**
- Set up and deploy? **Y**
- Which scope? **Select your account**
- Link to existing project? **N**
- Project name? **kult-backend**
- Directory? **./backend** (or just press enter)
- Override settings? **N**

**Copy the deployment URL** (e.g., `https://kult-backend-xxx.vercel.app`)

#### Step 3: Deploy Frontend
```bash
cd ../frontend

# Create .env.production
cat > .env.production << 'EOF'
VITE_API_URL=https://kult-backend-xxx.vercel.app
VITE_API_BASE_URL=https://kult-backend-xxx.vercel.app
EOF

# Deploy
vercel
```

**Follow prompts:**
- Set up and deploy? **Y**
- Project name? **kult-frontend**
- Override settings? **N**

**Your app is now live!** ✅  
URL: `https://kult-frontend-xxx.vercel.app`

---

### Option 2: Railway (Full-Stack - $5/month)

#### Step 1: Sign up at railway.app
Go to https://railway.app and create account

#### Step 2: Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Connect your GitHub account
- Select `joeychee88/joeychee88.github.io`

#### Step 3: Deploy Backend
- Railway will detect the backend
- Add environment variables:
  - `OPENAI_API_KEY`
  - `JWT_SECRET`
  - `NODE_ENV=production`
- Click Deploy

#### Step 4: Deploy Frontend
- Add new service in the same project
- Point to `frontend` directory
- Add environment variable:
  - `VITE_API_URL` = your backend URL
- Click Deploy

**Both services will be live with custom domains!**

---

### Option 3: Render (FREE tier available)

#### Backend Deployment:
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Select `backend` directory
5. Add environment variables
6. Deploy

#### Frontend Deployment:
1. Click "New +" → "Static Site"
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variable pointing to backend
5. Deploy

---

### Option 4: Local Development (FREE & 2 Minutes)

**Best for**: Testing locally before deploying

```bash
# Clone repo
git clone https://github.com/joeychee88/joeychee88.github.io.git
cd joeychee88.github.io/kult-planning-engine

# Backend (Terminal 1)
cd backend
npm install

# Create .env
cat > .env << 'EOF'
OPENAI_API_KEY=your_key_here
JWT_SECRET=any_secret_string
NODE_ENV=development
PORT=5001
EOF

npm start  # Backend runs on http://localhost:5001

# Frontend (Terminal 2)
cd ../frontend
npm install
npm run dev  # Frontend runs on http://localhost:3000
```

**Open browser**: http://localhost:3000  
**Login credentials**:
- Email: `admin@kult.my`
- Password: `kult2024`

---

## Environment Variables Required

### Backend (.env)
```env
OPENAI_API_KEY=sk-proj-xxxxx
JWT_SECRET=any_random_secret_string
NODE_ENV=production
PORT=5001
```

### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend-url.com
VITE_API_BASE_URL=https://your-backend-url.com
```

---

## Quick Comparison

| Option | Time | Cost | Best For |
|--------|------|------|----------|
| Vercel | 5 min | FREE | Quick deployment |
| Railway | 10 min | $5/mo | Full-stack with DB |
| Render | 10 min | FREE | Budget option |
| Local | 2 min | FREE | Testing/development |

---

## Troubleshooting

### Issue: CORS errors
**Solution**: Make sure backend has CORS enabled (already configured in our code)

### Issue: API calls failing
**Solution**: Check that `VITE_API_URL` in frontend matches your backend URL

### Issue: Build fails
**Solution**: Ensure all environment variables are set correctly

---

## What's Next?

1. **Choose a deployment option** (Vercel recommended)
2. **Deploy backend first** (get the URL)
3. **Deploy frontend** (with backend URL configured)
4. **Test the app** (login with admin@kult.my / kult2024)
5. **Share the URL!**

---

## Current GitHub Pages Setup

- **Main site**: https://joeychee88.github.io/ (Landing page)
- **Source code**: https://github.com/joeychee88/joeychee88.github.io/tree/main/kult-planning-engine
- **Info page**: https://joeychee88.github.io/kult-planning-engine/ (This explains deployment)

---

## Need Help?

**Documentation**:
- [Full Deployment Guide](https://github.com/joeychee88/joeychee88.github.io/blob/main/kult-planning-engine/DEPLOYMENT.md)
- [Changes Summary](https://github.com/joeychee88/joeychee88.github.io/blob/main/kult-planning-engine/CHANGES_SUMMARY.md)

**Quick Command Reference**:
```bash
# Vercel deployment (fastest)
npm install -g vercel
cd backend && vercel
cd ../frontend && vercel

# Local testing
cd backend && npm install && npm start
cd frontend && npm run dev
```

---

**Ready to deploy?** Choose Option 1 (Vercel) for the fastest setup!
