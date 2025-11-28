const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  credit_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  principal_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  interest_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  penalty_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  channel: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  reference_number: {
    type: DataTypes.STRING(100),
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
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'payments',
  indexes: [
    { fields: ['credit_id'] },
    { fields: ['payment_date'] }
  ]
});

module.exports = Payment;

