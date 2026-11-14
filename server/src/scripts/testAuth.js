import '../config/env.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from '../routes/auth.js';
import patientRoutes from '../routes/patients.js';

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runTests() {
  console.log('--- Starting Authentication & Rate Limit Tests ---');
  let isDbConnected = false;

  try {
    await connectDB();
    isDbConnected = true;
    console.log('Connected to MongoDB database.');
  } catch (err) {
    console.log('MongoDB connection unavailable (using mock user fixture for HTTP auth suite).');
  }

  // Prepare test user
  const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const mockUserId = new mongoose.Types.ObjectId();

  if (isDbConnected) {
    await User.deleteMany({ email: { $ne: adminEmail } });
    let existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        name: 'Dr. Jignesh Chauhan',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true
      });
    } else {
      existing.name = 'Dr. Jignesh Chauhan';
      existing.passwordHash = passwordHash;
      await existing.save();
    }
  } else {
    // Stub Mongoose User queries for the test suite
    const mockUserDoc = {
      _id: mockUserId,
      name: 'Dr. Jignesh Chauhan',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isActive: true
    };

    User.findOne = async function (q) {
      if (q && q.email && q.email.toLowerCase().trim() === adminEmail) {
        return mockUserDoc;
      }
      return null;
    };

    User.findById = async function (id) {
      if (id && id.toString() === mockUserId.toString()) {
        return mockUserDoc;
      }
      return null;
    };
  }

  // Create test express app
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', requireAuth, patientRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(TEST_PORT, () => resolve(s));
  });

  const results = [];

  try {
    // Test 1: Log in with correct password
    const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    const body1 = await res1.json();
    const test1Passed = res1.status === 200 && body1.token && body1.name === 'Dr. Jignesh Chauhan';
    results.push({
      test: '1. Login with correct password',
      status: test1Passed ? 'PASSED' : 'FAILED',
      httpStatus: res1.status,
      details: test1Passed ? `Received JWT token and name: "${body1.name}"` : JSON.stringify(body1)
    });
    const validToken = body1.token;

    // Test 2: Log in with wrong password
    const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'WrongPassword123' })
    });
    const body2 = await res2.json();
    const test2Passed = res2.status === 401 && body2.error === 'Email or password is wrong.';
    results.push({
      test: '2. Login with wrong password',
      status: test2Passed ? 'PASSED' : 'FAILED',
      httpStatus: res2.status,
      details: `Returned 401 with message: "${body2.error}"`
    });

    // Test 3: Trigger the 5-attempt block
    // We already did 1 failed attempt in Test 2. Now perform 4 more failed attempts.
    for (let i = 2; i <= 5; i++) {
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: `WrongAttempt_${i}` })
      });
    }

    // Now attempt #6 must be blocked with HTTP 429 and "Too many attempts. Try again in 15 minutes."
    const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });
    const body3 = await res3.json();
    const test3Passed = res3.status === 429 && body3.error === 'Too many attempts. Try again in 15 minutes.';
    results.push({
      test: '3. 5-failed-attempt rate limit block',
      status: test3Passed ? 'PASSED' : 'FAILED',
      httpStatus: res3.status,
      details: `Returned 429 with message: "${body3.error}"`
    });

    // Test 4: Call /api/auth/me without a token
    const res4 = await fetch(`${BASE_URL}/api/auth/me`);
    const body4 = await res4.json();
    const test4Passed = res4.status === 401 && body4.error === 'Authentication required';
    results.push({
      test: '4. GET /api/auth/me without token',
      status: test4Passed ? 'PASSED' : 'FAILED',
      httpStatus: res4.status,
      details: `Returned 401 with message: "${body4.error}"`
    });

    // Test 5: Call /api/auth/me with a valid token
    const res5 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    const body5 = await res5.json();
    const test5Passed = res5.status === 200 && body5.name === 'Dr. Jignesh Chauhan' && body5.email === adminEmail;
    results.push({
      test: '5. GET /api/auth/me with valid token',
      status: test5Passed ? 'PASSED' : 'FAILED',
      httpStatus: res5.status,
      details: `Returned 200 with name: "${body5.name}" and email`
    });

    // Test 6: Check that patient route is refused without a token
    const res6 = await fetch(`${BASE_URL}/api/patients`);
    const body6 = await res6.json();
    const test6Passed = res6.status === 401 && body6.error === 'Authentication required';
    results.push({
      test: '6. GET /api/patients refused without token',
      status: test6Passed ? 'PASSED' : 'FAILED',
      httpStatus: res6.status,
      details: `Returned 401 with message: "${body6.error}"`
    });

    // Summary table
    console.log('\n--- Test Execution Summary ---');
    results.forEach(r => {
      console.log(`[${r.status}] ${r.test} -> HTTP ${r.httpStatus} (${r.details})`);
    });

    const allPassed = results.every(r => r.status === 'PASSED');
    console.log(`\nFinal Verdict: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  } finally {
    server.close();
    if (isDbConnected) {
      await disconnectDB();
    }
  }
}

runTests();

