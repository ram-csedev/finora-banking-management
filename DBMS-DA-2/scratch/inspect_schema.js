const { getConnection } = require('../backend/db');

async function inspect() {
    let conn;
    try {
        conn = await getConnection();
        
        // Query foreign keys
        const fks = await conn.execute(`
            SELECT 
                a.table_name, 
                a.constraint_name, 
                c_pk.table_name AS referenced_table,
                a.delete_rule
            FROM user_constraints a
            JOIN user_constraints c_pk ON a.r_constraint_name = c_pk.constraint_name
            WHERE a.constraint_type = 'R'
            ORDER BY a.table_name, a.constraint_name
        `);
        console.log('=== FOREIGN KEY CONSTRAINTS ===');
        fks.rows.forEach(r => {
            console.log(`  ${r[0]} -> ${r[2]} (${r[1]}, on_delete: ${r[3]})`);
        });

        // Query foreign key columns
        const fkCols = await conn.execute(`
            SELECT 
                a.table_name, 
                a.constraint_name, 
                col.column_name,
                col.position
            FROM user_constraints a
            JOIN user_cons_columns col ON a.constraint_name = col.constraint_name
            WHERE a.constraint_type = 'R'
            ORDER BY a.table_name, a.constraint_name, col.position
        `);
        console.log('\n=== FOREIGN KEY COLUMNS ===');
        fkCols.rows.forEach(r => {
            console.log(`  ${r[0]}.${r[2]} (Constraint: ${r[1]}, Pos: ${r[3]})`);
        });

        // Query all tables and columns
        const cols = await conn.execute(`
            SELECT table_name, column_name, data_type, nullable, data_default 
            FROM user_tab_columns 
            WHERE table_name IN (
                'BRANCH', 'EMPLOYEE', 'CUSTOMER', 'CUSTOMER_PHONE', 'ACCOUNT', 
                'NOMINEE', 'OWNS', 'CREDITCARD', 'LOAN', 'TRANSACTION', 'RESPONSIBLE_FOR'
            )
            ORDER BY table_name, column_id
        `);
        console.log('\n=== TABLES AND COLUMNS ===');
        let currentTable = '';
        cols.rows.forEach(r => {
            if (r[0] !== currentTable) {
                currentTable = r[0];
                console.log(`\nTable [${currentTable}]:`);
            }
            console.log(`  - ${r[1]} ${r[2]} ${r[3] === 'N' ? 'NOT NULL' : 'NULL'} ${r[4] ? 'DEFAULT ' + r[4].trim() : ''}`);
        });

        // Query primary keys
        const pks = await conn.execute(`
            SELECT a.table_name, a.constraint_name, col.column_name
            FROM user_constraints a
            JOIN user_cons_columns col ON a.constraint_name = col.constraint_name
            WHERE a.constraint_type = 'P'
            AND a.table_name IN (
                'BRANCH', 'EMPLOYEE', 'CUSTOMER', 'CUSTOMER_PHONE', 'ACCOUNT', 
                'NOMINEE', 'OWNS', 'CREDITCARD', 'LOAN', 'TRANSACTION', 'RESPONSIBLE_FOR'
            )
            ORDER BY a.table_name, col.position
        `);
        console.log('\n=== PRIMARY KEYS ===');
        pks.rows.forEach(r => {
            console.log(`  ${r[0]}: ${r[2]} (${r[1]})`);
        });

        // Query triggers
        const trgs = await conn.execute(`
            SELECT trigger_name, table_name, triggering_event, trigger_type, status
            FROM user_triggers
            ORDER BY table_name, trigger_name
        `);
        console.log('\n=== TRIGGERS ===');
        trgs.rows.forEach(r => {
            console.log(`  ${r[0]} ON ${r[1]} (${r[3]} ${r[2]}) - Status: ${r[4]}`);
        });

        // Query row counts in each table
        console.log('\n=== CURRENT ROW COUNTS ===');
        const tables = ['BRANCH', 'EMPLOYEE', 'CUSTOMER', 'CUSTOMER_PHONE', 'ACCOUNT', 'NOMINEE', 'OWNS', 'CREDITCARD', 'LOAN', 'TRANSACTION', 'RESPONSIBLE_FOR'];
        for (const t of tables) {
            const countRes = await conn.execute(`SELECT COUNT(*) FROM "${t}"`);
            console.log(`  ${t}: ${countRes.rows[0][0]}`);
        }

    } catch (err) {
        console.error('Inspection failed:', err);
    } finally {
        if (conn) {
            try { await conn.close(); } catch (_) {}
        }
    }
}

inspect();
