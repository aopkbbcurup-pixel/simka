const express = require('express');
const { Op } = require('sequelize');
const { Insurance } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Get all insurances
router.get('/', authenticateToken, async (req, res) => {
  try {
    const insurances = await Insurance.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { insurances }
    });
  } catch (error) {
    console.error('Error fetching insurances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurances',
      error: error.message
    });
  }
});

// Get all unassigned insurance policies
router.get('/unassigned', authenticateToken, async (req, res) => {
  try {
    const unassignedInsurances = await Insurance.findAll({
      where: {
        credit_id: {
          [Op.is]: null
        },
        is_active: true
      },
      order: [['insurance_company', 'ASC'], ['policy_number', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        insurances: unassignedInsurances
      }
    });
  } catch (error) {
    console.error('Error fetching unassigned insurances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned insurances',
      error: error.message
    });
  }
});

// Get insurance by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const insurance = await Insurance.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance not found'
      });
    }

    res.json({
      success: true,
      data: { insurance }
    });
  } catch (error) {
    console.error('Error fetching insurance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance',
      error: error.message
    });
  }
});

// Create new insurance
router.post('/', authenticateToken, [
  body('policy_number').notEmpty().withMessage('Policy number is required'),
  body('insurance_company').notEmpty().withMessage('Insurance company is required'),
  body('policy_type').isIn(['life', 'health', 'property', 'vehicle', 'credit', 'other']).withMessage('Invalid policy type'),
  body('coverage_amount').isNumeric().withMessage('Coverage amount must be a number'),
  body('premium_amount').isNumeric().withMessage('Premium amount must be a number'),
  body('policy_start_date').isISO8601().withMessage('Invalid start date'),
  body('policy_end_date').isISO8601().withMessage('Invalid end date')
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

    // Check if policy number already exists
    const existingPolicy = await Insurance.findOne({
      where: { policy_number: req.body.policy_number }
    });

    if (existingPolicy) {
      return res.status(400).json({
        success: false,
        message: 'Policy number already exists'
      });
    }

    const insurance = await Insurance.create({
      ...req.body,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Insurance created successfully',
      data: { insurance }
    });
  } catch (error) {
    console.error('Error creating insurance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create insurance',
      error: error.message
    });
  }
});

// Update insurance
router.put('/:id', authenticateToken, [
  body('policy_number').notEmpty().withMessage('Policy number is required'),
  body('insurance_company').notEmpty().withMessage('Insurance company is required')
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

    const insurance = await Insurance.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance not found'
      });
    }

    // Check if policy number exists (if changed)
    if (req.body.policy_number !== insurance.policy_number) {
      const existingPolicy = await Insurance.findOne({
        where: { policy_number: req.body.policy_number }
      });

      if (existingPolicy) {
        return res.status(400).json({
          success: false,
          message: 'Policy number already exists'
        });
      }
    }

    await insurance.update(req.body);

    res.json({
      success: true,
      message: 'Insurance updated successfully',
      data: { insurance }
    });
  } catch (error) {
    console.error('Error updating insurance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance',
      error: error.message
    });
  }
});

// Delete insurance (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const insurance = await Insurance.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: 'Insurance not found'
      });
    }

    await insurance.update({ is_active: false });

    res.json({
      success: true,
      message: 'Insurance deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting insurance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete insurance',
      error: error.message
    });
  }
});

module.exports = router;
