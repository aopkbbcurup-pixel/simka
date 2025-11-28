const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM(
      'insurance_expiry', 'tax_due', 'credit_maturity', 
      'document_incomplete', 'document_borrowed', 'system'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  related_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of related entity (debtor, credit, collateral, etc.)'
  },
  related_type: {
    type: DataTypes.ENUM('debtor', 'credit', 'collateral', 'document'),
    allowNull: true
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  action_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  action_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this notification should be sent'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  email_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data related to the notification'
  }
}, {
  tableName: 'notifications',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['is_read']
    },
    {
      fields: ['scheduled_date']
    },
    {
      fields: ['priority']
    }
  ]
});

module.exports = Notification;
