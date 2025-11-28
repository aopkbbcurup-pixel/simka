const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Credit = sequelize.define('Credit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  contract_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  account_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  debtor_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  credit_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  plafond: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  outstanding: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  interest_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  tenor_months: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  monthly_payment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  maturity_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Lancar', 'Dalam Perhatian Khusus', 'Kurang Lancar', 'Diragukan', 'Macet', 'Lunas'),
    defaultValue: 'Lancar'
  },
  collectibility: {
    type: DataTypes.ENUM('1', '2', '3', '4', '5'),
    defaultValue: '1'
  },
  last_payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  days_past_due: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  restructure_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_restructure_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  account_officer: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  branch_code: {
    type: DataTypes.STRING(10),
    allowNull: true
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
  tableName: 'credits',
  indexes: [
    {
      fields: ['contract_number']
    },
    {
      fields: ['debtor_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['maturity_date']
    }
  ]
});

module.exports = Credit;
