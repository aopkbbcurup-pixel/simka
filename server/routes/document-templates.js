const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { DocumentTemplate } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const {
  ensureDefaultTemplate,
  DEFAULT_TEMPLATE_CODE,
  defaultTemplateMetadata,
} = require('../services/documentTemplateService');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  return next();
};

router.use(authenticateToken);

router.get(
  '/',
  [
    query('document_category').optional().isString().isLength({ max: 100 }),
    query('include_inactive').optional().isIn(['true', 'false']),
  ],
  handleValidation,
  async (req, res) => {
    try {
      await ensureDefaultTemplate();

      const {
        document_category: documentCategory,
        include_inactive: includeInactive,
      } = req.query;

      const whereClause = {};

      if (documentCategory) {
        whereClause.document_category = documentCategory;
      }

      if (!includeInactive || includeInactive === 'false') {
        whereClause.is_active = true;
      }

      const templates = await DocumentTemplate.findAll({
        where: whereClause,
        order: [['updatedAt', 'DESC']],
      });

      res.json({
        success: true,
        data: templates.map((template) => template.get({ plain: true })),
      });
    } catch (error) {
      console.error('List document templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch document templates',
        error: error.message,
      });
    }
  }
);

router.get(
  '/:id',
  [param('id').isUUID()],
  handleValidation,
  async (req, res) => {
    try {
      await ensureDefaultTemplate();

      const template = await DocumentTemplate.findByPk(req.params.id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Document template not found',
        });
      }

      res.json({
        success: true,
        data: template.get({ plain: true }),
      });
    } catch (error) {
      console.error('Get document template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch document template',
        error: error.message,
      });
    }
  }
);

router.post(
  '/',
  authorize(['admin', 'manager']),
  [
    body('template_code').isString().isLength({ min: 3, max: 80 }),
    body('name').isString().isLength({ min: 3, max: 150 }),
    body('document_category').isString(),
    body('format').optional().isIn(['html', 'docx', 'pdf']),
    body('content').isString(),
    body('description').optional().isString(),
    body('placeholders').optional().isObject(),
    body('is_active').optional().isBoolean(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const payload = {
        template_code: req.body.template_code,
        name: req.body.name,
        document_category: req.body.document_category,
        format: req.body.format || 'html',
        content: req.body.content,
        description: req.body.description,
        placeholders: req.body.placeholders || defaultTemplateMetadata,
        is_active:
          typeof req.body.is_active === 'boolean' ? req.body.is_active : true,
        created_by: req.user.id,
        updated_by: req.user.id,
      };

      const template = await DocumentTemplate.create(payload);

      res.status(201).json({
        success: true,
        data: template.get({ plain: true }),
      });
    } catch (error) {
      console.error('Create document template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create document template',
        error: error.message,
      });
    }
  }
);

router.put(
  '/:id',
  authorize(['admin', 'manager']),
  [
    param('id').isUUID(),
    body('name').optional().isString().isLength({ min: 3, max: 150 }),
    body('document_category').optional().isString(),
    body('format').optional().isIn(['html', 'docx', 'pdf']),
    body('content').optional().isString(),
    body('description').optional().isString(),
    body('placeholders').optional().isObject(),
    body('is_active').optional().isBoolean(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const template = await DocumentTemplate.findByPk(req.params.id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Document template not found',
        });
      }

      const updates = {
        ...req.body,
        updated_by: req.user.id,
      };

      if (Object.prototype.hasOwnProperty.call(req.body, 'placeholders')) {
        updates.placeholders = req.body.placeholders;
      }

      if (req.body.content) {
        updates.version = (template.version || 1) + 1;
      }

      await template.update(updates);

      res.json({
        success: true,
        data: template.get({ plain: true }),
      });
    } catch (error) {
      console.error('Update document template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update document template',
        error: error.message,
      });
    }
  }
);

router.post(
  '/:id/toggle',
  authorize(['admin', 'manager']),
  [param('id').isUUID()],
  handleValidation,
  async (req, res) => {
    try {
      await ensureDefaultTemplate();

      const template = await DocumentTemplate.findByPk(req.params.id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Document template not found',
        });
      }

      if (template.template_code === DEFAULT_TEMPLATE_CODE && template.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Default template cannot be deactivated',
        });
      }

      template.is_active = !template.is_active;
      template.updated_by = req.user.id;
      await template.save();

      res.json({
        success: true,
        data: template.get({ plain: true }),
      });
    } catch (error) {
      console.error('Toggle document template status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update document template status',
        error: error.message,
      });
    }
  }
);

module.exports = router;
