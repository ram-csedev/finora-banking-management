-- ============================================================================
-- ORACLE DATABASE SETUP SCRIPT: BANKING MANAGEMENT SYSTEM
-- Target Database: Oracle Database 21c XE
-- Target Schema:   PRIYANSHI@localhost:1521/XEPDB1
-- File:            complete_banking_database.sql
-- ============================================================================

SET DEFINE OFF;
SET FEEDBACK ON;

PROMPT ============================================================================
PROMPT Starting Banking Management System Database Setup
PROMPT ============================================================================

-- ============================================================================
-- 0. SAFE CLEANUP (Drops existing project tables if present)
-- ============================================================================
PROMPT Dropping existing project tables if they exist...
BEGIN
    FOR t IN (
        SELECT table_name FROM user_tables 
        WHERE table_name IN (
            'RESPONSIBLE_FOR', 'OWNS', 'TRANSACTION', 'LOAN', 'CREDITCARD', 
            'NOMINEE', 'ACCOUNT', 'CUSTOMER_PHONE', 'CUSTOMER', 'EMPLOYEE', 'BRANCH'
        )
    ) LOOP
        EXECUTE IMMEDIATE 'DROP TABLE "' || t.table_name || '" CASCADE CONSTRAINTS PURGE';
    END LOOP;
END;
/

-- ============================================================================
-- 1, 2, 3. TABLES, PRIMARY KEYS, FOREIGN KEYS & CONSTRAINTS
-- Created in strict dependency order
-- ============================================================================
PROMPT Creating tables and constraints...

-- Table 1: Branch (Parent)
CREATE TABLE Branch (
    b_id NUMBER,
    branch_name VARCHAR2(50) NOT NULL,
    city VARCHAR2(30),
    state VARCHAR2(30),
    pincode VARCHAR2(10),
    ifsc VARCHAR2(20),
    contact VARCHAR2(15),
    CONSTRAINT pk_branch PRIMARY KEY (b_id),
    CONSTRAINT uq_branch_ifsc UNIQUE (ifsc)
);

-- Table 2: Employee (Child of Branch)
CREATE TABLE Employee (
    emp_id NUMBER,
    first_name VARCHAR2(30) NOT NULL,
    last_name VARCHAR2(30),
    salary NUMBER(10,2),
    hire_date DATE,
    b_id NUMBER,
    CONSTRAINT pk_employee PRIMARY KEY (emp_id),
    CONSTRAINT fk_employee_branch FOREIGN KEY (b_id) REFERENCES Branch (b_id)
);

-- Table 3: Customer (Child of Employee)
CREATE TABLE Customer (
    cid NUMBER,
    pan VARCHAR2(20),
    first_name VARCHAR2(30) NOT NULL,
    last_name VARCHAR2(30),
    city VARCHAR2(30),
    state VARCHAR2(30),
    pincode VARCHAR2(10),
    dob DATE,
    emp_id NUMBER,
    CONSTRAINT pk_customer PRIMARY KEY (cid),
    CONSTRAINT uq_customer_pan UNIQUE (pan),
    CONSTRAINT fk_customer_employee FOREIGN KEY (emp_id) REFERENCES Employee (emp_id)
);

-- Table 4: Customer_Phone (Child of Customer)
CREATE TABLE Customer_Phone (
    cid NUMBER,
    phone VARCHAR2(15),
    CONSTRAINT pk_customer_phone PRIMARY KEY (cid, phone),
    CONSTRAINT fk_customer_phone FOREIGN KEY (cid) REFERENCES Customer (cid)
);

-- Table 5: Account (Child of Customer)
CREATE TABLE Account (
    acc_id NUMBER,
    balance NUMBER(12,2) DEFAULT 0,
    status VARCHAR2(20),
    acc_type VARCHAR2(20),
    cid NUMBER,
    CONSTRAINT pk_account PRIMARY KEY (acc_id),
    CONSTRAINT chk_account_balance CHECK (balance >= 0),
    CONSTRAINT fk_account_customer FOREIGN KEY (cid) REFERENCES Customer (cid)
);

