import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { api } from '../api/client';
import { WorkbenchPolicy, WorkbenchQueryResult } from '../types';

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
  total_deposits,
  total_active_loans,
  total_loan_amount,
  total_credit_cards,
  total_transactions_logged
FROM dashboard_summary;`,
  },
  {
    id: 'customer_financial_summary',
    title: 'Customer Dashboard Analytical Aggregates',
    category: 'Views',
    description: 'Multi-table customer aggregated view (accounts, loans, credit cards)',
    sql: `SELECT 
  cid,
  first_name || ' ' || COALESCE(last_name, '') AS customer_name,
  city,
  total_accounts,
  net_account_balance,
  total_loans,
  total_loan_liability,
  total_credit_cards
FROM customer_dashboard
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
  event_timestamp, 
  actor_type, 
  action, 
  entity_name, 
  status, 
  details
FROM audit_log
ORDER BY event_timestamp DESC
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
  const [searchParams, setSearchParams] = useSearchParams();

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
    // Basic multi-line indentation formatter
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

  // Export Results to CSV
  const handleDownloadCsv = () => {
    if (!result || !result.data || result.data.length === 0) return;
    const headers = result.fields.map((f) => f.name);
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
            Execute guarded read-only queries with CockroachDB cost-based EXPLAIN plans, statement timeouts, and row caps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="cyan" size="sm">Phase 5C Active</Badge>
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
                {policy?.allowedOperations.join(', ') || 'SELECT, WITH, SHOW, EXPLAIN'}
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

      {/* Query Template Pills */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-obsidian-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Pre-Loaded Banking Templates
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {QUERY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="px-3 py-1.5 rounded-lg bg-obsidian-900 hover:bg-obsidian-800 border border-obsidian-800 hover:border-cyan-500/30 text-xs font-mono text-obsidian-300 hover:text-white transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <FileCode className="w-3 h-3 text-cyan-400" />
              {tpl.title}
            </button>
          ))}
        </div>
      </div>

      {/* SQL Editor Area */}
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a read-only query (SELECT, WITH, SHOW, EXPLAIN)..."
            className="w-full bg-transparent resize-y min-h-[160px] font-mono text-xs text-emerald-300/90 leading-relaxed focus:outline-none placeholder:text-obsidian-600"
            spellCheck={false}
          />
        </div>

        {/* Editor Footer Status */}
        <div className="py-2 px-4 bg-obsidian-900/60 border-t border-obsidian-800 flex items-center justify-between text-[11px] font-mono text-obsidian-400">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-obsidian-800 text-cyan-300">Ctrl + Enter</kbd> to execute</span>
          <span>CockroachDB Engine: <code className="text-cyan-400">v26.2.7</code></span>
        </div>
      </Card>

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
                    Returned {result.returnedRows} rows &bull; {result.fields.length} columns &bull; Duration: {result.durationMs}ms
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
                        {result.fields.map((f) => (
                          <th key={f.name} className="py-2.5 px-3 text-cyan-400 font-semibold whitespace-nowrap">
                            {f.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-obsidian-800/60 bg-obsidian-950/40">
                      {filteredRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-obsidian-850/60 transition-colors">
                          <td className="py-2 px-3 text-[10px] text-obsidian-600">{rowIdx + 1}</td>
                          {result.fields.map((f) => {
                            const val = row[f.name];
                            return (
                              <td key={f.name} className="py-2 px-3 whitespace-nowrap text-obsidian-200">
                                {val === null || val === undefined ? (
                                  <span className="text-obsidian-600 italic">NULL</span>
                                ) : typeof val === 'boolean' ? (
                                  <Badge variant={val ? 'emerald' : 'slate'} size="xs">
                                    {val ? 'TRUE' : 'FALSE'}
                                  </Badge>
                                ) : typeof val === 'number' ? (
                                  <span className="text-amber-300 font-mono">{val}</span>
                                ) : (
                                  <span>{String(val)}</span>
                                )}
                              </td>
                            );
                          })}
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
