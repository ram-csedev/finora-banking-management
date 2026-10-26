# Finora — Banking Management Systems
**Academic DBMS Coursework Repository**

A unified repository containing two distinct database-driven banking management system projects developed as part of academic Database Management Systems (DBMS) coursework. Together, these projects demonstrate the evolution of relational banking systems: from a classic monolithic architecture with an **Oracle Database** and server-side **PL/SQL** procedural logic, to a modern cloud-native distributed architecture powered by **CockroachDB Cloud Serverless**, strict **Serializable ACID transactions (SSI)**, and a **React + TypeScript** single-page application.

---

## Repository Structure

```text
finora-banking-management/
├── README.md                          # Root repository documentation (this file)
│
├── DBMS-DA-2/                         # Milestone 1: Monolithic Oracle 21c Banking System
│   ├── README.md                      # Comprehensive DA2 project guide
│   ├── backend/                       # Node.js + Express REST API server
│   │   ├── server.js                  # Express endpoints & static asset serving
│   │   ├── db.js                      # Oracle database connection pool
│   │   ├── package.json               # Backend dependencies (oracledb, express, cors)
│   │   └── .env.example               # Template for Oracle connection credentials
│   ├── database/                      # Oracle SQL schemas, PL/SQL, & verification
│   │   ├── complete_banking_database.sql # Master DDL, DML, triggers, & procedures
│   │   ├── verify_database.sql        # Database verification & object integrity script
│   │   └── README.md                  # Database architecture & schema documentation
│   ├── frontend/                      # Vanilla single-page application (SPA)
│   │   ├── index.html                 # Structural layout, modal dialogs, & navigation
│   │   ├── app.js                     # DOM rendering & API communication
│   │   ├── styles.css                 # Custom CSS design system & SVG charts
│   │   └── README.md                  # Frontend reference guide
│   └── scratch/                       # Test suites & schema verification scripts
│
└── DBMS-DA-3/                         # Milestone 2: Distributed Cloud Banking System
    ├── README.md                      # Comprehensive DA3 project guide
    ├── certs/                         # CockroachDB Cloud root CA certificate (root.crt)
    ├── backend/                       # Node.js + Express REST API with security sandbox
    │   ├── config/db.js               # CockroachDB pool & serializable retry wrapper
    │   ├── docs/SCHEMA_DESIGN.md      # Detailed 14-table relational schema documentation
    │   ├── middleware/errorHandler.js # Centralized constraint mapping & friendly errors
    │   ├── migrations/                # DDL migrations (initial schema & lifecycle)
    │   ├── routes/                    # Banking, entities, deletion, workbench, showcase
    │   ├── services/                  # Deletion preview, banking ledger, audit services
    │   ├── package.json               # Backend dependencies (pg, express, cors, dotenv)
    │   ├── .env.example               # Template for CockroachDB connection string
    │   ├── test-sql-workbench.js      # SQL Workbench & preloaded templates test suite
    │   ├── test-constraints-and-errors.js # Constraint validation & error handling suite
    │   ├── test-architectural-simulation.js # Raft consensus & range splitting test suite
    │   ├── test-deletion-lifecycle.js # Deletion preview, cascading, & safeguards suite
    │   ├── test-branch-deletion.js    # Unrestricted branch permanent deletion suite
    │   └── test-api.js                # Core REST API & banking operations test suite
    └── frontend/                      # Modern React 19 + TypeScript + Vite SPA
        ├── src/                       # Components, pages, custom design system, types
        ├── package.json               # Frontend dependencies (React 19, Vite 8, Tailwind)
        ├── .env.example               # Frontend environment template (VITE_API_URL)
        └── vite.config.ts             # Vite configuration with API development proxy
```

---

## Projects Overview

