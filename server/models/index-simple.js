// Simple in-memory database models to bypass SQLite3 native module issues
const { Sequelize, DataTypes } = require('sequelize');

// Create in-memory database
const sequelize = new Sequelize('sqlite::memory:', {
  logging: false,
  dialectOptions: {
    // Disable SQLite3 native module
  }
});

// Simple User model for authentication
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'staff', 'analyst'),
    defaultValue: 'staff'
  },
  department: DataTypes.STRING,
  phone: DataTypes.STRING,
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: DataTypes.DATE
}, {
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const bcrypt = require('bcryptjs');
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const bcrypt = require('bcryptjs');
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

// Add password validation method
User.prototype.validatePassword = async function(password) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, this.password);
};

// Sync database and create admin user
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Database synced successfully (in-memory)');
    
    // Create default admin user
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@simka.com',
        password: 'admin123',
        full_name: 'Administrator SIMKA',
        role: 'admin',
        department: 'IT',
        phone: '081234567890',
        is_active: true
      });
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.error('❌ Database sync error:', error.message);
  }
};

module.exports = {
  sequelize,
  User,
  syncDatabase
};
