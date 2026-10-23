const fs = require('fs');

const content = fs.readFileSync('./backend/server.js', 'utf8');
const lines = content.split('\n');

console.log('=== LINES WITH STATUS IN SQL QUERIES IN server.js ===');
lines.forEach((line, idx) => {
    // Look for SQL statements or references to status
    if (/status/i.test(line)) {
        if (/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|SET/i.test(line)) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    }
});
