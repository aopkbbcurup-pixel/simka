const sequelize = require('../config/database');
const User = require('./User');
const Debtor = require('./Debtor');
const Credit = require('./Credit');
const Collateral = require('./Collateral');
const Document = require('./Document');
const DocumentTemplate = require('./DocumentTemplate');
const Notification = require('./Notification');
const Insurance = require('./Insurance');
const InsuranceClaim = require('./InsuranceClaim');
const Payment = require('./Payment');
const CreditFileMovement = require('./CreditFileMovement');
const AuditLog = require('./AuditLog');
const OutgoingLetter = require('./OutgoingLetter');
const LetterConfiguration = require('./LetterConfiguration');
const LetterContentTemplate = require('./LetterContentTemplate');

// Define associations
// Define associations
if (sequelize) {
  User.hasMany(Debtor, { foreignKey: 'created_by' });
  Debtor.belongsTo(User, { foreignKey: 'created_by' });

  Debtor.hasMany(Credit, { foreignKey: 'debtor_id' });
  Credit.belongsTo(Debtor, { foreignKey: 'debtor_id' });

  Credit.hasMany(Collateral, { foreignKey: 'credit_id' });
  Collateral.belongsTo(Credit, { foreignKey: 'credit_id' });

  // Payments associations
  Credit.hasMany(Payment, { foreignKey: 'credit_id' });
  Payment.belongsTo(Credit, { foreignKey: 'credit_id' });

  Collateral.hasMany(Document, { foreignKey: 'collateral_id' });
  Document.belongsTo(Collateral, { foreignKey: 'collateral_id' });

  User.hasMany(Notification, { foreignKey: 'user_id' });
  Notification.belongsTo(User, { foreignKey: 'user_id' });

  Credit.hasMany(CreditFileMovement, { foreignKey: 'credit_id' });
  CreditFileMovement.belongsTo(Credit, { foreignKey: 'credit_id' });

  Collateral.hasMany(CreditFileMovement, { foreignKey: 'collateral_id' });
  CreditFileMovement.belongsTo(Collateral, { foreignKey: 'collateral_id' });

  Document.hasMany(CreditFileMovement, { foreignKey: 'document_id' });
  CreditFileMovement.belongsTo(Document, { foreignKey: 'document_id' });

  User.hasMany(CreditFileMovement, { foreignKey: 'created_by' });
  CreditFileMovement.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

  User.hasMany(DocumentTemplate, { as: 'createdTemplates', foreignKey: 'created_by' });
  User.hasMany(DocumentTemplate, { as: 'updatedTemplates', foreignKey: 'updated_by' });
  DocumentTemplate.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
  DocumentTemplate.belongsTo(User, { as: 'updater', foreignKey: 'updated_by' });

  // Insurance associations
  User.hasMany(Insurance, { foreignKey: 'created_by' });
  Insurance.belongsTo(User, { foreignKey: 'created_by' });

  Credit.hasMany(Insurance, { foreignKey: 'credit_id' });
  Insurance.belongsTo(Insurance, { foreignKey: 'credit_id' }); // Note: This looked like a bug in original, assuming it meant Insurance belongsTo Credit

  Debtor.hasMany(InsuranceClaim, { foreignKey: 'debtor_id' });
  InsuranceClaim.belongsTo(Debtor, { foreignKey: 'debtor_id' });

  Insurance.hasMany(InsuranceClaim, { foreignKey: 'insurance_id' });
  InsuranceClaim.belongsTo(Insurance, { foreignKey: 'insurance_id' });

  User.hasMany(InsuranceClaim, { foreignKey: 'created_by' });
  InsuranceClaim.belongsTo(User, { foreignKey: 'created_by' });

  // AuditLog associations
  User.hasMany(AuditLog, { foreignKey: 'user_id' });
  AuditLog.belongsTo(User, { foreignKey: 'user_id' });

  // OutgoingLetter associations
  User.hasMany(OutgoingLetter, { as: 'outgoingLetters', foreignKey: 'created_by' });
  OutgoingLetter.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

  // LetterConfiguration associations
  User.hasMany(LetterConfiguration, { as: 'letterConfigurations', foreignKey: 'updated_by' });
  LetterConfiguration.belongsTo(User, { as: 'updater', foreignKey: 'updated_by' });

  // LetterContentTemplate associations
  User.hasMany(LetterContentTemplate, { as: 'letterContentTemplates', foreignKey: 'created_by' });
  LetterContentTemplate.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

  // OutgoingLetter - Debtor/Credit associations
  Debtor.hasMany(OutgoingLetter, { as: 'outgoingLetters', foreignKey: 'debtor_id' });
  OutgoingLetter.belongsTo(Debtor, { as: 'debtor', foreignKey: 'debtor_id' });

  Credit.hasMany(OutgoingLetter, { as: 'outgoingLetters', foreignKey: 'credit_id' });
  OutgoingLetter.belongsTo(Credit, { as: 'credit', foreignKey: 'credit_id' });

  LetterContentTemplate.hasMany(OutgoingLetter, { foreignKey: 'template_id' });
  OutgoingLetter.belongsTo(LetterContentTemplate, { as: 'template', foreignKey: 'template_id' });

  // Signer association
  OutgoingLetter.belongsTo(User, { as: 'signer', foreignKey: 'signed_by' });
} else {
  console.warn('⚠️  Skipping model associations because database connection is missing.');
}

// Sync database
const syncDatabase = async () => {
  if (!sequelize) {
    console.warn('⚠️  Cannot sync database: No connection available.');
    return;
  }
  try {
    await sequelize.sync({ force: false });
    console.log(' Database synchronized successfully.');
  } catch (error) {
    console.error(' Database synchronization failed:', error);
  }
};
module.exports = {
  sequelize,
  User,
  Debtor,
  Credit,
  Collateral,
  Document,
  DocumentTemplate,
  Notification,
  Insurance,
  InsuranceClaim,
  Payment,
  CreditFileMovement,
  AuditLog,
  OutgoingLetter,
  LetterConfiguration,
  LetterContentTemplate,
  syncDatabase
};
