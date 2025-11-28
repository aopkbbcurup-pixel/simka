/**
 * HTTP Caching Middleware
 * 
 * Adds appropriate caching headers to GET requests to improve performance.
 * Uses ETag for conditional requests and Cache-Control for browser caching.
 */

const crypto = require('crypto');

/**
 * Generate ETag from response body
 */
function generateETag(body) {
    return crypto
        .createHash('md5')
        .update(JSON.stringify(body))
        .digest('hex');
}

/**
 * Cache middleware for GET requests
 * 
 * @param {Object} options - Caching options
 * @param {number} options.maxAge - Max age in seconds (default: 300 = 5 minutes)
 * @param {boolean} options.private - Whether cache is private (default: false)
 * @param {boolean} options.mustRevalidate - Whether to force revalidation (default: true)
 */
function cacheMiddleware(options = {}) {
    const {
        maxAge = 300, // 5 minutes default
        private: isPrivate = false,
        mustRevalidate = true,
    } = options;

    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Store original send function
        const originalSend = res.send;

        // Override send to add caching headers
        res.send = function (body) {
            // Generate ETag
            const etag = generateETag(body);

            // Set ETag header
            res.setHeader('ETag', `"${etag}"`);

            // Check if client has matching ETag
            const clientETag = req.headers['if-none-match'];
            if (clientETag === `"${etag}"`) {
                // Client has fresh cache
                res.status(304);
                return originalSend.call(this, '');
            }

            // Set Cache-Control header
            const cacheControl = [
                isPrivate ? 'private' : 'public',
                `max-age=${maxAge}`,
            ];

            if (mustRevalidate) {
                cacheControl.push('must-revalidate');
            }

            res.setHeader('Cache-Control', cacheControl.join(', '));

            // Set Expires header (for older browsers)
            const expires = new Date(Date.now() + maxAge * 1000);
            res.setHeader('Expires', expires.toUTCString());

            // Call original send
            return originalSend.call(this, body);
        };

        next();
    };
}

/**
 * No-cache middleware - prevents caching of sensitive data
 */
function noCacheMiddleware(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
}

/**
 * Short cache middleware - 2 minutes cache for frequently changing data
 */
const shortCache = cacheMiddleware({ maxAge: 120 });

/**
 * Medium cache middleware - 5 minutes cache for moderate changing data
 */
const mediumCache = cacheMiddleware({ maxAge: 300 });

/**
 * Long cache middleware - 1 hour cache for rarely changing data
 */
const longCache = cacheMiddleware({ maxAge: 3600 });

module.exports = {
    cacheMiddleware,
    noCacheMiddleware,
    shortCache,
    mediumCache,
    longCache,
};
