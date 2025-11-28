const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('../server/config/logger');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const app = express();

// Middleware - Compression first for best performance
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Balance between compression ratio and speed
}));

app.use(helmet({
    contentSecurityPolicy: false, // Disable for Vercel
}));

// Dynamic CORS configuration for network access
const whitelistFromEnv = (process.env.CORS_WHITELIST || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        // Allow server-to-server / curl / same-origin requests
        if (!origin) {
            return callback(null, true);
        }

        // Allow explicit whitelist from env
        if (whitelistFromEnv.includes(origin)) {
            return callback(null, true);
        }

        // Allow localhost with any port
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        // Allow private network ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (
            /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
            /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
            /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
        ) {
            return callback(null, true);
        }

        // Allow Vercel deployments
        if (origin.includes('vercel.app')) {
            return callback(null, true);
        }

        logger.warn(`CORS: allowing unlisted origin ${origin}`);
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (basic)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000 requests per window
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// HTTP request logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Debug environment variables (do not log secrets)
logger.info('JWT_SECRET loaded: %s', process.env.JWT_SECRET ? 'Yes' : 'No');
logger.info('Running in Vercel serverless mode');

// Initialize database
const { syncDatabase } = require('../server/models');
syncDatabase();

// Routes
app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/debtors', require('../server/routes/debtors'));
app.use('/api/credits', require('../server/routes/credits'));
app.use('/api/collaterals', require('../server/routes/collaterals'));
app.use('/api/insurances', require('../server/routes/insurances'));
app.use('/api/insurance-claims', require('../server/routes/insurance-claims'));
app.use('/api/payments', require('../server/routes/payments'));
app.use('/api/dashboard', require('../server/routes/dashboard'));
app.use('/api/notifications', require('../server/routes/notifications'));
app.use('/api/reports', require('../server/routes/reports'));
app.use('/api/users', require('../server/routes/users'));
app.use('/api/document-templates', require('../server/routes/document-templates'));
app.use('/api/documents', require('../server/routes/documents'));
app.use('/api/audit', require('../server/routes/audit'));
app.use('/api/ai', require('../server/routes/ai'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SIMKA Server is running on Vercel',
        timestamp: new Date().toISOString(),
        environment: 'serverless'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack || err.message, { error: err });
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Export the Express app as a serverless function
module.exports = app;
