const express = require('express');
const { Op } = require('sequelize');
const { Debtor, Credit, Collateral, Document, Notification, Insurance } = require('../models');
const moment = require('moment');
const { shortCache } = require('../middleware/cache');
const router = express.Router();

// Get dashboard statistics and alerts (with 2-minute cache)
router.get('/stats', shortCache, async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const next30Days = moment().add(30, 'days').format('YYYY-MM-DD');
    const next60Days = moment().add(60, 'days').format('YYYY-MM-DD');
    const next90Days = moment().add(90, 'days').format('YYYY-MM-DD');

    // Insurance expiring alerts
    const insuranceExpiring = await Collateral.findAll({
      where: {
        insurance_end_date: {
          [Op.between]: [today, next90Days]
        },
        is_active: true
      },
      include: [
        {
          model: Credit,
          required: false,
          include: [{ model: Debtor, required: false }]
        }
      ],
      order: [['insurance_end_date', 'ASC']]
    }).catch(() => []);

    // Tax due alerts
    const taxDue = await Collateral.findAll({
      where: {
        tax_due_date: {
          [Op.between]: [today, next90Days]
        },
        is_active: true
      },
      include: [
        {
          model: Credit,
          required: false,
          include: [{ model: Debtor, required: false }]
        }
      ],
      order: [['tax_due_date', 'ASC']]
    }).catch(() => []);

    // Credits maturing soon
    const creditsMaturing = await Credit.findAll({
      where: {
        maturity_date: {
          [Op.between]: [today, next90Days]
        },
        status: {
          [Op.not]: 'Lunas'
        },
        is_active: true
      },
      include: [{ model: Debtor, required: false }],
      order: [['maturity_date', 'ASC']]
    }).catch(() => []);

    // Pending Policies
    const pendingPolicies = await Insurance.findAll({
      where: {
        policy_status: 'Belum Diterima',
        is_active: true,
      },
      include: [
        {
          model: Credit,
          required: false,
          include: [{ model: Debtor, required: false, attributes: ['id', 'full_name', 'debtor_code'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    }).catch(() => []);

    // Pending Documents
    const pendingDocuments = await Collateral.findAll({
      where: {
        document_status: 'Proses Notaris',
        is_active: true,
      },
      include: [
        {
          model: Credit,
          required: false,
          include: [{ model: Debtor, required: false, attributes: ['id', 'full_name', 'debtor_code'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    }).catch(() => []);

    // Incomplete documents
    const incompleteDocuments = await Collateral.findAll({
      where: {
        is_active: true
      },
      include: [
        {
          model: Document,
          required: false
        },
        {
          model: Credit,
          required: false,
          include: [{ model: Debtor, required: false, attributes: ['id', 'full_name', 'debtor_code'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    }).then(collaterals => {
      return collaterals.filter(collateral => {
        const requiredDocs = ['Sertifikat', 'Polis Asuransi'];
        if (collateral.type === 'BPKB') {
          requiredDocs.push('BPKB', 'STNK');
        } else if (['SHM', 'SHGB'].includes(collateral.type)) {
          requiredDocs.push('IMB', 'PBB');
        }

        const availableDocs = collateral.Documents ? collateral.Documents.map(doc => doc.document_type) : [];
        return requiredDocs.some(reqDoc => !availableDocs.includes(reqDoc));
      });
    }).catch(() => []);

    // General statistics
    const totalDebtors = await Debtor.count({ where: { is_active: true } });
    const totalCredits = await Credit.count({ where: { is_active: true } });
    const totalCollaterals = await Collateral.count({ where: { is_active: true } });

    // Get credits by collectibility (mapped to status labels)
    const creditsByCollectibility = await Credit.findAll({
      attributes: ['collectibility', [Credit.sequelize.fn('COUNT', '*'), 'count']],
      where: {
        is_active: true,
        collectibility: { [Op.not]: null }
      },
      group: ['collectibility'],
      raw: true
    });

    // Map collectibility codes to status labels
    const creditsByStatus = creditsByCollectibility.map(item => {
      let statusLabel;
      switch (item.collectibility) {
        case '1':
          statusLabel = 'Lancar';
          break;
        case '2':
          statusLabel = 'Dalam Perhatian Khusus';
          break;
        case '3':
          statusLabel = 'Kurang Lancar';
          break;
        case '4':
          statusLabel = 'Diragukan';
          break;
        case '5':
          statusLabel = 'Macet';
          break;
        default:
          statusLabel = item.collectibility;
      }
      return {
        status: statusLabel,
        count: item.count
      };
    });

    // Also get credits with 'Lunas' status
    const lunasCredits = await Credit.count({
      where: {
        is_active: true,
        status: 'Lunas'
      }
    });

    if (lunasCredits > 0) {
      creditsByStatus.push({
        status: 'Lunas',
        count: lunasCredits
      });
    }

    const collateralsByType = await Collateral.findAll({
      attributes: ['type', [Collateral.sequelize.fn('COUNT', '*'), 'count']],
      where: { is_active: true },
      group: ['type'],
      raw: true
    }).catch(() => []);

    // Outstanding amount by collectibility (mapped to status)
    const outstandingByCollectibility = await Credit.findAll({
      attributes: [
        'collectibility',
        [Credit.sequelize.fn('SUM', Credit.sequelize.col('outstanding')), 'total_outstanding']
      ],
      where: {
        is_active: true,
        collectibility: { [Op.not]: null }
      },
      group: ['collectibility'],
      raw: true
    }).catch(() => []);

    // Map collectibility to status labels for outstanding amounts
    const outstandingByStatus = outstandingByCollectibility.map(item => {
      let statusLabel;
      switch (item.collectibility) {
        case '1':
          statusLabel = 'Lancar';
          break;
        case '2':
          statusLabel = 'Dalam Perhatian Khusus';
          break;
        case '3':
          statusLabel = 'Kurang Lancar';
          break;
        case '4':
          statusLabel = 'Diragukan';
          break;
        case '5':
          statusLabel = 'Macet';
          break;
        default:
          statusLabel = item.collectibility;
      }
      return {
        status: statusLabel,
        total_outstanding: item.total_outstanding
      };
    });

    // Add Lunas outstanding amount
    const lunasOutstanding = await Credit.findOne({
      attributes: [
        [Credit.sequelize.fn('SUM', Credit.sequelize.col('outstanding')), 'total_outstanding']
      ],
      where: {
        is_active: true,
        status: 'Lunas'
      },
      raw: true
    }).catch(() => null);

    if (lunasOutstanding && lunasOutstanding.total_outstanding) {
      outstandingByStatus.push({
        status: 'Lunas',
        total_outstanding: lunasOutstanding.total_outstanding
      });
    }

    res.json({
      success: true,
      data: {
        alerts: {
          insurance_expiring: {
            next_30_days: insuranceExpiring.filter(c => moment(c.insurance_end_date).isBefore(next30Days)).length,
            next_60_days: insuranceExpiring.filter(c => moment(c.insurance_end_date).isBefore(next60Days)).length,
            next_90_days: insuranceExpiring.length,
            items: insuranceExpiring.slice(0, 10) // Top 10 most urgent
          },
          tax_due: {
            next_30_days: taxDue.filter(c => moment(c.tax_due_date).isBefore(next30Days)).length,
            next_60_days: taxDue.filter(c => moment(c.tax_due_date).isBefore(next60Days)).length,
            next_90_days: taxDue.length,
            items: taxDue.slice(0, 10)
          },
          credits_maturing: {
            next_30_days: creditsMaturing.filter(c => moment(c.maturity_date).isBefore(next30Days)).length,
            next_60_days: creditsMaturing.filter(c => moment(c.maturity_date).isBefore(next60Days)).length,
            next_90_days: creditsMaturing.length,
            items: creditsMaturing.slice(0, 10)
          },
          incomplete_documents: {
            count: incompleteDocuments.length,
            items: incompleteDocuments.slice(0, 10)
          },
          pending_policies: {
            count: pendingPolicies.length,
            items: pendingPolicies.slice(0, 10),
          },
          pending_documents: {
            count: pendingDocuments.length,
            items: pendingDocuments.slice(0, 10),
          },
        },
        statistics: {
          total_debtors: totalDebtors,
          total_credits: totalCredits,
          total_collaterals: totalCollaterals,
          credits_by_status: creditsByStatus,
          collaterals_by_type: collateralsByType,
          outstanding_by_status: outstandingByStatus
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Recent debtors
    const recentDebtors = await Debtor.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      where: { is_active: true }
    });

    // Recent credits
    const recentCredits = await Credit.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      where: { is_active: true },
      include: [{ model: Debtor }]
    });

    // Recent collaterals
    const recentCollaterals = await Collateral.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      where: { is_active: true },
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
        recent_debtors: recentDebtors,
        recent_credits: recentCredits,
        recent_collaterals: recentCollaterals
      }
    });
  } catch (error) {
    console.error('Dashboard activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities',
      error: error.message
    });
  }
});

module.exports = router;
