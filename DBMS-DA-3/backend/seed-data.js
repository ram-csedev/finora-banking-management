/**
 * Finora DA3 - Demonstration Sample Data Seeder
 * Database: CockroachDB Cloud (finora_da3)
 *
 * Implements deterministic, idempotent seeding for all 14 banking tables.
 * Uses ON CONFLICT (pk) DO UPDATE to guarantee rerunnability without hiding integrity errors.
 */
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

async function seedDatabase() {
  const connectionString = process.env.DATABASE_URL;
  const caPath = process.env.DB_SSL_ROOT_CERT;

  if (!connectionString || !caPath) {
    console.error('❌ Missing DATABASE_URL or DB_SSL_ROOT_CERT in .env');
    process.exit(1);
  }

  const url = new URL(connectionString);
  url.pathname = '/finora_da3';
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(caPath, 'utf8'),
      rejectUnauthorized: true
    },
    connectionTimeoutMillis: 15000
  });

  const client = await pool.connect();

  try {
    console.log('================================================================');
    console.log('FINORA DA3: SAMPLE DATA SEEDER');
    console.log('Target: CockroachDB Cloud (finora_da3)');
    console.log('Dataset: Demonstration & Academic Fixtures');
    console.log('================================================================\n');

    // Confirm target database
    const dbRes = await client.query('SELECT current_database() AS db');
    if (dbRes.rows[0].db !== 'finora_da3') {
      throw new Error(`Safety violation: Connected to ${dbRes.rows[0].db}, expected finora_da3!`);
    }

    console.log('🔄 Starting transactional data seeding...');
    await client.query('BEGIN');

    // ------------------------------------------------------------------------
    // 1. Branches (6)
    // ------------------------------------------------------------------------
    const branches = [
      [101, 'Main Branch', 'Vellore', 'Tamil Nadu', '632004', 'SBIN0000101', '0416-2244101'],
      [102, 'City Branch', 'Chennai', 'Tamil Nadu', '600001', 'SBIN0000102', '044-25330102'],
      [103, 'Central Branch', 'Bangalore', 'Karnataka', '560001', 'SBIN0000103', '080-22110103'],
      [104, 'Market Branch', 'Mumbai', 'Maharashtra', '400001', 'SBIN0000104', '022-22660104'],
      [105, 'Connaught Branch', 'Delhi', 'Delhi', '110001', 'SBIN0000105', '011-23340105'],
      [106, 'Cyber Branch', 'Hyderabad', 'Telangana', '500081', 'SBIN0000106', '040-23110106']
    ];

    for (const b of branches) {
      await client.query(`
        INSERT INTO branch (b_id, branch_name, city, state, pincode, ifsc, contact)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (b_id) DO UPDATE SET
          branch_name = EXCLUDED.branch_name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode,
          ifsc = EXCLUDED.ifsc,
          contact = EXCLUDED.contact;
      `, b);
    }
    console.log(`✓ Seeded ${branches.length} branches`);

    // ------------------------------------------------------------------------
    // 2. Employees (10)
    // ------------------------------------------------------------------------
    const employees = [
      [201, 'Rahul', 'Sharma', 75000.00, '2021-06-15', 101, 'rahul.sharma@finora-bank.example'],
      [202, 'Priya', 'Patel', 68000.00, '2021-08-20', 102, 'priya.patel@finora-bank.example'],
      [203, 'Arjun', 'Kumar', 58000.00, '2022-01-10', 103, 'arjun.kumar@finora-bank.example'],
      [204, 'Sneha', 'Rao', 82000.00, '2020-11-05', 104, 'sneha.rao@finora-bank.example'],
      [205, 'Vikram', 'Singh', 65000.00, '2022-03-18', 105, 'vikram.singh@finora-bank.example'],
      [206, 'Deepa', 'Nair', 62000.00, '2022-07-01', 101, 'deepa.nair@finora-bank.example'],
      [207, 'Manoj', 'Joshi', 54000.00, '2023-02-15', 102, 'manoj.joshi@finora-bank.example'],
      [208, 'Ananya', 'Deshmukh', 72000.00, '2021-10-12', 104, 'ananya.deshmukh@finora-bank.example'],
      [209, 'Rajesh', 'Reddy', 78000.00, '2021-04-01', 106, 'rajesh.reddy@finora-bank.example'],
      [210, 'Kavita', 'Menon', 59000.00, '2022-09-10', 106, 'kavita.menon@finora-bank.example']
    ];

    for (const e of employees) {
      await client.query(`
        INSERT INTO employee (emp_id, first_name, last_name, salary, hire_date, b_id, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (emp_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          salary = EXCLUDED.salary,
          hire_date = EXCLUDED.hire_date,
          b_id = EXCLUDED.b_id,
          email = EXCLUDED.email;
      `, e);
    }
    console.log(`✓ Seeded ${employees.length} employees`);

    // ------------------------------------------------------------------------
    // 3. Customers (14)
    // ------------------------------------------------------------------------
    const customers = [
      [301, 'ABCDE1234F', 'Amit', 'Verma', 'Vellore', 'Tamil Nadu', '632004', '1998-05-12', 201, 'amit.verma@demo.example'],
      [302, 'BCDEF2345G', 'Neha', 'Shah', 'Chennai', 'Tamil Nadu', '600001', '1997-09-25', 202, 'neha.shah@demo.example'],
      [303, 'CDEFG3456H', 'Rohan', 'Mehta', 'Bangalore', 'Karnataka', '560001', '1999-02-18', 203, 'rohan.mehta@demo.example'],
      [304, 'DEFGH4567J', 'Ananya', 'Iyer', 'Mumbai', 'Maharashtra', '400001', '1996-11-30', 204, 'ananya.iyer@demo.example'],
      [305, 'EFGHI5678K', 'Karan', 'Gupta', 'Delhi', 'Delhi', '110001', '1995-07-08', 205, 'karan.gupta@demo.example'],
      [306, 'FGHIJ6789L', 'Pooja', 'Verma', 'Vellore', 'Tamil Nadu', '632004', '1999-08-14', 201, 'pooja.verma@demo.example'],
      [307, 'GHIJK7890M', 'Sunita', 'Mehta', 'Bangalore', 'Karnataka', '560001', '1975-03-22', 203, 'sunita.mehta@demo.example'],
      [308, 'HIJKL8901N', 'Suresh', 'Pillai', 'Chennai', 'Tamil Nadu', '600028', '1988-12-05', 202, 'suresh.pillai@demo.example'],
      [309, 'IJKLM9012P', 'Meera', 'Kulkarni', 'Mumbai', 'Maharashtra', '400050', '1992-04-17', 204, 'meera.kulkarni@demo.example'],
      [310, 'JKLMN0123Q', 'Aditya', 'Kapoor', 'Delhi', 'Delhi', '110016', '1990-10-09', 205, 'aditya.kapoor@demo.example'],
      [311, 'KLMNO1234R', 'Divya', 'Chawla', 'Delhi', 'Delhi', '110024', '1994-01-29', 205, 'divya.chawla@demo.example'],
      [312, 'LMNOP2345S', 'Venkat', 'Rao', 'Hyderabad', 'Telangana', '500034', '1985-06-19', 209, 'venkat.rao@demo.example'],
      [313, 'MNOPQ3456T', 'Swati', 'Joshi', 'Mumbai', 'Maharashtra', '400078', '1993-08-25', 208, 'swati.joshi@demo.example'],
      [314, 'NOPQR4567U', 'Tarun', 'Bansal', 'Bangalore', 'Karnataka', '560038', '1991-03-11', 203, 'tarun.bansal@demo.example']
    ];

    for (const c of customers) {
      await client.query(`
        INSERT INTO customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (cid) DO UPDATE SET
          pan = EXCLUDED.pan,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode,
          dob = EXCLUDED.dob,
          emp_id = EXCLUDED.emp_id,
          email = EXCLUDED.email;
      `, c);
    }
    console.log(`✓ Seeded ${customers.length} customers`);

    // ------------------------------------------------------------------------
    // 4. Customer Phones (18)
    // ------------------------------------------------------------------------
    const phones = [
      [301, '9876500001', 'MOBILE', true],
      [301, '9876500002', 'WORK', false],
      [302, '9876500003', 'MOBILE', true],
      [303, '9876500004', 'MOBILE', true],
      [303, '9876500005', 'HOME', false],
      [304, '9876500006', 'MOBILE', true],
      [305, '9876500007', 'MOBILE', true],
      [306, '9876500008', 'MOBILE', true],
      [307, '9876500009', 'MOBILE', true],
      [308, '9876500010', 'MOBILE', true],
      [308, '9876500011', 'WORK', false],
      [309, '9876500012', 'MOBILE', true],
      [310, '9876500013', 'MOBILE', true],
      [311, '9876500014', 'MOBILE', true],
      [312, '9876500015', 'MOBILE', true],
      [312, '9876500016', 'HOME', false],
      [313, '9876500017', 'MOBILE', true],
      [314, '9876500018', 'MOBILE', true]
    ];

    for (const p of phones) {
      await client.query(`
        INSERT INTO customer_phone (cid, phone, phone_type, is_primary)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cid, phone) DO UPDATE SET
          phone_type = EXCLUDED.phone_type,
          is_primary = EXCLUDED.is_primary;
      `, p);
    }
    console.log(`✓ Seeded ${phones.length} customer phone numbers`);

    // ------------------------------------------------------------------------
    // 5. Accounts (12)
    // Note: Balances represent current settled ledger balances.
    // ------------------------------------------------------------------------
    const accounts = [
      [401, 101, 75000.00, 'ACTIVE', 'SAVINGS'],
      [402, 102, 120000.00, 'ACTIVE', 'CURRENT'],
      [403, 103, 55000.00, 'ACTIVE', 'SAVINGS'],
      [404, 104, 200000.00, 'ACTIVE', 'CURRENT'],
      [405, 105, 90000.00, 'ACTIVE', 'SAVINGS'],
      [406, 101, 180000.00, 'ACTIVE', 'SAVINGS'],   // Joint Account 1
      [407, 103, 350000.00, 'ACTIVE', 'SAVINGS'],   // Joint Account 2
      [408, 102, 45000.00, 'ACTIVE', 'SALARY'],
      [409, 104, 310000.00, 'ACTIVE', 'CURRENT'],
      [410, 105, 62000.00, 'ACTIVE', 'SAVINGS'],
      [411, 106, 145000.00, 'ACTIVE', 'SAVINGS'],
      [412, 106, 88000.00, 'ACTIVE', 'CURRENT']
    ];

    for (const a of accounts) {
      await client.query(`
        INSERT INTO account (acc_id, b_id, balance, status, acc_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (acc_id) DO UPDATE SET
          b_id = EXCLUDED.b_id,
          balance = EXCLUDED.balance,
          status = EXCLUDED.status,
          acc_type = EXCLUDED.acc_type;
      `, a);
    }
    console.log(`✓ Seeded ${accounts.length} accounts (including 2 joint accounts)`);

    // ------------------------------------------------------------------------
    // 6. Account Holders (14 mappings for 12 accounts)
    // ------------------------------------------------------------------------
    const accountHolders = [
      [401, 301, 'PRIMARY', true, 100.00],
      [402, 302, 'PRIMARY', true, 100.00],
      [403, 303, 'PRIMARY', true, 100.00],
      [404, 304, 'PRIMARY', true, 100.00],
      [405, 305, 'PRIMARY', true, 100.00],
      // Joint Account 406 (Amit Verma 50% + Pooja Verma 50%)
      [406, 301, 'PRIMARY', true, 50.00],
      [406, 306, 'JOINT', false, 50.00],
      // Joint Account 407 (Rohan Mehta 60% + Sunita Mehta 40%)
      [407, 303, 'PRIMARY', true, 60.00],
      [407, 307, 'JOINT', false, 40.00],
      [408, 308, 'PRIMARY', true, 100.00],
      [409, 309, 'PRIMARY', true, 100.00],
      [410, 310, 'PRIMARY', true, 100.00],
      [411, 312, 'PRIMARY', true, 100.00],
      [412, 313, 'PRIMARY', true, 100.00]
    ];

    for (const ah of accountHolders) {
      await client.query(`
        INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary, share_percentage)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (acc_id, cid) DO UPDATE SET
          ownership_role = EXCLUDED.ownership_role,
          is_primary = EXCLUDED.is_primary,
          share_percentage = EXCLUDED.share_percentage;
      `, ah);
    }
    console.log(`✓ Seeded ${accountHolders.length} account holder records`);

    // ------------------------------------------------------------------------
    // 7. Nominees (8)
    // ------------------------------------------------------------------------
    const nominees = [
      [501, 401, 301, 'Raj', 'Verma', 'Father', '1968-04-15', '9876540001'],
      [502, 402, 302, 'Meena', 'Shah', 'Mother', '1970-08-20', '9876540002'],
      [503, 403, 303, 'Suresh', 'Mehta', 'Father', '1965-12-10', '9876540003'],
      [504, 404, 304, 'Kavita', 'Iyer', 'Mother', '1969-06-25', '9876540004'],
      [505, 405, 305, 'Ramesh', 'Gupta', 'Father', '1967-03-12', '9876540005'],
      [506, 406, 301, 'Harish', 'Verma', 'Brother', '2001-11-04', '9876540006'],
      [507, 407, 303, 'Anil', 'Mehta', 'Brother', '1995-09-17', '9876540007'],
      [508, 411, 312, 'Lakshmi', 'Rao', 'Spouse', '1987-05-30', '9876540008']
    ];

    for (const n of nominees) {
      await client.query(`
        INSERT INTO nominee (n_id, acc_id, cid, first_name, last_name, relationship, dob, contact_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (n_id) DO UPDATE SET
          acc_id = EXCLUDED.acc_id,
          cid = EXCLUDED.cid,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          relationship = EXCLUDED.relationship,
          dob = EXCLUDED.dob,
          contact_phone = EXCLUDED.contact_phone;
      `, n);
    }
    console.log(`✓ Seeded ${nominees.length} nominees`);

    // ------------------------------------------------------------------------
    // 8. Credit Cards (7)
    // Fictional demonstration card numbers; dummy masked security values
    // ------------------------------------------------------------------------
    const creditCards = [
      ['4111111111111111', 301, 'VISA', 100000.00, '2028-12-31', 'ACTIVE', '***'],
      ['5222222222222222', 302, 'MASTERCARD', 150000.00, '2029-10-31', 'ACTIVE', '***'],
      ['4333333333333333', 303, 'VISA', 75000.00, '2028-08-31', 'ACTIVE', '***'],
      ['5444444444444444', 304, 'MASTERCARD', 200000.00, '2030-01-31', 'ACTIVE', '***'],
      ['4555555555555555', 305, 'VISA', 120000.00, '2029-06-30', 'ACTIVE', '***'],
      ['6011000011118888', 308, 'RUPAY', 80000.00, '2027-11-30', 'ACTIVE', '***'],
      ['3711222233339999', 309, 'AMEX', 350000.00, '2030-05-31', 'ACTIVE', '***']
    ];

    for (const cc of creditCards) {
      await client.query(`
        INSERT INTO creditcard (pno, cid, type, card_limit, expiry, status, cvv)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (pno) DO UPDATE SET
          cid = EXCLUDED.cid,
          type = EXCLUDED.type,
          card_limit = EXCLUDED.card_limit,
          expiry = EXCLUDED.expiry,
          status = EXCLUDED.status,
          cvv = EXCLUDED.cvv;
      `, cc);
    }
    console.log(`✓ Seeded ${creditCards.length} credit cards (fictional demonstration records)`);

    // ------------------------------------------------------------------------
    // 9. Loans (8)
    // ------------------------------------------------------------------------
    const loans = [
      [601, 301, 'HOME', 2500000.00, 7.50, 240, '2024-01-15', 'ACTIVE', 202],
      [602, 302, 'CAR', 800000.00, 8.50, 60, '2023-06-10', 'ACTIVE', 202],
      [603, 303, 'PERSONAL', 300000.00, 10.50, 36, '2023-11-01', 'ACTIVE', 205],
      [604, 304, 'HOME', 3500000.00, 7.25, 240, '2022-09-01', 'ACTIVE', 208],
      [605, 305, 'EDUCATION', 600000.00, 6.50, 84, '2024-03-20', 'ACTIVE', 205],
      [606, 308, 'CAR', 650000.00, 8.75, 60, '2024-02-10', 'ACTIVE', 202],
      [607, 310, 'PERSONAL', 250000.00, 11.00, 24, '2023-12-05', 'ACTIVE', 205],
      [608, 312, 'BUSINESS', 1800000.00, 9.25, 120, '2023-08-15', 'ACTIVE', 210]
    ];

    for (const l of loans) {
      await client.query(`
        INSERT INTO loan (l_id, cid, l_type, amount, interest, term, start_date, status, assigned_emp_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (l_id) DO UPDATE SET
          cid = EXCLUDED.cid,
          l_type = EXCLUDED.l_type,
          amount = EXCLUDED.amount,
          interest = EXCLUDED.interest,
          term = EXCLUDED.term,
          start_date = EXCLUDED.start_date,
          status = EXCLUDED.status,
          assigned_emp_id = EXCLUDED.assigned_emp_id;
      `, l);
    }
    console.log(`✓ Seeded ${loans.length} loans`);

    // ------------------------------------------------------------------------
    // 10. Loan Payments (16)
    // Strictly enforces amount = principal_amount + interest_amount
    // ------------------------------------------------------------------------
    const loanPayments = [
      [60101, 601, '2024-02-15 10:00:00+05:30', 20140.00, 4515.00, 15625.00, 'ONLINE', 'SUCCESS', 'EMI Month 1'],
      [60102, 601, '2024-03-15 10:00:00+05:30', 20140.00, 4543.00, 15597.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 2'],
      [60103, 601, '2024-04-15 10:00:00+05:30', 20140.00, 4571.00, 15569.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 3'],
      [60201, 602, '2023-07-10 11:30:00+05:30', 16410.00, 10743.00, 5667.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 1'],
      [60202, 602, '2023-08-10 11:30:00+05:30', 16410.00, 10819.00, 5591.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 2'],
      [60301, 603, '2023-12-01 14:00:00+05:30', 9750.00, 7125.00, 2625.00, 'ONLINE', 'SUCCESS', 'EMI Month 1'],
      [60302, 603, '2024-01-01 14:00:00+05:30', 9750.00, 7187.00, 2563.00, 'ONLINE', 'SUCCESS', 'EMI Month 2'],
      [60401, 604, '2022-10-01 09:15:00+05:30', 27680.00, 6534.00, 21146.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 1'],
      [60402, 604, '2022-11-01 09:15:00+05:30', 27680.00, 6574.00, 21106.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 2'],
      [60501, 605, '2024-04-20 16:45:00+05:30', 8910.00, 5660.00, 3250.00, 'ONLINE', 'SUCCESS', 'EMI Month 1'],
      [60502, 605, '2024-05-20 16:45:00+05:30', 8910.00, 5691.00, 3219.00, 'ONLINE', 'SUCCESS', 'EMI Month 2'],
      [60601, 606, '2024-03-10 12:00:00+05:30', 13415.00, 8675.00, 4740.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 1'],
      [60602, 606, '2024-04-10 12:00:00+05:30', 13415.00, 8738.00, 4677.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 2'],
      [60701, 607, '2024-01-05 10:20:00+05:30', 11650.00, 9358.00, 2292.00, 'ONLINE', 'SUCCESS', 'EMI Month 1'],
      [60801, 608, '2023-09-15 15:30:00+05:30', 23070.00, 9195.00, 13875.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 1'],
      [60802, 608, '2023-10-15 15:30:00+05:30', 23070.00, 9266.00, 13804.00, 'AUTO_DEBIT', 'SUCCESS', 'EMI Month 2']
    ];

    for (const lp of loanPayments) {
      await client.query(`
        INSERT INTO loan_payment (payment_id, l_id, payment_date, amount, principal_amount, interest_amount, payment_mode, status, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (payment_id) DO UPDATE SET
          l_id = EXCLUDED.l_id,
          payment_date = EXCLUDED.payment_date,
          amount = EXCLUDED.amount,
          principal_amount = EXCLUDED.principal_amount,
          interest_amount = EXCLUDED.interest_amount,
          payment_mode = EXCLUDED.payment_mode,
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks;
      `, lp);
    }
    console.log(`✓ Seeded ${loanPayments.length} loan payment records`);

    // ------------------------------------------------------------------------
    // 11. Beneficiaries (8)
    // Internal & External saved payees
    // ------------------------------------------------------------------------
    const beneficiaries = [
      [801, 301, 'Neha (Internal)', 'Neha Shah', '402', 'SBIN0000102', 'Finora Bank', 402, true],
      [802, 301, 'Alpha Supplies (External)', 'Alpha Supplies Pvt Ltd', '50100234567890', 'HDFC0001234', 'HDFC Bank', null, true],
      [803, 302, 'Rohan (Internal)', 'Rohan Mehta', '403', 'SBIN0000103', 'Finora Bank', 403, true],
      [804, 303, 'Ananya (Internal)', 'Ananya Iyer', '404', 'SBIN0000104', 'Finora Bank', 404, true],
      [805, 304, 'Landlord (External)', 'Ramesh Kulkarni', '000401567890', 'ICIC0000004', 'ICICI Bank', null, true],
      [806, 305, 'Amit (Internal)', 'Amit Verma', '401', 'SBIN0000101', 'Finora Bank', 401, true],
      [807, 308, 'Joint Savings (Internal)', 'Amit & Pooja Verma', '406', 'SBIN0000101', 'Finora Bank', 406, true],
      [808, 312, 'Supplier Corp (External)', 'Precision Tools Corp', '912020034567891', 'UTIB0000123', 'Axis Bank', null, true]
    ];

    for (const ben of beneficiaries) {
      await client.query(`
        INSERT INTO beneficiary (beneficiary_id, cid, nickname, beneficiary_name, destination_account_num, destination_ifsc, bank_name, internal_acc_id, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (beneficiary_id) DO UPDATE SET
          cid = EXCLUDED.cid,
          nickname = EXCLUDED.nickname,
          beneficiary_name = EXCLUDED.beneficiary_name,
          destination_account_num = EXCLUDED.destination_account_num,
          destination_ifsc = EXCLUDED.destination_ifsc,
          bank_name = EXCLUDED.bank_name,
          internal_acc_id = EXCLUDED.internal_acc_id,
          is_verified = EXCLUDED.is_verified;
      `, ben);
    }
    console.log(`✓ Seeded ${beneficiaries.length} beneficiaries`);

    // ------------------------------------------------------------------------
    // 12. Transactions (18)
    // Linked transfer entries strictly paired:
    // Pair 1: 704 (debit 404) <-> 705 (credit 401)
    // Pair 2: 709 (debit 401) <-> 710 (credit 402)
    // Pair 3: 714 (debit 407) <-> 715 (credit 403)
    // ------------------------------------------------------------------------
    const transactions = [
      [701, 401, '2026-09-01 10:00:00+05:30', 'DEPOSIT', 25000.00, 'ONLINE', 'SUCCESS', null, null, 'Salary credit Sep 2026', null],
      [702, 402, '2026-09-02 11:15:00+05:30', 'WITHDRAWAL', 15000.00, 'ATM', 'SUCCESS', null, null, 'ATM cash withdrawal', null],
      [703, 403, '2026-09-03 14:30:00+05:30', 'DEPOSIT', 30000.00, 'CASH', 'SUCCESS', null, null, 'Branch cash deposit', 203],
      // Transfer Pair 1 (₹10,000 from 404 to 401)
      [704, 404, '2026-09-04 16:00:00+05:30', 'TRANSFER', 10000.00, 'ONLINE', 'SUCCESS', 401, 705, 'Transfer to Amit Verma (Acc 401)', null],
      [705, 401, '2026-09-04 16:00:00+05:30', 'TRANSFER', 10000.00, 'ONLINE', 'SUCCESS', 404, 704, 'Transfer from Ananya Iyer (Acc 404)', null],
      [706, 405, '2026-09-05 09:45:00+05:30', 'WITHDRAWAL', 10000.00, 'ATM', 'SUCCESS', null, null, 'ATM cash withdrawal', null],
      [707, 402, '2026-09-10 15:20:00+05:30', 'WITHDRAWAL', 5000.00, 'ATM', 'SUCCESS', null, null, 'ATM cash withdrawal', null],
      [708, 401, '2026-09-12 12:10:00+05:30', 'WITHDRAWAL', 5000.00, 'ATM', 'SUCCESS', null, null, 'ATM cash withdrawal', null],
      // Transfer Pair 2 (₹5,000 from 401 to 402)
      [709, 401, '2026-09-14 18:30:00+05:30', 'TRANSFER', 5000.00, 'ONLINE', 'SUCCESS', 402, 710, 'Bill share transfer to Neha (Acc 402)', null],
      [710, 402, '2026-09-14 18:30:00+05:30', 'TRANSFER', 5000.00, 'ONLINE', 'SUCCESS', 401, 709, 'Bill share received from Amit (Acc 401)', null],
      [711, 403, '2026-09-14 20:00:00+05:30', 'DEPOSIT', 5000.00, 'ONLINE', 'SUCCESS', null, null, 'UPI peer credit', null],
      [712, 406, '2026-09-15 11:00:00+05:30', 'DEPOSIT', 50000.00, 'BRANCH', 'SUCCESS', null, null, 'Joint savings opening deposit', 201],
      [713, 407, '2026-09-16 14:00:00+05:30', 'DEPOSIT', 100000.00, 'BRANCH', 'SUCCESS', null, null, 'Fixed tenure joint deposit', 203],
      // Transfer Pair 3 (₹20,000 from 407 to 403)
      [714, 407, '2026-09-18 17:15:00+05:30', 'TRANSFER', 20000.00, 'ONLINE', 'SUCCESS', 403, 715, 'Transfer to personal savings (Acc 403)', null],
      [715, 403, '2026-09-18 17:15:00+05:30', 'TRANSFER', 20000.00, 'ONLINE', 'SUCCESS', 407, 714, 'Transfer received from Joint Acc 407', null],
      [716, 408, '2026-09-20 09:00:00+05:30', 'DEPOSIT', 45000.00, 'ONLINE', 'SUCCESS', null, null, 'Corporate salary credit Sep 2026', null],
      [717, 409, '2026-09-22 13:40:00+05:30', 'DEPOSIT', 150000.00, 'NEFT', 'SUCCESS', null, null, 'Client invoice payment', null],
      [718, 410, '2026-09-25 19:10:00+05:30', 'WITHDRAWAL', 8000.00, 'UPI', 'SUCCESS', null, null, 'UPI merchant payment', null]
    ];

    // Seed transactions with initially null self-referencing related_trans_id, then link
    for (const t of transactions) {
      await client.query(`
        INSERT INTO "transaction" (t_id, acc_id, trans_date, type, amount, mode, status, related_acc_id, description, processed_by_emp_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (t_id) DO UPDATE SET
          acc_id = EXCLUDED.acc_id,
          trans_date = EXCLUDED.trans_date,
          type = EXCLUDED.type,
          amount = EXCLUDED.amount,
          mode = EXCLUDED.mode,
          status = EXCLUDED.status,
          related_acc_id = EXCLUDED.related_acc_id,
          description = EXCLUDED.description,
          processed_by_emp_id = EXCLUDED.processed_by_emp_id;
      `, [t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[9], t[10]]);
    }

    // Now link the transfer pairs atomically
    for (const t of transactions) {
      if (t[8] !== null) {
        await client.query(`
          UPDATE "transaction" SET related_trans_id = $1 WHERE t_id = $2;
        `, [t[8], t[0]]);
      }
    }
    console.log(`✓ Seeded ${transactions.length} transactions (including 3 linked transfer pairs)`);

    // ------------------------------------------------------------------------
    // 13. Audit Log (8)
    // Safe demonstration JSONB data excluding secrets/passwords/CVVs
    // ------------------------------------------------------------------------
    const auditLogs = [
      [901, 201, 'EMPLOYEE', '201', 'CREATE_ACCOUNT', 'ACCOUNT', '406', JSON.stringify({ action: 'create_joint_account', account_type: 'SAVINGS', holders: [301, 306], branch_id: 101 }), '10.0.1.15'],
      [902, 203, 'EMPLOYEE', '203', 'CREATE_ACCOUNT', 'ACCOUNT', '407', JSON.stringify({ action: 'create_joint_account', account_type: 'SAVINGS', holders: [303, 307], branch_id: 103 }), '10.0.3.22'],
      [903, 202, 'EMPLOYEE', '202', 'APPROVE_LOAN', 'LOAN', '601', JSON.stringify({ amount: 2500000, loan_type: 'HOME', applicant_cid: 301, interest_rate: 7.5 }), '10.0.2.10'],
      [904, null, 'CUSTOMER', '304', 'INITIATE_TRANSFER', 'TRANSACTION', '704', JSON.stringify({ from_account: 404, to_account: 401, amount: 10000, channel: 'ONLINE_BANKING' }), '192.168.1.104'],
      [905, null, 'SYSTEM', 'CRON_RECON', 'SYSTEM_RECONCILIATION', 'ACCOUNT', 'ALL', JSON.stringify({ status: 'BALANCES_VERIFIED', accounts_scanned: 12, discrepancies: 0 }), '127.0.0.1'],
      [906, 204, 'EMPLOYEE', '204', 'APPROVE_CREDIT_LIMIT', 'CREDITCARD', '5444444444444444', JSON.stringify({ customer_id: 304, limit: 200000, card_type: 'MASTERCARD' }), '10.0.4.5'],
      [907, 205, 'EMPLOYEE', '205', 'APPROVE_LOAN', 'LOAN', '605', JSON.stringify({ amount: 600000, loan_type: 'EDUCATION', applicant_cid: 305, interest_rate: 6.5 }), '10.0.5.12'],
      [908, 201, 'EMPLOYEE', '201', 'ADD_NOMINEE', 'NOMINEE', '506', JSON.stringify({ account_id: 406, nominee_relation: 'Brother' }), '10.0.1.15']
    ];

    for (const al of auditLogs) {
      await client.query(`
        INSERT INTO audit_log (log_id, emp_id, actor_type, actor_id, action, entity_name, entity_id, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (log_id) DO UPDATE SET
          emp_id = EXCLUDED.emp_id,
          actor_type = EXCLUDED.actor_type,
          actor_id = EXCLUDED.actor_id,
          action = EXCLUDED.action,
          entity_name = EXCLUDED.entity_name,
          entity_id = EXCLUDED.entity_id,
          details = EXCLUDED.details,
          ip_address = EXCLUDED.ip_address;
      `, al);
    }
    console.log(`✓ Seeded ${auditLogs.length} audit log entries`);

    // ------------------------------------------------------------------------
    // 14. Responsible For (8)
    // ------------------------------------------------------------------------
    const responsibleFor = [
      [1001, 201, 101, 'BRANCH_MANAGER', 601, 701, '2021-06-15', 'ACTIVE', 'Vellore branch manager & senior operations'],
      [1002, 202, 102, 'LOAN_OFFICER', 602, null, '2021-08-20', 'ACTIVE', 'Chennai retail loan approvals'],
      [1003, 203, 103, 'TELLER_SUPERVISOR', null, 703, '2022-01-10', 'ACTIVE', 'Bangalore cash vault and counter supervision'],
      [1004, 204, 104, 'BRANCH_MANAGER', 604, 704, '2020-11-05', 'ACTIVE', 'Mumbai market branch head'],
      [1005, 205, 105, 'LOAN_OFFICER', 605, null, '2022-03-18', 'ACTIVE', 'Delhi regional loan disbursements'],
      [1006, 206, 101, 'AUDIT_OFFICER', null, 705, '2022-07-01', 'ACTIVE', 'Internal audit & transaction inspection'],
      [1007, 209, 106, 'BRANCH_MANAGER', null, null, '2021-04-01', 'ACTIVE', 'Hyderabad cyber branch head'],
      [1008, 210, 106, 'LOAN_OFFICER', 608, null, '2022-09-10', 'ACTIVE', 'Commercial MSME loan officer']
    ];

    for (const rf of responsibleFor) {
      await client.query(`
        INSERT INTO responsible_for (rf_id, emp_id, b_id, role_type, l_id, t_id, assigned_date, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (rf_id) DO UPDATE SET
          emp_id = EXCLUDED.emp_id,
          b_id = EXCLUDED.b_id,
          role_type = EXCLUDED.role_type,
          l_id = EXCLUDED.l_id,
          t_id = EXCLUDED.t_id,
          assigned_date = EXCLUDED.assigned_date,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes;
      `, rf);
    }
    console.log(`✓ Seeded ${responsibleFor.length} operational staff assignments`);

    await client.query('COMMIT');
    console.log('\n🎉 ALL 14 TABLES SEEDED SUCCESSFULLY & TRANSACTION COMMITTED!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed, transaction rolled back:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
