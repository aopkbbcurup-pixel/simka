const express = require('express');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { OutgoingLetter, LetterConfiguration, LetterContentTemplate, User, Debtor, Credit } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'letter-attachments');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Helper function to generate letter number
async function generateLetterNumber(type) {
    const year = new Date().getFullYear();
    const typeCode = type === 'eksternal' ? 'S.Eks' : 'S.Int';

    const lastLetter = await OutgoingLetter.findOne({
        where: { letter_type: type, year, is_active: true },
        order: [['sequence_number', 'DESC']]
    });

    const nextSeq = lastLetter ? lastLetter.sequence_number + 1 : 1;

    const config = await LetterConfiguration.findOne({ where: { is_default: true } });
    const unitCode = config?.unit_code || 'AOPK/C.2';

    return {
        sequence_number: nextSeq,
        year,
        letter_number: `${String(nextSeq).padStart(3, '0')}/${typeCode}/${unitCode}/${year}`
    };
}

// Common include options for queries
const getIncludeOptions = () => [
    { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
    { model: User, as: 'signer', attributes: ['id', 'full_name', 'email'] },
    { model: Debtor, as: 'debtor', attributes: ['id', 'full_name', 'debtor_code'] },
    { model: Credit, as: 'credit', attributes: ['id', 'contract_number', 'credit_type'] },
    { model: LetterContentTemplate, as: 'template', attributes: ['id', 'name'] }
];

// ==================== STATIC ROUTES (before :id) ====================

// Get next letter number preview
router.get('/next-number/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        if (!['eksternal', 'internal'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid letter type' });
        }
        const numberInfo = await generateLetterNumber(type);
        res.json({ success: true, data: numberInfo });
    } catch (error) {
        console.error('Error getting next letter number:', error);
        res.status(500).json({ success: false, message: 'Failed to get next letter number', error: error.message });
    }
});

// Get letter configuration
router.get('/configuration', authenticateToken, async (req, res) => {
    try {
        let config = await LetterConfiguration.findOne({
            where: { is_default: true },
            include: [{ model: User, as: 'updater', attributes: ['id', 'full_name', 'email'] }]
        });

        if (!config) {
            config = await LetterConfiguration.create({
                unit_code: 'AOPK/C.2',
                unit_name: 'Unit Kerja Default',
                is_default: true
            });
        }

        res.json({ success: true, data: { configuration: config } });
    } catch (error) {
        console.error('Error fetching letter configuration:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch letter configuration', error: error.message });
    }
});

// Update letter configuration
router.put('/configuration', authenticateToken, [
    body('unit_code').notEmpty().withMessage('Unit code is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
        }

        let config = await LetterConfiguration.findOne({ where: { is_default: true } });

        if (config) {
            await config.update({ unit_code: req.body.unit_code, unit_name: req.body.unit_name, updated_by: req.user.id });
        } else {
            config = await LetterConfiguration.create({
                unit_code: req.body.unit_code,
                unit_name: req.body.unit_name,
                is_default: true,
                updated_by: req.user.id
            });
        }

        res.json({ success: true, message: 'Configuration updated successfully', data: { configuration: config } });
    } catch (error) {
        console.error('Error updating letter configuration:', error);
        res.status(500).json({ success: false, message: 'Failed to update letter configuration', error: error.message });
    }
});

// Get statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const [totalEksternal, totalInternal, totalDraft, totalSent, needsFollowup] = await Promise.all([
            OutgoingLetter.count({ where: { letter_type: 'eksternal', year, is_active: true } }),
            OutgoingLetter.count({ where: { letter_type: 'internal', year, is_active: true } }),
            OutgoingLetter.count({ where: { status: 'draft', year, is_active: true } }),
            OutgoingLetter.count({ where: { status: 'sent', year, is_active: true } }),
            OutgoingLetter.count({ where: { needs_followup: true, is_active: true } })
        ]);

        res.json({
            success: true,
            data: { year, totalEksternal, totalInternal, totalDraft, totalSent, needsFollowup, total: totalEksternal + totalInternal }
        });
    } catch (error) {
        console.error('Error fetching letter statistics:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch letter statistics', error: error.message });
    }
});

// Export to Excel
router.get('/export/excel', authenticateToken, async (req, res) => {
    try {
        const { year, type, status } = req.query;
        const where = { is_active: true };
        if (year) where.year = parseInt(year);
        if (type) where.letter_type = type;
        if (status) where.status = status;

        const letters = await OutgoingLetter.findAll({
            where,
            include: getIncludeOptions(),
            order: [['letter_date', 'DESC']]
        });

        // Format data for CSV export (simple format)
        const csvHeader = 'No,Nomor Surat,Tanggal,Tipe,Perihal,Tujuan,Status,Dibuat Oleh\n';
        const csvData = letters.map((l, i) =>
            `${i + 1},"${l.letter_number}","${l.letter_date}","${l.letter_type}","${l.subject}","${l.recipient}","${l.status}","${l.creator?.full_name || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=surat-keluar-${year || 'all'}.csv`);
        res.send(csvHeader + csvData);
    } catch (error) {
        console.error('Error exporting letters:', error);
        res.status(500).json({ success: false, message: 'Failed to export letters', error: error.message });
    }
});

