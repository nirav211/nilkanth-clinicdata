import '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Payment } from '../models/index.js';

async function sanitize() {
  await connectDB();
  const res = await Payment.updateMany(
    { $or: [{ mode: { $exists: false } }, { mode: null }] },
    { $set: { mode: 'cash' } }
  );
  console.log('Legacy payments updated to mode cash:', res.modifiedCount);
  await disconnectDB();
  process.exit(0);
}

sanitize().catch(err => {
  console.error(err);
  process.exit(1);
});
