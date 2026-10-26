import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Terminal,
  Play,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RotateCcw,
  Download,
  AlertTriangle,
  Clock,
  Database,
  Layers,
  Search,
  CheckCircle2,
  FileCode,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Key,
  Table as TableIcon,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { api } from '../api/client';
import { WorkbenchPolicy, WorkbenchQueryResult, TableMetadata, ColumnMetadata } from '../types';

interface QueryTemplate {
  id: string;
  title: string;
  category: 'Joins' | 'Aggregations' | 'EXPLAIN Plan' | 'Views' | 'Audit' | 'Security';
  description: string;
  sql: string;
}

const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: 'customer_portfolios',
    title: 'Customer Portfolios & Joint Accounts',
    category: 'Joins',
    description: 'Cross-table join across customer, account_holder, account, and branch',
    sql: `SELECT 
  c.cid, 
  c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
  c.pan,
  b.branch_name,
  a.acc_id,
  a.acc_type,
  a.balance,
  ah.ownership_role,
  ah.share_percentage
FROM customer c
JOIN account_holder ah ON c.cid = ah.cid
JOIN account a ON ah.acc_id = a.acc_id
JOIN branch b ON a.b_id = b.b_id
ORDER BY a.balance DESC
LIMIT 15;`,
  },
  {
    id: 'branch_liquidity',
    title: 'Branch Liquidity & Deposit Aggregates',
    category: 'Aggregations',
    description: 'Aggregates deposit holdings and customer count by physical branch',
    sql: `SELECT 
  b.b_id,
  b.branch_name,
  b.city,
  COUNT(DISTINCT a.acc_id) AS total_accounts,
  COUNT(DISTINCT ah.cid) AS total_customers,
  COALESCE(SUM(a.balance), 0) AS total_branch_deposits,
  ROUND(COALESCE(AVG(a.balance), 0), 2) AS avg_account_balance
FROM branch b
LEFT JOIN account a ON b.b_id = a.b_id
LEFT JOIN account_holder ah ON a.acc_id = ah.acc_id
GROUP BY b.b_id, b.branch_name, b.city
ORDER BY total_branch_deposits DESC;`,
  },
  {
    id: 'cockroach_explain',
    title: 'CockroachDB Cost-Based Query Plan (EXPLAIN)',
    category: 'EXPLAIN Plan',
    description: 'Inspects distributed span scans, index usage, and cost estimates',
    sql: `EXPLAIN 
SELECT 
  t.t_id, 
  t.trans_date, 
  t.type, 
  t.amount, 
  t.mode,
  a.acc_type,
  b.branch_name
FROM transaction t
JOIN account a ON t.acc_id = a.acc_id
JOIN branch b ON a.b_id = b.b_id
WHERE t.amount >= 5000.00
ORDER BY t.trans_date DESC;`,
  },
  {
    id: 'analytical_views',
    title: 'Macro Dashboard View Inspection',
    category: 'Views',
    description: 'Queries the compiled analytical view dashboard_summary',
    sql: `SELECT 
  total_customers,
  total_accounts,
  total_balance AS total_deposits,
  total_loans AS total_active_loans,
  total_loan_amount,
  total_credit_cards,
  total_transactions AS total_transactions_logged
FROM dashboard_summary;`,
  },
  {
    id: 'customer_financial_summary',
    title: 'Customer Dashboard Analytical Aggregates',
    category: 'Views',
    description: 'Multi-table customer aggregated view CTE (accounts, loans, credit cards)',
    sql: `WITH customer_accounts AS (
  SELECT 
    ah.cid,
    COUNT(DISTINCT a.acc_id) AS total_accounts,
    COALESCE(SUM(a.balance), 0) AS net_account_balance
  FROM account_holder ah
  JOIN account a ON ah.acc_id = a.acc_id
  GROUP BY ah.cid
),
customer_loans AS (
  SELECT 
    cid,
    COUNT(l_id) AS total_loans,
    COALESCE(SUM(amount), 0) AS total_loan_liability
  FROM loan
  WHERE status IN ('ACTIVE', 'PENDING', 'APPROVED')
  GROUP BY cid
),
customer_cards AS (
  SELECT 
    cid,
    COUNT(pno) AS total_credit_cards
  FROM creditcard
  GROUP BY cid
)
SELECT 
  c.cid,
  c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
  c.city,
  COALESCE(ca.total_accounts, 0) AS total_accounts,
  COALESCE(ca.net_account_balance, 0.00) AS net_account_balance,
  COALESCE(cl.total_loans, 0) AS total_loans,
  COALESCE(cl.total_loan_liability, 0.00) AS total_loan_liability,
  COALESCE(cc.total_credit_cards, 0) AS total_credit_cards
FROM customer c
LEFT JOIN customer_accounts ca ON c.cid = ca.cid
LEFT JOIN customer_loans cl ON c.cid = cl.cid
LEFT JOIN customer_cards cc ON c.cid = cc.cid
ORDER BY net_account_balance DESC
LIMIT 10;`,
  },
  {
    id: 'security_audit',
    title: 'Tamper-Evident System Audit Trail',
    category: 'Audit',
    description: 'Queries append-only security logs for recent database operations',
    sql: `SELECT 
  log_id, 
  created_at AS event_timestamp, 
  actor_type, 
  actor_id,
  action, 
  entity_name, 
  entity_id,
  ip_address,
  details
FROM audit_log
ORDER BY created_at DESC
LIMIT 20;`,
  },
  {
    id: 'loan_portfolio_overview',
    title: 'Loan Portfolio & Repayment Performance',
    category: 'Joins',
    description: 'Comprehensive cross-table analysis of credit liabilities and servicing',
    sql: `SELECT 
  l.l_id,
  l.l_type,
  l.amount AS sanctioned_amount,
  l.interest AS interest_rate_pct,
  l.term AS tenure_months,
  l.status AS loan_status,
  c.first_name || ' ' || COALESCE(c.last_name, '') AS borrower_name,
  COALESCE(COUNT(lp.payment_id), 0) AS total_installments_paid,
  COALESCE(SUM(lp.principal_amount), 0) AS total_principal_repaid,
  COALESCE(SUM(lp.interest_amount), 0) AS total_interest_serviced
FROM loan l
JOIN customer c ON l.cid = c.cid
LEFT JOIN loan_payment lp ON l.l_id = lp.l_id
GROUP BY l.l_id, l.l_type, l.amount, l.interest, l.term, l.status, c.first_name, c.last_name
ORDER BY l.amount DESC
LIMIT 15;`,
  },
  {
    id: 'interbank_transfers',
    title: 'High-Value Transfer Ledger & Counterparties',
    category: 'Audit',
    description: 'Bilateral transaction ledger tracking transfers and servicing employees',
    sql: `SELECT 
  t.t_id,
  t.trans_date,
  t.amount,
  t.mode,
  t.status,
  t.acc_id AS source_account,
  t.related_acc_id AS counterparty_account,
  t.description,
  concat(e.first_name, ' ', COALESCE(e.last_name, '')) AS processed_by
FROM "transaction" t
LEFT JOIN employee e ON t.processed_by_emp_id = e.emp_id
WHERE t.type = 'TRANSFER' OR t.amount >= 25000.00
ORDER BY t.trans_date DESC
LIMIT 20;`,
  },
  {
    id: 'blocked_statement_test',
    title: 'Safety Interceptor Demo (DDL/DML Test)',
    category: 'Security',
    description: 'Verifies that destructive statements (DROP/DELETE) are strictly blocked',
    sql: `-- Safety Policy Test: Attempting a destructive statement
-- The Workbench sandbox will intercept and reject this statement before execution
DROP TABLE customer;`,
  },
];

