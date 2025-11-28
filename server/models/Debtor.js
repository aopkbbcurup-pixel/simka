const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Debtor = sequelize.define('Debtor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  debtor_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  ktp_number: {
    type: DataTypes.STRING(16),
    allowNull: true,
    unique: true
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  birth_place: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('L', 'P'),
    allowNull: true
  },
  marital_status: {
    type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
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
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  occupation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  company_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  company_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  monthly_income: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  spouse_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  spouse_ktp: {
    type: DataTypes.STRING(16),
    allowNull: true
  },
  emergency_contact_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  emergency_contact_relation: {
    type: DataTypes.STRING(50),
    allowNull: true
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
  tableName: 'debtors',
  indexes: [
    {
      fields: ['ktp_number']
    },
    {
      fields: ['debtor_code']
    },
    {
      fields: ['full_name']
    }
  ]
});

module.exports = Debtor;
