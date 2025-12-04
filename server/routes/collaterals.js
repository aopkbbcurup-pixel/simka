const express = require('express');
const { Op } = require('sequelize');
const { Collateral, Credit, Debtor, Document } = require('../models');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for memory storage (for Supabase upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and document files are allowed'));
    }
  }
});

// Multer for Excel file uploads (keep using disk storage for temp processing if needed, or switch to memory)
// For Excel processing, memory storage is also fine if files aren't huge.
// But existing logic uses `req.file.path` with `XLSX.readFile`. 
// We should keep disk storage for Excel import for now to minimize changes to import logic, 
// as it's a temporary file anyway.
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const excelUpload = multer({
  storage: excelStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// Import storage service
const { uploadFile, isSupabaseConfigured } = require('../services/storageService');

// Get all collaterals with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';

    const whereClause = {
      is_active: true
    };

    // Handle search with SQLite compatibility
    if (search) {
      whereClause[Op.or] = [
        { collateral_code: { [Op.like]: `%${search}%` } },
        { certificate_number: { [Op.like]: `%${search}%` } },
        { police_number: { [Op.like]: `%${search}%` } },
        { bpkb_number: { [Op.like]: `%${search}%` } },
        // Use Sequelize's syntax for querying on associations
        { '$Credit.Debtor.full_name$': { [Op.like]: `%${search}%` } }
      ];
    }

    if (type) {
      whereClause.type = type;
    }

    const { count, rows } = await Collateral.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Credit,
          required: false, // Use LEFT JOIN to always include collaterals
          include: [{
            model: Debtor,
            required: false, // Use LEFT JOIN for Debtor as well
          }]
        },
        {
          model: Document,
          required: false
        }
      ],
      // This is necessary for the associated query to work correctly
      subQuery: false
    });

    res.json({
      success: true,
      data: {
        collaterals: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_records: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    console.error('Get collaterals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaterals',
      error: error.message
    });
  }
});

