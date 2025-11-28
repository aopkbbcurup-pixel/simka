-- SIMKA Database Schema Migration for Supabase
-- This script creates all necessary tables and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DEBTORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS debtors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debtor_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  ktp_number VARCHAR(16) UNIQUE,
  birth_date DATE,
  birth_place VARCHAR(50),
  gender VARCHAR(1) CHECK (gender IN ('L', 'P')),
  marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  address TEXT,
  city VARCHAR(50),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  mobile VARCHAR(20),
  email VARCHAR(100),
  occupation VARCHAR(100),
  company_name VARCHAR(100),
  company_address TEXT,
  monthly_income DECIMAL(15, 2),
  spouse_name VARCHAR(100),
  spouse_ktp VARCHAR(16),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREDITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  account_number VARCHAR(50),
  debtor_id UUID NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  credit_type VARCHAR(100) NOT NULL,
  plafond DECIMAL(15, 2) NOT NULL,
  outstanding DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  tenor_months INTEGER NOT NULL,
  monthly_payment DECIMAL(15, 2),
  start_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  purpose TEXT,
  status VARCHAR(50) DEFAULT 'Lancar' CHECK (status IN ('Lancar', 'Dalam Perhatian Khusus', 'Kurang Lancar', 'Diragukan', 'Macet', 'Lunas')),
  collectibility VARCHAR(1) DEFAULT '1' CHECK (collectibility IN ('1', '2', '3', '4', '5')),
  last_payment_date DATE,
  days_past_due INTEGER DEFAULT 0,
  restructure_count INTEGER DEFAULT 0,
  last_restructure_date DATE,
  account_officer VARCHAR(100),
  branch_code VARCHAR(10),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COLLATERALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS collaterals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('property', 'vehicle', 'other')),
  description TEXT,
  estimated_value DECIMAL(15, 2) NOT NULL,
  appraisal_value DECIMAL(15, 2),
  appraisal_date DATE,
  appraisal_company VARCHAR(100),
  certificate_number VARCHAR(100),
  certificate_type VARCHAR(50),
  certificate_date DATE,
  owner_name VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  province VARCHAR(50),
  land_area DECIMAL(10, 2),
  building_area DECIMAL(10, 2),
  year_built INTEGER,
  vehicle_brand VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INTEGER,
  vehicle_color VARCHAR(30),
  vehicle_plate_number VARCHAR(20),
  vehicle_engine_number VARCHAR(50),
  vehicle_chassis_number VARCHAR(50),
  insurance_policy_number VARCHAR(50),
  insurance_company VARCHAR(100),
  insurance_expiry_date DATE,
  tax_expiry_date DATE,
  binding_type VARCHAR(50),
  binding_date DATE,
  binding_number VARCHAR(100),
  storage_location VARCHAR(200),
  physical_condition VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collateral_id UUID NOT NULL REFERENCES collaterals(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DOCUMENT TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  document_category VARCHAR(50) NOT NULL,
  format VARCHAR(10) NOT NULL DEFAULT 'html',
  content TEXT NOT NULL,
  description TEXT,
  placeholders JSONB,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(document_category);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  principal_amount DECIMAL(15, 2),
  interest_amount DECIMAL(15, 2),
  penalty_amount DECIMAL(15, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INSURANCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS insurances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  policy_number VARCHAR(100) UNIQUE NOT NULL,
  insurance_company VARCHAR(100) NOT NULL,
  insurance_type VARCHAR(50) NOT NULL,
  coverage_amount DECIMAL(15, 2) NOT NULL,
  premium_amount DECIMAL(15, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INSURANCE CLAIMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  insurance_id UUID NOT NULL REFERENCES insurances(id) ON DELETE CASCADE,
  debtor_id UUID NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  claim_number VARCHAR(100) UNIQUE NOT NULL,
  claim_date DATE NOT NULL,
  incident_date DATE NOT NULL,
  claim_amount DECIMAL(15, 2) NOT NULL,
  approved_amount DECIMAL(15, 2),
  claim_status VARCHAR(20) DEFAULT 'pending' CHECK (claim_status IN ('pending', 'approved', 'rejected', 'paid')),
  claim_type VARCHAR(50) NOT NULL,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  action_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SYNC QUEUE TABLE (for offline sync)
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Debtors indexes
CREATE INDEX IF NOT EXISTS idx_debtors_code ON debtors(debtor_code);
CREATE INDEX IF NOT EXISTS idx_debtors_ktp ON debtors(ktp_number);
CREATE INDEX IF NOT EXISTS idx_debtors_name ON debtors(full_name);
CREATE INDEX IF NOT EXISTS idx_debtors_created_by ON debtors(created_by);

-- Credits indexes
CREATE INDEX IF NOT EXISTS idx_credits_contract ON credits(contract_number);
CREATE INDEX IF NOT EXISTS idx_credits_debtor ON credits(debtor_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_maturity ON credits(maturity_date);
CREATE INDEX IF NOT EXISTS idx_credits_collectibility ON credits(collectibility);

-- Collaterals indexes
CREATE INDEX IF NOT EXISTS idx_collaterals_credit ON collaterals(credit_id);
CREATE INDEX IF NOT EXISTS idx_collaterals_type ON collaterals(type);
CREATE INDEX IF NOT EXISTS idx_collaterals_insurance_expiry ON collaterals(insurance_expiry_date);
CREATE INDEX IF NOT EXISTS idx_collaterals_tax_expiry ON collaterals(tax_expiry_date);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_collateral ON documents(collateral_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_credit ON payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Insurances indexes
CREATE INDEX IF NOT EXISTS idx_insurances_credit ON insurances(credit_id);
CREATE INDEX IF NOT EXISTS idx_insurances_policy ON insurances(policy_number);
CREATE INDEX IF NOT EXISTS idx_insurances_end_date ON insurances(end_date);

-- Insurance Claims indexes
CREATE INDEX IF NOT EXISTS idx_claims_insurance ON insurance_claims(insurance_id);
CREATE INDEX IF NOT EXISTS idx_claims_debtor ON insurance_claims(debtor_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(claim_status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Sync Queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debtors_updated_at BEFORE UPDATE ON debtors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaterals_updated_at BEFORE UPDATE ON collaterals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insurances_updated_at BEFORE UPDATE ON insurances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON insurance_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON sync_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaterals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Users policies (admin can see all, users can see themselves)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Debtors policies (all authenticated users can read, staff+ can write)
CREATE POLICY "Authenticated users can view debtors" ON debtors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can insert debtors" ON debtors FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);
CREATE POLICY "Staff can update debtors" ON debtors FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Credits policies
CREATE POLICY "Authenticated users can view credits" ON credits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can insert credits" ON credits FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);
CREATE POLICY "Staff can update credits" ON credits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Collaterals policies
CREATE POLICY "Authenticated users can view collaterals" ON collaterals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can insert collaterals" ON collaterals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);
CREATE POLICY "Staff can update collaterals" ON collaterals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Documents policies
CREATE POLICY "Authenticated users can view documents" ON documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can insert documents" ON documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);
CREATE POLICY "Staff can update documents" ON documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Document templates policies
CREATE POLICY "Authenticated users can view document templates" ON document_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Privileged users can manage document templates" ON document_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager'))
);

-- Payments policies
CREATE POLICY "Authenticated users can view payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can insert payments" ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Insurances policies
CREATE POLICY "Authenticated users can view insurances" ON insurances FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage insurances" ON insurances FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Insurance Claims policies
CREATE POLICY "Authenticated users can view claims" ON insurance_claims FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can manage claims" ON insurance_claims FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'manager', 'staff'))
);

-- Notifications policies (users can only see their own)
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Sync Queue policies (users can only see their own)
CREATE POLICY "Users can view their sync queue" ON sync_queue FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can manage their sync queue" ON sync_queue FOR ALL USING (user_id::text = auth.uid()::text);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'System users with role-based access';
COMMENT ON TABLE debtors IS 'Credit debtors/customers information';
COMMENT ON TABLE credits IS 'Credit facilities and loan information';
COMMENT ON TABLE collaterals IS 'Collateral assets securing credits';
COMMENT ON TABLE documents IS 'Digital documents related to collaterals';
COMMENT ON TABLE payments IS 'Payment history for credits';
COMMENT ON TABLE insurances IS 'Insurance policies for credits';
COMMENT ON TABLE insurance_claims IS 'Insurance claim records';
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON TABLE sync_queue IS 'Queue for offline sync operations';
