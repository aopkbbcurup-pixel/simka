const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditFileMovement = sequelize.define('CreditFileMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  credit_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  collateral_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  document_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  movement_type: {
    type: DataTypes.ENUM('OUT', 'IN'),
    allowNull: false
  },
  released_to: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Nama penerima dokumen saat keluar'
  },
  responsible_officer: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Petugas yang menyetujui atau menyerahkan dokumen'
  },
  expected_return_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  received_by: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Nama petugas penerima saat dokumen kembali'
  },
  movement_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  purpose: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  created_by_name: {
    type: DataTypes.STRING(150),
    allowNull: true
  }
}, {
  tableName: 'credit_file_movements',
  indexes: [
    { fields: ['credit_id'] },
    { fields: ['collateral_id'] },
    { fields: ['movement_time'] }
  ]
});

module.exports = CreditFileMovement;
