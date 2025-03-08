// routes/mpesaRoutes.js
const express = require('express');
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const router = express.Router();

// Validate environment variables on startup
const requiredMpesaVars = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORT_CODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL',
  'MPESA_API_BASE'
];

requiredMpesaVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`🔥 MPesa Critical: Missing ${varName} environment variable`);
    process.exit(1);
  }
});

// Security middleware for Daraja requests
const darajaAuth = async (req, res, next) => {
  try {
    console.log('🕵️  Starting MPesa authentication...');
    req.mpesaToken = await getAccessToken();
    console.log('🔑 Obtained MPesa token:', req.mpesaToken?.slice(0, 15) + '...');
    next();
  } catch (error) {
    console.error('🔒 MPesa Auth Middleware Error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(503).json({
      status: 'error',
      code: 'SERVICE_UNAVAILABLE',
      message: 'Failed to authenticate with MPesa service',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Enhanced access token handler with debugging
let tokenCache = null;
const getAccessToken = async () => {
  if (tokenCache && moment().isBefore(tokenCache.expires)) {
    console.log('♻️  Using cached token');
    return tokenCache.token;
  }

  try {
    console.log('🔐 Generating new MPesa token...');
    const authString = `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`;
    const auth = Buffer.from(authString).toString('base64');
    
    console.log('🌐 Calling MPesa auth endpoint:', process.env.MPESA_API_BASE);
    const response = await axios.get(
      `${process.env.MPESA_API_BASE}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { 
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      }
    );

    if (!response.data.access_token) {
      console.error('❌ Invalid token response:', response.data);
      throw new Error('Invalid response from MPesa auth endpoint');
    }

    tokenCache = {
      token: response.data.access_token,
      expires: moment().add(3500, 'seconds') // 58 minutes for safety
    };

    console.log('✅ New token generated, expires at:', tokenCache.expires.format());
    return tokenCache.token;

  } catch (error) {
    console.error('🔥 Full MPesa Auth Error:', {
      code: error.code,
      config: {
        url: error.config?.url,
        method: error.config?.method
      },
      response: {
        status: error.response?.status,
        data: error.response?.data
      },
      message: error.message
    });
    throw new Error('MPesa service unavailable: ' + (error.response?.data?.error || error.message));
  }
};

// STK Push with enhanced debugging
router.post('/stk-push', darajaAuth, async (req, res) => {
  try {
    console.log('🔄 Starting STK Push request:', req.body);
    
    // Validate input
    const { phone, amount } = req.body;
    if (!/^254[17]\d{8}$/.test(phone)) {
      console.warn('⚠️ Invalid phone format:', phone);
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_PHONE',
        message: 'Phone number must be in format 2547XXXXXXXX or 2541XXXXXXXX'
      });
    }

    if (isNaN(amount) || amount < 1) {
      console.warn('⚠️ Invalid amount:', amount);
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_AMOUNT',
        message: 'Amount must be a positive number'
      });
    }

    // Generate security components
    const timestamp = moment().format('YYYYMMDDHHmmss');
    console.log('🕒 Generated timestamp:', timestamp);
    
    const password = Buffer.from(
      `${process.env.MPESA_SHORT_CODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const signature = crypto.createHmac('sha256', process.env.MPESA_CONSUMER_SECRET)
      .update(JSON.stringify(req.body))
      .digest('base64');

    console.log('🔏 Generated security signature:', signature);

    const stkPayload = {
      BusinessShortCode: process.env.MPESA_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount),
      PartyA: phone,
      PartyB: process.env.MPESA_SHORT_CODE,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: 'Pandora Gardens',
      TransactionDesc: 'Monthly rent payment',
    };

    console.log('📤 STK Request Payload:', JSON.stringify(stkPayload, null, 2));

    const response = await axios.post(
      `${process.env.MPESA_API_BASE}/mpesa/stkpush/v1/processrequest`,
      stkPayload,
      {
        headers: {
          Authorization: `Bearer ${req.mpesaToken}`,
          'X-Signature': signature,
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: (status) => status < 500
      }
    );

    console.log('📥 STK Response:', JSON.stringify(response.data, null, 2));

    if (response.data.ResponseCode !== '0') {
      console.error('❌ MPesa API Error:', response.data);
      throw new Error(response.data.ResponseDescription);
    }

    console.log('💸 STK Push Initiated:', {
      phone: phone.replace(/\d(?=\d{4})/g, '*'),
      amount,
      reference: response.data.CheckoutRequestID
    });

    res.json({
      status: 'success',
      data: {
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        message: response.data.ResponseDescription
      }
    });

  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error('💥 STK Error:', {
      error: errorData,
      stack: error.stack,
      config: error.config
    });

    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      status: 'error',
      code: 'MPESA_API_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Payment processing failed' 
        : errorData.errorMessage || errorData,
      debug: process.env.NODE_ENV === 'development' ? {
        endpoint: `${process.env.MPESA_API_BASE}/mpesa/stkpush/v1/processrequest`,
        timestamp: moment().format()
      } : undefined
    });
  }
});

// Test endpoint with deep diagnostics
router.get('/test-auth', async (req, res) => {
  try {
    console.log('🔍 Running MPesa auth diagnostics...');
    const token = await getAccessToken();
    
    // Verify token validity
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    
    res.json({
      success: true,
      token: token.slice(0, 15) + '...',
      expires: decoded.exp,
      issuedAt: decoded.iat,
      environment: process.env.MPESA_API_BASE.includes('sandbox') ? 'sandbox' : 'production'
    });

  } catch (error) {
    console.error('🔧 Auth Test Failed:', {
      error: error.message,
      stack: error.stack,
      environment: process.env.MPESA_API_BASE
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostics: {
        timeSync: moment().format(),
        apiEndpoint: process.env.MPESA_API_BASE,
        credentialsExist: !!process.env.MPESA_CONSUMER_KEY && !!process.env.MPESA_CONSUMER_SECRET
      }
    });
  }
});

module.exports = router;