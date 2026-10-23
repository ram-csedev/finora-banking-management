\# Finora — Banking Management Systems



A collection of two database-driven banking management system projects developed as part of Database Management Systems coursework. The projects demonstrate relational database design, SQL, application development, data integrity, and the integration of frontend and backend components.



\## Projects



\### DA2 — Banking Management System



\*\*Location:\*\* \[`DBMS-DA-2/`](DBMS-DA-2/)



The original banking management system, featuring a relational database, SQL scripts, and a web-based interface.



\*\*Project components\*\*

\- `backend/` — server-side application and database connectivity

\- `database/` — SQL schema, setup scripts, and database verification

\- `frontend/` — web interface built with HTML, CSS, and JavaScript

\- `scratch/` — development and testing scripts



See the \[DA2 README](DBMS-DA-2/README.md) for project-specific documentation and setup instructions.



\### DA3 — Cloud Banking and Relational Management System



\*\*Location:\*\* \[`DBMS-DA-3/`](DBMS-DA-3/)



An extended banking management system using CockroachDB Cloud, a REST API, and a modern web interface.



\*\*Key features\*\*

\- Customer, employee, branch, account, loan, and credit-card management

\- Banking operations and transaction handling

\- Relational constraints and database integrity

\- Record editing, lifecycle management, and deletion safeguards

\- Database metadata exploration and schema visualization

\- SQL workbench and educational distributed-database simulations



See the \[DA3 README](DBMS-DA-3/README.md) for the architecture, technology stack, environment setup, API documentation, and deployment instructions.



\## Technologies



The projects use technologies appropriate to their individual implementations, including:



\- \*\*Database:\*\* Relational SQL databases; CockroachDB Cloud for DA3

\- \*\*Backend:\*\* JavaScript and Node.js-based server components

\- \*\*Frontend:\*\* HTML, CSS, JavaScript; React and TypeScript for DA3

\- \*\*Database concepts:\*\* Relationships, primary and foreign keys, constraints, transactions, and data integrity

\- \*\*Version control:\*\* Git and GitHub



Refer to each project's README for its exact dependencies and requirements.



\## Repository Structure



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

&#x20;   ├── README.md

&#x20;   ├── backend/

&#x20;   ├── frontend/

&#x20;   └── ...

```



The structure above is illustrative; see the project directories for their actual contents.



\## Getting Started



1\. Clone this repository.

2\. Open `DBMS-DA-2/` or `DBMS-DA-3/`, depending on which project you want to run.

3\. Read that project's README before installing dependencies or configuring the database.

4\. Configure environment variables and database connections using the project's setup instructions.

5\. Run the relevant backend and frontend using the documented commands.



\*\*Important:\*\* Never commit database passwords, API keys, `.env` files containing secrets, or private certificates.



\## Academic Purpose



These projects explore database design and implementation through a banking management use case, including data modeling, relational integrity, application integration, and database operations.



\---



For detailed setup instructions, architecture, features, and dependencies, see the README inside each project directory.

