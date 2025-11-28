/**
 * File Upload Handler for Vercel Serverless
 * 
 * WARNING: This is a placeholder. Vercel serverless functions have ephemeral filesystem.
 * For production file uploads, migrate to:
 * - Vercel Blob Storage
 * - Cloudinary
 * - AWS S3
 * - Other cloud storage solution
 */

module.exports = (req, res) => {
    res.status(503).json({
        success: false,
        message: 'File uploads not available in serverless mode',
        note: 'Please migrate to cloud storage (Vercel Blob, Cloudinary, or S3) for file uploads'
    });
};
