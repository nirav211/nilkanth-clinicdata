import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// In-memory failed attempts tracker: key -> { count: number, blockedUntil: number }
const loginAttempts = new Map();

function getClientKey(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'client';
  const email = (req.body?.email || '').toLowerCase().trim();
  return `${ip}_${email || 'general'}`;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, 'New password must be at least 10 characters.')
});

/**
 * POST /api/auth/login
 * Validates with zod, compares with bcrypt, returns 12h JWT + name.
 * Rate limited: blocks for 15 minutes after 5 failed attempts in a row.
 */
router.post('/login', async (req, res) => {
  const key = getClientKey(req);
  const now = Date.now();
  const attemptState = loginAttempts.get(key);

  // Check if blocked
  if (attemptState && attemptState.blockedUntil && attemptState.blockedUntil > now) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }

  // Helper to record failed attempt
  const recordFailedAttempt = () => {
    const current = loginAttempts.get(key);
    // If previous block expired, reset count to 1
    const count = (current && current.blockedUntil && current.blockedUntil <= now)
      ? 1
      : ((current?.count || 0) + 1);

    if (count >= 5) {
      loginAttempts.set(key, { count, blockedUntil: now + 15 * 60 * 1000 });
    } else {
      loginAttempts.set(key, { count, blockedUntil: 0 });
    }
  };

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    recordFailedAttempt();
    return res.status(401).json({ error: 'Email or password is wrong.' });
  }

  const { email, password } = parsed.data;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      recordFailedAttempt();
      return res.status(401).json({ error: 'Email or password is wrong.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      recordFailedAttempt();
      return res.status(401).json({ error: 'Email or password is wrong.' });
    }

    // Success: reset rate limit attempts
    loginAttempts.delete(key);

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      name: user.name
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Returns name and email of the logged-in user
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    name: req.user.name,
    email: req.user.email
  });
});

/**
 * POST /api/auth/change-password
 * Updates password with verification and minimum 10 characters validation
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid input.';
    return res.status(400).json({ error: issue });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is wrong.' });
    }

    req.user.passwordHash = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;

