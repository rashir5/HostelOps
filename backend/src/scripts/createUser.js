const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

async function createUser() {
  const name = process.env.NEW_USER_NAME;
  const email = process.env.NEW_USER_EMAIL;
  const password = process.env.NEW_USER_PASSWORD;
  const role = process.env.NEW_USER_ROLE;

  if (!name || !email || !password || !role) {
    console.error('Error: Missing required environment variables (NEW_USER_NAME, NEW_USER_EMAIL, NEW_USER_PASSWORD, NEW_USER_ROLE)');
    process.exit(1);
  }

  const validRoles = ['student', 'warden', 'admin', 'mentor', 'guard'];
  if (!validRoles.includes(role)) {
    console.error(`Error: Invalid role "${role}". Allowed roles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    console.error(`Error: User with email "${cleanEmail}" already exists. Refusing to overwrite.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    role,
    isActive: true
  });

  console.log(`Success: User created with ID: ${user._id}, Role: ${user.role}, Email: ${user.email}`);
  await mongoose.disconnect();
}

createUser().catch(err => {
  console.error('Failed to create user:', err.message);
  process.exit(1);
});
