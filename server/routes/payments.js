const express = require('express');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const { Payment, Credit, Debtor } = require('../models');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

// Configure multer for Excel uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
});

// List payments with optional credit filter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const creditId = req.query.credit_id || null;

    const where = { is_active: true };
    if (creditId) where.credit_id = creditId;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      limit,
      offset,
      order: [['payment_date', 'DESC'], ['createdAt', 'DESC']],
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        payments: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_records: count,
          per_page: limit
        }
      }
    });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments', error: error.message });
  }
});

// Export payments to Excel (optionally by credit)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const creditId = req.query.credit_id || null;
    const where = { is_active: true };
    if (creditId) where.credit_id = creditId;

    const payments = await Payment.findAll({
      where,
      order: [['payment_date', 'DESC'], ['createdAt', 'DESC']],
      include: [{
        model: Credit,
        include: [{ model: Debtor }]
      }]
    });

    const excelData = payments.map((p) => ({
      'Tanggal': p.payment_date ? new Date(p.payment_date).toLocaleDateString('id-ID') : '',
      'No. Kontrak': p.Credit?.contract_number || '',
      'Kode Debitur': p.Credit?.Debtor?.debtor_code || '',
      'Nama Debitur': p.Credit?.Debtor?.full_name || '',
      'Nominal': Number(p.amount || 0),
      'Pokok': Number((p.principal_amount ?? p.amount) || 0),
      'Bunga': Number(p.interest_amount || 0),
      'Denda': Number(p.penalty_amount || 0),
      'Catatan': p.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const headers = Object.keys(excelData[0] || {});
    ws['!cols'] = headers.map((h, i) => ({ width: Math.min(Math.max(h.length, ...excelData.map(r => String(r[h] || '').length)) + 2, 50) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `data-pembayaran-${timestamp}.xlsx`;
    const filepath = path.join(__dirname, '../uploads/temp', filename);

    XLSX.writeFile(wb, filepath);

    res.download(filepath, filename, (err) => {
      if (err) console.error('Download error:', err);
      setTimeout(() => {
        try { fs.unlinkSync(filepath); } catch (e) { console.error('Cleanup error:', e); }
      }, 5000);
    });
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to export payments', error: error.message });
  }
});

// Download payments Excel template
router.get('/template', authenticateToken, (req, res) => {
  try {
    const mode = String(req.query.mode || '').toLowerCase();
    const baseRow = {
      'Tanggal': '01/01/2024',
      'Nominal': '5000000',
      'Pokok': '4000000',
      'Bunga': '1000000',
      'Denda': '0',
      'Catatan': 'Angsuran bulan Januari'
    };
    const templateData = [
      mode === 'credit'
        ? baseRow
        : { 'No. Kontrak': 'CTR-001', ...baseRow }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = Object.keys(templateData[0]).map(h => ({ width: Math.max(h.length + 2, 15) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Template Pembayaran');

    const filename = mode === 'credit' ? 'template-pembayaran-kredit.xlsx' : 'template-pembayaran.xlsx';
    const filepath = path.join(__dirname, '../uploads/temp', filename);
    XLSX.writeFile(wb, filepath);

    res.download(filepath, filename, (err) => {
      if (err) console.error('Template download error:', err);
      setTimeout(() => { try { fs.unlinkSync(filepath); } catch (e) {} }, 5000);
    });
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template', error: error.message });
  }
});

// Import payments from Excel
router.post('/import', authenticateToken, authorize(['admin', 'analyst']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const wb = XLSX.readFile(req.file.path);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'File is empty or invalid format' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const contract = String(row['No. Kontrak'] || '').trim();
        const date = parseDate(row['Tanggal']);
        const amount = parseNumber(row['Nominal']);
        const principal = row['Pokok'] != null && row['Pokok'] !== '' ? parseNumber(row['Pokok']) : amount;
        const interest = row['Bunga'] != null && row['Bunga'] !== '' ? parseNumber(row['Bunga']) : null;
        const penalty = row['Denda'] != null && row['Denda'] !== '' ? parseNumber(row['Denda']) : null;
        const notes = row['Catatan'] || null;

        if (!contract) throw new Error('No. Kontrak wajib diisi');
        if (!date) throw new Error('Tanggal tidak valid');
        if (!amount || amount <= 0) throw new Error('Nominal tidak valid');

        const credit = await Credit.findOne({ where: { contract_number: contract, is_active: true } });
        if (!credit) throw new Error(`Kredit dengan kontrak ${contract} tidak ditemukan`);

        // Validate principal vs outstanding
        const currentOutstanding = parseFloat(credit.outstanding);
        if ((principal ?? 0) < 0 || (interest ?? 0) < 0 || (penalty ?? 0) < 0) {
          throw new Error('Pokok, bunga, dan denda tidak boleh bernilai negatif');
        }
        const breakdownSum = (principal ?? amount ?? 0) + (interest ?? 0) + (penalty ?? 0);
        if (breakdownSum > amount) {
          throw new Error(`Rincian (pokok+bunga+denda = ${breakdownSum}) melebihi nominal (${amount})`);
        }

        const principalApplied = (principal ?? amount);
        if (principalApplied > currentOutstanding) {
          throw new Error(`Pokok (${principalApplied}) melebihi outstanding (${currentOutstanding})`);
        }

        await Payment.create({
          credit_id: credit.id,
          amount,
          principal_amount: principalApplied,
          interest_amount: interest,
          penalty_amount: penalty,
          payment_date: date,
          notes,
          created_by: req.user?.id
        });

        // Update credit
        let newOutstanding = currentOutstanding - principalApplied;
        if (newOutstanding < 0) newOutstanding = 0;

        const updatePayload = {
          outstanding: newOutstanding,
          last_payment_date: date
        };
        if (newOutstanding === 0) {
          updatePayload.status = 'Lunas';
          updatePayload.collectibility = '1';
          updatePayload.days_past_due = 0;
        }
        await credit.update(updatePayload);

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: err.message });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({ success: true, message: `Import completed: ${results.success} berhasil, ${results.failed} gagal`, data: results });
  } catch (error) {
    console.error('Import payments error:', error);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(500).json({ success: false, message: 'Failed to import payments', error: error.message });
  }
});

// Import payments for a specific credit (no contract column in file)
router.post('/import/:creditId', authenticateToken, authorize(['admin', 'analyst']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const credit = await Credit.findOne({ where: { id: req.params.creditId, is_active: true } });
    if (!credit) {
      return res.status(404).json({ success: false, message: 'Credit not found' });
    }

    const wb = XLSX.readFile(req.file.path);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'File is empty or invalid format' });
    }

    const results = { success: 0, failed: 0, errors: [] };
    let currentOutstanding = parseFloat(credit.outstanding);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const date = parseDate(row['Tanggal']);
        const amount = parseNumber(row['Nominal']);
        const principal = row['Pokok'] != null && row['Pokok'] !== '' ? parseNumber(row['Pokok']) : amount;
        const interest = row['Bunga'] != null && row['Bunga'] !== '' ? parseNumber(row['Bunga']) : null;
        const penalty = row['Denda'] != null && row['Denda'] !== '' ? parseNumber(row['Denda']) : null;
        const notes = row['Catatan'] || null;

        if (!date) throw new Error('Tanggal tidak valid');
        if (!amount || amount <= 0) throw new Error('Nominal tidak valid');

        const principalApplied = (principal ?? amount);
        if (principalApplied > currentOutstanding) {
          throw new Error(`Pokok (${principalApplied}) melebihi outstanding (${currentOutstanding})`);
        }

        await Payment.create({
          credit_id: credit.id,
          amount,
          principal_amount: principalApplied,
          interest_amount: interest,
          penalty_amount: penalty,
          payment_date: date,
          notes,
          created_by: req.user?.id
        });

        currentOutstanding = currentOutstanding - principalApplied;
        if (currentOutstanding < 0) currentOutstanding = 0;
        const updatePayload = { outstanding: currentOutstanding, last_payment_date: date };
        if (currentOutstanding === 0) {
          updatePayload.status = 'Lunas';
          updatePayload.collectibility = '1';
          updatePayload.days_past_due = 0;
        }
        await credit.update(updatePayload);

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 2, data: row, error: err.message });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({ success: true, message: `Import completed: ${results.success} berhasil, ${results.failed} gagal`, data: results });
  } catch (error) {
    console.error('Import payments by credit error:', error);
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    res.status(500).json({ success: false, message: 'Failed to import payments', error: error.message });
  }
});
// Create payment and update credit outstanding
router.post('/', authenticateToken, authorize(['admin', 'analyst']), [
  body('credit_id').isUUID().withMessage('Valid credit ID is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('payment_date').isDate().withMessage('Valid payment date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const credit = await Credit.findOne({ where: { id: req.body.credit_id, is_active: true }, include: [{ model: Debtor }] });
    if (!credit) {
      return res.status(404).json({ success: false, message: 'Credit not found' });
    }

    // Normalize breakdown and validate vs amount
    const amount = parseFloat(req.body.amount);
    const principal = req.body.principal_amount != null ? parseFloat(req.body.principal_amount) : amount;
    const interest = req.body.interest_amount != null ? parseFloat(req.body.interest_amount) : 0;
    const penalty = req.body.penalty_amount != null ? parseFloat(req.body.penalty_amount) : 0;
    if (principal < 0 || interest < 0 || penalty < 0) {
      return res.status(400).json({ success: false, message: 'Pokok, bunga, dan denda tidak boleh bernilai negatif.' });
    }
    const breakdownSum = (isNaN(principal) ? 0 : principal) + (isNaN(interest) ? 0 : interest) + (isNaN(penalty) ? 0 : penalty);
    if (breakdownSum > amount) {
      return res.status(400).json({ success: false, message: `Rincian (pokok+bunga+denda = ${breakdownSum}) melebihi nominal (${amount}).` });
    }

    // Validate principal against outstanding
    const currentOutstanding = parseFloat(credit.outstanding);
    if (principal > currentOutstanding) {
      return res.status(400).json({
        success: false,
        message: `Pokok pembayaran (${principal}) melebihi outstanding (${currentOutstanding}).`
      });
    }

    const payment = await Payment.create({
      credit_id: req.body.credit_id,
      amount: amount,
      principal_amount: req.body.principal_amount != null ? principal : null,
      interest_amount: req.body.interest_amount != null ? interest : null,
      penalty_amount: req.body.penalty_amount != null ? penalty : null,
      payment_date: req.body.payment_date,
      channel: req.body.channel || null,
      reference_number: req.body.reference_number || null,
      notes: req.body.notes || null,
      created_by: req.user?.id
    });

    // Update credit outstanding and status
    // Use validated principal/currentOutstanding above
    let newOutstanding = currentOutstanding - principal;
    if (!isFinite(newOutstanding)) newOutstanding = currentOutstanding; // safeguard
    if (newOutstanding < 0) newOutstanding = 0;

    const updatePayload = {
      outstanding: newOutstanding,
      last_payment_date: req.body.payment_date
    };

    if (newOutstanding === 0) {
      updatePayload.status = 'Lunas';
      updatePayload.collectibility = '1';
      updatePayload.days_past_due = 0;
    }

    await credit.update(updatePayload);

    const paymentWithCredit = await Payment.findByPk(payment.id, {
      include: [{
        model: Credit,
        include: [{ model: Debtor }]
      }]
    });

    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: { payment: paymentWithCredit, credit } });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment', error: error.message });
  }
});

// Soft delete a payment and re-adjust outstanding
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const payment = await Payment.findOne({ where: { id: req.params.id, is_active: true } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const credit = await Credit.findOne({ where: { id: payment.credit_id, is_active: true } });
    if (!credit) {
      return res.status(404).json({ success: false, message: 'Related credit not found' });
    }

    // Reverse the principal effect on outstanding
    const principal = payment.principal_amount != null ? parseFloat(payment.principal_amount) : parseFloat(payment.amount);
    const newOutstanding = parseFloat(credit.outstanding) + principal;

    await payment.update({ is_active: false });

    // If credit was previously set to Lunas due to this payment, we simply increase outstanding now
    await credit.update({ outstanding: newOutstanding });

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment', error: error.message });
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
  for (const f of formats) {
    const m = String(dateStr).match(f);
    if (m) {
      if (f === formats[1]) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
  }
  return null;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = String(value).replace(/[^\d.-]/g, '');
  return num ? parseFloat(num) : null;
}
