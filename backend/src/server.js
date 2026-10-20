require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const User = require('./models/User.model');
    await User.updateOne({ email: 'warden@spit.ac.in' }, { $set: { name: 'Ramesh Kulkarni' } });

    app.listen(PORT, () => {
      console.log(`\n🚀  Server running at http://localhost:${PORT}`);
      console.log(`📦  Environment: ${process.env.NODE_ENV}`);
      console.log(`🗄️   Database: ${process.env.MONGODB_URI}\n`);
    });
  } catch (error) {
    console.error('❌  Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