export const SqlWorkbenchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Query state (supports ?query=... from other pages)
  const queryParam = searchParams.get('query');
  const [query, setQuery] = useState(queryParam || QUERY_TEMPLATES[0].sql);

  // Policy state
  const [policy, setPolicy] = useState<WorkbenchPolicy | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<WorkbenchQueryResult | null>(null);
  const [executionError, setExecutionError] = useState<{ message: string; details?: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'json' | 'plan'>('results');

  // Search filter within result rows
  const [resultSearch, setResultSearch] = useState('');
  const [copied, setCopied] = useState(false);

  // Schema Explorer state
  const [showSchemaExplorer, setShowSchemaExplorer] = useState(false);
  const [schemaTables, setSchemaTables] = useState<TableMetadata[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableColumnsMap, setTableColumnsMap] = useState<Record<string, ColumnMetadata[]>>({});
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({});

  // Synchronize incoming ?query= param
  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
    }
  }, [queryParam]);

  // Load active policy
  useEffect(() => {
    api.getWorkbenchPolicy()
      .then((res) => {
        if (res.success) setPolicy(res.policy);
      })
      .catch((err) => console.error('Failed to load workbench policy:', err));
  }, []);

  // Fetch schema tables when explorer is opened
  const loadSchemaTables = useCallback(async () => {
    setIsLoadingTables(true);
    try {
      const res = await api.getMetadataTables();
      if (res.success && Array.isArray(res.data)) {
        setSchemaTables(res.data);
      }
    } catch (err) {
      console.error('Failed to load database schema tables:', err);
    } finally {
      setIsLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    if (showSchemaExplorer && schemaTables.length === 0) {
      loadSchemaTables();
    }
  }, [showSchemaExplorer, schemaTables.length, loadSchemaTables]);

  // Fetch columns for a specific table
  const handleToggleTable = async (tableName: string) => {
    if (expandedTable === tableName) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(tableName);

    if (!tableColumnsMap[tableName]) {
      setLoadingColumns((prev) => ({ ...prev, [tableName]: true }));
      try {
        const res = await api.getMetadataColumns(tableName);
        if (res.success && Array.isArray(res.data)) {
          setTableColumnsMap((prev) => ({ ...prev, [tableName]: res.data }));
        }
      } catch (err) {
        console.error(`Failed to load columns for table ${tableName}:`, err);
      } finally {
        setLoadingColumns((prev) => ({ ...prev, [tableName]: false }));
      }
    }
  };

  // Helper to insert snippet into editor at cursor
  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setQuery((prev) => (prev ? `${prev} ${text}` : text));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextQuery = query.substring(0, start) + text + query.substring(end);
    setQuery(nextQuery);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Quick query table snippet
  const handleQueryTable = (tableName: string) => {
    const tableSql = `SELECT * FROM ${tableName.includes(' ') || tableName === 'transaction' ? `"${tableName}"` : tableName} LIMIT 25;`;
    setQuery(tableSql);
    setExecutionError(null);
    setResult(null);
  };

  // Execute query handler
  const handleExecute = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsExecuting(true);
    setExecutionError(null);
    setResult(null);

    try {
      const res = await api.executeWorkbenchQuery(trimmed);
      setResult(res);
      // Auto-switch to plan tab if query is EXPLAIN
      if (trimmed.toUpperCase().startsWith('EXPLAIN')) {
        setActiveTab('plan');
      } else {
        setActiveTab('results');
      }
    } catch (err: any) {
      setExecutionError({
        message: err.message || 'Execution failed.',
        details: err.details,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [query]);

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleSelectTemplate = (tpl: QueryTemplate) => {
    setQuery(tpl.sql);
    setExecutionError(null);
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setExecutionError(null);
  };

  const handleFormat = () => {
    // Multi-line indentation formatter for SQL
    const formatted = query
      .replace(/\s+/g, ' ')
      .replace(/\s*(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN)\s*/gi, '\n$1 ')
      .trim();
    setQuery(formatted);
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic fields list: uses result.fields or falls back to keys of first data object
  const displayFields = useMemo(() => {
    if (result?.fields && result.fields.length > 0) {
      return result.fields.map((f) => f.name);
    }
    if (result?.data && result.data.length > 0) {
      return Object.keys(result.data[0]);
    }
    return [];
  }, [result]);

  // Export Results to CSV
  const handleDownloadCsv = () => {
    if (!result || !result.data || result.data.length === 0) return;
    const headers = displayFields;
    const csvRows = [headers.join(',')];

    result.data.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finora_query_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered result rows
  const filteredRows = useMemo(() => {
    if (!result || !result.data) return [];
    if (!resultSearch.trim()) return result.data;
    const s = resultSearch.toLowerCase();
    return result.data.filter((row) =>
      Object.values(row).some((val) =>
        val !== null && val !== undefined && String(val).toLowerCase().includes(s)
      )
    );
  }, [result, resultSearch]);

  const isExplainQuery = useMemo(() => {
    return query.trim().toUpperCase().startsWith('EXPLAIN');
  }, [query]);

  // Filtered schema tables
  const filteredSchemaTables = useMemo(() => {
    if (!tableFilter.trim()) return schemaTables;
    const s = tableFilter.toLowerCase();
    return schemaTables.filter((t) => t.tableName.toLowerCase().includes(s));
  }, [schemaTables, tableFilter]);

  // Render individual cell with support for JSON objects, numbers, booleans, and nulls
  const renderCellValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-obsidian-600 italic">NULL</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <Badge variant={val ? 'emerald' : 'slate'} size="xs">
          {val ? 'TRUE' : 'FALSE'}
        </Badge>
      );
    }
    if (typeof val === 'number') {
      return <span className="text-amber-300 font-mono">{val}</span>;
    }
    if (typeof val === 'object') {
      const jsonStr = JSON.stringify(val);
      return (
        <span
          className="font-mono text-[11px] text-cyan-300 bg-obsidian-900/90 px-2 py-0.5 rounded border border-cyan-500/20 max-w-xs truncate inline-block cursor-pointer hover:border-cyan-400 hover:text-cyan-200 transition-colors"
          title={`${JSON.stringify(val, null, 2)}\n(Click to copy JSON)`}
          onClick={() => navigator.clipboard.writeText(JSON.stringify(val, null, 2))}
        >
          {jsonStr}
        </span>
      );
    }
    return <span>{String(val)}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            CockroachDB SQL Query Workbench
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Execute guarded read-only queries with CockroachDB cost-based EXPLAIN plans, statement timeouts, and schema discovery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showSchemaExplorer ? 'primary' : 'outline'}
            size="sm"
            icon={<FolderTree className="w-4 h-4 text-cyan-400" />}
            onClick={() => setShowSchemaExplorer(!showSchemaExplorer)}
          >
            {showSchemaExplorer ? 'Close Schema Explorer' : 'Schema Explorer'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Play className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />}
            onClick={handleExecute}
            disabled={isExecuting || !query.trim()}
          >
            {isExecuting ? 'Executing...' : 'Run Query (Ctrl+Enter)'}
          </Button>
        </div>
      </div>

      {/* Safety Policy Bar */}
      <div className="p-4 rounded-xl bg-obsidian-900 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-glow-cyan/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white">Guarded Read-Only Execution Sandbox</span>
            <Badge variant="emerald" size="xs">Read-Only Enforced</Badge>
          </div>
          <p className="text-xs text-obsidian-400">
            Enforces <code className="text-cyan-300 font-mono">statement_timeout = 5000ms</code>, 500-row result cap, and strictly prohibits destructive DDL/DML mutations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="slate" size="xs">5000ms Timeout</Badge>
          <Badge variant="slate" size="xs">500-Row Cap</Badge>
          <Badge variant="slate" size="xs">Single Statement</Badge>
          <button
            onClick={() => setShowPolicyModal(!showPolicyModal)}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline ml-2"
          >
            {showPolicyModal ? 'Hide Details' : 'Policy Details'}
          </button>
        </div>
      </div>

      {/* Expandable Policy Details */}
      {showPolicyModal && (
        <div className="p-4 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Security & Execution Policy Constraints</span>
            <span className="text-[10px] font-mono text-obsidian-400">Mode: {policy?.mode || 'STRICT_READ_ONLY'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-obsidian-900 border border-emerald-500/20 space-y-1">
              <span className="text-emerald-400 font-semibold block">Permitted Operations:</span>
              <p className="text-obsidian-300 text-[11px]">
                {policy?.allowedOperations.join(', ') || 'SELECT, WITH (read-only), SHOW, EXPLAIN, TABLE'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-obsidian-900 border border-rose-500/20 space-y-1">
              <span className="text-rose-400 font-semibold block">Blocked Operations:</span>
              <p className="text-obsidian-300 text-[11px]">
                {policy?.prohibitedCommands.join(', ') || 'INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, GRANT, REVOKE'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-loaded Query Templates */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-obsidian-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Pre-Loaded Banking Templates ({QUERY_TEMPLATES.length})
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {QUERY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="px-3 py-1.5 rounded-lg bg-obsidian-900 hover:bg-obsidian-800 border border-obsidian-800 hover:border-cyan-500/30 text-xs font-mono text-obsidian-300 hover:text-white transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
              title={`${tpl.category}: ${tpl.description}`}
            >
              <FileCode className="w-3 h-3 text-cyan-400" />
              <span>{tpl.title}</span>
              <span className="text-[10px] text-obsidian-500 font-sans">({tpl.category})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout (Editor + Optional Schema Explorer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Drawer / Panel: Interactive Schema Explorer */}
        {showSchemaExplorer && (
          <div className="lg:col-span-4 w-full">
            <Card className="border-obsidian-800 overflow-hidden shadow-lg animate-in slide-in-from-left duration-200">
              <CardHeader className="py-2.5 px-3 bg-obsidian-900/90 border-b border-obsidian-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <CardTitle className="font-mono text-xs">CockroachDB Schema Explorer</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<RefreshCw className={`w-3 h-3 ${isLoadingTables ? 'animate-spin' : ''}`} />}
                  onClick={loadSchemaTables}
                  title="Reload Schema"
                />
              </CardHeader>

              <div className="p-2 border-b border-obsidian-800 bg-obsidian-950/60">
                <SearchInput
                  placeholder="Filter tables & views..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="max-h-[520px] overflow-y-auto divide-y divide-obsidian-800/60 bg-obsidian-950">
                {isLoadingTables ? (
                  <div className="p-6 text-center text-xs text-obsidian-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    Discovering catalog objects...
                  </div>
                ) : filteredSchemaTables.length === 0 ? (
                  <div className="p-6 text-center text-xs text-obsidian-500">
                    No matching database objects found.
                  </div>
                ) : (
                  filteredSchemaTables.map((tbl) => {
                    const isExpanded = expandedTable === tbl.tableName;
                    const columns = tableColumnsMap[tbl.tableName] || [];
                    const isColsLoading = loadingColumns[tbl.tableName];

                    return (
                      <div key={tbl.tableName} className="group transition-colors">
                        {/* Table Header Row */}
                        <div className="flex items-center justify-between px-3 py-2 hover:bg-obsidian-900/60 transition-colors">
                          <button
                            onClick={() => handleToggleTable(tbl.tableName)}
                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-obsidian-500 group-hover:text-cyan-400 shrink-0" />
                            )}
                            <TableIcon className="w-3.5 h-3.5 text-obsidian-400 shrink-0" />
                            <span className="font-mono text-xs text-obsidian-200 group-hover:text-white truncate">
                              {tbl.tableName}
                            </span>
                            <Badge
                              variant={tbl.tableType === 'VIEW' ? 'violet' : 'slate'}
                              size="xs"
                              className="text-[9px] px-1 py-0 shrink-0"
                            >
                              {tbl.tableType === 'VIEW' ? 'VIEW' : 'TABLE'}
                            </Badge>
                          </button>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => insertTextAtCursor(tbl.tableName)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20"
                              title="Insert table name into query"
                            >
                              +Name
                            </button>
                            <button
                              onClick={() => handleQueryTable(tbl.tableName)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20"
                              title="Generate SELECT * query"
                            >
                              SELECT
                            </button>
                          </div>
                        </div>

                        {/* Expanded Column Details */}
                        {isExpanded && (
                          <div className="bg-obsidian-900/40 px-4 py-2 border-t border-b border-obsidian-800/80 space-y-1.5 text-xs animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-[10px] font-mono text-obsidian-400 pb-1 border-b border-obsidian-800/60">
                              <span>COLUMNS ({tbl.columnCount || columns.length})</span>
                              <span>{tbl.rowCount >= 0 ? `~${tbl.rowCount} rows` : ''}</span>
                            </div>

                            {isColsLoading ? (
                              <div className="py-2 text-[11px] text-obsidian-500 flex items-center gap-2">
                                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                                Loading columns...
                              </div>
                            ) : columns.length === 0 ? (
                              <div className="py-1 text-[11px] text-obsidian-500">No columns reported</div>
                            ) : (
                              <div className="space-y-1 pt-1">
                                {columns.map((col) => (
                                  <div
                                    key={col.column_name}
                                    className="flex items-center justify-between font-mono text-[11px] py-0.5 hover:bg-obsidian-800/40 rounded px-1 group/col cursor-pointer"
                                    onClick={() => insertTextAtCursor(col.column_name)}
                                    title={`Click to insert "${col.column_name}" into editor`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {col.is_primary_key ? (
                                        <Key className="w-3 h-3 text-amber-400 shrink-0" />
                                      ) : col.is_foreign_key ? (
                                        <Layers className="w-3 h-3 text-indigo-400 shrink-0" />
                                      ) : (
                                        <span className="w-3 h-3 inline-block" />
                                      )}
                                      <span className="text-obsidian-300 group-hover/col:text-cyan-300 truncate">
                                        {col.column_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-obsidian-500">
                                      <span className="truncate max-w-[80px]">{col.data_type}</span>
                                      {col.is_primary_key && (
                                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                                          PK
                                        </span>
                                      )}
                                      {col.is_foreign_key && (
                                        <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300">
                                          FK
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Right Section / Full Width: SQL Editor Area */}
        <div className={showSchemaExplorer ? 'lg:col-span-8 w-full' : 'lg:col-span-12 w-full'}>
          <Card className="overflow-hidden border-obsidian-800">
            <CardHeader className="py-2.5 px-4 bg-obsidian-900/80 border-b border-obsidian-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <CardTitle className="font-mono text-xs">SQL Editor Sandbox</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyQuery}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleFormat}
                >
                  Format
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </div>
            </CardHeader>

            {/* Textarea Code Box */}
            <div className="relative bg-obsidian-950 p-4">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a read-only query (SELECT, WITH, SHOW, EXPLAIN)..."
                className="w-full bg-transparent resize-y min-h-[170px] font-mono text-xs text-emerald-300/90 leading-relaxed focus:outline-none placeholder:text-obsidian-600"
                spellCheck={false}
              />
            </div>

            {/* Editor Footer Status */}
            <div className="py-2 px-4 bg-obsidian-900/60 border-t border-obsidian-800 flex items-center justify-between text-[11px] font-mono text-obsidian-400">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-obsidian-800 text-cyan-300">Ctrl + Enter</kbd> to execute</span>
              <span>CockroachDB Engine: <code className="text-cyan-400">v26.2.7</code></span>
            </div>
          </Card>
        </div>
      </div>

      {/* Execution Error Banner */}
      {executionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Execution Rejected or Failed
          </div>
          <p className="font-mono text-xs leading-relaxed text-rose-200">
            {executionError.message}
          </p>
          {executionError.details && (
            <div className="p-2.5 rounded bg-obsidian-950 border border-rose-500/20 font-mono text-[11px] text-rose-300/90 overflow-x-auto">
              {typeof executionError.details === 'string'
                ? executionError.details
                : JSON.stringify(executionError.details, null, 2)}
            </div>
          )}
        </div>
      )}

      {/* Execution Results Section */}
      {result && (
        <Card className="animate-in fade-in duration-300">
          <CardHeader className="border-b border-obsidian-800 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold text-white">Execution Successful</CardTitle>
                    <Badge variant="emerald" size="xs">
                      {result.durationMs}ms
                    </Badge>
                    {result.isTruncated && (
                      <Badge variant="amber" size="xs">
                        Cap: 500 Rows
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Returned {result.returnedRows} rows &bull; {displayFields.length} columns &bull; Duration: {result.durationMs}ms
                  </CardDescription>
                </div>
              </div>

              {/* Result Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadCsv}
                  disabled={!result.data || result.data.length === 0}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Results Tabs & Search Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-2 border-t border-obsidian-800/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'results'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                      : 'text-obsidian-400 hover:text-white'
                  }`}
                >
                  Data Grid ({result.returnedRows})
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'json'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                      : 'text-obsidian-400 hover:text-white'
                  }`}
                >
                  Raw JSON
                </button>
                {isExplainQuery && (
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'plan'
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                        : 'text-obsidian-400 hover:text-white'
                    }`}
                  >
                    EXPLAIN Query Plan
                  </button>
                )}
              </div>

              {activeTab === 'results' && (
                <div className="w-56">
                  <SearchInput
                    placeholder="Filter in results..."
                    value={resultSearch}
                    onChange={(e) => setResultSearch(e.target.value)}
                  />
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {activeTab === 'results' ? (
              /* Tab 1: Data Grid Table */
              result.data.length === 0 ? (
                <div className="py-12 text-center text-xs text-obsidian-500">
                  Query returned 0 rows.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[530px] overflow-y-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="sticky top-0 z-10 bg-obsidian-950 border-b border-obsidian-800 shadow-sm">
                      <tr>
                        <th className="py-2.5 px-3 text-[10px] text-obsidian-500 w-10">#</th>
                        {displayFields.map((fName) => (
                          <th key={fName} className="py-2.5 px-3 text-cyan-400 font-semibold whitespace-nowrap">
                            {fName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-obsidian-800/60 bg-obsidian-950/40">
                      {filteredRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-obsidian-850/60 transition-colors">
                          <td className="py-2 px-3 text-[10px] text-obsidian-600">{rowIdx + 1}</td>
                          {displayFields.map((fName) => (
                            <td key={fName} className="py-2 px-3 whitespace-nowrap text-obsidian-200">
                              {renderCellValue(row[fName])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeTab === 'json' ? (
              /* Tab 2: Raw JSON Viewer */
              <div className="p-4 bg-obsidian-950 font-mono text-xs text-cyan-300 max-h-[500px] overflow-auto leading-relaxed">
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            ) : (
              /* Tab 3: Formatted EXPLAIN Plan */
              <div className="p-4 bg-obsidian-950 font-mono text-xs space-y-1.5 max-h-[500px] overflow-auto">
                <div className="text-[11px] text-obsidian-400 uppercase tracking-wider mb-2 font-sans font-semibold">
                  CockroachDB Cost-Based Execution Graph
                </div>
                {result.data.map((row, idx) => {
                  const line = row.info || Object.values(row)[0] || '';
                  const isRoot = String(line).includes('•');
                  const isCost = String(line).includes('estimated row count') || String(line).includes('spans:');
                  return (
                    <div
                      key={idx}
                      className={`whitespace-pre-wrap ${
                        isRoot
                          ? 'text-cyan-400 font-bold pt-1'
                          : isCost
                          ? 'text-amber-300/90'
                          : 'text-obsidian-300'
                      }`}
                    >
                      {String(line)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
