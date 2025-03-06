/**
 * server.js - Main entry point for the Pandora Gardens Backend API
 * @module server
 * @requires express
 * @requires dotenv
 * @requires cors
 * @requires mongoose
 */

// ----------------------------
// Section 0: Environment Validation
// ----------------------------

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
  
  // Environment validation
  const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`🔥 Critical: Missing ${varName} environment variable`);
      process.exit(1);
    }
  });

// ----------------------------
// Section 1: Package Imports
// ----------------------------

/**
 * Core dependencies for application setup
 * @namespace ExternalPackages
 */
const express = require('express'); // Express framework for building REST APIs
const dotenv = require('dotenv');   // Environment variables loader
const cors = require('cors');       // Cross-Origin Resource Sharing middleware
const mongoose = require('mongoose'); // MongoDB object modeling tool

// ----------------------------
// Section 2: Environment Setup
// ----------------------------

/**
 * Configures environment variables from .env file
 * @function config
 * @memberof ExternalPackages.dotenv
 */
dotenv.config();

// ----------------------------
// Section 3: Express Application
// ----------------------------

/**
 * Main Express application instance
 * @type {express.Application}
 * @constant
 */
const app = express();

// ----------------------------
// Section 4: Middleware Configuration
// ----------------------------

/**
 * CORS configuration to handle cross-origin requests
 * @memberof ExternalPackages.cors
 * @function
 */
app.use(cors());

/**
 * JSON payload parser for incoming requests
 * @memberof ExternalPackages.express.json
 * @function
 */
app.use(express.json());

// ----------------------------
// Section 5: Production Database Connection
// ----------------------------

/**
 * MongoDB production connection handler
 * @async
 * @function connect
 * @memberof ExternalPackages.mongoose
 * @param {string} process.env.MONGO_URI - MongoDB connection URI
 * @see {@link module:config/db} for detailed connection configuration
 */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected with Production Settings');
    console.log(`   Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  })
  .catch((err) => {
    console.error('❌ Critical Database Connection Failure:', err);
    process.exit(1); // Exit process on initial connection failure
  });

// ----------------------------
// Section 6: API Routes
// ----------------------------

/**
 * Root endpoint for API health check
 * @name GET /
 * @function
 * @memberof module:server
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 */
app.get('/', (req, res) => {
  res.send('🏡 Welcome to Pandora Gardens Backend API');
});

// ----------------------------
// Section 7: Server Initialization
// ----------------------------

/**
 * Server configuration values
 * @constant {Object}
 * @property {number} PORT - Server port from environment variables or default 5000
 */
const PORT = process.env.PORT || 5000;

/**
 * Starts Express server
 * @function listen
 * @memberof ExternalPackages.express.Application
 * @param {number} PORT - Port number to listen on
 * @param {function} callback - Server startup callback
 */
app.listen(PORT, () => {
  console.log(`🚀 Engineer, Server is running on port ${PORT}`);
});