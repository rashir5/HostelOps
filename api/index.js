const app = require('../backend/src/app');
const connectDB = require('../backend/src/config/database');

// Serverless handler for Vercel
module.exports = async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({
        success: false,
        message: 'MONGODB_URI is missing in Vercel Environment Variables. Add MONGODB_URI in Vercel Dashboard Settings -> Environment Variables.',
      });
    }
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless DB Error:', error);
    return res.status(500).json({
      success: false,
      message: `Database connection failed: ${error.message}`,
      error: error.message,
    });
  }
};
