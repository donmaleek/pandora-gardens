/**
 * server.js - Main entry point for the Pandora Gardens Backend API
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const authRouter = require('./routes/authRoutes');
const emailRouter = require('./routes/emailRoutes'); // ✅ Email Routes

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`🔥 Critical: Missing ${varName} environment variable`);
    process.exit(1);
  }
});

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected with Production Settings'))
  .catch((err) => {
    console.error('❌ Critical Database Connection Failure:', err);
    process.exit(1);
  });

mongoose.connection.on('connected', () => {
  console.log('💾 MongoDB Connection State: Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 MongoDB Connection Error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB Connection State: Disconnected');
});

app.get('/api/test', (req, res) => {
  res.json({ message: "Route test successful!" });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/emails', emailRouter); // ✅ Email route registration

app.get('/', (req, res) => {
  res.send('🏡 Engineer, Welcome to Pandora Gardens Backend API \n');
});

app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found'
  });
});

app.use((err, req, res, next) => {
  console.error('🚨 Error:', err);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Engineer, Server is running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
