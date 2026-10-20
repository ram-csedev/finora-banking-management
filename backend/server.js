const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const { getConnection } = require('./db');

const schemaColumnCache = new Map();

async function tableHasColumn(connection, tableName, columnName) {
    const key = `${tableName.toUpperCase()}.${columnName.toUpperCase()}`;
    if (schemaColumnCache.has(key)) {
        return schemaColumnCache.get(key);
    }
    try {
        const res = await connection.execute(
            `SELECT COUNT(*) FROM user_tab_cols WHERE table_name = :t AND column_name = :c`,
            { t: tableName.toUpperCase(), c: columnName.toUpperCase() }
        );
        const has = (res.rows && res.rows[0] && res.rows[0][0] > 0);
        schemaColumnCache.set(key, has);
        return has;
    } catch (_) {
        return false;
    }
}

const app = express();

app.use(cors());
app.use(express.json());
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/api/test-db', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT COUNT(*) AS TOTAL_CUSTOMERS FROM Customer'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/customers', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Customer ORDER BY cid ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/accounts', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Account ORDER BY acc_id ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) await connection.close();
    }
});

app.get('/api/transactions', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM "TRANSACTION" ORDER BY t_id DESC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/loans', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Loan ORDER BY l_id ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/creditcards', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM CreditCard ORDER BY pno ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/branches', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Branch ORDER BY b_id ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/employees', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Employee ORDER BY emp_id ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/nominees', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Nominee ORDER BY n_id ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/owns', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Owns'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/responsible-for', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Responsible_For'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/dashboard', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        const customers = await connection.execute(
            'SELECT COUNT(*) AS TOTAL_CUSTOMERS FROM Customer'
        );

        const accounts = await connection.execute(
            'SELECT COUNT(*) AS TOTAL_ACCOUNTS FROM Account'
        );

        const balance = await connection.execute(
            'SELECT NVL(SUM(balance),0) AS TOTAL_BALANCE FROM Account'
        );

        const loans = await connection.execute(
            'SELECT COUNT(*) AS TOTAL_LOANS FROM Loan'
        );

        const loanAmount = await connection.execute(
            'SELECT NVL(SUM(amount),0) AS TOTAL_LOAN_AMOUNT FROM Loan'
        );

        const creditCards = await connection.execute(
            'SELECT COUNT(*) AS TOTAL_CREDIT_CARDS FROM CreditCard'
        );

        const transactions = await connection.execute(
            'SELECT COUNT(*) AS TOTAL_TRANSACTIONS FROM "TRANSACTION"'
        );

        const loanDist = await connection.execute(
            'SELECT l_type, SUM(amount) AS total_amount FROM Loan GROUP BY l_type ORDER BY total_amount DESC'
        );

        const cardDist = await connection.execute(
            'SELECT "TYPE", COUNT(*) AS card_count FROM CreditCard GROUP BY "TYPE" ORDER BY card_count DESC'
        );

        res.json({
            success: true,
            data: {
                total_customers: customers.rows[0][0],
                total_accounts: accounts.rows[0][0],
                total_balance: balance.rows[0][0],
                total_loans: loans.rows[0][0],
                total_loan_amount: loanAmount.rows[0][0],
                total_credit_cards: creditCards.rows[0][0],
                total_transactions: transactions.rows[0][0],
                loan_distribution: loanDist.rows.map(r => ({ type: r[0], amount: Number(r[1]) || 0 })),
                card_distribution: cardDist.rows.map(r => ({ type: r[0], count: Number(r[1]) || 0 }))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/deposit', async (req, res) => {
    let connection;
    try {
        const { acc_id, amount, mode } = req.body;

        const numAccId = Number(acc_id);
        const numAmount = Number(amount);

        if (!numAccId || isNaN(numAccId)) {
            return res.status(400).json({
                success: false,
                error: 'A valid Account ID is required'
            });
        }

        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Deposit amount must be greater than zero'
            });
        }

        connection = await getConnection();

        // 1. Generate next transaction ID using project convention: NVL(MAX(t_id), 700) + 1
        const tidResult = await connection.execute(
            'SELECT NVL(MAX(t_id), 700) + 1 AS NEW_TID FROM "TRANSACTION"'
        );
        const nextTid = tidResult.rows[0][0];

        // 2. Insert into TRANSACTION table.
        // TRG_VALIDATE_TRANSACTION validates account active status and existence.
        // TRG_UPDATE_BALANCE automatically updates Account.balance by +amount.
        await connection.execute(
            `INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
             VALUES (:p_tid, :p_acc_id, SYSDATE, 'DEPOSIT', :p_amount, :p_mode, 'SUCCESS')`,
            {
                p_tid: nextTid,
                p_acc_id: numAccId,
                p_amount: numAmount,
                p_mode: mode || 'ONLINE'
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Deposit successful',
            data: {
                t_id: nextTid,
                acc_id: numAccId,
                amount: numAmount,
                type: 'DEPOSIT'
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/deposit:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('ORA-20002')) {
            userMessage = 'Account is not active';
        } else if (error.message && error.message.includes('ORA-20004')) {
            userMessage = 'Account not found';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/withdraw', async (req, res) => {
    let connection;
    try {
        const { acc_id, amount, mode } = req.body;

        const numAccId = Number(acc_id);
        const numAmount = Number(amount);

        if (!numAccId || isNaN(numAccId)) {
            return res.status(400).json({
                success: false,
                error: 'A valid Account ID is required'
            });
        }

        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Withdrawal amount must be greater than zero'
            });
        }

        connection = await getConnection();

        // 1. Generate next transaction ID using project convention: NVL(MAX(t_id), 700) + 1
        const tidResult = await connection.execute(
            'SELECT NVL(MAX(t_id), 700) + 1 AS NEW_TID FROM "TRANSACTION"'
        );
        const nextTid = tidResult.rows[0][0];

        // 2. Insert into TRANSACTION table.
        // TRG_VALIDATE_TRANSACTION validates account active status, existence, and ensures amount <= balance.
        // TRG_UPDATE_BALANCE automatically updates Account.balance by -amount.
        await connection.execute(
            `INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
             VALUES (:p_tid, :p_acc_id, SYSDATE, 'WITHDRAWAL', :p_amount, :p_mode, 'SUCCESS')`,
            {
                p_tid: nextTid,
                p_acc_id: numAccId,
                p_amount: numAmount,
                p_mode: mode || 'ONLINE'
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Withdrawal successful',
            data: {
                t_id: nextTid,
                acc_id: numAccId,
                amount: numAmount,
                type: 'WITHDRAWAL'
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/withdraw:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('ORA-20003')) {
            userMessage = 'Insufficient account balance';
        } else if (error.message && error.message.includes('ORA-20002')) {
            userMessage = 'Account is not active';
        } else if (error.message && error.message.includes('ORA-20004')) {
            userMessage = 'Account not found';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/account/:acc_id/balance', async (req, res) => {
    let connection;
    try {
        const acc_id = Number(req.params.acc_id);

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT get_balance(:p_acc_id) AS BALANCE FROM dual`,
            {
                p_acc_id: acc_id
            }
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/customer/:cid/loan-eligibility', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT check_loan_eligibility(:p_cid) AS ELIGIBILITY FROM dual`,
            {
                p_cid: cid
            }
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/transactions', async (req, res) => {
    let connection;
    try {
        const {
            t_id,
            acc_id,
            trans_date,
            type,
            amount,
            mode,
            status
        } = req.body;

        connection = await getConnection();

        await connection.execute(
            `INSERT INTO "TRANSACTION"
            (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
            VALUES
            (:p_tid, :p_acc_id, TO_DATE(:p_date,'YYYY-MM-DD'),
             :p_type, :p_amount, :p_mode, :p_status)`,
            {
                p_tid: t_id,
                p_acc_id: acc_id,
                p_date: trans_date,
                p_type: type,
                p_amount: amount,
                p_mode: mode,
                p_status: status || 'SUCCESS'
            },
            {
                autoCommit: true
            }
        );

        res.json({
            success: true,
            message: 'Transaction created successfully'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/customers', async (req, res) => {
    let connection;
    try {
        const {
            first_name,
            last_name,
            pan,
            dob,
            city,
            state: cust_state,
            pincode,
            emp_id,
            phone
        } = req.body;

        // Validation: First Name is required
        if (!first_name || !first_name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'First name is required'
            });
        }

        const cleanFirstName = first_name.trim();
        const cleanLastName = last_name && last_name.trim() ? last_name.trim() : null;
        const cleanPan = pan && pan.trim() ? pan.trim().toUpperCase() : null;
        const cleanCity = city && city.trim() ? city.trim() : null;
        const cleanState = cust_state && cust_state.trim() ? cust_state.trim() : null;
        const cleanPincode = pincode && pincode.trim() ? pincode.trim() : null;

        // Validation: DOB format (YYYY-MM-DD) if provided
        let cleanDob = null;
        if (dob && dob.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dob.trim()) || isNaN(Date.parse(dob.trim()))) {
                return res.status(400).json({
                    success: false,
                    error: 'Date of birth must be a valid date in YYYY-MM-DD format'
                });
            }
            cleanDob = dob.trim();
        }

        connection = await getConnection();

        // Validation: Employee ID must exist if supplied
        let cleanEmpId = null;
        if (emp_id !== undefined && emp_id !== null && emp_id !== '') {
            cleanEmpId = Number(emp_id);
            if (isNaN(cleanEmpId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Employee ID must be a valid number'
                });
            }
            const empCheck = await connection.execute(
                'SELECT emp_id FROM Employee WHERE emp_id = :emp_id',
                { emp_id: cleanEmpId }
            );
            if (!empCheck.rows || empCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: `Employee with ID ${cleanEmpId} does not exist`
                });
            }
        }

        // Generate CID safely
        const idResult = await connection.execute(
            'SELECT NVL(MAX(cid), 300) + 1 AS NEW_CID FROM Customer'
        );
        const newCid = idResult.rows[0][0];

        // Insert into Customer using parameterized query
        await connection.execute(
            `INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id)
             VALUES (:cid, :pan, :first_name, :last_name, :city, :state, :pincode, 
                     CASE WHEN :dob IS NOT NULL THEN TO_DATE(:dob, 'YYYY-MM-DD') ELSE NULL END, 
                     :emp_id)`,
            {
                cid: newCid,
                pan: cleanPan,
                first_name: cleanFirstName,
                last_name: cleanLastName,
                city: cleanCity,
                state: cleanState,
                pincode: cleanPincode,
                dob: cleanDob,
                emp_id: cleanEmpId
            }
        );

        // Insert into Customer_Phone if phone is provided
        if (phone && phone.trim()) {
            await connection.execute(
                `INSERT INTO Customer_Phone (cid, phone) VALUES (:cid, :phone)`,
                {
                    cid: newCid,
                    phone: phone.trim()
                }
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Customer created successfully',
            data: {
                cid: newCid,
                first_name: cleanFirstName,
                last_name: cleanLastName,
                pan: cleanPan,
                dob: cleanDob,
                city: cleanCity,
                state: cleanState,
                pincode: cleanPincode,
                emp_id: cleanEmpId,
                phone: phone && phone.trim() ? phone.trim() : null
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/customers:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('UQ_CUSTOMER_PAN')) {
            userMessage = 'A customer with this PAN already exists in the database.';
        } else if (error.message && error.message.includes('FK_CUSTOMER_EMPLOYEE')) {
            userMessage = 'The selected Employee does not exist.';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/accounts', async (req, res) => {
    let connection;
    try {
        const {
            cid,
            acc_type,
            balance,
            status
        } = req.body;

        // Validation: Customer ID is required
        if (cid === undefined || cid === null || cid === '') {
            return res.status(400).json({
                success: false,
                error: 'Customer is required'
            });
        }
        const numCid = Number(cid);
        if (isNaN(numCid)) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID must be a valid number'
            });
        }

        // Validation: Account Type is required (SAVINGS or CURRENT)
        if (!acc_type || !acc_type.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Account type is required'
            });
        }
        const cleanAccType = acc_type.trim().toUpperCase();
        if (!['SAVINGS', 'CURRENT'].includes(cleanAccType)) {
            return res.status(400).json({
                success: false,
                error: 'Account type must be either SAVINGS or CURRENT'
            });
        }

        // Validation: Opening Balance >= 0
        const numBalance = balance !== undefined && balance !== null && balance !== '' ? Number(balance) : 0;
        if (isNaN(numBalance) || numBalance < 0) {
            return res.status(400).json({
                success: false,
                error: 'Opening balance must be a number greater than or equal to 0'
            });
        }

        const cleanStatus = status && status.trim() ? status.trim().toUpperCase() : 'ACTIVE';

        connection = await getConnection();

        // Check that Customer exists
        const custCheck = await connection.execute(
            'SELECT cid FROM Customer WHERE cid = :cid',
            { cid: numCid }
        );
        if (!custCheck.rows || custCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Customer with ID ${numCid} does not exist`
            });
        }

        // Generate ACC_ID safely
        const idResult = await connection.execute(
            'SELECT NVL(MAX(acc_id), 400) + 1 AS NEW_ACC_ID FROM Account'
        );
        const newAccId = idResult.rows[0][0];

        // Insert into Account using parameterized query
        await connection.execute(
            `INSERT INTO Account (acc_id, balance, status, acc_type, cid)
             VALUES (:acc_id, :balance, :status, :acc_type, :cid)`,
            {
                acc_id: newAccId,
                balance: numBalance,
                status: cleanStatus,
                acc_type: cleanAccType,
                cid: numCid
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Account created successfully',
            data: {
                acc_id: newAccId,
                cid: numCid,
                acc_type: cleanAccType,
                balance: numBalance,
                status: cleanStatus
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/accounts:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('CHK_ACCOUNT_BALANCE')) {
            userMessage = 'Account balance cannot be negative.';
        } else if (error.message && error.message.includes('FK_ACCOUNT_CUSTOMER')) {
            userMessage = 'The referenced Customer does not exist.';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/loans', async (req, res) => {
    let connection;
    try {
        const {
            cid,
            l_type,
            amount,
            interest,
            term
        } = req.body;

        // Validation: Customer ID is required
        if (cid === undefined || cid === null || cid === '') {
            return res.status(400).json({
                success: false,
                error: 'Customer is required'
            });
        }
        const numCid = Number(cid);
        if (isNaN(numCid)) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID must be a valid number'
            });
        }

        // Validation: Loan Type is required
        if (!l_type || !l_type.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Loan type is required'
            });
        }
        const cleanLType = l_type.trim().toUpperCase();

        // Validation: Principal Amount > 0
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Loan amount must be a number greater than zero'
            });
        }

        // Validation: Interest Rate >= 0
        const numInterest = Number(interest);
        if (isNaN(numInterest) || numInterest < 0) {
            return res.status(400).json({
                success: false,
                error: 'Interest rate must be a number greater than or equal to zero'
            });
        }

        // Validation: Term in months > 0
        const numTerm = Number(term);
        if (isNaN(numTerm) || numTerm <= 0 || !Number.isInteger(numTerm)) {
            return res.status(400).json({
                success: false,
                error: 'Loan term must be a positive integer (months)'
            });
        }

        connection = await getConnection();

        // Verify that Customer exists
        const custCheck = await connection.execute(
            'SELECT cid FROM Customer WHERE cid = :cid',
            { cid: numCid }
        );
        if (!custCheck.rows || custCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Customer with ID ${numCid} does not exist`
            });
        }

        // Generate L_ID safely
        const idResult = await connection.execute(
            'SELECT NVL(MAX(l_id), 600) + 1 AS NEW_L_ID FROM Loan'
        );
        const newLId = idResult.rows[0][0];

        // Insert into Loan using parameterized query
        await connection.execute(
            `INSERT INTO Loan (l_id, cid, l_type, amount, interest, term)
             VALUES (:l_id, :cid, :l_type, :amount, :interest, :term)`,
            {
                l_id: newLId,
                cid: numCid,
                l_type: cleanLType,
                amount: numAmount,
                interest: numInterest,
                term: numTerm
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Loan created successfully',
            data: {
                l_id: newLId,
                cid: numCid,
                l_type: cleanLType,
                amount: numAmount,
                interest: numInterest,
                term: numTerm
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/loans:', error.message);
        let userMessage = error.message;
        if (error.message && (error.message.includes('CHK_LOAN_AMOUNT') || error.message.includes('ORA-20007'))) {
            userMessage = 'Loan amount must be greater than zero.';
        } else if (error.message && error.message.includes('CHK_LOAN_INTEREST')) {
            userMessage = 'Interest rate must be greater than or equal to zero.';
        } else if (error.message && error.message.includes('FK_LOAN_CUSTOMER')) {
            userMessage = 'The referenced Customer does not exist.';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/branches', async (req, res) => {
    let connection;
    try {
        const {
            branch_name,
            city,
            state: branch_state,
            pincode,
            ifsc,
            contact
        } = req.body;

        // Validation: branch_name is required
        if (!branch_name || !branch_name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Branch name is required'
            });
        }

        const cleanBranchName = branch_name.trim();
        const cleanCity = city && city.trim() ? city.trim() : null;
        const cleanState = branch_state && branch_state.trim() ? branch_state.trim() : null;
        const cleanPincode = pincode && pincode.trim() ? pincode.trim() : null;
        const cleanIfsc = ifsc && ifsc.trim() ? ifsc.trim().toUpperCase() : null;
        const cleanContact = contact && contact.trim() ? contact.trim() : null;

        connection = await getConnection();

        // Generate b_id safely
        const idResult = await connection.execute(
            'SELECT NVL(MAX(b_id), 100) + 1 AS NEW_B_ID FROM Branch'
        );
        const newBId = idResult.rows[0][0];

        // Insert into Branch
        await connection.execute(
            `INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact)
             VALUES (:b_id, :branch_name, :city, :state, :pincode, :ifsc, :contact)`,
            {
                b_id: newBId,
                branch_name: cleanBranchName,
                city: cleanCity,
                state: cleanState,
                pincode: cleanPincode,
                ifsc: cleanIfsc,
                contact: cleanContact
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Branch created successfully',
            data: {
                b_id: newBId,
                branch_name: cleanBranchName,
                city: cleanCity,
                state: cleanState,
                pincode: cleanPincode,
                ifsc: cleanIfsc,
                contact: cleanContact
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/branches:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('UQ_BRANCH_IFSC')) {
            userMessage = 'A branch with this IFSC code already exists in the database.';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/employees', async (req, res) => {
    let connection;
    try {
        const {
            first_name,
            last_name,
            salary,
            hire_date,
            b_id
        } = req.body;

        // Validation: first_name is required
        if (!first_name || !first_name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'First name is required'
            });
        }

        const cleanFirstName = first_name.trim();
        const cleanLastName = last_name && last_name.trim() ? last_name.trim() : null;

        // Validation: salary if provided
        let numSalary = null;
        if (salary !== undefined && salary !== null && salary !== '') {
            numSalary = Number(salary);
            if (isNaN(numSalary) || numSalary < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Salary must be a number greater than or equal to zero'
                });
            }
        }

        // Validation: hire_date if provided
        let cleanHireDate = null;
        if (hire_date && hire_date.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(hire_date.trim()) || isNaN(Date.parse(hire_date.trim()))) {
                return res.status(400).json({
                    success: false,
                    error: 'Hire date must be a valid date in YYYY-MM-DD format'
                });
            }
            cleanHireDate = hire_date.trim();
        }

        // Validation: b_id if provided
        let cleanBId = null;
        if (b_id !== undefined && b_id !== null && b_id !== '') {
            cleanBId = Number(b_id);
            if (isNaN(cleanBId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Branch ID must be a valid number'
                });
            }
        }

        connection = await getConnection();

        // Check if branch exists
        if (cleanBId !== null) {
            const branchCheck = await connection.execute(
                'SELECT b_id FROM Branch WHERE b_id = :b_id',
                { b_id: cleanBId }
            );
            if (!branchCheck.rows || branchCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: `Branch with ID ${cleanBId} does not exist`
                });
            }
        }

        // Generate emp_id safely
        const idResult = await connection.execute(
            'SELECT NVL(MAX(emp_id), 200) + 1 AS NEW_EMP_ID FROM Employee'
        );
        const newEmpId = idResult.rows[0][0];

        // Insert into Employee
        await connection.execute(
            `INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id)
             VALUES (:emp_id, :first_name, :last_name, :salary, 
                     CASE WHEN :hire_date IS NOT NULL THEN TO_DATE(:hire_date, 'YYYY-MM-DD') ELSE SYSDATE END, 
                     :b_id)`,
            {
                emp_id: newEmpId,
                first_name: cleanFirstName,
                last_name: cleanLastName,
                salary: numSalary,
                hire_date: cleanHireDate,
                b_id: cleanBId
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Employee created successfully',
            data: {
                emp_id: newEmpId,
                first_name: cleanFirstName,
                last_name: cleanLastName,
                salary: numSalary,
                hire_date: cleanHireDate,
                b_id: cleanBId
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/employees:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('FK_EMPLOYEE_BRANCH')) {
            userMessage = 'The referenced Branch does not exist.';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/creditcards', async (req, res) => {
    let connection;
    try {
        const {
            pno,
            type: card_type,
            card_limit,
            expiry,
            status,
            cvv,
            cid
        } = req.body;

        // Validation: Customer is required
        if (cid === undefined || cid === null || cid === '') {
            return res.status(400).json({
                success: false,
                error: 'Customer is required'
            });
        }
        const numCid = Number(cid);
        if (isNaN(numCid)) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID must be a valid number'
            });
        }

        // Validation: card_limit if provided, default 100000
        let numLimit = 100000;
        if (card_limit !== undefined && card_limit !== null && card_limit !== '') {
            numLimit = Number(card_limit);
            if (isNaN(numLimit) || numLimit <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Card limit must be a number greater than zero'
                });
            }
        }

        const cleanType = (card_type && card_type.trim() ? card_type.trim().toUpperCase() : 'VISA');
        const cleanStatus = (status && status.trim() ? status.trim().toUpperCase() : 'ACTIVE');

        // Validation: expiry if provided
        let cleanExpiry = null;
        if (expiry && expiry.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(expiry.trim()) || isNaN(Date.parse(expiry.trim()))) {
                return res.status(400).json({
                    success: false,
                    error: 'Expiry date must be a valid date in YYYY-MM-DD format'
                });
            }
            cleanExpiry = expiry.trim();
        }

        // Validation: cvv (3 or 4 digits), or auto-generate
        let cleanCvv = cvv && cvv.trim() ? cvv.trim() : String(Math.floor(100 + Math.random() * 900));
        if (!/^\d{3,4}$/.test(cleanCvv)) {
            return res.status(400).json({
                success: false,
                error: 'CVV must be 3 or 4 digits'
            });
        }

        connection = await getConnection();

        // Check if customer exists
        const custCheck = await connection.execute(
            'SELECT cid FROM Customer WHERE cid = :cid',
            { cid: numCid }
        );
        if (!custCheck.rows || custCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Customer with ID ${numCid} does not exist`
            });
        }

        // Generate or validate pno (Card Number)
        let cleanPno = pno && pno.trim() ? pno.trim() : null;
        if (cleanPno) {
            if (!/^\d{16}$/.test(cleanPno)) {
                return res.status(400).json({
                    success: false,
                    error: 'Card number must be exactly 16 digits'
                });
            }
        } else {
            // Auto-generate next 16-digit card number safely based on existing cards
            const maxCardRes = await connection.execute(
                "SELECT TO_CHAR(NVL(MAX(TO_NUMBER(pno)), 4555555555555555) + 1) AS NEW_PNO FROM CreditCard WHERE REGEXP_LIKE(pno, '^[0-9]{16}$')"
            );
            cleanPno = String(maxCardRes.rows[0][0]);
        }

        // Insert into CreditCard using parameterized query
        await connection.execute(
            `INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid)
             VALUES (:pno, :card_type, :card_limit, 
                     CASE WHEN :expiry IS NOT NULL THEN TO_DATE(:expiry, 'YYYY-MM-DD') ELSE ADD_MONTHS(SYSDATE, 60) END, 
                     :status, :cvv, :cid)`,
            {
                pno: cleanPno,
                card_type: cleanType,
                card_limit: numLimit,
                expiry: cleanExpiry,
                status: cleanStatus,
                cvv: cleanCvv,
                cid: numCid
            }
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Credit card created successfully',
            data: {
                pno: cleanPno,
                type: cleanType,
                card_limit: numLimit,
                expiry: cleanExpiry,
                status: cleanStatus,
                cvv: cleanCvv,
                cid: numCid
            }
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Error in POST /api/creditcards:', error.message);
        let userMessage = error.message;
        if (error.message && error.message.includes('PK_CREDITCARD')) {
            userMessage = 'A credit card with this card number already exists in the database.';
        } else if (error.message && error.message.includes('FK_CREDITCARD_CUSTOMER')) {
            userMessage = 'The referenced Customer does not exist.';
        }
        res.status(500).json({
            success: false,
            error: userMessage
        });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// ============================================================================
// SAFE DELETE, CLOSE & DEACTIVATE ENDPOINTS
// ============================================================================

// --- CUSTOMER DEACTIVATE / ACTIVATE & SAFE DELETE ---
app.patch('/api/customers/:cid/status', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        const { status } = req.body;
        if (!cid || isNaN(cid)) {
            return res.status(400).json({ success: false, error: 'A valid Customer ID is required' });
        }
        const cleanStatus = (status || '').trim().toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(cleanStatus)) {
            return res.status(400).json({ success: false, error: 'Status must be either ACTIVE or INACTIVE' });
        }

        connection = await getConnection();
        const hasCustStatus = await tableHasColumn(connection, 'CUSTOMER', 'STATUS');
        if (!hasCustStatus) {
            return res.status(400).json({
                success: false,
                error: 'Customer status management requires a STATUS column, which is not present in the current database schema.'
            });
        }
        const check = await connection.execute('SELECT cid, status FROM Customer WHERE cid = :p_cid', { p_cid: cid });
        if (!check.rows || check.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Customer #${cid} not found` });
        }

        await connection.execute(
            'UPDATE Customer SET status = :p_status WHERE cid = :p_cid',
            { p_status: cleanStatus, p_cid: cid }
        );
        await connection.commit();

        res.json({
            success: true,
            message: `Customer #${cid} status updated to ${cleanStatus}`,
            data: { cid, status: cleanStatus }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in PATCH /api/customers/:cid/status:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// ============================================================================
// CASCADE DELETE HELPERS & DEPENDENCY PREVIEW FUNCTIONS
// ============================================================================

function computePreviewSignature(entity, id, counts) {
    const sortedCounts = Object.keys(counts).sort().reduce((acc, k) => {
        acc[k] = counts[k];
        return acc;
    }, {});
    const payload = JSON.stringify({ entity, id: String(id), counts: sortedCounts });
    return crypto.createHash('sha256').update(payload).digest('hex');
}

async function fetchCustomerPreview(connection, cid) {
    const hasCustStatus = await tableHasColumn(connection, 'CUSTOMER', 'STATUS');
    const hasLoanStatus = await tableHasColumn(connection, 'LOAN', 'STATUS');

    const custSql = hasCustStatus
        ? 'SELECT cid, first_name, last_name, pan, status FROM Customer WHERE cid = :p_cid'
        : 'SELECT cid, first_name, last_name, pan FROM Customer WHERE cid = :p_cid';

    const custRes = await connection.execute(custSql, { p_cid: cid });
    if (!custRes.rows || custRes.rows.length === 0) return null;

    let cId, fName, lName, pan, status;
    if (hasCustStatus) {
        [cId, fName, lName, pan, status] = custRes.rows[0];
    } else {
        [cId, fName, lName, pan] = custRes.rows[0];
        status = 'ACTIVE';
    }
    const fullName = `${fName} ${lName || ''}`.trim();

    const activeLoanSql = hasLoanStatus
        ? "(SELECT COUNT(*) FROM Loan WHERE cid = :p_cid AND status = 'ACTIVE') AS active_loans"
        : "(SELECT COUNT(*) FROM Loan WHERE cid = :p_cid) AS active_loans";

    const countsRes = await connection.execute(`
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
            ${activeLoanSql}
        FROM dual
    `, { p_cid: cid });

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

    const hasProtectedHistory = (txCount > 0 || totalBalance > 0 || activeLoans > 0);
    let protectionReason = null;
    if (hasProtectedHistory) {
        const parts = [];
        if (txCount > 0) parts.push(`${txCount} completed transaction(s)`);
        if (totalBalance > 0) parts.push(`active account balance of ₹${totalBalance}`);
        if (activeLoans > 0) parts.push(`${activeLoans} active loan(s)`);
        protectionReason = `Customer has protected financial history: ${parts.join(', ')}. Financial audit regulations require account and ledger history to be preserved.`;
    }

    return {
        target: { entity: 'Customer', id: cid, label: `${fullName} (CID #${cid})`, status },
        counts,
        total_balance: totalBalance,
        active_loans: activeLoans,
        preserved: [
            { entity: 'Branch & Staff', description: 'Assigned branch and employees will remain registered' },
            { entity: 'Shared Nominees', description: 'Nominees linked to other accounts/customers will be preserved' }
        ],
        has_protected_history: hasProtectedHistory,
        financial_protection_reason: protectionReason,
        can_delete: !hasProtectedHistory,
        preview_signature: computePreviewSignature('Customer', cid, counts),
        recommended_alternative: hasCustStatus ? {
            action: 'deactivate_customer',
            label: 'Deactivate Customer Instead',
            api_endpoint: `/api/customers/${cid}/status`,
            method: 'PATCH',
            payload: { status: 'INACTIVE' }
        } : null
    };
}

async function fetchAccountPreview(connection, acc_id) {
    const hasAccStatus = await tableHasColumn(connection, 'ACCOUNT', 'STATUS');
    const accSql = hasAccStatus
        ? 'SELECT acc_id, balance, status, cid, acc_type FROM Account WHERE acc_id = :p_acc'
        : 'SELECT acc_id, balance, cid, acc_type FROM Account WHERE acc_id = :p_acc';
    const accRes = await connection.execute(accSql, { p_acc: acc_id });
    if (!accRes.rows || accRes.rows.length === 0) return null;
    let aId, balance, status, cid, accType;
    if (hasAccStatus) {
        [aId, balance, status, cid, accType] = accRes.rows[0];
    } else {
        [aId, balance, cid, accType] = accRes.rows[0];
        status = 'ACTIVE';
    }

    const countsRes = await connection.execute(`
        SELECT
            (SELECT COUNT(*) FROM Owns WHERE acc_id = :p_acc) AS owns_count,
            (SELECT COUNT(*) FROM Nominee WHERE acc_id = :p_acc) AS nom_count,
            (SELECT COUNT(*) FROM "TRANSACTION" WHERE acc_id = :p_acc) AS tx_count,
            (SELECT COUNT(*) FROM Responsible_For WHERE t_id IN (SELECT t_id FROM "TRANSACTION" WHERE acc_id = :p_acc)) AS resp_count
        FROM dual
    `, { p_acc: acc_id });

    const [ownsCount, nomCount, txCount, respCount] = countsRes.rows[0];

    const counts = {
        Account: 1,
        Owns: ownsCount,
        Nominee: nomCount,
        Responsible_For: respCount,
        Transaction: txCount
    };

    const hasProtectedHistory = (txCount > 0 || balance > 0 || balance < 0);
    let protectionReason = null;
    if (hasProtectedHistory) {
        const parts = [];
        if (txCount > 0) parts.push(`${txCount} completed transaction(s)`);
        if (balance !== 0) parts.push(`non-zero balance of ₹${balance}`);
        protectionReason = `Account #${acc_id} has protected financial history: ${parts.join(', ')}. Financial regulations prohibit hard deletion of accounts with historical transactions or active balances.`;
    }

    return {
        target: { entity: 'Account', id: acc_id, label: `Account #${acc_id} (${accType || 'Savings'}, Bal: ₹${balance})`, status, balance, cid },
        counts,
        balance,
        preserved: [
            { entity: 'Customer', description: `Customer #${cid} will remain registered` },
            { entity: 'Shared Nominees', description: 'Nominees linked to other accounts will be preserved' }
        ],
        has_protected_history: hasProtectedHistory,
        financial_protection_reason: protectionReason,
        can_delete: !hasProtectedHistory,
        preview_signature: computePreviewSignature('Account', acc_id, counts),
        recommended_alternative: hasAccStatus ? {
            action: 'close_account',
            label: 'Close Account Instead',
            api_endpoint: `/api/accounts/${acc_id}/close`,
            method: 'POST'
        } : null
    };
}

async function fetchCreditCardPreview(connection, pno) {
    const hasCardStatus = await tableHasColumn(connection, 'CREDITCARD', 'STATUS');
    const cardSql = hasCardStatus
        ? 'SELECT pno, card_limit, type, status, cid FROM CreditCard WHERE pno = :p_pno'
        : 'SELECT pno, card_limit, type, cid FROM CreditCard WHERE pno = :p_pno';
    const cardRes = await connection.execute(cardSql, { p_pno: pno });
    if (!cardRes.rows || cardRes.rows.length === 0) return null;
    let pNo, limit, type, status, cid;
    if (hasCardStatus) {
        [pNo, limit, type, status, cid] = cardRes.rows[0];
    } else {
        [pNo, limit, type, cid] = cardRes.rows[0];
        status = 'ACTIVE';
    }

    const counts = {
        CreditCard: 1
    };

    return {
        target: { entity: 'CreditCard', id: pno, label: `Credit Card ending in ${pno.slice(-4)} (${type}, Limit: ₹${limit})`, status, cid },
        counts,
        preserved: [
            { entity: 'Customer', description: `Customer #${cid} and all accounts will remain intact` }
        ],
        has_protected_history: false,
        financial_protection_reason: null,
        can_delete: true,
        preview_signature: computePreviewSignature('CreditCard', pno, counts),
        recommended_alternative: hasCardStatus ? {
            action: 'block_card',
            label: status === 'BLOCKED' ? 'Close Card Instead' : 'Block Card Instead',
            api_endpoint: `/api/creditcards/${pno}/status`,
            method: 'PATCH',
            payload: { status: status === 'BLOCKED' ? 'CLOSED' : 'BLOCKED' }
        } : null
    };
}

async function fetchLoanPreview(connection, l_id) {
    const hasLoanStatus = await tableHasColumn(connection, 'LOAN', 'STATUS');
    const loanSql = hasLoanStatus
        ? 'SELECT l_id, amount, interest, term, status, cid, l_type FROM Loan WHERE l_id = :p_lid'
        : 'SELECT l_id, amount, interest, term, cid, l_type FROM Loan WHERE l_id = :p_lid';
    const loanRes = await connection.execute(loanSql, { p_lid: l_id });
    if (!loanRes.rows || loanRes.rows.length === 0) return null;
    let lid, amount, rate, tenure, status, cid, lType;
    if (hasLoanStatus) {
        [lid, amount, rate, tenure, status, cid, lType] = loanRes.rows[0];
    } else {
        [lid, amount, rate, tenure, cid, lType] = loanRes.rows[0];
        status = 'ACTIVE';
    }

    const respRes = await connection.execute(
        'SELECT COUNT(*) FROM Responsible_For WHERE l_id = :p_lid',
        { p_lid: l_id }
    );
    const respCount = respRes.rows[0][0];

    const counts = {
        Loan: 1,
        Responsible_For: respCount
    };

    const isCurrentActive = (status === 'ACTIVE');

    return {
        target: { entity: 'Loan', id: l_id, label: `Loan #${l_id} (${lType || 'Personal'}, ₹${amount})`, status, cid },
        counts,
        preserved: [
            { entity: 'Customer', description: `Customer #${cid} will remain intact` },
            { entity: 'Employee & Branch', description: 'Assigned loan officers and branch will remain intact' }
        ],
        has_protected_history: isCurrentActive,
        financial_protection_reason: isCurrentActive ? `Loan #${l_id} is currently an active obligation. Settling the loan is recommended to preserve interest, tenure, and audit history.` : null,
        can_delete: true,
        preview_signature: computePreviewSignature('Loan', l_id, counts),
        recommended_alternative: hasLoanStatus ? {
            action: 'settle_loan',
            label: 'Settle Loan Instead',
            api_endpoint: `/api/loans/${l_id}/settle`,
            method: 'POST'
        } : null
    };
}

async function fetchEmployeePreview(connection, emp_id) {
    const hasEmpStatus = await tableHasColumn(connection, 'EMPLOYEE', 'STATUS');
    const empSql = hasEmpStatus
        ? 'SELECT emp_id, first_name, last_name, salary, b_id, status FROM Employee WHERE emp_id = :p_empid'
        : 'SELECT emp_id, first_name, last_name, salary, b_id FROM Employee WHERE emp_id = :p_empid';
    const empRes = await connection.execute(empSql, { p_empid: emp_id });
    if (!empRes.rows || empRes.rows.length === 0) return null;
    let empid, fname, lname, salary, bid, status;
    if (hasEmpStatus) {
        [empid, fname, lname, salary, bid, status] = empRes.rows[0];
    } else {
        [empid, fname, lname, salary, bid] = empRes.rows[0];
        status = 'ACTIVE';
    }
    const fullName = `${fname} ${lname || ''}`.trim();

    const countsRes = await connection.execute(`
        SELECT
            (SELECT COUNT(*) FROM Responsible_For WHERE emp_id = :p_empid) AS resp_count,
            (SELECT COUNT(*) FROM Customer WHERE emp_id = :p_empid) AS cust_count
        FROM dual
    `, { p_empid: emp_id });

    const [respCount, custCount] = countsRes.rows[0];

    const counts = {
        Employee: 1,
        Responsible_For: respCount
    };

    return {
        target: { entity: 'Employee', id: emp_id, label: `${fullName} (Employee #${emp_id})`, status, b_id: bid },
        counts,
        customer_unlink_count: custCount,
        preserved: [
            { entity: 'Branch', description: `Branch #${bid} will remain active` },
            { entity: 'Assigned Customers', description: `${custCount} customer(s) assigned to this employee will have their relationship unlinked safely (emp_id set to NULL), preserving all customer profiles and accounts.` }
        ],
        has_protected_history: false,
        financial_protection_reason: null,
        can_delete: true,
        preview_signature: computePreviewSignature('Employee', emp_id, counts),
        recommended_alternative: hasEmpStatus ? {
            action: 'deactivate_employee',
            label: 'Deactivate Employee Instead',
            api_endpoint: `/api/employees/${emp_id}/status`,
            method: 'PATCH',
            payload: { status: 'INACTIVE' }
        } : null
    };
}

async function fetchBranchPreview(connection, b_id) {
    const hasBranchStatus = await tableHasColumn(connection, 'BRANCH', 'STATUS');
    const branchSql = hasBranchStatus
        ? 'SELECT b_id, branch_name, city, ifsc, status FROM Branch WHERE b_id = :p_bid'
        : 'SELECT b_id, branch_name, city, ifsc FROM Branch WHERE b_id = :p_bid';
    const bRes = await connection.execute(branchSql, { p_bid: b_id });
    if (!bRes.rows || bRes.rows.length === 0) return null;
    let bid, name, city, ifsc, status;
    if (hasBranchStatus) {
        [bid, name, city, ifsc, status] = bRes.rows[0];
    } else {
        [bid, name, city, ifsc] = bRes.rows[0];
        status = 'ACTIVE';
    }

    const countsRes = await connection.execute(`
        SELECT
            (SELECT COUNT(*) FROM Employee WHERE b_id = :p_bid) AS emp_count,
            (SELECT COUNT(*) FROM Responsible_For WHERE b_id = :p_bid) AS resp_count
        FROM dual
    `, { p_bid: b_id });

    const [empCount, respCount] = countsRes.rows[0];

    const counts = {
        Branch: 1,
        Employee: empCount,
        Responsible_For: respCount
    };

    const hasEmployees = (empCount > 0);

    return {
        target: { entity: 'Branch', id: b_id, label: `${name} (Branch #${b_id}, ${city || ''})`, status },
        counts,
        preserved: [],
        has_protected_history: hasEmployees,
        financial_protection_reason: hasEmployees ? `Branch #${b_id} currently has ${empCount} employee(s) assigned. Under corporate hierarchy rules, a branch with assigned personnel cannot be permanently deleted. Please reassign or delete employees first${hasBranchStatus ? ', or deactivate the branch' : ''}.` : null,
        can_delete: !hasEmployees,
        preview_signature: computePreviewSignature('Branch', b_id, counts),
        recommended_alternative: hasBranchStatus ? {
            action: 'deactivate_branch',
            label: 'Deactivate Branch Instead',
            api_endpoint: `/api/branches/${b_id}/status`,
            method: 'PATCH',
            payload: { status: 'INACTIVE' }
        } : null
    };
}

async function fetchNomineePreview(connection, n_id) {
    const nomRes = await connection.execute(
        'SELECT n_id, first_name, last_name, relationship, acc_id, cid FROM Nominee WHERE n_id = :p_nid',
        { p_nid: n_id }
    );
    if (!nomRes.rows || nomRes.rows.length === 0) return null;
    const [nid, fname, lname, rel, accId, cid] = nomRes.rows[0];
    const fullName = `${fname} ${lname || ''}`.trim();

    const ownsRes = await connection.execute(
        'SELECT COUNT(*) FROM Owns WHERE n_id = :p_nid',
        { p_nid: n_id }
    );
    const ownsCount = ownsRes.rows[0][0];

    const counts = {
        Nominee: 1,
        Owns: ownsCount
    };

    return {
        target: { entity: 'Nominee', id: n_id, label: `${fullName} (Nominee #${n_id}, ${rel || 'Nominee'})`, acc_id: accId, cid },
        counts,
        preserved: [
            { entity: 'Account', description: `Account #${accId} balance and history remain unaffected` },
            { entity: 'Customer', description: `Customer #${cid} record remains unaffected` }
        ],
        has_protected_history: false,
        financial_protection_reason: null,
        can_delete: true,
        preview_signature: computePreviewSignature('Nominee', n_id, counts),
        recommended_alternative: null
    };
}

async function fetchCustomerPhonePreview(connection, cid, phone) {
    const phRes = await connection.execute(
        'SELECT cid, phone FROM Customer_Phone WHERE cid = :p_cid AND phone = :p_phone',
        { p_cid: cid, p_phone: phone }
    );
    if (!phRes.rows || phRes.rows.length === 0) return null;

    const counts = {
        Customer_Phone: 1
    };

    return {
        target: { entity: 'Customer_Phone', id: `${cid}:${phone}`, label: `Phone ${phone} (Customer #${cid})`, cid, phone },
        counts,
        preserved: [
            { entity: 'Customer', description: `Customer #${cid} profile, accounts, loans, and credit cards remain intact` }
        ],
        has_protected_history: false,
        financial_protection_reason: null,
        can_delete: true,
        preview_signature: computePreviewSignature('Customer_Phone', `${cid}:${phone}`, counts),
        recommended_alternative: null
    };
}

async function fetchTransactionPreview(connection, t_id) {
    const txRes = await connection.execute(
        'SELECT t_id, acc_id, trans_date, "TYPE", amount, "MODE", status FROM "TRANSACTION" WHERE t_id = :p_tid',
        { p_tid: t_id }
    );
    if (!txRes.rows || txRes.rows.length === 0) return null;
    const [tid, accId, transDate, origType, amount, mode, origStatus] = txRes.rows[0];

    const accRes = await connection.execute(
        'SELECT acc_id, balance, status, acc_type FROM Account WHERE acc_id = :p_acc',
        { p_acc: accId }
    );
    const hasAccount = (accRes.rows && accRes.rows.length > 0);
    const [acc_id, currentBalance, accStatus, accType] = hasAccount ? accRes.rows[0] : [accId, 0, 'UNKNOWN', 'UNKNOWN'];

    const respRes = await connection.execute(
        'SELECT COUNT(*) FROM Responsible_For WHERE t_id = :p_tid',
        { p_tid: t_id }
    );
    const respCount = respRes.rows[0][0];

    const uType = (origType || '').toUpperCase();
    const uStatus = (origStatus || '').toUpperCase();

    let canDelete = true;
    let balanceEffect = 0;
    let newBalance = currentBalance;
    let explanation = '';
    let rejectionReason = null;

    if (!hasAccount) {
        canDelete = false;
        rejectionReason = `Associated Account #${accId} was not found in the database.`;
    } else if (uStatus === 'REVERSED') {
        canDelete = false;
        rejectionReason = `Transaction #${t_id} is already marked as REVERSED. Deleting it would compromise account ledger consistency.`;
    } else if (uStatus === 'SUCCESS') {
        if (uType === 'DEPOSIT' || uType === 'CREDIT') {
            balanceEffect = -amount;
            newBalance = currentBalance - amount;
            if (currentBalance < amount) {
                canDelete = false;
                rejectionReason = `Insufficient balance (₹${currentBalance}) in Account #${accId} to reverse deposit of ₹${amount}.`;
            } else {
                explanation = `Reversing this deposit will deduct ₹${amount.toLocaleString('en-IN')} from Account #${accId} (Current: ₹${currentBalance.toLocaleString('en-IN')} → New: ₹${newBalance.toLocaleString('en-IN')}).`;
            }
        } else if (uType === 'WITHDRAWAL' || uType === 'WITHDRAW' || uType === 'DEBIT') {
            balanceEffect = +amount;
            newBalance = currentBalance + amount;
            explanation = `Reversing this withdrawal will credit ₹${amount.toLocaleString('en-IN')} back to Account #${accId} (Current: ₹${currentBalance.toLocaleString('en-IN')} → New: ₹${newBalance.toLocaleString('en-IN')}).`;
        } else {
            canDelete = false;
            rejectionReason = `Transaction type '${origType}' cannot be automatically reversed. Only DEPOSIT and WITHDRAWAL transactions are supported for financial reversal.`;
        }
    } else {
        // Status is FAILED or PENDING: no balance was altered by TRG_UPDATE_BALANCE
        balanceEffect = 0;
        newBalance = currentBalance;
        explanation = `Transaction status is '${origStatus}'. It did not alter account balance upon entry, so deleting it will remove the record without changing Account #${accId} balance.`;
    }

    const counts = {
        Transaction: 1,
        Responsible_For: respCount
    };

    return {
        target: {
            entity: 'Transaction',
            id: t_id,
            acc_id: accId,
            type: uType,
            amount,
            mode,
            status: uStatus,
            trans_date: transDate,
            label: `Transaction #${t_id} (${uType} ₹${amount.toLocaleString('en-IN')})`
        },
        counts,
        current_balance: currentBalance,
        new_balance: newBalance,
        balance_effect: balanceEffect,
        can_delete: canDelete,
        explanation: explanation,
        rejection_reason: rejectionReason,
        preview_signature: computePreviewSignature('Transaction', t_id, {
            Transaction: 1,
            Responsible_For: respCount,
            acc_id: accId,
            amount,
            type: uType,
            status: uStatus,
            current_balance: currentBalance
        })
    };
}

// --- CUSTOMER PREVIEW & CASCADING DELETE ---
app.get('/api/customers/:cid/delete-preview', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        if (!cid || isNaN(cid)) {
            return res.status(400).json({ success: false, error: 'A valid Customer ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchCustomerPreview(connection, cid);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Customer #${cid} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/customers/:cid/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/customers/:cid', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        if (!cid || isNaN(cid)) {
            return res.status(400).json({ success: false, error: 'A valid Customer ID is required' });
        }

        connection = await getConnection();
        const preview = await fetchCustomerPreview(connection, cid);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Customer #${cid} not found` });
        }

        // 1. Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The customer dependency state has changed since preview was generated. Please refresh the preview and review updated dependencies before confirming.'
            });
        }

        // 2. Financial history guard
        const isAcademicOverride = (req.body?.academic_override === true || req.query?.academic_override === 'true');
        if (preview.has_protected_history && !isAcademicOverride) {
            return res.status(400).json({
                success: false,
                protected_financial_history: true,
                error: `Cannot permanently delete customer #${cid} with protected financial history (${preview.financial_protection_reason}). Please deactivate the customer instead to preserve audit records, or specify academic_override if authorized for educational demonstration.`,
                recommended_alternative: preview.recommended_alternative,
                preview
            });
        }

        // 3. Multi-statement cascading deletion in strict foreign key order
        // 3a. Transactions & transaction responsibilities (only if academic override was confirmed)
        if (isAcademicOverride && preview.counts.Transaction > 0) {
            await connection.execute(`
                DELETE FROM Responsible_For 
                WHERE t_id IN (
                    SELECT t_id FROM "TRANSACTION" 
                    WHERE acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)
                )
            `, { p_cid: cid });

            await connection.execute(`
                DELETE FROM "TRANSACTION" 
                WHERE acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)
            `, { p_cid: cid });
        }

        // 3b. Loans & loan responsibilities
        await connection.execute(`
            DELETE FROM Responsible_For 
            WHERE l_id IN (SELECT l_id FROM Loan WHERE cid = :p_cid)
        `, { p_cid: cid });
        await connection.execute('DELETE FROM Loan WHERE cid = :p_cid', { p_cid: cid });

        // 3c. Credit cards
        await connection.execute('DELETE FROM CreditCard WHERE cid = :p_cid', { p_cid: cid });

        // 3d. Ownership relationships (Owns)
        await connection.execute(`
            DELETE FROM Owns 
            WHERE cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)
        `, { p_cid: cid });

        // 3e. Unlink shared nominees so they remain registered for other customers/accounts
        await connection.execute(`
            UPDATE Nominee SET cid = NULL, acc_id = NULL 
            WHERE (cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid))
              AND n_id IN (SELECT n_id FROM Owns WHERE cid <> :p_cid)
        `, { p_cid: cid });

        // 3f. Delete unshared nominees
        await connection.execute(`
            DELETE FROM Nominee 
            WHERE (cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid))
              AND n_id NOT IN (SELECT n_id FROM Owns WHERE cid <> :p_cid)
        `, { p_cid: cid });

        // 3g. Accounts
        await connection.execute('DELETE FROM Account WHERE cid = :p_cid', { p_cid: cid });

        // 3h. Customer Phones
        await connection.execute('DELETE FROM Customer_Phone WHERE cid = :p_cid', { p_cid: cid });

        // 3i. Customer root record
        await connection.execute('DELETE FROM Customer WHERE cid = :p_cid', { p_cid: cid });

        await connection.commit();

        res.json({
            success: true,
            message: `Customer #${cid} and all permitted dependent records deleted successfully.`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/customers/:cid:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- CUSTOMER PHONES MANAGEMENT ---
app.get('/api/customers/:cid/phones', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        if (!cid || isNaN(cid)) {
            return res.status(400).json({ success: false, error: 'A valid Customer ID is required' });
        }
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT cid, phone FROM Customer_Phone WHERE cid = :p_cid ORDER BY phone',
            { p_cid: cid }
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/customers/:cid/phones', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        const { phone } = req.body;
        if (!cid || isNaN(cid)) {
            return res.status(400).json({ success: false, error: 'A valid Customer ID is required' });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }
        const cleanPhone = phone.trim();

        connection = await getConnection();
        await connection.execute(
            'INSERT INTO Customer_Phone (cid, phone) VALUES (:p_cid, :p_phone)',
            { p_cid: cid, p_phone: cleanPhone }
        );
        await connection.commit();
        res.json({
            success: true,
            message: `Phone number ${cleanPhone} added for customer #${cid}`,
            data: { cid, phone: cleanPhone }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        let msg = error.message;
        if (msg.includes('PK_CUSTOMER_PHONE')) msg = 'This phone number is already registered for this customer.';
        res.status(500).json({ success: false, error: msg });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/customers/:cid/phones/:phone/delete-preview', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        const phone = req.params.phone;
        if (!cid || isNaN(cid) || !phone) {
            return res.status(400).json({ success: false, error: 'Valid Customer ID and Phone are required' });
        }
        connection = await getConnection();
        const preview = await fetchCustomerPhonePreview(connection, cid, phone);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Phone record ${phone} not found for customer #${cid}` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/customers/:cid/phones/:phone/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/customers/:cid/phones/:phone', async (req, res) => {
    let connection;
    try {
        const cid = Number(req.params.cid);
        const phone = req.params.phone;
        if (!cid || isNaN(cid) || !phone) {
            return res.status(400).json({ success: false, error: 'Valid Customer ID and Phone are required' });
        }

        connection = await getConnection();
        const preview = await fetchCustomerPhonePreview(connection, cid, phone);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Phone record ${phone} not found for customer #${cid}` });
        }

        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The phone record state has changed since preview was generated. Please refresh the preview before confirming.'
            });
        }

        const result = await connection.execute(
            'DELETE FROM Customer_Phone WHERE cid = :p_cid AND phone = :p_phone',
            { p_cid: cid, p_phone: phone }
        );
        if (result.rowsAffected === 0) {
            return res.status(404).json({ success: false, error: `Phone record ${phone} not found for customer #${cid}` });
        }
        await connection.commit();
        res.json({
            success: true,
            message: `Phone number ${phone} removed for customer #${cid}`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- ACCOUNT CLOSE & SAFE DELETE ---
app.post('/api/accounts/:acc_id/close', async (req, res) => {
    let connection;
    try {
        const acc_id = Number(req.params.acc_id);
        if (!acc_id || isNaN(acc_id)) {
            return res.status(400).json({ success: false, error: 'A valid Account ID is required' });
        }

        connection = await getConnection();
        const check = await connection.execute('SELECT balance, status FROM Account WHERE acc_id = :p_acc_id', { p_acc_id: acc_id });
        if (!check.rows || check.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Account #${acc_id} not found` });
        }

        const [balance, status] = check.rows[0];
        if (status === 'CLOSED') {
            return res.status(400).json({ success: false, error: `Account #${acc_id} is already closed.` });
        }
        if (balance > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot close account #${acc_id} with an outstanding balance of ₹${balance}. Balance must be zero before closing.`
            });
        }
        if (balance < 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot close account #${acc_id} with negative balance (₹${balance}).`
            });
        }

        await connection.execute(
            "UPDATE Account SET status = 'CLOSED' WHERE acc_id = :p_acc_id",
            { p_acc_id: acc_id }
        );
        await connection.commit();

        res.json({
            success: true,
            message: `Account #${acc_id} has been closed successfully. No further deposits or withdrawals can be performed.`,
            data: { acc_id, status: 'CLOSED' }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in POST /api/accounts/:acc_id/close:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/accounts/:acc_id/delete-preview', async (req, res) => {
    let connection;
    try {
        const acc_id = Number(req.params.acc_id);
        if (!acc_id || isNaN(acc_id)) {
            return res.status(400).json({ success: false, error: 'A valid Account ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchAccountPreview(connection, acc_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Account #${acc_id} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/accounts/:acc_id/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/accounts/:acc_id', async (req, res) => {
    let connection;
    try {
        const acc_id = Number(req.params.acc_id);
        if (!acc_id || isNaN(acc_id)) {
            return res.status(400).json({ success: false, error: 'A valid Account ID is required' });
        }

        connection = await getConnection();
        const preview = await fetchAccountPreview(connection, acc_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Account #${acc_id} not found` });
        }

        // 1. Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The account dependency state has changed since preview was generated. Please refresh the preview and review updated dependencies before confirming.'
            });
        }

        // 2. Financial history guard
        const isAcademicOverride = (req.body?.academic_override === true || req.query?.academic_override === 'true');
        if (preview.has_protected_history && !isAcademicOverride) {
            return res.status(400).json({
                success: false,
                protected_financial_history: true,
                error: `Cannot permanently delete account #${acc_id} with protected financial history (${preview.financial_protection_reason}). Please close the account instead, or specify academic_override if authorized for educational demonstration.`,
                recommended_alternative: preview.recommended_alternative,
                preview
            });
        }

        // 3. Multi-statement cascading deletion in strict foreign key order
        if (isAcademicOverride && preview.counts.Transaction > 0) {
            await connection.execute(`
                DELETE FROM Responsible_For 
                WHERE t_id IN (SELECT t_id FROM "TRANSACTION" WHERE acc_id = :p_acc_id)
            `, { p_acc_id: acc_id });

            await connection.execute(`
                DELETE FROM "TRANSACTION" WHERE acc_id = :p_acc_id
            `, { p_acc_id: acc_id });
        }

        // 3a. Ownership
        await connection.execute('DELETE FROM Owns WHERE acc_id = :p_acc_id', { p_acc_id: acc_id });

        // 3b. Unlink shared nominees
        await connection.execute(`
            UPDATE Nominee SET acc_id = NULL 
            WHERE acc_id = :p_acc_id 
              AND n_id IN (SELECT n_id FROM Owns WHERE acc_id <> :p_acc_id)
        `, { p_acc_id: acc_id });

        // 3c. Delete unshared nominees
        await connection.execute(`
            DELETE FROM Nominee 
            WHERE acc_id = :p_acc_id 
              AND n_id NOT IN (SELECT n_id FROM Owns WHERE acc_id <> :p_acc_id)
        `, { p_acc_id: acc_id });

        // 3d. Delete account root record
        await connection.execute('DELETE FROM Account WHERE acc_id = :p_acc_id', { p_acc_id: acc_id });

        await connection.commit();

        res.json({
            success: true,
            message: `Account #${acc_id} and dependent records deleted successfully.`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/accounts/:acc_id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- TRANSACTIONS REVERSAL & PERMANENT DELETION ---
const inFlightTxDeletes = new Set();

app.get('/api/transactions/:t_id/delete-preview', async (req, res) => {
    let connection;
    try {
        const t_id = Number(req.params.t_id);
        if (!t_id || isNaN(t_id)) {
            return res.status(400).json({ success: false, error: 'A valid Transaction ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchTransactionPreview(connection, t_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Transaction #${t_id} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/transactions/:t_id/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/transactions/:t_id', async (req, res) => {
    let connection;
    const t_id = Number(req.params.t_id);
    if (!t_id || isNaN(t_id)) {
        return res.status(400).json({ success: false, error: 'A valid Transaction ID is required' });
    }

    if (inFlightTxDeletes.has(t_id)) {
        return res.status(409).json({
            success: false,
            error: `Deletion of Transaction #${t_id} is already in progress. Please do not submit duplicate requests.`
        });
    }

    inFlightTxDeletes.add(t_id);

    try {
        connection = await getConnection();

        // 1. Fetch preview and check staleness
        const preview = await fetchTransactionPreview(connection, t_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Transaction #${t_id} not found or already deleted.` });
        }

        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'Account balance or transaction state has changed since preview was generated. Please review the updated preview.'
            });
        }

        if (!preview.can_delete) {
            return res.status(400).json({
                success: false,
                error: preview.rejection_reason || 'This transaction cannot be safely reversed.'
            });
        }

        // 2. Lock rows for update
        const lockTx = await connection.execute(
            'SELECT t_id, acc_id, "TYPE", amount, status FROM "TRANSACTION" WHERE t_id = :p_tid FOR UPDATE',
            { p_tid: t_id }
        );
        if (!lockTx.rows || lockTx.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Transaction #${t_id} not found.` });
        }
        const [origTid, accId, origType, amount, origStatus] = lockTx.rows[0];

        const lockAcc = await connection.execute(
            'SELECT acc_id, balance, status FROM Account WHERE acc_id = :p_acc FOR UPDATE',
            { p_acc: accId }
        );
        if (!lockAcc.rows || lockAcc.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Associated Account #${accId} not found.` });
        }
        const [aId, accBal, accStatus] = lockAcc.rows[0];

        const uType = (origType || '').toUpperCase();
        const uStatus = (origStatus || '').toUpperCase();

        let newBal = accBal;
        if (uStatus === 'SUCCESS') {
            if (uType === 'DEPOSIT' || uType === 'CREDIT') {
                if (accBal < amount) {
                    await connection.rollback();
                    return res.status(400).json({
                        success: false,
                        error: `Insufficient account balance (₹${accBal}) to reverse deposit of ₹${amount}.`
                    });
                }
                newBal = accBal - amount;
                await connection.execute(
                    'UPDATE Account SET balance = balance - :p_amt WHERE acc_id = :p_acc',
                    { p_amt: amount, p_acc: accId }
                );
            } else if (uType === 'WITHDRAWAL' || uType === 'WITHDRAW' || uType === 'DEBIT') {
                newBal = accBal + amount;
                await connection.execute(
                    'UPDATE Account SET balance = balance + :p_amt WHERE acc_id = :p_acc',
                    { p_amt: amount, p_acc: accId }
                );
            } else {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Unsupported transaction type '${origType}' for automatic reversal.`
                });
            }
        }

        // 3. Delete dependent rows in Responsible_For
        await connection.execute(
            'DELETE FROM Responsible_For WHERE t_id = :p_tid',
            { p_tid: t_id }
        );

        // 4. Delete transaction row
        const delRes = await connection.execute(
            'DELETE FROM "TRANSACTION" WHERE t_id = :p_tid',
            { p_tid: t_id }
        );

        if (delRes.rowsAffected === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: `Transaction #${t_id} could not be deleted.` });
        }

        await connection.commit();

        res.json({
            success: true,
            message: `Transaction #${t_id} deleted and financial effect reversed successfully.`,
            data: {
                t_id,
                acc_id: accId,
                type: uType,
                amount,
                previous_balance: accBal,
                new_balance: newBal,
                balance_effect: preview.balance_effect
            }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/transactions/:t_id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        inFlightTxDeletes.delete(t_id);
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.post('/api/transactions/:t_id/reverse', async (req, res) => {
    let connection;
    try {
        const t_id = Number(req.params.t_id);
        if (!t_id || isNaN(t_id)) {
            return res.status(400).json({ success: false, error: 'A valid Transaction ID is required' });
        }

        connection = await getConnection();
        const txQuery = await connection.execute(
            'SELECT t_id, acc_id, "TYPE", amount, status FROM "TRANSACTION" WHERE t_id = :p_tid',
            { p_tid: t_id }
        );
        if (!txQuery.rows || txQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Transaction #${t_id} not found` });
        }

        const [origTid, accId, origType, amount, origStatus] = txQuery.rows[0];
        if (origStatus === 'REVERSED') {
            return res.status(400).json({ success: false, error: `Transaction #${t_id} has already been reversed.` });
        }
        if (origStatus !== 'SUCCESS') {
            return res.status(400).json({ success: false, error: `Only successful transactions can be reversed.` });
        }

        const accQuery = await connection.execute(
            'SELECT balance, status FROM Account WHERE acc_id = :p_acc_id',
            { p_acc_id: accId }
        );
        if (!accQuery.rows || accQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Associated Account #${accId} not found` });
        }
        const [accBal, accStatus] = accQuery.rows[0];
        if (accStatus === 'CLOSED') {
            return res.status(400).json({ success: false, error: `Cannot reverse transaction on a closed account (#${accId}).` });
        }

        const uType = (origType || '').toUpperCase();
        let revType;
        if (uType === 'DEPOSIT' || uType === 'CREDIT') {
            // Reversing a deposit requires a WITHDRAWAL of the amount
            if (accBal < amount) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient account balance (₹${accBal}) to reverse deposit of ₹${amount}.`
                });
            }
            revType = 'WITHDRAWAL';
        } else if (uType === 'WITHDRAWAL' || uType === 'WITHDRAW' || uType === 'DEBIT') {
            // Reversing a withdrawal requires a DEPOSIT of the amount
            revType = 'DEPOSIT';
        } else {
            return res.status(400).json({
                success: false,
                error: `Transaction type '${origType}' cannot be automatically reversed.`
            });
        }

        // Generate next t_id
        const tidRes = await connection.execute('SELECT NVL(MAX(t_id), 700) + 1 AS NEW_TID FROM "TRANSACTION"');
        const nextTid = tidRes.rows[0][0];

        // Insert reversal transaction (TRG_UPDATE_BALANCE will update Account.balance by +amount or -amount)
        await connection.execute(
            `INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
             VALUES (:p_new_tid, :p_acc_id, SYSDATE, :p_rev_type, :p_amount, 'REVERSAL', 'SUCCESS')`,
            {
                p_new_tid: nextTid,
                p_acc_id: accId,
                p_rev_type: revType,
                p_amount: amount
            }
        );

        // Mark original transaction as REVERSED (UPDATE does not fire TRG_UPDATE_BALANCE, avoiding double updates)
        await connection.execute(
            "UPDATE \"TRANSACTION\" SET status = 'REVERSED' WHERE t_id = :p_orig_tid",
            { p_orig_tid: t_id }
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Transaction #${t_id} reversed successfully. Offset transaction #${nextTid} (${revType} of ₹${amount}) created.`,
            data: {
                original_t_id: t_id,
                reversal_t_id: nextTid,
                acc_id: accId,
                amount: amount,
                type: revType
            }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in POST /api/transactions/:t_id/reverse:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- LOAN SETTLE & SAFE DELETE ---
app.post('/api/loans/:l_id/settle', async (req, res) => {
    let connection;
    try {
        const l_id = Number(req.params.l_id);
        if (!l_id || isNaN(l_id)) {
            return res.status(400).json({ success: false, error: 'A valid Loan ID is required' });
        }

        connection = await getConnection();
        const hasLoanStatus = await tableHasColumn(connection, 'LOAN', 'STATUS');
        if (!hasLoanStatus) {
            return res.status(400).json({ success: false, error: 'Loan settlement requires a STATUS column, which is not present in the current database schema.' });
        }
        const check = await connection.execute('SELECT l_id, status FROM Loan WHERE l_id = :p_lid', { p_lid: l_id });
        if (!check.rows || check.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Loan #${l_id} not found` });
        }

        const currentStatus = check.rows[0][1];
        if (currentStatus === 'SETTLED' || currentStatus === 'CLOSED') {
            return res.status(400).json({ success: false, error: `Loan #${l_id} is already settled.` });
        }

        await connection.execute(
            "UPDATE Loan SET status = 'SETTLED' WHERE l_id = :p_lid",
            { p_lid: l_id }
        );
        await connection.commit();

        res.json({
            success: true,
            message: `Loan #${l_id} has been marked as SETTLED. Record preserved in audit history.`,
            data: { l_id, status: 'SETTLED' }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in POST /api/loans/:l_id/settle:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/loans/:l_id/delete-preview', async (req, res) => {
    let connection;
    try {
        const l_id = Number(req.params.l_id);
        if (!l_id || isNaN(l_id)) {
            return res.status(400).json({ success: false, error: 'A valid Loan ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchLoanPreview(connection, l_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Loan #${l_id} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/loans/:l_id/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/loans/:l_id', async (req, res) => {
    let connection;
    try {
        const l_id = Number(req.params.l_id);
        if (!l_id || isNaN(l_id)) {
            return res.status(400).json({ success: false, error: 'A valid Loan ID is required' });
        }

        connection = await getConnection();
        const preview = await fetchLoanPreview(connection, l_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Loan #${l_id} not found` });
        }

        // Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The loan dependency state has changed since preview was generated. Please refresh the preview before confirming.'
            });
        }

        // Cascade delete: loan responsibility rows first, then loan record
        await connection.execute('DELETE FROM Responsible_For WHERE l_id = :p_lid', { p_lid: l_id });
        await connection.execute('DELETE FROM Loan WHERE l_id = :p_lid', { p_lid: l_id });
        await connection.commit();

        res.json({
            success: true,
            message: `Loan #${l_id} and associated responsibility records deleted successfully`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/loans/:l_id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- CREDIT CARD BLOCK / CLOSE / UNBLOCK ---
app.patch('/api/creditcards/:pno/status', async (req, res) => {
    let connection;
    try {
        const pno = req.params.pno;
        const { status } = req.body;
        if (!pno || !pno.trim()) {
            return res.status(400).json({ success: false, error: 'A valid Card Number is required' });
        }

        const cleanStatus = (status || '').trim().toUpperCase();
        if (!['ACTIVE', 'BLOCKED', 'CLOSED', 'INACTIVE'].includes(cleanStatus)) {
            return res.status(400).json({ success: false, error: 'Status must be ACTIVE, BLOCKED, or CLOSED' });
        }

        connection = await getConnection();
        const check = await connection.execute('SELECT pno, status FROM CreditCard WHERE pno = :p_pno', { p_pno: pno });
        if (!check.rows || check.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Credit card not found' });
        }

        if (check.rows[0][1] === cleanStatus) {
            return res.status(400).json({ success: false, error: `Credit card is already ${cleanStatus}.` });
        }

        await connection.execute(
            'UPDATE CreditCard SET status = :p_status WHERE pno = :p_pno',
            { p_status: cleanStatus, p_pno: pno }
        );
        await connection.commit();

        res.json({
            success: true,
            message: `Credit card ending in ${pno.slice(-4)} status updated to ${cleanStatus}`,
            data: { pno, status: cleanStatus }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in PATCH /api/creditcards/:pno/status:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/creditcards/:pno/delete-preview', async (req, res) => {
    let connection;
    try {
        const pno = req.params.pno;
        if (!pno || !pno.trim()) {
            return res.status(400).json({ success: false, error: 'A valid Card Number is required' });
        }
        connection = await getConnection();
        const preview = await fetchCreditCardPreview(connection, pno);
        if (!preview) {
            return res.status(404).json({ success: false, error: 'Credit card not found' });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/creditcards/:pno/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/creditcards/:pno', async (req, res) => {
    let connection;
    try {
        const pno = req.params.pno;
        if (!pno || !pno.trim()) {
            return res.status(400).json({ success: false, error: 'A valid Card Number is required' });
        }

        connection = await getConnection();
        const preview = await fetchCreditCardPreview(connection, pno);
        if (!preview) {
            return res.status(404).json({ success: false, error: 'Credit card not found' });
        }

        // Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The credit card state has changed since preview was generated. Please refresh the preview before confirming.'
            });
        }

        await connection.execute('DELETE FROM CreditCard WHERE pno = :p_pno', { p_pno: pno });
        await connection.commit();

        res.json({
            success: true,
            message: `Credit card ending in ${pno.slice(-4)} deleted successfully. Customer and account records preserved.`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/creditcards/:pno:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- EMPLOYEE DEACTIVATE / ACTIVATE & SAFE DELETE ---
app.patch('/api/employees/:emp_id/status', async (req, res) => {
    let connection;
    try {
        const emp_id = Number(req.params.emp_id);
        const { status } = req.body;
        if (!emp_id || isNaN(emp_id)) {
            return res.status(400).json({ success: false, error: 'A valid Employee ID is required' });
        }

        const cleanStatus = (status || '').trim().toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(cleanStatus)) {
            return res.status(400).json({ success: false, error: 'Status must be either ACTIVE or INACTIVE' });
        }

        connection = await getConnection();
        const hasEmpStatus = await tableHasColumn(connection, 'EMPLOYEE', 'STATUS');
        if (!hasEmpStatus) {
            return res.status(400).json({ success: false, error: 'Employee status management requires a STATUS column, which is not present in the current database schema.' });
        }
        const check = await connection.execute('SELECT emp_id, status FROM Employee WHERE emp_id = :p_empid', { p_empid: emp_id });
        if (!check.rows || check.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Employee #${emp_id} not found` });
        }

        await connection.execute(
            'UPDATE Employee SET status = :p_status WHERE emp_id = :p_empid',
            { p_status: cleanStatus, p_empid: emp_id }
        );
        await connection.commit();

        res.json({
            success: true,
            message: `Employee #${emp_id} status updated to ${cleanStatus}`,
            data: { emp_id, status: cleanStatus }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in PATCH /api/employees/:emp_id/status:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/employees/:emp_id/delete-preview', async (req, res) => {
    let connection;
    try {
        const emp_id = Number(req.params.emp_id);
        if (!emp_id || isNaN(emp_id)) {
            return res.status(400).json({ success: false, error: 'A valid Employee ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchEmployeePreview(connection, emp_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Employee #${emp_id} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/employees/:emp_id/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/employees/:emp_id', async (req, res) => {
    let connection;
    try {
        const emp_id = Number(req.params.emp_id);
        if (!emp_id || isNaN(emp_id)) {
            return res.status(400).json({ success: false, error: 'A valid Employee ID is required' });
        }

        connection = await getConnection();
        const preview = await fetchEmployeePreview(connection, emp_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Employee #${emp_id} not found` });
        }

        // Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The employee dependency state has changed since preview was generated. Please refresh the preview before confirming.'
            });
        }

        // 1. Unlink assigned customers safely so their customer profile and accounts are preserved
        await connection.execute(
            'UPDATE Customer SET emp_id = NULL WHERE emp_id = :p_empid',
            { p_empid: emp_id }
        );

        // 2. Delete employee branch responsibility entries
        await connection.execute(
            'DELETE FROM Responsible_For WHERE emp_id = :p_empid',
            { p_empid: emp_id }
        );

        // 3. Delete employee root record
        await connection.execute('DELETE FROM Employee WHERE emp_id = :p_empid', { p_empid: emp_id });
        await connection.commit();

        res.json({
            success: true,
            message: `Employee #${emp_id} deleted successfully. ${preview.customer_unlink_count || 0} customer(s) unlinked and preserved. Branch preserved.`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/employees/:emp_id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- BRANCH DEACTIVATE / ACTIVATE & SAFE DELETE ---
app.patch('/api/branches/:b_id/status', async (req, res) => {
    let connection;
    try {
        const b_id = Number(req.params.b_id);
        const { status } = req.body;
        if (!b_id || isNaN(b_id)) {
            return res.status(400).json({ success: false, error: 'A valid Branch ID is required' });
        }

        const cleanStatus = (status || '').trim().toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(cleanStatus)) {
            return res.status(400).json({ success: false, error: 'Status must be either ACTIVE or INACTIVE' });
        }

        connection = await getConnection();
        const hasBranchStatus = await tableHasColumn(connection, 'BRANCH', 'STATUS');
        if (!hasBranchStatus) {
            return res.status(400).json({ success: false, error: 'Branch status management requires a STATUS column, which is not present in the current database schema.' });
        }
        const check = await connection.execute('SELECT b_id, status FROM Branch WHERE b_id = :p_bid', { p_bid: b_id });
        if (!check.rows || check.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Branch #${b_id} not found` });
        }

        if (cleanStatus === 'INACTIVE') {
            const hasEmpStatus = await tableHasColumn(connection, 'EMPLOYEE', 'STATUS');
            const empCheckSql = hasEmpStatus
                ? "SELECT COUNT(*) FROM Employee WHERE b_id = :p_bid AND (status = 'ACTIVE' OR status IS NULL)"
                : "SELECT COUNT(*) FROM Employee WHERE b_id = :p_bid";
            const activeEmpCheck = await connection.execute(empCheckSql, { p_bid: b_id });
            const activeEmpCount = activeEmpCheck.rows[0][0];
            if (activeEmpCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot deactivate branch #${b_id} because it currently has ${activeEmpCount} active employee(s). Please reassign or deactivate employees first.`
                });
            }
        }

        await connection.execute(
            'UPDATE Branch SET status = :p_status WHERE b_id = :p_bid',
            { p_status: cleanStatus, p_bid: b_id }
        );
        await connection.commit();

        res.json({
            success: true,
            message: `Branch #${b_id} status updated to ${cleanStatus}`,
            data: { b_id, status: cleanStatus }
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in PATCH /api/branches/:b_id/status:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.get('/api/branches/:b_id/delete-preview', async (req, res) => {
    let connection;
    try {
        const b_id = Number(req.params.b_id);
        if (!b_id || isNaN(b_id)) {
            return res.status(400).json({ success: false, error: 'A valid Branch ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchBranchPreview(connection, b_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Branch #${b_id} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/branches/:b_id/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/branches/:b_id', async (req, res) => {
    let connection;
    try {
        const b_id = Number(req.params.b_id);
        if (!b_id || isNaN(b_id)) {
            return res.status(400).json({ success: false, error: 'A valid Branch ID is required' });
        }

        connection = await getConnection();
        const preview = await fetchBranchPreview(connection, b_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Branch #${b_id} not found` });
        }

        // Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The branch dependency state has changed since preview was generated. Please refresh the preview before confirming.'
            });
        }

        if (preview.counts.Employee > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete branch #${b_id} because it currently has ${preview.counts.Employee} employee(s) assigned. Under corporate hierarchy rules, employees must be reassigned or deleted first, or you may deactivate the branch instead.`,
                recommended_alternative: preview.recommended_alternative,
                preview
            });
        }

        // Delete branch responsibility entries
        await connection.execute('DELETE FROM Responsible_For WHERE b_id = :p_bid', { p_bid: b_id });
        await connection.execute('DELETE FROM Branch WHERE b_id = :p_bid', { p_bid: b_id });
        await connection.commit();

        res.json({
            success: true,
            message: `Branch #${b_id} and associated responsibility records deleted successfully`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/branches/:b_id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

// --- NOMINEE REMOVAL & PREVIEW ---
app.get('/api/nominees/:n_id/delete-preview', async (req, res) => {
    let connection;
    try {
        const n_id = Number(req.params.n_id);
        if (!n_id || isNaN(n_id)) {
            return res.status(400).json({ success: false, error: 'A valid Nominee ID is required' });
        }
        connection = await getConnection();
        const preview = await fetchNomineePreview(connection, n_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Nominee #${n_id} not found` });
        }
        res.json({ success: true, ...preview });
    } catch (error) {
        console.error('Error in GET /api/nominees/:n_id/delete-preview:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

app.delete('/api/nominees/:n_id', async (req, res) => {
    let connection;
    try {
        const n_id = Number(req.params.n_id);
        if (!n_id || isNaN(n_id)) {
            return res.status(400).json({ success: false, error: 'A valid Nominee ID is required' });
        }

        connection = await getConnection();
        const preview = await fetchNomineePreview(connection, n_id);
        if (!preview) {
            return res.status(404).json({ success: false, error: `Nominee #${n_id} not found` });
        }

        // Stale-preview / signature check
        const clientSig = req.body?.preview_signature || req.query?.preview_signature;
        if (clientSig && clientSig !== preview.preview_signature) {
            return res.status(409).json({
                success: false,
                stale_preview: true,
                error: 'The nominee state has changed since preview was generated. Please refresh the preview before confirming.'
            });
        }

        // Delete from Owns then Nominee inside transaction
        await connection.execute('DELETE FROM Owns WHERE n_id = :p_nid', { p_nid: n_id });
        await connection.execute('DELETE FROM Nominee WHERE n_id = :p_nid', { p_nid: n_id });
        await connection.commit();

        res.json({
            success: true,
            message: `Nominee #${n_id} (${preview.target.label}) removed successfully. Customer and account balance preserved.`,
            deleted_counts: preview.counts
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (_) {} }
        console.error('Error in DELETE /api/nominees/:n_id:', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (_) {}
        }
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Banking backend running on http://0.0.0.0:${PORT}`);
});