-- Table 6: Nominee (Child of Customer and Account)
CREATE TABLE Nominee (
    n_id NUMBER,
    first_name VARCHAR2(30),
    last_name VARCHAR2(30),
    relationship VARCHAR2(30),
    dob DATE,
    cid NUMBER,
    acc_id NUMBER,
    CONSTRAINT pk_nominee PRIMARY KEY (n_id),
    CONSTRAINT fk_nominee_customer FOREIGN KEY (cid) REFERENCES Customer (cid),
    CONSTRAINT fk_nominee_account FOREIGN KEY (acc_id) REFERENCES Account (acc_id)
);

-- Table 7: Owns (Relationship: Customer, Account, Nominee)
CREATE TABLE Owns (
    cid NUMBER,
    acc_id NUMBER,
    n_id NUMBER,
    CONSTRAINT pk_owns PRIMARY KEY (cid, acc_id, n_id),
    CONSTRAINT fk_owns_customer FOREIGN KEY (cid) REFERENCES Customer (cid),
    CONSTRAINT fk_owns_account FOREIGN KEY (acc_id) REFERENCES Account (acc_id),
    CONSTRAINT fk_owns_nominee FOREIGN KEY (n_id) REFERENCES Nominee (n_id)
);

-- Table 8: CreditCard (Child of Customer)
CREATE TABLE CreditCard (
    pno VARCHAR2(20),
    "TYPE" VARCHAR2(20),
    card_limit NUMBER(12,2),
    expiry DATE,
    status VARCHAR2(20),
    cvv VARCHAR2(4),
    cid NUMBER,
    CONSTRAINT pk_creditcard PRIMARY KEY (pno),
    CONSTRAINT fk_creditcard_customer FOREIGN KEY (cid) REFERENCES Customer (cid)
);

-- Table 9: Loan (Child of Customer)
CREATE TABLE Loan (
    l_id NUMBER,
    cid NUMBER,
    l_type VARCHAR2(30),
    amount NUMBER(12,2),
    interest NUMBER(5,2),
    term NUMBER,
    CONSTRAINT pk_loan PRIMARY KEY (l_id),
    CONSTRAINT chk_loan_amount CHECK (amount > 0),
    CONSTRAINT chk_loan_interest CHECK (interest >= 0),
    CONSTRAINT fk_loan_customer FOREIGN KEY (cid) REFERENCES Customer (cid)
);

-- Table 10: TRANSACTION (Child of Account)
CREATE TABLE "TRANSACTION" (
    t_id NUMBER,
    acc_id NUMBER,
    trans_date DATE,
    "TYPE" VARCHAR2(20),
    amount NUMBER(12,2),
    "MODE" VARCHAR2(20),
    status VARCHAR2(20),
    CONSTRAINT pk_transaction PRIMARY KEY (t_id),
    CONSTRAINT chk_transaction_amount CHECK (amount > 0),
    CONSTRAINT fk_transaction_account FOREIGN KEY (acc_id) REFERENCES Account (acc_id)
);

-- Table 11: Responsible_For (Relationship: Employee, Transaction, Loan, Branch)
CREATE TABLE Responsible_For (
    emp_id NUMBER,
    t_id NUMBER,
    l_id NUMBER,
    b_id NUMBER,
    CONSTRAINT pk_responsible_for PRIMARY KEY (emp_id, t_id, l_id, b_id),
    CONSTRAINT fk_responsible_employee FOREIGN KEY (emp_id) REFERENCES Employee (emp_id),
    CONSTRAINT fk_responsible_transaction FOREIGN KEY (t_id) REFERENCES "TRANSACTION" (t_id),
    CONSTRAINT fk_responsible_loan FOREIGN KEY (l_id) REFERENCES Loan (l_id),
    CONSTRAINT fk_responsible_branch FOREIGN KEY (b_id) REFERENCES Branch (b_id)
);

-- ============================================================================
-- 4. SAMPLE DATA
-- Inserted in strict dependency order before triggers are defined
-- ============================================================================
PROMPT Inserting sample data...

