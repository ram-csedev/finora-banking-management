# Banking Management System - Backend

## Project Overview
This project is a Banking Management System developed using Oracle Database, PL/SQL and Node.js.

## Technologies Used
- Oracle Database 21c XE
- SQL / PL/SQL
- Node.js
- Express.js
- OracleDB Node.js Driver
- CORS
- dotenv

## Database
Oracle service:
XEPDB1

Database username:
PRIYANSHI

The database contains:
- Customer
- Customer_Phone
- Account
- Owns
- Nominee
- Branch
- Employee
- CreditCard
- Loan
- TRANSACTION
- Responsible_For

## PL/SQL
The project contains:

### Procedures
- deposit_money
- withdraw_money

### Functions
- get_balance
- check_loan_eligibility

## Triggers
- TRG_UPDATE_BALANCE
- TRG_VALIDATE_TRANSACTION
- TRG_ACCOUNT_BALANCE_CHECK
- TRG_LOAN_AMOUNT_CHECK
- TRG_TRANSACTION_AMOUNT_CHECK
- TRG_TRANSACTION_STATUS

## Dashboard Views
- DASHBOARD_SUMMARY
- CUSTOMER_DASHBOARD
- TRANSACTION_DASHBOARD
- LOAN_DASHBOARD
- CREDITCARD_DASHBOARD

## Backend Setup

### 1. Install dependencies
Run:

npm install

### 2. Create .env
Create a file named `.env` in the project root.

Example:

DB_USER=PRIYANSHI
DB_PASSWORD=YOUR_ORACLE_PASSWORD
DB_CONNECT_STRING=localhost:1521/XEPDB1
PORT=5000

Do not share the actual .env file.

### 3. Start the server

node server.js

The backend runs on:

http://localhost:5000

## API Endpoints

### Test Database
GET /api/test-db

### Customers
GET /api/customers

### Accounts
GET /api/accounts

### Transactions
GET /api/transactions

### Loans
GET /api/loans

### Credit Cards
GET /api/creditcards

### Branches
GET /api/branches

### Employees
GET /api/employees

### Nominees
GET /api/nominees

### Owns
GET /api/owns

### Responsible For
GET /api/responsible-for

### Dashboard
GET /api/dashboard

### Account Balance
GET /api/account/:acc_id/balance

### Loan Eligibility
GET /api/customer/:cid/loan-eligibility

### Deposit
POST /api/deposit

Example JSON:
{
  "acc_id": 401,
  "amount": 1000
}

### Withdrawal
POST /api/withdraw

Example JSON:
{
  "acc_id": 401,
  "amount": 500
}

### Create Transaction
POST /api/transactions

## Database Setup Script

The `database` folder contains SQL scripts.

The main complete setup script is:

database/complete_banking_database.sql

This script contains the database tables, sample data, PL/SQL programs, triggers and dashboard views.

## Important
Do not share:
- .env
- Oracle password
- node_modules

The frontend team can connect to this backend using the API endpoints listed above.