// Download Excel template for collateral import
router.get('/template', authenticateToken, (req, res) => {
  try {
    const templateData = [{
      'REKENING': '0020502005145',
      'NAMA': 'RANAH KATIALO',
      'TOTAL_AGUNAN': '82.811.000,00',
      'SALDO_AKHIR': '630.190.000,00',
      'CIF': '01002511240000020859',
      'ID_AGUNAN': '0000020859',
      'NO_SHM_BPKB': 'SHM NO. 00344, SU NO. 00001/2003',
      'TGL_APRAISAL': '31/03/2022',
      'PEMILIK_AGUNAN': 'RUDI HARTOΝΟ',
      'JENIS_AGUNAN': 'SHM' // Pilihan: SHM, SHGB, SK, SK Berkala, BPKB, Deposito, Emas, Lainnya
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    const colWidths = Object.keys(templateData[0]).map(key => ({
      width: Math.max(key.length + 5, 25)
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template Agunan');

    // Write to buffer instead of a temporary file
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = 'template-impor-agunan.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat template',
      error: error.message
    });
  }
});

// Import collaterals from Excel
router.post('/import', authenticateToken, authorize(['admin', 'analyst']), excelUpload.single('file'), async (req, res) => {
  const cleanup = () => {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('File cleanup error:', err);
      });
    }
  };

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }); // Use raw: false to get formatted strings

    if (jsonData.length === 0) {
      cleanup();
      return res.status(400).json({ success: false, message: 'File is empty or invalid format' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        const accountNumber = row['REKENING'];
        const collateralCode = row['ID_AGUNAN'];

        if (!accountNumber) throw new Error('Kolom "REKENING" wajib diisi');
        if (!collateralCode) throw new Error('Kolom "ID_AGUNAN" wajib diisi');

        const credit = await Credit.findOne({ where: { account_number: String(accountNumber) } });
        if (!credit) throw new Error(`Kredit dengan No. Rekening "${accountNumber}" tidak ditemukan`);

        const existingCollateral = await Collateral.findOne({ where: { collateral_code: String(collateralCode) } });
        if (existingCollateral) {
          // Instead of throwing an error, just skip it
          console.log(`Skipping existing collateral with code: ${collateralCode}`);
          continue;
        }

        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          // Handle DD/MM/YYYY
          const parts = String(dateStr).split('/');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
          // Handle standard date
          const parsed = new Date(dateStr);
          return isNaN(parsed.getTime()) ? null : parsed;
        }

        const parseNumber = (val) => {
          if (!val) return null;
          // Remove all non-digit characters except comma for decimal
          const cleanVal = String(val).replace(/[^\d,]/g, '').replace(',', '.');
          return parseFloat(cleanVal) || null;
        }

        const rawCollateralType = (row['JENIS_AGUNAN'] || '').toUpperCase();
        const typeMap = {
          SHM: 'SHM',
          SHGB: 'SHGB',
          SK: 'SK',
          'SK BERKALA': 'SK Berkala',
          BPKB: 'BPKB',
          DEPOSITO: 'Deposito',
          EMAS: 'Emas',
          LAINNYA: 'Lainnya'
        };
        const normalizedCollateralType = typeMap[rawCollateralType];
        const validTypes = Object.keys(typeMap);
        if (!normalizedCollateralType) {
          throw new Error(`Jenis agunan tidak valid: "${rawCollateralType}". Pilihan: ${validTypes.join(', ')}`);
        }

        const collateralData = {
          credit_id: credit.id,
          collateral_code: String(collateralCode),
          type: normalizedCollateralType,
          appraisal_value: parseNumber(row['TOTAL_AGUNAN']),
          appraisal_date: parseDate(row['TGL_APRAISAL']),
          certificate_number: row['NO_SHM_BPKB'],
          owner_name: row['PEMILIK_AGUNAN'],
          notes: `CIF: ${row['CIF'] || 'N/A'}; Nama Debitur (dari file): ${row['NAMA'] || 'N/A'}; Saldo Akhir (dari file): ${row['SALDO_AKHIR'] || 'N/A'}`,
        };

        if (normalizedCollateralType === 'BPKB') {
          collateralData.bpkb_number = row['NO_SHM_BPKB'];
        }

        await Collateral.create(collateralData);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: error.message });
      }
    }

    cleanup();
    res.json({
      success: true,
      message: `Impor selesai: ${results.success} berhasil, ${results.failed} gagal.`,
      data: results
    });

  } catch (error) {
    console.error('Import error:', error);
    cleanup();
    res.status(500).json({
      success: false,
      message: 'Gagal mengimpor data',
      error: error.message
    });
  }
});

// Get collateral by ID
router.get('/:id', async (req, res) => {
  try {
    const collateral = await Collateral.findOne({
      where: { id: req.params.id, is_active: true },
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        },
        { model: Document }
      ]
    });

    if (!collateral) {
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    res.json({
      success: true,
      data: { collateral }
    });
  } catch (error) {
    console.error('Get collateral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collateral',
      error: error.message
    });
  }
});

// Create new collateral
router.post('/', [
  authenticateToken,
  body('credit_id').isUUID().withMessage('Valid credit ID is required'),
  body('collateral_code').notEmpty().withMessage('Collateral code is required'),
  body('type').isIn(['SHM', 'SHGB', 'SK', 'SK Berkala', 'BPKB', 'Deposito', 'Emas', 'Lainnya']).withMessage('Invalid collateral type')
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

    // Check if collateral code already exists
    const existingCollateral = await Collateral.findOne({
      where: { collateral_code: req.body.collateral_code }
    });

    if (existingCollateral) {
      return res.status(400).json({
        success: false,
        message: 'Collateral code already exists'
      });
    }

    // Verify credit exists
    const credit = await Credit.findByPk(req.body.credit_id);
    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    // Sanitize input: Convert empty strings to null for numeric/date fields
    const sanitizeData = (data) => {
      const numericFields = [
        'appraisal_value', 'land_area', 'building_area', 'year',
        'insurance_value', 'tax_amount'
      ];
      const dateFields = [
        'certificate_date', 'appraisal_date',
        'insurance_start_date', 'insurance_end_date', 'tax_due_date'
      ];

      const sanitized = { ...data };

      numericFields.forEach(field => {
        if (sanitized[field] === '') sanitized[field] = null;
      });

      dateFields.forEach(field => {
        if (sanitized[field] === '') sanitized[field] = null;
      });

      return sanitized;
    };

    const collateralData = sanitizeData(req.body);

    const collateral = await Collateral.create(collateralData);

    const collateralWithRelations = await Collateral.findByPk(collateral.id, {
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Collateral created successfully',
      data: { collateral: collateralWithRelations }
    });
  } catch (error) {
    console.error('Create collateral error:', error);
    // Log to file for debugging
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '../error.log');
      const logEntry = `[${new Date().toISOString()}] POST /api/collaterals ERROR: ${error.stack}\n`;
      fs.appendFileSync(logPath, logEntry);
    } catch (logError) {
      console.error('Failed to write to error log:', logError);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create collateral',
      error: error.message
    });
  }
});

