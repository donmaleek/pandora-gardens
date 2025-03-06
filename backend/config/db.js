/**
 * @module config/db
 * @description Database configuration and connection handler with production optimizations
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Establishes MongoDB connection with production-ready settings
 * @async
 * @function connectDB
 * @param {number} [retries=3] - Connection attempt retries
 * @throws {Error} MongoDB connection error
 * 
 * @example
 * // Connection Options Explanation:
 * // maxPoolSize: Limit concurrent connections to prevent overload
 * // serverSelectionTimeoutMS: Faster failure detection
 * // socketTimeoutMS: Prevent hung connections
 * // family: Favor IPv4 for better DNS resolution
 */
const connectDB = async (retries = 3) => {
  const productionOptions = {
    maxPoolSize: 10,                // Optimal for medium workloads
    serverSelectionTimeoutMS: 5000, // 5s server selection timeout
    socketTimeoutMS: 45000,         // Close idle connections after 45s
    family: 4                       // Use IPv4, skip IPv6 if unavailable
  };

  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI, productionOptions);
      
      // Connection event listeners for production monitoring
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      console.log('✅ MongoDB connected successfully');
      console.log(`   Connection pool size: ${productionOptions.maxPoolSize}`);
      console.log(`   Timeout settings: ${productionOptions.serverSelectionTimeoutMS}ms server selection, ${productionOptions.socketTimeoutMS}ms socket`);
      
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection failed (${retries} retries left):`, error.message);
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  console.error('🔥 Critical: Failed to connect to MongoDB after multiple attempts');
  process.exit(1);
};

module.exports = connectDB;