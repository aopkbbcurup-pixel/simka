const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Insurance = sequelize.define('Insurance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  credit_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'credits',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  },
  policy_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  insurance_company: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  policy_type: {
    type: DataTypes.ENUM('life', 'health', 'property', 'vehicle', 'credit', 'other'),
    allowNull: false
  },
  coverage_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  premium_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  policy_start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  policy_end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  beneficiary_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  beneficiary_relation: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  agent_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  agent_contact: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  policy_status: {
    type: DataTypes.ENUM('Diterima', 'Belum Diterima'),
    allowNull: false,
    defaultValue: 'Belum Diterima'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'insurances',
  indexes: [
    {
      fields: ['policy_number']
    },
    {
      fields: ['insurance_company']
    },
    {
      fields: ['policy_type']
    },
    {
      fields: ['policy_end_date']
    }
  ]
});

module.exports = Insurance;
