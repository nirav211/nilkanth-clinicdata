import '../config/env.js';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';

function promptHidden(query) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
      return;
    }

    process.stdout.write(query);
    let input = '';

    const onData = (chunk) => {
      const str = chunk.toString();
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === '\n' || c === '\r' || c === '\u0004') {
          process.stdin.removeListener('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          return resolve(input);
        } else if (c === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (c === '\b' || c === '\x7f') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function run() {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
    let user = await User.findOne({ email: adminEmail });

    if (!user) {
      // Find any user if email differed
      user = await User.findOne();
    }

    if (!user) {
      console.error('No user found in database. Run "npm run seed" first.');
      await disconnectDB();
      process.exit(1);
    }

    const newPassword = await promptHidden('Enter new password (minimum 10 characters): ');

    if (!newPassword || newPassword.length < 10) {
      console.error('Password must be at least 10 characters.');
      await disconnectDB();
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    console.log('Password updated successfully.');

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Password reset failed:', err.message);
    await disconnectDB();
    process.exit(1);
  }
}

run();

