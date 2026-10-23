import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Users,
  ShieldCheck,
  Building,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { api } from '../api/client';
import { Account, AccountHolder, Branch, Customer, Nominee } from '../types';

export const AccountsPage: React.FC = () => {
  // State: Data & Filtering
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isOpenAccountModal, setIsOpenAccountModal] = useState(false);
  const [isDetailsModal, setIsDetailsModal] = useState(false);
  const [isEditAccountModal, setIsEditAccountModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);

  // Active / Selected Account
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountHolders, setAccountHolders] = useState<AccountHolder[]>([]);
  const [accountNominees, setAccountNominees] = useState<Nominee[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form State: Open New Account
  const [createForm, setCreateForm] = useState({
    b_id: '',
    cid: '',
    acc_type: 'SAVINGS',
    balance: '1000.00',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State: Add Joint Holder
  const [newHolderCid, setNewHolderCid] = useState('');
  const [newHolderRole, setNewHolderRole] = useState<'JOINT' | 'SECONDARY' | 'GUARDIAN'>('JOINT');
  const [newHolderShare, setNewHolderShare] = useState('50.00');
  const [isAddingHolder, setIsAddingHolder] = useState(false);

  // Form State: Edit Account
  const [editAccountForm, setEditAccountForm] = useState({
    acc_type: 'SAVINGS' as Account['acc_type'],
    b_id: '',
    status: 'ACTIVE' as Account['status'],
  });
  const [isSubmittingEditAccount, setIsSubmittingEditAccount] = useState(false);
  const [editAccountError, setEditAccountError] = useState<string | null>(null);

  // Holder Edit State
  const [selectedHolder, setSelectedHolder] = useState<AccountHolder | null>(null);
  const [isEditHolderModal, setIsEditHolderModal] = useState(false);
  const [editHolderForm, setEditHolderForm] = useState({
    ownership_role: 'JOINT' as AccountHolder['ownership_role'],
    share_percentage: '50.00',
    is_primary: false,
  });
  const [isSubmittingEditHolder, setIsSubmittingEditHolder] = useState(false);
  const [editHolderError, setEditHolderError] = useState<string | null>(null);

  // Nominee Add & Edit State
  const [isAddNomineeModal, setIsAddNomineeModal] = useState(false);
  const [isEditNomineeModal, setIsEditNomineeModal] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [nomineeForm, setNomineeForm] = useState({
    first_name: '',
    last_name: '',
    relationship: 'SPOUSE',
    dob: '',
    contact_phone: '',
  });
  const [isSubmittingNominee, setIsSubmittingNominee] = useState(false);
  const [nomineeError, setNomineeError] = useState<string | null>(null);

  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load auxiliary lists (branches & customers for selectors)
  useEffect(() => {
    async function loadAux() {
      try {
        const [bRes, cRes] = await Promise.all([
          api.listBranches({ limit: 50 }).catch(() => ({ data: [] })),
          api.listCustomers({ limit: 100 }).catch(() => ({ data: [] })),
        ]);
        setBranches(bRes.data || []);
        setCustomers(cRes.data || []);
        if (bRes.data?.length > 0 && !createForm.b_id) {
          setCreateForm((prev) => ({ ...prev, b_id: String(bRes.data[0].b_id) }));
        }
        if (cRes.data?.length > 0 && !createForm.cid) {
          setCreateForm((prev) => ({ ...prev, cid: String(cRes.data[0].cid) }));
        }
      } catch (err) {
        // non-blocking
      }
    }
    loadAux();
  }, []);

  // Fetch Accounts with pagination & filtering
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedBranchId && selectedBranchId !== 'all') params.b_id = selectedBranchId;
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedType && selectedType !== 'all') params.acc_type = selectedType;

      const res = await api.listAccounts(params);
      setAccounts(res.data || []);
      setTotalRecords(Number(res.pagination?.totalRecords) || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load accounts.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedBranchId, selectedStatus, selectedType]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Open Details Modal & fetch M:N account holders
  const openDetails = async (acc: Account) => {
    setSelectedAccount(acc);
    setIsDetailsModal(true);
    setIsLoadingDetails(true);
    setNewHolderCid(customers[0]?.cid ? String(customers[0].cid) : '');
    try {
      const [holdersRes, nomineesRes] = await Promise.all([
        api.listAccountHolders({ acc_id: acc.acc_id }).catch(() => ({ data: [] })),
        api.get<any>('/entities/nominee', { acc_id: acc.acc_id }).catch(() => ({ data: [] })),
      ]);
      setAccountHolders(holdersRes.data || []);
      setAccountNominees(nomineesRes.data || []);
    } catch (err) {
      // non-blocking
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Add Joint Account Holder (Demonstrates M:N relationship)
  const handleAddJointHolder = async () => {
    if (!selectedAccount || !newHolderCid) return;
    setIsAddingHolder(true);
    try {
      await api.createAccountHolder({
        acc_id: selectedAccount.acc_id,
        cid: newHolderCid,
        ownership_role: newHolderRole,
        is_primary: false,
        share_percentage: parseFloat(newHolderShare) || 50.0,
      });
      // Refresh holders
      const res = await api.listAccountHolders({ acc_id: selectedAccount.acc_id });
      setAccountHolders(res.data || []);
      setStatusMessage({ type: 'success', text: `Added customer CUST-${newHolderCid} as joint holder on ACC-${selectedAccount.acc_id}.` });
    } catch (err: any) {
      alert(err.message || 'Failed to attach joint holder.');
    } finally {
      setIsAddingHolder(false);
    }
  };

  // Submit Open Account
  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      if (!createForm.b_id) throw new Error('Please select a home branch.');
      if (!createForm.cid) throw new Error('Please select a primary customer holder.');

      const bal = parseFloat(createForm.balance) || 0;
      if (bal < 0) throw new Error('Initial balance cannot be negative.');

      // 1. Create account record
      const accRes = await api.createAccount({
        b_id: createForm.b_id,
        acc_type: createForm.acc_type,
        balance: bal,
        status: 'ACTIVE',
      });

      const newAccId = accRes.data?.acc_id;

      // 2. Link primary account holder in account_holder table
      if (newAccId) {
        await api.createAccountHolder({
          acc_id: String(newAccId),
          cid: createForm.cid,
          ownership_role: 'PRIMARY',
          is_primary: true,
          share_percentage: 100.0,
        });
      }

      setIsOpenAccountModal(false);
      setStatusMessage({ type: 'success', text: `Account ACC-${newAccId || 'CREATED'} opened successfully.` });
      fetchAccounts();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to open account.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Account Modal
  const openEditAccount = (acc: Account) => {
    setSelectedAccount(acc);
    setEditAccountForm({
      acc_type: acc.acc_type,
      b_id: String(acc.b_id),
      status: acc.status,
    });
    setEditAccountError(null);
    setIsEditAccountModal(true);
  };

  // Submit Edit Account
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSubmittingEditAccount(true);
    setEditAccountError(null);
    try {
      await api.updateAccount(selectedAccount.acc_id, {
        acc_type: editAccountForm.acc_type,
        b_id: editAccountForm.b_id,
        status: editAccountForm.status,
      });
      setIsEditAccountModal(false);
      setStatusMessage({ type: 'success', text: `Account ACC-${selectedAccount.acc_id} updated successfully.` });
      fetchAccounts();
    } catch (err: any) {
      setEditAccountError(err.message || 'Failed to update account.');
    } finally {
      setIsSubmittingEditAccount(false);
    }
  };

  // Holder handlers
  const openEditHolder = (h: AccountHolder) => {
    setSelectedHolder(h);
    setEditHolderForm({
      ownership_role: h.ownership_role,
      share_percentage: String(h.share_percentage || '50.00'),
      is_primary: h.is_primary,
    });
    setEditHolderError(null);
    setIsEditHolderModal(true);
  };

  const handleUpdateHolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !selectedHolder) return;
    setIsSubmittingEditHolder(true);
    setEditHolderError(null);
    try {
      await api.updateAccountHolder(selectedAccount.acc_id, selectedHolder.cid, {
        ownership_role: editHolderForm.ownership_role,
        share_percentage: parseFloat(editHolderForm.share_percentage) || 50.0,
        is_primary: editHolderForm.is_primary,
      });
      const res = await api.listAccountHolders({ acc_id: selectedAccount.acc_id });
      setAccountHolders(res.data || []);
      setIsEditHolderModal(false);
      setStatusMessage({ type: 'success', text: `Updated ownership details for customer CUST-${selectedHolder.cid}.` });
    } catch (err: any) {
      setEditHolderError(err.message || 'Failed to update holder.');
    } finally {
      setIsSubmittingEditHolder(false);
    }
  };

  const handleDeleteHolder = async (cid: string) => {
    if (!selectedAccount) return;
    if (accountHolders.length <= 1) {
      alert('Cannot remove the sole account holder. Every account must have at least one holder.');
      return;
    }
    if (!confirm(`Are you sure you want to remove holder CUST-${cid} from ACC-${selectedAccount.acc_id}?`)) return;
    try {
      await api.deleteAccountHolder(selectedAccount.acc_id, cid);
      const res = await api.listAccountHolders({ acc_id: selectedAccount.acc_id });
      setAccountHolders(res.data || []);
      setStatusMessage({ type: 'success', text: `Removed joint holder CUST-${cid}.` });
    } catch (err: any) {
      alert(err.message || 'Failed to remove holder.');
    }
  };

  // Nominee handlers
  const openAddNominee = () => {
    setNomineeForm({
      first_name: '',
      last_name: '',
      relationship: 'SPOUSE',
      dob: '',
      contact_phone: '',
    });
    setNomineeError(null);
    setIsAddNomineeModal(true);
  };

  const handleAddNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSubmittingNominee(true);
    setNomineeError(null);
    try {
      if (!nomineeForm.first_name.trim()) throw new Error('First name is required.');
      await api.createNominee({
        acc_id: selectedAccount.acc_id,
        first_name: nomineeForm.first_name.trim(),
        last_name: nomineeForm.last_name.trim() || undefined,
        relationship: nomineeForm.relationship,
        dob: nomineeForm.dob || undefined,
        contact_phone: nomineeForm.contact_phone.trim() || undefined,
      });
      const nRes = await api.listNominees({ acc_id: selectedAccount.acc_id });
      setAccountNominees(nRes.data || []);
      setIsAddNomineeModal(false);
      setStatusMessage({ type: 'success', text: 'Nominee designation added.' });
    } catch (err: any) {
      setNomineeError(err.message || 'Failed to add nominee.');
    } finally {
      setIsSubmittingNominee(false);
    }
  };

  const openEditNominee = (nom: Nominee) => {
    setSelectedNominee(nom);
    setNomineeForm({
      first_name: nom.first_name || '',
      last_name: nom.last_name || '',
      relationship: nom.relationship || 'SPOUSE',
      dob: nom.dob ? nom.dob.split('T')[0] : '',
      contact_phone: nom.contact_phone || '',
    });
    setNomineeError(null);
    setIsEditNomineeModal(true);
  };

  const handleUpdateNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !selectedNominee) return;
    setIsSubmittingNominee(true);
    setNomineeError(null);
    try {
      if (!nomineeForm.first_name.trim()) throw new Error('First name is required.');
      await api.updateNominee(String(selectedNominee.n_id), {
        first_name: nomineeForm.first_name.trim(),
        last_name: nomineeForm.last_name.trim() || undefined,
        relationship: nomineeForm.relationship,
        dob: nomineeForm.dob || undefined,
        contact_phone: nomineeForm.contact_phone.trim() || undefined,
      });
      const nRes = await api.listNominees({ acc_id: selectedAccount.acc_id });
      setAccountNominees(nRes.data || []);
      setIsEditNomineeModal(false);
      setStatusMessage({ type: 'success', text: `Nominee ${nomineeForm.first_name} updated successfully.` });
    } catch (err: any) {
      setNomineeError(err.message || 'Failed to update nominee.');
    } finally {
      setIsSubmittingNominee(false);
    }
  };

  const handleDeleteNominee = async (nId: string) => {
    if (!selectedAccount) return;
    if (!confirm('Are you sure you want to remove this nominee designation?')) return;
    try {
      await api.deleteNominee(String(nId));
      const nRes = await api.listNominees({ acc_id: selectedAccount.acc_id });
      setAccountNominees(nRes.data || []);
      setStatusMessage({ type: 'success', text: 'Nominee designation removed.' });
    } catch (err: any) {
      alert(err.message || 'Failed to delete nominee.');
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete<any>(`/accounts/${selectedAccount.acc_id}`);
      setIsDeleteModal(false);
      setStatusMessage({ type: 'success', text: `Account ACC-${selectedAccount.acc_id} deleted successfully.` });
      fetchAccounts();
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion rejected. Account must have zero balance and zero transaction history.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getBranchName = (bId?: string) => {
    const b = branches.find((branch) => String(branch.b_id) === String(bId));
    return b ? `${b.branch_name} (${b.city})` : `Branch #${bId || '—'}`;
  };

  const getCustomerName = (cid?: string) => {
    const c = customers.find((cust) => String(cust.cid) === String(cid));
    return c ? `${c.first_name} ${c.last_name || ''} (CUST-${c.cid})` : `Customer #${cid || '—'}`;
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
            <Wallet className="w-5 h-5 text-emerald-400" />
            Accounts & Joint Ownership
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Deposit portfolios, status lifecycles, and M:N joint account holdings in CockroachDB
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAccounts}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateError(null);
              setIsOpenAccountModal(true);
            }}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Open Account
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-obsidian-750">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Input
              icon={<Search className="w-4 h-4 text-obsidian-400" />}
              placeholder="Search account type, status..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div>
            <Select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.b_id} value={b.b_id}>
                  {b.branch_name} ({b.city})
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
              <option value="">All Account Types</option>
              <option value="SAVINGS">SAVINGS</option>
              <option value="CURRENT">CURRENT</option>
              <option value="SALARY">SALARY</option>
              <option value="FIXED_DEPOSIT">FIXED_DEPOSIT</option>
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
              <option value="ACTIVE">ACTIVE</option>
              <option value="DORMANT">DORMANT</option>
              <option value="FROZEN">FROZEN</option>
              <option value="CLOSED">CLOSED</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Accounts Data Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CardTitle>Account Portfolio</CardTitle>
              <Badge variant="emerald" size="xs">
                {totalRecords} Total Accounts
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
              <TableHead>Account No.</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Branch Office</TableHead>
              <TableHead>Balance (INR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opened Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-obsidian-400 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>Loading account ledgers from CockroachDB...</span>
                  </div>
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <TableEmpty message="No banking accounts match the selected filters." colSpan={7} />
            ) : (
              accounts.map((acc) => (
                <TableRow key={acc.acc_id}>
                  <TableCell className="font-mono font-semibold text-cyan-400">
                    ACC-{acc.acc_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={acc.acc_type === 'SAVINGS' ? 'cyan' : acc.acc_type === 'CURRENT' ? 'violet' : 'amber'} size="xs">
                      {acc.acc_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-obsidian-200 text-xs">
                    {getBranchName(acc.b_id)}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-emerald-400 text-sm">
                    ₹{parseFloat(String(acc.balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={acc.status === 'ACTIVE' ? 'emerald' : acc.status === 'DORMANT' ? 'amber' : 'rose'}
                      size="xs"
                      dot
                    >
                      {acc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-obsidian-400 font-mono">
                    {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDetails(acc)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-cyan-400 hover:bg-obsidian-800 transition-colors"
                        title="View Holders & Nominees"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditAccount(acc)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                        title="Edit Account Details & Branch Transfer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setDeleteError(null);
                          setIsDeleteModal(true);
                        }}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                        title="Close / Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
              Showing {accounts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} accounts
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
      {/* MODAL 1: VIEW DETAILS & JOINT ACCOUNT HOLDERS (M:N RELATION) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsModal}
        onClose={() => setIsDetailsModal(false)}
        title={`Account Structure: ACC-${selectedAccount?.acc_id}`}
        description="M:N Joint Ownership relation (account_holder) & Nominee succession designations"
        size="lg"
      >
        {selectedAccount && (
          <div className="space-y-6">
            {/* Account Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-obsidian-950 border border-obsidian-800">
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Balance</span>
                <p className="text-base font-mono font-bold text-emerald-400">
                  ₹{parseFloat(String(selectedAccount.balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Account Type</span>
                <p className="text-xs font-semibold text-white">{selectedAccount.acc_type}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Branch</span>
                <p className="text-xs text-obsidian-200">{getBranchName(selectedAccount.b_id)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Status</span>
                <div>
                  <Badge variant={selectedAccount.status === 'ACTIVE' ? 'emerald' : 'amber'} size="xs" dot>
                    {selectedAccount.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Account Holders (M:N account_holder) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Account Holders (account_holder M:N)
                </h4>
                <span className="text-[11px] text-obsidian-400 font-mono">
                  {accountHolders.length} Registered Holders
                </span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-3">
                <div className="space-y-2">
                  {accountHolders.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-300 font-semibold">CUST-{h.cid}</span>
                        <span className="text-white font-medium">{getCustomerName(h.cid)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={h.is_primary ? 'emerald' : 'violet'} size="xs">
                          {h.ownership_role}
                        </Badge>
                        <span className="text-obsidian-400 font-mono text-[11px]">
                          {h.share_percentage}% Share
                        </span>
                        <button
                          onClick={() => openEditHolder(h)}
                          className="p-1 rounded text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                          title="Edit Ownership Role & Share"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!h.is_primary && (
                          <button
                            onClick={() => handleDeleteHolder(h.cid)}
                            className="p-1 rounded text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Remove Joint Holder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline Add Joint Holder */}
                <div className="pt-3 border-t border-obsidian-800/80 space-y-2">
                  <span className="text-[11px] font-semibold text-obsidian-300">
                    Add Joint Holder to Account (Demonstrates M:N Relationship):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Select
                      value={newHolderCid}
                      onChange={(e) => setNewHolderCid(e.target.value)}
                      className="text-xs py-1"
                    >
                      {customers.map((c) => (
                        <option key={c.cid} value={c.cid}>
                          {c.first_name} {c.last_name || ''} (CUST-{c.cid})
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={newHolderRole}
                      onChange={(e) => setNewHolderRole(e.target.value as any)}
                      className="text-xs py-1"
                    >
                      <option value="JOINT">JOINT</option>
                      <option value="SECONDARY">SECONDARY</option>
                      <option value="GUARDIAN">GUARDIAN</option>
                    </Select>
                    <Input
                      placeholder="Share % (e.g. 50)"
                      value={newHolderShare}
                      onChange={(e) => setNewHolderShare(e.target.value)}
                      className="text-xs py-1"
                    />
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={handleAddJointHolder}
                      disabled={isAddingHolder || !newHolderCid}
                    >
                      {isAddingHolder ? 'Attaching...' : 'Add Holder'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nominees */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Nominee Designations (nominee 1:N)
                </h4>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={openAddNominee}
                  icon={<PlusCircle className="w-3.5 h-3.5" />}
                >
                  Add Nominee
                </Button>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                {accountNominees.length === 0 ? (
                  <p className="text-xs text-obsidian-500 italic">No nominee currently assigned to this account.</p>
                ) : (
                  <div className="space-y-1.5">
                    {accountNominees.map((n, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-obsidian-800/60 last:border-0">
                        <div>
                          <span className="text-white font-medium">{n.first_name} {n.last_name || ''}</span>
                          <span className="text-obsidian-400 text-[11px] ml-2">({n.relationship})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-obsidian-400 font-mono text-[11px]">{n.contact_phone || '—'}</span>
                          <button
                            onClick={() => openEditNominee(n)}
                            className="p-1 rounded text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                            title="Edit Nominee Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNominee(n.n_id)}
                            className="p-1 rounded text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Remove Nominee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: OPEN NEW ACCOUNT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOpenAccountModal}
        onClose={() => setIsOpenAccountModal(false)}
        title="Open New Banking Account"
        description="Creates a deposit account and links primary ownership in CockroachDB"
        size="md"
      >
        <form onSubmit={handleOpenAccount} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          <Select
            label="Home Branch *"
            value={createForm.b_id}
            onChange={(e) => setCreateForm({ ...createForm, b_id: e.target.value })}
            required
          >
            {branches.map((b) => (
              <option key={b.b_id} value={b.b_id}>
                {b.branch_name} ({b.city}) — IFSC: {b.ifsc}
              </option>
            ))}
          </Select>

          <Select
            label="Primary Customer Holder *"
            value={createForm.cid}
            onChange={(e) => setCreateForm({ ...createForm, cid: e.target.value })}
            required
          >
            {customers.map((c) => (
              <option key={c.cid} value={c.cid}>
                {c.first_name} {c.last_name || ''} (CUST-{c.cid}, PAN: {c.pan})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Account Type *"
              value={createForm.acc_type}
              onChange={(e) => setCreateForm({ ...createForm, acc_type: e.target.value })}
            >
              <option value="SAVINGS">SAVINGS</option>
              <option value="CURRENT">CURRENT</option>
              <option value="SALARY">SALARY</option>
              <option value="FIXED_DEPOSIT">FIXED_DEPOSIT</option>
            </Select>

            <Input
              label="Initial Deposit Balance (INR) *"
              type="number"
              step="0.01"
              min="0"
              value={createForm.balance}
              onChange={(e) => setCreateForm({ ...createForm, balance: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsOpenAccountModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingCreate}>
              Open Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT ACCOUNT (TYPE, BRANCH TRANSFER, STATUS) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditAccountModal}
        onClose={() => setIsEditAccountModal(false)}
        title={`Edit Account: ACC-${selectedAccount?.acc_id}`}
        description="Update account type, transfer home branch, or lifecycle status"
        size="md"
      >
        <form onSubmit={handleUpdateAccount} className="space-y-4">
          {editAccountError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editAccountError}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs flex justify-between items-center">
            <span className="text-obsidian-400 font-mono">Current Ledger Balance:</span>
            <span className="font-mono font-bold text-emerald-400">
              ₹{selectedAccount ? parseFloat(String(selectedAccount.balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
          <p className="text-[11px] text-obsidian-500 italic">
            Note: Account balance is ledger-driven and can only be altered through transactional deposits, withdrawals, or transfers.
          </p>

          <Select
            label="Account Classification *"
            value={editAccountForm.acc_type}
            onChange={(e) => setEditAccountForm({ ...editAccountForm, acc_type: e.target.value as any })}
            required
          >
            <option value="SAVINGS">SAVINGS</option>
            <option value="CURRENT">CURRENT</option>
            <option value="SALARY">SALARY</option>
            <option value="FIXED_DEPOSIT">FIXED_DEPOSIT</option>
          </Select>

          <Select
            label="Home Branch Office (Branch Transfer) *"
            value={editAccountForm.b_id}
            onChange={(e) => setEditAccountForm({ ...editAccountForm, b_id: e.target.value })}
            required
          >
            {branches.map((b) => (
              <option key={b.b_id} value={b.b_id}>
                {b.branch_name} ({b.city}) — IFSC: {b.ifsc}
              </option>
            ))}
          </Select>

          <Select
            label="Operational Status *"
            value={editAccountForm.status}
            onChange={(e) => setEditAccountForm({ ...editAccountForm, status: e.target.value as any })}
            required
          >
            <option value="ACTIVE">ACTIVE (Normal Operations)</option>
            <option value="DORMANT">DORMANT (Inactivity Flag)</option>
            <option value="FROZEN">FROZEN (Security Hold)</option>
            <option value="CLOSED">CLOSED (Terminated)</option>
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditAccountModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditAccount}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT JOINT HOLDER DESIGNATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditHolderModal}
        onClose={() => setIsEditHolderModal(false)}
        title={`Edit Holder: CUST-${selectedHolder?.cid}`}
        description={`Update ownership role and share percentage on ACC-${selectedAccount?.acc_id}`}
        size="sm"
      >
        <form onSubmit={handleUpdateHolder} className="space-y-4">
          {editHolderError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editHolderError}</span>
            </div>
          )}

          <Select
            label="Ownership Role Designation"
            value={editHolderForm.ownership_role}
            onChange={(e) => setEditHolderForm({ ...editHolderForm, ownership_role: e.target.value as any })}
          >
            <option value="PRIMARY">PRIMARY</option>
            <option value="JOINT">JOINT</option>
            <option value="SECONDARY">SECONDARY</option>
            <option value="GUARDIAN">GUARDIAN</option>
          </Select>

          <Input
            label="Ownership Share (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={editHolderForm.share_percentage}
            onChange={(e) => setEditHolderForm({ ...editHolderForm, share_percentage: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditHolderModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditHolder}>
              Save Holder
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: ADD NOMINEE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddNomineeModal}
        onClose={() => setIsAddNomineeModal(false)}
        title="Designate Account Nominee"
        description={`Register succession nominee for ACC-${selectedAccount?.acc_id}`}
        size="md"
      >
        <form onSubmit={handleAddNominee} className="space-y-4">
          {nomineeError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{nomineeError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              value={nomineeForm.first_name}
              onChange={(e) => setNomineeForm({ ...nomineeForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={nomineeForm.last_name}
              onChange={(e) => setNomineeForm({ ...nomineeForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Relationship *"
              value={nomineeForm.relationship}
              onChange={(e) => setNomineeForm({ ...nomineeForm, relationship: e.target.value })}
            >
              <option value="SPOUSE">SPOUSE</option>
              <option value="SON">SON</option>
              <option value="DAUGHTER">DAUGHTER</option>
              <option value="FATHER">FATHER</option>
              <option value="MOTHER">MOTHER</option>
              <option value="BROTHER">BROTHER</option>
              <option value="SISTER">SISTER</option>
              <option value="OTHER">OTHER</option>
            </Select>
            <Input
              label="Date of Birth"
              type="date"
              value={nomineeForm.dob}
              onChange={(e) => setNomineeForm({ ...nomineeForm, dob: e.target.value })}
            />
          </div>

          <Input
            label="Contact Phone"
            placeholder="+91 98765 43210"
            value={nomineeForm.contact_phone}
            onChange={(e) => setNomineeForm({ ...nomineeForm, contact_phone: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddNomineeModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingNominee}>
              Designate Nominee
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: EDIT NOMINEE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditNomineeModal}
        onClose={() => setIsEditNomineeModal(false)}
        title={`Edit Nominee: ${selectedNominee?.first_name}`}
        description="Update succession contact information"
        size="md"
      >
        <form onSubmit={handleUpdateNominee} className="space-y-4">
          {nomineeError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{nomineeError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              value={nomineeForm.first_name}
              onChange={(e) => setNomineeForm({ ...nomineeForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={nomineeForm.last_name}
              onChange={(e) => setNomineeForm({ ...nomineeForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Relationship *"
              value={nomineeForm.relationship}
              onChange={(e) => setNomineeForm({ ...nomineeForm, relationship: e.target.value })}
            >
              <option value="SPOUSE">SPOUSE</option>
              <option value="SON">SON</option>
              <option value="DAUGHTER">DAUGHTER</option>
              <option value="FATHER">FATHER</option>
              <option value="MOTHER">MOTHER</option>
              <option value="BROTHER">BROTHER</option>
              <option value="SISTER">SISTER</option>
              <option value="OTHER">OTHER</option>
            </Select>
            <Input
              label="Date of Birth"
              type="date"
              value={nomineeForm.dob}
              onChange={(e) => setNomineeForm({ ...nomineeForm, dob: e.target.value })}
            />
          </div>

          <Input
            label="Contact Phone"
            placeholder="+91 98765 43210"
            value={nomineeForm.contact_phone}
            onChange={(e) => setNomineeForm({ ...nomineeForm, contact_phone: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditNomineeModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingNominee}>
              Save Nominee
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION & LIFECYCLE MANAGEMENT (CLOSE / DELETE) */}
      {/* ========================================================================= */}
      {selectedAccount && (
        <DeleteConfirmModal
          isOpen={isDeleteModal}
          onClose={() => setIsDeleteModal(false)}
          entityType="account"
          entityId={String(selectedAccount.acc_id)}
          entityTitle={`Account ACC-${selectedAccount.acc_id} (${selectedAccount.acc_type})`}
          onSuccess={(msg) => {
            setStatusMessage({ type: 'success', text: msg });
            fetchAccounts();
          }}
        />
      )}
    </div>
  );
};
