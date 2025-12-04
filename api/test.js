module.exports = (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Vercel Function is working!',
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            HAS_DB_HOST: !!process.env.DB_HOST
        }
    });
};
