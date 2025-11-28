const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  renderEssentialiaDocument,
  ensureDefaultTemplate,
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

router.post(
  '/essentialia/render',
  authenticateToken,
  [
    body('credit_id').isUUID(),
    body('template_id').optional().isUUID(),
    body('template_code').optional().isString().isLength({ min: 3, max: 80 }),
    body('collateral_ids').optional().isArray(),
    body('collateral_ids.*').optional().isUUID(),
    body('custom_fields').optional().isObject(),
    body('output_type').optional().isIn(['inline', 'attachment']),
  ],
  handleValidation,
  async (req, res) => {
    try {
      await ensureDefaultTemplate();

      const {
        credit_id: creditId,
        template_id: templateId,
        template_code: templateCode,
        collateral_ids: collateralIds,
        custom_fields: customFields,
        output_type: outputType = 'inline',
      } = req.body;

      const document = await renderEssentialiaDocument({
        creditId,
        templateId,
        templateCode,
        collateralIds,
        customFields,
        preparedBy: {
          id: req.user.id,
          name: req.user.full_name,
          role: req.user.role,
          email: req.user.email,
        },
      });

      if (outputType === 'attachment') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${document.filename}"`
        );
        return res.send(document.html);
      }

      return res.json({
        success: true,
        data: {
          html: document.html,
          filename: document.filename,
          template: document.template,
          context: document.context,
        },
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      console.error('Render essentialia document error:', error);
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to render document',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

module.exports = router;

