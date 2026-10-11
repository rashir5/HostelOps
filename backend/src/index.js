const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`HostelOps Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

startServer();
