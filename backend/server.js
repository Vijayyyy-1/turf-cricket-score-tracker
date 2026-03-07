import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import matchRoutes from './routes/matches.js';
import playerRoutes from './routes/players.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io CORS configuration
// In production, restrict to specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'];  // Default to local dev

const io = new Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricket-turf';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', matchRoutes);
app.use('/api', playerRoutes);
app.use('/api', adminRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`✨ User connected: ${socket.id}`);

    // Join a match room for receiving live updates
    socket.on('join-match', (matchId) => {
        try {
            if (!matchId || typeof matchId !== 'string') {
                socket.emit('error', { message: 'Invalid match ID' });
                return;
            }
            socket.join(`match-${matchId}`);
            console.log(`📺 Socket ${socket.id} joined match room: match-${matchId}`);
        } catch (error) {
            console.error(`Error joining match: ${error.message}`);
            socket.emit('error', { message: 'Failed to join match' });
        }
    });

    // Leave a match room
    socket.on('leave-match', (matchId) => {
        try {
            if (!matchId || typeof matchId !== 'string') {
                return;
            }
            socket.leave(`match-${matchId}`);
            console.log(`📴 Socket ${socket.id} left match room: match-${matchId}`);
        } catch (error) {
            console.error(`Error leaving match: ${error.message}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`👋 User disconnected: ${socket.id}`);
    });

    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
