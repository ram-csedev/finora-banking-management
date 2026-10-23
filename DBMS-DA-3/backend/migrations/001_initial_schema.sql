-- ============================================================================
-- FINORA DA3: DISTRIBUTED BANKING SYSTEM SCHEMA MIGRATION
-- Target Database: CockroachDB Cloud (finora_da3)
-- Dialect: Distributed PostgreSQL / CockroachDB v26+
-- File: backend/migrations/001_initial_schema.sql
-- ============================================================================

-- Table 1: Branch (Parent of Employees & Accounts)
CREATE TABLE IF NOT EXISTS branch (
    b_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    branch_name VARCHAR(50) NOT NULL,
    city VARCHAR(30),
    state VARCHAR(30),
    pincode VARCHAR(10),
    ifsc VARCHAR(20) NOT NULL,
    contact VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_ifsc UNIQUE (ifsc)
);

-- Table 2: Employee (Child of Branch, Supervisor of Customers/Operations)
CREATE TABLE IF NOT EXISTS employee (
    emp_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30),
    salary DECIMAL(10,2) CHECK (salary >= 0),
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    b_id BIGINT NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employee_branch FOREIGN KEY (b_id) REFERENCES branch (b_id) ON DELETE RESTRICT
);

-- Table 3: Customer (Managed optionally by Employee)
CREATE TABLE IF NOT EXISTS customer (
    cid BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    pan VARCHAR(20) NOT NULL,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30),
    city VARCHAR(30),
    state VARCHAR(30),
    pincode VARCHAR(10),
    dob DATE,
    emp_id BIGINT,
    email VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_pan UNIQUE (pan),
    CONSTRAINT fk_customer_employee FOREIGN KEY (emp_id) REFERENCES employee (emp_id) ON DELETE SET NULL
);

-- Table 4: Customer_Phone (1:N Multi-valued phone numbers for Customer)
CREATE TABLE IF NOT EXISTS customer_phone (
    cid BIGINT NOT NULL,
    phone VARCHAR(15) NOT NULL,
    phone_type VARCHAR(15) NOT NULL DEFAULT 'MOBILE',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_customer_phone PRIMARY KEY (cid, phone),
    CONSTRAINT fk_customer_phone FOREIGN KEY (cid) REFERENCES customer (cid) ON DELETE CASCADE,
    CONSTRAINT chk_phone_type CHECK (phone_type IN ('MOBILE', 'HOME', 'WORK', 'OTHER'))
);

-- Table 5: Account (Holds financial balance, anchored to Branch)
CREATE TABLE IF NOT EXISTS account (
    acc_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    b_id BIGINT NOT NULL,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    acc_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_branch FOREIGN KEY (b_id) REFERENCES branch (b_id) ON DELETE RESTRICT,
    CONSTRAINT chk_account_balance CHECK (balance >= 0),
    CONSTRAINT chk_account_status CHECK (status IN ('ACTIVE', 'DORMANT', 'FROZEN', 'CLOSED')),
    CONSTRAINT chk_account_type CHECK (acc_type IN ('SAVINGS', 'CURRENT', 'SALARY', 'FIXED_DEPOSIT'))
);

-- Table 6: Account_Holder (M:N Joint and Single Account Ownership; replaces legacy OWNS)
CREATE TABLE IF NOT EXISTS account_holder (
    acc_id BIGINT NOT NULL,
    cid BIGINT NOT NULL,
    ownership_role VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    share_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_account_holder PRIMARY KEY (acc_id, cid),
    CONSTRAINT fk_holder_account FOREIGN KEY (acc_id) REFERENCES account (acc_id) ON DELETE CASCADE,
    CONSTRAINT fk_holder_customer FOREIGN KEY (cid) REFERENCES customer (cid) ON DELETE RESTRICT,
    CONSTRAINT chk_ownership_role CHECK (ownership_role IN ('PRIMARY', 'JOINT', 'SECONDARY', 'GUARDIAN')),
    CONSTRAINT chk_share_percentage CHECK (share_percentage >= 0 AND share_percentage <= 100)
);

-- Table 7: Nominee (1:N Beneficiary of an Account on Death of Holders)
CREATE TABLE IF NOT EXISTS nominee (
    n_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    acc_id BIGINT NOT NULL,
    cid BIGINT,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30),
    relationship VARCHAR(30) NOT NULL,
    dob DATE,
    contact_phone VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nominee_account FOREIGN KEY (acc_id) REFERENCES account (acc_id) ON DELETE CASCADE,
    CONSTRAINT fk_nominee_customer FOREIGN KEY (cid) REFERENCES customer (cid) ON DELETE SET NULL
);

