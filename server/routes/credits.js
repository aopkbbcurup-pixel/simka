const express = require('express');
const { Op, fn, col, where } = require('sequelize');
const { sequelize, Credit, Debtor, Collateral, Insurance, Document, CreditFileMovement } = require('../models');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads (Excel)
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

// Get all credits with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  let searchTerm = '';
  let whereClause = { is_active: true };
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    searchTerm = req.query.search || '';
    const status = req.query.status || '';
    const creditType = req.query.credit_type || '';

    whereClause = {
      is_active: true
    };

    if (status) {
      // Map status labels to collectibility codes
      let collectibilityCode;
      switch (status) {
        case 'Lancar':
          collectibilityCode = '1';
          break;
        case 'Dalam Perhatian Khusus':
          collectibilityCode = '2';
          break;
        case 'Kurang Lancar':
          collectibilityCode = '3';
          break;
        case 'Diragukan':
          collectibilityCode = '4';
          break;
        case 'Macet':
          collectibilityCode = '5';
          break;
        case 'Lunas':
          whereClause.status = 'Lunas';
          break;
        default:
          whereClause.status = status;
      }

      if (collectibilityCode) {
        whereClause.collectibility = collectibilityCode;
      }
    }

    if (creditType) {
      whereClause.credit_type = creditType;
    }

    if (searchTerm) {
      const lowerSearch = `%${searchTerm.toLowerCase()}%`;
      whereClause[Op.or] = [
        sequelize.where(fn('LOWER', col('Credit.contract_number')), { [Op.like]: lowerSearch }),
        sequelize.where(fn('LOWER', col('Debtor.full_name')), { [Op.like]: lowerSearch }),
        sequelize.where(fn('LOWER', col('Debtor.debtor_code')), { [Op.like]: lowerSearch })
      ];
    }

    const { count, rows } = await Credit.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['id', 'DESC']],
      include: [
        {
          model: Debtor,
          required: false
        },
        { model: Collateral, required: false, where: { is_active: true } }
      ],
      subQuery: false
    });

    res.json({
      success: true,
      data: {
        credits: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_records: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    console.error('=== CREDITS API ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Search term:', searchTerm);
    console.error('Where clause:', JSON.stringify(whereClause, null, 2));
    console.error('========================');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credits',
      error: error.message
    });
  }
});

// Export credits to Excel
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const credits = await Credit.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']],
      include: [
        { model: Debtor }
      ]
    });

    const excelData = credits.map(credit => ({
      'No. Kontrak': credit.contract_number,
      'Kode Debitur': credit.Debtor?.debtor_code || '',
      'Nama Debitur': credit.Debtor?.full_name || '',
      'Jenis Kredit': credit.credit_type,
      'Plafond': Number(credit.plafond || 0),
      'Outstanding': Number(credit.outstanding || 0),
      'Suku Bunga (%)': Number(credit.interest_rate || 0),
      'Tenor (Bulan)': credit.tenor_months,
      'Tanggal Mulai': credit.start_date ? new Date(credit.start_date).toLocaleDateString('id-ID') : '',
      'Tanggal Jatuh Tempo': credit.maturity_date ? new Date(credit.maturity_date).toLocaleDateString('id-ID') : '',
      'Status': credit.status,
      'Kolektibilitas': credit.collectibility,
      'Hari Tunggakan (DPD)': credit.days_past_due || 0,
      'Tgl Pembayaran Terakhir': credit.last_payment_date ? new Date(credit.last_payment_date).toLocaleDateString('id-ID') : '',
      'AO': credit.account_officer || '',
      'Kode Cabang': credit.branch_code || '',
      'Catatan': credit.notes || ''
    }));

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

    XLSX.utils.book_append_sheet(wb, ws, 'Data Kredit');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `data-kredit-${timestamp}.xlsx`;
    const filepath = path.join(__dirname, '../uploads/temp', filename);

    XLSX.writeFile(wb, filepath);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
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
    // Bank-format template adopting user's screenshot headers
    const templateData = [{
      'REKENING': '0020502005145',
      'CIF': '0100251124',
      'NO PERJANJIAN': '87/KMK/GMJ/2022',
      'NAMA': 'CONTOH NASABAH',
      'TGL_JT': '25/02/2023',
      'JANGKA WAKTU': '48',
      'BUNGA': '13',
      'PLAFOND': '3000000000',
      'KOLEKTIBILITAS': '1',
      'JENIS PINJAMAN': 'KMK - KONSTRUKSI',
      'SALDO AKHIR': '2500000000',
      'AMORSISA': '',
      'AMOR_BLN_INI': '',
      'CKPN': '',
      'TGLMULAI': '25/04/2022',
      'AKUMULASI AMOR': ''
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    const colWidths = [];
    const headers = Object.keys(templateData[0]);
    headers.forEach((header, index) => {
      colWidths[index] = { width: Math.max(header.length + 2, 15) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template Kredit (Bank)');

    const filename = 'template-data-kredit-bank.xlsx';
    const filepath = path.join(__dirname, '../uploads/temp', filename);

    XLSX.writeFile(wb, filepath);

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Template download error:', err);
      }
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

// Get unique credit types
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const types = await Credit.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('credit_type')), 'credit_type']],
      where: {
        credit_type: { [Op.ne]: null, [Op.ne]: '' }
      },
      order: [['credit_type', 'ASC']]
    });
    const typeList = types.map(t => t.getDataValue('credit_type'));
    res.json({ success: true, data: { types: typeList } });
  } catch (error) {
    console.error('Failed to fetch credit types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch credit types' });
  }
});

