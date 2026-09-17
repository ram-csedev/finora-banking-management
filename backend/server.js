const express = require('express');
const path = require('path');
const cors = require('cors');
const { getConnection } = require('./db');

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
            'SELECT * FROM Customer'
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
            'SELECT * FROM Account'
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
            'SELECT * FROM "TRANSACTION"'
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

app.get('/api/loans', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Loan'
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

app.get('/api/creditcards', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM CreditCard'
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

app.get('/api/branches', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Branch'
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

app.get('/api/employees', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Employee'
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

app.get('/api/nominees', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            'SELECT * FROM Nominee'
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
    }
});

app.post('/api/deposit', async (req, res) => {
    let connection;
    try {
        const { acc_id, amount } = req.body;

        connection = await getConnection();

        await connection.execute(
            `BEGIN deposit_money(:p_acc_id,:p_amount); END;`,
            {
                p_acc_id: acc_id,
                p_amount: amount
            }
        );

        res.json({
            success: true,
            message: 'Deposit successful'
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

app.post('/api/withdraw', async (req, res) => {
    let connection;
    try {
        const { acc_id, amount } = req.body;

        connection = await getConnection();

        await connection.execute(
            `BEGIN withdraw_money(:p_acc_id,:p_amount); END;`,
            {
                p_acc_id: acc_id,
                p_amount: amount
            }
        );

        res.json({
            success: true,
            message: 'Withdrawal successful'
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
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
        if (connection) await connection.close();
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Banking backend running on http://0.0.0.0:${PORT}`);
});