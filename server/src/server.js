import './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import reportRoutes from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ],
  credentials: true
}));

app.use(express.json());

// Public health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Nilkanth Clinic API',
    doctor: 'Dr. Jignesh Chauhan (B.A.M.S.)',
    timestamp: new Date()
  });
});

// Auth routes (login is public, /me and /change-password use requireAuth internally)
app.use('/api/auth', authRoutes);

// Protected routes: all /api routes except /api/health and /api/auth/login require auth
app.use('/api/patients', requireAuth, patientRoutes);
app.use('/api/reports', requireAuth, reportRoutes);

// Serve built frontend assets
app.use(express.static(clientDistPath));

// SPA Fallback: Any non-API route serves the frontend index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Nilkanth Clinic server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
