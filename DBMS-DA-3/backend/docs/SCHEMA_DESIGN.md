# Finora DA3: CockroachDB Schema Design Document

## 1. Executive Summary & Architecture Overview
This document specifies the distributed relational schema for **Finora DA3**, a next-generation Banking Management System running on **CockroachDB Cloud** (cluster `finora-da3`, region AWS Mumbai `aws-ap-south-1`).

This design modernizes the original Oracle 21c monolithic banking database (`PRIYANSHI@XEPDB1`) and DA2 reference models into a cloud-native, distributed, multi-region capable schema with improved 3NF normalization, explicit deletion policies, and proper multi-owner account structures.

---

## 2. Table Catalog & Detailed Purpose

The schema comprises **14 core tables** and **5 analytical views**:

| # | Table Name | Purpose / Business Entity | Key Columns & Types | Deletion Policy & Integrity Rules |
|---|---|---|---|---|
| 1 | `branch` | Bank branches, IFSC routing codes, and contact info | `b_id` (PK, INT8), `ifsc` (UQ) | Root entity. Referenced by employees, accounts, and operational assignments. |
| 2 | `employee` | Branch staff, tellers, loan officers, and managers | `emp_id` (PK, INT8), `b_id` (FK) | `ON DELETE RESTRICT` from Branch. |
| 3 | `customer` | Bank customers / KYC records | `cid` (PK, INT8), `pan` (UQ), `emp_id` (FK) | `emp_id` is nullable (`ON DELETE SET NULL`) if customer has no dedicated officer. |
| 4 | `customer_phone` | Multi-valued phone numbers per customer | `(cid, phone)` (Composite PK) | `ON DELETE CASCADE` from Customer. |
| 5 | `account` | Financial depository accounts | `acc_id` (PK, INT8), `b_id` (FK), `balance` | `ON DELETE RESTRICT` from Branch. `balance >= 0` check constraint. |
| 6 | `account_holder` | M:N association between Customer and Account | `(acc_id, cid)` (Composite PK) | `acc_id` `CASCADE`, `cid` `RESTRICT`. Replaces legacy `OWNS`. |
| 7 | `nominee` | Account nominee designated in case of holder demise | `n_id` (PK, INT8), `acc_id` (FK), `cid` (FK) | `acc_id` `CASCADE`, `cid` `SET NULL`. |
| 8 | `creditcard` | Credit cards issued to customer | `pno` (PK, VARCHAR), `cid` (FK), `card_limit` | `ON DELETE RESTRICT` from Customer. CVV stored securely. |
| 9 | `loan` | Loans sanctioned to customers | `l_id` (PK, INT8), `cid` (FK), `assigned_emp_id` (FK) | `ON DELETE RESTRICT` from Customer. Positive amount and interest checks. |
| 10 | `loan_payment` | Loan repayment installment history | `payment_id` (PK, INT8), `l_id` (FK) | `ON DELETE RESTRICT` from Loan. Component check: `amount = principal + interest`. |
| 11 | `beneficiary` | Saved transfer recipients (internal and external) | `beneficiary_id` (PK, INT8), `cid` (FK) | `ON DELETE CASCADE` from Customer. Optional `internal_acc_id` FK. |
| 12 | `"transaction"` | Financial transaction ledger | `t_id` (PK, INT8), `acc_id` (FK), `amount` | `ON DELETE RESTRICT`. Self-referencing `related_trans_id` for atomic transfers. |
| 13 | `audit_log` | Security, administrative, and data change audit trail | `log_id` (PK, INT8), `emp_id` (FK), `details` (JSONB) | `emp_id` nullable for system events. Strict exclusion of secrets/CVVs. |
| 14 | `responsible_for` | Operational staff duties & supervisory assignments | `rf_id` (PK, INT8), `emp_id` (FK), `b_id` (FK) | Redesigned operational matrix; decoupled from rigid 4-way tuple. |

---

## 3. Relationship Cardinalities & Design Decisions

