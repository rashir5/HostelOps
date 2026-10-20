const mongoose = require('mongoose');

const connectDB = async () => {
  // If already connected or connecting, reuse connection (essential for Vercel serverless)
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDB;
