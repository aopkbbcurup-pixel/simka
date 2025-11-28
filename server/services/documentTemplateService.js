const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const moment = require('moment');
const {
  DocumentTemplate,
  Credit,
  Debtor,
  Collateral,
  User,
} = require('../models');

const DEFAULT_TEMPLATE_CODE = 'ESSENTIALIA_HANDOVER_DEFAULT';

const defaultTemplateMetadata = {
  credit: [
    'contract_number',
    'account_number',
    'credit_type',
    'start_date',
    'maturity_date',
    'plafond',
    'outstanding',
    'interest_rate',
    'tenor_months',
    'purpose',
    'branch_code',
  ],
  debtor: [
    'full_name',
    'debtor_code',
    'ktp_number',
    'address',
    'city',
    'province',
    'phone',
    'mobile',
    'email',
    'occupation',
    'company_name',
  ],
  collaterals: [
    'collateral_code',
    'type',
    'certificate_number',
    'certificate_date',
    'owner_name',
    'address',
    'land_area',
    'building_area',
    'appraisal_value',
    'appraisal_date',
    'insurance_company',
    'insurance_policy_number',
    'insurance_end_date',
    'physical_location',
    'notes',
  ],
  prepared_by: ['name', 'role', 'email'],
  institution: ['name', 'branch', 'address', 'phone'],
  custom: [
    'handover_place',
    'handover_date',
    'bank_officer_name',
    'customer_representative_name',
    'additional_notes',
  ],
};

let helpersRegistered = false;

const registerHandlebarHelpers = () => {
  if (helpersRegistered) {
    return;
  }

  Handlebars.registerHelper('formatDate', (value, format = 'DD MMMM YYYY') => {
    if (!value) return '';
    const parsed = moment(value);
    if (!parsed.isValid()) {
      return value;
    }
    return parsed.locale('id').format(format);
  });

  Handlebars.registerHelper('formatCurrency', (value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return value;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numeric);
  });

  Handlebars.registerHelper('uppercase', (value) =>
    value ? String(value).toUpperCase() : ''
  );
  Handlebars.registerHelper('lowercase', (value) =>
    value ? String(value).toLowerCase() : ''
  );
  Handlebars.registerHelper('inc', (value) => Number(value || 0) + 1);
  Handlebars.registerHelper('default', (value, fallback) =>
    value === undefined || value === null || value === '' ? fallback : value
  );
  Handlebars.registerHelper('newlineToBr', (value) =>
    value ? String(value).replace(/\n/g, '<br />') : ''
  );
  Handlebars.registerHelper('json', (value) =>
    JSON.stringify(value, null, 2)
  );

  helpersRegistered = true;
};

const readDefaultTemplateContent = () => {
  const templatePath = path.join(
    __dirname,
    '..',
    'templates',
    'essentialia-handover-default.hbs'
  );

  return fs.readFileSync(templatePath, 'utf-8');
};

const ensureDefaultTemplate = async () => {
  const existing = await DocumentTemplate.findOne({
    where: { template_code: DEFAULT_TEMPLATE_CODE },
  });

  if (existing) {
    return existing;
  }

  const content = readDefaultTemplateContent();

  return DocumentTemplate.create({
    template_code: DEFAULT_TEMPLATE_CODE,
    name: 'Dokumen Serah Terima Jaminan (Default)',
    document_category: 'ESSENTIALIA_HANDOVER',
    format: 'html',
    content,
    description:
      'Template default untuk mencetak dokumen essentialia / serah terima jaminan kredit.',
    placeholders: defaultTemplateMetadata,
    version: 1,
    is_active: true,
  });
};

const slugify = (value) => {
  if (!value) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
};

