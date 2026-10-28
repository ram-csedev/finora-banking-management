import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  PlusCircle,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Shield,
  Briefcase,
  Building,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { api } from '../api/client';
import { Employee, ResponsibleFor, Branch } from '../types';

export const EmployeesPage: React.FC = () => {
  // Tab state: 'employees' | 'duties'
  const [activeTab, setActiveTab] = useState<'employees' | 'duties'>('employees');

  // State: Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [empPages, setEmpPages] = useState(1);
  const [currentEmpPage, setCurrentEmpPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState(25);
  const [empSearch, setEmpSearch] = useState('');
  const [empBranchFilter, setEmpBranchFilter] = useState('');

  // State: Responsible For
  const [duties, setDuties] = useState<ResponsibleFor[]>([]);
  const [totalDuties, setTotalDuties] = useState(0);
  const [dutyPages, setDutyPages] = useState(1);
  const [currentDutyPage, setCurrentDutyPage] = useState(1);
  const [dutyPageSize, setDutyPageSize] = useState(25);
  const [dutySearch, setDutySearch] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isCreateEmpModal, setIsCreateEmpModal] = useState(false);
  const [isEditEmpModal, setIsEditEmpModal] = useState(false);
  const [isAssignDutyModal, setIsAssignDutyModal] = useState(false);
  const [isDeleteModal, setIsDeleteModal] = useState(false);

  // Selected Employee
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  // Form State: Create Employee
  const [createEmpForm, setCreateEmpForm] = useState({
    first_name: '',
    last_name: '',
    salary: '75000',
    hire_date: new Date().toISOString().split('T')[0],
    b_id: '',
    email: '',
  });
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  // Form State: Edit Employee
  const [editEmpForm, setEditEmpForm] = useState({
    first_name: '',
    last_name: '',
    salary: '',
    b_id: '',
    email: '',
    status: 'ACTIVE',
    hire_date: '',
  });
  const [isSubmittingEditEmp, setIsSubmittingEditEmp] = useState(false);
  const [editEmpError, setEditEmpError] = useState<string | null>(null);

  // Form State: Assign Duty (responsible_for)
  const [dutyForm, setDutyForm] = useState({
    emp_id: '',
    b_id: '',
    role_type: 'OPERATIONAL_SUPERVISOR',
    status: 'ACTIVE',
    notes: 'Standard branch operational shift',
  });
  const [isSubmittingDuty, setIsSubmittingDuty] = useState(false);
  const [dutyError, setDutyError] = useState<string | null>(null);

  // Duty Edit & Delete State
  const [selectedDuty, setSelectedDuty] = useState<ResponsibleFor | null>(null);
  const [isEditDutyModal, setIsEditDutyModal] = useState(false);
  const [isDeleteDutyModal, setIsDeleteDutyModal] = useState(false);
  const [editDutyForm, setEditDutyForm] = useState({
    emp_id: '',
    b_id: '',
    role_type: 'OPERATIONAL_SUPERVISOR',
    status: 'ACTIVE',
    notes: '',
  });
  const [isSubmittingEditDuty, setIsSubmittingEditDuty] = useState(false);
  const [editDutyError, setEditDutyError] = useState<string | null>(null);
  const [isDeletingDuty, setIsDeletingDuty] = useState(false);
  const [deleteDutyError, setDeleteDutyError] = useState<string | null>(null);

  // Deletion State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const bRes = await api.listBranches({ limit: 50 });
        setBranches(bRes.data || []);
        if (bRes.data?.length > 0) {
          setCreateEmpForm((p) => ({ ...p, b_id: String(bRes.data[0].b_id) }));
          setDutyForm((p) => ({ ...p, b_id: String(bRes.data[0].b_id) }));
        }
      } catch (err) {
        // non-blocking
      }
    }
    loadBranches();
  }, []);

  // Fetch Employees
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentEmpPage,
        limit: empPageSize,
      };
      if (empSearch.trim()) params.search = empSearch.trim();
      if (empBranchFilter && empBranchFilter !== 'all') params.b_id = empBranchFilter;

      const res = await api.listEmployees(params);
      setEmployees(res.data || []);
      setTotalEmployees(Number(res.pagination?.totalRecords) || 0);
      setEmpPages(res.pagination?.totalPages || 1);
      if (res.data?.length > 0 && !dutyForm.emp_id) {
        setDutyForm((p) => ({ ...p, emp_id: String(res.data[0].emp_id) }));
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch staff directory.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentEmpPage, empPageSize, empSearch, empBranchFilter, dutyForm.emp_id]);

  // Fetch Duties (responsible_for)
  const fetchDuties = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.listResponsibleFor({
        page: currentDutyPage,
        limit: dutyPageSize,
        search: dutySearch.trim() || undefined,
      });
      setDuties(res.data || []);
      setTotalDuties(Number(res.pagination?.totalRecords) || 0);
      setDutyPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch operational duty ledger.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentDutyPage, dutyPageSize, dutySearch]);

  useEffect(() => {
    if (activeTab === 'employees') fetchEmployees();
    else fetchDuties();
  }, [activeTab, fetchEmployees, fetchDuties]);

  // Open Edit Employee
  const openEdit = (emp: Employee) => {
    setSelectedEmp(emp);
    setEditEmpForm({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      salary: String(emp.salary || ''),
      b_id: String(emp.b_id || ''),
      email: emp.email || '',
      status: emp.status || 'ACTIVE',
      hire_date: emp.hire_date ? emp.hire_date.split('T')[0] : '',
    });
    setEditEmpError(null);
    setIsEditEmpModal(true);
  };

  // Submit Create Employee
  const handleCreateEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmp(true);
    setEmpError(null);
    try {
      if (!createEmpForm.first_name.trim()) throw new Error('First name is required.');
      if (!createEmpForm.b_id) throw new Error('Assigned branch is required.');

      const sal = parseFloat(createEmpForm.salary);
      if (isNaN(sal) || sal < 0) throw new Error('Salary must be zero or positive.');

      const newEmp = await api.createEmployee({
        first_name: createEmpForm.first_name.trim(),
        last_name: createEmpForm.last_name.trim() || undefined,
        salary: sal,
        hire_date: createEmpForm.hire_date,
        b_id: createEmpForm.b_id,
        email: createEmpForm.email.trim() || undefined,
      });

      setIsCreateEmpModal(false);
      setStatusMessage({ type: 'success', text: `Staff member EMP-${newEmp.data?.emp_id || 'CREATED'} registered.` });
      fetchEmployees();
    } catch (err: any) {
      setEmpError(err.message || 'Failed to create employee record.');
    } finally {
      setIsSubmittingEmp(false);
    }
  };

  // Submit Edit Employee
  const handleEditEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setIsSubmittingEditEmp(true);
    setEditEmpError(null);
    try {
      await api.updateEmployee(String(selectedEmp.emp_id), {
        first_name: editEmpForm.first_name.trim(),
        last_name: editEmpForm.last_name.trim() || undefined,
        salary: parseFloat(editEmpForm.salary) || undefined,
        b_id: editEmpForm.b_id || undefined,
        email: editEmpForm.email.trim() || undefined,
        status: editEmpForm.status as any,
        hire_date: editEmpForm.hire_date || undefined,
      });

      setIsEditEmpModal(false);
      setStatusMessage({ type: 'success', text: `Employee EMP-${selectedEmp.emp_id} updated successfully.` });
      fetchEmployees();
    } catch (err: any) {
      setEditEmpError(err.message || 'Failed to update employee.');
    } finally {
      setIsSubmittingEditEmp(false);
    }
  };

  // Open Edit Duty
  const openEditDuty = (duty: ResponsibleFor) => {
    setSelectedDuty(duty);
    setEditDutyForm({
      emp_id: String(duty.emp_id),
      b_id: String(duty.b_id),
      role_type: duty.role_type,
      status: duty.status,
      notes: duty.notes || '',
    });
    setEditDutyError(null);
    setIsEditDutyModal(true);
  };

  // Submit Edit Duty
  const handleEditDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDuty) return;
    setIsSubmittingEditDuty(true);
    setEditDutyError(null);
    try {
      await api.updateResponsibleFor(String(selectedDuty.rf_id), {
        emp_id: editDutyForm.emp_id,
        b_id: editDutyForm.b_id,
        role_type: editDutyForm.role_type,
        status: editDutyForm.status as any,
        notes: editDutyForm.notes.trim() || undefined,
      });

      setIsEditDutyModal(false);
      setStatusMessage({ type: 'success', text: `Duty assignment DUTY-${selectedDuty.rf_id} updated successfully.` });
      fetchDuties();
    } catch (err: any) {
      setEditDutyError(err.message || 'Failed to update duty assignment.');
    } finally {
      setIsSubmittingEditDuty(false);
    }
  };

  // Delete Duty
  const handleDeleteDuty = async () => {
    if (!selectedDuty) return;
    setIsDeletingDuty(true);
    setDeleteDutyError(null);
    try {
      await api.deleteResponsibleFor(String(selectedDuty.rf_id));
      setIsDeleteDutyModal(false);
      setStatusMessage({ type: 'success', text: `Duty assignment DUTY-${selectedDuty.rf_id} deleted.` });
      fetchDuties();
    } catch (err: any) {
      setDeleteDutyError(err.message || 'Failed to delete duty assignment.');
    } finally {
      setIsDeletingDuty(false);
    }
  };

  // Submit Assign Duty (responsible_for)
  const handleAssignDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDuty(true);
    setDutyError(null);
    try {
      if (!dutyForm.emp_id) throw new Error('Please select an employee.');
      if (!dutyForm.b_id) throw new Error('Please select a branch.');

      await api.createResponsibleFor({
        emp_id: dutyForm.emp_id,
        b_id: dutyForm.b_id,
        role_type: dutyForm.role_type,
        status: dutyForm.status as any,
        notes: dutyForm.notes.trim() || undefined,
        assigned_date: new Date().toISOString().split('T')[0],
      });

      setIsAssignDutyModal(false);
      setStatusMessage({ type: 'success', text: 'Operational duty assignment recorded in table responsible_for.' });
      if (activeTab === 'duties') fetchDuties();
    } catch (err: any) {
      setDutyError(err.message || 'Failed to assign duty.');
    } finally {
      setIsSubmittingDuty(false);
    }
  };

  // Delete Employee (Safeguarded by foreign keys)
  const handleDeleteEmp = async () => {
    if (!selectedEmp) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/employees/${selectedEmp.emp_id}`);
      setIsDeleteModal(false);
      setStatusMessage({ type: 'success', text: `Employee EMP-${selectedEmp.emp_id} deleted.` });
      fetchEmployees();
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion rejected. Staff member is assigned to customers, loans, or active duties.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getBranchName = (bId?: string) => {
    const b = branches.find((branch) => String(branch.b_id) === String(bId));
    return b ? `${b.branch_name} (${b.city})` : `Branch #${bId || '—'}`;
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
            <UserCheck className="w-5 h-5 text-cyan-400" />
            Staff & Operational Responsibilities
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Banking personnel hierarchy and the redesigned RESPONSIBLE_FOR operational assignment ledger
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={activeTab === 'employees' ? fetchEmployees : fetchDuties}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          {activeTab === 'employees' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEmpError(null);
                setIsCreateEmpModal(true);
              }}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Add Staff Member
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setDutyError(null);
                setIsAssignDutyModal(true);
              }}
              icon={<ClipboardList className="w-4 h-4" />}
            >
              Assign Duty
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-obsidian-800 pb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'employees'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Staff Directory ({totalEmployees})</span>
        </button>
        <button
          onClick={() => setActiveTab('duties')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'duties'
              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
              : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Operational Duty Ledger: responsible_for ({totalDuties})</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <Card className="p-4 border-obsidian-750">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                icon={<Search className="w-4 h-4 text-obsidian-400" />}
                placeholder="Search staff by name, ID, email, or branch..."
                value={empSearch}
                onChange={(e) => {
                  setEmpSearch(e.target.value);
                  setCurrentEmpPage(1);
                }}
              />
              <Select
                value={empBranchFilter}
                onChange={(e) => {
                  setEmpBranchFilter(e.target.value);
                  setCurrentEmpPage(1);
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
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <CardTitle>Staff Members</CardTitle>
                  <Badge variant="cyan" size="xs">
                    {totalEmployees} Active Staff
                  </Badge>
                </div>
                <div className="text-xs text-obsidian-400 font-mono">
                  Page {currentEmpPage} of {empPages || 1}
                </div>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Assigned Branch</TableHead>
                  <TableHead>Compensation (INR)</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-obsidian-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                        <span>Loading staff directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <TableEmpty message="No employees found." colSpan={8} />
                ) : (
                  employees.map((e) => (
                    <TableRow key={e.emp_id}>
                      <TableCell className="font-mono text-cyan-400 font-semibold">
                        EMP-{e.emp_id}
                      </TableCell>
                      <TableCell className="text-white font-medium text-xs">
                        {e.first_name} {e.last_name || ''}
                      </TableCell>
                      <TableCell className="text-obsidian-200 text-xs">
                        {getBranchName(e.b_id)}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-emerald-400 text-xs">
                        ₹{parseFloat(String(e.salary)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-obsidian-300 text-xs">
                        {e.email || '—'}
                      </TableCell>
                      <TableCell className="text-obsidian-400 text-xs font-mono">
                        {e.hire_date ? new Date(e.hire_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={e.status === 'ACTIVE' || !e.status ? 'emerald' : 'slate'}
                          size="xs"
                          dot
                        >
                          {e.status || 'ACTIVE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(e)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                            title="Edit Employee Information"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmp(e);
                              setDeleteError(null);
                              setIsDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Delete Employee"
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
                  value={empPageSize}
                  onChange={(e) => {
                    setEmpPageSize(Number(e.target.value));
                    setCurrentEmpPage(1);
                  }}
                  className="bg-obsidian-800 border border-obsidian-700 rounded px-2 py-1 text-obsidian-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {employees.length > 0 ? (currentEmpPage - 1) * empPageSize + 1 : 0} -{' '}
                  {Math.min(currentEmpPage * empPageSize, totalEmployees)} of {totalEmployees} records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentEmpPage((p) => Math.max(p - 1, 1))}
                  disabled={currentEmpPage <= 1 || isLoading}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-mono px-2 text-obsidian-200">
                  {currentEmpPage} / {empPages || 1}
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentEmpPage((p) => Math.min(p + 1, empPages))}
                  disabled={currentEmpPage >= empPages || isLoading}
                  iconRight={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: DUTY LEDGER (responsible_for) */}
      {activeTab === 'duties' && (
        <div className="space-y-4">
          <Card className="p-4 border-obsidian-750">
            <Input
              icon={<Search className="w-4 h-4 text-obsidian-400" />}
              placeholder="Search duties by role, staff name, branch, or notes..."
              value={dutySearch}
              onChange={(e) => {
                setDutySearch(e.target.value);
                setCurrentDutyPage(1);
              }}
            />
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <CardTitle>Operational Duty Assignments (CockroachDB responsible_for)</CardTitle>
                  <Badge variant="violet" size="xs">
                    {totalDuties} Active Assignments
                  </Badge>
                </div>
                <div className="text-xs text-obsidian-400 font-mono">
                  Page {currentDutyPage} of {dutyPages || 1}
                </div>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment ID</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Branch Office</TableHead>
                  <TableHead>Role Designation</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shift Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-obsidian-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
                        <span>Loading operational duties...</span>
                      </div>
                    </td>
                  </tr>
                ) : duties.length === 0 ? (
                  <TableEmpty message="No operational duty assignments recorded." colSpan={8} />
                ) : (
                  duties.map((d) => (
                    <TableRow key={d.rf_id}>
                      <TableCell className="font-mono text-cyan-400 font-semibold">
                        DUTY-{d.rf_id}
                      </TableCell>
                      <TableCell className="text-white text-xs font-semibold">
                        EMP-{d.emp_id}
                      </TableCell>
                      <TableCell className="text-obsidian-200 text-xs">
                        {getBranchName(d.b_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="violet" size="xs">{d.role_type}</Badge>
                      </TableCell>
                      <TableCell className="text-obsidian-300 text-xs font-mono">
                        {d.assigned_date ? new Date(d.assigned_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === 'ACTIVE' ? 'emerald' : d.status === 'COMPLETED' ? 'cyan' : 'rose'} size="xs" dot>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-obsidian-300 text-xs max-w-xs truncate">
                        {d.notes || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditDuty(d)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                            title="Edit Duty Assignment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDuty(d);
                              setDeleteDutyError(null);
                              setIsDeleteDutyModal(true);
                            }}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Delete Duty Assignment"
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
                  value={dutyPageSize}
                  onChange={(e) => {
                    setDutyPageSize(Number(e.target.value));
                    setCurrentDutyPage(1);
                  }}
                  className="bg-obsidian-800 border border-obsidian-700 rounded px-2 py-1 text-obsidian-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {duties.length > 0 ? (currentDutyPage - 1) * dutyPageSize + 1 : 0} -{' '}
                  {Math.min(currentDutyPage * dutyPageSize, totalDuties)} of {totalDuties} records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentDutyPage((p) => Math.max(p - 1, 1))}
                  disabled={currentDutyPage <= 1 || isLoading}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-mono px-2 text-obsidian-200">
                  {currentDutyPage} / {dutyPages || 1}
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentDutyPage((p) => Math.min(p + 1, dutyPages))}
                  disabled={currentDutyPage >= dutyPages || isLoading}
                  iconRight={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE EMPLOYEE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateEmpModal}
        onClose={() => setIsCreateEmpModal(false)}
        title="Register New Banking Staff Member"
        description="Creates an employee record linked to a branch office in CockroachDB"
        size="md"
      >
        <form onSubmit={handleCreateEmp} className="space-y-4">
          {empError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{empError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              value={createEmpForm.first_name}
              onChange={(e) => setCreateEmpForm({ ...createEmpForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={createEmpForm.last_name}
              onChange={(e) => setCreateEmpForm({ ...createEmpForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Compensation (INR) *"
              type="number"
              step="1000"
              min="0"
              value={createEmpForm.salary}
              onChange={(e) => setCreateEmpForm({ ...createEmpForm, salary: e.target.value })}
              required
            />
            <Input
              label="Hire Date"
              type="date"
              value={createEmpForm.hire_date}
              onChange={(e) => setCreateEmpForm({ ...createEmpForm, hire_date: e.target.value })}
            />
          </div>

          <Select
            label="Assigned Branch Office *"
            value={createEmpForm.b_id}
            onChange={(e) => setCreateEmpForm({ ...createEmpForm, b_id: e.target.value })}
            required
          >
            {branches.map((b) => (
              <option key={b.b_id} value={b.b_id}>
                {b.branch_name} ({b.city})
              </option>
            ))}
          </Select>

          <Input
            label="Corporate Email Address"
            type="email"
            placeholder="officer@finora.bank"
            value={createEmpForm.email}
            onChange={(e) => setCreateEmpForm({ ...createEmpForm, email: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateEmpModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEmp}>
              Register Staff
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EMPLOYEE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditEmpModal}
        onClose={() => setIsEditEmpModal(false)}
        title={`Edit Employee: EMP-${selectedEmp?.emp_id}`}
        description="Update staff profile, branch transfer, or salary tier"
        size="md"
      >
        <form onSubmit={handleEditEmp} className="space-y-4">
          {editEmpError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editEmpError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              value={editEmpForm.first_name}
              onChange={(e) => setEditEmpForm({ ...editEmpForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editEmpForm.last_name}
              onChange={(e) => setEditEmpForm({ ...editEmpForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Salary (INR)"
              type="number"
              value={editEmpForm.salary}
              onChange={(e) => setEditEmpForm({ ...editEmpForm, salary: e.target.value })}
            />
            <Select
              label="Branch Office"
              value={editEmpForm.b_id}
              onChange={(e) => setEditEmpForm({ ...editEmpForm, b_id: e.target.value })}
            >
              {branches.map((b) => (
                <option key={b.b_id} value={b.b_id}>
                  {b.branch_name} ({b.city})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Corporate Email"
              type="email"
              value={editEmpForm.email}
              onChange={(e) => setEditEmpForm({ ...editEmpForm, email: e.target.value })}
            />
            <Select
              label="Staff Status"
              value={editEmpForm.status}
              onChange={(e) => setEditEmpForm({ ...editEmpForm, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
              <option value="TERMINATED">TERMINATED</option>
            </Select>
          </div>

          <Input
            label="Hire Date"
            type="date"
            value={editEmpForm.hire_date}
            onChange={(e) => setEditEmpForm({ ...editEmpForm, hire_date: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditEmpModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditEmp}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ASSIGN OPERATIONAL DUTY (responsible_for) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAssignDutyModal}
        onClose={() => setIsAssignDutyModal(false)}
        title="Assign Operational Shift Responsibility"
        description="Creates an operational ledger record in CockroachDB table responsible_for"
        size="md"
      >
        <form onSubmit={handleAssignDuty} className="space-y-4">
          {dutyError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{dutyError}</span>
            </div>
          )}

          <Select
            label="Designated Staff Member *"
            value={dutyForm.emp_id}
            onChange={(e) => setDutyForm({ ...dutyForm, emp_id: e.target.value })}
            required
          >
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.first_name} {e.last_name || ''} (EMP-{e.emp_id})
              </option>
            ))}
          </Select>

          <Select
            label="Operational Branch Location *"
            value={dutyForm.b_id}
            onChange={(e) => setDutyForm({ ...dutyForm, b_id: e.target.value })}
            required
          >
            {branches.map((b) => (
              <option key={b.b_id} value={b.b_id}>
                {b.branch_name} ({b.city})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role Designation (Check Constraint) *"
              value={dutyForm.role_type}
              onChange={(e) => setDutyForm({ ...dutyForm, role_type: e.target.value })}
            >
              <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
              <option value="LOAN_OFFICER">LOAN_OFFICER</option>
              <option value="TELLER_SUPERVISOR">TELLER_SUPERVISOR</option>
              <option value="OPERATIONAL_SUPERVISOR">OPERATIONAL_SUPERVISOR</option>
              <option value="AUDIT_OFFICER">AUDIT_OFFICER</option>
            </Select>

            <Select
              label="Shift Status"
              value={dutyForm.status}
              onChange={(e) => setDutyForm({ ...dutyForm, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REVOKED">REVOKED</option>
            </Select>
          </div>

          <Input
            label="Shift Notes / Operational Scope"
            value={dutyForm.notes}
            onChange={(e) => setDutyForm({ ...dutyForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAssignDutyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingDuty}>
              Assign Responsibility
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT OPERATIONAL DUTY (responsible_for) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditDutyModal}
        onClose={() => setIsEditDutyModal(false)}
        title={`Edit Duty Assignment: DUTY-${selectedDuty?.rf_id}`}
        description="Update role designation, operational status, notes, or branch office in responsible_for"
        size="md"
      >
        <form onSubmit={handleEditDuty} className="space-y-4">
          {editDutyError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editDutyError}</span>
            </div>
          )}

          <Select
            label="Designated Staff Member *"
            value={editDutyForm.emp_id}
            onChange={(e) => setEditDutyForm({ ...editDutyForm, emp_id: e.target.value })}
            required
          >
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.first_name} {e.last_name || ''} (EMP-{e.emp_id})
              </option>
            ))}
          </Select>

          <Select
            label="Operational Branch Location *"
            value={editDutyForm.b_id}
            onChange={(e) => setEditDutyForm({ ...editDutyForm, b_id: e.target.value })}
            required
          >
            {branches.map((b) => (
              <option key={b.b_id} value={b.b_id}>
                {b.branch_name} ({b.city})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role Designation (Check Constraint) *"
              value={editDutyForm.role_type}
              onChange={(e) => setEditDutyForm({ ...editDutyForm, role_type: e.target.value })}
            >
              <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
              <option value="LOAN_OFFICER">LOAN_OFFICER</option>
              <option value="TELLER_SUPERVISOR">TELLER_SUPERVISOR</option>
              <option value="OPERATIONAL_SUPERVISOR">OPERATIONAL_SUPERVISOR</option>
              <option value="AUDIT_OFFICER">AUDIT_OFFICER</option>
            </Select>

            <Select
              label="Shift Status"
              value={editDutyForm.status}
              onChange={(e) => setEditDutyForm({ ...editDutyForm, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REVOKED">REVOKED</option>
            </Select>
          </div>

          <Input
            label="Shift Notes / Operational Scope"
            value={editDutyForm.notes}
            onChange={(e) => setEditDutyForm({ ...editDutyForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditDutyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditDuty}>
              Save Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: DELETE DUTY CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteDutyModal}
        onClose={() => setIsDeleteDutyModal(false)}
        title="Delete Operational Duty Assignment"
        description="Permanently remove duty ledger entry from CockroachDB table responsible_for"
        size="sm"
      >
        <div className="space-y-4">
          {deleteDutyError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{deleteDutyError}</span>
            </div>
          )}

          <p className="text-sm text-obsidian-300">
            Are you sure you want to delete assignment <span className="text-white font-mono font-semibold">DUTY-{selectedDuty?.rf_id}</span> ({selectedDuty?.role_type})?
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteDutyModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteDuty} isLoading={isDeletingDuty}>
              Delete Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION & LIFECYCLE MANAGEMENT */}
      {/* ========================================================================= */}
      {selectedEmp && (
        <DeleteConfirmModal
          isOpen={isDeleteModal}
          onClose={() => setIsDeleteModal(false)}
          entityType="employee"
          entityId={String(selectedEmp.emp_id)}
          entityTitle={`Staff EMP-${selectedEmp.emp_id} (${selectedEmp.first_name} ${selectedEmp.last_name || ''})`}
          onSuccess={(msg) => {
            setStatusMessage({ type: 'success', text: msg });
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
};
