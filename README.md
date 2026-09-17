# Finora — Personal Banking & Loan Management System

A relational database-based banking and loan management system developed as an academic Database Management Systems (DBMS) project. The application features a lightweight single-page web interface, a Node.js/Express REST API backend, and an enterprise Oracle Database with PL/SQL business logic, triggers, stored procedures, and views.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Database Design](#database-design)
  - [Entity Relationship Summary](#entity-relationship-summary)
  - [Relational Schema & Tables](#relational-schema--tables)
  - [Triggers](#triggers)
  - [Stored Procedures](#stored-procedures)
  - [Database Functions](#database-functions)
  - [Dashboard Views](#dashboard-views)
- [Transaction & Balance Logic](#transaction--balance-logic)
- [Sample Workflow](#sample-workflow)
- [API Documentation](#api-documentation)
- [Frontend Overview](#frontend-overview)
- [Project Structure](#project-structure)
- [Local Setup Guide](#local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Database Initialization](#step-2-database-initialization)
  - [Step 3: Backend Configuration](#step-3-backend-configuration)
  - [Step 4: Install Dependencies & Run](#step-4-install-dependencies--run)
- [Environment Variables](#environment-variables)
- [Deployment Architecture](#deployment-architecture)
- [Database Verification](#database-verification)
- [Security Considerations](#security-considerations)
- [Future Improvements](#future-improvements)
- [Academic Purpose](#academic-purpose)
- [Screenshots](#screenshots)
- [License & Contributors](#license--contributors)

---

## Project Overview

**Finora** is an end-to-end banking management system built to demonstrate core principles of relational database design, transaction management, referential integrity, and full-stack integration.

In typical educational setups, databases are often demonstrated solely through CLI queries. Finora bridges this gap by coupling an Oracle Database with a modern web interface. All banking entities—customers, bank accounts, financial transactions, loans, credit cards, branches, employees, and nominees—are modeled according to relational design best practices and manipulated through transactional REST APIs.

### Core Capabilities
- **Customer & Account Administration:** Maintain complete customer profiles, link multiple accounts, and enforce balance constraints.
- **Transactional Ledger:** Record deposits, withdrawals, and transfers in an immutable transaction history.
- **Autonomous Balance Updates:** Leverage database-level triggers to update balances upon successful ledger entry without risking double balance modifications.
- **Credit Card & Loan Operations:** Track loan sanctioning, calculate interest and tenures, and issue credit cards with automatic limit and card number generation.
- **Branch & Employee Operations:** Organize organizational hierarchy and assign branch managers and employees to customer portfolios.
- **DBMS Tools & Verification:** Call PL/SQL functions directly from the user interface to check real-time account balances and determine loan eligibility.

---

## System Architecture

The application adopts a decoupled 3-tier architecture:

```text
+-------------------------------------------------------------+
|                     Client Web Browser                      |
|            (Vanilla HTML5 / CSS3 / ES6 Single Page App)     |
+-------------------------------------------------------------+
                               │
                               │ HTTPS / REST JSON API
                               ▼
+-------------------------------------------------------------+
|                    Render Web Service                       |
|   ┌─────────────────────────────────────────────────────┐   |
|   │              Node.js + Express Backend              │   |
|   │  - Static Asset Delivery (frontend/)                │   |
|   │  - RESTful API Routing (/api/*)                     │   |
|   │  - Payload Validation & Error Translation           │   |
|   └──────────────────────────┬──────────────────────────┘   |
|                              │ node-oracledb Driver         |
+──────────────────────────────┼──────────────────────────────+
                               │
                               │ SQL*Net / TCP Port 1521
                               ▼
+-------------------------------------------------------------+
|                  AWS EC2 Virtual Machine                    |
|   ┌─────────────────────────────────────────────────────┐   |
|   │       Docker Container (Oracle Database Free / 21c) │   |
|   │  - 11 Relational Tables with Integrity Constraints  │   |
|   │  - 6 Event Triggers & 4 Stored Procedures           │   |
|   │  - 3 User-Defined Functions & 5 Aggregated Views    │   |
|   │  - ACID Transactions, B-Tree Indexes & Sequences    │   |
|   └─────────────────────────────────────────────────────┘   |
+-------------------------------------------------------------+
```

### Architecture Breakdown
1. **Frontend Tier:** Built with semantic HTML5, modern CSS variables, and vanilla JavaScript. It requires no heavy build tools, bundling steps, or third-party client frameworks.
2. **Backend Tier:** An Express.js server providing REST endpoints. It validates input parameters, handles CORS, and communicates with Oracle using the official `node-oracledb` client. It also serves the frontend assets statically in production.
3. **Database Tier:** Hosted in a Docker container on an AWS EC2 instance running Oracle Database 21c XE / Free. Business logic rules and data consistency are enforced inside the database engine using constraints, triggers, and PL/SQL.

---

## Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5 | Structural layout, semantic markup, and dialog modals |
| **Styling** | CSS3 | Custom design system, responsive grid/flexbox, typography, and dark-theme topbar |
| **Client Logic** | JavaScript (ES6+) | Single-Page Application (SPA) routing, DOM rendering, fetch API calls, and SVG charts |
| **Server Runtime** | Node.js | Asynchronous JavaScript runtime environment |
| **Web Framework** | Express.js (v5) | RESTful API routing, JSON body parsing, and static file serving |
| **Database Driver** | `node-oracledb` (v7) | High-performance client driver for Oracle Database |
| **Database Engine** | Oracle Database 21c XE / Free | Relational DBMS, SQL query execution, ACID transactions |
| **Procedural Language** | Oracle PL/SQL | Stored procedures, stored functions, and autonomous triggers |
| **Middleware** | `cors` & `dotenv` | Cross-Origin Resource Sharing handling and environment variable management |
| **Containerization** | Docker | Containerized Oracle database deployment on cloud infrastructure |
| **Cloud Hosting** | Render | Managed hosting platform for Node.js Web Services |
| **Database Hosting** | AWS EC2 (Ubuntu) | Cloud virtual machine hosting the containerized Oracle Database |
| **Version Control** | Git / GitHub | Code collaboration and version tracking |

---

## Key Features

- **Executive Banking Dashboard:**
  - Dynamic KPI summary tiles (Total Customers, Total Accounts, Total Bank Balance, Active Loans, Total Loan Amount, Issued Credit Cards, Total Transactions).
  - Recent transactions activity table with real-time status and type badges.
  - Interactive SVG pie charts showing loan distribution by principal amount and credit card distribution by card network.
- **Customer Management:**
  - Complete customer directory displaying PAN, address, date of birth, and assigned relationship manager.
  - Modal to register new customers with PAN uniqueness checks and optional employee linking.
- **Account Management:**
  - Overview of savings and current accounts with real-time balances and active/inactive status.
  - Create Account modal supporting customer binding, account classification, and opening balance validation.
- **Deposit & Withdrawal Operations:**
  - Dedicated money movement interface executing ledger transactions against the Oracle database.
  - Automatic balance updates driven by database triggers without redundant manual adjustments.
- **Financial Transactions Ledger:**
  - Real-time audit trail of all deposits, withdrawals, and fund transfers.
  - Filter transactions by type (`DEPOSIT`, `WITHDRAWAL`, `TRANSFER`).
  - Chronological descending order ensuring new activity appears instantly at the top.
- **Loan Portfolio Management:**
  - Track sanctioned loans, categorized by type (`HOME`, `CAR`, `EDUCATION`, `PERSONAL`, `BUSINESS`).
  - Apply/Create Loan modal verifying positive principal, non-negative interest rate, and term in months.
- **Credit Card Issuance:**
  - Card gallery with masked visual card representations, credit limits, and expiry dates.
  - Issue Card modal with automatic 16-digit card number and CVV generation.
- **Branch Directory:**
  - Branch network records displaying branch name, city, state, contact number, and unique IFSC code.
  - Add Branch modal with validation against duplicate IFSC codes.
- **Employee Directory:**
  - Branch personnel directory tracking salaries, hire dates, and branch assignments.
  - Add Employee modal linking staff members to active branches.
- **Interactive Banking Tools:**
  - **Account Balance Inquiry:** Direct invocation of the PL/SQL `get_balance()` function.
  - **Loan Eligibility Checker:** Invokes `check_loan_eligibility()` to evaluate combined customer balance against the ₹1,00,000 threshold with dynamic explanatory feedback.
- **Global Keystroke-Preserved Search:**
  - Integrated search inputs across all data tables filtering records instantaneously without losing input focus.

---

## Database Design

The relational database consists of **11 normalized tables** structured in strict referential dependency order.

### Entity Relationship Summary

```text
Branch (1) ────< Employee (M) ────< Customer (M) ────< Customer_Phone (M)
                                       │
     ┌──────────────────┬──────────────┼─────────────────┐
     │ (1)              │ (1)          │ (1)             │ (1)
     ▼ (M)              ▼ (M)          ▼ (M)             ▼ (M)
  Account           CreditCard        Loan            Nominee
     │                                                   ▲
     ├───────────┐                                       │
     │ (1)       │ (1)                                   │
     ▼ (M)       ▼ (M)                                   │
TRANSACTION    Owns (Customer + Account + Nominee) ──────┘
     ▲
     │
Responsible_For (Employee + Transaction + Loan + Branch)
```

### Relational Schema & Tables

| # | Table Name | Purpose | Primary Key | Foreign Keys & Unique Constraints |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `Branch` | Bank branch locations and IFSC codes | `b_id` | `UNIQUE (ifsc)` |
| **2** | `Employee` | Bank employees and assigned branch | `emp_id` | `b_id` references `Branch(b_id)` |
| **3** | `Customer` | Customer personal profiles and assigned staff | `cid` | `UNIQUE (pan)`, `emp_id` references `Employee(emp_id)` |
| **4** | `Customer_Phone` | Multi-valued phone numbers for customers | `(cid, phone)` | `cid` references `Customer(cid)` |
| **5** | `Account` | Bank savings/current accounts and balances | `acc_id` | `cid` references `Customer(cid)`, `CHECK (balance >= 0)` |
| **6** | `Nominee` | Designated account beneficiaries | `n_id` | `cid` references `Customer`, `acc_id` references `Account` |
| **7** | `Owns` | Ternary relationship between Customer, Account, Nominee | `(cid, acc_id, n_id)` | Foreign keys to `Customer`, `Account`, `Nominee` |
| **8** | `CreditCard` | Credit cards issued with limits and expiry | `pno` | `cid` references `Customer(cid)` |
| **9** | `Loan` | Sanctioned loans with interest rate and tenure | `l_id` | `cid` references `Customer`, `CHECK (amount > 0, interest >= 0)` |
| **10**| `"TRANSACTION"` | Complete ledger of all monetary movements | `t_id` | `acc_id` references `Account`, `CHECK (amount > 0)` |
| **11**| `Responsible_For` | Accountability link across staff, transactions, loans, branches | `(emp_id, t_id, l_id, b_id)` | Foreign keys to `Employee`, `"TRANSACTION"`, `Loan`, `Branch` |

### Triggers

The schema defines **6 automated PL/SQL triggers**:

1. `TRG_TRANSACTION_STATUS` (`BEFORE INSERT ON "TRANSACTION"`): Defaults transaction status to `'SUCCESS'` if not explicitly provided.
2. `TRG_TRANSACTION_AMOUNT_CHECK` (`BEFORE INSERT OR UPDATE ON "TRANSACTION"`): Ensures transaction amount is strictly positive (`> 0`).
3. `TRG_LOAN_AMOUNT_CHECK` (`BEFORE INSERT OR UPDATE ON Loan`): Ensures sanctioned loan amount is strictly positive (`> 0`).
4. `TRG_ACCOUNT_BALANCE_CHECK` (`BEFORE UPDATE OF balance ON Account`): Enforces database-level constraint preventing negative balances.
5. `TRG_VALIDATE_TRANSACTION` (`BEFORE INSERT ON "TRANSACTION"`):
   - Verifies the target account exists.
   - Verifies the target account status is `'ACTIVE'`.
   - On withdrawals/debits, ensures `amount <= balance`, raising application error `-20003: Insufficient account balance` upon overdraft attempts.
6. `TRG_UPDATE_BALANCE` (`AFTER INSERT ON "TRANSACTION"`):
   - Automatically increments `Account.balance` by `:NEW.amount` for `'DEPOSIT'` and `'CREDIT'`.
   - Automatically decrements `Account.balance` by `:NEW.amount` for `'WITHDRAWAL'`, `'WITHDRAW'`, and `'DEBIT'` when status is `'SUCCESS'`.

### Stored Procedures

1. `deposit_money(p_acc_id NUMBER, p_amount NUMBER)`: Validates positive amount and updates account balance directly.
2. `withdraw_money(p_acc_id NUMBER, p_amount NUMBER)`: Validates amount, verifies sufficient balance, and debits the account.
3. `transfer_money(p_from_acc NUMBER, p_to_acc NUMBER, p_amount NUMBER)`: Performs an atomic transfer between two accounts by inserting two matching entries into `"TRANSACTION"` (`WITHDRAWAL` and `DEPOSIT`), triggering automatic balance updates.
4. `customer_details(p_cid NUMBER)`: Queries customer information and total aggregated balance using `DBMS_OUTPUT`.

### Database Functions

1. `get_balance(p_acc_id NUMBER) RETURN NUMBER`: Returns the current numeric balance of the specified account, or `NULL` if not found.
2. `check_loan_eligibility(p_cid NUMBER) RETURN VARCHAR2`: Computes the sum of all account balances owned by a customer. Returns `'ELIGIBLE'` if total balance $\ge ₹1,00,000$, otherwise returns `'NOT ELIGIBLE'`.
3. `total_loan(p_cid NUMBER) RETURN NUMBER`: Returns the aggregate sanctioned loan amount for a given customer.

### Dashboard Views

1. `DASHBOARD_SUMMARY`: Single-row aggregated view providing total customer count, account count, total balance across all accounts, loan count, total loan amount, issued credit cards, and transaction count.
2. `CUSTOMER_DASHBOARD`: Joins `Customer`, `Account`, `Employee`, and `Branch` to present an overview of customer holdings.
3. `TRANSACTION_DASHBOARD`: Joins `"TRANSACTION"`, `Account`, and `Customer` for ledger auditing.
4. `LOAN_DASHBOARD`: Joins `Loan` and `Customer` to display borrower names alongside loan terms.
5. `CREDITCARD_DASHBOARD`: Joins `CreditCard` and `Customer` to report card limits and cardholder names.

---

## Transaction & Balance Logic

In a production-ready relational banking system, updating an account balance and recording a ledger transaction must be atomic and free of double-updates. Finora handles this seamlessly:

1. **User Action:** The user submits a deposit or withdrawal form from the frontend.
2. **Backend Validation:** `POST /api/deposit` or `POST /api/withdraw` validates that `acc_id` is supplied and `amount > 0`.
3. **ID Generation:** The backend calculates the next transaction identifier using the project's standard convention:
   ```sql
   SELECT NVL(MAX(t_id), 700) + 1 AS NEW_TID FROM "TRANSACTION"
   ```
4. **Direct Ledger Insert:** The backend executes an `INSERT` statement into `"TRANSACTION"` with type `'DEPOSIT'` or `'WITHDRAWAL'`, mode (`'ONLINE'` or `'CASH'`), and status `'SUCCESS'`.
5. **Database Trigger Execution:**
   - `TRG_VALIDATE_TRANSACTION` fires **BEFORE INSERT**, validating that the account is active and sufficient funds exist. Overdraft attempts are rejected immediately.
   - `TRG_UPDATE_BALANCE` fires **AFTER INSERT**, adjusting `Account.balance` up or down by the exact transaction amount.
6. **Zero Double-Updates:** The backend relies entirely on the database trigger for the balance update, ensuring the balance is never updated twice.
7. **Commit & Confirmation:** A database `COMMIT` finalizes the operation, and the response triggers an immediate UI table refresh.

---

## Sample Workflow

```text
1. Add Customer (POST /api/customers)
   └─► Creates Customer #307 (PAN: ABCDE9999Z, Name: Rohan Mehta)
         │
2. Create Account (POST /api/accounts)
   └─► Creates Account #408 for Customer #307 (Opening Balance: ₹50,000)
         │
3. Deposit Money (POST /api/deposit)
   └─► Credits ₹60,000 to Account #408
         ├─► New row inserted into "TRANSACTION" (t_id = 712, amount = 60000)
         ├─► TRG_UPDATE_BALANCE increments balance: ₹50,000 + ₹60,000 = ₹1,10,000
         └─► Ledger entry appears instantly on the Transactions page
         │
4. Check Loan Eligibility (GET /api/customer/307/loan-eligibility)
   └─► Calls check_loan_eligibility(307)
         └─► Combined balance (₹1,10,000) >= ₹1,00,000 ──► Result: "ELIGIBLE"
         │
5. Sanction Loan (POST /api/loans)
   └─► Creates Home Loan #607 for Customer #307 (Amount: ₹25,00,000, Interest: 8.5%, 120 Months)
```

---

## API Documentation

All endpoints return responses in standard JSON format:
```json
{
  "success": true,
  "data": [ ... ]
}
```

### 1. System & Testing

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/test-db` | Verifies Oracle database connectivity by querying total customers |

### 2. Dashboard & Analytics

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard` | Returns consolidated KPI statistics, loan distribution, and card distribution data |

### 3. Customer Endpoints

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customers` | Retrieves all customer records | None |
| `POST` | `/api/customers` | Registers a new customer | See below |

```json
// POST /api/customers
{
  "first_name": "Rohan",
  "last_name": "Mehta",
  "pan": "ABCDE9999Z",
  "dob": "1995-04-12",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "phone": "9876543219",
  "emp_id": 201
}
```

### 4. Account Endpoints

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/accounts` | Retrieves all bank accounts | None |
| `POST` | `/api/accounts` | Creates a new bank account | See below |
| `GET` | `/api/account/:acc_id/balance` | Invokes `get_balance(:p_acc_id)` function | None |

```json
// POST /api/accounts
{
  "cid": 301,
  "acc_type": "SAVINGS",
  "balance": 25000,
  "status": "ACTIVE"
}
```

### 5. Transaction Endpoints

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | Retrieves all transactions (`ORDER BY t_id DESC`) | None |
| `POST` | `/api/transactions` | Inserts a custom transaction record | See below |
| `POST` | `/api/deposit` | Deposits money into an account via ledger entry | See below |
| `POST` | `/api/withdraw` | Withdraws money from an account via ledger entry | See below |

```json
// POST /api/deposit
{
  "acc_id": 401,
  "amount": 5000,
  "mode": "ONLINE"
}

// POST /api/withdraw
{
  "acc_id": 401,
  "amount": 2000,
  "mode": "ONLINE"
}

// POST /api/transactions
{
  "t_id": 715,
  "acc_id": 401,
  "trans_date": "2026-09-17",
  "type": "DEPOSIT",
  "amount": 10000,
  "mode": "ONLINE",
  "status": "SUCCESS"
}
```

### 6. Loan Endpoints

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/loans` | Retrieves all loan records | None |
| `POST` | `/api/loans` | Sanctions and creates a new loan | See below |

```json
// POST /api/loans
{
  "cid": 301,
  "l_type": "HOME",
  "amount": 1500000,
  "interest": 8.5,
  "term": 120
}
```

### 7. Credit Card Endpoints

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/creditcards` | Retrieves all issued credit cards | None |
| `POST` | `/api/creditcards` | Issues a new credit card | See below |

```json
// POST /api/creditcards
{
  "cid": 301,
  "type": "VISA",
  "card_limit": 150000,
  "expiry": "2031-09-30",
  "cvv": "789",
  "status": "ACTIVE"
}
```

### 8. Branch & Employee Endpoints

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/branches` | Retrieves all bank branch records | None |
| `POST` | `/api/branches` | Registers a new bank branch | See below |
| `GET` | `/api/employees` | Retrieves all staff records | None |
| `POST` | `/api/employees` | Adds a new bank employee | See below |

```json
// POST /api/branches
{
  "branch_name": "Indiranagar Branch",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560038",
  "ifsc": "SBIN0000106",
  "contact": "080-25251122"
}

// POST /api/employees
{
  "first_name": "Aman",
  "last_name": "Gupta",
  "salary": 62000,
  "hire_date": "2024-02-01",
  "b_id": 101
}
```

### 9. Nominee & Relationship Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/nominees` | Retrieves all account nominees |
| `GET` | `/api/owns` | Retrieves Customer-Account-Nominee ownership tuples |
| `GET` | `/api/responsible-for` | Retrieves Employee-Transaction-Loan-Branch relationships |

### 10. PL/SQL Tool Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/customer/:cid/loan-eligibility` | Evaluates loan eligibility using `check_loan_eligibility(:p_cid)` |

---

## Frontend Overview

The client interface is organized into **10 dedicated navigation views**:

1. **Dashboard (`dashboard`):** Real-time summary statistics, recent transactions table, and SVG distribution charts for loans and credit cards.
2. **Accounts (`accounts`):** Comprehensive table of savings and current accounts, current balance, and account status with a "+ Create Account" action.
3. **Transactions (`transactions`):** Complete financial ledger with type filtering (`DEPOSIT`, `WITHDRAWAL`, `TRANSFER`) and instant search.
4. **Loans (`loans`):** Overview of active loans, principal amounts, interest rates, and loan tenures with a "+ Apply Loan" modal.
5. **Credit Cards (`cards`):** Visual card grid displaying masked numbers, card types, limits, and an "+ Issue Credit Card" action.
6. **Customers (`customers`):** Directory of registered customers with addresses, PAN details, and an "+ Add Customer" action.
7. **Branches (`branches`):** Directory of bank branches, complete with IFSC codes, contact details, and a "+ Create Branch" modal.
8. **Employees (`employees`):** Staff list showing employee salaries, hire dates, and branch assignments with an "+ Add Employee" modal.
9. **Deposit / Withdraw (`money`):** Quick operational screen to trigger credit and debit operations against any valid account.
10. **Banking Tools (`tools`):** Interactive utility testing the database's `get_balance()` and `check_loan_eligibility()` PL/SQL functions.

---

## Project Structure

```text
DBMS-DA/
├── backend/
│   ├── server.js              # Express application, REST endpoints, and static server
│   ├── db.js                  # Oracle database connection pool & dotenv configuration
│   ├── package.json           # Node.js dependencies and startup scripts
│   ├── package-lock.json      # Locked dependency versions
│   └── .env                   # Environment credentials (excluded from git)
├── frontend/
│   ├── index.html             # Main single-page web shell, navigation, and modals
│   ├── app.js                 # UI state management, API integration, and rendering
│   ├── styles.css             # Unified design system, responsive rules, and charts
│   └── README.md              # Frontend reference notes
├── database/
│   ├── complete_banking_database.sql # Complete SQL script (DDL, DML, PL/SQL, Triggers, Views)
│   ├── banking_data.sql              # Standalone sample data insert script
│   ├── banking_database.sql          # Alternate exported DDL reference script
│   ├── verify_database.sql           # Database verification & object integrity script
│   └── README.md                     # Database architectural overview & notes
├── .gitignore                 # Specifies intentionally untracked files (node_modules, .env)
└── README.md                  # Comprehensive project documentation
```

---

## Local Setup Guide

Follow these steps to run the application locally on your workstation.

### Prerequisites
- **Node.js:** v18.x or later installed ([Download Node.js](https://nodejs.org/))
- **Oracle Database:** Oracle Database 21c Express Edition (XE) or Oracle Database Free installed locally or accessible remotely
- **Oracle Client Tool:** SQL*Plus, Oracle SQL Developer, or SQLcl
- **Git:** Installed on your system

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/finora-banking-management.git
cd finora-banking-management
```

---

### Step 2: Database Initialization

1. Open your terminal or command prompt.
2. Connect to your Oracle database instance as a privileged user (`SYSDBA`):
   ```bash
   sqlplus sys/your_sys_password@localhost:1521/XEPDB1 as sysdba
   ```
3. Create the dedicated schema user and grant necessary privileges:
   ```sql
   CREATE USER PRIYANSHI IDENTIFIED BY your_password;
   GRANT CONNECT, RESOURCE, DBA TO PRIYANSHI;
   GRANT UNLIMITED TABLESPACE TO PRIYANSHI;
   EXIT;
   ```
4. Navigate to the `database/` directory and execute the setup script:
   ```bash
   cd database
   sqlplus PRIYANSHI/your_password@localhost:1521/XEPDB1 @complete_banking_database.sql
   ```
   *This script drops any old tables cleanly, creates all 11 tables with constraints, inserts sample data, compiles all 4 stored procedures, 3 functions, 6 triggers, and 5 dashboard views.*

---

### Step 3: Backend Configuration

1. Navigate to the `backend/` directory:
   ```bash
   cd ../backend
   ```
2. Create a `.env` file in the `backend/` directory:
   ```ini
   DB_USER=PRIYANSHI
   DB_PASSWORD=your_password
   DB_CONNECT_STRING=localhost:1521/XEPDB1
   PORT=5000
   ```

> [!IMPORTANT]
> Never commit your `.env` file to version control. It is already included in `.gitignore`.

---

### Step 4: Install Dependencies & Run

1. Install required Node.js packages:
   ```bash
   npm install
   ```
2. Start the Express server:
   ```bash
   npm start
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:5000
   ```

---

## Environment Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DB_USER` | Oracle database schema username | `PRIYANSHI` |
| `DB_PASSWORD` | Oracle database schema password | `your_secret_password` |
| `DB_CONNECT_STRING` | TNS connection string (`host:port/service_name`) | `localhost:1521/XEPDB1` |
| `PORT` | Local or production port for the Express application | `5000` (or `10000` on Render) |

---

## Deployment Architecture

The system is deployed in a multi-cloud production environment:

```text
               +─────────────────────────────────+
               |        User Web Browser         |
               +─────────────────────────────────+
                                │
                                │ HTTPS
                                ▼
               +─────────────────────────────────+
               |             Render              |
               |      (Node.js Web Service)      |
               |  - Serves static frontend assets|
               |  - Runs Express.js REST API     |
               +─────────────────────────────────+
                                │
                                │ SQL*Net (Port 1521)
                                ▼
               +─────────────────────────────────+
               |          AWS EC2 Instance       |
               |        (Ubuntu Linux Server)    |
               |  ┌───────────────────────────┐  |
               |  │     Docker Container      │  |
               |  │  Oracle Database 21c Free │  |
               |  │  Service: FREEPDB1        │  |
               |  └───────────────────────────┘  |
               +─────────────────────────────────+
```

1. **Backend & Frontend on Render:**
   - Deployed as a single Render Web Service running Node.js.
   - Build command: `npm install`.
   - Start command: `npm start`.
   - Environment variables (`DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING`, `PORT`) are injected through the Render Dashboard.
2. **Oracle Database on AWS EC2 via Docker:**
   - Hosted on an AWS EC2 instance running Ubuntu.
   - The Oracle Database runs inside a persistent Docker container (`gvenzl/oracle-free`), exposing the default Oracle TNS port `1521`.
   - The instance's AWS Security Group restricts inbound access on port `1521` to authorized service connections.

---

## Database Verification

To verify that the database objects and baseline records have compiled and loaded successfully, run `database/verify_database.sql`:

```bash
sqlplus PRIYANSHI/your_password@localhost:1521/XEPDB1 @database/verify_database.sql
```

### Baseline Row Counts

| Table | Expected Baseline Records |
| :--- | :---: |
| `Branch` | 5 |
| `Employee` | 5 |
| `Customer` | 6 |
| `Customer_Phone` | 6 |
| `Account` | 7 |
| `Nominee` | 6 |
| `Owns` | 6 |
| `CreditCard` | 6 |
| `Loan` | 6 |
| `"TRANSACTION"` | 9+ |
| `Responsible_For` | 5 |

The verification script also ensures that `SELECT COUNT(*) FROM user_objects WHERE status = 'INVALID'` returns **0**, confirming that all procedures, functions, triggers, and views are valid.

---

## Security Considerations

This project was built for **academic and educational purposes**. While it implements solid database constraints and input sanitization, the following security best practices should be considered for any production deployment:

- **Credential Isolation:** Database credentials are kept in untracked `.env` files and environment variables, never hardcoded into source code.
- **SQL Injection Prevention:** All SQL queries and PL/SQL calls use parameterized bind variables (`:p_acc_id`, `:p_amount`, etc.) through `node-oracledb`.
- **Database Network Access:** The Oracle listener port on AWS EC2 should be secured behind a Virtual Private Cloud (VPC) or restricted security group.
- **Authentication & Authorization:** In a commercial deployment, user authentication (JWT/OAuth2) and Role-Based Access Control (RBAC) should be introduced to differentiate customer and administrator privileges.

---

## Future Improvements

- [ ] **Role-Based Authentication:** Implement customer and teller logins with JWT tokens and password hashing.
- [ ] **Inter-Account Transfers UI:** Provide a frontend interface for the existing `transfer_money` PL/SQL procedure.
- [ ] **Statement Export:** Add PDF/CSV download capability for account transaction statements.
- [ ] **Automated CI/CD:** Set up GitHub Actions for automated static analysis and API testing.
- [ ] **Audit Logs:** Add a dedicated security auditing table to log administrator actions and failed sign-in attempts.

---

## Academic Purpose

This project was developed as an academic Database Management Systems (DBMS) project to demonstrate:
- Comprehensive relational schema design and normalization (3NF/BCNF).
- Practical implementation of relational constraints, foreign keys, and referential integrity.
- Advanced PL/SQL programming: triggers, stored procedures, and user-defined functions.
- Multi-tier web integration linking a client-side interface to an enterprise SQL database.
- Real-world cloud deployment with decoupled containerized databases and web services.

---

## Screenshots

<!-- Add Dashboard screenshot here -->
<!-- Add Transactions ledger screenshot here -->
<!-- Add Banking Tools screenshot here -->

---

## License & Contributors

### Contributors
- **DBMS Academic Project Team**
- **Repository / Commits:** Ram ([`ram.csedev@gmail.com`](mailto:ram.csedev@gmail.com))
- **Database Schema & Architecture:** Priyanshi

### License
This project was developed for academic and educational purposes.
