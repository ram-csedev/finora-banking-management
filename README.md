# Banking Management System

A simple Oracle Database + PL/SQL + Node.js/Express banking management system with a vanilla HTML/CSS/JavaScript frontend.

## Project Structure

```text
DBMS/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── README.md
├── database/
│   ├── complete_banking_database.sql
│   ├── banking_database.sql
│   ├── banking_data.sql
│   └── README.md
├── .gitignore
└── README.md
```

## Roles of the Parts

- **frontend/** — the actual browser UI.
- **backend/** — the Express API, Oracle connection, and serving of the frontend.
- **database/** — Oracle SQL/PLSQL schema, data, procedures, functions, triggers, and views.
- **node_modules/** is intentionally not included. Run `npm install` in `backend/`.

## Database

The backend is configured for:

```text
Oracle Database 21c XE
Service: XEPDB1
Host: localhost
Port: 1521
```

The database username expected by the supplied configuration is `PRIYANSHI`.

## Backend Setup

1. Open a terminal in `backend/`.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env`:

```text
DB_USER=PRIYANSHI
DB_PASSWORD=YOUR_ORACLE_PASSWORD
DB_CONNECT_STRING=localhost:1521/XEPDB1
PORT=5000
```

Replace `YOUR_ORACLE_PASSWORD` locally. Do not commit or share `.env`.

4. Start the server:

```bash
npm start
```

The application is then available at:

```text
http://localhost:5000
```

## Database Setup

The supplied `database/complete_banking_database.sql` is described by the original project as the main complete setup script. Review it before executing it in SQL*Plus on a fresh schema.

The other SQL files are preserved because they may be useful for separate schema/data setup or reference.

## Main API Areas

- `/api/test-db`
- `/api/customers`
- `/api/accounts`
- `/api/transactions`
- `/api/loans`
- `/api/creditcards`
- `/api/branches`
- `/api/employees`
- `/api/nominees`
- `/api/owns`
- `/api/responsible-for`
- `/api/dashboard`
- `/api/deposit`
- `/api/withdraw`
- `/api/account/:acc_id/balance`
- `/api/customer/:cid/loan-eligibility`

## Notes

This ordered package consolidates the duplicate Node project and frontend structure. The duplicate `Frontend/server.js` was functionally the same API server as the root `server.js`; the cleaned backend uses one server and adds static serving for the consolidated frontend.

`node_modules` directories are excluded so the project can be reinstalled cleanly with `npm install`.