-- Table 8: CreditCard (Child of Customer)
CREATE TABLE IF NOT EXISTS creditcard (
    pno VARCHAR(20) PRIMARY KEY,
    cid BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    card_limit DECIMAL(12,2) NOT NULL,
    expiry DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    cvv VARCHAR(4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_creditcard_customer FOREIGN KEY (cid) REFERENCES customer (cid) ON DELETE RESTRICT,
    CONSTRAINT chk_creditcard_type CHECK (type IN ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX')),
    CONSTRAINT chk_creditcard_limit CHECK (card_limit > 0),
    CONSTRAINT chk_creditcard_status CHECK (status IN ('ACTIVE', 'BLOCKED', 'EXPIRED', 'CANCELLED'))
);

-- Table 9: Loan (Child of Customer)
CREATE TABLE IF NOT EXISTS loan (
    l_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    cid BIGINT NOT NULL,
    l_type VARCHAR(30) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    interest DECIMAL(5,2) NOT NULL,
    term INT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_emp_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loan_customer FOREIGN KEY (cid) REFERENCES customer (cid) ON DELETE RESTRICT,
    CONSTRAINT fk_loan_employee FOREIGN KEY (assigned_emp_id) REFERENCES employee (emp_id) ON DELETE SET NULL,
    CONSTRAINT chk_loan_type CHECK (l_type IN ('HOME', 'CAR', 'PERSONAL', 'EDUCATION', 'BUSINESS')),
    CONSTRAINT chk_loan_amount CHECK (amount > 0),
    CONSTRAINT chk_loan_interest CHECK (interest >= 0),
    CONSTRAINT chk_loan_term CHECK (term > 0),
    CONSTRAINT chk_loan_status CHECK (status IN ('PENDING', 'APPROVED', 'ACTIVE', 'PAID_OFF', 'DEFAULTED', 'REJECTED'))
);

-- Table 10: Loan_Payment (Repayment installment history for a Loan)
CREATE TABLE IF NOT EXISTS loan_payment (
    payment_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    l_id BIGINT NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL,
    principal_amount DECIMAL(12,2) NOT NULL,
    interest_amount DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    remarks VARCHAR(255),
    CONSTRAINT fk_payment_loan FOREIGN KEY (l_id) REFERENCES loan (l_id) ON DELETE RESTRICT,
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_principal_amount CHECK (principal_amount >= 0),
    CONSTRAINT chk_interest_amount CHECK (interest_amount >= 0),
    CONSTRAINT chk_payment_components CHECK (amount = principal_amount + interest_amount),
    CONSTRAINT chk_payment_mode CHECK (payment_mode IN ('ONLINE', 'AUTO_DEBIT', 'CASH', 'CHEQUE')),
    CONSTRAINT chk_payment_status CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REVERSED'))
);

-- Table 11: Beneficiary (Saved recipient destination for transfers)
CREATE TABLE IF NOT EXISTS beneficiary (
    beneficiary_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    cid BIGINT NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    beneficiary_name VARCHAR(100) NOT NULL,
    destination_account_num VARCHAR(34) NOT NULL,
    destination_ifsc VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100),
    internal_acc_id BIGINT,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beneficiary_customer FOREIGN KEY (cid) REFERENCES customer (cid) ON DELETE CASCADE,
    CONSTRAINT fk_beneficiary_internal_acc FOREIGN KEY (internal_acc_id) REFERENCES account (acc_id) ON DELETE SET NULL,
    CONSTRAINT uq_customer_beneficiary UNIQUE (cid, destination_account_num, destination_ifsc)
);

-- Table 12: Transaction (Financial ledger for deposits, withdrawals and transfers)
CREATE TABLE IF NOT EXISTS "transaction" (
    t_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    acc_id BIGINT NOT NULL,
    trans_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    related_acc_id BIGINT,
    related_trans_id BIGINT,
    description VARCHAR(255),
    processed_by_emp_id BIGINT,
    CONSTRAINT fk_transaction_account FOREIGN KEY (acc_id) REFERENCES account (acc_id) ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_related_acc FOREIGN KEY (related_acc_id) REFERENCES account (acc_id) ON DELETE SET NULL,
    CONSTRAINT fk_transaction_related_trans FOREIGN KEY (related_trans_id) REFERENCES "transaction" (t_id) ON DELETE SET NULL,
    CONSTRAINT fk_transaction_employee FOREIGN KEY (processed_by_emp_id) REFERENCES employee (emp_id) ON DELETE SET NULL,
    CONSTRAINT chk_transaction_type CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INTEREST', 'FEE')),
    CONSTRAINT chk_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_transaction_mode CHECK (mode IN ('ONLINE', 'ATM', 'CASH', 'BRANCH', 'UPI', 'NEFT', 'RTGS')),
    CONSTRAINT chk_transaction_status CHECK (status IN ('SUCCESS', 'PENDING', 'FAILED', 'REVERSED'))
);

-- Table 13: Audit_Log (Enterprise security and activity log)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    emp_id BIGINT,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    actor_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_employee FOREIGN KEY (emp_id) REFERENCES employee (emp_id) ON DELETE SET NULL,
    CONSTRAINT chk_audit_actor_type CHECK (actor_type IN ('EMPLOYEE', 'CUSTOMER', 'SYSTEM', 'ADMIN'))
);

