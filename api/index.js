const app = require('../server/server');

// Vercel Serverless Function handler
module.exports = (req, res) => {
    try {
        // Ensure the app handles the request
        return app(req, res);
    } catch (error) {
        console.error('API Handler Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
};