// Get letters needing follow-up (reminders)
router.get('/reminders', authenticateToken, async (req, res) => {
    try {
        const letters = await OutgoingLetter.findAll({
            where: {
                needs_followup: true,
                is_active: true,
                status: 'draft'
            },
            include: getIncludeOptions(),
            order: [['followup_date', 'ASC']]
        });

        res.json({ success: true, data: { letters } });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reminders', error: error.message });
    }
});

// ==================== TEMPLATE ROUTES ====================

// Get all letter templates
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const templates = await LetterContentTemplate.findAll({
            where: { is_active: true },
            include: [{ model: User, as: 'creator', attributes: ['id', 'full_name'] }],
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: { templates } });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates', error: error.message });
    }
});

// Create template
router.post('/templates', authenticateToken, [
    body('name').notEmpty().withMessage('Template name is required'),
    body('content_template').notEmpty().withMessage('Content template is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
        }

        const template = await LetterContentTemplate.create({ ...req.body, created_by: req.user.id });
        res.status(201).json({ success: true, message: 'Template created successfully', data: { template } });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ success: false, message: 'Failed to create template', error: error.message });
    }
});

// Update template
router.put('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const template = await LetterContentTemplate.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        await template.update(req.body);
        res.json({ success: true, message: 'Template updated successfully', data: { template } });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ success: false, message: 'Failed to update template', error: error.message });
    }
});

// Delete template
router.delete('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const template = await LetterContentTemplate.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }
        await template.update({ is_active: false });
        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ success: false, message: 'Failed to delete template', error: error.message });
    }
});

// ==================== MAIN CRUD ROUTES ====================

// Get all outgoing letters
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, type, status, year, search, debtor_id, needs_followup } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { is_active: true };
        if (type) where.letter_type = type;
        if (status) where.status = status;
        if (year) where.year = parseInt(year);
        if (debtor_id) where.debtor_id = debtor_id;
        if (needs_followup === 'true') where.needs_followup = true;

        if (search) {
            where[Op.or] = [
                { letter_number: { [Op.iLike]: `%${search}%` } },
                { subject: { [Op.iLike]: `%${search}%` } },
                { recipient: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows: letters } = await OutgoingLetter.findAndCountAll({
            where,
            include: getIncludeOptions(),
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            success: true,
            data: {
                letters,
                pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) }
            }
        });
    } catch (error) {
        console.error('Error fetching outgoing letters:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch outgoing letters', error: error.message });
    }
});

// Get single letter by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({
            where: { id: req.params.id, is_active: true },
            include: getIncludeOptions()
        });

        if (!letter) {
            return res.status(404).json({ success: false, message: 'Outgoing letter not found' });
        }

        res.json({ success: true, data: { letter } });
    } catch (error) {
        console.error('Error fetching outgoing letter:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch outgoing letter', error: error.message });
    }
});

// Create new letter
router.post('/', authenticateToken, [
    body('letter_type').isIn(['eksternal', 'internal']).withMessage('Invalid letter type'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('recipient').notEmpty().withMessage('Recipient is required'),
    body('letter_date').isISO8601().withMessage('Invalid letter date')
], async (req, res) => {
    try {
        console.log('=== CREATE LETTER REQUEST ===');
        console.log('User ID:', req.user?.id);
        console.log('Raw body:', JSON.stringify(req.body, null, 2));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
        }

        console.log('Generating letter number...');
        const numberInfo = await generateLetterNumber(req.body.letter_type);
        console.log('Number info:', numberInfo);

        // Sanitize input - remove empty strings for UUID fields
        const sanitizedBody = { ...req.body };
        ['debtor_id', 'credit_id', 'template_id', 'signed_by'].forEach(field => {
            if (sanitizedBody[field] === '' || sanitizedBody[field] === null) {
                delete sanitizedBody[field];
            }
        });
        // Remove empty strings for date fields
        if (sanitizedBody.followup_date === '') delete sanitizedBody.followup_date;

        console.log('Sanitized body:', JSON.stringify(sanitizedBody, null, 2));

        const createData = {
            ...sanitizedBody,
            letter_number: numberInfo.letter_number,
            sequence_number: numberInfo.sequence_number,
            year: numberInfo.year,
            created_by: req.user.id
        };
        console.log('Create data:', JSON.stringify(createData, null, 2));

        const letter = await OutgoingLetter.create(createData);
        console.log('Letter created:', letter.id);

        const createdLetter = await OutgoingLetter.findOne({
            where: { id: letter.id },
            include: getIncludeOptions()
        });

        console.log('=== SUCCESS ===');
        res.status(201).json({ success: true, message: 'Outgoing letter created successfully', data: { letter: createdLetter } });
    } catch (error) {
        console.error('=== CREATE LETTER ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.errors) {
            error.errors.forEach((e, i) => console.error(`Validation error ${i}:`, e.message, e.path));
        }
        if (error.original) {
            console.error('DB error:', error.original.message);
            console.error('DB detail:', error.original.detail);
        }
        console.error('Full error:', error);
        res.status(500).json({ success: false, message: 'Failed to create outgoing letter', error: error.message });
    }
});