// Update collateral
router.put('/:id', async (req, res) => {
  try {
    const collateral = await Collateral.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!collateral) {
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    // Sanitize input: Convert empty strings to null for numeric/date fields
    const sanitizeData = (data) => {
      const numericFields = [
        'appraisal_value', 'land_area', 'building_area', 'year',
        'insurance_value', 'tax_amount'
      ];
      const dateFields = [
        'certificate_date', 'appraisal_date',
        'insurance_start_date', 'insurance_end_date', 'tax_due_date'
      ];

      const sanitized = { ...data };

      numericFields.forEach(field => {
        if (sanitized[field] === '') sanitized[field] = null;
      });

      dateFields.forEach(field => {
        if (sanitized[field] === '') sanitized[field] = null;
      });

      return sanitized;
    };

    await collateral.update(sanitizeData(req.body));

    const updatedCollateral = await Collateral.findByPk(collateral.id, {
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Collateral updated successfully',
      data: { collateral: updatedCollateral }
    });
  } catch (error) {
    console.error('Update collateral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update collateral',
      error: error.message
    });
  }
});

// Delete collateral (soft delete)
router.delete('/:id', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const collateral = await Collateral.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!collateral) {
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    // Soft delete
    await collateral.update({ is_active: false });

    res.json({
      success: true,
      message: 'Collateral deleted successfully'
    });
  } catch (error) {
    console.error('Delete collateral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete collateral',
      error: error.message
    });
  }
});

// Upload document for collateral
router.post('/:id/documents', upload.single('document'), [
  body('document_type').isIn(['Sertifikat', 'IMB', 'PBB', 'BPKB', 'STNK', 'Polis Asuransi', 'Foto Agunan', 'Surat Kuasa', 'Akta Jual Beli', 'Lainnya']).withMessage('Invalid document type'),
  body('document_name').notEmpty().withMessage('Document name is required')
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

    const collateral = await Collateral.findByPk(req.params.id);
    if (!collateral) {
      return res.status(404).json({
        success: false,
        message: 'Collateral not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let filePath = '';
    let publicUrl = '';

    // Check if Supabase is configured and use it
    if (isSupabaseConfigured) {
      const uploadResult = await uploadFile(req.file, 'collaterals');
      filePath = uploadResult.path; // Store the storage path
      publicUrl = uploadResult.publicUrl;
    } else {
      // Fallback or error if no local storage logic is desired in production
      // For now, if no supabase, we can't save file since we removed local disk storage for this route
      return res.status(500).json({
        success: false,
        message: 'Storage not configured'
      });
    }

    const document = await Document.create({
      collateral_id: req.params.id,
      document_type: req.body.document_type,
      document_name: req.body.document_name,
      file_path: publicUrl, // Store public URL for easy access
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      original_filename: req.file.originalname,
      physical_location: req.body.physical_location,
      document_date: req.body.document_date,
      expiry_date: req.body.expiry_date,
      notes: req.body.notes,
      uploaded_by: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// Get documents for collateral
router.get('/:id/documents', async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: {
        collateral_id: req.params.id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
});


module.exports = router;