-- 1. Branch Data
INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact) VALUES (101, 'Main Branch', 'Vellore', 'Tamil Nadu', '632004', 'SBIN0000101', '9876543210');
INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact) VALUES (102, 'City Branch', 'Chennai', 'Tamil Nadu', '600001', 'SBIN0000102', '9876543211');
INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact) VALUES (103, 'Central Branch', 'Bangalore', 'Karnataka', '560001', 'SBIN0000103', '9876543212');
INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact) VALUES (104, 'Market Branch', 'Mumbai', 'Maharashtra', '400001', 'SBIN0000104', '9876543213');
INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact) VALUES (105, 'Airport Branch', 'Delhi', 'Delhi', '110001', 'SBIN0000105', '9876543214');

-- 2. Employee Data (References Branch)
INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id) VALUES (201, 'Rahul', 'Sharma', 45000, TO_DATE('2022-06-15', 'YYYY-MM-DD'), 101);
INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id) VALUES (202, 'Priya', 'Patel', 52000, TO_DATE('2021-08-20', 'YYYY-MM-DD'), 102);
INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id) VALUES (203, 'Arjun', 'Kumar', 48000, TO_DATE('2023-01-10', 'YYYY-MM-DD'), 103);
INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id) VALUES (204, 'Sneha', 'Rao', 55000, TO_DATE('2020-11-05', 'YYYY-MM-DD'), 104);
INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id) VALUES (205, 'Vikram', 'Singh', 50000, TO_DATE('2022-03-18', 'YYYY-MM-DD'), 105);

-- 3. Customer Data (References Employee)
INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id) VALUES (301, 'ABCDE1234F', 'Amit', 'Verma', 'Vellore', 'Tamil Nadu', '632004', TO_DATE('1998-05-12', 'YYYY-MM-DD'), 201);
INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id) VALUES (302, 'BCDEF2345G', 'Neha', 'Shah', 'Chennai', 'Tamil Nadu', '600001', TO_DATE('1997-09-25', 'YYYY-MM-DD'), 202);
INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id) VALUES (303, 'CDEFG3456H', 'Rohan', 'Mehta', 'Bangalore', 'Karnataka', '560001', TO_DATE('1999-02-18', 'YYYY-MM-DD'), 203);
INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id) VALUES (304, 'DEFGH4567J', 'Ananya', 'Iyer', 'Mumbai', 'Maharashtra', '400001', TO_DATE('1996-11-30', 'YYYY-MM-DD'), 204);
INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id) VALUES (305, 'EFGHI5678K', 'Karan', 'Gupta', 'Delhi', 'Delhi', '110001', TO_DATE('1995-07-08', 'YYYY-MM-DD'), 205);

-- 4. Customer Phone Data (References Customer)
INSERT INTO Customer_Phone (cid, phone) VALUES (301, '9876500001');
INSERT INTO Customer_Phone (cid, phone) VALUES (301, '9876500002');
INSERT INTO Customer_Phone (cid, phone) VALUES (302, '9876500003');
INSERT INTO Customer_Phone (cid, phone) VALUES (303, '9876500004');
INSERT INTO Customer_Phone (cid, phone) VALUES (304, '9876500005');
INSERT INTO Customer_Phone (cid, phone) VALUES (305, '9876500006');

-- 5. Account Data (References Customer)
INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (401, 66000, 'ACTIVE', 'SAVINGS', 301);
INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (402, 120000, 'ACTIVE', 'CURRENT', 302);
INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (403, 55000, 'ACTIVE', 'SAVINGS', 303);
INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (404, 200000, 'ACTIVE', 'CURRENT', 304);
INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (405, 90000, 'ACTIVE', 'SAVINGS', 305);

