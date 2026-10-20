-- ============================================================================
-- ORACLE DATABASE MIGRATION SCRIPT: SAFE DELETE, CLOSE & DEACTIVATE
-- Target Database: Oracle Database 21c XE / Oracle Database Free
-- Target Schema:   PRIYANSHI (or current schema)
-- File:            database/migration_safe_delete.sql
-- ============================================================================
-- Description:
-- Safely adds status columns and constraints to existing populated tables
-- (Customer, Loan, Employee, Branch), and introduces stored procedures for
-- safe deactivation, account closure, loan settlement, card blocking,
-- nominee removal, and phone removal without dropping tables or breaking data.
-- ============================================================================

SET DEFINE OFF;
SET FEEDBACK ON;

PROMPT ============================================================================
PROMPT 1. ADDING STATUS COLUMNS SAFELY TO EXISTING TABLES
PROMPT ============================================================================

-- 1.1 Customer Status Column
DECLARE
    v_col_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_col_count FROM user_tab_cols 
    WHERE table_name = 'CUSTOMER' AND column_name = 'STATUS';
    IF v_col_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Customer ADD (status VARCHAR2(20) DEFAULT ''ACTIVE'' NOT NULL)';
        DBMS_OUTPUT.PUT_LINE('Added status column to Customer.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('Customer.status already exists.');
    END IF;
END;
/

-- 1.2 Customer Status Check Constraint
DECLARE
    v_chk_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_chk_count FROM user_constraints 
    WHERE table_name = 'CUSTOMER' AND constraint_name = 'CHK_CUSTOMER_STATUS';
    IF v_chk_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Customer ADD CONSTRAINT chk_customer_status CHECK (status IN (''ACTIVE'', ''INACTIVE''))';
        DBMS_OUTPUT.PUT_LINE('Added chk_customer_status constraint.');
    END IF;
END;
/

-- 1.3 Loan Status Column
DECLARE
    v_col_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_col_count FROM user_tab_cols 
    WHERE table_name = 'LOAN' AND column_name = 'STATUS';
    IF v_col_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Loan ADD (status VARCHAR2(20) DEFAULT ''ACTIVE'' NOT NULL)';
        DBMS_OUTPUT.PUT_LINE('Added status column to Loan.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('Loan.status already exists.');
    END IF;
END;
/

-- 1.4 Loan Status Check Constraint
DECLARE
    v_chk_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_chk_count FROM user_constraints 
    WHERE table_name = 'LOAN' AND constraint_name = 'CHK_LOAN_STATUS';
    IF v_chk_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Loan ADD CONSTRAINT chk_loan_status CHECK (status IN (''ACTIVE'', ''SETTLED'', ''CLOSED''))';
        DBMS_OUTPUT.PUT_LINE('Added chk_loan_status constraint.');
    END IF;
END;
/

-- 1.5 Employee Status Column
DECLARE
    v_col_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_col_count FROM user_tab_cols 
    WHERE table_name = 'EMPLOYEE' AND column_name = 'STATUS';
    IF v_col_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Employee ADD (status VARCHAR2(20) DEFAULT ''ACTIVE'' NOT NULL)';
        DBMS_OUTPUT.PUT_LINE('Added status column to Employee.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('Employee.status already exists.');
    END IF;
END;
/

-- 1.6 Employee Status Check Constraint
DECLARE
    v_chk_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_chk_count FROM user_constraints 
    WHERE table_name = 'EMPLOYEE' AND constraint_name = 'CHK_EMPLOYEE_STATUS';
    IF v_chk_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Employee ADD CONSTRAINT chk_employee_status CHECK (status IN (''ACTIVE'', ''INACTIVE''))';
        DBMS_OUTPUT.PUT_LINE('Added chk_employee_status constraint.');
    END IF;
END;
/

-- 1.7 Branch Status Column
DECLARE
    v_col_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_col_count FROM user_tab_cols 
    WHERE table_name = 'BRANCH' AND column_name = 'STATUS';
    IF v_col_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Branch ADD (status VARCHAR2(20) DEFAULT ''ACTIVE'' NOT NULL)';
        DBMS_OUTPUT.PUT_LINE('Added status column to Branch.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('Branch.status already exists.');
    END IF;
END;
/

-- 1.8 Branch Status Check Constraint
DECLARE
    v_chk_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_chk_count FROM user_constraints 
    WHERE table_name = 'BRANCH' AND constraint_name = 'CHK_BRANCH_STATUS';
    IF v_chk_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Branch ADD CONSTRAINT chk_branch_status CHECK (status IN (''ACTIVE'', ''INACTIVE''))';
        DBMS_OUTPUT.PUT_LINE('Added chk_branch_status constraint.');
    END IF;
END;
/

-- 1.9 Ensure Account Status has proper defaults and constraints
UPDATE Account SET status = 'ACTIVE' WHERE status IS NULL;
DECLARE
    v_chk_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_chk_count FROM user_constraints 
    WHERE table_name = 'ACCOUNT' AND constraint_name = 'CHK_ACCOUNT_STATUS';
    IF v_chk_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE Account ADD CONSTRAINT chk_account_status CHECK (status IN (''ACTIVE'', ''INACTIVE'', ''CLOSED''))';
        DBMS_OUTPUT.PUT_LINE('Added chk_account_status constraint.');
    END IF;
END;
/

-- 1.10 Ensure CreditCard Status has proper defaults and constraints
UPDATE CreditCard SET status = 'ACTIVE' WHERE status IS NULL;
DECLARE
    v_chk_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_chk_count FROM user_constraints 
    WHERE table_name = 'CREDITCARD' AND constraint_name = 'CHK_CREDITCARD_STATUS';
    IF v_chk_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE CreditCard ADD CONSTRAINT chk_creditcard_status CHECK (status IN (''ACTIVE'', ''INACTIVE'', ''BLOCKED'', ''CLOSED''))';
        DBMS_OUTPUT.PUT_LINE('Added chk_creditcard_status constraint.');
    END IF;
END;
/

COMMIT;

PROMPT ============================================================================
PROMPT 2. CREATING SAFE PL/SQL PROCEDURES FOR CLOSE & DEACTIVATION
PROMPT ============================================================================

-- Procedure: close_account
-- Enforces business rule: balance must be exactly 0, account must not already be closed
CREATE OR REPLACE PROCEDURE close_account(p_acc_id NUMBER) AS
    v_balance NUMBER;
    v_status VARCHAR2(20);
BEGIN
    SELECT balance, status INTO v_balance, v_status 
    FROM Account WHERE acc_id = p_acc_id;

    IF v_status = 'CLOSED' THEN
        RAISE_APPLICATION_ERROR(-20020, 'Account is already closed');
    END IF;

    IF v_balance > 0 THEN
        RAISE_APPLICATION_ERROR(-20021, 'Cannot close account with non-zero balance (' || v_balance || '). Withdraw or transfer all funds before closing.');
    ELSIF v_balance < 0 THEN
        RAISE_APPLICATION_ERROR(-20022, 'Cannot close account with negative balance (' || v_balance || ')');
    END IF;

    UPDATE Account SET status = 'CLOSED' WHERE acc_id = p_acc_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20023, 'Account not found');
END;
/

-- Procedure: settle_loan
-- Marks a loan as SETTLED, preserving its full history and accountability references
CREATE OR REPLACE PROCEDURE settle_loan(p_l_id NUMBER) AS
    v_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_status FROM Loan WHERE l_id = p_l_id;

    IF v_status = 'SETTLED' OR v_status = 'CLOSED' THEN
        RAISE_APPLICATION_ERROR(-20024, 'Loan is already settled');
    END IF;

    UPDATE Loan SET status = 'SETTLED' WHERE l_id = p_l_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20025, 'Loan not found');
END;
/

-- Procedure: deactivate_customer
-- Soft-deactivates customer while preserving all accounts, loans, and transaction records
CREATE OR REPLACE PROCEDURE deactivate_customer(p_cid NUMBER) AS
    v_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_status FROM Customer WHERE cid = p_cid;

    IF v_status = 'INACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20026, 'Customer is already deactivated');
    END IF;

    UPDATE Customer SET status = 'INACTIVE' WHERE cid = p_cid;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20027, 'Customer not found');
END;
/

-- Procedure: activate_customer
-- Reactivates a soft-deactivated customer
CREATE OR REPLACE PROCEDURE activate_customer(p_cid NUMBER) AS
    v_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_status FROM Customer WHERE cid = p_cid;

    IF v_status = 'ACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20028, 'Customer is already active');
    END IF;

    UPDATE Customer SET status = 'ACTIVE' WHERE cid = p_cid;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20027, 'Customer not found');
