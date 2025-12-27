# 🏏 Cricket Turf - Live Match Scoring App

A beautiful, fast, and mobile-friendly cricket scoring application designed for **friendly turf matches** among groups of friends.

![Cricket Turf App](https://img.shields.io/badge/Status-MVP-green) ![Tech Stack](https://img.shields.io/badge/Stack-MERN-blue)

---

## ✨ Features

### Phase 1 (MVP) - ✅ Complete

- **Match Setup**
  - Configure team names
  - Add players for each team
  - Set overs per innings (1-50)

- **Live Scoring**
  - Ball-by-ball scoring interface
  - Record runs (0, 1, 2, 3, 4, 6)
  - Track extras (Wides, No Balls)
  - Record wickets
  - Automatic over calculation
  - Real-time score updates

- **Innings Management**
  - Automatic innings switching
  - Match completion detection
  - Result calculation

- **Match Results**
  - Winner declaration
  - Victory margin (runs/wickets)
  - Match tied detection
  - Full innings summary

---

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for blazing fast development
- **CSS3** with modern design system
- Responsive mobile-first design

### Backend
- **Node.js** with Express.js
- **MongoDB** for data persistence
- RESTful API architecture

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**

**Note:** MongoDB Atlas is already configured - no local MongoDB installation needed!

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd cricket-turf
```

### 2. Install Dependencies

#### Frontend
```bash
cd frontend
npm install
cd ..
```

#### Backend
```bash
cd backend
npm install
cd ..
```

### 3. Environment Configuration

The project is already configured with MongoDB Atlas cloud database.

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://vijayghelot2510_db_user:cricket_turf-v1@cluster0.ucoqzh1.mongodb.net/cricket-turf?retryWrites=true&w=majority&appName=Cluster0
```

### 4. Start the Application

#### Option 1: Using Batch Files (Windows)
- Double-click `start-backend.bat` to start the backend
- Double-click `start-frontend.bat` to start the frontend

#### Option 2: Manual Start

**Start Backend Server** (Terminal 1)
```bash
cd backend
npm run dev
```

The server will start on `http://localhost:5000`

**Start Frontend** (Terminal 2)
```bash
cd frontend
npm run dev
```

The app will open on `http://localhost:5173`

---

## 📱 Usage

### Creating a Match

1. Enter **Overs per Innings** (e.g., 5, 10, 20)
2. Enter **Team 1 Name** (e.g., "Warriors")
3. Add **Team 1 Players** (comma-separated: "John, Mike, Sarah")
4. Enter **Team 2 Name** (e.g., "Titans")
5. Add **Team 2 Players** (comma-separated: "Emma, David, Chris")
6. Click **"🚀 Start Match"**

### Live Scoring

- **Record Runs**: Click buttons 0, 1, 2, 3, 4, or 6
- **Wide Ball**: Click "Wide" (adds 1 run, doesn't count as legal ball)
- **No Ball**: Click "No Ball" (adds 1 run, doesn't count as legal ball)
- **Wicket**: Click "Wicket" (counts as legal ball)

The app automatically:
- Calculates overs (6 legal balls = 1 over)
- Updates scores and statistics
- Switches innings when overs complete or all wickets fall
- Declares match result

---

## 🗂️ Project Structure

```
cricket-turf/
├── frontend/                # Frontend application
│   ├── src/                # React source code
│   │   ├── components/     # React components
│   │   │   ├── MatchSetupForm.tsx
│   │   │   ├── MatchSetupForm.css
│   │   │   ├── LiveScoring.tsx
│   │   │   └── LiveScoring.css
│   │   ├── services/       # API service layer
│   │   │   └── api.ts
│   │   ├── types/          # TypeScript types
│   │   │   └── match.ts
│   │   ├── App.tsx         # Main app component
│   │   ├── App.css
│   │   ├── index.css       # Design system
│   │   └── main.tsx
│   ├── public/             # Static assets
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env
├── backend/                # Backend application
│   ├── models/             # MongoDB models
│   │   └── Match.js
│   ├── routes/             # API routes
│   │   └── matches.js
│   ├── server.js           # Express server
│   ├── package.json
│   └── .env
├── start-backend.bat       # Windows: Start backend
├── start-frontend.bat      # Windows: Start frontend
├── .gitignore
└── README.md
```

---

## 🎨 Design Features

- **Modern Dark Theme** with cricket-themed green and orange accents
- **Smooth Animations** for enhanced user experience
- **Glassmorphism Effects** on cards
- **Responsive Design** - works perfectly on mobile and desktop
- **Inter Font** from Google Fonts for premium typography
- **Gradient Buttons** with hover effects
- **Real-time Visual Feedback** on ball recording

---

## 🔌 API Endpoints

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/matches` | Create a new match |
| GET | `/api/matches` | Get all matches |
| GET | `/api/matches/:id` | Get specific match |
| POST | `/api/matches/:id/ball` | Record a ball |
| DELETE | `/api/matches/:id` | Delete a match |

### Example: Record a Ball

```javascript
POST /api/matches/:id/ball
{
  "runs": 4,
  "isWide": false,
  "isNoBall": false,
  "isWicket": false
}
```

---

## 📊 Database Schema

### Match Collection

```javascript
{
  oversPerInnings: Number,
  teams: [String, String],
  players: Map<String, [String]>,
  currentInnings: Number,
  battingTeam: String,
  bowlingTeam: String,
  status: 'not_started' | 'in_progress' | 'completed',
  innings: [{
    inningsNumber: Number,
    battingTeam: String,
    bowlingTeam: String,
    runs: Number,
    wickets: Number,
    overs: Number,
    balls: Number,
    extras: { wides: Number, noBalls: Number },
    ballByBall: [Ball]
  }],
  result: {
    winner: String,
    margin: String,
    isDraw: Boolean
  },
  createdAt: Date
}
```

---

## 🚧 Future Enhancements (Phase 2+)

- [ ] Player-specific statistics (runs, wickets)
- [ ] Bowling analysis
- [ ] Match history and archives
- [ ] Live match sharing via URL
- [ ] PWA support for offline scoring
- [ ] Export scorecard as PDF
- [ ] Free hit logic for no balls
- [ ] Undo last ball
- [ ] Partnership tracking

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

Built with ❤️ for cricket enthusiasts

---

## 🐛 Troubleshooting

### MongoDB Connection Error

If you see "MongoDB connection error":
1. Check your internet connection (MongoDB Atlas is cloud-based)
2. Verify the connection string in `backend/.env` is correct
3. Ensure the database user credentials are valid

### Port Already in Use

If port 5000 or 5173 is already in use:
1. Change the port in `backend/.env` (backend)
2. Vite will automatically suggest another port for frontend

### API Connection Failed

If frontend can't connect to backend:
1. Ensure backend server is running (`cd backend && npm run dev`)
2. Check `VITE_API_URL` in `frontend/.env` matches your backend URL
3. Verify CORS is enabled in `backend/server.js`

---

**Enjoy scoring your cricket matches! 🏏**
