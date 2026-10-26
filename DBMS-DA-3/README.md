# Finora DA3 — Distributed Cloud Banking & Relational Management System

A cloud-native distributed relational banking and loan management platform developed as an advanced academic Database Management Systems (DBMS) project. Finora DA3 modernizes traditional monolithic relational banking systems into a distributed SQL platform powered by **CockroachDB Cloud Serverless (v26.2.7)**, featuring strict **Serializable ACID transactions (SSI)**, **Multi-Raft consensus**, a high-performance **Pebble LSM-tree storage engine**, a modular **Node.js/Express REST API**, and a modern **React 19 + TypeScript + Vite 8** single-page application with a custom **Neon Obsidian** design system.

---

### Verified Live Deployments

- **Web Application (Frontend):** [https://finora-db-frontend.onrender.com/](https://finora-db-frontend.onrender.com/) *(Verified Active — HTTP 200)*
- **REST API Service (Backend):** [https://finora-db.onrender.com/api/health](https://finora-db.onrender.com/api/health) *(Verified Active — HTTP 200, CockroachDB status: UP)*
- **Database Engine:** CockroachDB Cloud Serverless (AWS Mumbai `ap-south-1`, Cluster: `finora-da3`, Database: `finora_da3`, Version: v26.2.7)

> [!NOTE]
> Render free-tier web services spin down after 15 minutes of inactivity. The initial request to the backend may take 30–50 seconds while the service spins up.

---

## Table of Contents

- [Project Overview](#project-overview)
  - [Evolution from DA2 to DA3](#evolution-from-da2-to-da3)
  - [Core Capabilities](#core-capabilities)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Database Design](#database-design)
  - [Entity Relationship Summary](#entity-relationship-summary)
  - [Relational Schema: 14 Core Tables](#relational-schema-14-core-tables)
  - [Analytical & Dashboard Views](#analytical-dashboard-views)
  - [Primary Key Strategy & unique_rowid()](#primary-key-strategy-unique_rowid)
- [CockroachDB Distributed Architecture Deep Dive](#cockroachdb-distributed-architecture-deep-dive)
  - [Multi-Raft Consensus](#multi-raft-consensus)
  - [Pebble LSM-Tree Storage Engine](#pebble-lsm-tree-storage-engine)
  - [Strict Serializable Isolation (SSI)](#strict-serializable-isolation-ssi)
  - [Handling Serialization Conflicts (SQLSTATE 40001)](#handling-serialization-conflicts-sqlstate-40001)
  - [Secure TLS & Driver Integration](#secure-tls-driver-integration)
- [Banking Transactions & Ledger Mechanics](#banking-transactions-ledger-mechanics)
  - [Deposit Operations](#deposit-operations)
  - [Withdrawal Operations](#withdrawal-operations)
  - [Double-Entry Inter-Account Transfers](#double-entry-inter-account-transfers)
  - [Loan Repayment Installments](#loan-repayment-installments)
- [Database Constraint Validation & User-Friendly Error Handling](#database-constraint-validation-user-friendly-error-handling)
  - [Canonical Value Normalization](#canonical-value-normalization)
  - [Database Constraint Mapping & Semantic Codes](#database-constraint-mapping-semantic-codes)
  - [Centralized Error Handling & Credential Redaction](#centralized-error-handling-credential-redaction)
- [Lifecycle Management & Permanent Deletion Workflows](#lifecycle-management-permanent-deletion-workflows)
  - [Simplified Permanent Deletion Confirmation UI](#simplified-permanent-deletion-confirmation-ui)
  - [Unrestricted Permanent Branch Deletion](#unrestricted-permanent-branch-deletion)
  - [Entity Deletion Rules & Cascade Behavior](#entity-deletion-rules-cascade-behavior)
  - [Immutable Financial History Protection (HTTP 403)](#immutable-financial-history-protection-http-403)
  - [Safe Status Lifecycle Transitions](#safe-status-lifecycle-transitions)
- [CockroachDB SQL Query Workbench](#cockroachdb-sql-query-workbench)
  - [Preloaded Banking Query Templates](#preloaded-banking-query-templates)
  - [Arbitrary Valid Read-Only SQL Query Support](#arbitrary-valid-read-only-sql-query-support)
  - [Interactive CockroachDB Schema Explorer](#interactive-cockroachdb-schema-explorer)
  - [Dynamic Cell & JSON Object Rendering](#dynamic-cell-json-object-rendering)
  - [Multi-Layer Sandbox Security Architecture](#multi-layer-sandbox-security-architecture)
  - [Database-Level Defense-in-Depth & Timeout Enforcement](#database-level-defense-in-depth-timeout-enforcement)
- [Educational CockroachDB Architectural Showcase](#educational-cockroachdb-architectural-showcase)
  - [Educational Simulation Disclaimer](#educational-simulation-disclaimer)
  - [Multi-Raft Consensus & Node Failover Simulator](#multi-raft-consensus-node-failover-simulator)
  - [64MB Key-Range Partitioning & Auto-Split Visualizer](#64mb-key-range-partitioning-auto-split-visualizer)
  - [Serializable Isolation & Retry Demonstrator](#serializable-isolation-retry-demonstrator)
  - [Simulated Quorum Write Gate Middleware](#simulated-quorum-write-gate-middleware)
- [API Documentation](#api-documentation)
  - [1. Health & Telemetry](#1-health-telemetry)
  - [2. Dashboard & Analytical Views](#2-dashboard-analytical-views)
  - [3. Banking Transaction Endpoints](#3-banking-transaction-endpoints)
  - [4. Universal Entity CRUD Endpoints](#4-universal-entity-crud-endpoints)
  - [5. Deletion Preview & Confirmation Endpoints](#5-deletion-preview-confirmation-endpoints)
  - [6. Database Catalog & Metadata Endpoints](#6-database-catalog-metadata-endpoints)
  - [7. SQL Workbench Endpoints](#7-sql-workbench-endpoints)
  - [8. Showcase & Raft Simulator Endpoints](#8-showcase-raft-simulator-endpoints)
- [Frontend Architecture & UI Overview](#frontend-architecture-ui-overview)
  - [Neon Obsidian Design System](#neon-obsidian-design-system)
  - [Application Pages](#application-pages)
- [Project Structure](#project-structure)
- [Local Setup Guide](#local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Database Configuration & Root CA Certificate](#step-2-database-configuration-root-ca-certificate)
  - [Step 3: Backend Setup & Schema Migrations](#step-3-backend-setup-schema-migrations)
  - [Step 4: Seed Demonstration Data](#step-4-seed-demonstration-data)
  - [Step 5: Frontend Setup & Development Server](#step-5-frontend-setup-development-server)
- [Environment Variables](#environment-variables)
  - [Backend Configuration (`backend/.env`)](#backend-configuration-backendenv)
  - [Frontend Configuration (`frontend/.env`)](#frontend-configuration-frontendenv)
- [Deployment Architecture](#deployment-architecture)
  - [Render Deployment Configuration](#render-deployment-configuration)
- [Testing & Verification Suite](#testing-verification-suite)
  - [Summary of Verified Test Results](#summary-of-verified-test-results)
  - [Test Suite 1: SQL Query Workbench & Templates](#test-suite-1-sql-query-workbench-templates)
  - [Test Suite 2: Deletion Lifecycle & Cascades](#test-suite-2-deletion-lifecycle-cascades)
  - [Test Suite 3: Dedicated Branch Permanent Deletion](#test-suite-3-dedicated-branch-permanent-deletion)
  - [Test Suite 4: Database Constraints & Friendly Errors](#test-suite-4-database-constraints-friendly-errors)
  - [Test Suite 5: Multi-Raft & Range Split Simulator](#test-suite-5-multi-raft-range-split-simulator)
  - [Test Suite 6: Core REST API & Banking Services](#test-suite-6-core-rest-api-banking-services)
  - [Frontend Production Build & Type Checking](#frontend-production-build-type-checking)
- [Security Considerations](#security-considerations)
- [Academic Purpose](#academic-purpose)
---

## Project Overview

**Finora DA3** is a distributed banking management platform engineered to demonstrate advanced principles of modern database engineering, distributed consensus, ACID transaction semantics, referential integrity, and full-stack software integration.

While traditional academic database projects often rely on monolithic local DBMS instances (such as Oracle XE or local MySQL) and terminal-based query scripts, Finora DA3 modernizes these concepts for cloud-native distributed databases. It couples **CockroachDB Cloud**—a geo-distributed SQL database built on Google Spanner principles—with an Express REST API and a responsive React 19 single-page application.

### Evolution from DA2 to DA3

| Dimension | Previous Milestone (DBMS-DA-2) | Current Architecture (DBMS-DA-3) |
| :--- | :--- | :--- |
| **Database Engine** | Oracle Database 21c XE / Free (Monolithic) | CockroachDB Cloud Serverless v26.2.7 (Distributed SQL) |
| **Storage Engine** | Traditional Oracle B-Tree Tablespaces | Pebble Log-Structured Merge (LSM) Tree |
| **Consensus & Clustering** | Single instance container in AWS EC2 | Multi-Raft distributed consensus across partitioned range replicas |
| **Transaction Isolation** | Read Committed (Oracle default) | Strict Serializable Isolation (SSI) natively enforced |
| **Concurrency Model** | Pessimistic locking / Undo segments | Multi-Version Concurrency Control (MVCC) with SQLSTATE `40001` retries |
| **Schema Normalization** | 11 tables with rigid ternary `OWNS` | 14 tables, M:N `account_holder`, dedicated `beneficiary`, normalized `audit_log` |
| **Frontend Platform** | Vanilla HTML5, CSS3, and ES6 JavaScript | React 19, Vite 8, TypeScript, Tailwind CSS, Lucide React |
| **Deletion & Lifecycle** | Destructive cascading with balance reversal | 2-phase preview, unrestricted branch cascade, financial ledger guards |
| **Developer Tooling** | Static query examples | Interactive SQL Workbench, Live Schema Explorer, and Chen ER Diagram |
| **Educational Features** | CLI PL/SQL functions | Interactive 3-node Multi-Raft and 64MB Range-Split browser visualizers |

### Core Capabilities

- **Distributed Account & Customer Management:** Maintain comprehensive customer profiles, multiple phone numbers, and many-to-many account ownership configurations supporting primary and joint holders with percentage shares.
- **Bilateral Double-Entry Ledger:** Execute deposits, withdrawals, and inter-account transfers as linked double-entry transaction records with audit tracking and deadlock prevention.
- **Automated Serialization Retry Handling:** Gracefully handle distributed transaction conflicts (SQLSTATE `40001`) with exponential backoff and jitter algorithms.
- **Loan Portfolio & Payment Arithmetic:** Sanction loans with strict positive checks and record repayment installments enforcing mathematical component balance ($\text{amount} = \text{principal} + \text{interest}$).
- **Confirmation-Based Lifecycle & Deletion Engine:** Inspect cascading impacts before permanent deletion while safeguarding historical financial ledgers (`transaction`, `loan_payment`, `audit_log`) behind strict HTTP 403 Forbidden barriers.
- **Database Catalog & Schema Visualizer:** Live introspection of CockroachDB metadata catalogs (`information_schema`), rendering an interactive Chen-notation ER diagram with clickable foreign key popovers.
- **Sandboxed SQL Query Workbench:** Safely execute preloaded and user-authored read-only SQL queries with lexical comment stripping, string literal masking, database-level read-only transactions (`BEGIN TRANSACTION READ ONLY;`), 5000ms timeouts, and 500-row limits.
- **Interactive Schema Explorer:** Real-time discovery of all 19 catalog objects, table columns, data types, and Primary/Foreign Key badges directly inside the SQL Workbench.
- **Educational Multi-Raft Simulator:** Simulate distributed node failures and observe live write gating that enforces quorum rules across both frontend and backend layers.

---

## System Architecture

Finora DA3 implements a decoupled three-tier architecture connecting a modern single-page frontend application, a hardened Express.js REST API service, and a CockroachDB Cloud distributed database.

```text
+-----------------------------------------------------------------------------------+
|                                 Client Web Browser                                |
|   ┌───────────────────────────────────────────────────────────────────────────┐   |
|   │         React 19 + TypeScript + Vite 8 SPA (Neon Obsidian UI Theme)       │   |
|   │  - Real-time Entity Dashboards, Interactive Data Grids & Form Modals      │   |
|   │  - SQL Query Workbench with Live Schema Explorer & CSV Export             │   |
|   │  - Interactive Multi-Raft Consensus & 64MB Range Split Educational Models │   |
|   │  - Simulated Quorum Write Gate (Client-Side Interceptor)                  │   |
|   └─────────────────────────────────────┬─────────────────────────────────────┘   |
+─────────────────────────────────────────┼─────────────────────────────────────────+
                                          │ HTTPS / RESTful JSON API
                                          ▼
+-----------------------------------------------------------------------------------+
|                        Node.js + Express REST API Backend                         |
|   ┌───────────────────────────────────────────────────────────────────────────┐   |
|   │  - Universal Entity CRUD & Lifecycle Router (/api/entities/*)             │   |
|   │  - Double-Entry Atomic Banking Services (/api/banking/*)                  │   |
|   │  - Two-Phase Deletion Preview & Confirmation Engine (/api/deletion/*)     │   |
|   │  - Sandboxed SQL Workbench Execution Sandbox (/api/workbench/*)           │   |
|   │  - Centralized Error Handler & Constraint Normalizer (errorHandler.js)    │   |
|   │  - Simulated Quorum Gate Server-Side Middleware (raftQuorumGate)          │   |
|   └─────────────────────────────────────┬─────────────────────────────────────┘   |
+─────────────────────────────────────────┼─────────────────────────────────────────+
                                          │ TLS 1.3 Wire Encryption (Port 26257)
                                          ▼
+-----------------------------------------------------------------------------------+
|                    CockroachDB Cloud Serverless (v26.2.7)                         |
|   ┌───────────────────────────────────────────────────────────────────────────┐   |
|   │  - 14 Normalized Relational Tables + 5 Compiled Analytical Views          │   |
|   │  - Multi-Raft Distributed Consensus Across Range Replicas                 │   |
|   │  - Pebble Log-Structured Merge (LSM) Tree Storage Engine                  │   |
|   │  - Native Strict Serializable Isolation (SSI) & MVCC Multi-Versioning    │   |
|   │  - Automatic 64MB Range Partitioning and Distributed Span Scans           │   |
|   └───────────────────────────────────────────────────────────────────────────┘   |
+-----------------------------------------------------------------------------------+
```

---

## Tech Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.3.1` | Declarative UI state management and modular views |
| **Frontend Runtime** | React DOM | `^19.3.1` | Virtual DOM rendering |
| **Language** | TypeScript | `~6.0.2` | Static type safety and data models |
| **Build Tool & Dev Server**| Vite | `^8.3.0` | Ultra-fast HMR and production bundling |
| **Styling & CSS** | Tailwind CSS | `^3.4.19` | Utility-first styling with custom Neon Obsidian theme |
| **CSS Utilities** | `clsx` & `tailwind-merge` | `^2.1.1` / `^3.7.0`| Conditional styling and dynamic class composition |
| **Icons** | Lucide React | `^1.59.0` | Comprehensive SVG icon library |
| **Routing** | React Router DOM | `^7.18.4` | Declarative SPA client-side routing |
| **Server Runtime** | Node.js | v18+ (tested v22.17.1) | Asynchronous backend JavaScript runtime |
| **Web Framework** | Express.js | `^5.3.0` | REST API routing, JSON body parsing, and middleware |
| **Database Driver** | `pg` (node-postgres) | `^8.23.1` | PostgreSQL wire-compatible client with TLS validation |
| **Environment Config** | `dotenv` | `^18.0.8` | Secure environment variable injection from `.env` |
| **CORS Middleware** | `cors` | `^2.8.6` | Cross-Origin Resource Sharing handling |
| **Primary Database** | CockroachDB Cloud Serverless | v26.2.7 | Geo-distributed SQL engine with Multi-Raft consensus |
| **Cloud Hosting** | Render | Managed Cloud | Web Service for backend, Static Site for frontend |

---

## Database Design

The relational database comprises **14 core tables** and **5 compiled analytical views** designed in Third Normal Form (3NF).

### Entity Relationship Summary

```text
Branch (1) ──────────< Employee (M) ──────────< Customer (M) ──────────< Customer_Phone (M)
   │                       │                       │
   │ (1)                   │ (1)                   ├─────────────< Beneficiary (M)
   │                       │                       │
   ▼ (M)                   ▼ (M)                   ├─────────────< CreditCard (M)
Account                Responsible_For             │
   │                       │                       ├─────────────< Loan (M) ──< Loan_Payment (M)
   ├───────────┐           │                       │
   │ (1)       │ (1)       │                       │
   ▼ (M)       ▼ (M)       │                       ▼ (M)
Nominee    Account_Holder ─┴──────────────────> Account_Holder (M:N Bridge)
               │
               ▼ (1)
         "transaction" (M) ───< audit_log (M)
```

### Relational Schema: 14 Core Tables

| # | Table Name | Purpose / Business Entity | Primary Key | Foreign Keys & Unique Constraints | Deletion & Cascade Policy |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `branch` | Bank branches and IFSC routing codes | `b_id` (`INT8`) | `UNIQUE (ifsc)` | Root entity. Referenced by employees, accounts, and assignments. |
| **2** | `employee` | Branch staff, tellers, and managers | `emp_id` (`INT8`) | `b_id REFERENCES branch(b_id)` | `ON DELETE RESTRICT` from Branch. |
| **3** | `customer` | Customer profiles and KYC data | `cid` (`INT8`) | `UNIQUE (pan)`, `emp_id REFERENCES employee(emp_id)` | `emp_id` is nullable (`ON DELETE SET NULL`). |
| **4** | `customer_phone` | Multi-valued phone numbers per customer | `(cid, phone)` | `cid REFERENCES customer(cid)` | `ON DELETE CASCADE` from Customer. |
| **5** | `account` | Depository accounts and balances | `acc_id` (`INT8`) | `b_id REFERENCES branch(b_id)`, `CHECK (balance >= 0)` | `ON DELETE RESTRICT` from Branch. |
| **6** | `account_holder` | Many-to-Many bridge for account owners | `(acc_id, cid)` | `acc_id REFERENCES account(acc_id)`, `cid REFERENCES customer(cid)` | `acc_id` `CASCADE`, `cid` `RESTRICT`. Replaces legacy `OWNS`. |
| **7** | `nominee` | Account nominee designations | `n_id` (`INT8`) | `acc_id REFERENCES account(acc_id)`, `cid REFERENCES customer(cid)` | `acc_id` `CASCADE`, `cid` `SET NULL`. |
| **8** | `creditcard` | Issued credit cards, limits, and expiry | `pno` (`VARCHAR`) | `cid REFERENCES customer(cid)`, `CHECK (card_limit > 0)` | `ON DELETE RESTRICT` from Customer. |
| **9** | `loan` | Sanctioned loans with interest and term | `l_id` (`INT8`) | `cid REFERENCES customer(cid)`, `assigned_emp_id REFERENCES employee(emp_id)` | `ON DELETE RESTRICT` from Customer. |
| **10**| `loan_payment` | Loan repayment installment history | `payment_id` (`INT8`)| `l_id REFERENCES loan(l_id)`, component balance check | `ON DELETE RESTRICT` from Loan. |
| **11**| `beneficiary` | Saved transfer recipients (internal/ext) | `beneficiary_id` (`INT8`)| `cid REFERENCES customer(cid)`, `internal_acc_id REFERENCES account(acc_id)` | `ON DELETE CASCADE` from Customer. |
| **12**| `"transaction"` | Bilateral financial ledger | `t_id` (`INT8`) | `acc_id REFERENCES account(acc_id)`, `related_acc_id`, `related_trans_id` | `ON DELETE RESTRICT`. Immutable via 403 guard. |
| **13**| `audit_log` | Security, administrative, and query trail | `log_id` (`INT8`) | `emp_id REFERENCES employee(emp_id)`, `details` (`JSONB`) | Append-only. Secrets and CVVs excluded. |
| **14**| `responsible_for`| Branch operational duties and assignments| `rf_id` (`INT8`) | `emp_id REFERENCES employee(emp_id)`, `b_id REFERENCES branch(b_id)` | Decoupled operational matrix. |

### Analytical & Dashboard Views

1. **`dashboard_summary`:** Single-row aggregated KPI view providing `total_customers`, `total_accounts`, `total_balance`, `total_loans`, `total_loan_amount`, `total_credit_cards`, and `total_transactions`.
2. **`customer_dashboard`:** Denormalized join of customers, accounts, and branch details.
3. **`transaction_dashboard`:** Ledger records joined with account and customer identifiers for transaction history auditing.
4. **`loan_dashboard`:** Active loans joined with customer borrower names and branch locations.
5. **`creditcard_dashboard`:** Active credit cards, card networks, and assigned credit limits.

### Primary Key Strategy & unique_rowid()

CockroachDB uses `BIGINT DEFAULT unique_rowid()` for surrogate keys. This generates cluster-wide unique 64-bit integers combining node ID, physical timestamp, and sequence counter:
- Prevents range-lease hotspotting by distributing sequential inserts across range splits.
- Allows explicit insertion of sequential identifiers (e.g., 101, 201, 301) for sample datasets.

---

## CockroachDB Distributed Architecture Deep Dive

### Multi-Raft Consensus

CockroachDB partitions the total keyspace into 64MB contiguous chunks called **Ranges**. Each range is replicated across multiple nodes (typically 3 replicas) forming an independent Raft consensus group. Write operations require a quorum (majority) of replicas ($\lfloor n/2 \rfloor + 1$, or 2 of 3) to acknowledge the write before committing.

### Pebble LSM-Tree Storage Engine

CockroachDB stores range data using **Pebble**, an open-source, write-optimized Log-Structured Merge (LSM) key-value engine written in Go:
- Fast append-only writes to a Write-Ahead Log (WAL) and memory table (MemTable).
- Background compaction merges sorted string tables (SSTables) without blocking read queries.

### Strict Serializable Isolation (SSI)

CockroachDB natively enforces `SERIALIZABLE` isolation—the highest ANSI SQL transaction isolation level—using write-intent markers, latching, and Multi-Version Concurrency Control (MVCC). It detects and aborts transactions that exhibit write skew, dirty reads, or phantom updates.

### Handling Serialization Conflicts (SQLSTATE 40001)

When two concurrent transactions encounter a serialization conflict, CockroachDB aborts the conflicting transaction with PostgreSQL error code **`40001`** (`serialization_failure`).

Finora DA3 implements a transaction wrapper in `backend/config/db.js` that catches error `40001` and automatically retries with exponential backoff and jitter:

```javascript
// backend/config/db.js
async function executeTransaction(callback, maxRetries = 5) {
  const client = await pool.connect();
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        if (err.code === '40001' && attempt < maxRetries) {
          const backoff = Math.min(50 * Math.pow(2, attempt) + Math.floor(Math.random() * 50), 1000);
          console.warn(`[CockroachDB Retry] Serialization conflict (40001) on attempt ${attempt}. Retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
```

### Secure TLS & Driver Integration

The backend connects to CockroachDB Cloud using the standard Node.js `pg` driver, secured by a dedicated root Certificate Authority (`certs/root.crt`):

```javascript
// backend/config/db.js
const pool = new Pool({
  connectionString: sanitizedDatabaseUrl,
  ssl: {
    ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT, 'utf8'),
    rejectUnauthorized: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});
```

---

## Banking Transactions & Ledger Mechanics

Finora DA3 coordinates all balance adjustments and ledger records within atomic, serializable database transactions to prevent double-updates, phantom modifications, or ledger desynchronization.

### Deposit Operations
1. User submits deposit payload (`acc_id`, `amount`, `mode`).
2. Backend validates that `amount > 0` and verifies that the target account is `ACTIVE`.
3. Account balance is atomically incremented: `UPDATE account SET balance = balance + $1 WHERE acc_id = $2`.
4. Ledger entry is inserted into `"transaction"` with `type = 'DEPOSIT'` and `status = 'SUCCESS'`.
5. Transaction details are logged in `audit_log`.

### Withdrawal Operations
1. User submits withdrawal payload (`acc_id`, `amount`, `mode`).
2. Backend validates that `amount > 0` and verifies that the target account is `ACTIVE`.
3. Balance check verifies that current `balance >= amount`.
4. Account balance is atomically decremented: `UPDATE account SET balance = balance - $1 WHERE acc_id = $2`.
5. Ledger entry is inserted into `"transaction"` with `type = 'WITHDRAWAL'` and `status = 'SUCCESS'`.
6. Transaction details are logged in `audit_log`.

### Double-Entry Inter-Account Transfers
To eliminate deadlocks when two concurrent transactions transfer funds between the same pair of accounts in reverse directions, the backend inspects and locks accounts in a **deterministic numerical order** (`ORDER BY acc_id ASC`).

**Bilateral Ledger Execution:**
- **Leg 1 (Debit):** Inserted into `"transaction"` with `type = 'TRANSFER'`, `acc_id = fromAccId`, `related_acc_id = toAccId`.
- **Leg 2 (Credit):** Inserted into `"transaction"` with `type = 'TRANSFER'`, `acc_id = toAccId`, `related_acc_id = fromAccId`, `related_trans_id = Leg 1 ID`.
- Leg 1 is updated with `related_trans_id = Leg 2 ID`, establishing a symmetric bilateral foreign key link.

### Loan Repayment Installments
- Validates mathematical component balance: $\text{amount} = \text{principal\_amount} + \text{interest\_amount}$.
- Verifies that the loan exists and is in an `ACTIVE` state.
- Inserts installment record into `loan_payment` and records audit entry.

---

## Database Constraint Validation & User-Friendly Error Handling

Finora DA3 implements a comprehensive constraint validation and error translation layer that prevents cryptic database crashes and presents meaningful, actionable explanations to users.

### Canonical Value Normalization

Before query construction or constraint evaluation, the backend normalizes user inputs and historical aliases into canonical database values:
- **Loan Categories:** `AUTO` or `AUTO LOAN` $\to$ `CAR`; `APPLIED` $\to$ `PENDING`.
- **Payment Modes:** `UPI` $\to$ `ONLINE`.

### Database Constraint Mapping & Semantic Codes

When CockroachDB rejects an operation due to an integrity constraint, `backend/middleware/errorHandler.js` intercepts the PostgreSQL error code and formats a user-friendly response:

| Constraint Name | Error Code | Category | User-Friendly Explanation |
| :--- | :---: | :---: | :--- |
| `chk_loan_type` | `23514` | `INVALID_LOAN_CATEGORY` | "Invalid loan category. Select Home, Car, Personal, Education, or Business Loan." |
| `chk_loan_amount` | `23514` | `INVALID_LOAN_AMOUNT` | "Invalid loan amount. Enter an amount greater than zero." |
| `chk_loan_interest`| `23514` | `INVALID_LOAN_INTEREST`| "Invalid interest rate. Enter a non-negative interest rate within the permitted range." |
| `chk_loan_term` | `23514` | `INVALID_LOAN_TERM` | "Invalid loan tenure. Enter a repayment term duration greater than zero months." |
| `chk_acc_balance` | `23514` | `INVALID_ACCOUNT_BALANCE`| "This operation would result in a negative account balance. Enter a valid non-negative balance." |
| `chk_acc_type` | `23514` | `INVALID_ACCOUNT_TYPE` | "Invalid account type. Select Savings, Current, Salary, or Fixed Deposit." |
| `chk_card_type` | `23514` | `INVALID_CARD_TYPE` | "Invalid credit card network. Select Visa, Mastercard, RuPay, or American Express." |
| `chk_share_pct` | `23514` | `INVALID_SHARE_PERCENTAGE`| "Invalid ownership share percentage. Enter a value between 0% and 100%." |
| `chk_loan_payment_components` | `23514` | `INVALID_PAYMENT_COMPONENTS`| "Total payment amount must equal principal plus interest components." |
| `customer_pan_key`| `23505` | `DUPLICATE_PAN` | "A customer profile with this Permanent Account Number (PAN) already exists. Use a different PAN." |
| `branch_ifsc_key` | `23505` | `DUPLICATE_IFSC` | "A branch with this IFSC code already exists. Enter a unique IFSC code." |
| Foreign Key (`cid`)| `23503` | `INVALID_CUSTOMER_REFERENCE`| "Referenced customer does not exist. Select an active customer profile." |
| Foreign Key (`b_id`)| `23503` | `INVALID_BRANCH_REFERENCE`| "The selected home branch does not exist. Choose an active branch from the directory." |
| Not Null Column | `23502` | `MISSING_REQUIRED_FIELD` | "A required field is missing. Complete all mandatory fields and try again." |

### Centralized Error Handling & Credential Redaction

The centralized error middleware (`backend/middleware/errorHandler.js`) ensures that:
- Unexpected internal server errors return HTTP 500 with a safe generic message (`INTERNAL_SERVER_ERROR`).
- Database passwords and internal connection URIs (`postgres://<user>:<password>@<host>...`) are scrubbed from all client-facing error payloads.

---

## Lifecycle Management & Permanent Deletion Workflows

Finora DA3 implements a two-phase confirmation-based deletion workflow that balances academic demonstration needs with real-world referential integrity.

### Simplified Permanent Deletion Confirmation UI

The deletion modal presents a clear, direct, two-phase confirmation flow:
1. **Clear Warning:** Explains the permanent and irreversible nature of the deletion.
2. **Records to be Deleted:** Itemizes the target record and dependent records to cascade with exact counts.
3. **Relationships to be Removed:** Lists foreign key links that will be severed.
4. **Records to be Retained:** Confirms which associated profiles (customers, external accounts) will remain preserved.
5. **Irreversible Confirmation Checkbox:** A simple standard checkbox requiring explicit user confirmation before enabling the **"Delete Permanently"** button.

### Unrestricted Permanent Branch Deletion

Unlike earlier prototypes that blocked branch deletion when employees or accounts were present, the current implementation permits users to permanently delete a branch regardless of dependency counts:
- **Assigned Employees:** Unlinked or cleanly cascaded.
- **Domiciled Accounts:** Cascaded along with associated account-holder links and nominees.
- **Operational Duties:** `responsible_for` assignments linked to the branch are safely removed.
- **Preserved Records:** Customer profiles, loans, repayments, external accounts, and credit cards remain completely intact.
- **Atomic Execution:** The entire cascade executes within a single database transaction; any failure triggers an immediate rollback.

### Entity Deletion Rules & Cascade Behavior

| Entity | Cascade Behavior | Preserved Records | Blocking Conditions |
| :--- | :--- | :--- | :--- |
| **Branch** | Cascades assigned employees, domiciled accounts, transactions, and operational assignments | Customer profiles, loans, repayments, external credit cards | None (unrestricted permanent deletion) |
| **Customer** | Cascades `customer_phone`, `beneficiary`, associated `account_holder` links, and owned accounts/loans | Branch, assigned employee | None (with confirmed cascade) |
| **Account** | Cascades `account_holder` links, `nominee`, and associated ledger transactions | Customer profile, branch | Direct delete blocked if balance $> 0$ (must withdraw/transfer or confirm cascade) |
| **Employee** | Nullifies supervisory pointers in `customer`, `loan`, and `audit_log` | Branch, customer profiles, loans | Reassigned before deletion |
| **Loan** | Removes loan record and associated `loan_payment` installments | Customer profile, branch | Settlements mark loan as `PAID_OFF` |

### Immutable Financial History Protection (HTTP 403)

In strict adherence to financial auditing standards, historical ledgers cannot be deleted in isolation. Standalone deletion attempts for the following tables are rejected with **HTTP 403 Forbidden**:
- `"transaction"` (Completed monetary deposits, withdrawals, and transfers)
- `loan_payment` (Serviced loan installments)
- `audit_log` (System activity audit trail)

### Safe Status Lifecycle Transitions

Rather than deleting active entities, Finora DA3 provides safe lifecycle actions:
- **Accounts:** Transition to `CLOSED` **only if** balance is ₹0.00. Closed accounts reject further deposits or withdrawals.
- **Credit Cards:** Toggle between `ACTIVE`, `BLOCKED`, and `CANCELLED`.
- **Loans:** Marked `PAID_OFF` upon full satisfaction.
- **Employees & Branches:** Deactivated (`INACTIVE`, `SUSPENDED`) to remove operational access while preserving audit history.

---

## CockroachDB SQL Query Workbench

Finora DA3 includes an integrated SQL Query Workbench on the `/workbench` page, allowing users to inspect CockroachDB catalog objects, run analytical queries, and review cost-based query execution plans.

### Preloaded Banking Query Templates

The workbench includes **9 verified, preloaded banking SQL templates**:

| # | Template ID & Title | Category | Description & Analytical Focus |
| :-: | :--- | :---: | :--- |
| **1** | `customer_portfolios` | `Joins` | 4-table join across `customer`, `account_holder`, `account`, and `branch` displaying holdings and ownership roles. |
| **2** | `branch_liquidity` | `Aggregations` | Aggregates deposit holdings, customer counts, and average balances grouped by branch. |
| **3** | `cockroach_explain` | `EXPLAIN Plan` | Inspects CockroachDB distributed span scans, index usage, and cost estimates for a 3-table join. |
| **4** | `analytical_views` | `Views` | Queries the compiled `dashboard_summary` view with column aliasing (`total_deposits`, `total_active_loans`). |
| **5** | `customer_financial_summary` | `Views` | CTE computing customer accounts, loans, and credit cards without Cartesian join explosion. |
| **6** | `security_audit` | `Audit` | Queries append-only security logs (`audit_log`) displaying timestamps, actors, actions, and details. |
| **7** | `loan_portfolio_overview` | `Joins` | Cross-table join between `loan`, `customer`, and `loan_payment` aggregating sanctioned amounts and repayments. |
| **8** | `interbank_transfers` | `Audit` | Queries `"transaction"` joined with `employee` to track high-value transfers and processing tellers. |
| **9** | `blocked_statement_test` | `Security` | Submits a destructive statement (`DROP TABLE customer;`) to demonstrate immediate sandbox interception. |

### Arbitrary Valid Read-Only SQL Query Support

The workbench supports **arbitrary valid, permitted read-only SQL queries**, including:
- Complex multi-table joins and nested Common Table Expressions (CTEs).
- Window functions (e.g., `RANK() OVER (PARTITION BY acc_type ORDER BY balance DESC)`).
- Conditional `CASE WHEN ... THEN ... ELSE ... END` expressions.
- Aggregation functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP BY`, `HAVING`).
- Database engine introspection functions (e.g., `version()`, `current_database()`).
- Queries returning arbitrary column shapes or empty result sets (0 rows).

> [!IMPORTANT]
> The workbench supports valid read-only SQL compatible with CockroachDB. Data modification commands (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`) are strictly prohibited and intercepted.

### Interactive CockroachDB Schema Explorer

A collapsible Schema Explorer panel is integrated directly alongside the SQL editor:
- **Catalog Navigation:** Discovers all 19 catalog objects (14 base tables + 5 views) via `/api/metadata/tables`.
- **Search & Filter:** Real-time search filter for quick table lookup.
- **Badging:** Distinct badges for `TABLE` (slate) vs `VIEW` (violet), along with estimated row counts.
- **Deep Column Inspection:** Expands any table to reveal columns, SQL data types, Primary Key (`PK` gold badge), and Foreign Key (`FK` violet badge) markers.
- **One-Click Actions:**
  - `+Name`: Inserts the table or column name at the editor cursor.
  - `SELECT`: Automatically populates the editor with `SELECT * FROM table_name LIMIT 25;`.

### Dynamic Cell & JSON Object Rendering

- **Fallback Schema Detection:** Dynamic fallback from `result.fields` to `Object.keys(result.data[0])` for synthetic queries and function calls.
- **JSON Object Support:** Nested JSON objects (such as `audit_log.details`) render as interactive cyan chips. Clicking copies the formatted JSON, and hovering displays an indented JSON tooltip.
- **Booleans & Numbers:** Booleans render as `TRUE` (emerald) / `FALSE` (slate) badges; numbers render in amber monospace.
- **CSV Export:** Exports query results directly to CSV with proper quote escaping for strings and JSON objects.

### Multi-Layer Sandbox Security Architecture

The workbench enforces a hardened security pipeline:
1. **SQL Comment Stripping:** Removes single-line (`--`) and multi-line (`/* */`) comments before token inspection.
2. **Lexical Semicolon Detection:** Splits statements while respecting single quotes (`'...'`) and dollar quotes (`$$...$$`), rejecting multi-statement chaining.
3. **String Literal Masking:** Masks text inside string literals to empty quotes `''` before structural evaluation, permanently eliminating false-positive blocks on mutation words (e.g., `WHERE action = 'UPDATE_LOAN'`).
4. **Structural Token Blocklist:** Intercepts administrative and mutation keywords (`DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`, `SET CLUSTER`, `pg_shadow`, `pg_terminate_backend`).

### Database-Level Defense-in-Depth & Timeout Enforcement

- **Read-Only Transaction (`BEGIN TRANSACTION READ ONLY;`):** Even if an unknown command bypassed lexical checks, CockroachDB Cloud's query engine rejects any mutation attempt with error code `25006: cannot execute INSERT/UPDATE in a read-only transaction`.
- **Statement Timeout:** Automatically aborts runaway queries after 5000ms (`SET statement_timeout = '5000ms'`).
- **Row Cap:** Enforces a maximum result set of 500 rows, setting `isTruncated: true` when exceeded.
- **Credential Redaction:** Error messages scrub raw connection strings and passwords before returning responses.

---

## Educational CockroachDB Architectural Showcase

The Showcase page (`/showcase`) provides interactive educational visualizers to help students understand distributed consensus, range leasing, and serializable isolation.

### Educational Simulation Disclaimer

> [!WARNING]
> **Educational Simulation Disclaimer:** The Multi-Raft consensus and 64MB key-range partitioning visualizers on the Showcase page are **browser-based educational simulations**. They model distributed consensus principles, node failure consequences, and range splitting logic in the frontend interface. **They do not connect to live CockroachDB cluster telemetry, do not control live cluster nodes, do not trigger physical range splits, and do not represent live cloud replica placements.**

### Multi-Raft Consensus & Node Failover Simulator

- **3-Node Model:** Illustrates a 3-node cluster hosting range replicas with one active Raft leader and two followers.
- **Node Toggling:** Users can take simulated nodes offline or restart them to observe surviving replica counts.
- **Quorum Rules:** A quorum requires a majority ($\ge 2/3$ nodes). If 2 nodes go offline, quorum is lost (`QUORUM_LOST`), the leader is deposed, and write operations are blocked to prevent split-brain anomalies.
- **Navigation Persistence:** Simulator state is managed by `RaftSimulatorContext` and persisted across page navigation via `sessionStorage`. State resets only when clicking **"Reset Cluster"**.

### 64MB Key-Range Partitioning & Auto-Split Visualizer

- Illustrates CockroachDB's default 64MB range size threshold.
- Users can ingest simulated data batches (+20MB) to watch a range expand. Upon reaching 64MB, the simulator auto-splits the range at key boundary `[100500]`, creating two balanced 32MB child ranges.
- Demonstrates how node failover affects specific range replicas across the cluster.

### Serializable Isolation & Retry Demonstrator

- Demonstrates how concurrent transactions attempting to read and write the same account balances produce serialization conflicts.
- Explains CockroachDB's Multi-Version Concurrency Control (MVCC) and displays the exponential backoff algorithm used to handle SQLSTATE `40001` retries.

### Simulated Quorum Write Gate Middleware

To demonstrate distributed fault tolerance in a classroom setting, the simulator connects to an optional demonstration write gate:
- **Client-Side Interceptor:** Halts mutating operations (`POST`, `PUT`, `DELETE`) with a client-side warning when simulated quorum is lost.
- **Server-Side Middleware (`raftQuorumGate`):** Halts mutations with **HTTP 503 Service Unavailable** if simulated quorum headers indicate consensus loss.

---

## API Documentation

All API responses adhere to a standardized JSON schema:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional status message"
}
```

### 1. Health & Telemetry

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | CockroachDB connection status, engine version, and pool statistics | 200, 500 |

### 2. Dashboard & Analytical Views

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/dashboard/summary` | Consolidated KPI aggregates from `dashboard_summary` view | 200, 500 |
| `GET` | `/api/dashboard/customers` | Customer holdings from `customer_dashboard` view | 200, 500 |
| `GET` | `/api/dashboard/transactions` | Audited transaction history from `transaction_dashboard` view | 200, 500 |
| `GET` | `/api/dashboard/loans` | Loan portfolio details from `loan_dashboard` view | 200, 500 |
| `GET` | `/api/dashboard/creditcards` | Card accounts from `creditcard_dashboard` view | 200, 500 |

### 3. Banking Transaction Endpoints

| Method | Endpoint | Description | Request Body Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/banking/deposit` | Atomically deposits money into an active account | `acc_id`, `amount`, `mode`, `description` |
| `POST` | `/api/banking/withdraw` | Atomically withdraws money from an active account | `acc_id`, `amount`, `mode`, `description` |
| `POST` | `/api/banking/transfer` | Executes bilateral double-entry transfer between accounts | `from_acc`, `to_acc`, `amount`, `mode` |
| `POST` | `/api/banking/loan-payment` | Records a loan installment payment with component check | `l_id`, `amount`, `principal_amount`, `interest_amount` |

### 4. Universal Entity CRUD Endpoints

Canonical routes are available for `/api/customers`, `/api/accounts`, `/api/branches`, `/api/employees`, `/api/loans`, `/api/creditcards`, `/api/transactions`, `/api/beneficiaries`, `/api/nominees`, `/api/audit-logs`, `/api/responsible-for`:

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/entities/:entity` | List records with pagination, search, and sorting | `page`, `limit`, `search`, `sortBy`, `sortOrder`, `b_id` |
| `GET` | `/api/entities/:entity/:id` | Retrieve single record by primary key | None |
| `POST` | `/api/entities/:entity` | Create a new entity record | JSON entity payload |
| `PUT` | `/api/entities/:entity/:id` | Update an existing entity record | JSON update fields |
| `DELETE` | `/api/entities/:entity/:id` | Safe delete with referential safeguard checks | None |

### 5. Deletion Preview & Confirmation Endpoints

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/entities/:entity/:id/delete-preview` | Live 4-tier dependency preview and signature token | None |
| `POST` | `/api/entities/:entity/:id/delete-confirm` | Atomically executes confirmed deletion | `empId` (optional auditor ID) |
| `POST` | `/api/entities/:entity/:id/lifecycle-action` | Safely transitions entity lifecycle status | `action` (`CLOSE`, `BLOCK`, `ACTIVATE`) |

### 6. Database Catalog & Metadata Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/metadata/tables` | Retrieves all 19 catalog tables and views with row counts |
| `GET` | `/api/metadata/columns/:table` | Column data types, nullability, defaults, PK and FK markers |
| `GET` | `/api/metadata/indexes/:table` | Index definitions, indexed columns, and uniqueness |
| `GET` | `/api/metadata/constraints/:table`| Table constraints (Primary Key, Foreign Key, Unique, Check) |
| `GET` | `/api/metadata/relationships` | Catalog of 23 foreign key relationships |
| `GET` | `/api/metadata/schema` | Complete schema graph model powering the Chen ER diagram |

### 7. SQL Workbench Endpoints

| Method | Endpoint | Description | Request Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/workbench/policy` | Returns active read-only policy definitions and query rules | None |
| `POST` | `/api/workbench/validate` | Validates query against AST/regex safety rules | `query` (SQL string) |
| `POST` | `/api/workbench/execute` | Safely executes read-only query with timeout and limit | `query` (SQL string) |

### 8. Showcase & Raft Simulator Endpoints

| Method | Endpoint | Description | Request Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/showcase/raft-state` | Retrieves active simulator state and quorum health | None |
| `POST` | `/api/showcase/raft-state` | Updates online status of simulated nodes and leader | `node1Up`, `node2Up`, `node3Up`, `raftLeader` |
| `POST` | `/api/showcase/raft-reset` | Resets simulated cluster to 3 healthy active nodes | None |

---

## Frontend Architecture & UI Overview

The Finora DA3 frontend is a single-page application built with **React 19**, **Vite 8**, **TypeScript**, and **Tailwind CSS**.

### Neon Obsidian Design System

- **Surface Hierarchy:** Deep obsidian backdrops (`#0a0d14` background, `#121622` card containers, `#1a2030` elevated dialogs).
- **Functional Neon Color Accents:**
  - **Cyan (`#00f5ff`):** Navigation highlights, primary identifiers, foreign-key relationships.
  - **Emerald (`#00e676`):** Active status indicators, successful deposits, healthy quorum indicators.
  - **Violet (`#b388ff`):** Analytics indicators, loan portfolios, views in Schema Explorer.
  - **Amber (`#ffd700`):** Warnings, pending transactions, non-deletable constraint alerts, Primary Keys (`PK`).
  - **Rose (`#ff5252`):** Deletions, withdrawals, blocked cards, offline nodes.

### Application Pages

```text
frontend/src/pages/
├── DashboardPage.tsx          # Real-time KPIs, CockroachDB specs, recent transactions, SVG charts
├── CustomersPage.tsx          # Customer KYC directory, phone numbers, add/edit customer modal
├── AccountsPage.tsx           # Depository accounts, M:N joint holders, lifecycle status modal
├── TransactionsPage.tsx       # Financial ledger, instant search, deposit/withdraw/transfer modals
├── LoansPage.tsx              # Loan portfolio, loan sanctioning, installment repayment modal
├── CardsPage.tsx              # Masked credit card deck, issue card modal, card status management
├── BranchesPage.tsx           # Branch locations, IFSC routing codes, add/edit branch modal
├── EmployeesPage.tsx          # Staff records, salaries, hire dates, branch filtering
├── DatabaseExplorerPage.tsx   # Live CockroachDB metadata inspector (tables, columns, indexes, FKs)
├── SqlWorkbenchPage.tsx       # SQL Query Workbench with Schema Explorer, templates, and CSV export
├── SchemaVisualizerPage.tsx   # Chen-notation ER diagram canvas with clickable FK popovers
├── CockroachShowcasePage.tsx  # Architecture explainer & persistent 3-node Multi-Raft simulator
└── NotFoundPage.tsx           # 404 fallback page
```

---

## Project Structure

```text
DBMS-DA-3/
├── certs/
│   └── root.crt                   # CockroachDB Cloud root CA certificate
├── backend/
│   ├── config/
│   │   └── db.js                  # CockroachDB TLS pool & serializable retry wrapper
│   ├── docs/
│   │   └── SCHEMA_DESIGN.md       # Relational schema design documentation
│   ├── middleware/
│   │   └── errorHandler.js        # Centralized HTTP error handler & constraint mapper
│   ├── migrations/
│   │   ├── 001_initial_schema.sql # Complete DDL: 14 tables, indexes, and 5 analytical views
│   │   └── 002_lifecycle_status.sql# Lifecycle status additions and check constraints
│   ├── routes/
│   │   ├── bankingRoutes.js       # Atomic deposit, withdraw, transfer, and loan payment routes
│   │   ├── dashboardRoutes.js     # Analytical KPI and dashboard reporting routes
│   │   ├── deletionRoutes.js      # Two-phase deletion preview, confirmation, and lifecycle routes
│   │   ├── entityRoutes.js        # Universal CRUD routes with canonical plural/singular aliases
│   │   ├── metadataRoutes.js      # Live database catalog introspection routes
│   │   ├── showcaseRoutes.js      # Architectural showcase & Raft simulator routes
│   │   └── workbenchRoutes.js     # Read-only SQL Workbench execution sandbox
│   ├── services/
│   │   ├── auditService.js        # Append-only security audit log service
│   │   ├── bankingService.js      # Core transaction services with deadlock prevention
│   │   ├── deletionService.js     # Deletion preview, cascade calculation, and execution
│   │   └── entityService.js       # Universal entity querying, pagination, and sorting
│   ├── .env.example               # Backend environment variable template
│   ├── package.json               # Backend dependencies (pg, express, cors, dotenv)
│   ├── server.js                  # Express server entry point
│   ├── run-migration.js           # Database migration runner script
│   ├── seed-data.js               # Demonstration data seeding script
│   ├── test-sql-workbench.js      # SQL Workbench & templates verification suite (76 assertions)
│   ├── test-deletion-lifecycle.js # Deletion lifecycle & safeguards test suite (76 assertions)
│   ├── test-branch-deletion.js    # Dedicated branch permanent deletion suite (71 assertions)
│   ├── test-constraints-and-errors.js # Constraint validation & error handling suite (68 assertions)
│   ├── test-architectural-simulation.js # Raft consensus & range splitting suite (48 assertions)
│   └── test-api.js                # Core REST API & banking services test suite (32 tests)
└── frontend/
    ├── src/
    │   ├── api/client.ts          # Typed API client with simulated quorum write gate
    │   ├── components/            # Reusable UI components (Card, Button, Modal, Badge, Table)
    │   ├── context/               # RaftSimulatorContext for state persistence
    │   ├── pages/                 # 12 application view pages
    │   ├── types/                 # TypeScript interfaces for entities, metadata, and workbench
    │   ├── App.tsx                # Main routing and navigation layout shell
    │   └── main.tsx               # Application entry point
    ├── .env.example               # Frontend environment variable template
    ├── package.json               # Frontend dependencies (React 19, Vite 8, Tailwind)
    ├── tailwind.config.js         # Tailwind configuration & custom Neon Obsidian palette
    ├── tsconfig.json              # TypeScript compiler options
    └── vite.config.ts             # Vite configuration with API development proxy
```

---

## Local Setup Guide

Follow these instructions to run Finora DA3 locally on your workstation.

### Prerequisites

- **Node.js:** v18.x or later installed (tested on v22.17.1 — [Download Node.js](https://nodejs.org/))
- **Git:** Installed on your workstation
- **CockroachDB Cloud Account or Instance:** Access to a CockroachDB Cloud cluster (Serverless or Dedicated) with a valid connection string and CA root certificate (`root.crt`).

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/finora-banking-management.git
cd finora-banking-management/DBMS-DA-3
```

---

### Step 2: Database Configuration & Root CA Certificate

1. Place your CockroachDB Cloud root CA certificate in `certs/root.crt`.
2. Navigate to `backend/` and copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```
3. Configure `.env` with your CockroachDB Cloud connection details:
   ```ini
   DATABASE_URL=postgresql://<user>:<password>@<cluster-host>:26257/finora_da3?sslmode=verify-full
   DB_SSL_ROOT_CERT=certs/root.crt
   PORT=5000
   ```

> [!IMPORTANT]
> Never commit your `.env` file or private certificates to version control. They are excluded by `.gitignore`.

---

### Step 3: Backend Setup & Schema Migrations

1. Install backend dependencies:
   ```bash
   npm install
   ```
2. Execute the database migration runner to create the 14 core tables, indexes, and 5 analytical views:
   ```bash
   node run-migration.js
   ```

---

### Step 4: Seed Demonstration Data

Populate the database with sample branches, employees, customers, accounts, loans, credit cards, and initial transactions:

```bash
node seed-data.js
```

---

### Step 5: Frontend Setup & Development Server

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd ../frontend
   ```
2. Copy the frontend environment template (optional in local development):
   ```bash
   cp .env.example .env
   ```
3. Install frontend dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```
   *Vite automatically proxies API requests (`/api/*`) to the backend running at `http://localhost:5000`.*

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Description | Required | Example / Default |
| :--- | :--- | :---: | :--- |
| `DATABASE_URL` | CockroachDB PostgreSQL connection string | Yes | `postgresql://<user>:<password>@<host>:26257/finora_da3?sslmode=verify-full` |
| `DB_SSL_ROOT_CERT` | Relative or absolute path to root CA certificate | Yes | `certs/root.crt` |
| `PORT` | Local or production port for the Express application | No | `5000` |

### Frontend Configuration (`frontend/.env`)

| Variable | Description | Required | Example / Default |
| :--- | :--- | :---: | :--- |
| `VITE_API_URL` | Base URL of the backend REST API | No | `http://localhost:5000` (defaults to relative `/api` in production) |

---

## Deployment Architecture

Finora DA3 is deployed in a cloud-native configuration on **Render**:

```text
               +─────────────────────────────────────────+
               |            User Web Browser             |
               +─────────────────────────────────────────+
                                    │
                                    │ HTTPS
                                    ▼
               +─────────────────────────────────────────+
               |        Render Static Site               |
               |  (finora-db-frontend.onrender.com)      |
               |  - Pre-compiled React 19 + Vite bundle  |
               |  - Client-side SPA routing (index.html) |
               +─────────────────────────────────────────+
                                    │
                                    │ HTTPS / RESTful API
                                    ▼
               +─────────────────────────────────────────+
               |        Render Web Service               |
               |      (finora-db.onrender.com)           |
               |  - Node.js 22 + Express 5 REST API      |
               |  - Connection pooling (pg client)       |
               +─────────────────────────────────────────+
                                    │
                                    │ TLS 1.3 (Port 26257)
                                    ▼
               +─────────────────────────────────────────+
               |      CockroachDB Cloud Serverless       |
               |         (AWS Mumbai ap-south-1)         |
               |  - Distributed multi-replica storage    |
               |  - Native Serializable isolation (SSI)  |
               +─────────────────────────────────────────+
```

### Render Deployment Configuration

1. **Backend Web Service (`finora-db.onrender.com`):**
   - **Environment:** Node.js
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:** Set `DATABASE_URL`, `DB_SSL_ROOT_CERT`, and `PORT`.
2. **Frontend Static Site (`finora-db-frontend.onrender.com`):**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Rewrite Rules:** Set all routes (`/*`) to rewrite to `/index.html` for client-side React Router navigation.

---

## Testing & Verification Suite

Finora DA3 includes an automated test and verification suite covering database connectivity, core banking operations, constraint validation, deletion lifecycles, SQL Workbench execution, and distributed consensus simulations.

### Summary of Verified Test Results

All test suites execute against live CockroachDB Cloud Serverless (`finora_da3`) with **100% passing rates**:

| Test Suite File | Scope & Capabilities Verified | Assertions / Tests | Status |
| :--- | :--- | :---: | :---: |
| `backend/test-sql-workbench.js` | 9 banking templates, arbitrary read-only queries, comment stripping, string literal masking, AST blocklist, read-only transaction enforcement, and schema explorer | **76 Passed** | **PASS** |
| `backend/test-deletion-lifecycle.js` | Deletion preview, cascade calculation, stale preview tokens, unlinking, financial history safeguards, and duplicate submissions | **76 Passed** | **PASS** |
| `backend/test-branch-deletion.js` | Unrestricted permanent branch deletion with employee cascading, account removal, operational duty cleanup, and customer profile preservation | **71 Passed** | **PASS** |
| `backend/test-constraints-and-errors.js` | Canonical normalization (`AUTO LOAN` $\to$ `CAR`), CHECK, UNIQUE, FK, NOT NULL constraint mapping, friendly error formatting, and credential redaction | **68 Passed** | **PASS** |
| `backend/test-architectural-simulation.js` | Multi-Raft consensus, failover, 64MB key-range partitioning & auto-split, quorum loss, and write gate middleware | **48 Passed** | **PASS** |
| `backend/test-api.js` | End-to-end REST API suite: health, analytical views, metadata, pagination, CRUD, banking operations, transfers, loan repayments, and audit logging | **32 Passed** | **PASS** |
| `frontend` (`npm run build`) | TypeScript static type checking (`tsc`) and production Vite packaging | **0 Errors** | **PASS** (25s) |

---

### Test Suite 1: SQL Query Workbench & Templates

Verifies that all 9 preloaded banking templates, arbitrary valid read-only queries, string literal masking, AST blocklists, and schema introspection endpoints function properly against live CockroachDB Cloud:

```bash
cd backend
node test-sql-workbench.js
```

**Verified Output:**
```text
================================================================
 FINORA DA3 — SQL QUERY WORKBENCH VERIFICATION SUITE
 Target: CockroachDB Cloud (finora_da3)
================================================================
Test Group 1: Workbench Security Policy Endpoint
  [PASS] GET /api/workbench/policy returns HTTP 200
  [PASS] Policy response success = true
  [PASS] Policy mode is STRICT_READ_ONLY
  [PASS] Policy statementTimeoutMs = 5000
  [PASS] Policy maxRowLimit = 500
  [PASS] multipleStatementsAllowed = false

Test Group 2: Preloaded Banking Templates Execution
  [PASS] Template [customer_portfolios] - HTTP 200 (14 rows, 309ms)
  [PASS] Template [branch_liquidity] - HTTP 200 (9 rows, 301ms)
  [PASS] Template [cockroach_explain] - HTTP 200 (40 rows, 397ms)
  [PASS] Template [analytical_views] - HTTP 200 (1 row, 302ms)
  [PASS] Template [customer_financial_summary] - HTTP 200 (10 rows, 401ms)
  [PASS] Template [security_audit] - HTTP 200 (20 rows, 409ms)
  [PASS] Template [loan_portfolio_overview] - HTTP 200 (13 rows, 403ms)
  [PASS] Template [interbank_transfers] - HTTP 200 (20 rows, 366ms)
  [PASS] Template [blocked_statement_test] - correctly blocked with HTTP 403

Test Group 3: Arbitrary Complex Read-Only Queries
  [PASS] Arbitrary query "Window Function with RANK()" executed successfully
  [PASS] Arbitrary query "CASE Expression & Conditional Aggregation" executed successfully
  [PASS] Arbitrary query "Complex Multi-Table CTE Aggregation" executed successfully
  [PASS] Arbitrary query "Immunity to Mutation Words in String Literals" executed successfully
  [PASS] Arbitrary query "Empty Result Set (0 Rows Returned)" executed successfully
  [PASS] Arbitrary query "CockroachDB Engine Version Function" executed successfully

Test Group 4: Prohibited DDL/DML & Administration Rejection
  [PASS] Prohibited command "DROP TABLE" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "TRUNCATE TABLE" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "ALTER TABLE" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "CREATE TABLE" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "INSERT INTO" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "UPDATE" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "DELETE FROM" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "GRANT PRIVILEGE" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "SET CLUSTER" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "pg_shadow Access" strictly intercepted (HTTP 403)
  [PASS] Prohibited command "Multi-statement Semicolon Chaining" strictly intercepted (HTTP 403)

Test Group 5: Schema Discovery Metadata Endpoints
  [PASS] GET /api/metadata/tables returns HTTP 200 (19 catalog tables/views)
  [PASS] GET /api/metadata/columns/account returns HTTP 200 (6 columns)
================================================================
 SUMMARY: 76 PASSED | 0 FAILED
================================================================
```

---

### Test Suite 2: Deletion Lifecycle & Cascades

Verifies the 2-phase deletion preview, cascade calculation, immutable financial ledger barriers, safe lifecycle actions, and atomic rollback guarantees:

```bash
cd backend
node test-deletion-lifecycle.js
```

**Verified Output:**
```text
================================================================
🧪 FINORA DA3 - PHASE 7 VERIFICATION & REGRESSION SUITE
☁️  Target: CockroachDB Cloud (finora_da3)
================================================================
  [PASS] Deletion preview for valid & nonexistent records
  [PASS] Deletion cancellation leaves database unchanged
  [PASS] Permanent deletion of unlinked record
  [PASS] Impact analysis on multiple dependent records
  [PASS] Preservation of shared customer and account records
  [PASS] Account closure with zero balance
  [PASS] Rejection of account closure with positive balance
  [PASS] Prevention of transactions on closed accounts
  [PASS] Protection of transaction history (HTTP 403)
  [PASS] Loan settlement and payment history preservation
  [PASS] Foreign key protection and atomic rollback on error
  [PASS] Audit log recording for PERMANENT_DELETE operations
================================================================
🏁 FINORA DA3 TEST SUMMARY: 76 PASSED, 0 FAILED
================================================================
```

---

### Test Suite 3: Dedicated Branch Permanent Deletion

Verifies that branches can be permanently deleted regardless of employee, account, or operational assignment counts, while customer profiles, loans, repayments, and external credit cards are preserved:

```bash
cd backend
node test-branch-deletion.js
```

**Verified Output:**
```text
================================================================
🏛️  FINORA DA3: DEDICATED BRANCH PERMANENT DELETION TEST SUITE
☁️  Database: CockroachDB Cloud (finora_da3)
================================================================
  [PASS] Empty branch deletion unblocked & verified
  [PASS] Staffed branch deletion cascades 2 employees
  [PASS] Domiciled account branch deletion cascades accounts & holders
  [PASS] Operational duties branch deletion cleans up duty assignments
  [PASS] Branch with historical ledger transactions cascades cleanly
  [PASS] Customers, loans, repayments, and credit cards retained
  [PASS] Joint branch deletion safely nullifies beneficiary internal pointers
  [PASS] Atomic rollback restores state on midway error
  [PASS] Dynamic cascade catches concurrent dependency additions
  [PASS] Deleted counts match preview counts exactly
  [PASS] Audit log records PERMANENT_DELETE_BRANCH event
================================================================
🏁 BRANCH PERMANENT DELETION SUITE: 71 PASSED, 0 FAILED
================================================================
```

---

### Test Suite 4: Database Constraints & Friendly Errors

Verifies input canonicalization, CHECK constraint mapping, UNIQUE/FK error translations, NOT NULL detection, and password scrubbing:

```bash
cd backend
node test-constraints-and-errors.js
```

**Verified Output:**
```text
================================================================
🧪 FINORA DA3: DATABASE CONSTRAINT & ERROR HANDLING TEST SUITE
☁️  Database: CockroachDB Cloud (finora_da3)
================================================================
--- SECTION 1: CANONICAL VALUE NORMALIZATION ---
  [PASS] Input 'AUTO' and 'AUTO LOAN' mapped to canonical 'CAR'
  [PASS] Input 'APPLIED' mapped to canonical 'PENDING'
  [PASS] Payment mode 'UPI' mapped to canonical 'ONLINE'

--- SECTION 2: CHECK CONSTRAINT VALIDATION & FRIENDLY MESSAGES ---
  [PASS] chk_loan_type -> INVALID_LOAN_CATEGORY
  [PASS] chk_loan_amount -> INVALID_LOAN_AMOUNT
  [PASS] chk_loan_interest -> INVALID_LOAN_INTEREST
  [PASS] chk_loan_term -> INVALID_LOAN_TERM
  [PASS] chk_acc_balance -> INVALID_ACCOUNT_BALANCE
  [PASS] chk_acc_type -> INVALID_ACCOUNT_TYPE
  [PASS] chk_card_type -> INVALID_CARD_TYPE
  [PASS] chk_share_pct -> INVALID_SHARE_PERCENTAGE
  [PASS] chk_loan_payment_components -> INVALID_PAYMENT_COMPONENTS

--- SECTION 3: UNIQUE & FOREIGN KEY CONSTRAINTS ---
  [PASS] Duplicate PAN returns 409 DUPLICATE_PAN
  [PASS] Duplicate IFSC returns 409 DUPLICATE_IFSC
  [PASS] Invalid customer returns 400 INVALID_CUSTOMER_REFERENCE
  [PASS] Invalid branch returns 400 INVALID_BRANCH_REFERENCE
  [PASS] Missing required field returns 400 MISSING_REQUIRED_FIELD

--- SECTION 4: SECURITY & CREDENTIAL SCRUBBING ---
  [PASS] Database password and cluster URI scrubbed from error output
================================================================
🏁 CONSTRAINT & ERROR HANDLING SUITE: 68 PASSED, 0 FAILED
================================================================
```

---

### Test Suite 5: Multi-Raft & Range Split Simulator

Verifies the educational consensus model, surviving quorum rules, 64MB auto-splitting logic, node recovery, and simulated write gate middleware:

```bash
cd backend
node test-architectural-simulation.js
```

**Verified Output:**
```text
================================================================
🧪 FINORA DA3: COCKROACHDB ARCHITECTURAL SIMULATION TEST SUITE
🏛️  Multi-Raft Consensus, Range Partitioning & Quorum Gate
================================================================
  [PASS] Scenario 1: Initial state (3 nodes online, 1 range covering [-∞, +∞))
  [PASS] Scenario 2: Batch ingestion & auto-split at 64MB boundary into 2 child ranges
  [PASS] Scenario 3: Failover demonstration (killing Node 2 elects surviving Node 3)
  [PASS] Scenario 4: Quorum loss (killing Node 3 leaves 1/3 nodes; writes blocked)
  [PASS] Scenario 5: Node restart & replication log catch-up
  [PASS] Scenario 6: Simulation reset actions restore 3 nodes and 24MB baseline
  [PASS] Scenario 7: Backend write gate middleware blocks mutations on lost quorum
================================================================
🏁 ARCHITECTURAL SIMULATION SUITE: ALL SCENARIOS PASSED (0 FAILURES)
================================================================
```

---

### Test Suite 6: Core REST API & Banking Services

Verifies health telemetry, analytical views, metadata endpoints, pagination, CRUD operations, atomic transfers, loan repayments, and audit logging:

```bash
cd backend
npm test
```

**Verified Output:**
```text
================================================================
FINORA DA3: REST API TEST SUITE
Target: CockroachDB Cloud (finora_da3)
================================================================
✓ PASS: GET /api/health returns UP with CockroachDB metadata
✓ PASS: GET /api/dashboard/summary returns valid KPI aggregates
✓ PASS: GET /api/metadata/tables returns all core tables with row counts
✓ PASS: GET /api/metadata/columns/account returns column definitions
✓ PASS: POST /api/branches rejects duplicate IFSC with 409 Conflict
✓ PASS: POST /api/banking/deposit atomically increments balance
✓ PASS: POST /api/banking/withdraw atomically decrements balance
✓ PASS: POST /api/banking/transfer executes atomic transfer with linked transactions
✓ PASS: POST /api/banking/loan-payment records valid installment payment
✓ PASS: POST /api/workbench/execute blocks destructive DROP TABLE with 403
✓ PASS: GET /api/audit-logs verifies that banking events were logged without secrets
================================================================
TEST SUMMARY: 32 PASSED, 0 FAILED
================================================================
```

---

### Frontend Production Build & Type Checking

To verify TypeScript type safety and compile production assets:

```bash
cd frontend
npm run build
```

**Verified Output:**
```text
> frontend@0.0.0 build
> tsc && vite build

vite v8.3.4 building client environment for production...
✓ 1956 modules transformed.
dist/index.html                   1.34 kB │ gzip:   0.71 kB
dist/assets/index-Cds1ABb5.css   39.96 kB │ gzip:   7.35 kB
dist/assets/index-Ch3AK_VK.js   638.06 kB │ gzip: 157.00 kB
✓ built in 25.07s (0 errors)
```

---

## Security Considerations

This application was engineered for **academic demonstration and DBMS coursework**. The following security safeguards are implemented:

- **Strict SQL Parameterization:** All SQL queries utilize parameterized bind variables (`$1`, `$2`, etc.) via node-postgres, preventing SQL injection vulnerabilities.
- **Read-Only SQL Workbench Sandbox:** The workbench enforces comment stripping, string literal masking, a single-statement policy, and wraps queries in `BEGIN TRANSACTION READ ONLY;`, preventing mutations at both the proxy and database engine levels.
- **TLS Wire Encryption:** All server-to-CockroachDB communications are encrypted using TLS 1.3 with root CA certificate validation (`rejectUnauthorized: true`).
- **Credential Redaction:** Database credentials and connection URIs reside exclusively in git-ignored `.env` files. Secrets, passwords, and card CVVs are excluded from API telemetry, audit logs, and error messages.
- **Immutable Financial Ledgers:** Financial transactions, loan payments, and audit logs are protected by backend route guards that reject standalone deletion attempts with HTTP 403 Forbidden.

> [!NOTE]
> In an enterprise commercial banking deployment, additional production controls—such as JWT/OAuth2 session authentication, Role-Based Access Control (RBAC), multi-factor authentication (MFA), and Hardware Security Module (HSM) key management—should be integrated.

---

## Academic Purpose

Finora DA3 was developed as an academic Database Management Systems (DBMS) project to explore:
1. **Cloud-Native Distributed SQL:** Multi-Raft replication, range partitioning, and Pebble LSM storage engine mechanics.
2. **ACID Semantics at Scale:** Native strict Serializable Isolation (SSI) and automated handling of serialization conflicts (`SQLSTATE 40001`).
3. **Advanced Schema Normalization:** Decoupling legacy ternary relationships into flexible Many-to-Many ownership structures, dedicated beneficiary routing, and append-only audit logging.
4. **Developer Tooling & Interactive Exploration:** Building safe, schema-aware query sandboxes with real-time catalog discovery.
5. **Full-Stack Distributed Systems Engineering:** End-to-end integration across modern component-based UI frameworks, REST API middleware, and distributed cloud databases.