### 1. DBMS-DA-2: Monolithic Oracle Banking Management System
- **Directory:** [`DBMS-DA-2/`](DBMS-DA-2/)
- **Documentation:** [DA2 Detailed README](DBMS-DA-2/README.md)
- **Database Engine:** Oracle Database 21c Express Edition (XE) / Oracle Database Free
- **Architecture:** Decoupled 3-tier architecture with an Express.js backend serving a lightweight Vanilla HTML5/CSS3/ES6 frontend and communicating with Oracle via `node-oracledb`.
- **Key Features:**
  - 11 normalized tables structured in strict referential dependency order.
  - Automated autonomous PL/SQL triggers (`TRG_UPDATE_BALANCE`, `TRG_VALIDATE_TRANSACTION`, `TRG_ACCOUNT_BALANCE_CHECK`, etc.) ensuring ledger changes update account balances without double-modifications.
  - Stored procedures (`deposit_money`, `withdraw_money`, `transfer_money`, `customer_details`).
  - Stored functions (`get_balance`, `check_loan_eligibility`, `total_loan`) callable directly from client banking tools.
  - 5 aggregated dashboard reporting views (`DASHBOARD_SUMMARY`, `CUSTOMER_DASHBOARD`, etc.).
  - Confirmation-based cascading record deletion and edit forms with referential checks.

### 2. DBMS-DA-3: Distributed Cloud Banking & Relational Management System
- **Directory:** [`DBMS-DA-3/`](DBMS-DA-3/)
- **Documentation:** [DA3 Detailed README](DBMS-DA-3/README.md)
- **Database Engine:** CockroachDB Cloud Serverless (v26.2.7, AWS Mumbai `ap-south-1`)
- **Architecture:** Cloud-native distributed architecture with a hardened Node.js/Express REST API and a modern single-page application built with React 19, Vite 8, TypeScript, Tailwind CSS, and a custom *Neon Obsidian* design system.
- **Key Features:**
  - 14 normalized tables and 5 analytical views, featuring M:N `account_holder` (joint accounts and percentage shares), dedicated `beneficiary` routing, and append-only `audit_log`.
  - Strict **Serializable Isolation (SSI)** with automated SQLSTATE `40001` serialization conflict retry handlers.
  - **Sandboxed SQL Query Workbench:** Supports preloaded banking templates, arbitrary permitted read-only queries (CTEs, Window Functions, `CASE`, aggregates), interactive Schema Explorer with column/key introspection, dynamic cell rendering for JSON objects, and CSV export. Enforces database-level read-only transactions (`BEGIN TRANSACTION READ ONLY;`), 5000ms timeouts, and 500-row caps.
  - **Constraint Validation & Friendly Errors:** Canonical value normalization (e.g. `AUTO LOAN` $\to$ `CAR`, `UPI` $\to$ `ONLINE`) and automated mapping of database engine constraint violations (`23514`, `23505`, `23503`, `23502`) into user-friendly explanations.
  - **Simplified Permanent Deletion:** Two-phase deletion preview and confirmation modal. Unrestricted permanent branch deletion with clean cascading of accounts and unlinking of employees, while preserving customer profiles, loans, repayments, and credit cards.
  - **Educational Architectural Simulations:** Interactive browser-based educational simulations for Multi-Raft consensus & node failover, 64MB key-range partitioning & auto-split, and serializable conflict resolution (with simulated write gate).

---

## Architectural Evolution: DA2 vs. DA3

| Dimension | DBMS-DA-2 (Milestone 1) | DBMS-DA-3 (Milestone 2) |
| :--- | :--- | :--- |
| **Primary DBMS** | Oracle Database 21c XE / Free | CockroachDB Cloud Serverless (v26.2.7) |
| **Data Distribution** | Monolithic local/cloud database instance | Geo-distributed SQL with Multi-Raft range replication |
| **Storage Engine** | Traditional Oracle B-Tree Tablespaces | Pebble Log-Structured Merge (LSM) Tree |
| **Transaction Isolation** | Read Committed (Oracle default) | Strict Serializable Isolation (SSI) natively enforced |
| **Concurrency Control** | Pessimistic locking with Undo rollback segments | Multi-Version Concurrency Control (MVCC) with `40001` retries |
| **Database Logic** | In-engine PL/SQL stored procedures & autonomous triggers | Express application service layer with ACID database transactions |
| **Schema Normalization** | 11 tables with rigid ternary `OWNS (cid, acc_id, n_id)` | 14 tables, decoupled M:N `account_holder`, `beneficiary`, `audit_log` |
| **Frontend Stack** | Vanilla HTML5, CSS3 variables, ES6 JavaScript | React 19, Vite 8, TypeScript, Tailwind CSS, Lucide React |
| **Developer Tools** | Static SQL scripts & CLI `sqlplus` verification | Interactive SQL Query Workbench & live Schema Explorer |
| **Simulations** | None (direct database operations) | Educational Multi-Raft & 64MB Range-Split browser visualizers |
| **Deletion Model** | Cascade deletion with balance reversal | 2-phase preview, unrestricted branch cascade, financial ledger guards |