const wrapHtmlDocument = (bodyHtml, meta = {}) => {
  if (!bodyHtml) {
    return '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Dokumen</title></head><body></body></html>';
  }

  if (/<\s*html[^>]*>/i.test(bodyHtml)) {
    // Assume template already provides full HTML structure
    return bodyHtml;
  }

  const baseStyles = `
    @media print {
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 32px;
      color: #1f2937;
      background-color: #ffffff;
      line-height: 1.6;
    }
    h1, h2, h3, h4 {
      color: #111827;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 24px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h2 {
      font-size: 18px;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 4px;
      margin-top: 32px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    table th, table td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      vertical-align: top;
      font-size: 13px;
    }
    table th {
      background-color: #f9fafb;
      text-align: left;
      font-weight: 600;
    }
    .section {
      margin-bottom: 24px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .meta-item {
      min-width: 220px;
    }
    .signature-blocks {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      margin-top: 48px;
    }
    .signature-block {
      flex: 1;
      text-align: center;
      font-size: 13px;
    }
    .signature-placeholder {
      margin-top: 64px;
      border-top: 1px solid #9ca3af;
      padding-top: 8px;
    }
    .badge {
      display: inline-block;
      background-color: #e5e7eb;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  `;

  const title = meta.title || 'Dokumen Serah Terima Jaminan';
  const subtitle = meta.subtitle || '';

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${baseStyles}</style>
  </head>
  <body>
    <div class="no-print" style="margin-bottom: 16px;">
      <button onclick="window.print()" style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
        Cetak Dokumen
      </button>
    </div>
    <header style="margin-bottom: 24px;">
      <div class="badge">${subtitle}</div>
    </header>
    ${bodyHtml}
  </body>
</html>`;
};

const buildPreparedByInfo = async (userId) => {
  if (!userId) {
    return null;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.full_name,
    role: user.role,
    email: user.email,
  };
};

const buildEssentialiaContext = async ({
  creditId,
  collateralIds = [],
  customFields = {},
  preparedBy,
}) => {
  const creditRecord = await Credit.findOne({
    where: { id: creditId, is_active: true },
    include: [
      { model: Debtor },
      {
        model: Collateral,
        where: { is_active: true },
        required: false,
      },
    ],
  });

  if (!creditRecord) {
    const error = new Error('Credit not found');
    error.statusCode = 404;
    throw error;
  }

  const credit = creditRecord.get({ plain: true });
  const debtor = credit.Debtor || {};

  let collaterals = Array.isArray(credit.Collaterals)
    ? credit.Collaterals
    : [];

  if (collateralIds.length > 0) {
    const idSet = new Set(collateralIds);
    collaterals = collaterals.filter((collateral) => idSet.has(collateral.id));
  }

  const transformedCollaterals = collaterals.map((collateral) => ({
    id: collateral.id,
    collateral_code: collateral.collateral_code,
    type: collateral.type,
    certificate_number: collateral.certificate_number,
    certificate_date: collateral.certificate_date,
    owner_name: collateral.owner_name,
    address: collateral.address,
    land_area: collateral.land_area,
    building_area: collateral.building_area,
    appraisal_value: collateral.appraisal_value,
    appraisal_date: collateral.appraisal_date,
    insurance_company: collateral.insurance_company,
    insurance_policy_number: collateral.insurance_policy_number,
    insurance_end_date: collateral.insurance_end_date,
    physical_location: collateral.physical_location,
    notes: collateral.notes,
  }));

  const totalAppraisalValue = transformedCollaterals.reduce((sum, item) => {
    const value = Number(item.appraisal_value);
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  const preparedByInfo =
    preparedBy && preparedBy.id
      ? preparedBy
      : await buildPreparedByInfo(preparedBy?.userId || preparedBy?.id);

  const institutionInfo = {
    name: process.env.INSTITUTION_NAME || 'PT. Bank SIMKA Indonesia',
    branch:
      customFields.institution_branch ||
      credit.branch_code ||
      process.env.INSTITUTION_BRANCH ||
      'Cabang Utama',
    address: process.env.INSTITUTION_ADDRESS || '',
    phone: process.env.INSTITUTION_PHONE || '',
  };

  const handoverDate =
    customFields.handover_date || moment().format('YYYY-MM-DD');

  return {
    generated_at: moment().toISOString(),
    credit: {
      id: credit.id,
      contract_number: credit.contract_number,
      account_number: credit.account_number,
      credit_type: credit.credit_type,
      start_date: credit.start_date,
      maturity_date: credit.maturity_date,
      plafond: credit.plafond,
      outstanding: credit.outstanding,
      interest_rate: credit.interest_rate,
      tenor_months: credit.tenor_months,
      purpose: credit.purpose,
      branch_code: credit.branch_code,
    },
    debtor: {
      id: debtor.id,
      full_name: debtor.full_name,
      debtor_code: debtor.debtor_code,
      ktp_number: debtor.ktp_number,
      address: debtor.address,
      city: debtor.city,
      province: debtor.province,
      phone: debtor.phone,
      mobile: debtor.mobile,
      email: debtor.email,
      occupation: debtor.occupation,
      company_name: debtor.company_name,
    },
    collaterals: transformedCollaterals,
    collateral_summary: {
      total_items: transformedCollaterals.length,
      total_appraisal_value: totalAppraisalValue,
    },
    prepared_by:
      preparedByInfo || {
        name: customFields.bank_officer_name || 'Petugas Kredit',
        role: 'Petugas Kredit',
      },
    custom: {
      handover_place: customFields.handover_place || institutionInfo.branch,
      handover_date: handoverDate,
      bank_officer_name:
        customFields.bank_officer_name ||
        preparedByInfo?.name ||
        'Petugas Kredit',
      customer_representative_name:
        customFields.customer_representative_name ||
        debtor.full_name ||
        'Pihak Nasabah',
      additional_notes: customFields.additional_notes || '',
    },
    institution: institutionInfo,
  };
};

const renderEssentialiaDocument = async ({
  creditId,
  templateId,
  templateCode,
  collateralIds,
  customFields,
  preparedBy,
}) => {
  await ensureDefaultTemplate();
  registerHandlebarHelpers();

  const template = await DocumentTemplate.findOne({
    where: {
      is_active: true,
      ...(templateId ? { id: templateId } : {}),
      ...(templateCode ? { template_code: templateCode } : {}),
      ...(!templateId && !templateCode
        ? { template_code: DEFAULT_TEMPLATE_CODE }
        : {}),
    },
  });

  if (!template) {
    const error = new Error('Document template not found');
    error.statusCode = 404;
    throw error;
  }

  const context = await buildEssentialiaContext({
    creditId,
    collateralIds,
    customFields,
    preparedBy,
  });

  const compiled = Handlebars.compile(template.content, { noEscape: false });
  const bodyHtml = compiled(context);

  const html = wrapHtmlDocument(bodyHtml, {
    title: `${template.name} - ${context.credit.contract_number}`,
    subtitle: context.institution.name,
  });

  const filename = [
    slugify(template.name),
    slugify(context.credit.contract_number),
    moment().format('YYYYMMDD-HHmm'),
  ]
    .filter(Boolean)
    .join('-')
    .concat('.html');

  return {
    html,
    filename,
    context,
    template: {
      id: template.id,
      name: template.name,
      template_code: template.template_code,
      version: template.version,
      document_category: template.document_category,
    },
  };
};

module.exports = {
  DEFAULT_TEMPLATE_CODE,
  ensureDefaultTemplate,
  renderEssentialiaDocument,
  defaultTemplateMetadata,
};