-- Table 14: Responsible_For (Redesigned Staff Branch & Operational Role Assignments)
CREATE TABLE IF NOT EXISTS responsible_for (
    rf_id BIGINT PRIMARY KEY DEFAULT unique_rowid(),
    emp_id BIGINT NOT NULL,
    b_id BIGINT NOT NULL,
    role_type VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL_SUPERVISOR',
    l_id BIGINT,
    t_id BIGINT,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_responsible_employee FOREIGN KEY (emp_id) REFERENCES employee (emp_id) ON DELETE RESTRICT,
    CONSTRAINT fk_responsible_branch FOREIGN KEY (b_id) REFERENCES branch (b_id) ON DELETE RESTRICT,
    CONSTRAINT fk_responsible_loan FOREIGN KEY (l_id) REFERENCES loan (l_id) ON DELETE SET NULL,
    CONSTRAINT fk_responsible_transaction FOREIGN KEY (t_id) REFERENCES "transaction" (t_id) ON DELETE SET NULL,
    CONSTRAINT chk_responsible_role CHECK (role_type IN ('BRANCH_MANAGER', 'LOAN_OFFICER', 'TELLER_SUPERVISOR', 'OPERATIONAL_SUPERVISOR', 'AUDIT_OFFICER')),
    CONSTRAINT chk_responsible_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'REVOKED'))
);

-- ============================================================================
-- PERFORMANCE & METADATA INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_employee_b_id ON employee (b_id);
CREATE INDEX IF NOT EXISTS idx_customer_emp_id ON customer (emp_id);
CREATE INDEX IF NOT EXISTS idx_account_b_id ON account (b_id);
CREATE INDEX IF NOT EXISTS idx_account_holder_cid ON account_holder (cid);
CREATE INDEX IF NOT EXISTS idx_nominee_acc_id ON nominee (acc_id);
CREATE INDEX IF NOT EXISTS idx_creditcard_cid ON creditcard (cid);
CREATE INDEX IF NOT EXISTS idx_loan_cid ON loan (cid);
CREATE INDEX IF NOT EXISTS idx_loan_payment_lid ON loan_payment (l_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_cid ON beneficiary (cid);
CREATE INDEX IF NOT EXISTS idx_transaction_acc_id ON "transaction" (acc_id);
CREATE INDEX IF NOT EXISTS idx_transaction_related_acc ON "transaction" (related_acc_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_emp_id ON audit_log (emp_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_responsible_for_emp ON responsible_for (emp_id);
CREATE INDEX IF NOT EXISTS idx_responsible_for_branch ON responsible_for (b_id);

-- ============================================================================
-- ANALYTICAL & DASHBOARD VIEWS
-- ============================================================================

-- View 1: Dashboard Summary
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM customer) AS total_customers,
    (SELECT COUNT(*) FROM account) AS total_accounts,
    (SELECT COALESCE(SUM(balance), 0) FROM account) AS total_balance,
    (SELECT COUNT(*) FROM loan) AS total_loans,
    (SELECT COALESCE(SUM(amount), 0) FROM loan) AS total_loan_amount,
    (SELECT COUNT(*) FROM creditcard) AS total_credit_cards,
    (SELECT COUNT(*) FROM "transaction") AS total_transactions;

-- View 2: Customer Dashboard (Integrated with Account Holder & Branch)
CREATE OR REPLACE VIEW customer_dashboard AS
SELECT
    c.cid,
    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
    c.city,
    c.state,
    a.acc_id,
    a.acc_type,
    a.balance,
    a.status AS account_status,
    ah.ownership_role,
    ah.is_primary,
    CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS employee_name,
    b.branch_name,
    b.city AS branch_city
FROM customer c
LEFT JOIN account_holder ah ON c.cid = ah.cid
LEFT JOIN account a ON ah.acc_id = a.acc_id
LEFT JOIN employee e ON c.emp_id = e.emp_id
LEFT JOIN branch b ON a.b_id = b.b_id;

-- View 3: Transaction Dashboard
CREATE OR REPLACE VIEW transaction_dashboard AS
SELECT
    t.t_id,
    t.trans_date,
    t.type AS transaction_type,
    t.amount,
    t.mode AS transaction_mode,
    t.status,
    a.acc_id,
    c.cid,
    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name
FROM "transaction" t
JOIN account a ON t.acc_id = a.acc_id
LEFT JOIN account_holder ah ON a.acc_id = ah.acc_id AND ah.is_primary = TRUE
LEFT JOIN customer c ON ah.cid = c.cid;

-- View 4: Loan Dashboard
CREATE OR REPLACE VIEW loan_dashboard AS
SELECT
    l.l_id,
    l.l_type,
    l.amount,
    l.interest,
    l.term,
    l.status,
    c.cid,
    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name,
    c.city
FROM loan l
JOIN customer c ON l.cid = c.cid;

-- View 5: Credit Card Dashboard
CREATE OR REPLACE VIEW creditcard_dashboard AS
SELECT
    cc.pno,
    cc.type AS card_type,
    cc.card_limit,
    cc.expiry,
    cc.status,
    cc.cid,
    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS customer_name
FROM creditcard cc
JOIN customer c ON cc.cid = c.cid;
