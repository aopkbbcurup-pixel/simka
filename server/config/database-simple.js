const { Sequelize } = require('sequelize');
const path = require('path');

// Simple in-memory SQLite database to avoid native module issues
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:', // Use in-memory database
  logging: false, // Disable logging for cleaner output
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

module.exports = sequelize;
