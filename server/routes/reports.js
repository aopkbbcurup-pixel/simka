const express = require('express');
const { Op } = require('sequelize');
const { Debtor, Credit, Collateral, Document, InsuranceClaim, Insurance, CreditFileMovement } = require('../models');
const moment = require('moment');
const router = express.Router();

// Generate insurance expiry report
router.get('/insurance-expiry', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const format = req.query.format || 'json';
    const endDate = moment().add(days, 'days').format('YYYY-MM-DD');

    const collaterals = await Collateral.findAll({
      where: {
        insurance_end_date: {
          [Op.between]: [moment().format('YYYY-MM-DD'), endDate]
        },
        is_active: true
      },
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        }
      ],
      order: [['insurance_end_date', 'ASC']]
    });

    const reportData = collaterals.map(collateral => ({
      debtor_name: collateral.Credit.Debtor.full_name,
      debtor_code: collateral.Credit.Debtor.debtor_code,
      contract_number: collateral.Credit.contract_number,
      collateral_code: collateral.collateral_code,
      collateral_type: collateral.type,
      insurance_company: collateral.insurance_company,
      insurance_policy: collateral.insurance_policy_number,
      insurance_end_date: collateral.insurance_end_date,
      days_until_expiry: moment(collateral.insurance_end_date).diff(moment(), 'days'),
      insurance_value: collateral.insurance_value
    }));

    if (format === 'csv') {
      // Convert to CSV format
      const csv = [
        'Nama Debitur,Kode Debitur,No Kontrak,Kode Agunan,Jenis Agunan,Perusahaan Asuransi,No Polis,Tanggal Berakhir,Hari Tersisa,Nilai Asuransi',
        ...reportData.map(row => 
          `"${row.debtor_name}","${row.debtor_code}","${row.contract_number}","${row.collateral_code}","${row.collateral_type}","${row.insurance_company || ''}","${row.insurance_policy || ''}","${row.insurance_end_date}","${row.days_until_expiry}","${row.insurance_value || 0}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-asuransi-${moment().format('YYYY-MM-DD')}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        report_date: moment().format('YYYY-MM-DD'),
        period_days: days,
        total_records: reportData.length,
        collaterals: reportData
      }
    });
  } catch (error) {
    console.error('Insurance expiry report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate insurance expiry report',
      error: error.message
    });
  }
});

// Generate tax due report
router.get('/tax-due', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const format = req.query.format || 'json';
    const endDate = moment().add(days, 'days').format('YYYY-MM-DD');

    const collaterals = await Collateral.findAll({
      where: {
        tax_due_date: {
          [Op.between]: [moment().format('YYYY-MM-DD'), endDate]
        },
        is_active: true
      },
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        }
      ],
      order: [['tax_due_date', 'ASC']]
    });

    const reportData = collaterals.map(collateral => ({
      debtor_name: collateral.Credit.Debtor.full_name,
      debtor_code: collateral.Credit.Debtor.debtor_code,
      contract_number: collateral.Credit.contract_number,
      collateral_code: collateral.collateral_code,
      collateral_type: collateral.type,
      address: collateral.address,
      tax_due_date: collateral.tax_due_date,
      days_until_due: moment(collateral.tax_due_date).diff(moment(), 'days'),
      tax_amount: collateral.tax_amount
    }));

    if (format === 'csv') {
      const csv = [
        'Nama Debitur,Kode Debitur,No Kontrak,Kode Agunan,Jenis Agunan,Alamat,Tanggal Jatuh Tempo,Hari Tersisa,Jumlah Pajak',
        ...reportData.map(row => 
          `"${row.debtor_name}","${row.debtor_code}","${row.contract_number}","${row.collateral_code}","${row.collateral_type}","${row.address || ''}","${row.tax_due_date}","${row.days_until_due}","${row.tax_amount || 0}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-pajak-${moment().format('YYYY-MM-DD')}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        report_date: moment().format('YYYY-MM-DD'),
        period_days: days,
        total_records: reportData.length,
        collaterals: reportData
      }
    });
  } catch (error) {
    console.error('Tax due report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate tax due report',
      error: error.message
    });
  }
});

