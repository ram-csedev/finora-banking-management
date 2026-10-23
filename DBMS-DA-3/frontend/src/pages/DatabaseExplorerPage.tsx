import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  Table2,
  Key,
  ListFilter,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Shield,
  FileCode,
  Terminal,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { api } from '../api/client';
import {
  TableMetadata,
  ColumnMetadata,
  IndexMetadata,
  ConstraintMetadata,
  RelationshipMetadata,
} from '../types';

export const DatabaseExplorerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Catalog Overview State
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [relationships, setRelationships] = useState<RelationshipMetadata[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'BASE TABLE' | 'VIEW'>('ALL');

  // Selected Table State
  const selectedParam = searchParams.get('table');
  const [selectedTable, setSelectedTable] = useState<string>(selectedParam || 'account');
  const [activeTab, setActiveTab] = useState<'columns' | 'constraints' | 'indexes' | 'relationships' | 'definition'>('columns');

  // Selected Table Metadata Details
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [constraints, setConstraints] = useState<ConstraintMetadata[]>([]);
  const [indexes, setIndexes] = useState<IndexMetadata[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [hideNotNullChecks, setHideNotNullChecks] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Synchronize URL param with selectedTable
  useEffect(() => {
    if (selectedParam && selectedParam !== selectedTable) {
      setSelectedTable(selectedParam);
    }
  }, [selectedParam]);

  const handleSelectTable = (name: string) => {
    setSelectedTable(name);
    setSearchParams({ table: name });
  };

  // Fetch Tables Catalog
  const fetchCatalog = useCallback(async () => {
    setLoadingTables(true);
    setCatalogError(null);
    try {
      const [tblRes, relRes] = await Promise.all([
        api.getMetadataTables(),
        api.getMetadataRelationships(),
      ]);
      if (tblRes.success) {
        setTables(tblRes.data);
        // If current selection is not in tables, select the first table
        if (!tblRes.data.some((t) => t.tableName === selectedTable) && tblRes.data.length > 0) {
          const defaultTable = tblRes.data.find((t) => t.tableName === 'account')?.tableName || tblRes.data[0].tableName;
          setSelectedTable(defaultTable);
        }
      }
      if (relRes.success) {
        setRelationships(relRes.data);
      }
    } catch (err: any) {
      setCatalogError(err.message || 'Failed to fetch database catalog.');
    } finally {
      setLoadingTables(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Fetch Details for Selected Table
  useEffect(() => {
    if (!selectedTable) return;

    let isMounted = true;
    setLoadingDetails(true);

    Promise.all([
      api.getMetadataColumns(selectedTable).catch(() => ({ success: false, data: [] })),
      api.getMetadataConstraints(selectedTable).catch(() => ({ success: false, data: [] })),
      api.getMetadataIndexes(selectedTable).catch(() => ({ success: false, data: [] })),
    ]).then(([colRes, conRes, idxRes]) => {
      if (!isMounted) return;
      if (colRes.success) setColumns(colRes.data as ColumnMetadata[]);
      if (conRes.success) setConstraints(conRes.data as ConstraintMetadata[]);
      if (idxRes.success) setIndexes(idxRes.data as IndexMetadata[]);
      setLoadingDetails(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTable]);

  // Filtered Tables List
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch = t.tableName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'ALL' || t.tableType === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [tables, searchQuery, activeFilter]);

  // Current Table Object
  const currentTableObj = useMemo(() => {
    return tables.find((t) => t.tableName === selectedTable);
  }, [tables, selectedTable]);

  // Catalog Summary Statistics
  const stats = useMemo(() => {
    const baseCount = tables.filter((t) => t.tableType === 'BASE TABLE').length;
    const viewCount = tables.filter((t) => t.tableType === 'VIEW').length;
    const totalRows = tables.reduce((acc, t) => acc + (Number(t.rowCount) || 0), 0);
    return {
      totalObjects: tables.length,
      baseTables: baseCount,
      views: viewCount,
      totalRows,
    };
  }, [tables]);

  // Filtered Constraints (optional filtering of internal not-null checks)
  const displayConstraints = useMemo(() => {
    if (!hideNotNullChecks) return constraints;
    return constraints.filter((c) => {
      // CockroachDB internally creates checks like <id>_<id>_<id>_not_null with check_clause = "col IS NOT NULL"
      return !c.constraint_name.endsWith('_not_null') && !c.check_clause?.toUpperCase().endsWith('IS NOT NULL');
    });
  }, [constraints, hideNotNullChecks]);

  // Inbound and Outbound Relationships for Selected Table
  const tableRelationships = useMemo(() => {
    const outbound = relationships.filter((r) => r.from_table === selectedTable);
    const inbound = relationships.filter((r) => r.to_table === selectedTable);
    return { outbound, inbound, total: outbound.length + inbound.length };
  }, [relationships, selectedTable]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            CockroachDB Catalog & Metadata Explorer
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Real-time schema introspection dynamically queried from CockroachDB <code className="text-cyan-400/90">information_schema</code> and <code className="text-cyan-400/90">pg_catalog</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="emerald" size="sm" dot>Live CockroachDB</Badge>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingTables ? 'animate-spin' : ''}`} />}
            onClick={fetchCatalog}
          >
            Refresh Catalog
          </Button>
        </div>
      </div>

      {/* Database Catalog Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-obsidian-900/80 border border-obsidian-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono text-obsidian-400 tracking-wider">Catalog Objects</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{loadingTables ? '...' : stats.totalObjects}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Database className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-900/80 border border-obsidian-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono text-obsidian-400 tracking-wider">Base Tables</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{loadingTables ? '...' : stats.baseTables}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Table2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-900/80 border border-obsidian-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono text-obsidian-400 tracking-wider">Analytical Views</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{loadingTables ? '...' : stats.views}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-obsidian-900/80 border border-obsidian-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono text-obsidian-400 tracking-wider">Total Stored Rows</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">{loadingTables ? '...' : stats.totalRows.toLocaleString()}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {catalogError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>Error loading schema catalog: {catalogError}</span>
          <Button variant="outline" size="xs" onClick={fetchCatalog}>Retry</Button>
        </div>
      )}

      {/* Main Grid: Left Catalog Navigation + Right Metadata Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tables & Views List (4 cols) */}
        <Card className="lg:col-span-4 flex flex-col h-[740px]">
          <CardHeader className="pb-3 border-b border-obsidian-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Schema Entities</CardTitle>
                <CardDescription className="text-xs">Database finora_da3</CardDescription>
              </div>
              <Badge variant="slate" size="xs">{filteredTables.length} Objects</Badge>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-obsidian-800/60">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
                }`}
              >
                All ({tables.length})
              </button>
              <button
                onClick={() => setActiveFilter('BASE TABLE')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeFilter === 'BASE TABLE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
                }`}
              >
                Tables ({stats.baseTables})
              </button>
              <button
                onClick={() => setActiveFilter('VIEW')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeFilter === 'VIEW'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
                }`}
              >
                Views ({stats.views})
              </button>
            </div>

            <div className="mt-3">
              <SearchInput
                placeholder="Filter tables or views..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>

          {/* Table List Scrollable */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingTables ? (
              <div className="py-12 text-center text-xs text-obsidian-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                Introspecting database catalog...
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="py-8 text-center text-xs text-obsidian-500">
                No catalog objects match "{searchQuery}"
              </div>
            ) : (
              filteredTables.map((t) => {
                const isSelected = selectedTable === t.tableName;
                const isView = t.tableType === 'VIEW';
                return (
                  <button
                    key={t.tableName}
                    onClick={() => handleSelectTable(t.tableName)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 text-white border border-cyan-500/40 shadow-glow-cyan/10'
                        : 'text-obsidian-300 hover:bg-obsidian-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isView ? (
                        <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-cyan-500/60'}`} />
                      ) : (
                        <Table2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-obsidian-500'}`} />
                      )}
                      <div className="truncate">
                        <span className="font-mono text-xs font-medium block truncate">{t.tableName}</span>
                        <span className="text-[10px] text-obsidian-500 font-sans block">
                          {t.columnCount} cols &bull; {t.isExactCount ? 'Exact count' : 'Estimate'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono text-obsidian-400">
                        {t.rowCount} rows
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Column: Object Detail Inspector (8 cols) */}
        <Card className="lg:col-span-8 flex flex-col h-[740px]">
          {/* Inspector Header */}
          <CardHeader className="border-b border-obsidian-800 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  currentTableObj?.tableType === 'VIEW'
                    ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {currentTableObj?.tableType === 'VIEW' ? <Sparkles className="w-5 h-5" /> : <Table2 className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-mono text-base text-white">{selectedTable}</CardTitle>
                    <Badge variant={currentTableObj?.tableType === 'VIEW' ? 'cyan' : 'emerald'} size="xs">
                      {currentTableObj?.tableType || 'BASE TABLE'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    {columns.length} Columns &bull; {currentTableObj?.rowCount ?? 0} Stored Rows &bull; Table Schema: <code className="text-cyan-400/90 font-mono">public.{selectedTable}</code>
                  </CardDescription>
                </div>
              </div>

              {/* Cross-navigation actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/schema?highlight=${selectedTable}`)}
                >
                  View in Schema
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  icon={<Terminal className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/workbench?query=${encodeURIComponent(`SELECT * FROM ${selectedTable} LIMIT 25;`)}`)}
                >
                  Query Table
                </Button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 mt-4 border-b border-obsidian-800/80 -mb-3 pb-0">
              <button
                onClick={() => setActiveTab('columns')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'columns'
                    ? 'border-cyan-400 text-cyan-400 font-semibold'
                    : 'border-transparent text-obsidian-400 hover:text-white'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                Columns ({columns.length})
              </button>
              <button
                onClick={() => setActiveTab('constraints')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'constraints'
                    ? 'border-cyan-400 text-cyan-400 font-semibold'
                    : 'border-transparent text-obsidian-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Constraints ({displayConstraints.length})
              </button>
              <button
                onClick={() => setActiveTab('indexes')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'indexes'
                    ? 'border-cyan-400 text-cyan-400 font-semibold'
                    : 'border-transparent text-obsidian-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Indexes ({indexes.length})
              </button>
              <button
                onClick={() => setActiveTab('relationships')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'relationships'
                    ? 'border-cyan-400 text-cyan-400 font-semibold'
                    : 'border-transparent text-obsidian-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Foreign Keys ({tableRelationships.total})
              </button>
              {currentTableObj?.tableType === 'VIEW' && (
                <button
                  onClick={() => setActiveTab('definition')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'definition'
                      ? 'border-cyan-400 text-cyan-400 font-semibold'
                      : 'border-transparent text-obsidian-400 hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  SQL Definition
                </button>
              )}
            </div>
          </CardHeader>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingDetails ? (
              <div className="py-20 text-center text-xs text-obsidian-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                Querying metadata catalog for {selectedTable}...
              </div>
            ) : activeTab === 'columns' ? (
              /* Columns Tab */
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Column Name</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Default / Identity</TableHead>
                      <TableHead>Key / Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((c) => (
                      <TableRow key={c.column_name}>
                        <TableCell className="font-mono text-[11px] text-obsidian-500">
                          {c.ordinal_position}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            {c.is_primary_key && (
                              <span title="Primary Key">
                                <Key className="w-3 h-3 text-amber-400 shrink-0" />
                              </span>
                            )}
                            {c.is_foreign_key && (
                              <span title="Foreign Key">
                                <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                              </span>
                            )}
                            <span className={c.is_primary_key ? 'text-amber-300' : 'text-cyan-300'}>
                              {c.column_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-obsidian-300">
                          {c.data_type}
                          {c.character_maximum_length && (
                            <span className="text-obsidian-500">({c.character_maximum_length})</span>
                          )}
                          {c.numeric_precision && c.numeric_scale && (
                            <span className="text-obsidian-500">
                              ({c.numeric_precision},{c.numeric_scale})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.is_nullable === 'YES' ? 'slate' : 'amber'} size="xs">
                            {c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-obsidian-400 truncate max-w-[160px]">
                          {c.column_default ? (
                            <span className="text-amber-300/80" title={c.column_default}>
                              {c.column_default}
                            </span>
                          ) : (
                            <span className="text-obsidian-600">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.is_primary_key && (
                            <Badge variant="amber" size="xs">PRIMARY KEY</Badge>
                          )}
                          {c.is_foreign_key && c.foreign_table_name && (
                            <Badge variant="cyan" size="xs">
                              FK &rarr; {c.foreign_table_name}({c.foreign_column_name})
                            </Badge>
                          )}
                          {!c.is_primary_key && !c.is_foreign_key && (
                            <span className="text-obsidian-600 text-xs">&mdash;</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : activeTab === 'constraints' ? (
              /* Constraints Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-obsidian-800">
                  <span className="text-xs text-obsidian-400">
                    Showing {displayConstraints.length} active constraints
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-obsidian-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={!hideNotNullChecks}
                      onChange={(e) => setHideNotNullChecks(!e.target.checked)}
                      className="rounded bg-obsidian-950 border-obsidian-800 text-cyan-500 focus:ring-0"
                    />
                    <span>Show internal NOT NULL checks</span>
                  </label>
                </div>

                {displayConstraints.length === 0 ? (
                  <div className="py-12 text-center text-xs text-obsidian-500">
                    No custom domain constraints defined on this object.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayConstraints.map((c) => (
                      <div
                        key={c.constraint_name}
                        className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-white">
                              {c.constraint_name}
                            </span>
                            <Badge
                              variant={
                                c.constraint_type === 'PRIMARY KEY'
                                  ? 'amber'
                                  : c.constraint_type === 'FOREIGN KEY'
                                  ? 'cyan'
                                  : c.constraint_type === 'UNIQUE'
                                  ? 'emerald'
                                  : 'violet'
                              }
                              size="xs"
                            >
                              {c.constraint_type}
                            </Badge>
                          </div>
                          {c.column_name && (
                            <span className="font-mono text-[11px] text-obsidian-400">
                              Target: {c.column_name}
                            </span>
                          )}
                        </div>

                        {c.foreign_table && (
                          <div className="text-xs text-cyan-300 font-mono flex items-center gap-1.5 pt-1">
                            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                            References: <span className="font-semibold">{c.foreign_table}</span>({c.foreign_column})
                          </div>
                        )}

                        {c.check_clause && (
                          <div className="p-2 rounded bg-obsidian-950 border border-obsidian-800 text-[11px] font-mono text-emerald-300/90 overflow-x-auto">
                            CHECK ({c.check_clause})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'indexes' ? (
              /* Indexes Tab */
              <div className="space-y-4">
                {indexes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-obsidian-500">
                    No secondary indexes found for this object.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {indexes.map((idx) => {
                      const isPk = idx.indexname.endsWith('_pkey');
                      return (
                        <div
                          key={idx.indexname}
                          className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Key className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="font-mono text-xs font-semibold text-white">
                                {idx.indexname}
                              </span>
                              <Badge variant={isPk ? 'amber' : 'cyan'} size="xs">
                                {isPk ? 'PRIMARY INDEX' : 'SECONDARY INDEX'}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={copiedText === idx.indexname ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              onClick={() => copyToClipboard(idx.indexdef, idx.indexname)}
                            >
                              {copiedText === idx.indexname ? 'Copied' : 'Copy DDL'}
                            </Button>
                          </div>
                          <div className="p-2.5 rounded bg-obsidian-950 border border-obsidian-800/80 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                            {idx.indexdef}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'relationships' ? (
              /* Foreign Key Relationships Tab */
              <div className="space-y-6">
                {/* Outbound FKs */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    Outbound References ({tableRelationships.outbound.length})
                  </h4>
                  <p className="text-[11px] text-obsidian-400">
                    Tables and parent records that <code className="text-cyan-300">{selectedTable}</code> references via foreign keys
                  </p>

                  {tableRelationships.outbound.length === 0 ? (
                    <div className="p-3 rounded-lg bg-obsidian-900/40 border border-obsidian-800 text-xs text-obsidian-500">
                      No outbound foreign key references.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tableRelationships.outbound.map((rel) => (
                        <div
                          key={rel.constraint_name}
                          className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono text-xs text-white font-semibold">
                              {rel.from_column} &rarr; <span className="text-cyan-400">{rel.to_table}.{rel.to_column}</span>
                            </div>
                            <div className="text-[10px] text-obsidian-400 font-mono mt-0.5">
                              Constraint: {rel.constraint_name} &bull; ON DELETE: {rel.delete_rule} &bull; ON UPDATE: {rel.update_rule}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={<ExternalLink className="w-3 h-3" />}
                            onClick={() => handleSelectTable(rel.to_table)}
                          >
                            Inspect {rel.to_table}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inbound FKs */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Inbound References ({tableRelationships.inbound.length})
                  </h4>
                  <p className="text-[11px] text-obsidian-400">
                    Child tables that hold foreign keys referencing <code className="text-emerald-300">{selectedTable}</code>
                  </p>

                  {tableRelationships.inbound.length === 0 ? (
                    <div className="p-3 rounded-lg bg-obsidian-900/40 border border-obsidian-800 text-xs text-obsidian-500">
                      No other tables reference this entity as a parent.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tableRelationships.inbound.map((rel) => (
                        <div
                          key={rel.constraint_name}
                          className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono text-xs text-white font-semibold">
                              <span className="text-emerald-400">{rel.from_table}.{rel.from_column}</span> &rarr; {rel.to_column}
                            </div>
                            <div className="text-[10px] text-obsidian-400 font-mono mt-0.5">
                              Constraint: {rel.constraint_name} &bull; ON DELETE: {rel.delete_rule}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={<ExternalLink className="w-3 h-3" />}
                            onClick={() => handleSelectTable(rel.from_table)}
                          >
                            Inspect {rel.from_table}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* View SQL Definition Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-obsidian-400">
                    Compiled SQL Query Definition from CockroachDB <code className="text-cyan-400">information_schema.views</code>
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    icon={copiedText === 'view_sql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    onClick={() => copyToClipboard(currentTableObj?.viewDefinition || '', 'view_sql')}
                  >
                    {copiedText === 'view_sql' ? 'Copied' : 'Copy View SQL'}
                  </Button>
                </div>
                <div className="p-4 rounded-xl bg-obsidian-950 border border-obsidian-800 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {currentTableObj?.viewDefinition || 'No view definition available for this object.'}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
