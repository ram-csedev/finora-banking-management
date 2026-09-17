const API = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000'))
  ? 'http://localhost:5000/api'
  : '/api';
var state = { view: 'dashboard', data: {}, search: '' };
const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const num = n => new Intl.NumberFormat('en-IN').format(Number(n)||0);
const date = v => { if(!v) return '—'; const d=new Date(v); return isNaN(d)?String(v).slice(0,10):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };
const title = s => s.replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
function toast(msg, ok=true){const el=$('#toast');el.textContent=msg;el.style.background=ok?'#10162a':'#7f2525';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}
async function api(path, options={}){const res=await fetch(API+path,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});let json={};try{json=await res.json()}catch{}if(!res.ok||json.success===false)throw new Error(json.error||'Request failed');return json}
function rows(json){return (json.data||[]).map(r=>Array.isArray(r)?r:Object.values(r));}
async function load(path,key){const j=await api(path);state.data[key]=rows(j);return state.data[key]}
function table(headers, data, renderRow){if(!data?.length)return `<div class="empty">No records found.</div>`;return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${data.map(renderRow).join('')}</tbody></table></div>`}
const badge = (text, type='neutral')=>`<span class="badge ${type}">${text??'—'}</span>`;
const LOAN_COLORS = { HOME: '#6d5dfc', CAR: '#0ea5e9', EDUCATION: '#10b981', PERSONAL: '#f59e0b', BUSINESS: '#ec4899', GOLD: '#eab308' };
const CARD_COLORS = { VISA: '#2563eb', MASTERCARD: '#ea580c', RUPAY: '#059669', AMEX: '#7c3aed', DISCOVER: '#d97706' };
const CHART_PALETTE = ['#6d5dfc', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#2563eb', '#ea580c', '#059669', '#7c3aed', '#eab308'];

function renderPieSvg(slices, size = 120) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;
  const total = slices.reduce((sum, s) => sum + (Number(s.value) || 0), 0);

  if (!total || !slices.length) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#eef2f6"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#8d95aa" font-size="11" font-family="'DM Sans',sans-serif">No data</text></svg>`;
  }

  const activeSlices = slices.filter(s => (Number(s.value) || 0) > 0);
  if (activeSlices.length === 1) {
    const s = activeSlices[0];
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="pie-chart-svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" class="pie-slice">
        <title>${s.label}: ${s.displayValue} (100%)</title>
      </circle>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="'Space Grotesk',sans-serif" style="pointer-events:none">100%</text>
    </svg>`;
  }

  let currentAngle = -Math.PI / 2;
  const paths = [];
  const labels = [];

  for (const s of activeSlices) {
    const fraction = s.value / total;
    const angle = fraction * 2 * Math.PI;
    const endAngle = currentAngle + angle;

    const x1 = cx + r * Math.cos(currentAngle);
    const y1 = cy + r * Math.sin(currentAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    paths.push(`<path d="${d}" fill="${s.color}" stroke="#fff" stroke-width="1.5" class="pie-slice"><title>${s.label}: ${s.displayValue} (${s.percent}%)</title></path>`);

    if (fraction >= 0.12) {
      const midAngle = currentAngle + angle / 2;
      const lx = cx + (r * 0.62) * Math.cos(midAngle);
      const ly = cy + (r * 0.62) * Math.sin(midAngle) + 4;
      labels.push(`<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="'Space Grotesk',sans-serif" style="pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.3)">${s.percent}%</text>`);
    }

    currentAngle = endAngle;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="pie-chart-svg">${paths.join('')}${labels.join('')}</svg>`;
}

function renderLegend(slices) {
  if (!slices.length) return `<div class="empty" style="padding:10px">No records</div>`;
  return slices.map(s => `
    <div class="dist-legend-item" title="${s.label}: ${s.displayValue} (${s.percent}%)">
      <div class="dist-legend-left">
        <span class="dist-legend-dot" style="background:${s.color}"></span>
        <span class="dist-legend-label">${s.label}</span>
      </div>
      <div class="dist-legend-right">
        <span class="dist-legend-pct">${s.percent}%</span>
        <span class="dist-legend-val">${s.displayValue}</span>
      </div>
    </div>
  `).join('');
}