-- 6. Nominee Data (References Customer and Account)
INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id) VALUES (501, 'Raj', 'Verma', 'Father', TO_DATE('1968-04-15', 'YYYY-MM-DD'), 301, 401);
INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id) VALUES (502, 'Meena', 'Shah', 'Mother', TO_DATE('1970-08-20', 'YYYY-MM-DD'), 302, 402);
INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id) VALUES (503, 'Suresh', 'Mehta', 'Father', TO_DATE('1965-12-10', 'YYYY-MM-DD'), 303, 403);
INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id) VALUES (504, 'Kavita', 'Iyer', 'Mother', TO_DATE('1969-06-25', 'YYYY-MM-DD'), 304, 404);
INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id) VALUES (505, 'Ramesh', 'Gupta', 'Father', TO_DATE('1967-03-12', 'YYYY-MM-DD'), 305, 405);

-- 7. Owns Data (References Customer, Account, Nominee)
INSERT INTO Owns (cid, acc_id, n_id) VALUES (301, 401, 501);
INSERT INTO Owns (cid, acc_id, n_id) VALUES (302, 402, 502);
INSERT INTO Owns (cid, acc_id, n_id) VALUES (303, 403, 503);
INSERT INTO Owns (cid, acc_id, n_id) VALUES (304, 404, 504);
INSERT INTO Owns (cid, acc_id, n_id) VALUES (305, 405, 505);

-- 8. CreditCard Data (References Customer)
INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid) VALUES ('4111111111111111', 'VISA', 100000, TO_DATE('2028-12-31', 'YYYY-MM-DD'), 'ACTIVE', '123', 301);
INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid) VALUES ('4222222222222222', 'MASTERCARD', 150000, TO_DATE('2029-10-31', 'YYYY-MM-DD'), 'ACTIVE', '234', 302);
INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid) VALUES ('4333333333333333', 'VISA', 75000, TO_DATE('2028-08-31', 'YYYY-MM-DD'), 'ACTIVE', '345', 303);
INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid) VALUES ('4444444444444444', 'MASTERCARD', 200000, TO_DATE('2030-01-31', 'YYYY-MM-DD'), 'ACTIVE', '456', 304);
INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid) VALUES ('4555555555555555', 'VISA', 120000, TO_DATE('2029-06-30', 'YYYY-MM-DD'), 'ACTIVE', '567', 305);

-- 9. Loan Data (References Customer)
INSERT INTO Loan (l_id, cid, l_type, amount, interest, term) VALUES (601, 301, 'HOME', 2500000, 7.50, 240);
INSERT INTO Loan (l_id, cid, l_type, amount, interest, term) VALUES (602, 302, 'CAR', 800000, 8.50, 60);
INSERT INTO Loan (l_id, cid, l_type, amount, interest, term) VALUES (603, 303, 'PERSONAL', 300000, 10.50, 36);
INSERT INTO Loan (l_id, cid, l_type, amount, interest, term) VALUES (604, 304, 'HOME', 3500000, 7.25, 240);
INSERT INTO Loan (l_id, cid, l_type, amount, interest, term) VALUES (605, 305, 'EDUCATION', 600000, 6.50, 84);

