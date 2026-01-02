const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LetterContentTemplate = sequelize.define('LetterContentTemplate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Template name'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Template description'
    },
    letter_type: {
        type: DataTypes.ENUM('eksternal', 'internal', 'both'),
        defaultValue: 'both',
        comment: 'Applicable letter type'
    },
    subject_template: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Template for subject line'
    },
    content_template: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Template content with placeholders like {{debtor_name}}, {{credit_number}}'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'letter_content_templates',
    indexes: [
        {
            fields: ['letter_type']
        },
        {
            fields: ['is_active']
        }
    ]
});

module.exports = LetterContentTemplate;
