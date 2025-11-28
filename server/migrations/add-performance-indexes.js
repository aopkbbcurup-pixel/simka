/**
 * Database Performance Optimization - Add Indexes
 * 
 * This migration adds indexes to frequently queried columns to improve query performance.
 * Safe to run on existing databases - uses IF NOT EXISTS for PostgreSQL compatibility.
 */

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addIndexes() {
    console.log('🔧 Starting database index migration...\n');

    try {
        // Get the dialect to handle PostgreSQL vs SQLite differences
        const dialect = sequelize.getDialect();
        const isPostgres = dialect === 'postgres';
        const isSQLite = dialect === 'sqlite';

        console.log(`📊 Database dialect: ${dialect}`);

        // Define indexes to create
        const indexes = [
            // Debtors table indexes
            {
                table: 'Debtors',
                name: 'idx_debtors_ktp_number',
                column: 'ktp_number',
                description: 'Index on KTP number for faster debtor lookups'
            },
            {
                table: 'Debtors',
                name: 'idx_debtors_full_name',
                column: 'full_name',
                description: 'Index on full name for search functionality'
            },
            {
                table: 'Debtors',
                name: 'idx_debtors_created_at',
                column: 'created_at',
                description: 'Index on created_at for sorting and filtering'
            },

            // Credits table indexes
            {
                table: 'Credits',
                name: 'idx_credits_debtor_id',
                column: 'debtor_id',
                description: 'Index on debtor_id for joins with Debtors table'
            },
            {
                table: 'Credits',
                name: 'idx_credits_contract_number',
                column: 'contract_number',
                description: 'Index on contract number for fast lookups'
            },
            {
                table: 'Credits',
                name: 'idx_credits_credit_status',
                column: 'credit_status',
                description: 'Index on credit status for filtering'
            },
            {
                table: 'Credits',
                name: 'idx_credits_created_at',
                column: 'created_at',
                description: 'Index on created_at for sorting'
            },
            {
                table: 'Credits',
                name: 'idx_credits_maturity_date',
                column: 'maturity_date',
                description: 'Index on maturity date for expiration alerts'
            },

            // Collaterals table indexes
            {
                table: 'Collaterals',
                name: 'idx_collaterals_credit_id',
                column: 'credit_id',
                description: 'Index on credit_id for joins with Credits table'
            },
            {
                table: 'Collaterals',
                name: 'idx_collaterals_type',
                column: 'type',
                description: 'Index on collateral type for filtering'
            },
            {
                table: 'Collaterals',
                name: 'idx_collaterals_created_at',
                column: 'created_at',
                description: 'Index on created_at for sorting'
            },

            // Insurances table indexes
            {
                table: 'Insurances',
                name: 'idx_insurances_credit_id',
                column: 'credit_id',
                description: 'Index on credit_id for joins'
            },
            {
                table: 'Insurances',
                name: 'idx_insurances_insurance_status',
                column: 'insurance_status',
                description: 'Index on insurance status for filtering'
            },
            {
                table: 'Insurances',
                name: 'idx_insurances_insurance_end_date',
                column: 'insurance_end_date',
                description: 'Index on end date for expiration alerts'
            },
            {
                table: 'Insurances',
                name: 'idx_insurances_created_at',
                column: 'created_at',
                description: 'Index on created_at for sorting'
            },

            // Reports table indexes
            {
                table: 'Reports',
                name: 'idx_reports_report_type',
                column: 'report_type',
                description: 'Index on report type for filtering'
            },
            {
                table: 'Reports',
                name: 'idx_reports_status',
                column: 'status',
                description: 'Index on status for filtering'
            },
            {
                table: 'Reports',
                name: 'idx_reports_created_at',
                column: 'created_at',
                description: 'Index on created_at for sorting'
            },

            // AuditLogs table indexes
            {
                table: 'AuditLogs',
                name: 'idx_audit_logs_user_id',
                column: 'user_id',
                description: 'Index on user_id for filtering by user'
            },
            {
                table: 'AuditLogs',
                name: 'idx_audit_logs_action',
                column: 'action',
                description: 'Index on action for filtering by action type'
            },
            {
                table: 'AuditLogs',
                name: 'idx_audit_logs_created_at',
                column: 'created_at',
                description: 'Index on created_at for time-based queries'
            },
        ];

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const index of indexes) {
            try {
                console.log(`\n📝 Creating index: ${index.name}`);
                console.log(`   Table: ${index.table}, Column: ${index.column}`);
                console.log(`   Purpose: ${index.description}`);

                if (isPostgres) {
                    // PostgreSQL syntax with IF NOT EXISTS
                    await sequelize.query(
                        `CREATE INDEX IF NOT EXISTS "${index.name}" ON "${index.table}" ("${index.column}")`,
                        { type: QueryTypes.RAW }
                    );
                    console.log(`   ✅ Index created successfully`);
                    successCount++;
                } else if (isSQLite) {
                    // SQLite syntax with IF NOT EXISTS
                    await sequelize.query(
                        `CREATE INDEX IF NOT EXISTS "${index.name}" ON "${index.table}" ("${index.column}")`,
                        { type: QueryTypes.RAW }
                    );
                    console.log(`   ✅ Index created successfully`);
                    successCount++;
                } else {
                    console.log(`   ⚠️  Unsupported database dialect: ${dialect}`);
                    skipCount++;
                }
            } catch (error) {
                // Index might already exist or table might not exist
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`   ⏭️  Index already exists, skipping`);
                    skipCount++;
                } else if (error.message.includes('no such table') || error.message.includes('does not exist')) {
                    console.log(`   ⚠️  Table does not exist, skipping`);
                    skipCount++;
                } else {
                    console.error(`   ❌ Error creating index: ${error.message}`);
                    errorCount++;
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Index Migration Summary:');
        console.log(`   ✅ Successfully created: ${successCount}`);
        console.log(`   ⏭️  Skipped (already exist or N/A): ${skipCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('='.repeat(60));

        if (errorCount === 0) {
            console.log('\n✨ Index migration completed successfully!');
            console.log('🚀 Your database queries should now be significantly faster.\n');
        } else {
            console.log('\n⚠️  Index migration completed with some errors.');
            console.log('   Please review the errors above.\n');
        }

    } catch (error) {
        console.error('\n❌ Fatal error during index migration:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    addIndexes()
        .then(() => {
            console.log('Closing database connection...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { addIndexes };