// Generate credit maturity report
router.get('/credit-maturity', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const format = req.query.format || 'json';
    const endDate = moment().add(days, 'days').format('YYYY-MM-DD');

    const credits = await Credit.findAll({
      where: {
        maturity_date: {
          [Op.between]: [moment().format('YYYY-MM-DD'), endDate]
        },
        status: { [Op.ne]: 'Lunas' },
        is_active: true
      },
      include: [
        { model: Debtor },
        { model: Collateral, where: { is_active: true }, required: false }
      ],
      order: [['maturity_date', 'ASC']]
    });

    const reportData = credits.map(credit => ({
      debtor_name: credit.Debtor.full_name,
      debtor_code: credit.Debtor.debtor_code,
      contract_number: credit.contract_number,
      credit_type: credit.credit_type,
      plafond: credit.plafond,
      outstanding: credit.outstanding,
      maturity_date: credit.maturity_date,
      days_until_maturity: moment(credit.maturity_date).diff(moment(), 'days'),
      status: credit.status,
      collateral_count: credit.Collaterals ? credit.Collaterals.length : 0
    }));

    if (format === 'csv') {
      const csv = [
        'Nama Debitur,Kode Debitur,No Kontrak,Jenis Kredit,Plafond,Outstanding,Tanggal Jatuh Tempo,Hari Tersisa,Status,Jumlah Agunan',
        ...reportData.map(row => 
          `"${row.debtor_name}","${row.debtor_code}","${row.contract_number}","${row.credit_type}","${row.plafond}","${row.outstanding}","${row.maturity_date}","${row.days_until_maturity}","${row.status}","${row.collateral_count}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-jatuh-tempo-kredit-${moment().format('YYYY-MM-DD')}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        report_date: moment().format('YYYY-MM-DD'),
        period_days: days,
        total_records: reportData.length,
        credits: reportData
      }
    });
  } catch (error) {
    console.error('Credit maturity report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate credit maturity report',
      error: error.message
    });
  }
});

// Generate document status report
router.get('/document-status', async (req, res) => {
  try {
    const format = req.query.format || 'json';

    const collaterals = await Collateral.findAll({
      where: { is_active: true },
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        },
        {
          model: Document,
          required: false,
          where: { is_active: true }
        }
      ]
    });

    const reportData = collaterals.map(collateral => {
      const requiredDocs = ['Sertifikat', 'Polis Asuransi'];
      if (collateral.type === 'BPKB') {
        requiredDocs.push('BPKB', 'STNK');
      } else if (['SHM', 'SHGB'].includes(collateral.type)) {
        requiredDocs.push('IMB', 'PBB');
      }

      const availableDocs = collateral.Documents.map(doc => doc.document_type);
      const missingDocs = requiredDocs.filter(reqDoc => !availableDocs.includes(reqDoc));
      const borrowedDocs = collateral.Documents.filter(doc => doc.borrowed_by && !doc.returned_date);

      return {
        debtor_name: collateral.Credit.Debtor.full_name,
        debtor_code: collateral.Credit.Debtor.debtor_code,
        contract_number: collateral.Credit.contract_number,
        collateral_code: collateral.collateral_code,
        collateral_type: collateral.type,
        required_documents: requiredDocs.join(', '),
        available_documents: availableDocs.join(', '),
        missing_documents: missingDocs.join(', '),
        borrowed_documents: borrowedDocs.map(doc => `${doc.document_type} (${doc.borrowed_by})`).join(', '),
        completion_status: missingDocs.length === 0 ? 'Lengkap' : 'Tidak Lengkap'
      };
    });

    if (format === 'csv') {
      const csv = [
        'Nama Debitur,Kode Debitur,No Kontrak,Kode Agunan,Jenis Agunan,Dokumen Wajib,Dokumen Tersedia,Dokumen Kurang,Dokumen Dipinjam,Status Kelengkapan',
        ...reportData.map(row => 
          `"${row.debtor_name}","${row.debtor_code}","${row.contract_number}","${row.collateral_code}","${row.collateral_type}","${row.required_documents}","${row.available_documents}","${row.missing_documents}","${row.borrowed_documents}","${row.completion_status}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-status-dokumen-${moment().format('YYYY-MM-DD')}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        report_date: moment().format('YYYY-MM-DD'),
        total_records: reportData.length,
        complete_documents: reportData.filter(r => r.completion_status === 'Lengkap').length,
        incomplete_documents: reportData.filter(r => r.completion_status === 'Tidak Lengkap').length,
        collaterals: reportData
      }
    });
  } catch (error) {
    console.error('Document status report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate document status report',
      error: error.message
    });
  }
});

