-- Performance Optimization: Add Database Indexes
-- Run this migration to speed up queries

-- Credits table indexes
CREATE INDEX IF NOT EXISTS idx_credits_contract_number ON credits(contract_number);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_collectibility ON credits(collectibility);
CREATE INDEX IF NOT EXISTS idx_credits_debtor_id ON credits(debtor_id);
CREATE INDEX IF NOT EXISTS idx_credits_maturity_date ON credits(maturity_date);
CREATE INDEX IF NOT EXISTS idx_credits_is_active ON credits(is_active);

-- Debtors table indexes
CREATE INDEX IF NOT EXISTS idx_debtors_debtor_code ON debtors(debtor_code);
CREATE INDEX IF NOT EXISTS idx_debtors_full_name ON debtors(full_name);
CREATE INDEX IF NOT EXISTS idx_debtors_ktp_number ON debtors(ktp_number);
CREATE INDEX IF NOT EXISTS idx_debtors_is_active ON debtors(is_active);

-- Collaterals table indexes
CREATE INDEX IF NOT EXISTS idx_collaterals_credit_id ON collaterals(credit_id);
CREATE INDEX IF NOT EXISTS idx_collaterals_collateral_code ON collaterals(collateral_code);
CREATE INDEX IF NOT EXISTS idx_collaterals_type ON collaterals(type);

-- Insurances table indexes
CREATE INDEX IF NOT EXISTS idx_insurances_credit_id ON insurances(credit_id);
CREATE INDEX IF NOT EXISTS idx_insurances_policy_number ON insurances(policy_number);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_credit_id ON payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_credit_id ON documents(credit_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);

-- File movements indexes
CREATE INDEX IF NOT EXISTS idx_file_movements_credit_id ON credit_file_movements(credit_id);
CREATE INDEX IF NOT EXISTS idx_file_movements_movement_type ON credit_file_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_file_movements_movement_time ON credit_file_movements(movement_time);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_credits_status_collectibility ON credits(status, collectibility);
CREATE INDEX IF NOT EXISTS idx_credits_debtor_status ON credits(debtor_id, status);
