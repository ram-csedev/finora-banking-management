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
async function api(path, options={}){
  const res = await fetch(API+path,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let json = {};
  try { json = await res.json(); } catch {}
  if (!res.ok || json.success === false) {
    const err = new Error(json.error || 'Request failed');
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}
function rows(json){return (json.data||[]).map(r=>Array.isArray(r)?r:Object.values(r));}
async function load(path,key){const j=await api(path);state.data[key]=rows(j);return state.data[key]}
function table(headers, data, renderRow){if(!data?.length)return `<div class="empty">No records found.</div>`;return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${data.map(renderRow).join('')}</tbody></table></div>`}
const badge = (text, type='neutral')=>`<span class="badge ${type}">${text??'—'}</span>`;
const escapeQuotes = s => String(s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
const statusBadge = (s) => {
  const val = String(s || '').toUpperCase();
  if (val === 'ACTIVE' || val === 'SUCCESS') return badge(s || 'Active', 'success');
  if (val === 'CLOSED') return badge('Closed', 'closed');
  if (val === 'BLOCKED') return badge('Blocked', 'blocked');
  if (val === 'INACTIVE') return badge('Inactive', 'inactive');
  if (val === 'REVERSED') return badge('Reversed', 'reversed');
  if (val === 'SETTLED') return badge('Settled', 'settled');
  return badge(s || '—', 'neutral');
};
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
<div class="hero"><div><div class="eyebrow">Overview</div><p style="margin-top:4px">Your banking operations at a glance. Data is read directly from the Oracle-backed API.</p></div><div class="hero-actions"><button class="btn btn-soft" onclick="navigate('money')">Quick transfer</button><button class="btn btn-primary" onclick="navigate('tools')">Banking tools</button></div></div>
<div class="stats">
${stat('Total Balance',money(d.total_balance),'Across all accounts','₹')} ${stat('Customers',num(d.total_customers),'Registered customers','◎')} ${stat('Loans',num(d.total_loans),money(d.total_loan_amount)+' total sanctioned','◈')} ${stat('Credit Cards',num(d.total_credit_cards),'Active portfolio','▤')}</div>
<div class="grid-2">
  <div class="card"><div class="card-head"><h3>Recent transactions</h3><span>${num(d.total_transactions)} total</span></div>${table(['Transaction','Account','Type','Amount','Status'],tx.slice(0,6),r=>`<tr><td><b>#${r[0]}</b><br><small class="muted">${date(r[2])}</small></td><td>${r[1]}</td><td>${r[3]==='DEPOSIT'?badge('Deposit','success'):r[3]==='WITHDRAWAL'?badge('Withdrawal','warning'):badge(r[3])}</td><td><b>${money(r[4])}</b></td><td>${statusBadge(r[6]||r[5])}</td></tr>`)}</div>
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
<div class="section-gap card"><div class="card-head"><h3>Loan portfolio</h3><span>Interest & tenure</span></div>${table(['Loan','Customer','Type','Amount','Rate','Term'],loans.slice(0,5),r=>`<tr><td><b>#${r[0]}</b></td><td>CID #${r[1]}</td><td>${badge(r[2])}</td><td>${money(r[3])}</td><td>${r[4]}%</td><td>${r[5]} months</td></tr>`)}</div>`;
}
function stat(label,value,note,icon){return `<div class="stat"><div class="stat-head"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`}

function accountsTable(){
  const a=filter(state.data.accounts||[]);
  return{
    count:`${a.length} records`,
    html:table(['Account','Customer','Type','Balance','Status','Actions'],a,r=>{
      const accId=r[0];
      const bal=Number(r[1])||0;
      const status=r[2]||'ACTIVE';
      const isClosed=status==='CLOSED';
      return `<tr>
        <td><b>#${accId}</b></td>
        <td>CID #${r[4]}</td>
        <td>${badge(r[3])}</td>
        <td><b>${money(bal)}</b></td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-edit" onclick="openEditAccount(${accId})" title="Edit Account">Edit</button>
            <button class="btn-action btn-action-soft" onclick="openNomineeManager(${accId})" title="View / Unlink Nominees">Nominees</button>
            ${!isClosed 
              ? `<button class="btn-action btn-action-warning" onclick="promptCloseAccount(${accId}, ${bal})" title="Close Account">Close</button>`
              : `<span class="badge closed" style="font-size:10px">Closed</span>`
            }
            <button class="btn-action btn-action-outline-danger" onclick="promptDeleteAccount(${accId}, ${bal})" title="Safe Delete Account">Delete</button>
          </div>
        </td>
      </tr>`;
    })
  };
}
function accounts(){const res=accountsTable();return pageHead('Accounts','Monitor account balances, type and status.',`<button class="btn btn-primary" onclick="openCreateAccount()">+ Create Account</button> <button class="btn btn-soft" onclick="openNomineeManager(null)">All Nominees</button> <button class="btn btn-soft" onclick="navigate('money')">+ Money operation</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search account or customer ID…" value="${state.search}" oninput="onSearchInput(this.value)"/> <span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function transactionsTable(){
  const t=filter(state.data.transactions||[]).filter(r=>!state.txType||r[3]===state.txType);
  return{
    count:`${t.length} records`,
    html:table(['ID','Date','Account','Type','Mode','Amount','Status','Actions'],t,r=>{
      const tId=r[0];
      const accId=r[1];
      const txType=r[3];
      const amt=r[4];
      const status=r[6]||r[5]||'SUCCESS';
      const canReverse=status==='SUCCESS';
      return `<tr>
        <td><b>#${tId}</b></td>
        <td>${date(r[2])}</td>
        <td>#${accId}</td>
        <td>${badge(txType,txType==='DEPOSIT'?'success':txType==='WITHDRAWAL'?'warning':'neutral')}</td>
        <td>${r[5]||'—'}</td>
        <td><b>${money(amt)}</b></td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-edit" onclick="openEditTransaction(${tId})" title="Edit Transaction Mode">Edit</button>
            <button class="btn-action btn-action-outline-danger" onclick="promptDeleteTx(${tId}, ${accId}, '${txType}', ${amt}, '${status}')" title="Delete Transaction & Reverse Financial Effect">Delete</button>
          </div>
        </td>
      </tr>`;
    })
  };
}
function transactions(){const res=transactionsTable();return pageHead('Transactions','A complete permanent audit ledger of account activity.',`<button class="btn btn-primary" onclick="navigate('money')">Create transaction</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search transaction, account or type…" value="${state.search}" oninput="onSearchInput(this.value)"/><div style="display:flex;gap:10px;align-items:center"><select class="select" onchange="state.txType=this.value;updateResults()"><option value="" ${!state.txType?'selected':''}>All types</option><option ${state.txType==='DEPOSIT'?'selected':''}>DEPOSIT</option><option ${state.txType==='WITHDRAWAL'?'selected':''}>WITHDRAWAL</option><option ${state.txType==='TRANSFER'?'selected':''}>TRANSFER</option></select><span class="muted" id="searchCount">${res.count}</span></div></div><div id="tableContainer">${res.html}</div></div>`;}

function loansTable(){
  const l=filter(state.data.loans||[]);
  return{
    count:`${l.length} loans`,
    html:table(['Loan','Customer','Type','Principal','Interest','Term','Status','Actions'],l,r=>{
      const lId=r[0];
      const cid=r[1];
      const lType=r[2];
      const amt=r[3];
      const status=r[6]||'ACTIVE';
      const isSettled=status==='SETTLED';
      return `<tr>
        <td><b>#${lId}</b></td>
        <td>CID #${cid}</td>
        <td>${badge(lType)}</td>
        <td><b>${money(amt)}</b></td>
        <td>${r[4]}%</td>
        <td>${r[5]} mos</td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-edit" onclick="openEditLoan(${lId})" title="Edit Loan Details">Edit</button>
            ${!isSettled
              ? `<button class="btn-action btn-action-purple" onclick="promptSettleLoan(${lId}, ${amt})" title="Mark Loan as Settled">Settle</button>`
              : `<span class="badge settled" style="font-size:10px">Settled</span>`
            }
            <button class="btn-action btn-action-outline-danger" onclick="promptDeleteLoan(${lId})" title="Safe Delete Loan">Delete</button>
          </div>
        </td>
      </tr>`;
    })
  };
}
function loans(){const res=loansTable();return pageHead('Loans','Review loan products, principal, interest and tenure.',`<button class="btn btn-primary" onclick="openCreateLoan()">+ Create Loan</button> <button class="btn btn-soft" onclick="navigate('tools')">Check eligibility</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search loan or customer…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function customersTable(){
  const c=filter(state.data.customers||[]);
  return{
    count:`${c.length} customers`,
    html:table(['CID','Customer','PAN','Location','DOB','Status','Actions'],c,r=>{
      const cid=r[0];
      const pan=r[1];
      const name=`${r[2]} ${r[3]||''}`.trim();
      const status=r[9]||'ACTIVE';
      const isInactive=status==='INACTIVE';
      return `<tr>
        <td><b>#${cid}</b></td>
        <td><b>${name}</b></td>
        <td>${pan}</td>
        <td>${r[4]}, ${r[5]} ${r[6]||''}</td>
        <td>${date(r[7])}</td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-edit" onclick="openEditCustomer(${cid})" title="Edit Customer Details">Edit</button>
            <button class="btn-action btn-action-soft" onclick="openPhoneManager(${cid}, '${escapeQuotes(name)}')" title="Manage Phones">Phones</button>
            <button class="btn-action ${isInactive ? 'btn-action-success' : 'btn-action-warning'}" onclick="toggleCustomerStatus(${cid}, '${isInactive ? 'ACTIVE' : 'INACTIVE'}')">${isInactive ? 'Activate' : 'Deactivate'}</button>
            <button class="btn-action btn-action-outline-danger" onclick="promptDeleteCustomer(${cid}, '${escapeQuotes(name)}')" title="Safe Delete Customer">Delete</button>
          </div>
        </td>
      </tr>`;
    })
  };
}
function customers(){const res=customersTable();return pageHead('Customers','Customer records from the Oracle Customer table.',`<button class="btn btn-primary" onclick="openAddCustomer()">+ Add Customer</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search name, CID or city…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function cardsTable(){
  const c=filter(state.data.cards||[]);
  return{
    count:`${c.length} cards`,
    html:c.length ? `<div class="cards-grid">${c.map(r=>{
      const pno=String(r[0]);
      const type=r[1];
      const limit=r[2];
      const expiry=r[3];
      const status=r[4]||'ACTIVE';
      const cid=r[6];
      const isBlocked=status==='BLOCKED';
      const isClosed=status==='CLOSED';
      return `<div class="card">
        <div class="card-visual">
          <div>FINORA <span style="float:right;font-size:10px">${type}</span></div>
          <div class="chip"></div>
          <div class="card-number">•••• •••• •••• ${pno.slice(-4)}</div>
          <div class="card-foot"><span>CARD MEMBER</span><span>VALID THRU ${date(expiry).slice(-7)}</span></div>
        </div>
        <div class="metric-line"><span>Card limit</span><b>${money(limit)}</b></div>
        <div class="metric-line"><span>Customer</span><b>CID #${cid}</b></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span>Status</span>
          ${statusBadge(status)}
        </div>
        <div class="card-actions-row">
          <button class="btn-action btn-action-edit" onclick="openEditCreditCard('${pno}')" title="Edit Card Details">Edit</button>
          ${!isClosed ? `
            ${isBlocked 
              ? `<button class="btn-action btn-action-success" onclick="toggleCardStatus('${pno}', 'ACTIVE')">Unblock</button>` 
              : `<button class="btn-action btn-action-warning" onclick="toggleCardStatus('${pno}', 'BLOCKED')">Block</button>`
            }
            <button class="btn-action btn-action-danger" onclick="toggleCardStatus('${pno}', 'CLOSED')">Close Card</button>
          ` : `<span class="muted" style="font-size:11px">Card is closed permanently</span>`}
          <button class="btn-action btn-action-outline-danger" onclick="promptDeleteCard('${pno}')" title="Safe Delete Card">Delete</button>
        </div>
      </div>`;
    }).join('')}</div>` : `<div class="empty">No records found.</div>`
  };
}
function cards(){const res=cardsTable();return pageHead('Credit Cards','Cards linked to customers and their configured limits.',`<button class="btn btn-primary" onclick="openCreateCreditCard()">+ Create Credit Card</button>`)+`<div class="card" style="margin-bottom:20px"><div class="toolbar"><input class="search" placeholder="Search card, type or customer…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div></div><div id="tableContainer">${res.html}</div>`;}

function branchesTable(){
  const b=filter(state.data.branches||[]);
  return{
    count:`${b.length} branches`,
    html:table(['ID','Branch','City','State','IFSC','Contact','Status','Actions'],b,r=>{
      const bId=r[0];
      const name=r[1];
      const status=r[7]||'ACTIVE';
      const isInactive=status==='INACTIVE';
      return `<tr>
        <td>#${bId}</td>
        <td><b>${name}</b></td>
        <td>${r[2]||'—'}</td>
        <td>${r[3]||'—'}</td>
        <td><b>${r[5]||'—'}</b></td>
        <td>${r[6]||'—'}</td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-edit" onclick="openEditBranch(${bId})" title="Edit Branch Details">Edit</button>
            <button class="btn-action ${isInactive ? 'btn-action-success' : 'btn-action-warning'}" onclick="toggleBranchStatus(${bId}, '${isInactive ? 'ACTIVE' : 'INACTIVE'}')">${isInactive ? 'Activate' : 'Deactivate'}</button>
            <button class="btn-action btn-action-outline-danger" onclick="promptDeleteBranch(${bId}, '${escapeQuotes(name)}')" title="Safe Delete Branch">Delete</button>
          </div>
        </td>
      </tr>`;
    })
  };
}
function branches(){const res=branchesTable();return pageHead('Branches','Branch directory, IFSC and contact information.',`<button class="btn btn-primary" onclick="openCreateBranch()">+ Create Branch</button>`)+`<div class="card"><div class="toolbar"><input class="search" placeholder="Search branch, city or IFSC…" value="${state.search}" oninput="onSearchInput(this.value)"/><span class="muted" id="searchCount">${res.count}</span></div><div id="tableContainer">${res.html}</div></div>`;}

function employeesTable(){
  const e=filter(state.data.employees||[]);
  const branchMap=Object.fromEntries((state.data.branches||[]).map(b=>[b[0],b[1]]));
  return{
    count:`${e.length} employees`,
    html:table(['ID','Employee','Salary','Hire Date','Branch','Status','Actions'],e,r=>{
      const empId=r[0];
      const name=`${r[1]} ${r[2]||''}`.trim();
      const status=r[6]||'ACTIVE';
      const isInactive=status==='INACTIVE';
      return `<tr>
        <td><b>#${empId}</b></td>
        <td><b>${name}</b></td>
        <td><b>${money(r[3])}</b></td>
        <td>${date(r[4])}</td>
        <td>${r[5]?(branchMap[r[5]]?branchMap[r[5]]+' (#'+r[5]+')':'Branch #'+r[5]):'—'}</td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-edit" onclick="openEditEmployee(${empId})" title="Edit Employee Details">Edit</button>
            <button class="btn-action ${isInactive ? 'btn-action-success' : 'btn-action-warning'}" onclick="toggleEmployeeStatus(${empId}, '${isInactive ? 'ACTIVE' : 'INACTIVE'}')">${isInactive ? 'Activate' : 'Deactivate'}</button>
            <button class="btn-action btn-action-outline-danger" onclick="promptDeleteEmployee(${empId}, '${escapeQuotes(name)}')" title="Safe Delete Employee">Delete</button>
          </div>
        </td>
      </tr>`;
    })
  };
}
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

// ============================================================================
// SAFE DELETE, CLOSE, DEACTIVATE MODALS & ACTION HANDLERS
// ============================================================================

function confirmModal({ title, message, note, confirmText = 'Confirm', confirmClass = 'btn-primary', onConfirm }) {
  let m = $('#confirmDialog');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-backdrop" id="confirmDialog">
        <div class="modal" style="max-width:460px">
          <div class="modal-head">
            <h3 id="cdTitle">Confirm Action</h3>
            <button class="close" onclick="closeConfirmModal()">×</button>
          </div>
          <p id="cdMessage" style="font-size:13px;line-height:1.5;margin-bottom:12px;color:#334155"></p>
          <div id="cdNote" class="policy-banner" style="display:none"></div>
          <div class="modal-actions">
            <button class="btn btn-soft" onclick="closeConfirmModal()">Cancel</button>
            <button class="btn btn-primary" id="cdConfirmBtn">Confirm</button>
          </div>
        </div>
      </div>
    `);
    m = $('#confirmDialog');
  }
  $('#cdTitle').textContent = title;
  $('#cdMessage').textContent = message;
  const noteEl = $('#cdNote');
  if (note) {
    noteEl.textContent = note;
    noteEl.style.display = 'block';
  } else {
    noteEl.style.display = 'none';
  }
  const btn = $('#cdConfirmBtn');
  btn.textContent = confirmText;
  btn.className = 'btn ' + confirmClass;
  btn.onclick = async () => {
    closeConfirmModal();
    try {
      await onConfirm();
    } catch (err) {
      toast(err.message, false);
    }
  };
  m.classList.add('open');
}
function closeConfirmModal() { $('#confirmDialog')?.classList.remove('open'); }

// ============================================================================
// CONFIRMATION-BASED PERMANENT CASCADE DELETE MODAL
// ============================================================================

function cascadeModalDom() {
  let m = $('#cascadeModal');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-backdrop" id="cascadeModal">
        <div class="modal" style="max-width:540px;max-height:90vh;overflow-y:auto">
          <div class="modal-head">
            <h3 id="cascModalTitle">Permanently Delete Record?</h3>
            <button class="close" onclick="closeCascadeModal()">×</button>
          </div>
          <div id="cascModalBody"></div>
          <div class="cascade-modal-actions" id="cascModalActions"></div>
        </div>
      </div>
    `);
    m = $('#cascadeModal');
  }
  return m;
}

function closeCascadeModal() {
  $('#cascadeModal')?.classList.remove('open');
}

async function openCascadeDeleteModal({
  entity,
  entityTitle,
  titleText,
  previewUrl,
  deleteUrl,
  onAlternative,
  onSuccess
}) {
  cascadeModalDom();
  const m = $('#cascadeModal');
  const titleEl = $('#cascModalTitle');
  const bodyEl = $('#cascModalBody');
  const actionsEl = $('#cascModalActions');

  titleEl.textContent = titleText || `Permanently delete this ${entity.toLowerCase()}?`;
  bodyEl.innerHTML = `
    <div class="empty" style="padding:28px 10px">
      <div style="font-size:22px;margin-bottom:8px">🔍</div>
      Analyzing database dependencies and regulatory policies...
    </div>
  `;
  actionsEl.innerHTML = `
    <button class="btn btn-soft" onclick="closeCascadeModal()">Cancel</button>
  `;
  m.classList.add('open');

  async function loadPreview() {
    try {
      const res = await api(previewUrl);
      const preview = res; // target, counts, preserved, has_protected_history, financial_protection_reason, recommended_alternative, preview_signature

      if (preview.target?.entity === 'Transaction') {
        const uType = (preview.target.type || '').toUpperCase();
        const isDep = (uType === 'DEPOSIT' || uType === 'CREDIT');

        bodyEl.innerHTML = `
          <div class="cascade-impact-card" style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-weight:700;font-size:14px">Transaction #${preview.target.id}</span>
              ${badge(preview.target.type, isDep ? 'success' : 'warning')}
            </div>
            <div style="font-size:13px;color:#475569;margin-bottom:4px">
              Account: <strong>#${preview.target.acc_id}</strong> &nbsp;|&nbsp; Amount: <strong>${money(preview.target.amount)}</strong> &nbsp;|&nbsp; Status: ${statusBadge(preview.target.status)}
            </div>
          </div>

          <div class="tx-financial-card">
            <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#1e293b">Financial Effect & Balance Reversal:</div>
            <div style="font-size:13px;line-height:1.5;color:#334155;margin-bottom:10px">
              ${preview.explanation}
            </div>
            <div class="tx-financial-breakdown">
              <div class="tx-bal-col"><span>Current Balance</span><b>${money(preview.current_balance)}</b></div>
              <div class="tx-bal-arrow">➔</div>
              <div class="tx-bal-col"><span>New Balance</span><b>${money(preview.new_balance)}</b></div>
            </div>
          </div>

          ${!preview.can_delete ? `
            <div class="alert" style="margin:12px 0">
              <b>Cannot delete transaction:</b> ${preview.rejection_reason}
            </div>
          ` : ''}

          <div class="cascade-danger-warning" style="margin-top:12px">
            🚨 <strong>Permanent Ledger Record Deletion:</strong> Deleting this transaction permanently removes it from the audit ledger. The financial effect will be corrected directly on Account #${preview.target.acc_id}.
          </div>
        `;

        actionsEl.innerHTML = `
          <button class="btn btn-soft" onclick="closeCascadeModal()">No, Cancel</button>
          <button class="btn btn-danger" id="cascDeleteAllBtn" ${!preview.can_delete ? 'disabled' : ''}>
            Yes, Reverse & Delete
          </button>
        `;
      } else {
        // Standard cascade preview for other entities
        // Build counts table for non-zero items
        const counts = preview.counts || {};
        const countEntries = Object.entries(counts).filter(([k, v]) => Number(v) > 0);
        
        let countsHtml = '';
        if (countEntries.length > 0) {
          countsHtml = `
            <div class="cascade-impact-card">
              <div class="cascade-impact-title">The following records will be affected:</div>
              <div class="cascade-count-list">
                ${countEntries.map(([k, v]) => `
                  <div class="cascade-count-row">
                    <span>${title(k.replace('_', ' '))}</span>
                    <span class="cascade-count-pill ${k === 'Transaction' ? 'pill-danger' : ''}">${v}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        // Preserved section
        let preservedHtml = '';
        if (preview.preserved && preview.preserved.length > 0) {
          preservedHtml = `
            <div class="cascade-preserved-box">
              <b>🛡️ Preserved Records:</b>
              <ul style="margin:4px 0 0;padding-left:18px">
                ${preview.preserved.map(p => `<li><strong>${p.entity}:</strong> ${p.description}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        // Financial history audit alert & academic override toggle
        let auditAlertHtml = '';
        if (preview.has_protected_history) {
          auditAlertHtml = `
            <div class="cascade-audit-alert">
              <b>⚠️ Protected Financial History:</b>
              <div style="margin-top:4px">${preview.financial_protection_reason || 'This record contains protected transactions or active ledger balance.'}</div>
              <div style="margin-top:6px;font-size:11px">
                Under banking regulations, completed financial ledgers cannot be deleted. Choose the recommended alternative below, or enable demonstration override if performing classroom simulation.
              </div>
            </div>
            <label class="cascade-override-label">
              <input type="checkbox" id="cascAcademicOverride" />
              <span>Enable Academic Demonstration Override (force cascading deletion of ledger history)</span>
            </label>
          `;
        }

        const warningHtml = `
          <div class="cascade-danger-warning">
            🚨 <strong>Permanent Deletion Warning:</strong> This operation cannot be undone. All eligible dependent records will be permanently deleted from the database.
          </div>
        `;

        bodyEl.innerHTML = `
          <p style="font-size:13px;line-height:1.5;margin-bottom:14px;color:#334155">
            Permanently delete <strong>${preview.target?.label || entityTitle || entity}</strong>?
          </p>
          ${countsHtml}
          ${preservedHtml}
          ${auditAlertHtml}
          ${warningHtml}
        `;

        // Render buttons
        let altBtnHtml = '';
        if (preview.recommended_alternative) {
          altBtnHtml = `
            <button class="btn btn-primary" id="cascAltBtn">
              ${preview.recommended_alternative.label}
            </button>
          `;
        }

        const isDeleteDisabled = (preview.has_protected_history === true);

        actionsEl.innerHTML = `
          <button class="btn btn-soft" onclick="closeCascadeModal()">No, Cancel</button>
          ${altBtnHtml}
          <button class="btn btn-danger" id="cascDeleteAllBtn" ${isDeleteDisabled ? 'disabled' : ''}>
            Yes, Delete All
          </button>
        `;
      }

      // Override checkbox behavior
      const overrideCb = $('#cascAcademicOverride');
      const deleteBtn = $('#cascDeleteAllBtn');
      if (overrideCb) {
        overrideCb.onchange = () => {
          deleteBtn.disabled = !overrideCb.checked;
        };
      }

      // Alternative button handler
      const altBtn = $('#cascAltBtn');
      if (altBtn) {
        altBtn.onclick = async () => {
          closeCascadeModal();
          if (onAlternative) {
            await onAlternative(preview.recommended_alternative);
          } else if (preview.recommended_alternative.api_endpoint) {
            await api(preview.recommended_alternative.api_endpoint, {
              method: preview.recommended_alternative.method || 'POST',
              body: preview.recommended_alternative.payload ? JSON.stringify(preview.recommended_alternative.payload) : undefined
            });
            toast('Alternative action executed successfully.');
            if (onSuccess) await onSuccess();
          }
        };
      }

      // Confirm permanent delete handler
      deleteBtn.onclick = async () => {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Processing...';
        const isOverride = overrideCb ? overrideCb.checked : false;

        try {
          const res = await api(deleteUrl, {
            method: 'DELETE',
            body: JSON.stringify({
              preview_signature: preview.preview_signature,
              academic_override: isOverride
            })
          });
          closeCascadeModal();
          toast(res.message);
          if (onSuccess) await onSuccess();
        } catch (err) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = preview.target?.entity === 'Transaction' ? 'Yes, Reverse & Delete' : 'Yes, Delete All';
          if (err.status === 409 || (err.message && (err.message.includes('changed') || err.message.includes('stale')))) {
            toast('Dependencies changed since preview. Refreshing preview...', false);
            await loadPreview();
          } else {
            toast(err.message, false);
          }
        }
      };
    } catch (err) {
      let displayError = err.message || 'An unexpected error occurred';
      displayError = displayError.replace(/Help:\s*https?:\/\/\S+/gi, '').trim();
      bodyEl.innerHTML = `
        <div class="alert" style="margin:16px 0">
          <b>Error analyzing record:</b> ${displayError}
        </div>
      `;
      actionsEl.innerHTML = `
        <button class="btn btn-soft" onclick="closeCascadeModal()">Close</button>
      `;
    }
  }

  await loadPreview();
}

// --- CUSTOMER PHONE MANAGER ---
function phoneModal() {
  if ($('#phoneModalBox')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="phoneModalBox">
      <div class="modal" style="max-width:480px">
        <div class="modal-head">
          <h3 id="pmTitle">Customer Phones</h3>
          <button class="close" onclick="closePhoneModal()">×</button>
        </div>
        <div class="policy-banner">
          Registered contact numbers for customer. Deleting a specific phone number unlinks it cleanly while preserving the customer identity and financial records.
        </div>
        <div id="pmList" class="list-manager-box" style="max-height:220px;overflow-y:auto">
          <div class="empty">Loading phone numbers...</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <input id="pmNewPhone" placeholder="Enter phone number (e.g. 9876543210)" style="flex:1" class="search" />
          <button class="btn btn-primary" id="pmAddBtn">+ Add</button>
        </div>
        <div class="modal-actions">
          <button class="btn btn-soft" onclick="closePhoneModal()">Close</button>
        </div>
      </div>
    </div>
  `);
}
function closePhoneModal() { $('#phoneModalBox')?.classList.remove('open'); }

async function openPhoneManager(cid, custName) {
  phoneModal();
  $('#pmTitle').textContent = `Phones for ${custName} (CID #${cid})`;
  $('#pmNewPhone').value = '';

  async function renderPhoneList() {
    try {
      const res = await api(`/customers/${cid}/phones`);
      const phones = res.data || [];
      const listEl = $('#pmList');
      if (!phones.length) {
        listEl.innerHTML = '<div class="empty" style="padding:15px">No phone numbers registered.</div>';
        return;
      }
      listEl.innerHTML = phones.map(p => {
        const ph = Array.isArray(p) ? p[1] : (p.phone || p);
        return `<div class="phone-item">
          <span>📞 <b>${ph}</b></span>
          <div style="display:flex;gap:6px">
            <button class="btn-action btn-action-edit" onclick="openEditPhone(${cid}, '${ph}', '${escapeQuotes(custName)}')">Edit</button>
            <button class="btn-action btn-action-danger" onclick="removeCustomerPhone(${cid}, '${ph}', '${escapeQuotes(custName)}')">Remove</button>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      $('#pmList').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  }

  $('#pmAddBtn').onclick = async () => {
    const val = $('#pmNewPhone').value.trim();
    if (!val) return toast('Please enter a phone number', false);
    try {
      await api(`/customers/${cid}/phones`, {
        method: 'POST',
        body: JSON.stringify({ phone: val })
      });
      toast(`Phone ${val} added successfully!`);
      $('#pmNewPhone').value = '';
      await renderPhoneList();
    } catch (err) {
      toast(err.message, false);
    }
  };

  await renderPhoneList();
  $('#phoneModalBox').classList.add('open');
}

async function removeCustomerPhone(cid, phone, custName) {
  openCascadeDeleteModal({
    entity: 'Customer Phone',
    entityTitle: `Phone ${phone} (${custName})`,
    titleText: `Remove Phone Number?`,
    previewUrl: `/customers/${cid}/phones/${encodeURIComponent(phone)}/delete-preview`,
    deleteUrl: `/customers/${cid}/phones/${encodeURIComponent(phone)}`,
    onAlternative: null,
    onSuccess: async () => {
      await openPhoneManager(cid, custName);
    }
  });
}

// --- NOMINEE MANAGER ---
function nomineeModal() {
  if ($('#nomModalBox')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="nomModalBox">
      <div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
        <div class="modal-head">
          <h3 id="nmTitle">Account Nominees</h3>
          <button class="close" onclick="closeNomineeModal()">×</button>
        </div>
        <div class="policy-banner">
          Nominees mapped to accounts. Removing a nominee removes their entry from Owns and Nominee cleanly within a single transaction without affecting account balance or customer financial records.
        </div>
        <div id="nmList" class="list-manager-box" style="max-height:300px;overflow-y:auto">
          <div class="empty">Loading nominees...</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-soft" onclick="closeNomineeModal()">Close</button>
        </div>
      </div>
    </div>
  `);
}
function closeNomineeModal() { $('#nomModalBox')?.classList.remove('open'); }

async function openNomineeManager(accId) {
  nomineeModal();
  $('#nmTitle').textContent = accId ? `Nominees for Account #${accId}` : 'All Nominees';

  async function renderNomineeList() {
    try {
      const res = await api('/nominees');
      const allNominees = rows(res);
      // Schema: [n_id, first_name, last_name, relationship, dob, cid, acc_id]
      const filtered = accId ? allNominees.filter(n => Number(n[6]) === Number(accId)) : allNominees;
      const listEl = $('#nmList');
      if (!filtered.length) {
        listEl.innerHTML = `<div class="empty" style="padding:20px">No nominees found ${accId ? 'for account #' + accId : ''}.</div>`;
        return;
      }
      listEl.innerHTML = filtered.map(n => {
        const nId = n[0];
        const name = `${n[1]} ${n[2] || ''}`.trim();
        const rel = n[3] || 'Nominee';
        const dobVal = date(n[4]);
        const nAcc = n[6];
        const nCid = n[5];
        return `<div class="nominee-item">
          <div>
            <b>${name}</b> <span class="muted">(${rel})</span>
            <div class="muted" style="font-size:11px;margin-top:2px">
              Nominee #${nId} • Account #${nAcc} • CID #${nCid} • DOB: ${dobVal}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn-action btn-action-edit" onclick="openEditNominee(${nId}, ${accId})">Edit</button>
            <button class="btn-action btn-action-danger" onclick="removeNomineeItem(${nId}, '${escapeQuotes(name)}', ${accId})">Remove</button>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      $('#nmList').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  }

  await renderNomineeList();
  $('#nomModalBox').classList.add('open');
}

async function removeNomineeItem(nId, name, accId) {
  openCascadeDeleteModal({
    entity: 'Nominee',
    entityTitle: `Nominee #${nId} (${name})`,
    titleText: `Remove Nominee #${nId}?`,
    previewUrl: `/nominees/${nId}/delete-preview`,
    deleteUrl: `/nominees/${nId}`,
    onAlternative: null,
    onSuccess: async () => {
      await openNomineeManager(accId);
    }
  });
}

// --- SAFE OPERATIONS ACTION TRIGGERS ---

async function promptCloseAccount(accId, bal) {
  const numBal = Number(bal) || 0;
  if (numBal > 0) {
    confirmModal({
      title: `Cannot Close Account #${accId}`,
      message: `Account #${accId} currently has an outstanding balance of ${money(numBal)}. Under banking regulations, an account balance must be exactly zero before it can be closed.`,
      note: 'Please withdraw or transfer out the remaining balance first via Deposit / Withdraw.',
      confirmText: 'Go to Withdraw',
      confirmClass: 'btn-primary',
      onConfirm: async () => { navigate('money'); }
    });
    return;
  }
  confirmModal({
    title: `Close Account #${accId}`,
    message: `Are you sure you want to close Account #${accId}? Once closed, the account status becomes CLOSED and no future deposits, withdrawals, or transfers can be performed.`,
    note: 'Existing transaction history and ledger records will be permanently retained for regulatory compliance.',
    confirmText: 'Confirm Close',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      const res = await api(`/accounts/${accId}/close`, { method: 'POST' });
      toast(res.message);
      await load('/accounts', 'accounts');
      renderView(true);
    }
  });
}

async function promptDeleteAccount(accId, bal) {
  openCascadeDeleteModal({
    entity: 'Account',
    entityTitle: `Account #${accId}`,
    titleText: `Permanently delete Account #${accId}?`,
    previewUrl: `/accounts/${accId}/delete-preview`,
    deleteUrl: `/accounts/${accId}`,
    onAlternative: async () => {
      await promptCloseAccount(accId, bal);
    },
    onSuccess: async () => {
      await Promise.all([load('/accounts', 'accounts'), loadAll()]);
      renderView(true);
    }
  });
}

async function promptDeleteTx(tId, accId, txType, amt, status) {
  openCascadeDeleteModal({
    entity: 'Transaction',
    entityTitle: `Transaction #${tId} (${txType} ${money(amt)})`,
    titleText: `Permanently Delete Transaction #${tId}?`,
    previewUrl: `/transactions/${tId}/delete-preview`,
    deleteUrl: `/transactions/${tId}`,
    onAlternative: null,
    onSuccess: async () => {
      await Promise.all([
        load('/transactions', 'transactions'),
        load('/accounts', 'accounts'),
        loadAll()
      ]);
      renderView(true);
    }
  });
}

async function promptReverseTx(tId, accId, type, amt) {
  confirmModal({
    title: `Reverse Transaction #${tId}`,
    message: `Reverse ${type} of ${money(amt)} on Account #${accId}?`,
    note: `This creates an offsetting ledger entry (${type === 'DEPOSIT' ? 'WITHDRAWAL' : 'DEPOSIT'} of ${money(amt)}) and marks Transaction #${tId} as REVERSED. The original transaction is never deleted, ensuring a permanent audit trail.`,
    confirmText: 'Reverse Transaction',
    confirmClass: 'btn-warning',
    onConfirm: async () => {
      const res = await api(`/transactions/${tId}/reverse`, { method: 'POST' });
      toast(res.message);
      await Promise.all([load('/transactions', 'transactions'), load('/accounts', 'accounts')]);
      renderView(true);
    }
  });
}

async function promptSettleLoan(lId, amt) {
  confirmModal({
    title: `Settle Loan #${lId}`,
    message: `Mark Loan #${lId}${amt ? ' (' + money(amt) + ')' : ''} as SETTLED?`,
    note: 'This sets the loan status to SETTLED, indicating full repayment while preserving interest terms, tenure, and employee assignment history.',
    confirmText: 'Mark as Settled',
    confirmClass: 'btn-purple',
    onConfirm: async () => {
      const res = await api(`/loans/${lId}/settle`, { method: 'POST' });
      toast(res.message);
      await load('/loans', 'loans');
      renderView(true);
    }
  });
}

async function promptDeleteLoan(lId, amt) {
  openCascadeDeleteModal({
    entity: 'Loan',
    entityTitle: `Loan #${lId}`,
    titleText: `Permanently delete Loan #${lId}?`,
    previewUrl: `/loans/${lId}/delete-preview`,
    deleteUrl: `/loans/${lId}`,
    onAlternative: async () => {
      await promptSettleLoan(lId, amt);
    },
    onSuccess: async () => {
      await Promise.all([load('/loans', 'loans'), loadAll()]);
      renderView(true);
    }
  });
}

async function toggleCustomerStatus(cid, newStatus) {
  try {
    const res = await api(`/customers/${cid}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    toast(res.message);
    await load('/customers', 'customers');
    renderView(true);
  } catch (err) {
    toast(err.message, false);
  }
}

async function promptDeleteCustomer(cid, name) {
  openCascadeDeleteModal({
    entity: 'Customer',
    entityTitle: `Customer #${cid} (${name})`,
    titleText: `Permanently delete Customer #${cid}?`,
    previewUrl: `/customers/${cid}/delete-preview`,
    deleteUrl: `/customers/${cid}`,
    onAlternative: async () => {
      await toggleCustomerStatus(cid, 'INACTIVE');
    },
    onSuccess: async () => {
      await Promise.all([load('/customers', 'customers'), loadAll()]);
      renderView(true);
    }
  });
}

async function toggleCardStatus(pno, newStatus) {
  try {
    const res = await api(`/creditcards/${pno}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    toast(res.message);
    await load('/creditcards', 'cards');
    renderView(true);
  } catch (err) {
    toast(err.message, false);
  }
}

async function promptDeleteCard(pno) {
  openCascadeDeleteModal({
    entity: 'Credit Card',
    entityTitle: `Card ending in ${String(pno).slice(-4)}`,
    titleText: `Permanently delete Credit Card?`,
    previewUrl: `/creditcards/${encodeURIComponent(pno)}/delete-preview`,
    deleteUrl: `/creditcards/${encodeURIComponent(pno)}`,
    onAlternative: async () => {
      await toggleCardStatus(pno, 'BLOCKED');
    },
    onSuccess: async () => {
      await Promise.all([load('/creditcards', 'cards'), loadAll()]);
      renderView(true);
    }
  });
}

async function toggleBranchStatus(bId, newStatus) {
  try {
    const res = await api(`/branches/${bId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    toast(res.message);
    await load('/branches', 'branches');
    renderView(true);
  } catch (err) {
    toast(err.message, false);
  }
}

async function promptDeleteBranch(bId, name) {
  openCascadeDeleteModal({
    entity: 'Branch',
    entityTitle: `Branch #${bId} (${name})`,
    titleText: `Permanently delete Branch #${bId}?`,
    previewUrl: `/branches/${bId}/delete-preview`,
    deleteUrl: `/branches/${bId}`,
    onAlternative: async () => {
      await toggleBranchStatus(bId, 'INACTIVE');
    },
    onSuccess: async () => {
      await Promise.all([load('/branches', 'branches'), loadAll()]);
      renderView(true);
    }
  });
}

async function toggleEmployeeStatus(empId, newStatus) {
  try {
    const res = await api(`/employees/${empId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    toast(res.message);
    await load('/employees', 'employees');
    renderView(true);
  } catch (err) {
    toast(err.message, false);
  }
}

async function promptDeleteEmployee(empId, name) {
  openCascadeDeleteModal({
    entity: 'Employee',
    entityTitle: `Employee #${empId} (${name})`,
    titleText: `Permanently delete Employee #${empId}?`,
    previewUrl: `/employees/${empId}/delete-preview`,
    deleteUrl: `/employees/${empId}`,
    onAlternative: async () => {
      await toggleEmployeeStatus(empId, 'INACTIVE');
    },
    onSuccess: async () => {
      await Promise.all([load('/employees', 'employees'), loadAll()]);
      renderView(true);
    }
  });
}

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
    if((!state.data[key] || v==='transactions' || v==='accounts') && v!=='dashboard')await load(map[v],key);
    if(v==='dashboard'&&!state.data.dashboard)await loadAll();
    renderView(true);
  }
}
$('#sidebar').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)navigate(b.dataset.view)});
$('#refreshBtn').onclick=()=>loadAll().then(()=>renderView(true));
$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');
loadAll().then(()=>renderView(true)).catch(()=>renderView(true));


// ============================================================================
// FULL RECORD EDITING MODALS & HANDLERS
// ============================================================================

function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function editModalDom() {
  let m = $('#editModal');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-backdrop" id="editModal">
        <div class="modal" style="max-height:90vh;overflow-y:auto;max-width:560px">
          <div class="modal-head">
            <h3 id="editModalTitle">Edit Record</h3>
            <button class="close" onclick="closeEditModal()">×</button>
          </div>
          <div id="editModalBanner"></div>
          <div id="editModalBody"></div>
          <div id="editModalError" style="margin-top:12px"></div>
          <div class="modal-actions">
            <button class="btn btn-soft" onclick="closeEditModal()">Cancel</button>
            <button class="btn btn-primary" id="editModalSaveBtn">Save Changes</button>
          </div>
        </div>
      </div>
    `);
    m = $('#editModal');
  }
  return m;
}

function closeEditModal() {
  $('#editModal')?.classList.remove('open');
  if ($('#editModalError')) $('#editModalError').innerHTML = '';
}

async function openEditCustomer(cid) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let cust = (state.data.customers || []).find(c => Number(c[0]) === Number(cid));
  if (!cust) {
    try {
      const res = await api(`/customers/${cid}`);
      const d = res.data;
      cust = [d.cid, d.pan, d.first_name, d.last_name, d.city, d.state, d.pincode, d.dob, d.emp_id, d.status];
    } catch (e) {
      return toast('Customer not found: ' + e.message, false);
    }
  }

  if (!state.data.employees) await load('/employees', 'employees');
  const emps = state.data.employees || [];

  $('#editModalTitle').textContent = 'Edit Customer';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing <b>Customer</b> Record <code>#${cust[0]}</code> • Referential integrity maintained across accounts and loans.
    </div>
  `;

  const empOptions = '<option value="">None (Optional)</option>' + emps.map(e => 
    `<option value="${e[0]}" ${Number(e[0]) === Number(cust[8]) ? 'selected' : ''}>${e[1]} ${e[2] || ''} (Emp #${e[0]})</option>`
  ).join('');

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>First Name *</label><input id="ecFirst" value="${escapeQuotes(cust[2] || '')}" required /></div>
      <div class="field"><label>Last Name</label><input id="ecLast" value="${escapeQuotes(cust[3] || '')}" /></div>
      <div class="field"><label>PAN (Unique)</label><input id="ecPan" value="${escapeQuotes(cust[1] || '')}" style="text-transform:uppercase" /><small class="field-tip">Must be unique across all customers</small></div>
      <div class="field"><label>Date of Birth</label><input id="ecDob" type="date" value="${toDateInput(cust[7])}" /></div>
      <div class="field"><label>City</label><input id="ecCity" value="${escapeQuotes(cust[4] || '')}" /></div>
      <div class="field"><label>State</label><input id="ecState" value="${escapeQuotes(cust[5] || '')}" /></div>
      <div class="field"><label>Pincode</label><input id="ecPin" value="${escapeQuotes(cust[6] || '')}" /></div>
      <div class="field"><label>Status</label><select id="ecStatus" class="select" style="width:100%"><option value="ACTIVE" ${cust[9] === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option value="INACTIVE" ${cust[9] === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option></select></div>
      <div class="field full"><label>Assigned Employee (Relationship Manager)</label><select id="ecEmp" class="select" style="width:100%">${empOptions}</select></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const first_name = $('#ecFirst').value.trim();
    const last_name = $('#ecLast').value.trim();
    const pan = $('#ecPan').value.trim().toUpperCase();
    const dob = $('#ecDob').value.trim();
    const city = $('#ecCity').value.trim();
    const stateVal = $('#ecState').value.trim();
    const pincode = $('#ecPin').value.trim();
    const status = $('#ecStatus').value;
    const emp_id = $('#ecEmp').value ? Number($('#ecEmp').value) : null;

    if (!first_name) {
      $('#editModalError').innerHTML = '<div class="alert">First name is required.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/customers/${cid}`, {
        method: 'PUT',
        body: JSON.stringify({ first_name, last_name, pan: pan || null, dob: dob || null, city: city || null, state: stateVal || null, pincode: pincode || null, emp_id, status })
      });
      closeEditModal();
      toast(`Customer #${cid} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditAccount(accId) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let acc = (state.data.accounts || []).find(a => Number(a[0]) === Number(accId));
  if (!acc) {
    try {
      const res = await api(`/accounts/${accId}`);
      const d = res.data;
      acc = [d.acc_id, d.balance, d.status, d.acc_type, d.cid];
    } catch (e) {
      return toast('Account not found: ' + e.message, false);
    }
  }

  if (!state.data.customers) await load('/customers', 'customers');
  const custs = state.data.customers || [];
  const bal = Number(acc[1]) || 0;

  $('#editModalTitle').textContent = 'Edit Account';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing <b>Account</b> Record <code>#${acc[0]}</code> • Balance changes must go through regulated transaction workflows.
    </div>
  `;

  const custOptions = custs.map(c => 
    `<option value="${c[0]}" ${Number(c[0]) === Number(acc[4]) ? 'selected' : ''}>${c[2]} ${c[3] || ''} (CID #${c[0]})</option>`
  ).join('');

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Account Owner (Customer)</label><select id="eaCid" class="select" style="width:100%">${custOptions}</select><small class="field-tip">Reassigning customer automatically syncs account ownership</small></div>
      <div class="field"><label>Account Type *</label><select id="eaType" class="select" style="width:100%"><option value="SAVINGS" ${acc[3] === 'SAVINGS' ? 'selected' : ''}>SAVINGS</option><option value="CURRENT" ${acc[3] === 'CURRENT' ? 'selected' : ''}>CURRENT</option></select></div>
      <div class="field"><label>Account Status</label><select id="eaStatus" class="select" style="width:100%"><option value="ACTIVE" ${acc[2] === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option value="INACTIVE" ${acc[2] === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option><option value="CLOSED" ${acc[2] === 'CLOSED' ? 'selected' : ''}>CLOSED</option></select></div>
      <div class="field full"><label>Current Ledger Balance</label><input value="${money(bal)}" disabled /><small class="field-tip">Protected balance (₹${bal.toLocaleString('en-IN')}). Use Deposit / Withdraw to move money.</small></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const cid = Number($('#eaCid').value);
    const acc_type = $('#eaType').value;
    const status = $('#eaStatus').value;

    if (!cid) {
      $('#editModalError').innerHTML = '<div class="alert">Please select a valid customer.</div>';
      return;
    }
    if (status === 'CLOSED' && bal > 0) {
      $('#editModalError').innerHTML = `<div class="alert">Cannot close account with non-zero balance (${money(bal)}). Please withdraw all funds first.</div>`;
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/accounts/${accId}`, {
        method: 'PUT',
        body: JSON.stringify({ cid, acc_type, status })
      });
      closeEditModal();
      toast(`Account #${accId} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditTransaction(tId) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let tx = (state.data.transactions || []).find(t => Number(t[0]) === Number(tId));
  if (!tx) {
    try {
      const res = await api(`/transactions/${tId}`);
      const d = res.data;
      tx = [d.t_id, d.acc_id, d.trans_date, d.type, d.amount, d.mode, d.status];
    } catch (e) {
      return toast('Transaction not found: ' + e.message, false);
    }
  }

  $('#editModalTitle').textContent = 'Edit Transaction';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#fefce8;border-left:4px solid #f59e0b;color:#854d0e">
      <b>Ledger Integrity Protection:</b> Transaction Amount, Type, and Account are immutable audit records. Safe metadata (Mode) can be updated below. To correct erroneous amounts, use Delete / Reverse.
    </div>
  `;

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>Transaction ID</label><input value="#${tx[0]}" disabled /></div>
      <div class="field"><label>Account ID</label><input value="#${tx[1]}" disabled /></div>
      <div class="field"><label>Transaction Type</label><input value="${tx[3]}" disabled /></div>
      <div class="field"><label>Amount</label><input value="${money(tx[4])}" disabled /></div>
      <div class="field"><label>Transaction Status</label><input value="${tx[6] || tx[5] || 'SUCCESS'}" disabled /></div>
      <div class="field"><label>Transaction Mode (Editable)</label><select id="etMode" class="select" style="width:100%"><option value="ONLINE" ${tx[5] === 'ONLINE' ? 'selected' : ''}>ONLINE</option><option value="CASH" ${tx[5] === 'CASH' ? 'selected' : ''}>CASH</option><option value="ATM" ${tx[5] === 'ATM' ? 'selected' : ''}>ATM</option><option value="POS" ${tx[5] === 'POS' ? 'selected' : ''}>POS</option><option value="CHEQUE" ${tx[5] === 'CHEQUE' ? 'selected' : ''}>CHEQUE</option><option value="UPI" ${tx[5] === 'UPI' ? 'selected' : ''}>UPI</option></select><small class="field-tip">Safe metadata channel</small></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const mode = $('#etMode').value;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/transactions/${tId}`, {
        method: 'PUT',
        body: JSON.stringify({ mode })
      });
      closeEditModal();
      toast(`Transaction #${tId} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditLoan(lId) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let loan = (state.data.loans || []).find(l => Number(l[0]) === Number(lId));
  if (!loan) {
    try {
      const res = await api(`/loans/${lId}`);
      const d = res.data;
      loan = [d.l_id, d.cid, d.l_type, d.amount, d.interest, d.term, d.status];
    } catch (e) {
      return toast('Loan not found: ' + e.message, false);
    }
  }

  if (!state.data.customers) await load('/customers', 'customers');
  const custs = state.data.customers || [];
  const isSettled = (loan[6] || 'ACTIVE') === 'SETTLED' || (loan[6] || 'ACTIVE') === 'CLOSED';

  $('#editModalTitle').textContent = 'Edit Loan';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing <b>Loan</b> Record <code>#${loan[0]}</code> • Changes to principal amount update live loan distribution.
    </div>
  `;

  const custOptions = custs.map(c => 
    `<option value="${c[0]}" ${Number(c[0]) === Number(loan[1]) ? 'selected' : ''}>${c[2]} ${c[3] || ''} (CID #${c[0]})</option>`
  ).join('');

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Borrower (Customer) *</label><select id="elCid" class="select" style="width:100%">${custOptions}</select></div>
      <div class="field"><label>Loan Type *</label><select id="elType" class="select" style="width:100%"><option value="HOME" ${loan[2] === 'HOME' ? 'selected' : ''}>HOME</option><option value="CAR" ${loan[2] === 'CAR' ? 'selected' : ''}>CAR</option><option value="PERSONAL" ${loan[2] === 'PERSONAL' ? 'selected' : ''}>PERSONAL</option><option value="EDUCATION" ${loan[2] === 'EDUCATION' ? 'selected' : ''}>EDUCATION</option><option value="BUSINESS" ${loan[2] === 'BUSINESS' ? 'selected' : ''}>BUSINESS</option></select></div>
      <div class="field"><label>Principal Amount (₹) *</label><input id="elAmount" type="number" min="1" step="1000" value="${loan[3]}" ${isSettled ? 'disabled' : ''} /><small class="field-tip">${isSettled ? 'Settled loans cannot alter principal' : 'Sanctioned principal amount'}</small></div>
      <div class="field"><label>Annual Interest Rate (%) *</label><input id="elInterest" type="number" min="0" step="0.01" value="${loan[4]}" required /></div>
      <div class="field"><label>Tenure (Months) *</label><input id="elTerm" type="number" min="1" step="1" value="${loan[5]}" required /></div>
      <div class="field full"><label>Loan Status</label><select id="elStatus" class="select" style="width:100%"><option value="ACTIVE" ${loan[6] === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option value="SETTLED" ${loan[6] === 'SETTLED' ? 'selected' : ''}>SETTLED</option><option value="CLOSED" ${loan[6] === 'CLOSED' ? 'selected' : ''}>CLOSED</option></select></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const cid = Number($('#elCid').value);
    const l_type = $('#elType').value;
    const amount = Number($('#elAmount').value);
    const interest = Number($('#elInterest').value);
    const term = Number($('#elTerm').value);
    const status = $('#elStatus').value;

    if (!cid) {
      $('#editModalError').innerHTML = '<div class="alert">Please select a valid customer.</div>';
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      $('#editModalError').innerHTML = '<div class="alert">Principal amount must be greater than 0.</div>';
      return;
    }
    if (isNaN(interest) || interest < 0) {
      $('#editModalError').innerHTML = '<div class="alert">Interest rate must be 0 or greater.</div>';
      return;
    }
    if (isNaN(term) || term <= 0 || !Number.isInteger(term)) {
      $('#editModalError').innerHTML = '<div class="alert">Tenure must be a positive integer number of months.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/loans/${lId}`, {
        method: 'PUT',
        body: JSON.stringify({ cid, l_type, amount, interest, term, status })
      });
      closeEditModal();
      toast(`Loan #${lId} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditCreditCard(pno) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let card = (state.data.cards || []).find(c => String(c[0]) === String(pno));
  if (!card) {
    try {
      const res = await api(`/creditcards/${pno}`);
      const d = res.data;
      card = [d.pno, d.type, d.card_limit, d.expiry, d.status, null, d.cid];
    } catch (e) {
      return toast('Credit card not found: ' + e.message, false);
    }
  }

  if (!state.data.customers) await load('/customers', 'customers');
  const custs = state.data.customers || [];

  $('#editModalTitle').textContent = 'Edit Credit Card';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing Credit Card <code>•••• •••• •••• ${String(pno).slice(-4)}</code> • CVV and full card numbers are protected.
    </div>
  `;

  const custOptions = custs.map(c => 
    `<option value="${c[0]}" ${Number(c[0]) === Number(card[6]) ? 'selected' : ''}>${c[2]} ${c[3] || ''} (CID #${c[0]})</option>`
  ).join('');

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Cardholder (Customer) *</label><select id="eccCid" class="select" style="width:100%">${custOptions}</select></div>
      <div class="field"><label>Card Network / Type *</label><select id="eccType" class="select" style="width:100%"><option value="VISA" ${card[1] === 'VISA' ? 'selected' : ''}>VISA</option><option value="MASTERCARD" ${card[1] === 'MASTERCARD' ? 'selected' : ''}>MASTERCARD</option><option value="RUPAY" ${card[1] === 'RUPAY' ? 'selected' : ''}>RUPAY</option><option value="AMEX" ${card[1] === 'AMEX' ? 'selected' : ''}>AMEX</option></select></div>
      <div class="field"><label>Card Limit (₹) *</label><input id="eccLimit" type="number" min="1000" step="5000" value="${card[2]}" required /></div>
      <div class="field"><label>Expiry Date</label><input id="eccExpiry" type="date" value="${toDateInput(card[3])}" /></div>
      <div class="field"><label>Status</label><select id="eccStatus" class="select" style="width:100%"><option value="ACTIVE" ${card[4] === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option value="INACTIVE" ${card[4] === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option><option value="BLOCKED" ${card[4] === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option><option value="CLOSED" ${card[4] === 'CLOSED' ? 'selected' : ''}>CLOSED</option></select></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const cid = Number($('#eccCid').value);
    const type = $('#eccType').value;
    const card_limit = Number($('#eccLimit').value);
    const expiry = $('#eccExpiry').value.trim();
    const status = $('#eccStatus').value;

    if (!cid) {
      $('#editModalError').innerHTML = '<div class="alert">Please select a valid customer.</div>';
      return;
    }
    if (isNaN(card_limit) || card_limit <= 0) {
      $('#editModalError').innerHTML = '<div class="alert">Card limit must be greater than 0.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/creditcards/${pno}`, {
        method: 'PUT',
        body: JSON.stringify({ cid, type, card_limit, expiry: expiry || null, status })
      });
      closeEditModal();
      toast(`Credit card ending in ${String(pno).slice(-4)} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditBranch(bId) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let branch = (state.data.branches || []).find(b => Number(b[0]) === Number(bId));
  if (!branch) {
    try {
      const res = await api(`/branches/${bId}`);
      const d = res.data;
      branch = [d.b_id, d.branch_name, d.city, d.state, d.pincode, d.ifsc, d.contact, d.status];
    } catch (e) {
      return toast('Branch not found: ' + e.message, false);
    }
  }

  $('#editModalTitle').textContent = 'Edit Branch';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing <b>Branch</b> Record <code>#${branch[0]}</code> • IFSC codes must remain globally unique.
    </div>
  `;

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Branch Name *</label><input id="ebName" value="${escapeQuotes(branch[1] || '')}" required /></div>
      <div class="field"><label>IFSC Code (Unique)</label><input id="ebIfsc" value="${escapeQuotes(branch[5] || '')}" style="text-transform:uppercase" /><small class="field-tip">Validated against all branch records</small></div>
      <div class="field"><label>Contact Number</label><input id="ebContact" value="${escapeQuotes(branch[6] || '')}" /></div>
      <div class="field"><label>City</label><input id="ebCity" value="${escapeQuotes(branch[2] || '')}" /></div>
      <div class="field"><label>State</label><input id="ebState" value="${escapeQuotes(branch[3] || '')}" /></div>
      <div class="field"><label>Pincode</label><input id="ebPin" value="${escapeQuotes(branch[4] || '')}" /></div>
      <div class="field"><label>Status</label><select id="ebStatus" class="select" style="width:100%"><option value="ACTIVE" ${branch[7] === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option value="INACTIVE" ${branch[7] === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option></select></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const branch_name = $('#ebName').value.trim();
    const ifsc = $('#ebIfsc').value.trim().toUpperCase();
    const contact = $('#ebContact').value.trim();
    const city = $('#ebCity').value.trim();
    const stateVal = $('#ebState').value.trim();
    const pincode = $('#ebPin').value.trim();
    const status = $('#ebStatus').value;

    if (!branch_name) {
      $('#editModalError').innerHTML = '<div class="alert">Branch name is required.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/branches/${bId}`, {
        method: 'PUT',
        body: JSON.stringify({ branch_name, ifsc: ifsc || null, contact: contact || null, city: city || null, state: stateVal || null, pincode: pincode || null, status })
      });
      closeEditModal();
      toast(`Branch #${bId} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditEmployee(empId) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let emp = (state.data.employees || []).find(e => Number(e[0]) === Number(empId));
  if (!emp) {
    try {
      const res = await api(`/employees/${empId}`);
      const d = res.data;
      emp = [d.emp_id, d.first_name, d.last_name, d.salary, d.hire_date, d.b_id, d.status];
    } catch (e) {
      return toast('Employee not found: ' + e.message, false);
    }
  }

  if (!state.data.branches) await load('/branches', 'branches');
  const branches = state.data.branches || [];

  $('#editModalTitle').textContent = 'Edit Employee';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing <b>Employee</b> Record <code>#${emp[0]}</code> • Customer assignments and branch links preserved.
    </div>
  `;

  const branchOptions = '<option value="">None (Optional)</option>' + branches.map(b => 
    `<option value="${b[0]}" ${Number(b[0]) === Number(emp[5]) ? 'selected' : ''}>${b[1]} (Branch #${b[0]})</option>`
  ).join('');

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>First Name *</label><input id="eeFirst" value="${escapeQuotes(emp[1] || '')}" required /></div>
      <div class="field"><label>Last Name</label><input id="eeLast" value="${escapeQuotes(emp[2] || '')}" /></div>
      <div class="field"><label>Salary (₹)</label><input id="eeSalary" type="number" min="0" step="500" value="${emp[3] || 0}" /></div>
      <div class="field"><label>Hire Date</label><input id="eeHireDate" type="date" value="${toDateInput(emp[4])}" /></div>
      <div class="field full"><label>Assigned Branch</label><select id="eeBranch" class="select" style="width:100%">${branchOptions}</select></div>
      <div class="field full"><label>Status</label><select id="eeStatus" class="select" style="width:100%"><option value="ACTIVE" ${emp[6] === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option><option value="INACTIVE" ${emp[6] === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option></select></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const first_name = $('#eeFirst').value.trim();
    const last_name = $('#eeLast').value.trim();
    const salary = $('#eeSalary').value !== '' ? Number($('#eeSalary').value) : null;
    const hire_date = $('#eeHireDate').value.trim();
    const b_id = $('#eeBranch').value ? Number($('#eeBranch').value) : null;
    const status = $('#eeStatus').value;

    if (!first_name) {
      $('#editModalError').innerHTML = '<div class="alert">First name is required.</div>';
      return;
    }
    if (salary !== null && (isNaN(salary) || salary < 0)) {
      $('#editModalError').innerHTML = '<div class="alert">Salary must be 0 or greater.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/employees/${empId}`, {
        method: 'PUT',
        body: JSON.stringify({ first_name, last_name: last_name || null, salary, hire_date: hire_date || null, b_id, status })
      });
      closeEditModal();
      toast(`Employee #${empId} updated successfully!`);
      await loadAll();
      renderView(true);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditNominee(nId, returnAccId) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  let nom;
  try {
    const res = await api(`/nominees/${nId}`);
    const d = res.data;
    nom = [d.n_id, d.first_name, d.last_name, d.relationship, d.dob, d.cid, d.acc_id];
  } catch (e) {
    return toast('Nominee not found: ' + e.message, false);
  }

  if (!state.data.customers) await load('/customers', 'customers');
  if (!state.data.accounts) await load('/accounts', 'accounts');
  const custs = state.data.customers || [];
  const accounts = state.data.accounts || [];

  $('#editModalTitle').textContent = 'Edit Nominee';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing <b>Nominee</b> Record <code>#${nom[0]}</code> • Customer & Account ownership mappings updated atomically.
    </div>
  `;

  const custOptions = custs.map(c => 
    `<option value="${c[0]}" ${Number(c[0]) === Number(nom[5]) ? 'selected' : ''}>${c[2]} ${c[3] || ''} (CID #${c[0]})</option>`
  ).join('');

  const accOptions = accounts.map(a => 
    `<option value="${a[0]}" ${Number(a[0]) === Number(nom[6]) ? 'selected' : ''}>Account #${a[0]} (${a[3]} - Owner CID #${a[4]})</option>`
  ).join('');

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field"><label>First Name *</label><input id="enFirst" value="${escapeQuotes(nom[1] || '')}" required /></div>
      <div class="field"><label>Last Name</label><input id="enLast" value="${escapeQuotes(nom[2] || '')}" /></div>
      <div class="field"><label>Relationship</label><input id="enRel" value="${escapeQuotes(nom[3] || '')}" placeholder="e.g. Spouse, Son, Mother" /></div>
      <div class="field"><label>Date of Birth</label><input id="enDob" type="date" value="${toDateInput(nom[4])}" /></div>
      <div class="field full"><label>Associated Customer *</label><select id="enCid" class="select" style="width:100%">${custOptions}</select></div>
      <div class="field full"><label>Associated Account *</label><select id="enAcc" class="select" style="width:100%">${accOptions}</select></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Changes';

  saveBtn.onclick = async () => {
    const first_name = $('#enFirst').value.trim();
    const last_name = $('#enLast').value.trim();
    const relationship = $('#enRel').value.trim();
    const dob = $('#enDob').value.trim();
    const cid = Number($('#enCid').value);
    const acc_id = Number($('#enAcc').value);

    if (!first_name) {
      $('#editModalError').innerHTML = '<div class="alert">First name is required.</div>';
      return;
    }
    if (!cid || !acc_id) {
      $('#editModalError').innerHTML = '<div class="alert">Customer and Account associations are required.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/nominees/${nId}`, {
        method: 'PUT',
        body: JSON.stringify({ first_name, last_name: last_name || null, relationship: relationship || null, dob: dob || null, cid, acc_id })
      });
      closeEditModal();
      toast(`Nominee #${nId} updated successfully!`);
      await loadAll();
      if (returnAccId !== undefined && returnAccId !== null) {
        await openNomineeManager(returnAccId);
      } else {
        renderView(true);
      }
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}

async function openEditPhone(cid, phone, custName) {
  editModalDom();
  if ($('#editModalError')) $('#editModalError').innerHTML = '';

  $('#editModalTitle').textContent = 'Edit Phone Number';
  $('#editModalBanner').innerHTML = `
    <div class="policy-banner" style="margin-bottom:14px;background:#f8faff;border-left:4px solid #4f46e5;color:#3730a3">
      Editing phone for <b>${escapeQuotes(custName)}</b> (Customer <code>#${cid}</code>).
    </div>
  `;

  $('#editModalBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Current Phone Number</label><input value="${phone}" disabled /></div>
      <div class="field full"><label>New Phone Number *</label><input id="epNewPhone" value="${phone}" placeholder="e.g. 9876543210" required /><small class="field-tip">Must be a valid 5 to 15 digit telephone number</small></div>
    </div>
  `;

  const saveBtn = $('#editModalSaveBtn');
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save Phone';

  saveBtn.onclick = async () => {
    const newPhone = $('#epNewPhone').value.trim();
    if (!newPhone) {
      $('#editModalError').innerHTML = '<div class="alert">Phone number cannot be blank.</div>';
      return;
    }
    if (newPhone.length < 5 || newPhone.length > 15) {
      $('#editModalError').innerHTML = '<div class="alert">Phone number must be between 5 and 15 digits.</div>';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    $('#editModalError').innerHTML = '';

    try {
      await api(`/customers/${cid}/phones/${encodeURIComponent(phone)}`, {
        method: 'PUT',
        body: JSON.stringify({ phone: newPhone })
      });
      closeEditModal();
      toast('Phone number updated successfully!');
      await openPhoneManager(cid, custName);
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Phone';
      $('#editModalError').innerHTML = `<div class="alert">${err.message}</div>`;
    }
  };

  $('#editModal').classList.add('open');
}
