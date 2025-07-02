require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const connectDB = require("./config/db");
const cl1pRoutes = require("./routes/cl1p");
const cors = require('cors')
require("./jobs/cleanup");

const app = express();

// Security middleware - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(
    cors({
      origin: ['http://localhost:3000', 'https://www.cl1p.in', 'https://cl1p.in', 'https://cl1p.in/api', 'https://api.cl1p.in'], // Allow these origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow these HTTP methods
      allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
      credentials: true, // Allow cookies or credentials
    })
  );

// Rate limiting configuration
const globalCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20000, // x requests per day globally
  message: {
    status: "error",
    message: "Global create limit exceeded. Please try again tomorrow."
  },
  keyGenerator: (req) => 'global', // Same key for everyone
  standardHeaders: true,
  legacyHeaders: false,
});

const perIPCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 10 requests per day per IP
  message: {
    status: "error", 
    message: "Too many create requests from this IP, please try again tomorrow."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request size limits
app.use(bodyParser.json({ limit: '30mb' }));
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request validation middleware
app.use((req, res, next) => {
  // Validate Content-Type for POST requests
  if (req.method === 'POST' && req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({
      status: "error",
      message: "Content-Type must be application/json"
    });
  }
  next();
});

// Apply rate limiting to create routes (both limiters)
app.use("/api/cl1p/create", globalCreateLimiter, perIPCreateLimiter);
app.use("/api/cl1p/upload", globalCreateLimiter, perIPCreateLimiter);

// No rate limiting for read/search routes
app.use("/api/cl1p", cl1pRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found"
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Connect to database
connectDB();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
