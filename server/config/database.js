const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Use SQLite as fallback if PostgreSQL is not available
// Use SQLite as fallback if PostgreSQL is not available
// FORCE Postgres in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = isProduction || process.env.USE_POSTGRES === 'true';

let sequelize;

if (usePostgres) {
  // Validate required environment variables for Postgres
  const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.error('❌ CRITICAL ERROR: Missing required database environment variables for PostgreSQL:');
    console.error(missingEnvVars.join(', '));
    console.error('Please configure these in your Vercel project settings or .env file.');

    // Do NOT throw in production, or the server will crash and we can't debug.
    // Return null so we can handle it gracefully in models/index.js
    console.warn('⚠️  Returning NULL sequelize instance due to missing config.');
    sequelize = null;
  } else {
    // PostgreSQL configuration
    sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
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
  }
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
