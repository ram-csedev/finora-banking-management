-- Verification script for Banking Management System
SET DEFINE OFF;
SET PAGESIZE 100 LINESIZE 200 FEEDBACK ON;

PROMPT ============================================================================
PROMPT 1. TABLE ROW COUNTS
PROMPT ============================================================================
SELECT 'Branch' AS table_name, COUNT(*) AS row_count FROM Branch
UNION ALL SELECT 'Employee', COUNT(*) FROM Employee
UNION ALL SELECT 'Customer', COUNT(*) FROM Customer
UNION ALL SELECT 'Customer_Phone', COUNT(*) FROM Customer_Phone
UNION ALL SELECT 'Account', COUNT(*) FROM Account
UNION ALL SELECT 'Nominee', COUNT(*) FROM Nominee
UNION ALL SELECT 'Owns', COUNT(*) FROM Owns
UNION ALL SELECT 'CreditCard', COUNT(*) FROM CreditCard
UNION ALL SELECT 'Loan', COUNT(*) FROM Loan
UNION ALL SELECT 'TRANSACTION', COUNT(*) FROM "TRANSACTION"
UNION ALL SELECT 'Responsible_For', COUNT(*) FROM Responsible_For;

PROMPT ============================================================================
PROMPT 2. OBJECT COUNTS BY TYPE
PROMPT ============================================================================
SELECT object_type, COUNT(*) AS total
FROM user_objects
GROUP BY object_type
ORDER BY object_type;

PROMPT ============================================================================
PROMPT 3. INVALID OBJECTS (Must return NO ROWS)
PROMPT ============================================================================
SELECT object_name, object_type, status
FROM user_objects
WHERE status = 'INVALID';

PROMPT ============================================================================
PROMPT 4. TEST FUNCTION AND VIEW EXECUTION
PROMPT ============================================================================
SELECT get_balance(401) AS balance_acc_401,
       check_loan_eligibility(301) AS eligibility_cust_301,
       total_loan(301) AS total_loan_cust_301
FROM dual;

SELECT * FROM DASHBOARD_SUMMARY;

PROMPT ============================================================================
PROMPT VERIFICATION COMPLETE
PROMPT ============================================================================
EXIT;
