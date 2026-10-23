# Finora DA3 — Distributed Cloud Banking & Relational Management System

A distributed relational database banking and loan management system developed as an advanced academic Database Management Systems (DBMS) project. Finora DA3 modernizes traditional relational banking architectures into a cloud-native, distributed SQL platform powered by **CockroachDB Cloud Serverless (v26+)**, featuring strict **Serializable ACID transactions (SSI)**, **Multi-Raft consensus**, a high-performance **Pebble LSM-tree storage engine**, a modular **Node.js/Express REST API**, and a modern **React + Vite + TypeScript** single-page application with a custom **Neon Obsidian** design system.

---

### 🌐 Live Deployments

- **Web Application (Frontend):** [https://finora-db-frontend.onrender.com/](https://finora-db-frontend.onrender.com/)
- **REST API Service (Backend):** [https://finora-db.onrender.com/](https://finora-db.onrender.com/)
- **Database Engine:** CockroachDB Cloud Serverless (AWS Mumbai `ap-south-1`, Cluster: `finora-da3`, Database: `finora_da3`)

---

## Table of Contents

- [Project Overview](#project-overview)
  - [Evolution from DA2 to DA3](#evolution-from-da2-to-da3)
  - [Core Capabilities](#core-capabilities)
- [System Architecture](#system-architecture)
  - [Architecture Breakdown](#architecture-breakdown)
  - [Request & Data Flow](#request--data-flow)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Database Design](#database-design)
  - [Entity Relationship Summary](#entity-relationship-summary)
  - [Relational Schema & Tables](#relational-schema--tables)
  - [Key Relational Innovations](#key-relational-innovations)
  - [Primary Key Strategy](#primary-key-strategy)
  - [Analytical & Dashboard Views](#analytical--dashboard-views)
- [CockroachDB Distributed Architecture Deep Dive](#cockroachdb-distributed-architecture-deep-dive)
  - [Multi-Raft Consensus](#multi-raft-consensus)
  - [Pebble LSM-Tree Storage Engine](#pebble-lsm-tree-storage-engine)
  - [Strict Serializable Isolation (SSI)](#strict-serializable-isolation-ssi)
  - [Handling Serialization Conflicts (SQLSTATE 40001)](#handling-serialization-conflicts-sqlstate-40001)
  - [Secure TLS & Driver Integration](#secure-tls--driver-integration)
- [Banking Transactions & Ledger Mechanics](#banking-transactions--ledger-mechanics)
  - [Deposit Operations](#deposit-operations)
  - [Withdrawal Operations](#withdrawal-operations)
  - [Double-Entry Inter-Account Transfers](#double-entry-inter-account-transfers)
  - [Loan Repayment Installments](#loan-repayment-installments)
- [Lifecycle Management & Confirmation-Based Deletion](#lifecycle-management--confirmation-based-deletion)
  - [Four-Tier Impact Analysis](#four-tier-impact-analysis)
  - [Two-Phase Preview and Confirmation Workflow](#two-phase-preview-and-confirmation-workflow)
  - [Immutable Financial History Protection](#immutable-financial-history-protection)
  - [Safe Status Lifecycle Transitions](#safe-status-lifecycle-transitions)
- [Educational Multi-Raft Simulator & Write Gate](#educational-multi-raft-simulator--write-gate)
- [API Documentation](#api-documentation)
  - [1. Health & Telemetry](#1-health--telemetry)
  - [2. Dashboard & Analytical Views](#2-dashboard--analytical-views)
  - [3. Banking Transaction Endpoints](#3-banking-transaction-endpoints)
  - [4. Universal Entity CRUD Endpoints](#4-universal-entity-crud-endpoints)
  - [5. Deletion Preview & Lifecycle Endpoints](#5-deletion-preview--lifecycle-endpoints)
  - [6. Database Catalog & Metadata Endpoints](#6-database-catalog--metadata-endpoints)
  - [7. SQL Workbench Endpoints](#7-sql-workbench-endpoints)
  - [8. Showcase & Raft Simulator Endpoints](#8-showcase--raft-simulator-endpoints)
- [Frontend Architecture & UI Overview](#frontend-architecture--ui-overview)
  - [Neon Obsidian Design System](#neon-obsidian-design-system)
  - [Application Pages](#application-pages)
- [Project Structure](#project-structure)
- [Local Setup Guide](#local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Database Configuration & TLS Certificate](#step-2-database-configuration--tls-certificate)
  - [Step 3: Backend Setup & Schema Migrations](#step-3-backend-setup--schema-migrations)
  - [Step 4: Seed Initial Demonstration Data](#step-4-seed-initial-demonstration-data)
  - [Step 5: Frontend Setup & Development Server](#step-5-frontend-setup--development-server)
- [Environment Variables](#environment-variables)
- [Deployment Architecture](#deployment-architecture)
- [Testing & Verification Suite](#testing--verification-suite)
  - [Test Suite 1: REST API & Banking Services](#test-suite-1-rest-api--banking-services)
  - [Test Suite 2: Deletion Lifecycle & Regression Suite](#test-suite-2-deletion-lifecycle--regression-suite)
  - [Test Suite 3: Database Integrity & Orphan Detection](#test-suite-3-database-integrity--orphan-detection)
  - [Test Suite 4: Frontend Type Checking & Production Build](#test-suite-4-frontend-type-checking--production-build)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [Academic Purpose](#academic-purpose)
- [License](#license)

---

## Project Overview

**Finora DA3** is a distributed banking management platform engineered to demonstrate advanced principles of modern database engineering, distributed consensus, ACID transaction semantics, referential integrity, and full-stack software integration.

While traditional academic database projects often rely on monolithic local DBMS instances (such as Oracle XE or local MySQL) and terminal-based query scripts, Finora DA3 bridges the gap to cloud-native database architectures. It couples **CockroachDB Cloud**—a geo-distributed SQL database built on Google Spanner principles—with an enterprise-ready Express REST API and a responsive React 19 single-page application.

### Evolution from DA2 to DA3

| Dimension | Previous Milestone (DA2) | Current Architecture (DA3) |
| :--- | :--- | :--- |
| **Database Engine** | Oracle Database 21c XE / Free (Monolithic) | CockroachDB Cloud Serverless v26+ (Distributed SQL) |
| **Storage Engine** | Traditional Oracle B-Tree Tablespaces | Pebble Log-Structured Merge (LSM) Tree |
| **Consensus & Clustering** | Single instance container in AWS EC2 | Multi-Raft distributed consensus across partitioned range replicas |
| **Transaction Isolation** | Read Committed (Oracle default) | Strict Serializable Isolation (SSI) natively enforced |
| **Concurrency Model** | Pessimistic locking / Undo segments | Multi-Version Concurrency Control (MVCC) with SQLSTATE `40001` retries |
| **Schema Normalization** | 11 tables with rigid ternary `OWNS` | 14 tables, M:N `account_holder`, dedicated `beneficiary`, normalized audit log |
| **Frontend Platform** | Vanilla HTML5, CSS3, and ES6 JavaScript | React 19, Vite 8, TypeScript, Tailwind CSS, Lucide React |
| **Deletion & Lifecycle** | Destructive cascading with balance reversal | Strict 403 on financial ledgers, 4-tier preview, and safe state transitions |
| **Developer Tooling** | Static query examples | Interactive SQL Workbench, Live DB Catalog, and Chen-notation ER Diagram |
| **Educational Features** | CLI PL/SQL functions | Interactive 3-node Multi-Raft consensus simulator with write gating |

### Core Capabilities

- **Distributed Account & Customer Management:** Maintain comprehensive customer profiles, multiple phone numbers, and many-to-many account ownership configurations supporting primary and joint holders with percentage shares.
- **Bilateral Double-Entry Ledger:** Execute deposits, withdrawals, and inter-account transfers as linked double-entry transaction records with audit tracking and deadlock prevention.
- **Automated Serialization Retry Handling:** Gracefully handle distributed transaction conflicts (SQLSTATE `40001`) with exponential backoff and jitter algorithms.
- **Loan Portfolio & Payment Arithmetic:** Sanction loans with strict positive checks and record repayment installments enforcing mathematical component balance (`amount = principal + interest`).
- **Confirmation-Based Lifecycle & Deletion Engine:** Inspect cascading impacts before permanent deletion while safeguarding historical financial ledgers (`transaction`, `loan_payment`, `audit_log`) behind strict HTTP 403 Forbidden barriers.
- **Database Catalog & Schema Visualizer:** Live introspection of CockroachDB metadata catalogs (`information_schema`), rendering an interactive Chen-notation ER diagram with clickable foreign key popovers.
- **Sandboxed SQL Query Workbench:** Safely execute read-only SQL queries with AST/regex pattern validation, statement timeouts, and row limits.
- **Educational Multi-Raft Simulator:** Simulate distributed node failures and observe live write gating that enforces quorum rules across both frontend and backend layers.

---

## System Architecture

Finora DA3 implements a decoupled three-tier architecture connecting a modern single-page frontend application, a hardened Express.js REST API service, and a CockroachDB Cloud distributed database.

```text
+-------------------------------------------------------------------------+
|                           Client Web Browser                            |
|             React 19 + TypeScript + Vite + Tailwind CSS (SPA)          |
|      - Neon Obsidian Design System & Responsive Navigation              |
|      - Interactive Chen-Notation ER Diagram Canvas (SVG)                |
|      - Live Database Catalog Explorer & Sandboxed SQL Workbench         |
|      - Educational Multi-Raft Simulator with Client Write Interceptor   |
+-------------------------------------------------------------------------+
                                     │
                                     │ HTTPS / JSON REST API
                                     ▼
+-------------------------------------------------------------------------+
|                        Render Cloud Web Service                         |
|   ┌─────────────────────────────────────────────────────────────────┐   |
|   │                    Node.js + Express.js API                     │   |
|   │  - Multi-Raft Quorum Write Gate Middleware (/api/*)             │   |
|   │  - Modular Service Layer (Banking, Deletion, Entity, Metadata)  │   |
|   │  - Atomic Transaction Runner with SQLSTATE 40001 Retry Loop     │   |
|   │  - Strict Read-Only SQL Workbench Policy Validator              │   |
|   │  - Centralized Error Translation & Telemetry Logging            │   |
|   └────────────────────────────────┬────────────────────────────────┘   |
|                                    │ PostgreSQL Wire Protocol (pg v8)   |
+--------------------------------────┼────────────────────────────────────+
                                     │
                                     │ Encrypted TLS Connection (Port 26257)
                                     ▼
+-------------------------------------------------------------------------+
|                   CockroachDB Cloud Serverless Engine                   |
|                        (AWS Mumbai - ap-south-1)                        |
|   ┌─────────────────────────────────────────────────────────────────┐   |
|   │                    Distributed SQL Execution                    │   |
|   │  - 14 Relational Tables (3NF Normalization)                     │   |
|   │  - 23 Foreign Key Constraints with RESTRICT / CASCADE Policies  │   |
|   │  - 5 Real-Time Analytical & Reporting Views                     │   |
|   │  - Strict Serializable Isolation (SSI) & MVCC                   │   |
|   │  - Multi-Raft Consensus Replication across Range Partitions     │   |
|   │  - Pebble Log-Structured Merge (LSM) Tree Storage Engine        │   |
|   └─────────────────────────────────────────────────────────────────┘   |
+-------------------------------------------------------------------------+
```

### Architecture Breakdown

1. **Frontend Tier (Client):**
   - Developed with **React 19**, **Vite 8**, and **TypeScript**, styled via **Tailwind CSS**.
   - Built around the custom **Neon Obsidian** palette (`#0a0d14` background, obsidian card surfaces, glowing cyan, emerald, violet, and amber accents).
   - Features client-side state management for the Multi-Raft simulator via React Context (`RaftSimulatorContext`) synchronized to `sessionStorage`.
   - Intercepts mutating actions when the simulated quorum is lost, preventing unsanctioned write requests before network dispatch.

2. **Backend Tier (Application Service):**
   - An asynchronous **Node.js** and **Express.js (v5)** server providing clean RESTful endpoints.
   - Enforces a dual-tier quorum gate middleware (`raftQuorumGate`) intercepting state-modifying HTTP verbs (`POST`, `PUT`, `DELETE`, `PATCH`).
   - Implements service-oriented separation of concerns:
     - `bankingService.js`: Atomic monetary operations and balance adjustments.
     - `deletionService.js`: Live 4-tier dependency analysis, confirmation signatures, and status transitions.
     - `entityService.js`: Universal parameterized CRUD operations and pagination.
     - `metadataService.js`: Live introspection of CockroachDB tables, columns, indexes, and constraints.
     - `workbenchRoutes.js`: AST and regex query validation enforcing read-only sandbox constraints.
     - `auditService.js`: System and administrative event logging without credential leakage.

3. **Database Tier (Distributed Cloud Storage):**
   - Managed **CockroachDB Cloud Serverless** cluster deployed in **AWS Mumbai (`ap-south-1`)**.
   - Communicates over standard PostgreSQL wire protocol using the Node.js `pg` driver secured via TLS with custom CA certificate verification.
   - Relies on CockroachDB's native **Serializable Multi-Version Concurrency Control (MVCC)** and **Multi-Raft range replication**.

### Request & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant FE as React Frontend (Vite/TS)
    participant Gate as Raft Quorum Gate Middleware
    participant API as Express Banking Service
    participant Pool as pg Connection Pool
    participant CRDB as CockroachDB Cloud (finora_da3)

    User->>FE: Initiate Fund Transfer (Account A -> Account B)
    FE->>FE: Check Local Quorum (Active Nodes >= 2)
    FE->>Gate: POST /api/banking/transfer {from_acc, to_acc, amount}
    Gate->>Gate: Verify Simulated Consensus Quorum
    alt Quorum Lost (< 2 nodes)
        Gate-->>FE: 503 Service Unavailable (Consensus Paused)
        FE-->>User: Display Quorum Alert & Guide to Showcase
    else Quorum Healthy (>= 2 nodes)
        Gate->>API: Route Request to bankingService.processTransfer()
        API->>Pool: acquireClient()
        Pool->>CRDB: BEGIN TRANSACTION (ISOLATION LEVEL SERIALIZABLE)
        API->>CRDB: SELECT balance FROM account WHERE acc_id IN (A, B) ORDER BY acc_id ASC
        CRDB-->>API: Return Account States & Balances
        API->>API: Verify Active Status & Sufficient Funds
        API->>CRDB: UPDATE account SET balance = balance - amount WHERE acc_id = A
        API->>CRDB: UPDATE account SET balance = balance + amount WHERE acc_id = B
        API->>CRDB: INSERT INTO transaction (Debit Leg) RETURNING t_id
        API->>CRDB: INSERT INTO transaction (Credit Leg, related_trans_id) RETURNING t_id
        API->>CRDB: UPDATE transaction (Debit Leg) SET related_trans_id = Credit Leg
        API->>CRDB: INSERT INTO audit_log (Details JSONB)
        alt Serialization Conflict (SQLSTATE 40001)
            CRDB-->>API: Error 40001: TransactionRetryWithNewPriorityError
            API->>CRDB: ROLLBACK
            API->>API: Exponential Backoff + Jitter
            API->>CRDB: Retry Transaction Loop (Up to 5 attempts)
        else Transaction Successful
            API->>CRDB: COMMIT
            CRDB-->>API: Transaction Committed
            API-->>FE: 200 OK {success: true, leg1, leg2}
            FE-->>User: Refresh Ledger & Show Success Toast
        end
    end
```

---

## Tech Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.3.1` | Declarative component UI and reactive state handling |
| **Language & Typing** | TypeScript | `~6.0.2` | Static type safety across interfaces, entities, and API clients |
| **Build Tool & Bundler** | Vite | `^8.3.0` | Ultra-fast HMR development server and optimized rollup production bundling |
| **Styling & CSS** | Tailwind CSS | `^3.4.19` | Utility-first responsive design system and custom obsidian theme |
| **Iconography** | Lucide React | `^1.59.0` | Modern, lightweight SVG iconography |
| **Client Routing** | React Router DOM | `^7.18.4` | Single-Page Application client routing and browser history management |
| **Class Utilities** | `clsx` & `tailwind-merge`| `^2.1.1` / `^3.7.0` | Dynamic class composition and conflict resolution |
| **Server Runtime** | Node.js | `>= 18.x` | Asynchronous event-driven JavaScript server environment |
| **Web Framework** | Express.js | `^5.3.0` | REST API routing, JSON body parsing, and middleware pipeline |
| **Database Driver** | `pg` (node-postgres) | `^8.23.1` | PostgreSQL wire protocol client with TLS root CA verification |
| **Database Engine** | CockroachDB Cloud | `v26.2.7` | Distributed cloud SQL database, Multi-Raft consensus, serializable ACID |
| **Storage Engine** | Pebble | Built-in | High-performance Log-Structured Merge (LSM) key-value engine |
| **Transaction Isolation** | Serializable (SSI) | Natively Enforced | Eliminates dirty reads, non-repeatable reads, phantoms, and write skew |
| **Middleware** | `cors` & `dotenv` | `^2.8.6` / `^18.0.8` | Cross-Origin Resource Sharing handling and environment configuration |
| **Hosting (Frontend)** | Render | Static Site | Managed cloud hosting with automated continuous deployment |
| **Hosting (Backend)** | Render | Web Service | Managed Node.js service hosting the Express REST API |
| **Cloud Region** | AWS Mumbai (`ap-south-1`)| Cloud Native | Geographic proximity for low-latency database access |

---

## Key Features

- **Executive Banking Dashboard (`/`):**
  - Live metric KPI tiles: Total Customers, Total Accounts, Bank Depository Capital, Active Loans, Loan Portfolio Exposure, Issued Credit Cards, and Total Transactions.
  - Real-time CockroachDB Engine Specifications card displaying live cluster version, database name, connected user, and server clock timestamp.
  - Dynamic transactions feed with type badges, formatted INR currency values, and direct navigation links.
  - Interactive SVG visual distribution charts showing loan portfolio distribution by sanctioned category and credit cards by network issuer.

- **Customer Directory & KYC Profiles (`/customers`):**
  - Complete customer directory tracking PAN, residential address, city, state, date of birth, and assigned relationship manager.
  - Support for multi-valued customer phone numbers with mobile/work classifications and primary number flags.
  - Registration modal with client-side PAN uniqueness validation and relationship manager linking.
  - Customer status tracking (`ACTIVE`, `INACTIVE`, `SUSPENDED`) with non-destructive deactivation.

- **Accounts & Multi-Holder Governance (`/accounts`):**
  - Depository account administration covering Savings, Current, Salary, and Fixed Deposit accounts.
  - **Many-to-Many Account Ownership:** Cleanly handles single accounts, joint accounts, secondary holders, and ownership share percentages ($0\% - 100\%$) via the normalized `account_holder` entity.
  - Account lifecycle management (`ACTIVE`, `DORMANT`, `FROZEN`, `CLOSED`) with balance validation prior to closure.
  - Create Account modal supporting branch selection, customer binding, and initial depository funding.

- **Financial Ledger & Money Movement (`/transactions`):**
  - Real-time audit trail of all financial movements (`DEPOSIT`, `WITHDRAWAL`, `TRANSFER`).
  - Interactive money movement modal for instant cash/online deposits and ATM/online withdrawals.
  - Atomic inter-account transfer modal executing bilateral double-entry transactions with linked foreign keys.
  - Transaction filter toolbar supporting filtering by type, mode, status, and instant text search.

- **Loan Portfolio & Installment Tracking (`/loans`):**
  - Comprehensive tracking of sanctioned loans across Home, Car, Personal, Education, and Business categories.
  - Dedicated Loan Repayment Modal recording installment payments while strictly validating component arithmetic (`amount = principal + interest`).
  - Sanction Loan modal verifying positive principal, non-negative interest rate, and term duration.
  - Loan lifecycle transitions (`PENDING`, `APPROVED`, `ACTIVE`, `PAID_OFF`, `DEFAULTED`).

- **Credit Card Gallery (`/cards`):**
  - Visual card deck rendering styled physical card previews with masked card numbers, expiration dates, and cardholder names.
  - Issue Credit Card modal with automated 16-digit card number and 3-digit CVV generation.
  - Status management permitting cards to be marked `ACTIVE`, `BLOCKED`, `EXPIRED`, or `CANCELLED`.

- **Branch Network Management (`/branches`):**
  - Directory of bank branches displaying branch name, city, state, contact telephone, and unique IFSC routing codes.
  - Add Branch modal with uniqueness verification against duplicate IFSC codes.
  - Branch lifecycle tracking (`ACTIVE`, `INACTIVE`, `CLOSED`).

- **Employee & Staff Directory (`/employees`):**
  - Staff directory recording employee names, salaries, hire dates, assigned branch, and professional email addresses.
  - Staff lifecycle tracking (`ACTIVE`, `INACTIVE`, `SUSPENDED`, `ON_LEAVE`, `TERMINATED`).
  - Filter by branch with seamless "All Branches" aggregate view support.

- **Database Catalog Explorer (`/database`):**
  - Live introspection of CockroachDB Cloud system metadata (`information_schema`).
  - Real-time table list with live row counts, storage engine details, and table purpose classifications.
  - Deep-dive attribute inspector showing column data types, nullability, defaults, primary keys, and foreign keys.
  - Dedicated index catalog viewer showing index names, indexed columns, uniqueness, and direction.
  - Comprehensive constraint viewer detailing primary, foreign key, unique, and check constraints.

- **Sandboxed SQL Query Workbench (`/workbench`):**
  - Interactive SQL console for executing queries directly against CockroachDB Cloud.
  - Strict read-only AST and regex security policy blocking all DDL and DML operations (`DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`).
  - Rejection of multi-statement chaining (semicolon attacks) and administrative system catalog inspection.
  - Execution enforcement: 5000ms statement timeout and 500 row maximum limit.
  - Pre-built query templates for quick schema analysis and join operations.

- **Interactive Chen-Notation ER Diagram (`/schema`):**
  - Authentic Chen-style entity relationship diagram rendered on a responsive, zoomable, and draggable SVG canvas.
  - Traditional Chen geometric notation:
    - **Entity Sets:** Solid rectangles.
    - **Attributes:** Ellipses connected to entities (primary keys underscored, foreign keys styled with cyan dashed outlines).
    - **Relationship Sets:** Rhombuses / diamonds with connecting edges.
    - **Cardinality Annotations:** Explicit `1:1`, `1:N`, and `M:N` edge labels.
  - **Clickable Foreign Key Inspector:** Clicking any FK attribute oval opens a live metadata popover showing referencing column, referenced table, referenced column, constraint name, `ON DELETE` action, and nullability retrieved directly from CockroachDB metadata.
  - Interactive entity filtering toolbar to isolate specific database sub-graphs.

- **Distributed Architecture Showcase & Multi-Raft Simulator (`/showcase`):**
  - Educational deep-dive explaining CockroachDB's distributed architecture: Multi-Raft consensus, range splits, leaseholder routing, and Pebble LSM-tree storage.
  - **Interactive 3-Node Raft Cluster Simulator:** Users can toggle Node 1, Node 2, and Node 3 between Online and Offline states to observe quorum dynamics.
  - **State Persistence across Navigation:** The simulated cluster state (nodes online/offline, leader, quorum health) persists across all application page transitions via React Context and `sessionStorage`.
  - **Dual-Tier Write Gate:** When fewer than 2 nodes are online (quorum lost), write operations are blocked across both the client-side API interceptor and the backend Express middleware (`raftQuorumGate`) with HTTP 503 Service Unavailable, illustrating real distributed consensus guarantees.

---

## Database Design

The CockroachDB database schema comprises **14 normalized relational tables** in strict referential dependency order and **5 real-time analytical views**.

### Entity Relationship Summary

```text
Branch (1) ───────────< Employee (M) ───────────< Customer (M) ───────< Customer_Phone (M)
    │                       │                          │
    │                       │                          ├──────────────< Beneficiary (M)
    │                       │                          │
    │                       │                          ├──────────────< CreditCard (M)
    │                       │                          │
    ▼ (1)                   │                          ├──────────────< Loan (M)
 Account                    │                          │                 │
    │                       │                          │                 ▼ (1)
    ├───────────┐           │                          │            Loan_Payment (M)
    │ (1)       │ (1)       │                          │
    ▼ (M)       ▼ (M)       ▼                          ▼
Nominee    Account_Holder (M:N Association between Account & Customer)
                │
                ▼ (1)
         "TRANSACTION" (Ledger: Deposits, Withdrawals, Bilateral Linked Transfers)
                ▲
                │
Audit_Log & Responsible_For (Decoupled Staff Supervisory & Operational Matrix)
```

### Relational Schema & Tables

| # | Table Name | Business Entity / Purpose | Primary Key | Foreign Keys & Key Integrity Constraints |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `branch` | Bank branches, IFSC routing codes, and contact data | `b_id` | `UNIQUE (ifsc)`, `CHECK (status IN ('ACTIVE','INACTIVE','CLOSED'))` |
| **2** | `employee` | Branch staff, tellers, loan officers, and managers | `emp_id` | `b_id` references `branch(b_id)` `ON DELETE RESTRICT`, `CHECK (salary >= 0)` |
| **3** | `customer` | Customer KYC records and assigned relationship manager | `cid` | `UNIQUE (pan)`, `emp_id` references `employee(emp_id)` `ON DELETE SET NULL` |
| **4** | `customer_phone` | Multi-valued phone numbers per customer | `(cid, phone)` | `cid` references `customer(cid)` `ON DELETE CASCADE`, `CHECK (phone_type)` |
| **5** | `account` | Depository accounts anchored to branches | `acc_id` | `b_id` references `branch(b_id)` `ON DELETE RESTRICT`, `CHECK (balance >= 0)` |
| **6** | `account_holder`| Many-to-Many association for joint/single account ownership | `(acc_id, cid)` | `acc_id` references `account` `CASCADE`, `cid` references `customer` `RESTRICT` |
| **7** | `nominee` | Account beneficiaries designated for holder succession | `n_id` | `acc_id` references `account` `CASCADE`, `cid` references `customer` `SET NULL` |
| **8** | `creditcard` | Credit cards issued with credit limits and expiry | `pno` | `cid` references `customer(cid)` `ON DELETE RESTRICT`, `CHECK (card_limit > 0)` |
| **9** | `loan` | Sanctioned loans with principal, interest, and term | `l_id` | `cid` references `customer` `RESTRICT`, `assigned_emp_id` references `employee` |
| **10**| `loan_payment` | Loan installment repayments with component arithmetic | `payment_id` | `l_id` references `loan(l_id)` `RESTRICT`, `CHECK (amount = principal + interest)`|
| **11**| `beneficiary` | Saved internal and external transfer recipients | `beneficiary_id`| `cid` references `customer` `CASCADE`, `internal_acc_id` references `account` |
| **12**| `"transaction"`| Financial ledger for deposits, withdrawals, and transfers | `t_id` | `acc_id` references `account` `RESTRICT`, self-referencing `related_trans_id` |
| **13**| `audit_log` | Security, administrative, and data change audit trail | `log_id` | `emp_id` references `employee` `SET NULL`, `details` stored as native `JSONB` |
| **14**| `responsible_for`| Staff branch assignments and operational duties | `rf_id` | `emp_id` references `employee` `RESTRICT`, `b_id` references `branch` `RESTRICT` |

### Key Relational Innovations

1. **Replaced Ternary `OWNS` with Normalized `ACCOUNT_HOLDER` (M:N):**
   - In DA2, the legacy `OWNS (cid, acc_id, n_id)` table had a 3-column composite primary key, making it impossible to record account ownership unless a nominee (`n_id`) already existed.
   - DA3 decouples `nominee` directly to `account`, and models account ownership in `account_holder (acc_id, cid, ownership_role, is_primary, share_percentage, created_at)` with `PRIMARY KEY (acc_id, cid)`.
   - This cleanly represents single accounts, joint accounts, secondary holders, and ownership shares ($0\% - 100\%$) without null anomalies.

2. **Decoupled and Flexible `RESPONSIBLE_FOR` Matrix:**
   - In DA2, `Responsible_For (emp_id, t_id, l_id, b_id)` forced all 4 foreign keys into every record simultaneously, causing anomalies because tellers do not manage loans and loan sanctioning does not produce immediate teller transactions.
   - DA3 models `responsible_for` as an operational staff assignment ledger: `(emp_id, b_id)` are mandatory, while `role_type` classifies responsibilities (`BRANCH_MANAGER`, `LOAN_OFFICER`, `TELLER_SUPERVISOR`, `OPERATIONAL_SUPERVISOR`, `AUDIT_OFFICER`). Pointers to `l_id` and `t_id` are optional supervisory audit references.

3. **Double-Entry Linked Transfers:**
   - Inter-account fund transfers insert two matching transaction rows into `"transaction"`:
     - **Leg 1 (Debit / Outflow):** Source account debited, pointing to `related_acc_id = Target` and `related_trans_id = Leg 2`.
     - **Leg 2 (Credit / Inflow):** Destination account credited, pointing to `related_acc_id = Source` and `related_trans_id = Leg 1`.
   - Each account statement shows its own debit or credit entry, while bilateral foreign keys ensure auditability.

4. **Dedicated Beneficiary Routing:**
   - The `beneficiary` table allows customers to store internal accounts (`internal_acc_id REFERENCES account(acc_id)`) or external banking accounts (`destination_account_num` and `destination_ifsc`) with uniqueness constraints.

5. **JSONB Audit Logging:**
   - `audit_log` records system actions, actors, timestamps, and JSON-structured payload metadata, ensuring full auditability while excluding sensitive credentials.

### Primary Key Strategy

Tables in CockroachDB use `BIGINT PRIMARY KEY DEFAULT unique_rowid()`.
- `unique_rowid()` produces 64-bit integers combining a cluster timestamp and node identifier. This avoids write hotspotting on single range leases (a common problem with traditional auto-incrementing serial sequences in distributed databases).
- The schema permits explicit insertion of integer IDs (e.g. 101, 201, 301, 401) during data seeding, preserving human-readable IDs for demonstration fixtures while remaining fully distributed-ready.

### Analytical & Dashboard Views

The database defines **5 real-time aggregated reporting views**:

1. `dashboard_summary`: Computes aggregate totals in a single row (total customers, total accounts, total balance across all accounts, total loans, total loan amount, total credit cards, and total transactions).
2. `customer_dashboard`: Joins `customer`, `account_holder`, `account`, `employee`, and `branch` to report customer depository holdings and assigned relationship managers.
3. `transaction_dashboard`: Joins `"transaction"`, `account`, `account_holder`, and `customer` for chronological ledger auditing with customer names.
4. `loan_dashboard`: Joins `loan` and `customer` to report sanctioned loan amounts, interest rates, and loan terms alongside borrower names.
5. `creditcard_dashboard`: Joins `creditcard` and `customer` to report credit limits, card networks, and expiry dates.

---

## CockroachDB Distributed Architecture Deep Dive

CockroachDB is an open-source, cloud-native distributed SQL database engineered to provide horizontal scalability, resilient high availability, and strong consistency without sacrificing SQL semantics.

### Multi-Raft Consensus

- **Range Partitioning:** CockroachDB divides table data and indexes into contiguous 64 MB chunks called **ranges**.
- **Raft Groups:** Each range is replicated across multiple nodes (typically 3 or 5 replicas) forming an independent **Raft consensus group**.
- **Leaseholders:** For each range, one node is elected as the **leaseholder**. All read operations and write coordination pass through the leaseholder, ensuring read consistency without consensus overhead for reads.
- **Quorum Writes:** A write operation to a range requires acknowledgment from a simple majority of replicas in its Raft group ($\lfloor N/2 \rfloor + 1$). In a 3-node cluster, 2 nodes must acknowledge the write. If 1 node goes down, the cluster continues processing writes seamlessly. If 2 nodes fail, the range loses quorum and pauses writes to prevent split-brain inconsistencies.

### Pebble LSM-Tree Storage Engine

- Traditional databases (like Oracle or PostgreSQL) use B-Trees for disk storage, which require in-place updates and frequent random I/O.
- CockroachDB utilizes **Pebble**, an ultra-high-performance key-value storage engine inspired by RocksDB and LevelDB, built on **Log-Structured Merge (LSM) Trees**.
- **Write Path:** In Pebble, write operations append sequentially to a Write-Ahead Log (WAL) and an in-memory `MemTable`. When full, immutable memtables flush sequentially to disk as Sorted String Tables (SSTables) in Level 0, and background compactions merge them downward. This turns random disk writes into high-throughput sequential writes.

### Strict Serializable Isolation (SSI)

- While traditional databases default to `Read Committed` (allowing non-repeatable reads and phantom reads), CockroachDB enforces **`SERIALIZABLE`** isolation—the highest ANSI SQL standard—by default.
- CockroachDB achieves SSI using a distributed hybrid logical clock (HLC) and multi-version concurrency control (MVCC). It prevents:
  - Dirty Reads
  - Non-repeatable Reads
  - Phantom Reads
  - Write Skew anomalies

### Handling Serialization Conflicts (SQLSTATE 40001)

Because transactions execute optimistically in a distributed environment, concurrent transactions attempting to read and write conflicting keys will trigger a serialization conflict. CockroachDB signals this with standard error code `SQLSTATE 40001` (`TransactionRetryWithNewPriorityError`).

In Finora DA3, the backend database module (`backend/config/db.js`) implements a centralized transaction wrapper, `executeTransaction(callback, maxRetries = 5)`, that automatically catches error code `40001` and retries the entire transactional unit with exponential backoff and randomized jitter:

```javascript
// backend/config/db.js: Centralized Serializable Retry Wrapper
async function executeTransaction(callback, maxRetries = 5) {
  const client = await pool.connect();
  let attempt = 0;

  try {
    while (true) {
      attempt++;
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});

        // Check for CockroachDB serialization retry code 40001
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

The backend connects to CockroachDB Cloud using the standard Node.js `pg` driver, secured by a dedicated Certificate Authority (CA) root certificate:

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

```text
1. User submits Deposit form: { acc_id: 401, amount: 5000.00, mode: 'ONLINE' }
2. Backend validates acc_id format and ensures amount > 0.
3. Transaction begins (executeTransaction):
   a. Verify target account exists and status is 'ACTIVE'.
   b. Increment balance: UPDATE account SET balance = balance + 5000.00 WHERE acc_id = 401
   c. Insert ledger entry into "transaction": type = 'DEPOSIT', status = 'SUCCESS'
   d. Insert audit log into audit_log with previous and new balance details.
4. Transaction COMMIT finalizes changes; response returns updated account and transaction data.
```

### Withdrawal Operations

```text
1. User submits Withdrawal form: { acc_id: 401, amount: 2000.00, mode: 'ATM' }
2. Backend validates acc_id format and ensures amount > 0.
3. Transaction begins (executeTransaction):
   a. Verify target account exists and status is 'ACTIVE'.
   b. Check balance: verify that current balance >= 2000.00 (reject with 400 if insufficient).
   c. Decrement balance: UPDATE account SET balance = balance - 2000.00 WHERE acc_id = 401
   d. Insert ledger entry into "transaction": type = 'WITHDRAWAL', status = 'SUCCESS'
   e. Insert audit log into audit_log.
4. Transaction COMMIT finalizes changes.
```

### Double-Entry Inter-Account Transfers

To eliminate deadlocks when two concurrent transactions transfer funds between the same pair of accounts in reverse directions (Account A $\rightarrow$ Account B and Account B $\rightarrow$ Account A), the backend locks and inspects accounts in a **deterministic numerical order**:

```javascript
// backend/services/bankingService.js: Deadlock Prevention Order
const firstId = Math.min(fromAccId, toAccId);
const secondId = Math.max(fromAccId, toAccId);

const accountsRes = await client.query(`
  SELECT acc_id, balance, status, acc_type
  FROM account
  WHERE acc_id IN ($1, $2)
  ORDER BY acc_id ASC
`, [firstId, secondId]);
```

**Bilateral Transfer Execution:**
1. Both source and destination accounts are checked for existence and `ACTIVE` status.
2. Source account balance is verified for sufficient funds.
3. Source balance is decremented and destination balance is incremented atomically.
4. **Leg 1 (Debit):** Inserted into `"transaction"` with `type = 'TRANSFER'`, `acc_id = fromAccId`, `related_acc_id = toAccId`.
5. **Leg 2 (Credit):** Inserted into `"transaction"` with `type = 'TRANSFER'`, `acc_id = toAccId`, `related_acc_id = fromAccId`, `related_trans_id = Leg 1 ID`.
6. Leg 1 is updated with `related_trans_id = Leg 2 ID`, establishing a symmetric bilateral foreign key link.
7. Audit log records the transfer event.

### Loan Repayment Installments

Loan repayments record installment entries in `loan_payment` while strictly enforcing arithmetic balance:
- The backend validates that $\text{amount} = \text{principal\_amount} + \text{interest\_amount}$.
- Verifies that the associated loan exists and is in an `ACTIVE` state.
- Inserts repayment record and logs the event in `audit_log`.

---

## Lifecycle Management & Confirmation-Based Deletion

Finora DA3 implements an enterprise-grade confirmation-based deletion and lifecycle system. In production banking systems, data cannot simply be wiped with indiscriminate cascades. Historical financial ledgers must be permanently protected, active commitments must be fulfilled before closure, and dependent entities must be clearly audited.

### Four-Tier Impact Analysis

Whenever a user requests to delete any record, the system does not execute immediate deletion. Instead, it computes and returns a detailed **4-tier dependency preview**:

1. **Tier 1: Target Entity Record:** The primary record slated for deletion.
2. **Tier 2: Dependent Records to Cascade:** Child records that will be cleanly removed (e.g., removing a customer cascades to `customer_phone` and `beneficiary`; closing an account cascades to `account_holder` mappings and `nominee`).
3. **Tier 3: References to Nullify or Unlink:** Foreign key pointers that will be set to `NULL` to preserve referential integrity (e.g., reassigning staff unlinks `audit_log.emp_id` and supervisory notes without deleting audit logs).
4. **Tier 4: Preserved Records:** Associated records that will remain completely intact in the database (e.g., branches, accounts, customers).

### Two-Phase Preview and Confirmation Workflow

```mermaid
flowchart TD
    A["User clicks 'Delete' on Entity Row"] --> B["GET /api/entities/:entity/:id/delete-preview"]
    B --> C{"Check Dependency Rules & Safeguards"}
    C -- "Has Active Balances / Loans / Cards" --> D["Status: BLOCKED<br/>Display Explanation Alert<br/>'Delete Permanently' Button Disabled"]
    C -- "Eligible for Deletion" --> E["Status: UNBLOCKED<br/>Show 4-Tier Impact Breakdown<br/>Generate Preview Signature Token"]
    E --> F["User Reviews Impact & Clicks Confirm"]
    F --> G["POST /api/entities/:entity/:id/delete-confirm"]
    G --> H{"Revalidate State & Preview Signature"}
    H -- "Data Changed Concurrently" --> I["Abort Transaction with 409 Conflict<br/>Notify User of Stale Preview"]
    H -- "Signature Valid & Unchanged" --> J["Execute Transaction in Order:<br/>1. Delete Eligible Cascades<br/>2. Nullify References<br/>3. Delete Target Record<br/>4. Write Audit Log"]
    J --> K["Commit Transaction & Return 200 OK"]
    D --> L["Suggest Alternative Lifecycle Action<br/>(Close, Block, Settle, Deactivate)"]
```

### Immutable Financial History Protection

In strict adherence to real-world banking compliance regulations, financial ledgers are **immutable**. The following entities can **NEVER** be deleted under any circumstances:

- `"transaction"` (Monetary deposit, withdrawal, and transfer records)
- `loan_payment` (Loan repayment installment history)
- `audit_log` (System activity and security audit trail)

Attempting to request a deletion preview or submit a deletion confirmation for any of these records is immediately rejected by both route guards and service logic with **HTTP 403 Forbidden**:

```json
{
  "success": false,
  "error": "Financial transaction history is immutable and cannot be deleted. Completed transactions must be retained for auditing and regulatory compliance.",
  "code": "IMMUTABLE_FINANCIAL_RECORD"
}
```

### Safe Status Lifecycle Transitions

Rather than deleting active entities, Finora DA3 provides safe lifecycle actions:

- **Accounts:** May be transitioned to `CLOSED` **only if** their balance is exactly ₹0.00 and no active loans exist. Accounts with a balance $> 0$ reject closure with HTTP 400. Once closed, accounts are blocked from receiving deposits or withdrawals.
- **Credit Cards:** May be set to `BLOCKED`, `ACTIVE`, or `CANCELLED`.
- **Loans:** May be marked `PAID_OFF` once loan obligations are satisfied.
- **Customers, Employees & Branches:** May be deactivated (`INACTIVE`, `SUSPENDED`, `ON_LEAVE`, `TERMINATED`) to discontinue operational access without deleting historical links.

---

## Educational Multi-Raft Simulator & Write Gate

CockroachDB’s distributed resilience relies on Raft consensus across partitioned ranges. To illustrate how distributed consensus operates in practice, Finora DA3 includes an educational **Multi-Raft Cluster Simulator** on the Architecture Showcase page (`/showcase`).

```text
                     +---------------------------------------+
                     |         Multi-Raft Simulator          |
                     |         3-Node Cluster Model          |
                     +---------------------------------------+
                        │                 │                 │
                        ▼                 ▼                 ▼
                 [ Node 1: Online ] [ Node 2: Online ] [ Node 3: Online ]
                        │                 │                 │
                        └─────────────────┼─────────────────┘
                                          │
                                   Quorum Check:
                           Active Nodes >= 2 ? (2/3 majority)
                                          │
                       ┌──────────────────┴──────────────────┐
                       ▼                                     ▼
               [ Quorum Healthy ]                    [ Quorum Lost ]
          All mutations permitted               Write Gate Active (HTTP 503)
```

### Simulator Mechanics & Write Gate Enforcement

1. **Interactive Node Controls:** The user can toggle any of the 3 simulated nodes between **Online** and **Offline** states, or change the active Raft leader node.
2. **State Persistence Across Navigation:** Unlike ephemeral page-level React state, the simulator state is managed by `RaftSimulatorContext` and persisted to `sessionStorage`. When users navigate to Accounts, Customers, Transactions, or Loans, the simulator state is preserved.
3. **Dual-Tier Write Gate Enforcement:**
   - **Tier 1 (Client-Side Interceptor):** `frontend/src/api/client.ts` registers a quorum checker. When fewer than 2 nodes are active, any mutating API request (`POST`, `PUT`, `DELETE`) is halted immediately with a client-side exception:
     > *"Simulated Raft Quorum Unavailable: Only 1 of 3 simulated nodes online (minimum 2 required for consensus). Write operations are paused by the CockroachDB Multi-Raft simulation gate."*
   - **Tier 2 (Server-Side Middleware):** `backend/routes/showcaseRoutes.js` exposes the `raftQuorumGate` middleware mounted on `/api`. If an external client or direct HTTP call attempts a mutation (`POST`, `PUT`, `DELETE`, `PATCH`) while simulated quorum is offline, the backend halts execution with **HTTP 503 Service Unavailable**.
4. **Cluster Reset:** Clicking the **Reset Cluster** button on the Showcase page or issuing `POST /api/showcase/raft-reset` instantly restores all 3 nodes to an online state and re-enables full write operations.

---

## API Documentation

All API responses adhere to a standardized JSON schema:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status message"
}
```

### 1. Health & Telemetry

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | CockroachDB connection status, engine version, and pool stats | 200, 500 |

```json
// Example: GET /api/health
{
  "success": true,
  "data": {
    "status": "UP",
    "database": "finora_da3",
    "user": "finora_user",
    "engine": "CockroachDB CCL v26.2.7",
    "serverTime": "2026-10-20T06:00:20.671Z",
    "pool": { "totalCount": 1, "idleCount": 1, "waitingCount": 0 }
  }
}
```

### 2. Dashboard & Analytical Views

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/dashboard/summary` | Consolidated KPI aggregates from `dashboard_summary` view | 200, 500 |
| `GET` | `/api/dashboard/customers` | Joined customer holdings from `customer_dashboard` view | 200, 500 |
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

```json
// POST /api/banking/transfer
{
  "from_acc": 401,
  "to_acc": 402,
  "amount": 2500.00,
  "mode": "ONLINE",
  "description": "Tuition Reimbursement"
}
```

### 4. Universal Entity CRUD Endpoints

The API provides universal routes mounted at `/api/entities/:entity` as well as canonical plural aliases (`/api/customers`, `/api/accounts`, `/api/branches`, `/api/employees`, `/api/loans`, `/api/creditcards`, `/api/transactions`, `/api/beneficiaries`, `/api/nominees`, `/api/audit-logs`, `/api/responsible-for`):

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/entities/:entity` | List records with pagination, search, and sorting | `page`, `limit`, `search`, `sortBy`, `sortOrder`, `b_id` |
| `GET` | `/api/entities/:entity/:id` | Retrieve single record by primary key | None |
| `POST` | `/api/entities/:entity` | Create a new entity record | JSON entity payload |
| `PUT` | `/api/entities/:entity/:id` | Update an existing entity record | JSON update fields |
| `DELETE` | `/api/entities/:entity/:id` | Safe delete with referential safeguard checks | None |

### 5. Deletion Preview & Lifecycle Endpoints

| Method | Endpoint | Description | Request Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/entities/:entity/:id/delete-preview` | Live 4-tier dependency preview and signature token | None |
| `POST` | `/api/entities/:entity/:id/delete-confirm` | Atomically executes confirmed deletion | `empId` (optional auditor ID) |
| `POST` | `/api/entities/:entity/:id/lifecycle-action` | Safely transitions entity lifecycle status | `action` (`CLOSE`, `BLOCK`, `ACTIVATE`, etc.) |

```json
// Example: GET /api/entities/accounts/401/delete-preview
{
  "success": true,
  "data": {
    "entity": "account",
    "id": "401",
    "canDelete": false,
    "blockReason": "Account has positive balance (₹75,115.00). Balance must be zero before deletion.",
    "impact": {
      "recordsToDelete": [{ "table": "account", "count": 1 }],
      "recordsToCascade": [{ "table": "account_holder", "count": 1 }],
      "recordsToNullify": [{ "table": "beneficiary", "count": 1 }],
      "recordsPreserved": [{ "table": "branch", "count": 1 }]
    },
    "suggestedAction": "Withdraw or transfer remaining funds to reduce balance to ₹0.00, then close the account."
  }
}
```

### 6. Database Catalog & Metadata Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/metadata/tables` | Retrieves all 14 core tables with row counts and descriptions |
| `GET` | `/api/metadata/columns/:table` | Column data types, nullability, defaults, PK and FK markers |
| `GET` | `/api/metadata/indexes/:table` | Index definitions, indexed columns, and uniqueness |
| `GET` | `/api/metadata/constraints/:table`| Table constraints (Primary, Foreign Key, Unique, Check) |
| `GET` | `/api/metadata/relationships` | Complete catalog of 23 foreign key relationships |
| `GET` | `/api/metadata/schema` | Complete schema graph model powering the Chen ER diagram |

### 7. SQL Workbench Endpoints

| Method | Endpoint | Description | Request Body Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/workbench/policy` | Returns read-only policy definitions and query rules | None |
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

The Finora DA3 frontend is a single-page application built with **React 19**, **Vite 8**, **TypeScript**, and **Tailwind CSS**. It is designed with clean component encapsulation and strict type safety.

### Neon Obsidian Design System

The visual design system is built specifically for data-intensive enterprise banking operations:

- **Surface Hierarchy:** Deep obsidian backdrops (`#0a0d14` page background, `#121622` card containers, `#1a2030` elevated dialogs).
- **Functional Neon Color Accents:**
  - **Cyan (`#00f5ff`):** Navigation highlights, primary identifiers, foreign-key relationships.
  - **Emerald (`#00e676`):** Active status indicators, successful deposits, healthy quorum indicators.
  - **Violet (`#b388ff`):** Analytics indicators, loan portfolios, secondary ownership roles.
  - **Amber (`#ffd700`):** Warnings, pending transactions, non-deletable constraint alerts.
  - **Rose (`#ff5252`):** Deletions, withdrawals, blocked cards, offline nodes.
- **Micro-Interactions:** Subtle border glow on hover, smooth modal backdrop blur, and focus preservation during real-time table searches.

### Application Pages

```text
frontend/src/pages/
├── DashboardPage.tsx          # Real-time KPIs, CockroachDB specs, recent transactions, SVG charts
├── CustomersPage.tsx          # Customer KYC directory, phone numbers, add customer modal
├── AccountsPage.tsx           # Depository accounts, M:N joint holders, lifecycle status modal
├── TransactionsPage.tsx       # Financial ledger, instant search, deposit/withdraw/transfer modals
├── LoansPage.tsx              # Loan portfolio, loan sanctioning, installment repayment modal
├── CardsPage.tsx              # Masked credit card deck, issue card modal, card status management
├── BranchesPage.tsx           # Branch locations, IFSC routing codes, add branch modal
├── EmployeesPage.tsx          # Staff records, salaries, hire dates, branch filtering
├── DatabaseExplorerPage.tsx   # Live CockroachDB metadata inspector (tables, columns, indexes, FKs)
├── SqlWorkbenchPage.tsx       # Read-only SQL query sandbox with AST validation and templates
├── SchemaVisualizerPage.tsx   # Chen-notation ER diagram canvas with clickable FK popovers
├── CockroachShowcasePage.tsx  # Architecture explainer & persistent 3-node Multi-Raft simulator
└── NotFoundPage.tsx           # 404 fallback page
```

---

## Project Structure

```text
DBMS-DA-3/
├── backend/
│   ├── config/
│   │   └── db.js                  # CockroachDB TLS connection pool & serializable retry wrapper
│   ├── docs/
│   │   └── SCHEMA_DESIGN.md       # Comprehensive relational schema design documentation
│   ├── middleware/
│   │   └── errorHandler.js        # Centralized HTTP error handler & AppError class
│   ├── migrations/
│   │   ├── 001_initial_schema.sql # Complete DDL: 14 tables, indexes, and 5 analytical views
│   │   └── 002_lifecycle_status.sql# Non-destructive lifecycle status additions and check constraints
│   ├── routes/
│   │   ├── bankingRoutes.js       # Atomic deposit, withdraw, transfer, and loan-payment routes
│   │   ├── dashboardRoutes.js     # Analytical KPI and dashboard reporting routes
│   │   ├── deletionRoutes.js      # Two-phase deletion preview, confirmation, and lifecycle routes
│   │   ├── entityRoutes.js        # Universal CRUD routes with canonical plural/singular aliases
│   │   ├── healthRoutes.js        # Database connection health and CockroachDB engine specs
│   │   ├── metadataRoutes.js      # CockroachDB information_schema catalog introspection routes
│   │   ├── showcaseRoutes.js      # Multi-Raft simulator state routes & raftQuorumGate middleware
│   │   └── workbenchRoutes.js     # Sandboxed read-only SQL query validation and execution routes
│   ├── services/
│   │   ├── auditService.js        # Audit logging service writing to audit_log table
│   │   ├── bankingService.js      # Transactional banking business logic (deposits, transfers, etc.)
│   │   ├── deletionService.js     # 4-tier dependency analysis, preview signatures, and cascading logic
│   │   ├── entityService.js       # Parameterized SQL query generator, filters, and pagination
│   │   ├── metadataService.js     # SQL introspection queries for tables, columns, indexes, constraints
│   │   └── raftSimulationService.js# In-memory Raft cluster simulator and write permission logic
│   ├── create-db.js               # Database initialization script
│   ├── inspect-schema.js          # CLI schema introspection script
│   ├── run-migration.js           # Migration runner executing SQL migration files
│   ├── seed-data.js               # Deterministic, idempotent sample data seeder for all 14 tables
│   ├── server.js                  # Express.js server startup, middleware mounts, and graceful shutdown
│   ├── test-api.js                # Core API test suite (32 tests covering health, views, CRUD, banking)
│   ├── test-deletion-lifecycle.js # Deletion lifecycle verification suite (47 assertions across 20 scenarios)
│   ├── verify-branch-filter.js    # Audit verification for branch filtering and pagination
│   ├── verify-phase5d.js          # UI and API consistency verification script
│   ├── verify-schema.js           # Structural schema verification script
│   ├── verify-seed.js             # Comprehensive data integrity, orphan detection, and join test suite
│   ├── verify-summary.js          # Object inventory script (tables, views, foreign keys, primary keys)
│   ├── package.json               # Backend dependencies, scripts, and metadata
│   └── .env                       # Environment credentials (excluded from git)
├── certs/
│   └── cc-ca.crt                  # CockroachDB Cloud CA root certificate
├── frontend/
│   ├── public/                    # Static public assets
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Strongly typed fetch client with Multi-Raft write gate interceptor
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx  # Main application shell with collapsible sidebar and topbar
│   │   │   │   ├── Sidebar.tsx    # Responsive navigation sidebar with active page indicators
│   │   │   │   └── Topbar.tsx     # Top header displaying live cluster health badge and quick metrics
│   │   │   └── ui/
│   │   │       ├── Badge.tsx      # Semantic status and category badge component
│   │   │       ├── Button.tsx     # Neon Obsidian styled button component
│   │   │       ├── Card.tsx       # Elevated container card component
│   │   │       ├── DeleteConfirmModal.tsx # Two-phase deletion modal with 4-tier impact display
│   │   │       ├── Input.tsx      # Form input and select components
│   │   │       ├── MetricTile.tsx # KPI summary tile with icon, value, and change indicators
│   │   │       ├── Modal.tsx      # Accessible dialog modal wrapper with keyboard escape handling
│   │   │       ├── StatusIndicator.tsx # Pulsing health indicator dot
│   │   │       └── Table.tsx      # Paginated, scrollable data table with sort headers
│   │   ├── context/
│   │   │   └── RaftSimulatorContext.tsx # React Context managing persistent 3-node Raft simulator state
│   │   ├── pages/                 # 11 application page components (Dashboard, Accounts, Schema, etc.)
│   │   ├── types/
│   │   │   └── index.ts           # Unified TypeScript interface definitions for all models and APIs
│   │   ├── App.tsx                # Client-side router configuration
│   │   ├── index.css              # Custom Tailwind CSS theme directives and neon obsidian styling
│   │   └── main.tsx               # React application entry point
│   ├── index.html                 # Single-page application HTML shell
│   ├── package.json               # Frontend dependencies and build scripts
│   ├── tailwind.config.js         # Custom Tailwind color palette and design tokens
│   ├── tsconfig.json              # TypeScript compiler configuration
│   └── vite.config.ts             # Vite development server configuration and backend proxy
├── .gitignore                     # Git untracked files specification (node_modules, .env, certs)
└── README.md                      # Comprehensive project documentation
```

---

## Local Setup Guide

Follow these instructions to run Finora DA3 locally on your development workstation.

### Prerequisites

- **Node.js:** v18.x or later installed ([Download Node.js](https://nodejs.org/))
- **npm:** v9.x or later (bundled with Node.js)
- **CockroachDB Cloud Account:** Or a locally running CockroachDB instance ([Sign up for CockroachDB Cloud](https://cockroachlabs.cloud/))
- **Git:** Installed on your operating system

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/finora-da3.git
cd finora-da3
```

---

### Step 2: Database Configuration & TLS Certificate

1. Obtain your CockroachDB Cloud cluster connection string and download the cluster root CA certificate (`cc-ca.crt`).
2. Place the certificate file in the `certs/` directory (or anywhere on your filesystem).
   ```text
   certs/cc-ca.crt
   ```

---

### Step 3: Backend Setup & Schema Migrations

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in `backend/` based on your credentials:
   ```ini
   DATABASE_URL=postgresql://<username>:<password>@<cluster-host>:26257/finora_da3?sslmode=verify-full
   DB_SSL_ROOT_CERT=../certs/cc-ca.crt
   PORT=5000
   NODE_ENV=development
   ```

> [!IMPORTANT]
> Never commit real database passwords, secrets, or certificates to version control. The `.env` file and `certs/` directory are already registered in `.gitignore`.

4. Run the database migration script to construct all 14 tables, performance indexes, and analytical views:
   ```bash
   npm run migrate
   ```

---

### Step 4: Seed Initial Demonstration Data

Populate the database with deterministic, idempotent sample records (branches, employees, customers, joint accounts, loans, credit cards, and audit logs):

```bash
npm run seed
```

Verify that the seed fixtures loaded cleanly without orphan foreign keys:
```bash
npm run verify
```

---

### Step 5: Frontend Setup & Development Server

1. Open a new terminal window and navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. (Optional) Create a `.env` file in `frontend/` if connecting to a remote backend service:
   ```ini
   VITE_API_URL=http://localhost:5000
   ```
   *(Note: By default, Vite’s development proxy forwards `/api` requests directly to `http://localhost:5000` without requiring an explicit `.env` file).*

4. Start both servers:
   - **Terminal 1 (Backend):**
     ```bash
     cd backend
     npm start
     ```
     *Server runs on [http://localhost:5000](http://localhost:5000)*
   - **Terminal 2 (Frontend):**
     ```bash
     cd frontend
     npm run dev
     ```
     *Application runs on [http://localhost:5173](http://localhost:5173)*

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string for CockroachDB Cloud | `postgresql://finora_user:secret@host:26257/finora_da3` |
| `DB_SSL_ROOT_CERT`| Relative or absolute path to the root CA certificate file | `../certs/cc-ca.crt` |
| `PORT` | Local or production port for the Express application | `5000` (or `10000` on Render) |
| `NODE_ENV` | Application environment mode | `development` / `production` |

### Frontend (`frontend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL pointing to the Express REST API backend | Empty string (uses Vite proxy) or `https://finora-db.onrender.com` |

---

## Deployment Architecture

The production application is deployed in a cloud-native, decoupled multi-service infrastructure:

```text
               +─────────────────────────────────────────────+
               |              User Web Browser               |
               +─────────────────────────────────────────────+
                                      │
                                      │ HTTPS (TLS 1.3)
                                      ▼
               +─────────────────────────────────────────────+
               |            Render Static Site               |
               |       (https://finora-db-frontend.onrender.com)      |
               |  - Globally distributed CDN edge caching    |
               |  - Serves compiled React 19 + Vite bundle   |
               |  - Handles SPA route fallback rewrites      |
               +─────────────────────────────────────────────+
                                      │
                                      │ REST API (HTTPS / JSON)
                                      ▼
               +─────────────────────────────────────────────+
               |             Render Web Service              |
               |          (https://finora-db.onrender.com)    |
               |  - Node.js Express REST API server          |
               |  - Raft Quorum Gate middleware              |
               |  - Atomic transactions with SQLSTATE 40001  |
               +─────────────────────────────────────────────+
                                      │
                                      │ PostgreSQL Wire Protocol + TLS
                                      ▼
               +─────────────────────────────────────────────+
               |         CockroachDB Cloud Serverless        |
               |           (AWS Mumbai - ap-south-1)         |
               |  - Database: finora_da3                     |
               |  - Multi-Raft range partition consensus     |
               |  - Strict Serializable Isolation (SSI)      |
               |  - Pebble LSM-Tree key-value engine         |
               +─────────────────────────────────────────────+
```

1. **Frontend on Render Static Site:**
   - Build Command: `npm run build` (`tsc && vite build`).
   - Publish Directory: `dist`.
   - Routing: All routes redirect to `index.html` for client-side React Router navigation.

2. **Backend on Render Web Service:**
   - Runtime: Node.js.
   - Build Command: `npm install`.
   - Start Command: `npm start` (`node server.js`).
   - Environment Variables (`DATABASE_URL`, `DB_SSL_ROOT_CERT`, `PORT`) configured securely in the Render Dashboard.

3. **Database on CockroachDB Cloud Serverless:**
   - Deployed in the AWS Mumbai (`ap-south-1`) region for minimal geographic latency.
   - Encrypted with TLS 1.3 in transit and AES-256 at rest.

---

## Testing & Verification Suite

The repository includes test suites verifying API functionality, concurrency, schema integrity, and deletion lifecycle rules.

### Test Suite 1: REST API & Banking Services

Verifies health endpoints, analytical views, catalog metadata, universal CRUD operations, atomic deposits, withdrawals, transfers, loan payments, SQL Workbench safety rules, and audit logging.

```bash
cd backend
npm test
```

**Results:**
```text
================================================================
FINORA DA3: REST API TEST SUITE
Target: CockroachDB Cloud (finora_da3)
================================================================
--- SECTION 1: HEALTH & TELEMETRY ---
✓ PASS: GET /api/health returns UP with CockroachDB metadata
--- SECTION 2: ANALYTICAL DASHBOARD VIEWS ---
✓ PASS: GET /api/dashboard/summary returns valid KPI aggregates
✓ PASS: GET /api/dashboard/customers returns joined view data
--- SECTION 3: METADATA & SCHEMA INTROSPECTION ---
✓ PASS: GET /api/metadata/tables returns all 14 core tables with row counts
✓ PASS: GET /api/metadata/columns/account returns column definitions with PK/FK flags
✓ PASS: GET /api/metadata/relationships returns 23 foreign key relationships
✓ PASS: GET /api/metadata/schema returns full graph for ER diagram
--- SECTION 4: READ-ONLY ENTITIES & PAGINATION ---
✓ PASS: GET /api/customers?page=1&limit=5 returns paginated records
✓ PASS: GET /api/branches?search=Mumbai returns branch list with search filter
--- SECTION 5: CRUD OPERATIONS & INTEGRITY SAFEGUARDS ---
✓ PASS: POST /api/branches creates a new branch record
✓ PASS: POST /api/branches rejects duplicate IFSC with 409 Conflict
✓ PASS: GET /api/branches/:id retrieves created branch
✓ PASS: PUT /api/branches/:id updates branch record
✓ PASS: DELETE /api/branches/:id successfully deletes unattached test branch
✓ PASS: DELETE /api/branches/101 is REJECTED due to active employee/account references
✓ PASS: DELETE /api/customers/301 is REJECTED due to active account/loan relationships
✓ PASS: DELETE /api/accounts/401 is REJECTED due to positive balance & transaction history
--- SECTION 6: FINANCIAL OPERATIONS ---
✓ PASS: POST /api/banking/deposit rejects negative/invalid amount
✓ PASS: POST /api/banking/deposit rejects non-existent account with 404
✓ PASS: POST /api/banking/deposit atomically increments balance and records transaction
✓ PASS: POST /api/banking/withdraw rejects insufficient balance
✓ PASS: POST /api/banking/withdraw atomically decrements balance and records transaction
✓ PASS: POST /api/banking/transfer rejects transfer between identical accounts
✓ PASS: POST /api/banking/transfer rejects insufficient funds
✓ PASS: POST /api/banking/transfer executes atomic transfer with linked transactions
✓ PASS: POST /api/banking/loan-payment validates component arithmetic
✓ PASS: POST /api/banking/loan-payment records valid installment payment
--- SECTION 7: SQL WORKBENCH SAFETY POLICY ---
✓ PASS: GET /api/workbench/policy returns restricted policy definitions
✓ PASS: POST /api/workbench/execute blocks destructive DROP TABLE with 403
✓ PASS: POST /api/workbench/execute blocks multi-statement chaining with 403
✓ PASS: POST /api/workbench/execute permits safe parameterized SELECT query
--- SECTION 8: AUDIT LOG VERIFICATION ---
✓ PASS: GET /api/audit-logs verifies that banking events were logged without secrets
================================================================
TEST SUMMARY: 32 PASSED, 0 FAILED
================================================================
```

### Test Suite 2: Deletion Lifecycle & Regression Suite

Executes comprehensive edge-case verification covering 20 scenarios: 4-tier dependency preview, deletion cancellation, unlinked entity deletion, dependency blocking, joint-holder removal protection, zero-balance account closure, positive-balance closure rejection, withdrawal/deposit blocking on closed accounts, immutable financial ledger protection (HTTP 403), card blocking/cancellation, loan settlement, staff/branch deactivation, stale preview detection, duplicate submission handling, audit logging, and regression verification.

```bash
cd backend
node test-deletion-lifecycle.js
```

**Results:**
```text
================================================================
🏁 FINORA DA3 TEST SUMMARY: 47 PASSED, 0 FAILED
================================================================
```

### Test Suite 3: Database Integrity & Orphan Detection

Verifies row counts across all 14 tables, checks for orphan records across all 23 foreign key relationships, validates joint account percentage share totals ($100.00\%$), checks loan payment component arithmetic, tests double-entry transfer linkages, and executes a complex 6-table enterprise join query.

```bash
cd backend
npm run verify
```

**Results:**
```text
✓ PASS: Found 2 joint accounts (Joint Account 406 & 407 shares equal exactly 100.00%)
✓ PASS: All loan payment records strictly satisfy amount = principal_amount + interest_amount (0 violations)
✓ PASS: All transfer transaction pairs maintain bilateral symmetric related_trans_id back-links
✓ PASS: Complex 6-table join query executed cleanly in CockroachDB!
🎉 ALL INTEGRITY, RECOVERY, AND VERIFICATION TESTS PASSED!
```

### Test Suite 4: Frontend Type Checking & Production Build

Verifies that all TypeScript interfaces, JSX templates, components, and Tailwind styles compile into an optimized production bundle with zero compiler errors:

```bash
cd frontend
npm run build
```

**Results:**
```text
vite v8.3.4 building client environment for production...
transforming...
✓ 1956 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.34 kB │ gzip:   0.71 kB
dist/assets/index-pItX_7Vr.css   38.02 kB │ gzip:   7.10 kB
dist/assets/index-9V4EQiEw.js   560.73 kB │ gzip: 142.76 kB
✓ built in 2.00s
```

---

## Security Considerations

Finora DA3 implements defense-in-depth security principles across the database, server, and client tiers:

- **Strict SQL Parameterization:** All SQL queries and updates utilize parameterized bind variables (`$1`, `$2`, etc.) via node-postgres. String concatenation is never used for dynamic user inputs, neutralizing SQL injection vectors.
- **Read-Only SQL Workbench Sandbox:** The SQL Workbench enforces a strict AST and regex validation policy that permits only `SELECT`, `WITH`, `SHOW`, and `EXPLAIN` statements. Semicolon chaining, administrative catalog tampering, and data modification commands (`DROP`, `ALTER`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`) are blocked with HTTP 403 Forbidden.
- **Simulated Multi-Raft Write Gate:** The Express middleware pipeline halts state mutations with HTTP 503 Service Unavailable when simulated consensus quorum is lost, demonstrating distributed fault tolerance.
- **TLS Wire Encryption:** All client-to-server and server-to-CockroachDB communications are encrypted using TLS 1.3 with root CA certificate validation (`rejectUnauthorized: true`).
- **Credential Isolation:** Database credentials and connection URIs reside in git-ignored `.env` files. Secrets, passwords, and card CVVs are excluded from API telemetry and audit logs.
- **Immutable Financial Ledgers:** Financial transactions, loan payments, and audit logs are protected by backend route guards that reject deletion attempts with HTTP 403 Forbidden.

> [!NOTE]
> This application was created for academic demonstration and DBMS coursework. In a commercial enterprise banking deployment, additional production controls—such as JWT/OAuth2 session authentication, Role-Based Access Control (RBAC), multi-factor authentication (MFA), and Hardware Security Module (HSM) key management—should be integrated.

---

## Future Roadmap

- [ ] **Role-Based Authentication (RBAC):** Implement customer and employee logins with Argon2 password hashing and JWT access tokens.
- [ ] **Account Statement Generation:** Export account transaction ledgers as signed PDF and CSV statements.
- [ ] **External Payment Gateway Integration:** Add webhook listeners for simulated UPI / NEFT inter-bank clearing.
- [ ] **Automated CI/CD Workflows:** Implement GitHub Actions pipelines to run test suites on pull requests.
- [ ] **Real-Time WebSockets:** Implement WebSockets for instant balance updates across simultaneous browser sessions.

---

## Academic Purpose

This project was developed as an advanced academic Database Management Systems (DBMS) coursework project to demonstrate:

- Modern relational database design and third normal form (3NF) normalization.
- Transitioning monolithic database patterns to cloud-native distributed SQL architectures.
- The mechanics of distributed consensus algorithms (Multi-Raft) and quorum write requirements.
- Concurrency control under strict Serializable Isolation (SSI) and handling serialization conflicts (SQLSTATE `40001`).
- Design and implementation of two-phase confirmation-based deletion engines with immutable financial history protection.
- Full-stack integration connecting an interactive React/TypeScript frontend to a distributed cloud database.

---

## License

This project was developed exclusively for academic and educational purposes.