// Import credits from Excel (Optimized with batch processing)
router.post('/import', authenticateToken, authorize(['admin', 'analyst']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

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

    const results = { success: 0, failed: 0, errors: [] };
    const BATCH_SIZE = 50; // Process 50 records at a time
    const totalRecords = jsonData.length;

    console.log(`Starting import of ${totalRecords} records in batches of ${BATCH_SIZE}`);

    // Process in batches for better performance
    for (let batchStart = 0; batchStart < jsonData.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, jsonData.length);
      const batch = jsonData.slice(batchStart, batchEnd);

      console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: records ${batchStart + 1}-${batchEnd}`);

      // Process batch records in parallel for speed
      const batchPromises = batch.map(async (row, batchIndex) => {
        const i = batchStart + batchIndex;
        try {
          const isBankFormat = ('REKENING' in row) || ('CIF' in row) || ('NO PERJANJIAN' in row);

          let debtorCode, contractNumber, credit_type, plafond, interest_rate, tenor_months,
            start_date, maturity_date, outstanding, status, collectibility, purpose, account_number;

          if (isBankFormat) {
            debtorCode = row['CIF'];
            contractNumber = row['NO PERJANJIAN'] || row['REKENING'];
            account_number = String(row['REKENING'] || '').trim();
            if (!contractNumber) throw new Error('NO PERJANJIAN/REKENING wajib diisi');
            if (!debtorCode) throw new Error('CIF (kode debitur) wajib diisi');

            credit_type = String(row['JENIS PINJAMAN'] || '').trim();
            if (!credit_type) throw new Error('JENIS PINJAMAN wajib diisi');

            let parsedPlafond = parseNumber(row['PLAFOND']);
            plafond = parsedPlafond === null ? 0 : parsedPlafond;
            if (plafond < 0) throw new Error('PLAFOND tidak valid');

            interest_rate = parseNumber(row['BUNGA']);
            if (interest_rate === null || interest_rate < 0 || interest_rate > 100) throw new Error('BUNGA harus 0-100');

            tenor_months = parseInt(String(row['JANGKA WAKTU'] || ''), 10);
            if (!tenor_months || tenor_months < 1) throw new Error('JANGKA WAKTU tidak valid');

            start_date = row['TGLMULAI'] ? parseDate(row['TGLMULAI']) : null;
            maturity_date = row['TGL_JT'] ? parseDate(row['TGL_JT']) : null;
            if (!start_date || !maturity_date) throw new Error('Tanggal mulai/jatuh tempo tidak valid');

            const outstandingParsed = parseNumber(row['SALDO AKHIR']);
            outstanding = outstandingParsed === null ? plafond : outstandingParsed;

            status = 'Lancar';
            collectibility = parseCollectibility(row['KOLEKTIBILITAS']) || '1';
            purpose = null;
          } else {
            // Legacy app template
            account_number = null;
            debtorCode = row['Kode Debitur'];
            contractNumber = row['No. Kontrak'];
            if (!contractNumber) throw new Error('No. Kontrak wajib diisi');
            if (!debtorCode) throw new Error('Kode Debitur wajib diisi');

            credit_type = String(row['Jenis Kredit'] || '').trim();
            if (!credit_type) throw new Error('Jenis Kredit wajib diisi');

            let parsedPlafond = parseNumber(row['Plafond']);
            plafond = parsedPlafond === null ? 0 : parsedPlafond;
            if (plafond < 0) throw new Error('Plafond tidak valid');

            interest_rate = parseNumber(row['Suku Bunga (%)']);
            if (interest_rate === null || interest_rate < 0 || interest_rate > 100) throw new Error('Suku bunga harus 0-100');

            tenor_months = parseInt(String(row['Tenor (Bulan)'] || ''), 10);
            if (!tenor_months || tenor_months < 1) throw new Error('Tenor (bulan) tidak valid');

            start_date = row['Tanggal Mulai'] ? parseDate(row['Tanggal Mulai']) : null;
            maturity_date = row['Tanggal Jatuh Tempo'] ? parseDate(row['Tanggal Jatuh Tempo']) : null;
            if (!start_date || !maturity_date) throw new Error('Tanggal mulai/jatuh tempo tidak valid');

            const outstandingParsed = parseNumber(row['Outstanding']);
            outstanding = outstandingParsed === null ? plafond : outstandingParsed;

            status = parseStatus(row['Status']) || 'Lancar';
            collectibility = parseCollectibility(row['Kolektibilitas']) || '1';
            purpose = row['Tujuan'] || null;
          }

          let debtor = await Debtor.findOne({ where: { debtor_code: debtorCode } });
          if (!debtor) {
            if (isBankFormat && row['NAMA']) {
              // Auto-create debtor using CIF + NAMA when permitted
              const payload = {
                debtor_code: debtorCode,
                full_name: String(row['NAMA']).trim(),
                ktp_number: String(debtorCode), // sementara KTP = CIF
                notes: 'Auto-created from credit import (bank format); KTP= CIF (temporary)',
                created_by: req.user?.id
              };
              debtor = await Debtor.create(payload);
            } else {
              throw new Error(`Debitur dengan kode ${debtorCode} tidak ditemukan`);
            }
          }

          // Pastikan KTP terisi: sementara isi dengan CIF jika kosong
          if (!debtor.ktp_number) {
            await debtor.update({ ktp_number: String(debtorCode) });
          }

          // Optional name consistency check when NAMA provided
          if (isBankFormat && row['NAMA']) {
            const provided = String(row['NAMA']).trim().toLowerCase();
            const existing = String(debtor.full_name || '').trim().toLowerCase();
            if (existing && provided && provided !== existing) {
              throw new Error(`Nama debitur tidak sesuai untuk CIF ${debtorCode} (file: "${row['NAMA']}", data: "${debtor.full_name}")`);
            }
          }

          const creditData = {
            contract_number: contractNumber,
            account_number: account_number,
            debtor_id: debtor.id,
            credit_type,
            plafond,
            outstanding,
            interest_rate,
            tenor_months,
            start_date,
            maturity_date,
            purpose,
            status,
            collectibility
          };

          // Check existing contract number and upsert
          const existingCredit = await Credit.findOne({ where: { contract_number: contractNumber } });

          if (existingCredit) {
            // Update existing credit
            await existingCredit.update(creditData);
          } else {
            // Create new credit
            await Credit.create(creditData);
          }

          return { success: true, row: i };
        } catch (error) {
          return {
            success: false,
            row: i,
            data: row,
            error: error.message
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Aggregate results
      batchResults.forEach(result => {
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            row: result.row + 2, // +2 for Excel row number (header + 0-index)
            data: result.data,
            error: result.error
          });
        }
      });

      // Log progress
      const progress = Math.round((batchEnd / totalRecords) * 100);
      console.log(`Progress: ${progress}% (${batchEnd}/${totalRecords}) - Success: ${results.success}, Failed: ${results.failed}`);
    }

    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {
      console.error('File cleanup error:', cleanupErr);
    }

    console.log(`Import completed: ${results.success} berhasil, ${results.failed} gagal`);

    res.json({
      success: true,
      message: `Import completed: ${results.success} berhasil, ${results.failed} gagal`,
      data: results
    });

  } catch (error) {
    console.error('Import error:', error);
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

// Get ALL active file movements (files currently OUT)
router.get('/file-movements/active', authenticateToken, async (req, res) => {
  try {
    // Fetch all movements ordered by time
    const movements = await CreditFileMovement.findAll({
      include: [
        {
          model: Collateral,
          attributes: ['id', 'collateral_code', 'type']
        },
        {
          model: Document,
          attributes: ['id', 'document_name'],
          required: false
        },
        {
          model: Credit,
          attributes: ['id', 'contract_number'],
          include: [{ model: Debtor, attributes: ['full_name'] }]
        }
      ],
      order: [['movement_time', 'ASC']] // Process chronologically
    });

    // Process to find current status of each item
    const itemStatus = {};

    movements.forEach(mov => {
      // Create a unique key for the item (Collateral or Document or General Credit File)
      let key = '';
      if (mov.document_id) {
        key = `DOC_${mov.document_id}`;
      } else if (mov.collateral_id) {
        key = `COL_${mov.collateral_id}`;
      } else {
        key = `CREDIT_${mov.credit_id}`;
      }

      if (mov.movement_type === 'OUT') {
        itemStatus[key] = mov; // Set as OUT
      } else {
        delete itemStatus[key]; // It returned, so remove from OUT list
      }
    });

    // Convert back to array
    const activeMovements = Object.values(itemStatus).sort((a, b) =>
      new Date(b.movement_time) - new Date(a.movement_time)
    );

    res.json({
      success: true,
      data: {
        movements: activeMovements
      }
    });
  } catch (error) {
    console.error('Get active file movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active file movements',
      error: error.message
    });
  }
});

// Get credit by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const credit = await Credit.findOne({
      where: { id: req.params.id, is_active: true },
      include: [
        { model: Debtor },
        { model: Insurance, required: false },
        {
          model: Collateral,
          where: { is_active: true },
          required: false
        }
      ]
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    res.json({
      success: true,
      data: { credit }
    });
  } catch (error) {
    console.error('Get credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit',
      error: error.message
    });
  }
});

// Get credit file movements (physical document movements)
router.get('/:id/file-movements', authenticateToken, async (req, res) => {
  try {
    const credit = await Credit.findOne({
      where: { id: req.params.id, is_active: true },
      attributes: ['id', 'contract_number']
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    const movements = await CreditFileMovement.findAll({
      where: { credit_id: credit.id },
      include: [
        {
          model: Collateral,
          attributes: ['id', 'collateral_code', 'type']
        },
        {
          model: Document,
          attributes: ['id', 'document_name'],
          required: false
        },
        {
          association: 'creator',
          attributes: ['id', 'full_name', 'role']
        }
      ],
      order: [['movement_time', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        movements
      }
    });
  } catch (error) {
    console.error('Get credit file movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file movement history',
      error: error.message
    });
  }
});

// Create credit file movement entry
router.post(
  '/:id/file-movements',
  authenticateToken,
  authorize(['admin', 'analyst', 'manager', 'staff']),
  [
    body('movement_type')
      .isIn(['OUT', 'IN'])
      .withMessage('movement_type must be either OUT or IN'),
    body('collateral_id')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('collateral_id must be a valid UUID'),
    body('document_id')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('document_id must be a valid UUID'),
    body('released_to')
      .if(body('movement_type').equals('OUT'))
      .notEmpty()
      .withMessage('released_to is required when movement_type is OUT'),
    body('responsible_officer')
      .if(body('movement_type').equals('OUT'))
      .notEmpty()
      .withMessage('responsible_officer is required when movement_type is OUT'),
    body('expected_return_date')
      .optional({ nullable: true })
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('expected_return_date must be in YYYY-MM-DD format'),
    body('received_by')
      .if(body('movement_type').equals('IN'))
      .notEmpty()
      .withMessage('received_by is required when movement_type is IN')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    try {
      const credit = await Credit.findOne({
        where: { id: req.params.id, is_active: true },
        include: [
          {
            model: Collateral,
            attributes: ['id', 'collateral_code', 'type'],
          },
        ],
      });

      if (!credit) {
        return res.status(404).json({
          success: false,
          message: 'Credit not found',
        });
      }

      const {
        collateral_id,
        document_id,
        movement_type,
        released_to,
        responsible_officer,
        expected_return_date,
        received_by,
        purpose,
        notes
      } = req.body;

      let collateral = null;
      if (collateral_id) {
        collateral = credit.Collaterals?.find((item) => item.id === collateral_id);
        if (!collateral) {
          return res.status(404).json({
            success: false,
            message: 'Collateral not found for this credit',
          });
        }
      }

      let document = null;
      if (document_id) {
        document = await Document.findOne({ where: { id: document_id } });
        if (!document) {
          return res.status(404).json({
            success: false,
            message: 'Document not found',
          });
        }
        if (collateral && document.collateral_id !== collateral.id) {
          return res.status(400).json({
            success: false,
            message: 'Document does not belong to the selected collateral',
          });
        }
      }

      const movementPayload = {
        credit_id: credit.id,
        collateral_id: collateral ? collateral.id : null,
        document_id: document ? document.id : null,
        movement_type,
        released_to: movement_type === 'OUT' ? released_to : null,
        responsible_officer: movement_type === 'OUT' ? responsible_officer : null,
        expected_return_date: movement_type === 'OUT' ? expected_return_date || null : null,
        received_by: movement_type === 'IN' ? received_by || req.user.full_name : null,
        movement_time: new Date(),
        purpose: purpose || null,
        notes: notes || null,
        created_by: req.user.id,
        created_by_name: req.user.full_name,
      };

      const movement = await CreditFileMovement.create(movementPayload);

      if (document) {
        if (movement_type === 'OUT') {
          await document.update({
            borrowed_by: released_to,
            borrowed_date: new Date(),
            expected_return_date: expected_return_date || null,
            returned_date: null,
            notes: notes || document.notes,
          });
        } else if (movement_type === 'IN') {
          await document.update({
            returned_date: new Date(),
            borrowed_by: null,
            borrowed_date: null,
            expected_return_date: null,
          });
        }
      }

      const createdMovement = await CreditFileMovement.findByPk(movement.id, {
        include: [
          {
            model: Collateral,
            attributes: ['id', 'collateral_code', 'type'],
          },
          {
            model: Document,
            attributes: ['id', 'document_name'],
            required: false,
          },
          {
            association: 'creator',
            attributes: ['id', 'full_name', 'role'],
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: 'File movement recorded successfully',
        data: { movement: createdMovement },
      });
    } catch (error) {
      console.error('Create credit file movement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record file movement',
        error: error.message,
      });
    }
  }
);

// Create new credit
router.post('/', authenticateToken, authorize(['admin', 'analyst']), [
  body('contract_number').notEmpty().withMessage('Contract number is required'),
  body('debtor_id').isUUID().withMessage('Valid debtor ID is required'),
  body('credit_type').notEmpty().withMessage('Credit type is required'),
  body('plafond').isFloat({ min: 0 }).withMessage('Plafond must be a positive number'),
  body('interest_rate').isFloat({ min: 0, max: 100 }).withMessage('Interest rate must be between 0-100'),
  body('tenor_months').isInt({ min: 1 }).withMessage('Tenor must be at least 1 month'),
  body('start_date').isDate().withMessage('Valid start date is required'),
  body('maturity_date').isDate().withMessage('Valid maturity date is required')
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

    // Check if contract number already exists
    const existingCredit = await Credit.findOne({
      where: { contract_number: req.body.contract_number }
    });

    if (existingCredit) {
      return res.status(400).json({
        success: false,
        message: 'Contract number already exists'
      });
    }

    // Verify debtor exists
    const debtor = await Debtor.findByPk(req.body.debtor_id);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Debtor not found'
      });
    }

    const credit = await Credit.create({
      ...req.body,
      outstanding: req.body.plafond // Initially outstanding equals plafond
    });

    // Link insurance if provided
    if (req.body.insurance_id) {
      const insurance = await Insurance.findByPk(req.body.insurance_id);
      // Link only if it's currently unassigned
      if (insurance && !insurance.credit_id) {
        await insurance.update({ credit_id: credit.id });
      }
    }

    const creditWithDetails = await Credit.findByPk(credit.id, {
      include: [{ model: Debtor }, { model: Insurance, required: false }]
    });

    res.status(201).json({
      success: true,
      message: 'Credit created successfully',
      data: { credit: creditWithDetails }
    });
  } catch (error) {
    console.error('Create credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create credit',
      error: error.message
    });
  }
});

// Update credit
router.put('/:id', authenticateToken, authorize(['admin', 'analyst']), async (req, res) => {
  try {
    const credit = await Credit.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    // Handle insurance linking logic before updating the main model
    if ('insurance_id' in req.body) {
      const newInsuranceId = req.body.insurance_id || null;

      // Find current linked insurances for this credit
      const currentInsurances = await Insurance.findAll({ where: { credit_id: credit.id } });
      const currentInsuranceId = currentInsurances.length > 0 ? currentInsurances[0].id : null;

      if (currentInsuranceId !== newInsuranceId) {
        // Unlink the old insurance if it exists
        if (currentInsuranceId) {
          const oldInsurance = await Insurance.findByPk(currentInsuranceId);
          if (oldInsurance) await oldInsurance.update({ credit_id: null });
        }

        // Link the new insurance if provided
        if (newInsuranceId) {
          const newInsurance = await Insurance.findByPk(newInsuranceId);
          // Ensure the new insurance is unassigned before linking
          if (newInsurance && !newInsurance.credit_id) {
            await newInsurance.update({ credit_id: credit.id });
          }
        }
      }
    }

    // Update other credit fields
    await credit.update(req.body);

    const updatedCredit = await Credit.findByPk(credit.id, {
      include: [{ model: Debtor }, { model: Insurance, required: false }]
    });

    res.json({
      success: true,
      message: 'Credit updated successfully',
      data: { credit: updatedCredit }
    });
  } catch (error) {
    console.error('Update credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update credit',
      error: error.message
    });
  }
});

// Update credit status
router.patch('/:id/status', authenticateToken, authorize(['admin', 'analyst']), [
  body('status').isIn(['Lancar', 'Dalam Perhatian Khusus', 'Kurang Lancar', 'Diragukan', 'Macet', 'Lunas']).withMessage('Invalid status'),
  body('collectibility').isIn(['1', '2', '3', '4', '5']).withMessage('Invalid collectibility')
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

    const credit = await Credit.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    await credit.update({
      status: req.body.status,
      collectibility: req.body.collectibility,
      days_past_due: req.body.days_past_due || 0,
      last_payment_date: req.body.last_payment_date || null
    });

    res.json({
      success: true,
      message: 'Credit status updated successfully',
      data: { credit }
    });
  } catch (error) {
    console.error('Update credit status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update credit status',
      error: error.message
    });
  }
});

// Bulk update credit status
router.patch('/bulk-status', authenticateToken, authorize(['admin', 'analyst']), [
  body('ids').isArray({ min: 1 }).withMessage('ids array is required'),
  body('status').isIn(['Lancar', 'Dalam Perhatian Khusus', 'Kurang Lancar', 'Diragukan', 'Macet', 'Lunas']).withMessage('Invalid status'),
  body('collectibility').optional().isIn(['1', '2', '3', '4', '5']).withMessage('Invalid collectibility'),
  body('last_payment_date').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { ids, status, collectibility, last_payment_date } = req.body;

    const updatePayload = {
      status,
      collectibility: collectibility || (status === 'Lunas' ? '1' : undefined),
      last_payment_date: last_payment_date || null,
    };

    if (status === 'Lunas') {
      updatePayload.days_past_due = 0;
    }

    // Fetch all matching, active credits first
    const credits = await Credit.findAll({ where: { id: { [Op.in]: ids }, is_active: true } });
    if (!credits.length) {
      return res.status(404).json({ success: false, message: 'No active credits found for provided ids' });
    }

    // Apply updates one by one to handle outstanding reset when Lunas
    let updated = 0;
    for (const credit of credits) {
      const payload = { ...updatePayload };
      if (status === 'Lunas') {
        payload.outstanding = 0;
      }
      await credit.update(payload);
      updated += 1;
    }

    res.json({ success: true, message: `Updated ${updated} credit(s)`, data: { updated, requested: ids.length } });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update credit status in bulk', error: error.message });
  }
});

// Bulk delete credits (soft delete) — only Lunas
router.post('/bulk-delete', authenticateToken, authorize('admin'), [
  body('ids').isArray({ min: 1 }).withMessage('ids array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { ids } = req.body;
    const credits = await Credit.findAll({ where: { id: { [Op.in]: ids }, is_active: true } });

    if (!credits.length) {
      return res.status(404).json({ success: false, message: 'No active credits found for provided ids' });
    }

    let deleted = 0;
    let skipped = 0;
    for (const credit of credits) {
      if (credit.status === 'Lunas') {
        await credit.update({ is_active: false });
        deleted += 1;
      } else {
        skipped += 1;
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deleted} credit(s), skipped ${skipped}`,
      data: { requested: ids.length, deleted, skipped }
    });
  } catch (error) {
    console.error('Bulk delete credits error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete credits', error: error.message });
  }
});

