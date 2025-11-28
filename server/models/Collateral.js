const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Collateral = sequelize.define('Collateral', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  credit_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  collateral_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('SHM', 'SHGB', 'SK', 'SK Berkala', 'BPKB', 'Deposito', 'Emas', 'Lainnya'),
    allowNull: false
  },
  // Property fields (SHM/SHGB)
  certificate_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  land_area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  building_area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  village: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  certificate_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  owner_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Vehicle fields (BPKB)
  police_number: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  bpkb_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  engine_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  chassis_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Common fields
  appraisal_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  appraisal_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  appraiser: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  insurance_company: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  insurance_policy_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  insurance_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  insurance_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  insurance_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  tax_due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  physical_location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Physical storage location of original documents'
  },
  document_status: {
    type: DataTypes.ENUM('Lengkap', 'Proses Notaris'),
    allowNull: false,
    defaultValue: 'Proses Notaris'
  },
  condition: {
    type: DataTypes.ENUM('Baik', 'Cukup', 'Kurang', 'Rusak'),
    defaultValue: 'Baik'
  },
  status: {
    type: DataTypes.ENUM('Aktif', 'Dilepas', 'Disita', 'Dijual'),
    defaultValue: 'Aktif'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'collaterals',
  indexes: [
    {
      fields: ['credit_id']
    },
    {
      fields: ['collateral_code']
    },
    {
      fields: ['type']
    },
    {
      fields: ['certificate_number']
    },
    {
      fields: ['police_number']
    },
    {
      fields: ['insurance_end_date']
    },
    {
      fields: ['tax_due_date']
    }
  ]
});

module.exports = Collateral;