-- 10. TRANSACTION Data (References Account)
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (701, 401, TO_DATE('2026-09-01', 'YYYY-MM-DD'), 'DEPOSIT', 25000, 'ONLINE', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (702, 402, TO_DATE('2026-09-02', 'YYYY-MM-DD'), 'WITHDRAWAL', 15000, 'ATM', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (703, 403, TO_DATE('2026-09-03', 'YYYY-MM-DD'), 'DEPOSIT', 30000, 'CASH', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (704, 404, TO_DATE('2026-09-04', 'YYYY-MM-DD'), 'TRANSFER', 50000, 'ONLINE', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (705, 405, TO_DATE('2026-09-05', 'YYYY-MM-DD'), 'WITHDRAWAL', 10000, 'ATM', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (706, 402, TO_DATE('2026-09-14', 'YYYY-MM-DD'), 'WITHDRAWAL', 5000, 'ATM', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (707, 401, TO_DATE('2026-09-14', 'YYYY-MM-DD'), 'WITHDRAWAL', 5000, 'ATM', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (708, 401, TO_DATE('2026-09-14', 'YYYY-MM-DD'), 'WITHDRAWAL', 5000, 'ONLINE', 'SUCCESS');
INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (709, 403, TO_DATE('2026-09-14', 'YYYY-MM-DD'), 'DEPOSIT', 5000, 'ONLINE', 'SUCCESS');

-- 11. Responsible_For Data (References Employee, Transaction, Loan, Branch)
INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (201, 701, 601, 101);
INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (202, 702, 602, 102);
INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (203, 703, 603, 103);
INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (204, 704, 604, 104);
INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (205, 705, 605, 105);

COMMIT;

-- ============================================================================
-- 5. PROCEDURES
-- ============================================================================
PROMPT Creating stored procedures...

-- Procedure: deposit_money
CREATE OR REPLACE PROCEDURE deposit_money(p_acc_id NUMBER, p_amount NUMBER) AS
BEGIN
    IF p_amount <= 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Deposit amount must be greater than zero');
    END IF;
    UPDATE Account SET balance = balance + p_amount WHERE acc_id = p_acc_id;
    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20002, 'Account not found');
    END IF;
    COMMIT;
END;
/

-- Procedure: withdraw_money
CREATE OR REPLACE PROCEDURE withdraw_money(p_acc_id NUMBER, p_amount NUMBER) AS
    v_balance NUMBER;
BEGIN
    IF p_amount <= 0 THEN
        RAISE_APPLICATION_ERROR(-20003, 'Withdrawal amount must be greater than zero');
    END IF;
    SELECT balance INTO v_balance FROM Account WHERE acc_id = p_acc_id;
    IF v_balance < p_amount THEN
        RAISE_APPLICATION_ERROR(-20004, 'Insufficient balance');
    END IF;
    UPDATE Account SET balance = balance - p_amount WHERE acc_id = p_acc_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20005, 'Account not found');
END;
/

-- Procedure: transfer_money
CREATE OR REPLACE PROCEDURE transfer_money(p_from_acc NUMBER, p_to_acc NUMBER, p_amount NUMBER) AS
    v_balance NUMBER;
    v_next_tid NUMBER;
BEGIN
    IF p_amount <= 0 THEN
        RAISE_APPLICATION_ERROR(-20009, 'Transfer amount must be greater than zero');
    END IF;
    SELECT balance INTO v_balance FROM Account WHERE acc_id = p_from_acc;
    IF v_balance < p_amount THEN
        RAISE_APPLICATION_ERROR(-20010, 'Insufficient balance for transfer');
    END IF;
    SELECT NVL(MAX(t_id), 700) + 1 INTO v_next_tid FROM "TRANSACTION";
    INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
    VALUES (v_next_tid, p_from_acc, SYSDATE, 'WITHDRAWAL', p_amount, 'ONLINE', 'SUCCESS');
    INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
    VALUES (v_next_tid + 1, p_to_acc, SYSDATE, 'DEPOSIT', p_amount, 'ONLINE', 'SUCCESS');
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Transfer successful. Amount: ' || p_amount);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20011, 'Source account not found');
END;
/

-- Procedure: customer_details
CREATE OR REPLACE PROCEDURE customer_details(p_cid NUMBER) AS
    v_name VARCHAR2(100);
    v_city VARCHAR2(30);
    v_state VARCHAR2(30);
    v_balance NUMBER;
BEGIN
    SELECT first_name || ' ' || last_name, city, state
    INTO v_name, v_city, v_state
    FROM Customer WHERE cid = p_cid;
    SELECT NVL(SUM(balance), 0) INTO v_balance FROM Account WHERE cid = p_cid;
    DBMS_OUTPUT.PUT_LINE('Customer: ' || v_name);
    DBMS_OUTPUT.PUT_LINE('City: ' || v_city);
    DBMS_OUTPUT.PUT_LINE('State: ' || v_state);
    DBMS_OUTPUT.PUT_LINE('Total Balance: ' || v_balance);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20012, 'Customer not found');
END;
/

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================
PROMPT Creating functions...

-- Function: get_balance
CREATE OR REPLACE FUNCTION get_balance(p_acc_id NUMBER)
RETURN NUMBER AS
    v_balance NUMBER;
BEGIN
    SELECT balance INTO v_balance FROM Account WHERE acc_id = p_acc_id;
    RETURN v_balance;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
/

-- Function: check_loan_eligibility
CREATE OR REPLACE FUNCTION check_loan_eligibility(p_cid NUMBER)
RETURN VARCHAR2 AS
    v_balance NUMBER;
BEGIN
    SELECT NVL(SUM(balance), 0) INTO v_balance FROM Account WHERE cid = p_cid;
    IF v_balance >= 100000 THEN
        RETURN 'ELIGIBLE';
    ELSE
        RETURN 'NOT ELIGIBLE';
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'NOT ELIGIBLE';
END;
/

-- Function: total_loan
CREATE OR REPLACE FUNCTION total_loan(p_cid NUMBER)
RETURN NUMBER AS
    v_total NUMBER;
BEGIN
    SELECT NVL(SUM(amount), 0) INTO v_total FROM Loan WHERE cid = p_cid;
    RETURN v_total;
END;
/

-- ============================================================================
-- 7. TRIGGERS (Canonical 6 triggers from README)
-- ============================================================================
PROMPT Creating triggers...

-- Trigger 1: TRG_TRANSACTION_STATUS (BEFORE INSERT ON "TRANSACTION")
CREATE OR REPLACE TRIGGER trg_transaction_status
BEFORE INSERT ON "TRANSACTION"
FOR EACH ROW
BEGIN
    IF :NEW.status IS NULL THEN
        :NEW.status := 'SUCCESS';
    END IF;
END;
/

-- Trigger 2: TRG_TRANSACTION_AMOUNT_CHECK (BEFORE INSERT OR UPDATE ON "TRANSACTION")
CREATE OR REPLACE TRIGGER trg_transaction_amount_check
BEFORE INSERT OR UPDATE ON "TRANSACTION"
FOR EACH ROW
BEGIN
    IF :NEW.amount <= 0 THEN
        RAISE_APPLICATION_ERROR(-20006, 'Transaction amount must be greater than zero');
    END IF;
END;
/

-- Trigger 3: TRG_LOAN_AMOUNT_CHECK (BEFORE INSERT OR UPDATE ON Loan)
CREATE OR REPLACE TRIGGER trg_loan_amount_check
BEFORE INSERT OR UPDATE ON Loan
FOR EACH ROW
BEGIN
    IF :NEW.amount <= 0 THEN
        RAISE_APPLICATION_ERROR(-20007, 'Loan amount must be greater than zero');
    END IF;
END;
/

-- Trigger 4: TRG_ACCOUNT_BALANCE_CHECK (BEFORE UPDATE OF balance ON Account)
CREATE OR REPLACE TRIGGER trg_account_balance_check
BEFORE UPDATE OF balance ON Account
FOR EACH ROW
BEGIN
    IF :NEW.balance < 0 THEN
        RAISE_APPLICATION_ERROR(-20008, 'Account balance cannot be negative');
    END IF;
END;
/

-- Trigger 5: TRG_VALIDATE_TRANSACTION (BEFORE INSERT ON "TRANSACTION")
CREATE OR REPLACE TRIGGER trg_validate_transaction
BEFORE INSERT ON "TRANSACTION"
FOR EACH ROW
DECLARE
    v_balance NUMBER;
    v_status VARCHAR2(20);
BEGIN
    IF :NEW.amount <= 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Transaction amount must be greater than zero');
    END IF;
    SELECT balance, status INTO v_balance, v_status FROM Account WHERE acc_id = :NEW.acc_id;
    IF v_status <> 'ACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20002, 'Account is not active');
    END IF;
    IF UPPER(:NEW."TYPE") IN ('WITHDRAW', 'WITHDRAWAL', 'DEBIT') AND :NEW.amount > v_balance THEN
        RAISE_APPLICATION_ERROR(-20003, 'Insufficient account balance');
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20004, 'Account not found');
END;
/

-- Trigger 6: TRG_UPDATE_BALANCE (AFTER INSERT ON "TRANSACTION")
CREATE OR REPLACE TRIGGER trg_update_balance
AFTER INSERT ON "TRANSACTION"
FOR EACH ROW
BEGIN
    IF :NEW.status = 'SUCCESS' THEN
        IF UPPER(:NEW."TYPE") IN ('DEPOSIT', 'CREDIT') THEN
            UPDATE Account SET balance = balance + :NEW.amount WHERE acc_id = :NEW.acc_id;
        ELSIF UPPER(:NEW."TYPE") IN ('WITHDRAW', 'WITHDRAWAL', 'DEBIT') THEN
            UPDATE Account SET balance = balance - :NEW.amount WHERE acc_id = :NEW.acc_id;
        END IF;
    END IF;
END;
/

-- ============================================================================
-- 8. DASHBOARD VIEWS
-- ============================================================================
PROMPT Creating dashboard views...

-- View 1: DASHBOARD_SUMMARY
CREATE OR REPLACE VIEW DASHBOARD_SUMMARY AS
SELECT
    (SELECT COUNT(*) FROM Customer) AS total_customers,
    (SELECT COUNT(*) FROM Account) AS total_accounts,
    (SELECT NVL(SUM(balance), 0) FROM Account) AS total_balance,
    (SELECT COUNT(*) FROM Loan) AS total_loans,
    (SELECT NVL(SUM(amount), 0) FROM Loan) AS total_loan_amount,
    (SELECT COUNT(*) FROM CreditCard) AS total_credit_cards,
    (SELECT COUNT(*) FROM "TRANSACTION") AS total_transactions
FROM DUAL;

-- View 2: CUSTOMER_DASHBOARD
CREATE OR REPLACE VIEW CUSTOMER_DASHBOARD AS
SELECT
    c.cid,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.city,
    c.state,
    a.acc_id,
    a.acc_type,
    a.balance,
    a.status AS account_status,
    e.first_name || ' ' || e.last_name AS employee_name,
    b.branch_name,
    b.city AS branch_city
FROM Customer c
LEFT JOIN Account a ON c.cid = a.cid
LEFT JOIN Employee e ON c.emp_id = e.emp_id
LEFT JOIN Branch b ON e.b_id = b.b_id;

-- View 3: TRANSACTION_DASHBOARD
CREATE OR REPLACE VIEW TRANSACTION_DASHBOARD AS
SELECT
    t.t_id,
    t.trans_date,
    t."TYPE" AS transaction_type,
    t.amount,
    t."MODE" AS transaction_mode,
    t.status,
    a.acc_id,
    c.cid,
    c.first_name || ' ' || c.last_name AS customer_name
FROM "TRANSACTION" t
JOIN Account a ON t.acc_id = a.acc_id
JOIN Customer c ON a.cid = c.cid;

-- View 4: LOAN_DASHBOARD
CREATE OR REPLACE VIEW LOAN_DASHBOARD AS
SELECT
    l.l_id,
    l.l_type,
    l.amount,
    l.interest,
    l.term,
    c.cid,
    c.first_name || ' ' || c.last_name AS customer_name,
    c.city
FROM Loan l
JOIN Customer c ON l.cid = c.cid;

-- View 5: CREDITCARD_DASHBOARD
CREATE OR REPLACE VIEW CREDITCARD_DASHBOARD AS
SELECT
    cc.pno,
    cc."TYPE" AS card_type,
    cc.card_limit,
    cc.expiry,
    cc.status,
    cc.cid,
    c.first_name || ' ' || c.last_name AS customer_name
FROM CreditCard cc
JOIN Customer c ON cc.cid = c.cid;

COMMIT;

PROMPT ============================================================================
PROMPT Banking Management System Database Setup Completed Successfully!
PROMPT ============================================================================