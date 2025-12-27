---
description: Start the Cricket Turf application (frontend and backend)
---

# Starting the Cricket Turf Application

Follow these steps to run the complete application:

## Prerequisites

MongoDB Atlas is already configured in the backend. No local MongoDB installation needed!

## Steps

// turbo-all

1. **Start the Backend Server** (in first terminal)
```bash
cd backend
npm run dev
```
The backend will start on http://localhost:5000 and connect to MongoDB Atlas

2. **Start the Frontend** (in second terminal)
```bash
cd frontend
npm run dev
```
The frontend will start on http://localhost:5173

3. **Open the Application**
   - Navigate to http://localhost:5173 in your browser
   - The app should connect to the backend automatically

## Quick Start (Windows)

You can also use the batch files:
- Double-click `start-backend.bat` to start the backend
- Double-click `start-frontend.bat` to start the frontend

## Verification

- Backend health check: http://localhost:5000/health
- Should return: `{"status":"OK","timestamp":"..."}`

## Troubleshooting

- If MongoDB Atlas connection fails, check your internet connection
- If port 5000 is in use, change PORT in `backend/.env`
- If port 5173 is in use, Vite will suggest an alternative port
