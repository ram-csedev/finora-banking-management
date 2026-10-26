# Finora DA2 — Frontend Interface

This directory contains the client-side user interface for **Finora DA2**, built as a lightweight, framework-free single-page application using vanilla HTML5, CSS3, and modern JavaScript (ES6+).

---

## Directory Contents

| File Name | Description |
| :--- | :--- |
| `index.html` | Structural shell, topbar navigation, tabular data views, and prefilled modal dialogs. |
| `styles.css` | Custom CSS design system, responsive grid/flexbox layouts, neon dark topbar, and SVG charts. |
| `app.js` | Client-side routing, DOM event listeners, asynchronous `fetch()` API calls to `/api/*`, dynamic search filtering, and SVG chart generators. |

---

## Running the Frontend

The frontend is served directly by the Express.js backend as static assets:

1. Ensure the Oracle Database is running and accessible.
2. Configure `.env` in `DBMS-DA-2/backend/.env` with your database credentials.
3. In `DBMS-DA-2/backend`, run:
   ```bash
   npm install
   npm start
   ```
4. Open your browser and navigate to:
   ```text
   http://localhost:5000
   ```

All API requests are made to relative `/api/*` endpoints handled by the same Express server, requiring no CORS proxies or frontend bundling tools.
