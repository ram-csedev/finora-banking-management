import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  PlusCircle,
  Search,
  MapPin,
  Users,
  Wallet,
  Phone,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { api } from '../api/client';
import { Branch, Employee, Account } from '../types';

export const BranchesPage: React.FC = () => {
  // State: Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [isEditModal, setIsEditModal] = useState(false);
  const [isDetailsModal, setIsDetailsModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);

  // Selected Branch & Sub-resources
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchEmployees, setBranchEmployees] = useState<Employee[]>([]);
  const [branchAccounts, setBranchAccounts] = useState<Account[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form State: Create
  const [createForm, setCreateForm] = useState({
    branch_name: '',
    city: '',
    state: '',
    pincode: '',
    ifsc: '',
    contact: '',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State: Edit
  const [editForm, setEditForm] = useState({
    branch_name: '',
    city: '',
    state: '',
    pincode: '',
    contact: '',
    status: 'ACTIVE' as Branch['status'],
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Branches
  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.listBranches(params);
      setBranches(res.data || []);
      setTotalRecords(Number(res.pagination?.totalRecords) || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch branch network.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // View Branch Details (Staff & Accounts anchored to branch)
  const openDetails = async (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDetailsModal(true);
    setIsLoadingDetails(true);
    try {
      const [empRes, accRes] = await Promise.all([
        api.listEmployees({ b_id: branch.b_id, limit: 50 }).catch(() => ({ data: [] })),
        api.listAccounts({ b_id: branch.b_id, limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setBranchEmployees(empRes.data || []);
      setBranchAccounts(accRes.data || []);
    } catch (err) {
      // non-blocking
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Edit Modal
  const openEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditForm({
      branch_name: branch.branch_name || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
      contact: branch.contact || '',
      status: branch.status || 'ACTIVE',
    });
    setEditError(null);
    setIsEditModal(true);
  };

  // Submit Create Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      if (!createForm.branch_name.trim()) throw new Error('Branch name is required.');
      if (!createForm.ifsc.trim()) throw new Error('Unique IFSC identifier is required.');

      const newBranch = await api.createBranch({
        branch_name: createForm.branch_name.trim(),
        city: createForm.city.trim() || undefined,
        state: createForm.state.trim() || undefined,
        pincode: createForm.pincode.trim() || undefined,
        ifsc: createForm.ifsc.trim().toUpperCase(),
        contact: createForm.contact.trim() || undefined,
      });

      setIsCreateModal(false);
      setCreateForm({
        branch_name: '',
        city: '',
        state: '',
        pincode: '',
        ifsc: '',
        contact: '',
      });
      setStatusMessage({ type: 'success', text: `Branch '${newBranch.data?.branch_name}' registered successfully.` });
      fetchBranches();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create branch.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Submit Edit Branch
  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await api.updateBranch(selectedBranch.b_id, {
        branch_name: editForm.branch_name.trim(),
        city: editForm.city.trim() || undefined,
        state: editForm.state.trim() || undefined,
        pincode: editForm.pincode.trim() || undefined,
        contact: editForm.contact.trim() || undefined,
        status: editForm.status,
      });

      setIsEditModal(false);
      setStatusMessage({ type: 'success', text: `Branch #${selectedBranch.b_id} details updated.` });
      fetchBranches();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update branch.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Branch (Safeguarded by foreign keys)
  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/branches/${selectedBranch.b_id}`);
      setIsDeleteModal(false);
      setStatusMessage({ type: 'success', text: `Branch #${selectedBranch.b_id} deleted successfully.` });
      fetchBranches();
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion failed. Branch could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
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
            <Building2 className="w-5 h-5 text-violet-400" />
            Branch Office Network
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Physical banking centers, IFSC clearing codes, and regional staff anchors in CockroachDB
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchBranches}
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
              setIsCreateModal(true);
            }}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Add Branch
          </Button>
        </div>
      </div>

      {/* Search Filter */}
      <Card className="p-4 border-obsidian-750">
        <Input
          icon={<Search className="w-4 h-4 text-obsidian-400" />}
          placeholder="Search by branch name, ID, city, state, or IFSC..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Branch Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CardTitle>Regional Banking Centers</CardTitle>
              <Badge variant="violet" size="xs">
                {totalRecords} Total Branches
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
              <TableHead>Branch ID</TableHead>
              <TableHead>Branch Name</TableHead>
              <TableHead>Location (City / State)</TableHead>
              <TableHead>IFSC Clearing Code</TableHead>
              <TableHead>Phone Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-obsidian-400 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
                    <span>Loading branch registry from CockroachDB...</span>
                  </div>
                </td>
              </tr>
            ) : branches.length === 0 ? (
              <TableEmpty message="No branch offices match the search criteria." colSpan={7} />
            ) : (
              branches.map((b) => (
                <TableRow key={b.b_id}>
                  <TableCell className="font-mono text-cyan-400 font-semibold">
                    BR-{b.b_id}
                  </TableCell>
                  <TableCell className="text-white font-medium text-xs">
                    {b.branch_name}
                  </TableCell>
                  <TableCell className="text-obsidian-200 text-xs">
                    {b.city}, {b.state} ({b.pincode})
                  </TableCell>
                  <TableCell className="font-mono font-semibold text-emerald-400 text-xs">
                    {b.ifsc}
                  </TableCell>
                  <TableCell className="font-mono text-obsidian-300 text-xs">
                    {b.contact || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={b.status === 'ACTIVE' || !b.status ? 'emerald' : 'slate'}
                      size="xs"
                      dot
                    >
                      {b.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDetails(b)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-cyan-400 hover:bg-obsidian-800 transition-colors"
                        title="View Branch Staff & Accounts"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                        title="Edit Branch Information"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBranch(b);
                          setDeleteError(null);
                          setIsDeleteModal(true);
                        }}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                        title="Delete Branch"
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
              Showing {branches.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} branches
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
      {/* MODAL 1: VIEW DETAILS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsModal}
        onClose={() => setIsDetailsModal(false)}
        title={`Branch Network: BR-${selectedBranch?.b_id}`}
        description="Assigned personnel and deposit account anchors in CockroachDB"
        size="lg"
      >
        {selectedBranch && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Branch Name</span>
                <p className="text-sm font-semibold text-white">{selectedBranch.branch_name}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">IFSC Code</span>
                <p className="text-sm font-mono font-semibold text-emerald-400">{selectedBranch.ifsc}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Direct Contact</span>
                <p className="text-sm font-mono text-obsidian-200">{selectedBranch.contact || '—'}</p>
              </div>
            </div>

            {/* Staff Members Anchored to Branch */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Assigned Branch Staff (employee 1:N)
              </h4>
              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                {isLoadingDetails ? (
                  <p className="text-xs text-obsidian-400">Loading staff...</p>
                ) : branchEmployees.length === 0 ? (
                  <p className="text-xs text-obsidian-500 italic">No employees assigned to this branch.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {branchEmployees.map((e) => (
                      <div key={e.emp_id} className="p-2.5 rounded bg-obsidian-900 border border-obsidian-800 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{e.first_name} {e.last_name || ''}</p>
                          <p className="text-[11px] text-obsidian-400">{e.email || '—'}</p>
                        </div>
                        <Badge variant="cyan" size="xs">EMP-{e.emp_id}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Accounts Anchored to Branch */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Anchored Deposit Accounts ({branchAccounts.length})
              </h4>
              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                {branchAccounts.length === 0 ? (
                  <p className="text-xs text-obsidian-500 italic">No accounts currently open under this branch.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {branchAccounts.map((a) => (
                      <div key={a.acc_id} className="flex items-center justify-between text-xs py-1 border-b border-obsidian-800/60 last:border-0 font-mono">
                        <span className="text-white">ACC-{a.acc_id} ({a.acc_type})</span>
                        <span className="text-emerald-400 font-semibold">₹{parseFloat(String(a.balance)).toLocaleString()}</span>
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
      {/* MODAL 2: ADD BRANCH */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModal}
        onClose={() => setIsCreateModal(false)}
        title="Register New Banking Branch"
        description="Creates a physical branch office record with unique IFSC clearing code"
        size="md"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Branch Name *"
            placeholder="e.g. Koramangala Tech Branch"
            value={createForm.branch_name}
            onChange={(e) => setCreateForm({ ...createForm, branch_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unique IFSC Code *"
              placeholder="e.g. SBIN0000108"
              value={createForm.ifsc}
              onChange={(e) => setCreateForm({ ...createForm, ifsc: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Phone Contact (max 15 chars)"
              placeholder="e.g. 08025531007"
              value={createForm.contact}
              onChange={(e) => setCreateForm({ ...createForm, contact: e.target.value })}
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              placeholder="City"
              value={createForm.city}
              onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
            />
            <Input
              label="State"
              placeholder="State"
              value={createForm.state}
              onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
            />
            <Input
              label="Pincode"
              placeholder="Pincode"
              value={createForm.pincode}
              onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingCreate}>
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT BRANCH */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModal}
        onClose={() => setIsEditModal(false)}
        title={`Edit Branch: BR-${selectedBranch?.b_id}`}
        description="Update branch name and physical contact details"
        size="md"
      >
        <form onSubmit={handleEditBranch} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Branch Name *"
            value={editForm.branch_name}
            onChange={(e) => setEditForm({ ...editForm, branch_name: e.target.value })}
            required
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
            />
            <Input
              label="State"
              value={editForm.state}
              onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
            />
            <Input
              label="Pincode"
              value={editForm.pincode}
              onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Contact (max 15 chars)"
              value={editForm.contact}
              onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
              maxLength={15}
            />
            <Select
              label="Branch Status"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="CLOSED">CLOSED</option>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION & LIFECYCLE MANAGEMENT */}
      {/* ========================================================================= */}
      {selectedBranch && (
        <DeleteConfirmModal
          isOpen={isDeleteModal}
          onClose={() => setIsDeleteModal(false)}
          entityType="branch"
          entityId={String(selectedBranch.b_id)}
          entityTitle={`Branch BR-${selectedBranch.b_id} (${selectedBranch.branch_name})`}
          onSuccess={(msg) => {
            setStatusMessage({ type: 'success', text: msg });
            fetchBranches();
          }}
        />
      )}
    </div>
  );
};
