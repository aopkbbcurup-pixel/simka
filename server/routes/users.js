const express = require('express');
const { User } = require('../models');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/', [authenticateToken, authorize('admin')], async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['full_name', 'ASC']],
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a single user by ID
router.get('/:id', [authenticateToken, authorize('admin')], async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

// Create a new user
router.post('/', [authenticateToken, authorize('admin'), [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['admin', 'staff', 'analyst', 'manager']).withMessage('Invalid role specified'),
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
  }

  try {
    const { username, email } = req.body;
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already in use' });
    }

    const newUser = await User.create(req.body);
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update a user
router.put('/:id', [authenticateToken, authorize('admin'), [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('role').isIn(['admin', 'staff', 'analyst', 'manager']).withMessage('Invalid role specified'),
  // Password is optional on update
  body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
  }

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { email, password } = req.body;

    // Check for unique email if it's being changed
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }
    
    // If password is not provided, remove it from the update object
    // so the hook doesn't re-hash the existing password
    const updateData = { ...req.body };
    if (!password) {
      delete updateData.password;
    }

    await user.update(updateData);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Deactivate/Reactivate a user (soft delete)
router.delete('/:id', [authenticateToken, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
    }

    await user.update({ is_active: !user.is_active });
    res.json({ success: true, message: `User has been ${user.is_active ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