END;
/

-- Procedure: deactivate_branch
-- Deactivates a branch only if it has NO active employees
CREATE OR REPLACE PROCEDURE deactivate_branch(p_b_id NUMBER) AS
    v_status VARCHAR2(20);
    v_active_emp NUMBER;
BEGIN
    SELECT status INTO v_status FROM Branch WHERE b_id = p_b_id;

    IF v_status = 'INACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20029, 'Branch is already inactive');
    END IF;

    SELECT COUNT(*) INTO v_active_emp 
    FROM Employee WHERE b_id = p_b_id AND (status = 'ACTIVE' OR status IS NULL);

    IF v_active_emp > 0 THEN
        RAISE_APPLICATION_ERROR(-20030, 'Cannot deactivate branch with active employees (' || v_active_emp || '). Reassign or deactivate employees first.');
    END IF;

    UPDATE Branch SET status = 'INACTIVE' WHERE b_id = p_b_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20031, 'Branch not found');
END;
/

-- Procedure: activate_branch
-- Reactivates a branch
CREATE OR REPLACE PROCEDURE activate_branch(p_b_id NUMBER) AS
    v_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_status FROM Branch WHERE b_id = p_b_id;

    IF v_status = 'ACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20032, 'Branch is already active');
    END IF;

    UPDATE Branch SET status = 'ACTIVE' WHERE b_id = p_b_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20031, 'Branch not found');
