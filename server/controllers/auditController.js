const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

// Log an activity
exports.logActivity = async (req, action, entityType = null, entityId = null, details = null, status = 'SUCCESS') => {
    try {
        const userId = req.user ? req.user.id : null;
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await AuditLog.create({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            details,
            ip_address: ipAddress,
            user_agent: userAgent,
            status
        });
    } catch (error) {
        console.error('Audit Logging Failed:', error);
        // Don't throw error to avoid breaking the main flow
    }
};

// Get logs with pagination and filtering
exports.getLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const { action, user_id, start_date, end_date } = req.query;

        const whereClause = {};

        if (action) {
            whereClause.action = action;
        }

        if (user_id) {
            whereClause.user_id = user_id;
        }

        if (start_date && end_date) {
            whereClause.created_at = {
                [Op.between]: [new Date(start_date), new Date(end_date)]
            };
        }

        const { count, rows } = await AuditLog.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                attributes: ['username', 'full_name', 'role']
            }]
        });

        res.json({
            success: true,
            data: {
                logs: rows,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(count / limit),
                    total_records: count,
                    per_page: limit
                }
            }
        });
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};
