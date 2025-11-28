const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentTemplate = sequelize.define(
  'DocumentTemplate',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    template_code: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      comment: 'Unique identifier used by the application layer',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    document_category: {
      type: DataTypes.ENUM(
        'ESSENTIALIA_HANDOVER',
        'CREDIT_HANDOVER',
        'CREDIT_REVIEW',
        'CUSTOM'
      ),
      allowNull: false,
      defaultValue: 'CUSTOM',
    },
    format: {
      type: DataTypes.ENUM('html', 'docx', 'pdf'),
      allowNull: false,
      defaultValue: 'html',
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    placeholders: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Metadata describing available placeholder variables',
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: 'document_templates',
    indexes: [
      {
        fields: ['template_code'],
        unique: true,
      },
      {
        fields: ['document_category'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

module.exports = DocumentTemplate;

