const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LetterConfiguration = sequelize.define('LetterConfiguration', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    unit_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Unit code for letter numbering, e.g., AOPK/C.2'
    },
    unit_name: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Full name of the unit'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this is the default configuration'
    },
    updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User who last updated this configuration'
    }
}, {
    tableName: 'letter_configurations',
    indexes: [
        {
            fields: ['is_default']
        }
    ]
});

module.exports = LetterConfiguration;
