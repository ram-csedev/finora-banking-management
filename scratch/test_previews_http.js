async function testPreviewsHttp() {
  const base = 'http://127.0.0.1:5000/api';

  const endpoints = [
    { name: 'Customer #301', url: `${base}/customers/301/delete-preview` },
    { name: 'Loan #601', url: `${base}/loans/601/delete-preview` },
    { name: 'Loan #602', url: `${base}/loans/602/delete-preview` },
    { name: 'Branch #101', url: `${base}/branches/101/delete-preview` },
    { name: 'Employee #201', url: `${base}/employees/201/delete-preview` },
    { name: 'CreditCard #4111111111111111', url: `${base}/creditcards/4111111111111111/delete-preview` },
    { name: 'Account #401', url: `${base}/accounts/401/delete-preview` },
    { name: 'Nominee #501', url: `${base}/nominees/501/delete-preview` },
    { name: 'Customer Phone 301:9876543210', url: `${base}/customers/301/phones/9876543210/delete-preview` },
    { name: 'Transaction #701', url: `${base}/transactions/701/delete-preview` }
  ];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep.url);
      const data = await resp.json();
      if (resp.status === 200 && data.success) {
        console.log(`[PASS] ${ep.name}: target = "${data.target.label}", sig = ${data.preview_signature?.slice(0, 8)}...`);
      } else {
        console.error(`[FAIL] ${ep.name} (Status ${resp.status}):`, data);
      }
    } catch (e) {
      console.error(`[ERROR] ${ep.name}:`, e.message);
    }
  }
}

testPreviewsHttp();
