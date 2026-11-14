import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to server/.env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PORT',
  'CLIENT_URL',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

const missing = REQUIRED_ENV_VARS.filter(key => {
  const val = process.env[key];
  return val === undefined || val === null || val.trim() === '';
});

if (missing.length > 0) {
  console.error(`Missing in server/.env: ${missing.join(', ')}`);
  process.exit(1);
}

export default process.env;

