const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  collateral_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  document_type: {
    type: DataTypes.ENUM(
      'Sertifikat', 'IMB', 'PBB', 'BPKB', 'STNK', 
      'Polis Asuransi', 'Foto Agunan', 'Surat Kuasa', 
      'Akta Jual Beli', 'Lainnya'
    ),
    allowNull: false
  },
  document_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  original_filename: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  is_original_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether original physical document is available'
  },
  physical_location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Physical storage location of original document'
  },
  borrowed_by: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Who borrowed the original document'
  },
  borrowed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expected_return_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  returned_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  borrowing_purpose: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  ocr_text: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Extracted text from OCR processing'
  },
  document_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date mentioned in the document'
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Expiry date if applicable (insurance, etc.)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'documents',
  indexes: [
    {
      fields: ['collateral_id']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['expiry_date']
    },
    {
      fields: ['borrowed_by']
    }
  ]
});

module.exports = Document;