// Soft delete credit
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const credit = await Credit.findOne({
      where: { id: req.params.id, is_active: true }
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        message: 'Credit not found'
      });
    }

    if (credit.status !== 'Lunas') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete credit unless status is Lunas'
      });
    }

    await credit.update({ is_active: false });

    res.json({
      success: true,
      message: 'Credit deleted successfully'
    });
  } catch (error) {
    console.error('Delete credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete credit',
      error: error.message
    });
  }
});

module.exports = router;

// Helper functions
function parseDate(dateStr) {
  if (!dateStr) return null;
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/ // DD-MM-YYYY
  ];
  for (const format of formats) {
    const match = String(dateStr).match(format);
    if (match) {
      if (format === formats[1]) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number(value);
  let s = String(value).trim();
  if (s.toUpperCase() === 'N/A' || s === '-') return null;

  // If it ends with ,XX it's likely EU/ID decimal. Treat all dots as thousand separators.
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  // Otherwise, assume US/UK style. Treat all commas as thousand separators.
  else {
    s = s.replace(/,/g, '');
  }

  // Handle cases like "1.234.567" where only dot separators are used
  if (!s.includes(',') && (s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }

  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function parseStatus(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v.includes('lunas')) return 'Lunas';
  if (v.includes('macet')) return 'Macet';
  if (v.includes('diragukan')) return 'Diragukan';
  if (v.includes('kurang')) return 'Kurang Lancar';
  if (v.includes('dalam') || v.includes('dpk') || v.includes('perhatian')) return 'Dalam Perhatian Khusus';
  if (v.includes('lancar')) return 'Lancar';
  return null;
}

function parseCollectibility(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (['1', '2', '3', '4', '5'].includes(v)) return v;
  const lower = v.toLowerCase();
  if (lower.includes('lancar')) return '1';
  if (lower.includes('dalam perhatian') || lower.includes('dpk')) return '2';
  if (lower.includes('kurang')) return '3';
  if (lower.includes('diragukan')) return '4';
  if (lower.includes('macet')) return '5';
  return null;
}

// Derive a placeholder 16-digit KTP from CIF for auto-created debtors
function deriveKtpFromCif(cif) {
  let digits = String(cif || '').replace(/\D/g, '');
  if (!digits) digits = '9';
  if (digits.length > 16) digits = digits.slice(-16);
  if (digits.length < 16) digits = digits.padStart(16, '9');
  return digits;
}
