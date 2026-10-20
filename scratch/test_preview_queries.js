const { getConnection } = require('../backend/db');
const crypto = require('crypto');

function computePreviewSignature(entity, id, counts) {
    const sortedCounts = Object.keys(counts).sort().reduce((acc, k) => {
        acc[k] = counts[k];
        return acc;
    }, {});
    const payload = JSON.stringify({ entity, id: String(id), counts: sortedCounts });
    return crypto.createHash('sha256').update(payload).digest('hex');
}

(async () => {
    let conn;
    try {
        conn = await getConnection();
        console.log('Connected to Oracle XE successfully.');

        // Test Customer 301 (Aarav Sharma)
        const custRes = await conn.execute('SELECT cid, first_name, last_name, status FROM Customer WHERE cid = :p_cid', { p_cid: 301 });
        console.log('Customer 301:', custRes.rows[0]);

        const countsRes = await conn.execute(`
            SELECT
                (SELECT COUNT(*) FROM Customer_Phone WHERE cid = :p_cid) AS phone_count,
                (SELECT COUNT(*) FROM Account WHERE cid = :p_cid) AS acc_count,
                (SELECT COUNT(*) FROM CreditCard WHERE cid = :p_cid) AS card_count,
                (SELECT COUNT(*) FROM Loan WHERE cid = :p_cid) AS loan_count,
                (SELECT COUNT(*) FROM Owns WHERE cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)) AS owns_count,
                (SELECT COUNT(*) FROM Nominee WHERE cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)) AS nom_count,
                (SELECT COUNT(*) FROM Responsible_For WHERE l_id IN (SELECT l_id FROM Loan WHERE cid = :p_cid) OR t_id IN (SELECT t_id FROM "TRANSACTION" WHERE acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid))) AS resp_count,
                (SELECT COUNT(*) FROM "TRANSACTION" WHERE acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)) AS tx_count,
                (SELECT NVL(SUM(balance), 0) FROM Account WHERE cid = :p_cid) AS total_balance,
                (SELECT COUNT(*) FROM Loan WHERE cid = :p_cid AND status = 'ACTIVE') AS active_loans
            FROM dual
        `, { p_cid: 301 });

        console.log('Counts for 301:', countsRes.rows[0]);
        const [phoneCount, accCount, cardCount, loanCount, ownsCount, nomCount, respCount, txCount, totalBalance, activeLoans] = countsRes.rows[0];
        const counts = {
            Customer: 1,
            Customer_Phone: phoneCount,
            Account: accCount,
            CreditCard: cardCount,
            Loan: loanCount,
            Owns: ownsCount,
            Nominee: nomCount,
            Responsible_For: respCount,
            Transaction: txCount
        };
        const sig = computePreviewSignature('Customer', 301, counts);
        console.log('Preview signature for Customer 301:', sig);

        // Test Account 401
        const accRes = await conn.execute(`
            SELECT
                (SELECT COUNT(*) FROM Owns WHERE acc_id = :p_acc) AS owns_count,
                (SELECT COUNT(*) FROM Nominee WHERE acc_id = :p_acc) AS nom_count,
                (SELECT COUNT(*) FROM "TRANSACTION" WHERE acc_id = :p_acc) AS tx_count,
                (SELECT COUNT(*) FROM Responsible_For WHERE t_id IN (SELECT t_id FROM "TRANSACTION" WHERE acc_id = :p_acc)) AS resp_count
            FROM dual
        `, { p_acc: 401 });
        console.log('Counts for Account 401:', accRes.rows[0]);

        // Test Branch 101
        const branchRes = await conn.execute(`
            SELECT
                (SELECT COUNT(*) FROM Employee WHERE b_id = :p_bid) AS emp_count,
                (SELECT COUNT(*) FROM Responsible_For WHERE b_id = :p_bid) AS resp_count
            FROM dual
        `, { p_bid: 101 });
        console.log('Counts for Branch 101:', branchRes.rows[0]);

        // Test Employee 201
        const empRes = await conn.execute(`
            SELECT
                (SELECT COUNT(*) FROM Responsible_For WHERE emp_id = :p_empid) AS resp_count,
                (SELECT COUNT(*) FROM Customer WHERE emp_id = :p_empid) AS cust_count
            FROM dual
        `, { p_empid: 201 });
        console.log('Counts for Employee 201:', empRes.rows[0]);

        console.log('All query checks passed!');
    } catch (err) {
        console.error('Error during query verification:', err);
    } finally {
        if (conn) await conn.close();
    }
})();
