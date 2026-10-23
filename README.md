# Finora — Banking Management Systems

A collection of two database-driven banking management system projects developed as part of Database Management Systems coursework. Together, these projects demonstrate relational database design, SQL, application development, data integrity, and frontend-backend integration.

## Projects

### DA2 — Banking Management System

**Project directory:** [`DBMS-DA-2/`](DBMS-DA-2/)

The original banking management system, featuring a relational database, SQL scripts, and a web-based interface.

**Components**

- **Backend:** Server-side application and database connectivity.
- **Database:** SQL schemas, setup scripts, and database verification.
- **Frontend:** Web interface built with HTML, CSS, and JavaScript.
- **Scratch:** Development and testing scripts.

See the [DA2 README](DBMS-DA-2/README.md) for detailed documentation and setup instructions.

### DA3 — Cloud Banking and Relational Management System

**Project directory:** [`DBMS-DA-3/`](DBMS-DA-3/)

An extended banking management system using CockroachDB Cloud, a REST API, and a modern web interface.

**Key features**

- Customer, employee, branch, account, loan, and credit-card management.
- Banking operations and transaction handling.
- Relational constraints and database integrity.
- Record editing, lifecycle management, and deletion safeguards.
- Database metadata exploration and schema visualization.
- SQL workbench and educational distributed-database simulations.

See the [DA3 README](DBMS-DA-3/README.md) for the architecture, technology stack, environment setup, API documentation, and deployment instructions.

## Technologies

The projects use technologies appropriate to their individual implementations, including:

- **Databases:** Relational SQL databases, including CockroachDB Cloud for DA3.
- **Backend:** Node.js and JavaScript-based server components.
- **Frontend:** HTML, CSS, JavaScript, React, and TypeScript.
- **Database concepts:** Relationships, primary and foreign keys, constraints, transactions, and data integrity.
- **Version control:** Git and GitHub.

Refer to each project's README for its exact dependencies and requirements.

## Repository Structure

```text
finora-banking-management/
├── README.md
├── DBMS-DA-2/
│   ├── README.md
│   ├── backend/
│   ├── database/
│   ├── frontend/
│   └── scratch/
└── DBMS-DA-3/
    ├── README.md
    ├── backend/
    ├── frontend/
    └── ...
```

*The structure above is illustrative. See the project directories for their actual contents.*

## Getting Started

1. Clone this repository.
2. Choose `DBMS-DA-2/` or `DBMS-DA-3/`, depending on which project you want to run.
3. Read that project's README.
4. Configure the required environment variables and database connection.
5. Follow the project-specific instructions to install dependencies and start the application.

**Security:** Never commit database passwords, API keys, secret `.env` files, or private certificates.

## Academic Purpose

These projects explore database design and implementation through a banking management use case, covering data modeling, relational integrity, application integration, and database operations.

---

For detailed architecture, features, dependencies, and setup instructions, see the README inside each project directory.