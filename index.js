const functions = require('firebase-functions');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.production') });

// Set environment variables for Firebase Functions
process.env.EMAIL_USER = process.env.EMAIL_USER || 'stevenbrown99891@gmail.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'dbuf xdsq wicq tlky';
process.env.API_SECRET = process.env.API_SECRET || 'dcent-secret-key-2025';
process.env.NODE_ENV = 'production';

const app = require('./server');

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