END;
/

-- Procedure: deactivate_employee
-- Deactivates an employee without breaking past responsibilities or historical links
CREATE OR REPLACE PROCEDURE deactivate_employee(p_emp_id NUMBER) AS
    v_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_status FROM Employee WHERE emp_id = p_emp_id;

    IF v_status = 'INACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20033, 'Employee is already inactive');
    END IF;

    UPDATE Employee SET status = 'INACTIVE' WHERE emp_id = p_emp_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20034, 'Employee not found');
END;
/

-- Procedure: activate_employee
-- Reactivates an employee
CREATE OR REPLACE PROCEDURE activate_employee(p_emp_id NUMBER) AS
    v_status VARCHAR2(20);
BEGIN
    SELECT status INTO v_status FROM Employee WHERE emp_id = p_emp_id;

    IF v_status = 'ACTIVE' THEN
        RAISE_APPLICATION_ERROR(-20035, 'Employee is already active');
    END IF;

    UPDATE Employee SET status = 'ACTIVE' WHERE emp_id = p_emp_id;
    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20034, 'Employee not found');
END;
/

-- Procedure: remove_nominee
-- Safely removes nominee relationship from Owns then Nominee table
CREATE OR REPLACE PROCEDURE remove_nominee(p_n_id NUMBER) AS
BEGIN
    DELETE FROM Owns WHERE n_id = p_n_id;
    DELETE FROM Nominee WHERE n_id = p_n_id;
    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20036, 'Nominee not found');
    END IF;
    COMMIT;
END;
/

-- Procedure: remove_customer_phone
-- Safely removes a phone number for a customer while keeping the customer record intact
CREATE OR REPLACE PROCEDURE remove_customer_phone(p_cid NUMBER, p_phone VARCHAR2) AS
BEGIN
    DELETE FROM Customer_Phone WHERE cid = p_cid AND phone = p_phone;
    IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20037, 'Customer phone record not found');
    END IF;
    COMMIT;
END;
/

-- Recompile dependent views and procedures that may be marked invalid by table alteration
ALTER VIEW CUSTOMER_DASHBOARD COMPILE;
ALTER PROCEDURE CUSTOMER_DETAILS COMPILE;
ALTER FUNCTION TOTAL_LOAN COMPILE;

PROMPT ============================================================================
PROMPT MIGRATION COMPLETE: Schema updated safely with zero data loss!
PROMPT ============================================================================
