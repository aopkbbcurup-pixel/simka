const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InsuranceClaim = sequelize.define('InsuranceClaim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  claim_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  debtor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'debtors',
      key: 'id'
    }
  },
  insurance_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'insurances',
      key: 'id'
    }
  },
  claim_type: {
    type: DataTypes.ENUM('death', 'disability', 'medical', 'accident', 'property_damage', 'other'),
    allowNull: false
  },
  claim_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  claim_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  incident_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  incident_description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  claim_status: {
    type: DataTypes.ENUM('submitted', 'under_review', 'processing', 'approved', 'rejected', 'paid', 'closed'),
    defaultValue: 'submitted'
  },
  status_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  adjuster_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  adjuster_contact: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  settlement_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  settlement_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payment_method: {
    type: DataTypes.ENUM('bank_transfer', 'check', 'cash', 'other'),
    allowNull: true
  },
  documents_submitted: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of document types submitted'
  },
  follow_up_date: {
    type: DataTypes.DATE,
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
  tableName: 'insurance_claims',
  indexes: [
    {
      fields: ['claim_number']
    },
    {
      fields: ['debtor_id']
    },
    {
      fields: ['insurance_id']
    },
    {
      fields: ['claim_status']
    },
    {
      fields: ['claim_date']
    },
    {
      fields: ['follow_up_date']
    }
  ]
});

module.exports = InsuranceClaim;