// Update letter
router.put('/:id', authenticateToken, [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('recipient').notEmpty().withMessage('Recipient is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
        }

        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Outgoing letter not found' });
        }

        // Protect immutable fields
        const { letter_type, letter_number, sequence_number, year, ...updateData } = req.body;
        await letter.update(updateData);

        const updatedLetter = await OutgoingLetter.findOne({
            where: { id: letter.id },
            include: getIncludeOptions()
        });

        res.json({ success: true, message: 'Outgoing letter updated successfully', data: { letter: updatedLetter } });
    } catch (error) {
        console.error('Error updating outgoing letter:', error);
        res.status(500).json({ success: false, message: 'Failed to update outgoing letter', error: error.message });
    }
});

// Delete letter (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Outgoing letter not found' });
        }

        await letter.update({ is_active: false });
        res.json({ success: true, message: 'Outgoing letter deleted successfully' });
    } catch (error) {
        console.error('Error deleting outgoing letter:', error);
        res.status(500).json({ success: false, message: 'Failed to delete outgoing letter', error: error.message });
    }
});

// ==================== ATTACHMENT ROUTES ====================

// Upload attachments
router.post('/:id/attachments', authenticateToken, upload.array('files', 5), async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        const newAttachments = req.files.map(f => ({
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
            path: f.path
        }));

        const currentAttachments = letter.attachments || [];
        await letter.update({ attachments: [...currentAttachments, ...newAttachments] });

        res.json({ success: true, message: 'Attachments uploaded successfully', data: { attachments: letter.attachments } });
    } catch (error) {
        console.error('Error uploading attachments:', error);
        res.status(500).json({ success: false, message: 'Failed to upload attachments', error: error.message });
    }
});

// Delete attachment
router.delete('/:id/attachments/:filename', authenticateToken, async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        const updatedAttachments = (letter.attachments || []).filter(a => a.filename !== req.params.filename);
        await letter.update({ attachments: updatedAttachments });

        // Try to delete file
        const filePath = path.join(uploadDir, req.params.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ success: false, message: 'Failed to delete attachment', error: error.message });
    }
});

// ==================== SPECIAL ACTIONS ====================

// Sign letter
router.post('/:id/sign', authenticateToken, async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        await letter.update({
            signature_image: req.body.signature_image,
            signed_by: req.user.id,
            signed_at: new Date()
        });

        res.json({ success: true, message: 'Letter signed successfully' });
    } catch (error) {
        console.error('Error signing letter:', error);
        res.status(500).json({ success: false, message: 'Failed to sign letter', error: error.message });
    }
});

// Send letter (update status + optional email)
router.post('/:id/send', authenticateToken, async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        const updateData = { status: 'sent' };

        // If email provided, mark as email sent (actual email sending would require nodemailer config)
        if (req.body.email_recipient) {
            updateData.email_recipient = req.body.email_recipient;
            updateData.email_sent = true;
            updateData.email_sent_at = new Date();
            // TODO: Implement actual email sending with nodemailer
        }

        await letter.update(updateData);

        res.json({ success: true, message: 'Letter sent successfully' });
    } catch (error) {
        console.error('Error sending letter:', error);
        res.status(500).json({ success: false, message: 'Failed to send letter', error: error.message });
    }
});

// Set follow-up reminder
router.post('/:id/reminder', authenticateToken, async (req, res) => {
    try {
        const letter = await OutgoingLetter.findOne({ where: { id: req.params.id, is_active: true } });
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Letter not found' });
        }

        await letter.update({
            needs_followup: true,
            followup_date: req.body.followup_date
        });

        res.json({ success: true, message: 'Reminder set successfully' });
    } catch (error) {
        console.error('Error setting reminder:', error);
        res.status(500).json({ success: false, message: 'Failed to set reminder', error: error.message });
    }
});

module.exports = router;
