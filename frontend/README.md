# Finora frontend

This is a vanilla HTML/CSS/JS frontend for the Banking Management System. It uses the existing Express API and requires no new frontend dependency.

## Run

1. Start Oracle and the existing backend configuration.
2. Ensure `.env` contains the Oracle settings documented in the project README.
3. Run `npm install` once.
4. Run `npm start`.
5. Open `http://localhost:5000`.

The frontend calls the existing `/api` endpoints for dashboard data, customers, accounts, transactions, loans, credit cards and branches. Deposit/withdrawal calls use the existing backend endpoints and therefore the existing PL/SQL procedures.
