import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { PORT, CLIENT_URL, NODE_ENV } from './config/constants.js';
import { connectDB } from './config/db.js';
import { bootstrapAdminAndWorkspace } from './utils/bootstrap.js';
import { initSocket } from './sockets/socketHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mongoSanitizeMiddleware } from './middleware/sanitize.js';

// Import route modules
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO
initSocket(httpServer);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration for REST APIs
const allowedOrigins =
  NODE_ENV === 'production'
    ? [CLIENT_URL]
    : [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow localhost/127.0.0.1 origins or requests with no origin
      if (!origin || NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body and Cookie parsers (Payload capped at 2mb to prevent memory exhaustion DoS)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Prevent NoSQL Query Injection by stripping $ and . from req.body, req.query, req.params
app.use(mongoSanitizeMiddleware);

// Global API Rate Limiter: 300 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.'
  }
});
app.use('/api/', globalLimiter);

// Rate limit on login route: 5 attempts per 1 minute in production, generous in development
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: NODE_ENV === 'production' ? 5 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Maximum 5 attempts per minute. Please try again later.'
  }
});
app.use('/api/auth/login', loginLimiter);

// Strict rate limit on password reset / forgot-password: 3 requests per 1 hour per IP
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Maximum 3 attempts per hour. Please try again later.'
  }
});
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

// Stricter rate limit on sensitive authentication operations (password change, account deletion)
const sensitiveAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sensitive operations requested. Please try again after 15 minutes.'
  }
});
app.use('/api/auth/change-password', sensitiveAuthLimiter);
app.use('/api/auth/account', sensitiveAuthLimiter);

// Search query rate limiter to prevent database exhaustion
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search requests. Please slow down.'
  }
});
app.use('/api/search', searchLimiter);

// Health check (Minimal payload without disclosing internal environment or tech stack)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await bootstrapAdminAndWorkspace();

    httpServer.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`🚀 TeamspaceX Backend running on port ${PORT}`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(`🌐 Configured client URL: ${CLIENT_URL}`);
      console.log(`=========================================`);
    });
  } catch (err: any) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
};

startServer();

export { app, httpServer };
