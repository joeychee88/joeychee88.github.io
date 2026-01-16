# Railway Deployment Guide - KULT Planning Engine

## ✅ Files Added for Railway Support

I've added the following configuration files to make Railway deployment work:

### Backend Files:
- ✅ `start.sh` - Startup script
- ✅ `railway.json` - Railway configuration
- ✅ `nixpacks.json` - Nixpacks build configuration
- ✅ `Procfile` - Process configuration

### Frontend Files:
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process configuration

---

## 🚀 Railway Deployment - Step by Step

### Prerequisites
1. GitHub account
2. Railway account (sign up at https://railway.app)
3. OpenAI API key

---

## Backend Deployment (5 minutes)

### Step 1: Create New Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Click "Configure GitHub App"
5. Select the repository: `joeychee88/joeychee88.github.io`

### Step 2: Configure Backend Service
1. Railway will detect your repository
2. Click "Add Service" → "GitHub Repo"
3. **Important**: Set the root directory:
   - Click on the service
   - Go to "Settings"
   - Under "Build", set **Root Directory** to: `kult-planning-engine/backend`
4. Click "Deploy"

### Step 3: Add Environment Variables
1. Click on your backend service
2. Go to "Variables" tab
3. Add the following variables:

```
OPENAI_API_KEY=sk-proj-your-openai-key-here
JWT_SECRET=your-random-secret-string-here
NODE_ENV=production
PORT=${{RAILWAY_PORT}}
```

**Important**: Use `${{RAILWAY_PORT}}` for PORT - Railway automatically assigns this

### Step 4: Get Backend URL
1. After deployment completes, go to "Settings"
2. Scroll to "Networking"
3. Click "Generate Domain"
4. Copy the URL (e.g., `kult-backend.up.railway.app`)

---

## Frontend Deployment (5 minutes)

### Step 1: Add Frontend Service
1. In the same Railway project, click "New"
2. Select "GitHub Repo"
3. Choose the same repository
4. **Important**: Set the root directory:
   - Go to "Settings"
   - Under "Build", set **Root Directory** to: `kult-planning-engine/frontend`

### Step 2: Add Environment Variables
1. Go to "Variables" tab
2. Add:

```
VITE_API_URL=https://kult-backend.up.railway.app
VITE_API_BASE_URL=https://kult-backend.up.railway.app
```

**Replace** `kult-backend.up.railway.app` with your actual backend URL from Step 4 above

### Step 3: Generate Domain
1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Your frontend URL: `kult-frontend.up.railway.app`

### Step 4: Update Backend CORS (if needed)
If you get CORS errors:
1. Go to backend service
2. Add environment variable:
```
ALLOWED_ORIGINS=https://kult-frontend.up.railway.app
```
3. Redeploy backend

---

## ✅ Verification

### Test Backend:
```bash
curl https://your-backend-url.up.railway.app/api/rates
```

Should return JSON with rates data.

### Test Frontend:
Visit: `https://your-frontend-url.up.railway.app`

Login:
- Email: `admin@kult.my`
- Password: `kult2024`

---

## 🔧 Troubleshooting

### Issue: "Script start.sh not found"
**Solution**: ✅ Fixed! I've added all necessary files.

### Issue: Backend crashes on startup
**Check**:
1. Environment variables are set correctly
2. `PORT` is set to `${{RAILWAY_PORT}}`
3. Check logs in Railway dashboard

### Issue: Frontend can't connect to backend
**Check**:
1. `VITE_API_URL` matches your backend URL
2. Backend is running (check Railway dashboard)
3. No CORS errors in browser console

### Issue: Build fails
**Check**:
1. Root directory is set correctly:
   - Backend: `kult-planning-engine/backend`
   - Frontend: `kult-planning-engine/frontend`
2. All dependencies are listed in package.json

---

## 📊 Railway Configuration Details

### Backend (railway.json):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/demo-server.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Frontend (railway.json):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run build && npm run preview"
  }
}
```

### Procfile (Alternative):
Railway also supports Procfile format:
```
web: node src/demo-server.js
```

---

## 💰 Pricing

**Railway Free Trial**: $5 credit (enough for testing)  
**Hobby Plan**: $5/month (includes $5 credit)
- Both services can run on the free tier
- Sufficient for development and testing

---

## 🎯 Quick Summary

1. **Create Railway project** from GitHub
2. **Add backend service**:
   - Root: `kult-planning-engine/backend`
   - Add env vars: `OPENAI_API_KEY`, `JWT_SECRET`, `PORT=${{RAILWAY_PORT}}`
   - Generate domain
3. **Add frontend service**:
   - Root: `kult-planning-engine/frontend`
   - Add env var: `VITE_API_URL=<backend-url>`
   - Generate domain
4. **Test**: Visit frontend URL and login

---

## 📝 Environment Variables Checklist

### Backend:
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `JWT_SECRET` - Any random string (e.g., `kult-secret-2024`)
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set to `${{RAILWAY_PORT}}`

### Frontend:
- [ ] `VITE_API_URL` - Your backend Railway URL
- [ ] `VITE_API_BASE_URL` - Your backend Railway URL (same as above)

---

## 🔄 Automatic Deployments

Railway automatically redeploys when you push to GitHub:
1. Make changes to your code
2. Commit and push to GitHub
3. Railway detects changes
4. Automatic rebuild and deploy

---

## 🎉 Next Steps

After deployment:
1. **Test all features**: AI Wizard, campaign creation, exports
2. **Add custom domain** (optional): Railway → Settings → Networking
3. **Monitor logs**: Railway dashboard → Deployments → Logs
4. **Share your app**: Send frontend URL to your team

---

## 📞 Need Help?

**Railway Documentation**: https://docs.railway.app  
**Railway Discord**: https://discord.gg/railway  
**Our Docs**: See `DEPLOYMENT.md` for more options

---

**Your app should now be live on Railway!** 🚀

Frontend: `https://kult-frontend.up.railway.app`  
Backend: `https://kult-backend.up.railway.app`
