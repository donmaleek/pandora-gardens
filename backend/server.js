/**
 * server.js - Main entry point for the Pandora Gardens Backend API
 * 
 * @module server
 * @requires express
 * @requires dotenv
 * @requires cors
 * @requires mongoose
 */

// ----------------------------
// Section 0: Package Imports
// ----------------------------

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const authRouter = require('./routes/authRoutes'); // 👈 Authentication routes

// ----------------------------
// Section 1: Environment Setup
// ----------------------------

// Load environment variables from .env in non-production environments
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`🔥 Critical: Missing ${varName} environment variable`);
    process.exit(1);
  }
});

// ----------------------------
// Section 2: Express Application Initialization
// ----------------------------

const app = express();

// ----------------------------
// Section 3: Middleware Configuration
// ----------------------------

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse incoming JSON requests
app.use(express.json());

// ----------------------------
// Section 4: Database Connection
// ----------------------------

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected with Production Settings'))
  .catch((err) => {
    console.error('❌ Critical Database Connection Failure:', err);
    process.exit(1);
  });

// MongoDB connection status logs
mongoose.connection.on('connected', () => {
  console.log('💾 MongoDB Connection State: Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 MongoDB Connection Error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB Connection State: Disconnected');
});

// ----------------------------
// Section 5: API Routes
// ----------------------------

/**
 * Test route to verify that the API is running.
 * Accessible via GET http://localhost:<PORT>/api/test
 */
app.get('/api/test', (req, res) => {
  res.json({ message: "Route test successful!" });
});

/**
 * Authentication routes.
 * All auth-related endpoints will be prefixed with /api/v1/auth
 */
app.use('/api/v1/auth', authRouter);

/**
 * Root route - API health check.
 * Accessible via GET http://localhost:<PORT>/
 */
app.get('/', (req, res) => {
  res.send('🏡 Engineer, Welcome to Pandora Gardens Backend API \n');
});

// ----------------------------
// Section 6: 404 Handler
// ----------------------------

/**
 * Handle unknown routes.
 * This will respond with a 404 for any unmatched routes.
 */
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found'
  });
});

// ----------------------------
// Section 7: Global Error Handler
// ----------------------------

/**
 * Centralized error handling middleware.
 * Catches any errors thrown in route handlers or middleware.
 */
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// ----------------------------
// Section 8: Server Initialization
// ----------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Engineer, Server is running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
