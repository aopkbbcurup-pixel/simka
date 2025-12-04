const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../models');
const bcrypt = require('bcryptjs');

router.get('/', async (req, res) => {
    const { key } = req.query;

    // Simple protection
    if (key !== 'simka-debug-2025') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            USE_POSTGRES: process.env.USE_POSTGRES,
            DB_HOST: process.env.DB_HOST ? 'Set' : 'Missing',
            DB_NAME: process.env.DB_NAME ? 'Set' : 'Missing',
            DB_USER: process.env.DB_USER ? 'Set' : 'Missing',
            JWT_SECRET: process.env.JWT_SECRET ? 'Set (Length: ' + process.env.JWT_SECRET.length + ')' : 'Missing',
        },
        database: {
            connected: false,
            dialect: 'unknown',
            error: null
        },
        users: {
            count: 0,
            adminExists: false,
            adminDetails: null,
            passwordCheck: null
        }
    };

    try {
        // Check DB Connection
        if (!sequelize) {
            diagnostics.database.connected = false;
            diagnostics.database.error = 'Sequelize instance is NULL (Missing Env Vars?)';
        } else {
            await sequelize.authenticate();
            diagnostics.database.connected = true;
            diagnostics.database.dialect = sequelize.getDialect();

            // Check Users
            if (User) {
                const userCount = await User.count();
                diagnostics.users.count = userCount;

                // Check Admin
                const admin = await User.findOne({ where: { username: 'admin' } });
                if (admin) {
                    diagnostics.users.adminExists = true;
                    diagnostics.users.adminDetails = {
                        id: admin.id,
                        role: admin.role,
                        is_active: admin.is_active,
                        email: admin.email
                    };

                    // Test Password
                    const isMatch = await bcrypt.compare('password123', admin.password);
                    diagnostics.users.passwordCheck = isMatch ? 'SUCCESS: password123 matches' : 'FAIL: password123 does not match';
                } else {
                    diagnostics.users.adminExists = false;
                }
            } else {
                diagnostics.users.error = 'User model not initialized';
            }
        }

    } catch (error) {
        diagnostics.database.error = error.message;
        console.error('Diagnostic Error:', error);
    }

    res.json(diagnostics);
});

module.exports = router;
