const express = require('express');
const { Debtor, Credit, Collateral, sequelize } = require('../models');
const { Op, fn, col } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
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

// Get all debtors with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = {
      is_active: true
    };

    if (search) {
      const lowerSearch = search.toLowerCase();
      whereClause[Op.or] = [
        sequelize.where(fn('LOWER', col('full_name')), Op.like, `%${lowerSearch}%`),
        sequelize.where(fn('LOWER', col('debtor_code')), Op.like, `%${lowerSearch}%`),
        sequelize.where(fn('LOWER', col('ktp_number')), Op.like, `%${lowerSearch}%`)
      ];
    }

    const { count, rows } = await Debtor.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Credit,
          required: false,
          where: { is_active: true }
        }
      ]
    });

    res.json({
      success: true,
      data: {
        debtors: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_records: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    console.error('Get debtors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debtors',
      error: error.message
    });
  }
});

// Export debtors to Excel
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const debtors = await Debtor.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Credit,
          required: false,
          where: { is_active: true }
        }
      ]
    });

    // Prepare data for Excel export
    const excelData = debtors.map(debtor => ({
      'Kode Debitur': debtor.debtor_code,
      'Nama Lengkap': debtor.full_name,
      'No. KTP': debtor.ktp_number,
      'Tanggal Lahir': debtor.birth_date ? new Date(debtor.birth_date).toLocaleDateString('id-ID') : '',
      'Tempat Lahir': debtor.birth_place || '',
      'Jenis Kelamin': debtor.gender === 'L' ? 'Laki-laki' : debtor.gender === 'P' ? 'Perempuan' : '',
      'Status Pernikahan': debtor.marital_status || '',
      'Alamat': debtor.address || '',
      'Kota': debtor.city || '',
      'Provinsi': debtor.province || '',
      'Kode Pos': debtor.postal_code || '',
      'Telepon': debtor.phone || '',
      'HP': debtor.mobile || '',
      'Email': debtor.email || '',
      'Pekerjaan': debtor.occupation || '',
      'Nama Perusahaan': debtor.company_name || '',
      'Alamat Perusahaan': debtor.company_address || '',
      'Penghasilan Bulanan': debtor.monthly_income || '',
      'Nama Pasangan': debtor.spouse_name || '',
      'KTP Pasangan': debtor.spouse_ktp || '',
      'Kontak Darurat - Nama': debtor.emergency_contact_name || '',
      'Kontak Darurat - Telepon': debtor.emergency_contact_phone || '',
      'Kontak Darurat - Hubungan': debtor.emergency_contact_relation || '',
      'Catatan': debtor.notes || '',
      'Jumlah Kredit Aktif': debtor.Credits ? debtor.Credits.length : 0,
      'Tanggal Dibuat': new Date(debtor.createdAt).toLocaleDateString('id-ID')
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = [];
    const headers = Object.keys(excelData[0] || {});
    headers.forEach((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...excelData.map(row => String(row[header] || '').length)
      );
      colWidths[index] = { width: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Data Debitur');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `data-debitur-${timestamp}.xlsx`;
    const filepath = path.join(__dirname, '../uploads/temp', filename);

    // Write file
    XLSX.writeFile(wb, filepath);

    // Send file
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      setTimeout(() => {
        try {
          fs.unlinkSync(filepath);
        } catch (cleanupErr) {
          console.error('File cleanup error:', cleanupErr);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

// Download Excel template
router.get('/template', authenticateToken, (req, res) => {
  try {
    const templateData = [{
      'Kode Debitur': 'DEB001',
      'Nama Lengkap': 'John Doe',
      'No. KTP': '1234567890123456',
      'Tanggal Lahir': '01/01/1990',
      'Tempat Lahir': 'Jakarta',
      'Jenis Kelamin': 'Laki-laki',
      'Status Pernikahan': 'married',
      'Alamat': 'Jl. Contoh No. 123',
      'Kota': 'Jakarta',
      'Provinsi': 'DKI Jakarta',
      'Kode Pos': '12345',
      'Telepon': '021-1234567',
      'HP': '081234567890',
      'Email': 'john@example.com',
      'Pekerjaan': 'Karyawan Swasta',
      'Nama Perusahaan': 'PT. Contoh',
      'Alamat Perusahaan': 'Jl. Kantor No. 456',
      'Penghasilan Bulanan': '5000000',
      'Nama Pasangan': 'Jane Doe',
      'KTP Pasangan': '6543210987654321',
      'Kontak Darurat - Nama': 'Emergency Contact',
      'Kontak Darurat - Telepon': '081987654321',
      'Kontak Darurat - Hubungan': 'Saudara',
      'Catatan': 'Catatan tambahan'
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Auto-size columns
    const colWidths = [];
    const headers = Object.keys(templateData[0]);
    headers.forEach((header, index) => {
      colWidths[index] = { width: Math.max(header.length + 2, 15) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template Data Debitur');

    const filename = 'template-data-debitur.xlsx';
    const filepath = path.join(__dirname, '../uploads/temp', filename);

    XLSX.writeFile(wb, filepath);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Template download error:', err);
      }
      // Clean up file after download
      setTimeout(() => {
        try {
          fs.unlinkSync(filepath);
        } catch (cleanupErr) {
          console.error('File cleanup error:', cleanupErr);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
});

// Import debtors from Excel
router.post('/import', authenticateToken, authorize(['admin', 'analyst']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File is empty or invalid format'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      try {
        // Map Excel columns to database fields
        const debtorData = {
          debtor_code: row['Kode Debitur'] || `DEB${Date.now()}${i}`,
          full_name: row['Nama Lengkap'],
          ktp_number: String(row['No. KTP'] || '').replace(/\D/g, ''),
          birth_date: row['Tanggal Lahir'] ? parseDate(row['Tanggal Lahir']) : null,
          birth_place: row['Tempat Lahir'] || null,
          gender: parseGender(row['Jenis Kelamin']),
          marital_status: parseMaritalStatus(row['Status Pernikahan']),
          address: row['Alamat'] || null,
          city: row['Kota'] || null,
          province: row['Provinsi'] || null,
          postal_code: row['Kode Pos'] || null,
          phone: row['Telepon'] || null,
          mobile: row['HP'] || null,
          email: row['Email'] || null,
          occupation: row['Pekerjaan'] || null,
          company_name: row['Nama Perusahaan'] || null,
          company_address: row['Alamat Perusahaan'] || null,
          monthly_income: parseNumber(row['Penghasilan Bulanan']),
          spouse_name: row['Nama Pasangan'] || null,
          spouse_ktp: String(row['KTP Pasangan'] || '').replace(/\D/g, '') || null,
          emergency_contact_name: row['Kontak Darurat - Nama'] || null,
          emergency_contact_phone: row['Kontak Darurat - Telepon'] || null,
          emergency_contact_relation: row['Kontak Darurat - Hubungan'] || null,
          notes: row['Catatan'] || null,
          created_by: req.user?.id || '00000000-0000-0000-0000-000000000000'
        };

        // Validate required fields
        if (!debtorData.full_name) {
          throw new Error('Nama lengkap wajib diisi');
        }
        if (!debtorData.ktp_number || debtorData.ktp_number.length !== 16) {
          throw new Error('No. KTP harus 16 digit');
        }

        // Check for existing debtor
        const existingDebtor = await Debtor.findOne({
          where: {
            [Op.or]: [
              { debtor_code: debtorData.debtor_code },
              { ktp_number: debtorData.ktp_number }
            ]
          }
        });

        if (existingDebtor) {
          throw new Error('Kode debitur atau No. KTP sudah ada');
        }

        // Create debtor
        await Debtor.create(debtorData);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // Excel row number (1-indexed + header)
          data: row,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {
      console.error('File cleanup error:', cleanupErr);
    }

    res.json({
      success: true,
      message: `Import completed: ${results.success} berhasil, ${results.failed} gagal`,
      data: results
    });

  } catch (error) {
    console.error('Import error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error('File cleanup error:', cleanupErr);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Failed to import data',
      error: error.message
    });
  }
});

// Get debtor by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const debtor = await Debtor.findOne({
      where: { id: req.params.id, is_active: true },
      include: [
        {
          model: Credit,
          where: { is_active: true },
          required: false,
          include: [
            {
              model: Collateral,
              where: { is_active: true },
              required: false
            }
          ]
        }
      ]
    });

    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor not found'
      });
    }

    res.json({
      success: true,
      data: { debtor }
    });
  } catch (error) {
    console.error('Get debtor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debtor',
      error: error.message
    });
  }
});

// Create new debtor
router.post('/', authenticateToken, authorize(['admin', 'analyst']), [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('ktp_number').isLength({ min: 16, max: 16 }).withMessage('KTP number must be 16 digits'),
  body('debtor_code').notEmpty().withMessage('Debtor code is required')
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

    // Check if debtor code or KTP already exists
    const existingDebtor = await Debtor.findOne({
      where: {
        [Op.or]: [
          { debtor_code: req.body.debtor_code },
          { ktp_number: req.body.ktp_number }
        ]
      }
    });

    if (existingDebtor) {
      return res.status(400).json({
        success: false,
        message: 'Debtor with this code or KTP number already exists'
      });
    }

    const debtor = await Debtor.create({
      ...req.body,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Debtor created successfully',
      data: { debtor }
    });
  } catch (error) {
    console.error('Create debtor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create debtor',
      error: error.message
    });
  }
});

// Update debtor
router.put('/:id', authenticateToken, authorize(['admin', 'analyst']), [
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('ktp_number').isLength({ min: 16, max: 16 }).withMessage('KTP number must be 16 digits')
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

    const debtor = await Debtor.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor not found'
      });
    }

    // Check if KTP number is being changed and already exists
    if (req.body.ktp_number !== debtor.ktp_number) {
      const existingKtp = await Debtor.findOne({
        where: {
          ktp_number: req.body.ktp_number,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (existingKtp) {
        return res.status(400).json({
          success: false,
          message: 'KTP number already exists'
        });
      }
    }

    await debtor.update(req.body);

    res.json({
      success: true,
      message: 'Debtor updated successfully',
      data: { debtor }
    });
  } catch (error) {
    console.error('Update debtor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update debtor',
      error: error.message
    });
  }
});

// Soft delete debtor
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const debtor = await Debtor.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor not found'
      });
    }

    // Check if debtor has active credits
    const activeCredits = await Credit.count({
      where: {
        debtor_id: req.params.id,
        status: { [Op.ne]: 'Lunas' },
        is_active: true
      }
    });

    if (activeCredits > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete debtor with active credits'
      });
    }

    await debtor.update({ is_active: false });

    res.json({
      success: true,
      message: 'Debtor deleted successfully'
    });
  } catch (error) {
    console.error('Delete debtor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete debtor',
      error: error.message
    });
  }
});


// Helper functions
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/ // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = String(dateStr).match(format);
    if (match) {
      if (format === formats[1]) { // YYYY-MM-DD
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else { // DD/MM/YYYY or DD-MM-YYYY
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
    }
  }
  
  return null;
}

function parseGender(gender) {
  if (!gender) return null;
  const g = String(gender).toLowerCase();
  if (g.includes('laki') || g === 'l' || g === 'male') return 'L';
  if (g.includes('perempuan') || g === 'p' || g === 'female') return 'P';
  return null;
}

function parseMaritalStatus(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s.includes('single') || s.includes('belum')) return 'single';
  if (s.includes('married') || s.includes('menikah') || s.includes('kawin')) return 'married';
  if (s.includes('divorced') || s.includes('cerai')) return 'divorced';
  if (s.includes('widowed') || s.includes('janda') || s.includes('duda')) return 'widowed';
  return status;
}

function parseNumber(value) {
  if (!value) return null;
  const num = String(value).replace(/[^\d.-]/g, '');
  return num ? parseFloat(num) : null;
}

module.exports = router;