### 3.1. Replaced `OWNS` with `ACCOUNT_HOLDER` (Many-to-Many)
- **Problem in Oracle/DA2:** `OWNS (cid, acc_id, n_id)` had a composite primary key of 3 attributes, which made recording account ownership impossible unless a nominee already existed (`n_id` was NOT NULL in PK).
- **CockroachDB Solution:** Decouple `nominee` directly to `account`. Model account ownership in `account_holder (acc_id, cid, ownership_role, is_primary, share_percentage, created_at)` with `PRIMARY KEY (acc_id, cid)`.
- **Guarantee:** A customer cannot be mapped to the same account multiple times. Single accounts, joint accounts, secondary holders, and ownership shares ($0\%-100\%$) are naturally and cleanly represented.

### 3.2. Redesigned `RESPONSIBLE_FOR`
- **Problem in Oracle/DA2:** `Responsible_For (emp_id, t_id, l_id, b_id)` required every single record to bind 4 entities simultaneously. In reality, a teller transaction does not have a loan, and a loan approval does not have an immediate transaction.
- **CockroachDB Solution:** Converted `responsible_for` into an **Operational and Branch Staff Assignment Ledger**:
  - `(emp_id, b_id)` are mandatory links to staff and branch.
  - `role_type` categorizes duties (`BRANCH_MANAGER`, `LOAN_OFFICER`, `TELLER_SUPERVISOR`, `OPERATIONAL_SUPERVISOR`, `AUDIT_OFFICER`).
  - `l_id` and `t_id` are optional supervisory/audit pointers (`ON DELETE SET NULL`), preserving backward-compatibility with legacy data fixtures while eliminating relational anomalies.

### 3.3. Double-Entry Transfer Representation
- **Decision:** Transfers are modeled as linked transaction ledger entries on `"transaction"`:
  - Leg 1 (Debit): Outflow from Source Account with `related_acc_id = Target` and `related_trans_id = Leg 2 ID`.
  - Leg 2 (Credit): Inflow into Target Account with `related_acc_id = Source` and `related_trans_id = Leg 1 ID`.
- **Advantage:** Each account's bank statement displays its local transaction entry with clear debits and credits, while preserving bilateral linkage without requiring a heavy external join entity.

### 3.4. Beneficiaries & External Routing
- `beneficiary` allows customers to save frequent transfer recipients.
- Destination accounts can be internal (`internal_acc_id REFERENCES account(acc_id)`) or external third-party accounts (storing `destination_account_num` and `destination_ifsc`).

---

## 4. CockroachDB Distributed Best Practices & Compatibility

1. **Primary Key Strategy:**
   - Primary keys use `BIGINT DEFAULT unique_rowid()`. This prevents hotspotting across CockroachDB range leases by distributing sequential inserts across range splits, while permitting explicit insertion of human-friendly sequential IDs (e.g. 101, 201, 301) for existing sample datasets.
2. **ACID & Serializable Isolation:**
   - CockroachDB enforces `SERIALIZABLE` isolation by default. Multi-statement financial transfers will be wrapped in transactions with standard SQLSTATE `40001` retry handlers in the backend.
3. **Data Types:**
   - Replaced Oracle `NUMBER(p, s)` with CockroachDB `DECIMAL(12,2)`.
   - Replaced Oracle `VARCHAR2` with `VARCHAR`.
   - Replaced Oracle `DATE` with standard `DATE` for calendar dates and `TIMESTAMPTZ` for timestamps.
   - Structured metadata in `audit_log` stored as native CockroachDB `JSONB`.
4. **Analytical Views:**
   - 5 standard reporting views (`dashboard_summary`, `customer_dashboard`, `transaction_dashboard`, `loan_dashboard`, `creditcard_dashboard`) adapted from Oracle syntax to PostgreSQL/CockroachDB syntax (`COALESCE`, `CONCAT`).

---

## 5. Deletion & Retention Policies

- **Financial Safety (`ON DELETE RESTRICT`):** Customers with active accounts, loans, or credit cards cannot be deleted. Accounts with financial transactions or active balances cannot be dropped.
- **Dependent Child Cascade (`ON DELETE CASCADE`):** Removing a customer safely cascades to auxiliary metadata like `customer_phone` and `beneficiary`. Closing an account cascades to its `account_holder` entries and `nominee`.
- **Audit & History Preservation (`ON DELETE SET NULL`):** Transactions and audit logs preserve historical records; if an employee is deleted or reassigned, their processing reference is set to `NULL` while the financial ledger remains intact.
