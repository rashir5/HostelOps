const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const mongoose = require('mongoose');

function formatMongoUri(rawUri) {
  if (!rawUri) return rawUri;
  // Match mongodb:// or mongodb+srv:// credentials part before @host
  const match = rawUri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return rawUri;

  const [, prefix, user, pass, rest] = match;
  // Decode any already encoded characters to avoid double encoding, then encode cleanly
  const safeUser = encodeURIComponent(decodeURIComponent(user));
  const safePass = encodeURIComponent(decodeURIComponent(pass));

  return `${prefix}${safeUser}:${safePass}@${rest}`;
}

const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error('MONGODB_URI is not set in server/.env');
  }

  const uri = formatMongoUri(rawUri);

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