function dashboard(){
  const d=state.data.dashboard||{};
  const tx=state.data.transactions||[];
  const loans=state.data.loans||[];

  // Loan Distribution Data (group by l_type, SUM(amount))
  let rawLoanDist = d.loan_distribution;
  if (!rawLoanDist && state.data.loans) {
    const loanMap = {};
    for (const r of state.data.loans) {
      const t = String(r[2] || 'OTHER').toUpperCase();
      loanMap[t] = (loanMap[t] || 0) + (Number(r[3]) || 0);
    }
    rawLoanDist = Object.entries(loanMap).map(([type, amount]) => ({ type, amount }));
  }
  rawLoanDist = (rawLoanDist || []).sort((a, b) => b.amount - a.amount);
  const totalLoanAmt = rawLoanDist.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const loanSlices = rawLoanDist.map((item, idx) => {
    const amt = Number(item.amount) || 0;
    const pct = totalLoanAmt > 0 ? ((amt / totalLoanAmt) * 100).toFixed(1) : '0';
    const typeKey = String(item.type || '').toUpperCase();
    const color = LOAN_COLORS[typeKey] || CHART_PALETTE[idx % CHART_PALETTE.length];
    return {
      label: title(String(item.type || 'Other').toLowerCase()),
      value: amt,
      percent: pct,
      displayValue: money(amt),
      color
    };
  });

  // Credit Card Distribution Data (group by "TYPE", COUNT(*))
  let rawCardDist = d.card_distribution;
  if (!rawCardDist && state.data.cards) {
    const cardMap = {};
    for (const r of state.data.cards) {
      const t = String(r[1] || 'OTHER').toUpperCase();
      cardMap[t] = (cardMap[t] || 0) + 1;
    }
    rawCardDist = Object.entries(cardMap).map(([type, count]) => ({ type, count }));
  }
  rawCardDist = (rawCardDist || []).sort((a, b) => b.count - a.count);
  const totalCardCount = rawCardDist.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const cardSlices = rawCardDist.map((item, idx) => {
    const cnt = Number(item.count) || 0;
    const pct = totalCardCount > 0 ? ((cnt / totalCardCount) * 100).toFixed(1) : '0';
    const typeKey = String(item.type || '').toUpperCase();
    const color = CARD_COLORS[typeKey] || CHART_PALETTE[(idx + 4) % CHART_PALETTE.length];
    return {
      label: title(String(item.type || 'Other').toLowerCase()),
      value: cnt,
      percent: pct,
      displayValue: `${cnt} card${cnt === 1 ? '' : 's'}`,
      color
    };
  });

  return `
<div class="hero"><div><div class="eyebrow">Overview</div><h1>Good evening, Priyanshi.</h1><p>Your banking operations at a glance. Data is read directly from the Oracle-backed API.</p></div><div class="hero-actions"><button class="btn btn-soft" onclick="navigate('money')">Quick transfer</button><button class="btn btn-primary" onclick="navigate('tools')">Banking tools</button></div></div>
<div class="stats">
${stat('Total Balance',money(d.total_balance),'Across all accounts','₹')} ${stat('Customers',num(d.total_customers),'Registered customers','◎')} ${stat('Loans',num(d.total_loans),money(d.total_loan_amount)+' total sanctioned','◈')} ${stat('Credit Cards',num(d.total_credit_cards),'Active portfolio','▤')}</div>
<div class="grid-2">
  <div class="card"><div class="card-head"><h3>Recent transactions</h3><span>${num(d.total_transactions)} total</span></div>${table(['Transaction','Account','Type','Amount','Status'],tx.slice(0,6),r=>`<tr><td><b>#${r[0]}</b><br><small class="muted">${date(r[2])}</small></td><td>${r[1]}</td><td>${r[3]==='DEPOSIT'?badge('Deposit','success'):r[3]==='WITHDRAWAL'?badge('Withdrawal','warning'):badge(r[3])}</td><td><b>${money(r[4])}</b></td><td>${r[6]||r[5]==='SUCCESS'?badge('Success','success'):badge(r[6]||r[5])}</td></tr>`)}</div>
  <div class="card dist-card">
    <div class="card-head"><h3>Loan & Credit Card Distribution</h3><span>Live portfolio breakdown</span></div>
    <div class="dist-row">
      <div class="dist-col">
        <div class="dist-subhead"><h4>Loan Distribution</h4><span>${money(totalLoanAmt)} total</span></div>
        <div class="dist-chart-wrap">${renderPieSvg(loanSlices, 120)}</div>
        <div class="dist-legend">${renderLegend(loanSlices)}</div>
      </div>
      <div class="dist-col">
        <div class="dist-subhead"><h4>Credit Cards</h4><span>${totalCardCount} issued</span></div>
        <div class="dist-chart-wrap">${renderPieSvg(cardSlices, 120)}</div>
        <div class="dist-legend">${renderLegend(cardSlices)}</div>
      </div>
    </div>
  </div>
</div>
<div class="section-gap card"><div class="card-head"><h3>Loan portfolio</h3><span>Interest & tenure</span></div>${table(['Loan','Customer','Type','Amount','Rate','Term'],loans.slice(0,5),r=>`<tr><td><b>#${r[0]}</b></td><td>${r[6]||'Customer '+r[1]}</td><td>${badge(r[2])}</td><td>${money(r[3])}</td><td>${r[4]}%</td><td>${r[5]} months</td></tr>`)}</div>`;
}
function stat(label,value,note,icon){return `<div class="stat"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`}
function accountsTable(){const a=filter(state.data.accounts||[]);return{count:`${a.length} records`,html:table(['Account','Customer ID','Type','Balance','Status'],a,r=>`<tr><td><b>#${r[0]}</b></td><td>${r[4]}</td><td>${badge(r[3])}</td><td><b>${money(r[1])}</b></td><td>${r[2]==='ACTIVE'?badge('Active','success'):badge(r[2])}</td></tr>`)};}
function accounts(){const res=accountsTable();return pageHead('Accounts','Monitor account balances, type and status.',`<button class="btn btn-primary" onclick="openCreateAccount()">+ Create Account</button> <button class="btn btn-soft" onclick="navigate('money')">+ Money operation</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search account or customer ID…" value="${state.search}" oninput="onSearchInput(this.value)"/> <span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function transactionsTable(){const t=filter(state.data.transactions||[]).filter(r=>!state.txType||r[3]===state.txType);return{count:`${t.length} records`,html:table(['ID','Date','Account','Type','Mode','Amount','Status'],t,r=>`<tr><td><b>#${r[0]}</b></td><td>${date(r[2])}</td><td>${r[1]}</td><td>${badge(r[3],r[3]==='DEPOSIT'?'success':r[3]==='WITHDRAWAL'?'warning':'neutral')}</td><td>${r[5]||'—'}</td><td><b>${money(r[4])}</b></td><td>${r[6]==='SUCCESS'?badge('Success','success'):badge(r[6])}</td></tr>`)};}
function transactions(){const res=transactionsTable();return pageHead('Transactions','A complete ledger of account activity.',`<button class="btn btn-primary" onclick="navigate('money')">Create transaction</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search transaction, account or type…" value="${state.search}" oninput="onSearchInput(this.value)"/><div style="display:flex;gap:10px;align-items:center"><select class="select" onchange="state.txType=this.value;updateResults()"><option value="" ${!state.txType?'selected':''}>All types</option><option ${state.txType==='DEPOSIT'?'selected':''}>DEPOSIT</option><option ${state.txType==='WITHDRAWAL'?'selected':''}>WITHDRAWAL</option><option ${state.txType==='TRANSFER'?'selected':''}>TRANSFER</option></select><span class="muted" id="searchCount">${res.count}</span></div></div><div id="tableContainer">${res.html}</div></div>`;}

function loansTable(){const l=filter(state.data.loans||[]);return{count:`${l.length} loans`,html:table(['Loan','Customer','Type','Principal','Interest','Term'],l,r=>`<tr><td><b>#${r[0]}</b></td><td>${r[6]||'CID '+r[1]}</td><td>${badge(r[2])}</td><td><b>${money(r[3])}</b></td><td>${r[4]}%</td><td>${r[5]} months</td></tr>`)};}
function loans(){const res=loansTable();return pageHead('Loans','Review loan products, principal, interest and tenure.',`<button class="btn btn-primary" onclick="openCreateLoan()">+ Create Loan</button> <button class="btn btn-soft" onclick="navigate('tools')">Check eligibility</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search loan or customer…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function customersTable(){const c=filter(state.data.customers||[]);return{count:`${c.length} customers`,html:table(['CID','Customer','PAN','Location','DOB','Employee'],c,r=>`<tr><td><b>#${r[0]}</b></td><td><b>${r[2]} ${r[3]||''}</b></td><td>${r[1]}</td><td>${r[4]}, ${r[5]} ${r[6]||''}</td><td>${date(r[7])}</td><td>${r[8]||'—'}</td></tr>`)};}
function customers(){const res=customersTable();return pageHead('Customers','Customer records from the Oracle Customer table.',`<button class="btn btn-primary" onclick="openAddCustomer()">+ Add Customer</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search name, CID or city…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function cardsTable(){const c=filter(state.data.cards||[]);return{count:`${c.length} cards`,html:c.length?`<div class="cards-grid">${c.map(r=>`<div class="card"><div class="card-visual"><div>FINORA <span style="float:right;font-size:10px">${r[1]}</span></div><div class="chip"></div><div class="card-number">•••• •••• •••• ${String(r[0]).slice(-4)}</div><div class="card-foot"><span>CARD MEMBER</span><span>VALID THRU ${date(r[3]).slice(-7)}</span></div></div><div class="metric-line"><span>Card limit</span><b>${money(r[2])}</b></div><div class="metric-line"><span>Customer</span><b>CID ${r[6]}</b></div><div>${r[4]==='ACTIVE'?badge('Active','success'):badge(r[4])}</div></div>`).join('')}</div>`:`<div class="empty">No records found.</div>`};}
function cards(){const res=cardsTable();return pageHead('Credit Cards','Cards linked to customers and their configured limits.',`<button class="btn btn-primary" onclick="openCreateCreditCard()">+ Create Credit Card</button>`)+`<div class="card" style="margin-bottom:20px"><div class="toolbar"><input class="search" placeholder="Search card, type or customer…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div></div><div id="tableContainer">${res.html}</div>`;}

function branchesTable(){const b=filter(state.data.branches||[]);return{count:`${b.length} branches`,html:table(['ID','Branch','City','State','IFSC','Contact'],b,r=>`<tr><td>#${r[0]}</td><td><b>${r[1]}</b></td><td>${r[2]||'—'}</td><td>${r[3]||'—'}</td><td><b>${r[5]||'—'}</b></td><td>${r[6]||'—'}</td></tr>`)};}
function branches(){const res=branchesTable();return pageHead('Branches','Branch directory, IFSC and contact information.',`<button class="btn btn-primary" onclick="openCreateBranch()">+ Create Branch</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search branch, city or IFSC…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function employeesTable(){const e=filter(state.data.employees||[]);const branchMap=Object.fromEntries((state.data.branches||[]).map(b=>[b[0],b[1]]));return{count:`${e.length} employees`,html:table(['ID','Employee','Salary','Hire Date','Branch'],e,r=>`<tr><td><b>#${r[0]}</b></td><td><b>${r[1]} ${r[2]||''}</b></td><td><b>${money(r[3])}</b></td><td>${date(r[4])}</td><td>${r[5]?(branchMap[r[5]]?branchMap[r[5]]+' (#'+r[5]+')':'Branch #'+r[5]):'—'}</td></tr>`)};}
function employeesView(){const res=employeesTable();return pageHead('Employees','Branch staff records and salary details.',`<button class="btn btn-primary" onclick="openCreateEmployee()">+ Create Employee</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search employee or branch…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}
function moneyPage(){return pageHead('Deposit / Withdraw','Use the database procedures to update account balances.',`<button class="btn btn-soft" onclick="loadAll();toast('Data refreshed')">Refresh data</button>`)+`<div class="tool-grid"><button class="tool" onclick="openMoney('deposit')"><div class="tool-icon">＋</div><h4>Deposit money</h4><p>Credits an account using the PL/SQL deposit_money procedure.</p></button><button class="tool" onclick="openMoney('withdraw')"><div class="tool-icon">−</div><h4>Withdraw money</h4><p>Debits an account with balance and amount validation.</p></button><button class="tool" onclick="navigate('tools')"><div class="tool-icon">✓</div><h4>Check balance</h4><p>Call the get_balance function for any account.</p></button></div><div class="section-gap callout"><b>Database-backed operations</b><p>Successful deposits and withdrawals are handled by the existing backend procedures, so the frontend does not bypass your PL/SQL business rules.</p></div>`}
function tools(){return pageHead('Banking Tools','Small workflows that demonstrate your DBMS features.')+`<div class="grid-2"><div class="card"><div class="card-head"><h3>Account balance</h3><span>get_balance()</span></div><div class="form-grid"><div class="field"><label>Account ID</label><input id="balanceAcc" type="number" placeholder="401"></div></div><div class="modal-actions" style="justify-content:flex-start"><button class="btn btn-primary" onclick="checkBalance()">Check balance</button></div><div id="balanceResult" class="form-result"></div></div><div class="card"><div class="card-head"><h3>Loan eligibility</h3><span>check_loan_eligibility()</span></div><div class="form-grid"><div class="field"><label>Customer ID</label><input id="eligCid" type="number" placeholder="301"></div></div><div class="modal-actions" style="justify-content:flex-start"><button class="btn btn-primary" onclick="checkEligibility()">Check eligibility</button></div><div id="eligResult" class="form-result"></div></div></div><div class="section-gap card"><div class="card-head"><h3>How this maps to the DBMS</h3></div><div class="metric-line"><span>Balance validation</span><b>Account balance constraint + triggers</b></div><div class="metric-line"><span>Money movement</span><b>deposit_money / withdraw_money</b></div><div class="metric-line"><span>Eligibility rule</span><b>Balance ≥ ₹1,00,000</b></div></div>`}
function pageHead(h,p,action=''){return `<div class="hero"><div><div class="eyebrow">Finora workspace</div><h1>${h}</h1><p>${p}</p></div><div class="hero-actions">${action}</div></div>`}
function filter(data){const q=(state.search||'').toLowerCase().trim();if(!q)return data;return data.filter(r=>r.some(x=>String(x??'').toLowerCase().includes(q)))}
function modal(){if($('#modal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modal"><div class="modal"><div class="modal-head"><h3 id="modalTitle">Money operation</h3><button class="close" onclick="closeModal()">×</button></div><div class="form-grid"><div class="field"><label>Account ID</label><input id="opAcc" type="number" placeholder="401"></div><div class="field"><label>Amount (₹)</label><input id="opAmount" type="number" min="1" step="1" placeholder="1000"></div></div><div class="alert">The request is sent to the existing Oracle-backed API and follows its PL/SQL validation.</div><div class="modal-actions"><button class="btn btn-soft" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="opSubmit">Confirm</button></div></div></div>`)}
function openMoney(type){modal();$('#modalTitle').textContent=type==='deposit'?'Deposit money':'Withdraw money';$('#opSubmit').onclick=async()=>{const acc=Number($('#opAcc').value),amount=Number($('#opAmount').value);if(!acc||!amount)return toast('Enter a valid account and amount',false);try{await api('/'+type,{method:'POST',body:JSON.stringify({acc_id:acc,amount})});closeModal();toast(type==='deposit'?'Deposit successful':'Withdrawal successful');await loadAll();renderView(true)}catch(e){toast(e.message,false)}};$('#modal').classList.add('open')}
function closeModal(){$('#modal')?.classList.remove('open')}

function customerModal(){if($('#custModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="custModal"><div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-head"><h3>Add New Customer</h3><button class="close" onclick="closeCustomerModal()">×</button></div><div class="form-grid"><div class="field"><label>First Name *</label><input id="cfFirst" placeholder="First Name" required /></div><div class="field"><label>Last Name</label><input id="cfLast" placeholder="Last Name" /></div><div class="field"><label>PAN (Unique)</label><input id="cfPan" placeholder="e.g. ABCDE1234F" style="text-transform:uppercase" /></div><div class="field"><label>Date of Birth</label><input id="cfDob" type="date" /></div><div class="field"><label>City</label><input id="cfCity" placeholder="City" /></div><div class="field"><label>State</label><input id="cfState" placeholder="State" /></div><div class="field"><label>Pincode</label><input id="cfPin" placeholder="e.g. 600001" /></div><div class="field"><label>Phone Number</label><input id="cfPhone" placeholder="e.g. 9876543210" /></div><div class="field full"><label>Assigned Employee</label><select id="cfEmp" class="select" style="width:100%"><option value="">None (Optional)</option></select></div></div><div id="custError" style="margin-top:12px"></div><div class="modal-actions"><button class="btn btn-soft" onclick="closeCustomerModal()">Cancel</button><button class="btn btn-primary" id="cfSubmit">Add Customer</button></div></div></div>`)}
function closeCustomerModal(){$('#custModal')?.classList.remove('open');if($('#custError'))$('#custError').innerHTML=''}
async function openAddCustomer(){customerModal();$('#cfFirst').value='';$('#cfLast').value='';$('#cfPan').value='';$('#cfDob').value='';$('#cfCity').value='';$('#cfState').value='';$('#cfPin').value='';$('#cfPhone').value='';if($('#custError'))$('#custError').innerHTML='';try{if(!state.data.employees)await load('/employees','employees');const emps=state.data.employees||[];$('#cfEmp').innerHTML='<option value="">None (Optional)</option>'+emps.map(e=>`<option value="${e[0]}">${e[1]} ${e[2]||''} (Emp #${e[0]})</option>`).join('')}catch(_){}$('#cfSubmit').onclick=async()=>{const first_name=$('#cfFirst').value.trim(),last_name=$('#cfLast').value.trim(),pan=$('#cfPan').value.trim().toUpperCase(),dob=$('#cfDob').value.trim(),city=$('#cfCity').value.trim(),stateVal=$('#cfState').value.trim(),pincode=$('#cfPin').value.trim(),phone=$('#cfPhone').value.trim(),emp_id=$('#cfEmp').value?Number($('#cfEmp').value):null;if(!first_name){$('#custError').innerHTML='<div class="alert">First name is required.</div>';return}try{const res=await api('/customers',{method:'POST',body:JSON.stringify({first_name,last_name,pan,dob,city,state:stateVal,pincode,phone,emp_id})});closeCustomerModal();toast('Customer #'+res.data.cid+' ('+res.data.first_name+') created successfully!');await loadAll();renderView(true)}catch(err){$('#custError').innerHTML=`<div class="alert">${err.message}</div>`}};$('#custModal').classList.add('open')}

function accountModal(){if($('#accModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="accModal"><div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-head"><h3>Create New Account</h3><button class="close" onclick="closeAccountModal()">×</button></div><div class="form-grid"><div class="field full"><label>Select Customer *</label><select id="afCid" class="select" style="width:100%" required><option value="">Select a Customer *</option></select></div><div class="field"><label>Account Type *</label><select id="afType" class="select" style="width:100%"><option value="SAVINGS" selected>SAVINGS</option><option value="CURRENT">CURRENT</option></select></div><div class="field"><label>Opening Balance (₹)</label><input id="afBalance" type="number" min="0" step="1" value="0" placeholder="0" /></div><div class="field full"><label>Account Status</label><select id="afStatus" class="select" style="width:100%"><option value="ACTIVE" selected>ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div></div><div id="accError" style="margin-top:12px"></div><div class="modal-actions"><button class="btn btn-soft" onclick="closeAccountModal()">Cancel</button><button class="btn btn-primary" id="afSubmit">Create Account</button></div></div></div>`)}
function closeAccountModal(){$('#accModal')?.classList.remove('open');if($('#accError'))$('#accError').innerHTML=''}
async function openCreateAccount(){accountModal();$('#afBalance').value='0';$('#afType').value='SAVINGS';$('#afStatus').value='ACTIVE';if($('#accError'))$('#accError').innerHTML='';try{if(!state.data.customers)await load('/customers','customers');const custs=state.data.customers||[];$('#afCid').innerHTML='<option value="">Select a Customer *</option>'+custs.map(c=>`<option value="${c[0]}">${c[2]} ${c[3]||''} (CID #${c[0]})</option>`).join('')}catch(_){}$('#afSubmit').onclick=async()=>{const cid=$('#afCid').value,acc_type=$('#afType').value,balance=Number($('#afBalance').value),status=$('#afStatus').value;if(!cid){$('#accError').innerHTML='<div class="alert">Please select a customer.</div>';return}if(isNaN(balance)||balance<0){$('#accError').innerHTML='<div class="alert">Opening balance must be 0 or greater.</div>';return}try{const res=await api('/accounts',{method:'POST',body:JSON.stringify({cid:Number(cid),acc_type,balance,status})});closeAccountModal();toast('Account #'+res.data.acc_id+' created successfully for CID #'+res.data.cid+'!');await loadAll();renderView(true)}catch(err){$('#accError').innerHTML=`<div class="alert">${err.message}</div>`}};$('#accModal').classList.add('open')}

function loanModal(){if($('#loanModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="loanModal"><div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-head"><h3>Apply / Create Loan</h3><button class="close" onclick="closeLoanModal()">×</button></div><div class="form-grid"><div class="field full"><label>Select Customer *</label><select id="lfCid" class="select" style="width:100%" required><option value="">Select a Customer *</option></select></div><div class="field"><label>Loan Type *</label><select id="lfType" class="select" style="width:100%"><option value="HOME" selected>HOME</option><option value="CAR">CAR</option><option value="PERSONAL">PERSONAL</option><option value="EDUCATION">EDUCATION</option><option value="BUSINESS">BUSINESS</option></select></div><div class="field"><label>Principal Amount (₹) *</label><input id="lfAmount" type="number" min="1" step="1000" placeholder="e.g. 500000" required /></div><div class="field"><label>Annual Interest Rate (%) *</label><input id="lfInterest" type="number" min="0" step="0.01" placeholder="e.g. 8.50" value="8.50" required /></div><div class="field"><label>Tenure (Months) *</label><input id="lfTerm" type="number" min="1" step="1" placeholder="e.g. 60" value="60" required /></div></div><div id="loanError" style="margin-top:12px"></div><div class="modal-actions"><button class="btn btn-soft" onclick="closeLoanModal()">Cancel</button><button class="btn btn-primary" id="lfSubmit">Create Loan</button></div></div></div>`)}
function closeLoanModal(){$('#loanModal')?.classList.remove('open');if($('#loanError'))$('#loanError').innerHTML=''}
async function openCreateLoan(){loanModal();$('#lfType').value='HOME';$('#lfAmount').value='';$('#lfInterest').value='8.50';$('#lfTerm').value='60';if($('#loanError'))$('#loanError').innerHTML='';try{if(!state.data.customers)await load('/customers','customers');const custs=state.data.customers||[];$('#lfCid').innerHTML='<option value="">Select a Customer *</option>'+custs.map(c=>`<option value="${c[0]}">${c[2]} ${c[3]||''} (CID #${c[0]})</option>`).join('')}catch(_){}$('#lfSubmit').onclick=async()=>{const cid=$('#lfCid').value,l_type=$('#lfType').value,amount=Number($('#lfAmount').value),interest=Number($('#lfInterest').value),term=Number($('#lfTerm').value);if(!cid){$('#loanError').innerHTML='<div class="alert">Please select a customer.</div>';return}if(isNaN(amount)||amount<=0){$('#loanError').innerHTML='<div class="alert">Loan amount must be greater than 0.</div>';return}if(isNaN(interest)||interest<0){$('#loanError').innerHTML='<div class="alert">Interest rate must be 0 or greater.</div>';return}if(isNaN(term)||term<=0||!Number.isInteger(term)){$('#loanError').innerHTML='<div class="alert">Tenure must be a positive number of months.</div>';return}try{const res=await api('/loans',{method:'POST',body:JSON.stringify({cid:Number(cid),l_type,amount,interest,term})});closeLoanModal();toast('Loan #'+res.data.l_id+' ('+res.data.l_type+' - '+money(res.data.amount)+') created successfully!');await loadAll();renderView(true)}catch(err){$('#loanError').innerHTML=`<div class="alert">${err.message}</div>`}};$('#loanModal').classList.add('open')}

async function checkBalance(){const id=Number($('#balanceAcc').value);if(!id)return;try{const j=await api(`/account/${id}/balance`);const r=rows(j)[0];$('#balanceResult').innerHTML=`<div class="big-result">${money(r?.[0])}</div><div class="muted">Current balance for account #${id}</div>`}catch(e){$('#balanceResult').innerHTML=`<div class="alert">${e.message}</div>`}}
async function checkEligibility(){const id=Number($('#eligCid').value);if(!id)return;try{const j=await api(`/customer/${id}/loan-eligibility`);const r=rows(j)[0]?.[0];const ok=String(r).toUpperCase()==='ELIGIBLE';const msg=ok?'Eligible because the account balance meets the minimum requirement of ₹1,00,000.':'Not eligible because the account balance is below ₹1,00,000.';$('#eligResult').innerHTML=`<div class="big-result">${ok?'Eligible':'Not eligible'}</div><div class="muted">${msg}</div>`}catch(e){$('#eligResult').innerHTML=`<div class="alert">${e.message}</div>`}}
async function loadAll(){try{const [d,a,t,l,c,cu,b,e]=await Promise.all([api('/dashboard'),load('/accounts','accounts'),load('/transactions','transactions'),load('/loans','loans'),load('/creditcards','cards'),load('/customers','customers'),load('/branches','branches'),load('/employees','employees')]);state.data.dashboard=d.data||{};state.data.accounts=a;state.data.transactions=t;state.data.loans=l;state.data.cards=c;state.data.customers=cu;state.data.branches=b;state.data.employees=e;toast('Dashboard data refreshed')}catch(e){toast('Could not reach backend: '+e.message,false)}}
function branchModal(){if($('#brModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="brModal"><div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-head"><h3>Create New Branch</h3><button class="close" onclick="closeBranchModal()">×</button></div><div class="form-grid"><div class="field full"><label>Branch Name *</label><input id="bfName" placeholder="e.g. Connaught Place Branch" required /></div><div class="field"><label>IFSC Code (Unique)</label><input id="bfIfsc" placeholder="e.g. FINO0001006" style="text-transform:uppercase" /></div><div class="field"><label>Contact Number</label><input id="bfContact" placeholder="e.g. 011-23456789" /></div><div class="field"><label>City</label><input id="bfCity" placeholder="City" /></div><div class="field"><label>State</label><input id="bfState" placeholder="State" /></div><div class="field full"><label>Pincode</label><input id="bfPin" placeholder="e.g. 110001" /></div></div><div id="branchError" style="margin-top:12px"></div><div class="modal-actions"><button class="btn btn-soft" onclick="closeBranchModal()">Cancel</button><button class="btn btn-primary" id="bfSubmit">Create Branch</button></div></div></div>`)}
function closeBranchModal(){$('#brModal')?.classList.remove('open');if($('#branchError'))$('#branchError').innerHTML=''}
async function openCreateBranch(){branchModal();$('#bfName').value='';$('#bfIfsc').value='';$('#bfContact').value='';$('#bfCity').value='';$('#bfState').value='';$('#bfPin').value='';if($('#branchError'))$('#branchError').innerHTML='';$('#bfSubmit').onclick=async()=>{const branch_name=$('#bfName').value.trim(),ifsc=$('#bfIfsc').value.trim().toUpperCase(),contact=$('#bfContact').value.trim(),city=$('#bfCity').value.trim(),stateVal=$('#bfState').value.trim(),pincode=$('#bfPin').value.trim();if(!branch_name){$('#branchError').innerHTML='<div class="alert">Branch name is required.</div>';return}try{const res=await api('/branches',{method:'POST',body:JSON.stringify({branch_name,ifsc:ifsc||null,contact:contact||null,city:city||null,state:stateVal||null,pincode:pincode||null})});closeBranchModal();toast('Branch #'+res.data.b_id+' ('+res.data.branch_name+') created successfully!');await loadAll();renderView(true)}catch(err){$('#branchError').innerHTML=`<div class="alert">${err.message}</div>`}};$('#brModal').classList.add('open')}

function employeeModal(){if($('#empModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="empModal"><div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-head"><h3>Add New Employee</h3><button class="close" onclick="closeEmployeeModal()">×</button></div><div class="form-grid"><div class="field"><label>First Name *</label><input id="efFirst" placeholder="First Name" required /></div><div class="field"><label>Last Name</label><input id="efLast" placeholder="Last Name" /></div><div class="field"><label>Salary (₹)</label><input id="efSalary" type="number" min="0" step="500" placeholder="e.g. 50000" /></div><div class="field"><label>Hire Date</label><input id="efHireDate" type="date" /></div><div class="field full"><label>Assigned Branch</label><select id="efBranch" class="select" style="width:100%"><option value="">None (Optional)</option></select></div></div><div id="empError" style="margin-top:12px"></div><div class="modal-actions"><button class="btn btn-soft" onclick="closeEmployeeModal()">Cancel</button><button class="btn btn-primary" id="efSubmit">Create Employee</button></div></div></div>`)}
function closeEmployeeModal(){$('#empModal')?.classList.remove('open');if($('#empError'))$('#empError').innerHTML=''}
async function openCreateEmployee(){employeeModal();$('#efFirst').value='';$('#efLast').value='';$('#efSalary').value='';$('#efHireDate').value=new Date().toISOString().slice(0,10);if($('#empError'))$('#empError').innerHTML='';try{if(!state.data.branches)await load('/branches','branches');const branches=state.data.branches||[];$('#efBranch').innerHTML='<option value="">None (Optional)</option>'+branches.map(b=>`<option value="${b[0]}">${b[1]} (Branch #${b[0]})</option>`).join('')}catch(_){}$('#efSubmit').onclick=async()=>{const first_name=$('#efFirst').value.trim(),last_name=$('#efLast').value.trim(),salary=$('#efSalary').value!==''?Number($('#efSalary').value):null,hire_date=$('#efHireDate').value.trim(),b_id=$('#efBranch').value?Number($('#efBranch').value):null;if(!first_name){$('#empError').innerHTML='<div class="alert">First name is required.</div>';return}if(salary!==null&&(isNaN(salary)||salary<0)){$('#empError').innerHTML='<div class="alert">Salary must be 0 or greater.</div>';return}try{const res=await api('/employees',{method:'POST',body:JSON.stringify({first_name,last_name:last_name||null,salary,hire_date:hire_date||null,b_id})});closeEmployeeModal();toast('Employee #'+res.data.emp_id+' ('+res.data.first_name+') created successfully!');await loadAll();renderView(true)}catch(err){$('#empError').innerHTML=`<div class="alert">${err.message}</div>`}};$('#empModal').classList.add('open')}

function creditCardModal(){if($('#ccModal'))return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="ccModal"><div class="modal" style="max-height:90vh;overflow-y:auto"><div class="modal-head"><h3>Issue New Credit Card</h3><button class="close" onclick="closeCreditCardModal()">×</button></div><div class="form-grid"><div class="field full"><label>Select Customer *</label><select id="ccCid" class="select" style="width:100%" required><option value="">Select a Customer *</option></select></div><div class="field"><label>Card Type *</label><select id="ccType" class="select" style="width:100%"><option value="VISA" selected>VISA</option><option value="MASTERCARD">MASTERCARD</option><option value="RUPAY">RUPAY</option><option value="AMEX">AMEX</option></select></div><div class="field"><label>Card Limit (₹) *</label><input id="ccLimit" type="number" min="1000" step="5000" value="100000" placeholder="100000" required /></div><div class="field"><label>Expiry Date</label><input id="ccExpiry" type="date" /></div><div class="field"><label>CVV (3 or 4 digits)</label><input id="ccCvv" placeholder="Auto-generated if blank" maxlength="4" /></div><div class="field full"><label>Card Number (16 digits)</label><input id="ccPno" placeholder="Auto-generated if blank" maxlength="16" /></div><div class="field full"><label>Status</label><select id="ccStatus" class="select" style="width:100%"><option value="ACTIVE" selected>ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="BLOCKED">BLOCKED</option></select></div></div><div id="cardError" style="margin-top:12px"></div><div class="modal-actions"><button class="btn btn-soft" onclick="closeCreditCardModal()">Cancel</button><button class="btn btn-primary" id="ccSubmit">Issue Card</button></div></div></div>`)}
function closeCreditCardModal(){$('#ccModal')?.classList.remove('open');if($('#cardError'))$('#cardError').innerHTML=''}
async function openCreateCreditCard(){creditCardModal();$('#ccLimit').value='100000';$('#ccType').value='VISA';$('#ccStatus').value='ACTIVE';$('#ccExpiry').value='';$('#ccCvv').value='';$('#ccPno').value='';if($('#cardError'))$('#cardError').innerHTML='';try{if(!state.data.customers)await load('/customers','customers');const custs=state.data.customers||[];$('#ccCid').innerHTML='<option value="">Select a Customer *</option>'+custs.map(c=>`<option value="${c[0]}">${c[2]} ${c[3]||''} (CID #${c[0]})</option>`).join('')}catch(_){}$('#ccSubmit').onclick=async()=>{const cid=$('#ccCid').value,type=$('#ccType').value,limit=Number($('#ccLimit').value),expiry=$('#ccExpiry').value.trim(),cvv=$('#ccCvv').value.trim(),pno=$('#ccPno').value.trim(),status=$('#ccStatus').value;if(!cid){$('#cardError').innerHTML='<div class="alert">Please select a customer.</div>';return}if(isNaN(limit)||limit<=0){$('#cardError').innerHTML='<div class="alert">Card limit must be greater than 0.</div>';return}if(cvv&&!/^\d{3,4}$/.test(cvv)){$('#cardError').innerHTML='<div class="alert">CVV must be 3 or 4 digits.</div>';return}if(pno&&!/^\d{16}$/.test(pno)){$('#cardError').innerHTML='<div class="alert">Card number must be exactly 16 digits.</div>';return}try{const res=await api('/creditcards',{method:'POST',body:JSON.stringify({cid:Number(cid),type,card_limit:limit,expiry:expiry||null,cvv:cvv||null,pno:pno||null,status})});closeCreditCardModal();toast('Credit card ending in '+String(res.data.pno).slice(-4)+' issued successfully!');await loadAll();renderView(true)}catch(err){$('#cardError').innerHTML=`<div class="alert">${err.message}</div>`}};$('#ccModal').classList.add('open')}

const views={dashboard:dashboard,accounts,transactions,loans,cards,customers,branches,employees:employeesView,money:moneyPage,tools};
const viewTables={accounts:accountsTable,transactions:transactionsTable,loans:loansTable,customers:customersTable,cards:cardsTable,branches:branchesTable,employees:employeesTable};
function updateResults(){
  const fn=viewTables[state.view];
  if(!fn) return;
  const res=fn();
  const tc=$('#tableContainer');
  if(tc) tc.innerHTML=res.html;
  const sc=$('#searchCount');
  if(sc&&res.count!==undefined) sc.textContent=res.count;
}
function onSearchInput(val){
  state.search=val;
  updateResults();
}
function renderView(full=false){
  const currentView=$('#content')?.dataset?.view;
  if(!full && currentView===state.view && $('#tableContainer') && viewTables[state.view]){
    updateResults();
    return;
  }
  const fn=views[state.view]||dashboard;
  $('#content').innerHTML=fn();
  $('#content').dataset.view=state.view;
  $('#pageTitle').textContent=title(state.view);
}
async function navigate(v){
  state.view=v;
  state.search='';
  if(v!=='transactions') state.txType='';
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  $('#sidebar').classList.remove('open');
  renderView(true);
  if(['dashboard','accounts','transactions','loans','cards','customers','branches','employees'].includes(v)){
    const map={dashboard:'/dashboard',accounts:'/accounts',transactions:'/transactions',loans:'/loans',cards:'/creditcards',customers:'/customers',branches:'/branches',employees:'/employees'};
    const key=v==='cards'?'cards':v;
    if(!state.data[key]&&v!=='dashboard')await load(map[v],key);
    if(v==='dashboard'&&!state.data.dashboard)await loadAll();
    renderView(true);
  }
}
$('#sidebar').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view)});
$('#refreshBtn').onclick=()=>loadAll().then(()=>renderView(true));
$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');
loadAll().then(()=>renderView(true)).catch(()=>renderView(true));
