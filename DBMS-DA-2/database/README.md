# Finora DA2 — Oracle Database & PL/SQL Architecture

This directory contains the database definition files, sample data fixtures, PL/SQL stored programs, autonomous triggers, analytical views, and verification scripts for **Finora DA2**.

---

## Database Overview

- **DBMS Platform:** Oracle Database 21c Express Edition (XE) / Oracle Database Free
- **Service Name (PDB):** `XEPDB1` (or `FREEPDB1` on Oracle Free)
- **Default Schema User:** `PRIYANSHI`
- **Listener Port:** `1521`

---

## Directory Contents

| File Name | Purpose / Description |
| :--- | :--- |
| `complete_banking_database.sql` | **Primary Master Script:** Drops previous objects cleanly, creates all 11 tables with primary/foreign key/check constraints, loads baseline data, compiles 4 stored procedures, 3 functions, 6 triggers, and 5 analytical views. |
| `banking_database.sql` | Standalone DDL schema definition script without sample data. |
| `banking_data.sql` | Standalone sample dataset insert script. |
| `verify_database.sql` | Verification script: checks table row counts, foreign key integrity, and ensures that `user_objects` contains zero invalid compiled objects. |
| `migration_safe_delete.sql` | Supplemental migration script for safe deletion rules and lifecycle constraints. |

---

## Relational Schema: 11 Tables

1. **`Branch`** (`b_id` PK, `ifsc` UQ, `branch_name`, `city`, `state`, `contact`, `pincode`)
2. **`Employee`** (`emp_id` PK, `b_id` FK, `first_name`, `last_name`, `salary`, `hire_date`)
3. **`Customer`** (`cid` PK, `pan` UQ, `emp_id` FK, `first_name`, `last_name`, `dob`, `city`, `state`, `pincode`)
4. **`Customer_Phone`** (`cid` FK, `phone` — Composite PK: `(cid, phone)`)
5. **`Account`** (`acc_id` PK, `cid` FK, `b_id` FK, `acc_type`, `balance` $\ge 0$, `status`)
6. **`Nominee`** (`n_id` PK, `cid` FK, `acc_id` FK, `first_name`, `last_name`, `relationship`, `dob`)
7. **`Owns`** (`cid` FK, `acc_id` FK, `n_id` FK — Composite PK: `(cid, acc_id, n_id)`)
8. **`CreditCard`** (`pno` PK, `cid` FK, `type`, `card_limit`, `expiry`, `cvv`, `status`)
9. **`Loan`** (`l_id` PK, `cid` FK, `l_type`, `amount` $> 0$, `interest` $\ge 0$, `term`, `status`)
10. **`"TRANSACTION"`** (`t_id` PK, `acc_id` FK, `trans_date`, `type`, `amount` $> 0$, `mode`, `status`)
11. **`Responsible_For`** (`emp_id` FK, `t_id` FK, `l_id` FK, `b_id` FK — Composite PK)

---

## PL/SQL Programs

### Stored Procedures
- `deposit_money(p_acc_id, p_amount)`: Validates positive amount and updates account balance directly.
- `withdraw_money(p_acc_id, p_amount)`: Verifies sufficient balance and debits account.
- `transfer_money(p_from_acc, p_to_acc, p_amount)`: Executes bilateral transfer via ledger inserts.
- `customer_details(p_cid)`: Displays customer profile and aggregated holdings via `DBMS_OUTPUT`.

### Stored Functions
- `get_balance(p_acc_id) RETURN NUMBER`: Returns the current numeric balance for an account.
- `check_loan_eligibility(p_cid) RETURN VARCHAR2`: Sums all account balances for customer `cid`; returns `'ELIGIBLE'` if total balance $\ge ₹1,00,000$, else `'NOT ELIGIBLE'`.
- `total_loan(p_cid) RETURN NUMBER`: Returns the total outstanding loan principal for a customer.

### Autonomous Triggers
- `TRG_TRANSACTION_STATUS` (`BEFORE INSERT ON "TRANSACTION"`): Defaults status to `'SUCCESS'`.
- `TRG_TRANSACTION_AMOUNT_CHECK` (`BEFORE INSERT OR UPDATE ON "TRANSACTION"`): Enforces `amount > 0`.
- `TRG_LOAN_AMOUNT_CHECK` (`BEFORE INSERT OR UPDATE ON Loan`): Enforces `amount > 0`.
- `TRG_ACCOUNT_BALANCE_CHECK` (`BEFORE UPDATE OF balance ON Account`): Prevents negative balances.
- `TRG_VALIDATE_TRANSACTION` (`BEFORE INSERT ON "TRANSACTION"`): Validates account exists, is active, and verifies sufficient balance on debits/withdrawals.
- `TRG_UPDATE_BALANCE` (`AFTER INSERT ON "TRANSACTION"`): Automatically increments balance on deposits and decrements on withdrawals, preventing double-modification anomalies.

---

## Analytical Dashboard Views

- `DASHBOARD_SUMMARY`: Consolidated counts and financial totals across all entities.
- `CUSTOMER_DASHBOARD`: Customer accounts, balances, and branch associations.
- `TRANSACTION_DASHBOARD`: Detailed ledger entries joined with customer accounts.
- `LOAN_DASHBOARD`: Active loans, interest rates, tenures, and borrower names.
- `CREDITCARD_DASHBOARD`: Issued cards, credit limits, card types, and holders.

---

## Running the Database Setup

1. Connect to Oracle as `SYSDBA`:
   ```bash
   sqlplus sys/your_password@localhost:1521/XEPDB1 as sysdba
   ```
2. Create schema user:
   ```sql
   CREATE USER PRIYANSHI IDENTIFIED BY your_password;
   GRANT CONNECT, RESOURCE, DBA TO PRIYANSHI;
   GRANT UNLIMITED TABLESPACE TO PRIYANSHI;
   EXIT;
   ```
3. Run the complete database script:
   ```bash
   sqlplus PRIYANSHI/your_password@localhost:1521/XEPDB1 @complete_banking_database.sql
   ```
4. Verify database objects:
   ```bash
   sqlplus PRIYANSHI/your_password@localhost:1521/XEPDB1 @verify_database.sql
   ```
