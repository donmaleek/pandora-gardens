/**
 * MPesa Daraja API Integration Module
 * (Corrected version with proper model import)
 */

const express = require("express");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const Payment = require('../models/Payment'); // Added correct import

// 1. Configuration Management =================================================
const config = {
  mpesa: {
    shortCode: process.env.MPESA_SHORT_CODE,
    passkey: process.env.MPESA_PASSKEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    baseUrl: process.env.MPESA_API_BASE,
    callbackUrl: process.env.MPESA_CALLBACK_URL,
    tokenTTL: 3500,
  },
  validation: {
    phoneRegex: /^254(7\d{8}|1\d{8})$/,
  },
};

// 2. Rate Limiting Middleware =================================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  handler: (req, res) => {
    res.status(429).json({ 
      status: "error", 
      message: "Too many requests, try again later" 
    });
  },
});

// 3. Request Validation =======================================================
const validateSTKRequest = [
  body("phone").matches(config.validation.phoneRegex),
  body("amount").isFloat({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "error", errors: errors.array() });
    }
    next();
  },
];

// 4. Asynchronous Error Handling Wrapper ======================================
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// 5. Secure Token Management ==================================================
let tokenCache = null;

const getAccessToken = async () => {
  if (tokenCache && moment().isBefore(tokenCache.expires)) {
    return tokenCache.token;
  }
  try {
    const authString = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const { data } = await axios.get(
      `${config.mpesa.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${authString}` },
        timeout: 10000,
      }
    );

    tokenCache = {
      token: data.access_token,
      expires: moment().add(config.mpesa.tokenTTL, "seconds"),
    };
    return tokenCache.token;
  } catch (error) {
    throw new Error("MPesa service unavailable");
  }
};

// 6. STK Push Payment Request ================================================
const stkPush = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!/^2547\d{8}$/.test(phone)) {
      return res.status(400).json({ 
        error: "Invalid phone number format. Use 2547XXXXXXXX" 
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        error: "Amount must be a valid positive number" 
      });
    }

    const accessToken = await getAccessToken();
    const stkPushUrl = `${config.mpesa.baseUrl}/mpesa/stkpush/v1/processrequest`;

    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${config.mpesa.shortCode}${config.mpesa.passkey}${timestamp}`
    ).toString("base64");

    const stkPushPayload = {
      BusinessShortCode: config.mpesa.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: parseInt(amount),
      PartyA: phone,
      PartyB: config.mpesa.shortCode,
      PhoneNumber: phone,
      CallBackURL: config.mpesa.callbackUrl,
      AccountReference: "Pandora Gardens",
      TransactionDesc: "Payment for services",
    };

    console.log("STK Push Request Payload:", stkPushPayload);

    const response = await axios.post(stkPushUrl, stkPushPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("STK Push Response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("STK Push Error Response:", error.response?.data || error.message);
    res.status(400).json({
      error: error.response?.data || "MPesa STK Push request failed",
    });
  }
};

// 7. API Routes ==============================================================
router.post("/stk-push", apiLimiter, validateSTKRequest, asyncHandler(stkPush));

router.post("/callback", asyncHandler(async (req, res) => {
  const { Body: { stkCallback: callback } } = req.body;

  console.log("STK Callback Received:", callback);

  if (callback.ResultCode === 0) {
    await Payment.findOneAndUpdate(
      { checkoutRequestId: callback.CheckoutRequestID },
      { status: "Completed" }
    );
  }

  res.json({ ResultCode: 0, ResultDesc: "Success" });
}));

// Replace the existing /history endpoint with this:
router.get("/history/:phone", asyncHandler(async (req, res) => {
  const { phone } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    collation: { locale: 'en' }
  };

  const [results, total] = await Promise.all([
    Payment.find({ phone })
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit)
      .exec(),
    Payment.countDocuments({ phone })
  ]);

  res.json({
    status: "success",
    data: results,
    total,
    page: options.page,
    limit: options.limit,
    totalPages: Math.ceil(total / options.limit)
  });
}));

router.get("/health", asyncHandler(async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "operational",
    services: {
      database: dbStatus,
      mpesa: tokenCache ? "authenticated" : "unauthenticated",
    },
  });
}));

module.exports = router;