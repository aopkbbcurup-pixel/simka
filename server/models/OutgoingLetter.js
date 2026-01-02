const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OutgoingLetter = sequelize.define('OutgoingLetter', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    letter_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Full letter number, e.g., 001/S.Eks/AOPK/C.2/2026'
    },
    sequence_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Sequential number per year and type'
    },
    letter_type: {
        type: DataTypes.ENUM('eksternal', 'internal'),
        allowNull: false,
        comment: 'Type of letter: eksternal or internal'
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Year of the letter for yearly reset'
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Perihal surat'
    },
    recipient: {
        type: DataTypes.STRING(300),
        allowNull: false,
        comment: 'Tujuan/Penerima surat'
    },
    recipient_address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Alamat penerima'
    },
    letter_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Tanggal surat'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Isi surat (optional)'
    },
    attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'List of attachment filenames/paths'
    },
    file_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Path to generated document file'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Catatan tambahan'
    },
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'archived'),
        defaultValue: 'draft',
        allowNull: false,
        comment: 'Status surat'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'User who created this letter'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Soft delete flag'
    },
    // Phase 1: Link to Debtor/Credit
    debtor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Optional link to Debtor'
    },
    credit_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Optional link to Credit'
    },
    // Phase 3: Template reference
    template_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Reference to letter content template'
    },
    // Phase 4: Digital Signature
    signature_image: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Base64 encoded signature image'
    },
    signed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User who signed the letter'
    },
    signed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when letter was signed'
    },
    // Phase 4: Email tracking
    email_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether email was sent'
    },
    email_sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when email was sent'
    },
    email_recipient: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Email address of recipient'
    },
    // Phase 3: Reminder flag
    needs_followup: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flag for reminder/follow-up'
    },
    followup_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date for follow-up reminder'
    }
}, {
    tableName: 'outgoing_letters',
    indexes: [
        {
            fields: ['letter_type']
        },
        {
            fields: ['year']
        },
        {
            fields: ['letter_date']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_by']
        },
        {
            unique: true,
            fields: ['letter_type', 'year', 'sequence_number']
        }
    ]
});

module.exports = OutgoingLetter;
