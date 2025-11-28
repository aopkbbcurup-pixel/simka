const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Use SQLite as fallback if PostgreSQL is not available
const usePostgres = process.env.USE_POSTGRES === 'true';

let sequelize;

if (usePostgres) {
  // PostgreSQL configuration
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Required for Supabase
        }
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    }
  );
} else {
  // SQLite configuration (fallback) - for demo without native builds
  const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, '../../database/simka.sqlite');

  console.log('⚠️  Using SQLite fallback mode (existing database file)');
  console.log('📁 Database path:', dbPath);

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? false : false, // Disable for cleaner output
    dialectOptions: {
      mode: process.env.NODE_ENV === 'test' ? 'memory' : 'readwrite'
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connection established successfully (${usePostgres ? 'PostgreSQL' : 'SQLite'}).`);
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    if (usePostgres) {
      console.log('💡 Try setting USE_POSTGRES=false in .env to use SQLite instead');
    }
  }
};

testConnection();

module.exports = sequelize;