---

## Technology Stack Summary

### Backend & Databases
| Technology | DBMS-DA-2 | DBMS-DA-3 | Purpose |
| :--- | :---: | :---: | :--- |
| **Node.js** | v18+ | v18+ (tested on v22.17.1) | Server-side JavaScript runtime |
| **Express.js** | v5.2.1 | v5.3.0 | REST API framework and static routing |
| **Oracle Database** | 21c XE / Free | — | Enterprise relational database with PL/SQL |
| **`node-oracledb`** | v7.0.1 | — | Official Oracle client driver |
| **CockroachDB Cloud**| — | Serverless v26.2.7 | Cloud-native distributed SQL engine |
| **`pg` (node-postgres)**| — | v8.23.1 | PostgreSQL wire-compatible driver with TLS |

### Frontend & UI
| Technology | DBMS-DA-2 | DBMS-DA-3 | Purpose |
| :--- | :---: | :---: | :--- |
| **UI Framework** | Vanilla HTML5 / ES6 | React 19.3.1 | Component-based single-page application |
| **Build Tooling** | None (native browser ES6) | Vite 8.3.0 | Modern fast bundler & dev server with proxy |
| **Type Safety** | JavaScript | TypeScript ~6.0.2 | End-to-end interface and entity typing |
| **Styling** | Custom CSS3 | Tailwind CSS 3.4.19 | Utility-first CSS & Neon Obsidian theme |
| **Icons** | Custom SVG / Unicode | Lucide React 1.59.0 | Scalable vector icon library |

---

## Verified Live Deployments

### DA3 Cloud Deployment
- **Web Application (Frontend):** [https://finora-db-frontend.onrender.com/](https://finora-db-frontend.onrender.com/) *(Verified Active — HTTP 200)*
- **REST API Service (Backend):** [https://finora-db.onrender.com/api/health](https://finora-db.onrender.com/api/health) *(Verified Active — HTTP 200, CockroachDB status: UP)*
- **Database Engine:** CockroachDB Cloud Serverless (AWS Mumbai `ap-south-1`, Cluster: `finora-da3`, Database: `finora_da3`)

> [!NOTE]
> Render free-tier web services spin down after 15 minutes of inactivity. The initial request to the backend may take 30–50 seconds while the service spins up.

### DA2 Deployment Note
DBMS-DA-2 is designed for local workstation execution using Oracle Database 21c XE / Free or inside a Docker container on an AWS EC2 instance. Detailed instructions for local setup and database initialization via `sqlplus` are provided in the [DA2 README](DBMS-DA-2/README.md).

---

## Quick Start Guide

### 1. Clone the Combined Repository
```bash
git clone https://github.com/your-username/finora-banking-management.git
cd finora-banking-management
```

### 2. Choose a Project to Run
- To run **DBMS-DA-2** (Oracle + Express + Vanilla JS):
  ```bash
  cd DBMS-DA-2
  # Follow instructions in DBMS-DA-2/README.md
  ```
- To run **DBMS-DA-3** (CockroachDB Cloud + Express + React/TypeScript):
  ```bash
  cd DBMS-DA-3
  # Follow instructions in DBMS-DA-3/README.md
  ```

### 3. Security Requirements
- **Never commit `.env` files** containing database passwords, private connection strings, or cloud tokens.
- Template configuration files (`.env.example`) are provided in both projects with placeholder values.

---

## Academic Context

These systems were developed for academic Database Management Systems (DBMS) coursework to demonstrate:
1. **Relational Data Modeling:** Entity-Relationship modeling, 3NF normalization, primary/foreign key design, composite keys, and referential constraints.
2. **Transaction Integrity:** ACID semantics, ledger debit/credit balances, atomic transfers, and serializable isolation.
3. **Database Paradigms:** Hands-on comparison between traditional in-engine procedural databases (Oracle PL/SQL) and distributed, scalable cloud-native architectures (CockroachDB).
4. **Application Integration:** Clean separation of concerns across presentation, business logic, and database access layers.

---

For in-depth architectural details, database schemas, API references, test execution instructions, and local setup steps, please refer to the dedicated README in each project folder:
- 📖 [**DBMS-DA-2 Documentation**](DBMS-DA-2/README.md)
- 📖 [**DBMS-DA-3 Documentation**](DBMS-DA-3/README.md)
