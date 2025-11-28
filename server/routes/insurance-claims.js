const express = require('express');
const { InsuranceClaim, Insurance, Debtor, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all insurance claims with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    const whereClause = {
      is_active: true,
      ...(search && {
        [Op.or]: [
          { claim_number: { [Op.like]: `%${search}%` } },
          { claim_type: { [Op.like]: `%${search}%` } }
        ]
      }),
      ...(status && { claim_status: status })
    };

    const { count, rows: claims } = await InsuranceClaim.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Debtor,
          attributes: ['id', 'debtor_code', 'full_name', 'ktp_number']
        },
        {
          model: Insurance,
          attributes: ['id', 'policy_number', 'insurance_company', 'policy_type']
        },
        {
          model: User,
          attributes: ['id', 'full_name']
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        claims,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: limit
        }
      }
    });
  } catch (error) {
    console.error('Get insurance claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance claims',
      error: error.message
    });
  }
});

// Get claims by status for dashboard
router.get('/by-status', authenticateToken, async (req, res) => {
  try {
    const statusCounts = await InsuranceClaim.findAll({
      attributes: [
        'claim_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { is_active: true },
      group: ['claim_status'],
      raw: true
    });

    const summary = {
      submitted: 0,
      under_review: 0,
      processing: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      closed: 0
    };

    statusCounts.forEach(item => {
      summary[item.claim_status] = parseInt(item.count);
    });

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    console.error('Get claims by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims summary',
      error: error.message
    });
  }
});

// Get insurance claim by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await InsuranceClaim.findOne({
      where: { id: req.params.id, is_active: true },
      include: [
        {
          model: Debtor,
          attributes: ['id', 'debtor_code', 'full_name', 'ktp_number', 'phone', 'email']
        },
        {
          model: Insurance,
          attributes: ['id', 'policy_number', 'insurance_company', 'policy_type', 'coverage_amount']
        },
        {
          model: User,
          attributes: ['id', 'full_name']
        }
      ]
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Insurance claim not found'
      });
    }

    res.json({
      success: true,
      data: { claim }
    });
  } catch (error) {
    console.error('Get insurance claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance claim',
      error: error.message
    });
  }
});

// Create new insurance claim
router.post('/', authenticateToken, [
  body('claim_number').notEmpty().withMessage('Claim number is required'),
  body('debtor_id').isUUID().withMessage('Valid debtor ID is required'),
  body('insurance_id').isUUID().withMessage('Valid insurance ID is required'),
  body('claim_type').isIn(['death', 'disability', 'medical', 'accident', 'property_damage', 'other']).withMessage('Invalid claim type'),
  body('claim_amount').isNumeric().withMessage('Claim amount must be a number'),
  body('claim_date').isISO8601().withMessage('Invalid claim date'),
  body('incident_date').isISO8601().withMessage('Invalid incident date'),
  body('incident_description').notEmpty().withMessage('Incident description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check if claim number already exists
    const existingClaim = await InsuranceClaim.findOne({
      where: { claim_number: req.body.claim_number }
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'Claim with this number already exists'
      });
    }

    // Verify debtor and insurance exist
    const debtor = await Debtor.findByPk(req.body.debtor_id);
    const insurance = await Insurance.findByPk(req.body.insurance_id);

    if (!debtor) {
      return res.status(400).json({
        success: false,
        message: 'Debtor not found'
      });
    }

    if (!insurance) {
      return res.status(400).json({
        success: false,
        message: 'Insurance not found'
      });
    }

    const claim = await InsuranceClaim.create({
      ...req.body,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Insurance claim created successfully',
      data: { claim }
    });
  } catch (error) {
    console.error('Create insurance claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create insurance claim',
      error: error.message
    });
  }
});

// Update claim status
router.put('/:id/status', authenticateToken, [
  body('claim_status').isIn(['submitted', 'under_review', 'processing', 'approved', 'rejected', 'paid', 'closed']).withMessage('Invalid claim status'),
  body('status_reason').optional().isString().withMessage('Status reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const claim = await InsuranceClaim.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Insurance claim not found'
      });
    }

    const updateData = {
      claim_status: req.body.claim_status,
      status_reason: req.body.status_reason
    };

    // If status is paid, require settlement details
    if (req.body.claim_status === 'paid') {
      if (!req.body.settlement_amount || !req.body.settlement_date) {
        return res.status(400).json({
          success: false,
          message: 'Settlement amount and date are required for paid status'
        });
      }
      updateData.settlement_amount = req.body.settlement_amount;
      updateData.settlement_date = req.body.settlement_date;
      updateData.payment_method = req.body.payment_method;
    }

    await claim.update(updateData);

    res.json({
      success: true,
      message: 'Claim status updated successfully',
      data: { claim }
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim status',
      error: error.message
    });
  }
});

// Update insurance claim
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await InsuranceClaim.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Insurance claim not found'
      });
    }

    await claim.update(req.body);

    res.json({
      success: true,
      message: 'Insurance claim updated successfully',
      data: { claim }
    });
  } catch (error) {
    console.error('Update insurance claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance claim',
      error: error.message
    });
  }
});

// Delete insurance claim (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await InsuranceClaim.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Insurance claim not found'
      });
    }

    await claim.update({ is_active: false });

    res.json({
      success: true,
      message: 'Insurance claim deleted successfully'
    });
  } catch (error) {
    console.error('Delete insurance claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete insurance claim',
      error: error.message
    });
  }
});

module.exports = router;
