# 🏏 Cricket Turf - Quick Setup Guide

## ✅ Project Structure Complete!

Your project has been successfully organized into:
- **`frontend/`** - React + TypeScript + Vite application
- **`backend/`** - Node.js + Express + MongoDB Atlas server

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

Open a terminal and run:

```bash
# Install all dependencies (frontend + backend)
npm run install:all
```

Or install separately:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### Step 2: Start the Backend

**Option A: Using batch file (Windows)**
- Double-click `start-backend.bat`

**Option B: Using terminal**
```bash
cd backend
npm run dev
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:5000
```

### Step 3: Start the Frontend

**Option A: Using batch file (Windows)**
- Double-click `start-frontend.bat`

**Option B: Using terminal**
```bash
cd frontend
npm run dev
```

The app will open at: **http://localhost:5173**

---

## 🎯 What's Configured

### ✅ MongoDB Atlas Cloud Database
- **No local MongoDB installation needed!**
- Connection string already configured in `backend/.env`
- Database: `cricket-turf`
- Cluster: MongoDB Atlas (cloud)

### ✅ Environment Variables

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://vijayghelot2510_db_user:cricket_turf-v1@cluster0.ucoqzh1.mongodb.net/cricket-turf?retryWrites=true&w=majority&appName=Cluster0
```

---

## 📁 Project Structure

```
cricket-turf/
│
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── MatchSetupForm.tsx
│   │   │   ├── LiveScoring.tsx
│   │   │   └── *.css
│   │   ├── services/           # API calls
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx
│   │   └── index.css           # Design system
│   ├── package.json
│   └── .env
│
├── backend/                     # Express Backend
│   ├── models/                 # MongoDB schemas
│   │   └── Match.js
│   ├── routes/                 # API routes
│   │   └── matches.js
│   ├── server.js               # Main server
│   ├── package.json
│   └── .env
│
├── start-backend.bat           # Quick start scripts
├── start-frontend.bat
├── package.json                # Root package with scripts
└── README.md                   # Full documentation
```

---

## 🎮 Using the App

### 1. Create a Match
- Enter overs per innings (e.g., 5, 10, 20)
- Add Team 1 name and players (comma-separated)
- Add Team 2 name and players (comma-separated)
- Click "🚀 Start Match"

### 2. Live Scoring
- Click run buttons: **0, 1, 2, 3, 4, 6**
- Record extras: **Wide**, **No Ball**
- Record wickets: **Wicket** button
- Watch scores update in real-time!

### 3. Match Completion
- Innings auto-switches after overs complete
- Match ends after 2nd innings
- Winner declared automatically

---

## 🔧 Available Scripts

From the **root directory**:

```bash
# Install all dependencies
npm run install:all

# Start frontend dev server
npm run dev:frontend

# Start backend dev server
npm run dev:backend

# Build frontend for production
npm run build:frontend
```

---

## ✨ Features Implemented

✅ Match setup with teams and players  
✅ Ball-by-ball scoring  
✅ Automatic over calculation  
✅ Extras tracking (wides, no balls)  
✅ Wicket recording  
✅ Innings management  
✅ Match result calculation  
✅ Beautiful responsive UI  
✅ Real-time score updates  
✅ MongoDB Atlas cloud database  

---

## 🐛 Troubleshooting

### Backend won't start
- Check internet connection (MongoDB Atlas requires internet)
- Verify `backend/.env` has correct MongoDB URI
- Ensure port 5000 is not in use

### Frontend can't connect to backend
- Make sure backend is running first
- Check `frontend/.env` has `VITE_API_URL=http://localhost:5000/api`
- Verify no CORS errors in browser console

### MongoDB connection error
- Check internet connection
- Verify MongoDB Atlas credentials in `backend/.env`
- Check MongoDB Atlas dashboard for cluster status

---

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matches` | Create new match |
| GET | `/api/matches` | Get all matches |
| GET | `/api/matches/:id` | Get specific match |
| POST | `/api/matches/:id/ball` | Record a ball |
| DELETE | `/api/matches/:id` | Delete match |

**Health Check**: http://localhost:5000/health

---

## 🎨 Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- CSS3 with custom design system
- Modern dark theme with animations

**Backend:**
- Node.js + Express.js
- MongoDB Atlas (cloud database)
- Mongoose ODM
- RESTful API

---

## 🚀 Next Steps

1. **Test the app**: Create a match and try scoring!
2. **Customize**: Modify colors in `frontend/src/index.css`
3. **Extend**: Add new features from the roadmap in README.md

---

## 📖 Full Documentation

See **README.md** for complete documentation including:
- Detailed API documentation
- Database schema
- Future enhancements roadmap
- Contributing guidelines

---

**Happy Scoring! 🏏**

Built with ❤️ for cricket enthusiasts
