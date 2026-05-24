const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/smartstore';

  try {
    const conn = await mongoose.connect(primaryUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000, // Fail fast in 2s if Atlas is blocked/unreachable
    });
    console.log(`✅ MongoDB Connected (Primary): ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB connection failed: ${error.message}`);
    console.log(`🔌 Attempting fallback to local MongoDB: ${fallbackUri}`);
    try {
      await mongoose.disconnect(); // Clear existing connection state
      const conn = await mongoose.connect(fallbackUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`✅ MongoDB Connected (Local Fallback): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`❌ Fallback MongoDB connection error: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
