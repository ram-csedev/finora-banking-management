import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Wallet,
  CornerDownRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { api } from '../api/client';
import { Transaction, Account, Employee } from '../types';

export const TransactionsPage: React.FC = () => {
  // State: Data & Filtering
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccId, setSelectedAccId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isDepositModal, setIsDepositModal] = useState(false);
  const [isWithdrawModal, setIsWithdrawModal] = useState(false);
  const [isTransferModal, setIsTransferModal] = useState(false);
  const [isDetailsModal, setIsDetailsModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Form State: Deposit
  const [depositForm, setDepositForm] = useState({
    acc_id: '',
    amount: '',
    mode: 'UPI',
    description: '',
    emp_id: '',
  });
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Form State: Withdraw
  const [withdrawForm, setWithdrawForm] = useState({
    acc_id: '',
    amount: '',
    mode: 'ATM',
    description: '',
    emp_id: '',
  });
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Form State: Transfer
  const [transferForm, setTransferForm] = useState({
    from_acc: '',
    to_acc: '',
    amount: '',
    mode: 'ONLINE',
    description: '',
    emp_id: '',
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Edit Transaction Memo State
  const [isEditMemoModal, setIsEditMemoModal] = useState(false);
  const [editMemoDescription, setEditMemoDescription] = useState('');
  const [isSubmittingMemo, setIsSubmittingMemo] = useState(false);
  const [editMemoError, setEditMemoError] = useState<string | null>(null);

  // Load auxiliary lists (accounts & employees)
  useEffect(() => {
    async function loadAux() {
      try {
        const [accRes, empRes] = await Promise.all([
          api.listAccounts({ limit: 100 }).catch(() => ({ data: [] })),
          api.listEmployees({ limit: 50 }).catch(() => ({ data: [] })),
        ]);
        setAccounts(accRes.data || []);
        setEmployees(empRes.data || []);
        if (accRes.data?.length > 0) {
          const firstAcc = String(accRes.data[0].acc_id);
          const secondAcc = accRes.data[1] ? String(accRes.data[1].acc_id) : firstAcc;
          setDepositForm((p) => ({ ...p, acc_id: firstAcc }));
          setWithdrawForm((p) => ({ ...p, acc_id: firstAcc }));
          setTransferForm((p) => ({ ...p, from_acc: firstAcc, to_acc: secondAcc }));
        }
      } catch (err) {
        // non-blocking
      }
    }
    loadAux();
  }, []);

  // Fetch Transactions with server pagination & filtering
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy: 't_id',
        sortOrder: 'DESC',
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedAccId && selectedAccId !== 'all') params.acc_id = selectedAccId;
      if (selectedType && selectedType !== 'all') params.type = selectedType;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

      const res = await api.listTransactions(params);
      setTransactions(res.data || []);
      setTotalRecords(Number(res.pagination?.totalRecords) || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch ledger transactions.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedAccId, selectedType, selectedStatus]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Execute Deposit
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDeposit(true);
    setDepositError(null);
    try {
      const amt = parseFloat(depositForm.amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Deposit amount must be greater than zero.');
      if (!depositForm.acc_id) throw new Error('Please select an account.');

      const res = await api.deposit({
        acc_id: depositForm.acc_id,
        amount: amt,
        mode: depositForm.mode,
        description: depositForm.description || 'Counter/Digital Deposit',
        emp_id: depositForm.emp_id || undefined,
      });

      setIsDepositModal(false);
      setDepositForm((p) => ({ ...p, amount: '', description: '' }));
      setStatusMessage({
        type: 'success',
        text: `Successfully deposited ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} into ACC-${depositForm.acc_id}. New balance: ₹${res.account.balance}`,
      });
      fetchTransactions();
    } catch (err: any) {
      setDepositError(err.message || 'Deposit failed.');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // Execute Withdrawal
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWithdraw(true);
    setWithdrawError(null);
    try {
      const amt = parseFloat(withdrawForm.amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Withdrawal amount must be greater than zero.');
      if (!withdrawForm.acc_id) throw new Error('Please select an account.');

      const res = await api.withdraw({
        acc_id: withdrawForm.acc_id,
        amount: amt,
        mode: withdrawForm.mode,
        description: withdrawForm.description || 'Counter/ATM Withdrawal',
        emp_id: withdrawForm.emp_id || undefined,
      });

      setIsWithdrawModal(false);
      setWithdrawForm((p) => ({ ...p, amount: '', description: '' }));
      setStatusMessage({
        type: 'success',
        text: `Successfully withdrew ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} from ACC-${withdrawForm.acc_id}. New balance: ₹${res.account.balance}`,
      });
      fetchTransactions();
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal rejected (check for insufficient funds).');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Execute Bilateral Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTransfer(true);
    setTransferError(null);
    try {
      if (transferForm.from_acc === transferForm.to_acc) {
        throw new Error('Source and destination accounts cannot be identical.');
      }
      const amt = parseFloat(transferForm.amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Transfer amount must be greater than zero.');

      const res = await api.transfer({
        from_acc: transferForm.from_acc,
        to_acc: transferForm.to_acc,
        amount: amt,
        mode: transferForm.mode,
        description: transferForm.description || 'Inter-Account Transfer',
        emp_id: transferForm.emp_id || undefined,
      });

      setIsTransferModal(false);
      setTransferForm((p) => ({ ...p, amount: '', description: '' }));
      const debitTxId = res.fromAccount?.transaction?.t_id || 'DEBIT';
      const creditTxId = res.toAccount?.transaction?.t_id || 'CREDIT';
      setStatusMessage({
        type: 'success',
        text: `Bilateral transfer of ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} completed atomically from ACC-${transferForm.from_acc} to ACC-${transferForm.to_acc}. (Debit Tx: TXN-${debitTxId}, Credit Tx: TXN-${creditTxId})`,
      });
      fetchTransactions();
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed (insufficient balance or account hold).');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const openEditMemo = (tx: Transaction) => {
    setSelectedTx(tx);
    setEditMemoDescription(tx.description || '');
    setEditMemoError(null);
    setIsEditMemoModal(true);
  };

  const handleUpdateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;
    setIsSubmittingMemo(true);
    setEditMemoError(null);
    try {
      await api.updateTransaction(selectedTx.t_id, {
        description: editMemoDescription.trim(),
      });
      setIsEditMemoModal(false);
      setStatusMessage({ type: 'success', text: `Transaction TXN-${selectedTx.t_id} memo updated successfully.` });
      fetchTransactions();
    } catch (err: any) {
      setEditMemoError(err.message || 'Failed to update transaction memo.');
    } finally {
      setIsSubmittingMemo(false);
    }
  };

  const getTxColor = (type: string) => {
    if (type === 'DEPOSIT' || type === 'TRANSFER_IN' || type === 'INTEREST_CREDIT') return 'emerald';
    if (type === 'WITHDRAWAL' || type === 'TRANSFER_OUT' || type === 'FEE_DEBIT') return 'rose';
    return 'cyan';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-obsidian-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            Transactions & Banking Operations
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Atomic fund transfers, deposits, and cash ledger records executed under CockroachDB Serializable isolation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTransactions}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => {
              setDepositError(null);
              setIsDepositModal(true);
            }}
            icon={<ArrowDownLeft className="w-4 h-4" />}
          >
            Deposit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setWithdrawError(null);
              setIsWithdrawModal(true);
            }}
            icon={<ArrowUpRight className="w-4 h-4" />}
          >
            Withdraw
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTransferError(null);
              setIsTransferModal(true);
            }}
            icon={<ArrowLeftRight className="w-4 h-4" />}
          >
            Transfer Funds
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-obsidian-750">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Input
              icon={<Search className="w-4 h-4 text-obsidian-400" />}
              placeholder="Search description, mode, status..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div>
            <Select
              value={selectedAccId}
              onChange={(e) => {
                setSelectedAccId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.acc_id} value={acc.acc_id}>
                  ACC-{acc.acc_id} ({acc.acc_type}, Balance: ₹{acc.balance})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Transaction Types</option>
              <option value="DEPOSIT">DEPOSIT</option>
              <option value="WITHDRAWAL">WITHDRAWAL</option>
              <option value="TRANSFER_IN">TRANSFER_IN</option>
              <option value="TRANSFER_OUT">TRANSFER_OUT</option>
              <option value="INTEREST_CREDIT">INTEREST_CREDIT</option>
            </Select>
          </div>

          <div>
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REVERSED">REVERSED</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Transactions Data Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CardTitle>Banking Ledger Journal</CardTitle>
              <Badge variant="cyan" size="xs">
                {totalRecords} Total Journal Records
              </Badge>
            </div>
            <div className="text-xs text-obsidian-400 font-mono">
              Page {currentPage} of {totalPages || 1}
            </div>
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tx ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Amount (INR)</TableHead>
              <TableHead>Channel / Mode</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-obsidian-400 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Loading journal records from CockroachDB...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <TableEmpty message="No transactions found matching the filter criteria." colSpan={8} />
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === 'DEPOSIT' || tx.type === 'TRANSFER_IN' || tx.type === 'INTEREST_CREDIT';
                return (
                  <TableRow key={tx.t_id}>
                    <TableCell className="font-mono font-semibold text-cyan-400">
                      TXN-{tx.t_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTxColor(tx.type)} size="xs">
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-white text-xs font-semibold">
                      ACC-{tx.acc_id}
                    </TableCell>
                    <TableCell className={`font-mono font-bold text-sm ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCredit ? '+' : '-'}₹{parseFloat(String(tx.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs text-obsidian-300 font-mono">
                      {tx.mode}
                    </TableCell>
                    <TableCell className="text-xs text-obsidian-300 max-w-xs truncate">
                      {tx.description || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-obsidian-400 font-mono">
                      {tx.trans_date ? new Date(tx.trans_date).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setIsDetailsModal(true);
                          }}
                          className="p-1.5 rounded-lg text-obsidian-400 hover:text-cyan-400 hover:bg-obsidian-800 transition-colors"
                          title="View Full Transaction Telemetry"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditMemo(tx)}
                          className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                          title="Edit Transaction Memo"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="px-6 py-4 bg-obsidian-900/60 border-t border-obsidian-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-obsidian-400">
          <div className="flex items-center gap-3">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-obsidian-800 border border-obsidian-700 rounded px-2 py-1 text-obsidian-200 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Showing {transactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1 || isLoading}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="font-mono px-2 text-obsidian-200">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages || isLoading}
              iconRight={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: DEPOSIT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDepositModal}
        onClose={() => setIsDepositModal(false)}
        title="Deposit Funds into Account"
        description="Executes balance credit and generates ledger audit record"
        size="md"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          {depositError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{depositError}</span>
            </div>
          )}

          <Select
            label="Destination Account *"
            value={depositForm.acc_id}
            onChange={(e) => setDepositForm({ ...depositForm, acc_id: e.target.value })}
            required
          >
            {accounts.map((a) => (
              <option key={a.acc_id} value={a.acc_id}>
                ACC-{a.acc_id} ({a.acc_type}, Balance: ₹{a.balance})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Deposit Amount (INR) *"
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 5000.00"
              value={depositForm.amount}
              onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
              required
            />
            <Select
              label="Payment Channel"
              value={depositForm.mode}
              onChange={(e) => setDepositForm({ ...depositForm, mode: e.target.value })}
            >
              <option value="UPI">UPI</option>
              <option value="ONLINE">ONLINE</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="CASH">CASH</option>
              <option value="BRANCH">BRANCH</option>
            </Select>
          </div>

          <Input
            label="Description / Narration"
            placeholder="e.g. Counter Cash Deposit"
            value={depositForm.description}
            onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
          />

          <Select
            label="Processing Staff (Employee)"
            value={depositForm.emp_id}
            onChange={(e) => setDepositForm({ ...depositForm, emp_id: e.target.value })}
          >
            <option value="">System Automated (Online)</option>
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.first_name} {e.last_name || ''} (EMP-{e.emp_id})
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsDepositModal(false)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" type="submit" isLoading={isSubmittingDeposit}>
              Confirm Deposit
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: WITHDRAW */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isWithdrawModal}
        onClose={() => setIsWithdrawModal(false)}
        title="Withdraw Funds from Account"
        description="Checks available balance and debits account under serializable lock"
        size="md"
      >
        <form onSubmit={handleWithdraw} className="space-y-4">
          {withdrawError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{withdrawError}</span>
            </div>
          )}

          <Select
            label="Source Account *"
            value={withdrawForm.acc_id}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, acc_id: e.target.value })}
            required
          >
            {accounts.map((a) => (
              <option key={a.acc_id} value={a.acc_id}>
                ACC-{a.acc_id} ({a.acc_type}, Available: ₹{a.balance})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Withdrawal Amount (INR) *"
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 2000.00"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
              required
            />
            <Select
              label="Dispensation Channel"
              value={withdrawForm.mode}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, mode: e.target.value })}
            >
              <option value="ATM">ATM</option>
              <option value="CASH">CASH (Counter)</option>
              <option value="BRANCH">BRANCH (Desk Clearance)</option>
              <option value="ONLINE">ONLINE</option>
            </Select>
          </div>

          <Input
            label="Description / Narration"
            placeholder="e.g. ATM Cash Withdrawal"
            value={withdrawForm.description}
            onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsWithdrawModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isSubmittingWithdraw}>
              Confirm Withdrawal
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: BILATERAL TRANSFER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTransferModal}
        onClose={() => setIsTransferModal(false)}
        title="Execute Bilateral Fund Transfer"
        description="Atomic inter-account transfer creating paired ledger records under Serializable isolation"
        size="md"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          {transferError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{transferError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Source Account (Debit) *"
              value={transferForm.from_acc}
              onChange={(e) => setTransferForm({ ...transferForm, from_acc: e.target.value })}
              required
            >
              {accounts.map((a) => (
                <option key={a.acc_id} value={a.acc_id}>
                  ACC-{a.acc_id} (Bal: ₹{a.balance})
                </option>
              ))}
            </Select>

            <Select
              label="Destination Account (Credit) *"
              value={transferForm.to_acc}
              onChange={(e) => setTransferForm({ ...transferForm, to_acc: e.target.value })}
              required
            >
              {accounts.map((a) => (
                <option key={a.acc_id} value={a.acc_id}>
                  ACC-{a.acc_id} (Bal: ₹{a.balance})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Transfer Amount (INR) *"
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 10000.00"
              value={transferForm.amount}
              onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
              required
            />
            <Select
              label="Transfer Mechanism"
              value={transferForm.mode}
              onChange={(e) => setTransferForm({ ...transferForm, mode: e.target.value })}
            >
              <option value="ONLINE">ONLINE (Direct Inter-Account)</option>
              <option value="UPI">UPI (Instant Settlement)</option>
              <option value="NEFT">NEFT (National Electronic Transfer)</option>
              <option value="RTGS">RTGS (Real-Time Gross Settlement)</option>
              <option value="BRANCH">BRANCH (Desk Clearance)</option>
            </Select>
          </div>

          <Input
            label="Transfer Memo / Description"
            placeholder="e.g. Invoice payment / Settlement"
            value={transferForm.description}
            onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsTransferModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingTransfer}>
              Execute Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: TRANSACTION DETAILS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsModal}
        onClose={() => setIsDetailsModal(false)}
        title={`Transaction Details: TXN-${selectedTx?.t_id}`}
        description="Complete cryptographic ledger entry recorded in CockroachDB"
        size="md"
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Transaction ID</span>
                <span className="font-mono text-cyan-300 font-semibold">TXN-{selectedTx.t_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Account ID</span>
                <span className="font-mono text-white font-semibold">ACC-{selectedTx.acc_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Operation Type</span>
                <Badge variant={getTxColor(selectedTx.type)} size="xs">{selectedTx.type}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Gross Amount</span>
                <span className="font-mono text-base font-bold text-white">
                  ₹{parseFloat(String(selectedTx.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Channel / Mode</span>
                <span className="font-mono text-xs text-obsidian-200">{selectedTx.mode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Status</span>
                <Badge variant="emerald" size="xs" dot>{selectedTx.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-obsidian-400">Recorded Timestamp</span>
                <span className="font-mono text-xs text-obsidian-300">
                  {selectedTx.trans_date ? new Date(selectedTx.trans_date).toLocaleString() : '—'}
                </span>
              </div>
              {selectedTx.related_trans_id && (
                <div className="p-2.5 rounded bg-obsidian-900 border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 flex items-center gap-1">
                    <CornerDownRight className="w-3.5 h-3.5" /> Bilateral Linked Pair:
                  </span>
                  <span className="text-white">TXN-{selectedTx.related_trans_id} (ACC-{selectedTx.related_acc_id})</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT TRANSACTION MEMO */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditMemoModal}
        onClose={() => setIsEditMemoModal(false)}
        title={`Edit Transaction Memo: TXN-${selectedTx?.t_id}`}
        description="Update operational notes or remittance memo in CockroachDB transaction ledger"
        size="md"
      >
        <form onSubmit={handleUpdateMemo} className="space-y-4">
          {editMemoError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editMemoError}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-obsidian-400">Account:</span>
              <span className="text-white">ACC-{selectedTx?.acc_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-400">Amount:</span>
              <span className="text-emerald-400 font-bold">
                ₹{selectedTx ? parseFloat(String(selectedTx.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-400">Channel / Type:</span>
              <span className="text-cyan-300">{selectedTx?.type} ({selectedTx?.mode})</span>
            </div>
          </div>

          <p className="text-[11px] text-obsidian-400 italic">
            Note: Financial amounts, accounts, and ledger timestamps are cryptographically protected and immutable under CockroachDB serializable isolation. Only operational descriptions/memos are updatable.
          </p>

          <Input
            label="Transaction Memo / Narration"
            placeholder="e.g. Updated payment reference or invoice note"
            value={editMemoDescription}
            onChange={(e) => setEditMemoDescription(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditMemoModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingMemo}>
              Save Memo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