// Generate credit file movement report
router.get('/file-movements', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const movementType = (req.query.movement_type || 'OUT').toUpperCase();
    const startDateParam = req.query.start_date;
    const endDateParam = req.query.end_date;

    if (!startDateParam || !endDateParam) {
      return res.status(400).json({
        success: false,
        message: 'start_date dan end_date wajib diisi dengan format YYYY-MM-DD'
      });
    }

    const startMoment = moment(startDateParam, 'YYYY-MM-DD', true);
    const endMoment = moment(endDateParam, 'YYYY-MM-DD', true);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD'
      });
    }

    if (endMoment.isBefore(startMoment)) {
      return res.status(400).json({
        success: false,
        message: 'end_date tidak boleh lebih awal dari start_date'
      });
    }

    const movements = await CreditFileMovement.findAll({
      where: {
        movement_type: movementType,
        movement_time: {
          [Op.between]: [startMoment.startOf('day').toDate(), endMoment.endOf('day').toDate()]
        }
      },
      include: [
        {
          model: Credit,
          include: [{ model: Debtor }]
        },
        {
          model: Collateral
        },
        {
          model: Document,
          required: false
        }
      ],
      order: [['movement_time', 'DESC']]
    });

    const reportData = movements.map((movement) => {
      const movementMoment = moment(movement.movement_time);
      return {
        movement_date: movementMoment.format('YYYY-MM-DD'),
        movement_time: movementMoment.format('HH:mm'),
        movement_type: movement.movement_type,
        contract_number: movement.Credit?.contract_number || '',
        debtor_name: movement.Credit?.Debtor?.full_name || '',
        debtor_code: movement.Credit?.Debtor?.debtor_code || '',
        collateral_code: movement.Collateral?.collateral_code || 'Berkas Kredit',
        collateral_type: movement.Collateral?.type || '-',
        released_to: movement.released_to || '-',
        responsible_officer: movement.responsible_officer || '-',
        expected_return_date: movement.expected_return_date
          ? moment(movement.expected_return_date).format('YYYY-MM-DD')
          : '',
        received_by: movement.received_by || '-',
        purpose: movement.purpose || '-',
        notes: movement.notes || '-'
      };
    });

    if (format === 'csv') {
      const csv = [
        'Tanggal,Waktu,No Kontrak,Nama Debitur,Kode Debitur,Kode Agunan,Jenis Agunan,Diberikan Kepada,Penanggung Jawab,Tgl Estimasi Kembali,Diterima Oleh,Tujuan,Catatan',
        ...reportData.map((row) =>
          `"${row.movement_date}","${row.movement_time}","${row.contract_number}","${row.debtor_name}","${row.debtor_code}","${row.collateral_code}","${row.collateral_type}","${row.released_to}","${row.responsible_officer}","${row.expected_return_date}","${row.received_by}","${row.purpose}","${row.notes}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="laporan-pergerakan-berkas-${startMoment.format('YYYYMMDD')}-${endMoment.format('YYYYMMDD')}.csv"`
      );
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        movement_type: movementType,
        start_date: startMoment.format('YYYY-MM-DD'),
        end_date: endMoment.format('YYYY-MM-DD'),
        total_records: reportData.length,
        movements: reportData
      }
    });
  } catch (error) {
    console.error('File movement report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate file movement report',
      error: error.message
    });
  }
});

// Generate unpaid insurance claims report
router.get('/unpaid-claims', async (req, res) => {
  try {
    const format = req.query.format || 'json';

    const claims = await InsuranceClaim.findAll({
      where: {
        claim_status: { [Op.ne]: 'paid' },
        is_active: true
      },
      include: [
        {
          model: Debtor,
          attributes: ['full_name', 'debtor_code']
        },
        {
          model: Insurance,
          attributes: ['policy_number', 'insurance_company']
        }
      ],
      order: [['claim_date', 'DESC']]
    });

    const reportData = claims.map(claim => ({
      debtor_name: claim.Debtor.full_name,
      debtor_code: claim.Debtor.debtor_code,
      policy_number: claim.Insurance.policy_number,
      insurance_company: claim.Insurance.insurance_company,
      claim_number: claim.claim_number,
      claim_date: moment(claim.claim_date).format('YYYY-MM-DD'),
      claim_amount: claim.claim_amount,
      claim_status: claim.claim_status,
      incident_date: moment(claim.incident_date).format('YYYY-MM-DD'),
    }));

    if (format === 'csv') {
      const csv = [
        'Nama Debitur,Kode Debitur,No Polis,Perusahaan Asuransi,No Klaim,Tanggal Klaim,Jumlah Klaim,Status Klaim,Tanggal Kejadian',
        ...reportData.map(row => 
          `"${row.debtor_name}","${row.debtor_code}","${row.policy_number}","${row.insurance_company}","${row.claim_number}","${row.claim_date}","${row.claim_amount}","${row.claim_status}","${row.incident_date}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-klaim-belum-dibayar-${moment().format('YYYY-MM-DD')}.csv"`);
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        report_date: moment().format('YYYY-MM-DD'),
        total_records: reportData.length,
        claims: reportData
      }
    });
  } catch (error) {
    console.error('Unpaid claims report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate unpaid claims report',
      error: error.message
    });
  }
});

module.exports = router;
