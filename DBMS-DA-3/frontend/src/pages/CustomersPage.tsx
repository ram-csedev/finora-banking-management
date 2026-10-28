import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Wallet,
  Landmark,
  CreditCard,
  PlusCircle,
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
import { api, ApiError } from '../api/client';
import { Customer, CustomerPhone, AccountHolder, Loan, CreditCard as CreditCardType, Employee, Beneficiary } from '../types';

export const CustomersPage: React.FC = () => {
  // State: Data & Pagination
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // State: UI & Status
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Active / Selected Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPhones, setCustomerPhones] = useState<CustomerPhone[]>([]);
  const [customerHoldings, setCustomerHoldings] = useState<AccountHolder[]>([]);
  const [customerLoans, setCustomerLoans] = useState<Loan[]>([]);
  const [customerCards, setCustomerCards] = useState<CreditCardType[]>([]);
  const [customerBeneficiaries, setCustomerBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // New Phone state in Details Modal
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneType, setNewPhoneType] = useState('MOBILE');
  const [isAddingPhone, setIsAddingPhone] = useState(false);

  // Edit Phone Modal State
  const [selectedPhone, setSelectedPhone] = useState<CustomerPhone | null>(null);
  const [isEditPhoneModal, setIsEditPhoneModal] = useState(false);
  const [editPhoneForm, setEditPhoneForm] = useState({
    phone: '',
    phone_type: 'MOBILE',
    is_primary: false,
  });
  const [isSubmittingEditPhone, setIsSubmittingEditPhone] = useState(false);
  const [editPhoneError, setEditPhoneError] = useState<string | null>(null);

  // Beneficiaries Modals State
  const [isAddBeneficiaryModal, setIsAddBeneficiaryModal] = useState(false);
  const [isEditBeneficiaryModal, setIsEditBeneficiaryModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    nickname: '',
    beneficiary_name: '',
    destination_account_num: '',
    destination_ifsc: '',
    bank_name: '',
    is_verified: true,
  });
  const [isSubmittingBeneficiary, setIsSubmittingBeneficiary] = useState(false);
  const [beneficiaryError, setBeneficiaryError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Form State: Create
  const [createForm, setCreateForm] = useState({
    pan: '',
    first_name: '',
    last_name: '',
    dob: '',
    email: '',
    city: '',
    state: '',
    pincode: '',
    emp_id: '',
    phone: '',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State: Edit
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    email: '',
    city: '',
    state: '',
    pincode: '',
    emp_id: '',
    status: 'ACTIVE' as Customer['status'],
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch Employees for dropdowns
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await api.listEmployees({ limit: 50 });
        if (res.data) setEmployees(res.data);
      } catch (e) {
        // non-blocking
      }
    }
    loadEmployees();
  }, []);

  // Fetch Customers with server-side pagination & filtering
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedEmpId && selectedEmpId !== 'all') params.emp_id = selectedEmpId;
      if (selectedCity && selectedCity !== 'all') params.city = selectedCity;

      const res = await api.listCustomers(params);
      setCustomers(res.data || []);
      setTotalRecords(Number(res.pagination?.totalRecords) || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch customer directory.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedEmpId, selectedCity]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load Full Customer Details (Phones, Accounts, Loans, Cards, Beneficiaries)
  const openDetailsModal = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsDetailsOpen(true);
    setIsLoadingDetails(true);
    setNewPhone('');
    try {
      const [phonesRes, holdingsRes, loansRes, cardsRes, beneficiariesRes] = await Promise.all([
        api.getCustomerPhones(cust.cid).catch(() => ({ data: [] })),
        api.listAccountHolders({ cid: cust.cid }).catch(() => ({ data: [] })),
        api.listLoans({ cid: cust.cid }).catch(() => ({ data: [] })),
        api.listCreditCards({ cid: cust.cid }).catch(() => ({ data: [] })),
        api.listBeneficiaries({ cid: cust.cid }).catch(() => ({ data: [] })),
      ]);
      setCustomerPhones(phonesRes.data || []);
      setCustomerHoldings(holdingsRes.data || []);
      setCustomerLoans(loansRes.data || []);
      setCustomerCards(cardsRes.data || []);
      setCustomerBeneficiaries(beneficiariesRes.data || []);
    } catch (err) {
      // non-blocking fallback
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Add new phone number to existing customer
  const handleAddPhone = async () => {
    if (!selectedCustomer || !newPhone.trim()) return;
    setIsAddingPhone(true);
    try {
      await api.createCustomerPhone({
        cid: selectedCustomer.cid,
        phone: newPhone.trim(),
        phone_type: newPhoneType,
        is_primary: customerPhones.length === 0,
      });
      setNewPhone('');
      const res = await api.getCustomerPhones(selectedCustomer.cid);
      setCustomerPhones(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to add phone number.');
    } finally {
      setIsAddingPhone(false);
    }
  };

  // Edit Phone
  const openEditPhone = (p: CustomerPhone) => {
    setSelectedPhone(p);
    setEditPhoneForm({
      phone: p.phone,
      phone_type: p.phone_type || 'MOBILE',
      is_primary: p.is_primary,
    });
    setEditPhoneError(null);
    setIsEditPhoneModal(true);
  };

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedPhone) return;
    setIsSubmittingEditPhone(true);
    setEditPhoneError(null);
    try {
      if (!editPhoneForm.phone.trim()) throw new Error('Phone number is required.');
      await api.updateCustomerPhone(selectedCustomer.cid, selectedPhone.phone, {
        phone: editPhoneForm.phone.trim(),
        phone_type: editPhoneForm.phone_type,
        is_primary: editPhoneForm.is_primary,
      });
      const res = await api.getCustomerPhones(selectedCustomer.cid);
      setCustomerPhones(res.data || []);
      setIsEditPhoneModal(false);
      setStatusMessage({ type: 'success', text: 'Phone number updated successfully.' });
    } catch (err: any) {
      setEditPhoneError(err.message || 'Failed to update phone number.');
    } finally {
      setIsSubmittingEditPhone(false);
    }
  };

  const handleDeletePhone = async (phone: string) => {
    if (!selectedCustomer) return;
    if (customerPhones.length <= 1) {
      alert('Cannot delete the only registered phone number for this customer.');
      return;
    }
    if (!confirm(`Are you sure you want to remove phone number ${phone}?`)) return;
    try {
      await api.deleteCustomerPhone(selectedCustomer.cid, phone);
      const res = await api.getCustomerPhones(selectedCustomer.cid);
      setCustomerPhones(res.data || []);
      setStatusMessage({ type: 'success', text: `Phone number ${phone} removed.` });
    } catch (err: any) {
      alert(err.message || 'Failed to delete phone number.');
    }
  };

  // Beneficiary Handlers
  const openAddBeneficiary = () => {
    setBeneficiaryForm({
      nickname: '',
      beneficiary_name: '',
      destination_account_num: '',
      destination_ifsc: 'FINO0001001',
      bank_name: 'Finora Bank',
      is_verified: true,
    });
    setBeneficiaryError(null);
    setIsAddBeneficiaryModal(true);
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSubmittingBeneficiary(true);
    setBeneficiaryError(null);
    try {
      if (!beneficiaryForm.nickname.trim()) throw new Error('Nickname is required.');
      if (!beneficiaryForm.beneficiary_name.trim()) throw new Error('Beneficiary name is required.');
      if (!beneficiaryForm.destination_account_num.trim()) throw new Error('Destination account number is required.');
      if (!beneficiaryForm.destination_ifsc.trim()) throw new Error('IFSC code is required.');

      await api.createBeneficiary({
        cid: selectedCustomer.cid,
        nickname: beneficiaryForm.nickname.trim(),
        beneficiary_name: beneficiaryForm.beneficiary_name.trim(),
        destination_account_num: beneficiaryForm.destination_account_num.trim(),
        destination_ifsc: beneficiaryForm.destination_ifsc.trim().toUpperCase(),
        bank_name: beneficiaryForm.bank_name.trim() || undefined,
        is_verified: beneficiaryForm.is_verified,
      });

      const bRes = await api.listBeneficiaries({ cid: selectedCustomer.cid });
      setCustomerBeneficiaries(bRes.data || []);
      setIsAddBeneficiaryModal(false);
      setStatusMessage({ type: 'success', text: `Beneficiary "${beneficiaryForm.nickname}" added.` });
    } catch (err: any) {
      setBeneficiaryError(err.message || 'Failed to add beneficiary.');
    } finally {
      setIsSubmittingBeneficiary(false);
    }
  };

  const openEditBeneficiary = (b: Beneficiary) => {
    setSelectedBeneficiary(b);
    setBeneficiaryForm({
      nickname: b.nickname || '',
      beneficiary_name: b.beneficiary_name || '',
      destination_account_num: b.destination_account_num || '',
      destination_ifsc: b.destination_ifsc || '',
      bank_name: b.bank_name || '',
      is_verified: b.is_verified ?? true,
    });
    setBeneficiaryError(null);
    setIsEditBeneficiaryModal(true);
  };

  const handleUpdateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedBeneficiary) return;
    setIsSubmittingBeneficiary(true);
    setBeneficiaryError(null);
    try {
      if (!beneficiaryForm.nickname.trim()) throw new Error('Nickname is required.');
      if (!beneficiaryForm.beneficiary_name.trim()) throw new Error('Beneficiary legal name is required.');

      await api.updateBeneficiary(selectedBeneficiary.beneficiary_id, {
        nickname: beneficiaryForm.nickname.trim(),
        beneficiary_name: beneficiaryForm.beneficiary_name.trim(),
        destination_account_num: beneficiaryForm.destination_account_num.trim(),
        destination_ifsc: beneficiaryForm.destination_ifsc.trim().toUpperCase(),
        bank_name: beneficiaryForm.bank_name.trim() || undefined,
        is_verified: beneficiaryForm.is_verified,
      });

      const bRes = await api.listBeneficiaries({ cid: selectedCustomer.cid });
      setCustomerBeneficiaries(bRes.data || []);
      setIsEditBeneficiaryModal(false);
      setStatusMessage({ type: 'success', text: `Beneficiary "${beneficiaryForm.nickname}" updated.` });
    } catch (err: any) {
      setBeneficiaryError(err.message || 'Failed to update beneficiary.');
    } finally {
      setIsSubmittingBeneficiary(false);
    }
  };

  const handleDeleteBeneficiary = async (bId: string) => {
    if (!selectedCustomer) return;
    if (!confirm('Are you sure you want to remove this transfer payee?')) return;
    try {
      await api.deleteBeneficiary(bId);
      const bRes = await api.listBeneficiaries({ cid: selectedCustomer.cid });
      setCustomerBeneficiaries(bRes.data || []);
      setStatusMessage({ type: 'success', text: 'Beneficiary removed.' });
    } catch (err: any) {
      alert(err.message || 'Failed to delete beneficiary.');
    }
  };

  // Open Edit Modal
  const openEditModal = (cust: Customer) => {
    setSelectedCustomer(cust);
    setEditForm({
      first_name: cust.first_name || '',
      last_name: cust.last_name || '',
      dob: cust.dob ? cust.dob.split('T')[0] : '',
      email: cust.email || '',
      city: cust.city || '',
      state: cust.state || '',
      pincode: cust.pincode || '',
      emp_id: cust.emp_id ? String(cust.emp_id) : '',
      status: cust.status || 'ACTIVE',
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  // Submit Edit Customer
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      await api.updateCustomer(selectedCustomer.cid, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim() || undefined,
        dob: editForm.dob || undefined,
        email: editForm.email.trim() || undefined,
        city: editForm.city.trim() || undefined,
        state: editForm.state.trim() || undefined,
        pincode: editForm.pincode.trim() || undefined,
        emp_id: editForm.emp_id ? editForm.emp_id : undefined,
        status: editForm.status,
      });
      setIsEditOpen(false);
      setStatusMessage({ type: 'success', text: `Customer CUST-${selectedCustomer.cid} updated successfully.` });
      fetchCustomers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update customer.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Create Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      if (!createForm.pan.trim()) throw new Error('PAN is mandatory (e.g. ABCDE1234F).');
      if (!createForm.first_name.trim()) throw new Error('First Name is required.');

      const newCust = await api.createCustomer({
        pan: createForm.pan.trim().toUpperCase(),
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim() || undefined,
        dob: createForm.dob || undefined,
        email: createForm.email.trim() || undefined,
        city: createForm.city.trim() || undefined,
        state: createForm.state.trim() || undefined,
        pincode: createForm.pincode.trim() || undefined,
        emp_id: createForm.emp_id ? createForm.emp_id : undefined,
      });

      // Optionally attach phone number if provided
      if (createForm.phone.trim() && newCust.data?.cid) {
        try {
          await api.createCustomerPhone({
            cid: newCust.data.cid,
            phone: createForm.phone.trim(),
            phone_type: 'MOBILE',
            is_primary: true,
          });
        } catch (phoneErr) {
          console.warn('Could not attach initial phone:', phoneErr);
        }
      }

      setIsCreateOpen(false);
      setCreateForm({
        pan: '',
        first_name: '',
        last_name: '',
        dob: '',
        email: '',
        city: '',
        state: '',
        pincode: '',
        emp_id: '',
        phone: '',
      });
      setStatusMessage({ type: 'success', text: `New customer CUST-${newCust.data?.cid || 'CREATED'} registered successfully.` });
      fetchCustomers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create customer record.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Delete Confirmation
  const openDeleteModal = (cust: Customer) => {
    setSelectedCustomer(cust);
    setDeleteError(null);
    setIsDeleteOpen(true);
  };

  // Execute Delete Customer with Foreign-Key Safeguard
  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCustomer(selectedCustomer.cid);
      setIsDeleteOpen(false);
      setStatusMessage({ type: 'success', text: `Customer CUST-${selectedCustomer.cid} deleted successfully.` });
      fetchCustomers();
    } catch (err: any) {
      setDeleteError(err.message || 'Deletion rejected by database foreign-key constraints.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getEmpName = (empId?: string) => {
    if (!empId) return 'Unassigned';
    const emp = employees.find((e) => String(e.emp_id) === String(empId));
    return emp ? `${emp.first_name} ${emp.last_name || ''}` : `EMP-${empId}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alert Status Banner */}
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Customer Management
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Directly connected to CockroachDB table <code>customer</code> with referential protection and audit logging
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchCustomers}
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
              setIsCreateOpen(true);
            }}
            icon={<UserPlus className="w-4 h-4" />}
          >
            New Customer
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border-obsidian-750">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              icon={<Search className="w-4 h-4 text-obsidian-400" />}
              placeholder="Search by name, CID, PAN, email, phone, city..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div>
            <Select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Relationship Officers</option>
              {employees.map((e) => (
                <option key={e.emp_id} value={e.emp_id}>
                  {e.first_name} {e.last_name || ''} (EMP-{e.emp_id})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Cities</option>
              {['Vellore', 'Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Customer Registry Data Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <CardTitle>Customer Directory</CardTitle>
              <Badge variant="cyan" size="xs">
                {totalRecords} Total Registered
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
              <TableHead>CID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Tax PAN</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Relationship Officer</TableHead>
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
                    <span>Loading real-time customer data from CockroachDB...</span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <TableEmpty message="No customers found matching the search criteria." colSpan={8} />
            ) : (
              customers.map((c) => (
                <TableRow key={c.cid}>
                  <TableCell className="font-mono font-semibold text-cyan-400">
                    CUST-{c.cid}
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {c.first_name} {c.last_name || ''}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-amber-300">
                    {c.pan}
                  </TableCell>
                  <TableCell className="text-obsidian-300 text-xs">
                    {c.email || '—'}
                  </TableCell>
                  <TableCell className="text-obsidian-300 text-xs">
                    {c.city ? `${c.city}, ${c.state || ''}` : '—'}
                  </TableCell>
                  <TableCell className="text-obsidian-300 text-xs">
                    {getEmpName(c.emp_id)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.status === 'ACTIVE' || !c.status ? 'emerald' : 'slate'}
                      size="xs"
                      dot
                    >
                      {c.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openDetailsModal(c)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-cyan-400 hover:bg-obsidian-800 transition-colors"
                        title="View Customer Profile & Financial Records"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                        title="Edit Customer Information"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(c)}
                        className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                        title="Delete Customer"
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
              Showing {customers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
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
      {/* MODAL 1: VIEW CUSTOMER DETAILS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Customer Profile: CUST-${selectedCustomer?.cid}`}
        description="Comprehensive personal identity and linked financial dependencies in CockroachDB"
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-obsidian-950 border border-obsidian-800">
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Legal Name</span>
                <p className="text-sm font-semibold text-white">
                  {selectedCustomer.first_name} {selectedCustomer.last_name || ''}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Tax PAN</span>
                <p className="text-sm font-mono font-semibold text-amber-300">
                  {selectedCustomer.pan}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Date of Birth</span>
                <p className="text-sm text-obsidian-200">
                  {selectedCustomer.dob ? new Date(selectedCustomer.dob).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Email Address</span>
                <p className="text-xs text-obsidian-200 truncate">{selectedCustomer.email || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Residence City</span>
                <p className="text-xs text-obsidian-200">
                  {selectedCustomer.city || '—'}, {selectedCustomer.state || ''} ({selectedCustomer.pincode || '—'})
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-obsidian-500">Relationship Manager</span>
                <p className="text-xs text-cyan-300">{getEmpName(selectedCustomer.emp_id)}</p>
              </div>
            </div>

            {/* Phone Numbers Section (1:N customer_phone) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  Contact Phone Numbers (customer_phone 1:N)
                </h4>
                <span className="text-[11px] text-obsidian-400 font-mono">
                  {customerPhones.length} numbers registered
                </span>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-3">
                {customerPhones.length === 0 ? (
                  <p className="text-xs text-obsidian-500 italic">No phone numbers recorded for this customer.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customerPhones.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-900 border border-obsidian-750 text-xs"
                      >
                        <span className="font-mono text-cyan-300">{p.phone}</span>
                        <Badge variant="slate" size="xs">
                          {p.phone_type}
                        </Badge>
                        {p.is_primary && (
                          <Badge variant="emerald" size="xs">
                            PRIMARY
                          </Badge>
                        )}
                        <button
                          onClick={() => openEditPhone(p)}
                          className="p-1 rounded text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors ml-1"
                          title="Edit Phone"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePhone(p.phone)}
                          className="p-1 rounded text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                          title="Delete Phone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Add Phone */}
                <div className="pt-2 border-t border-obsidian-800/80 flex items-center gap-2">
                  <Input
                    placeholder="Add phone (e.g. 9876543210)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="py-1 text-xs"
                  />
                  <Select
                    value={newPhoneType}
                    onChange={(e) => setNewPhoneType(e.target.value)}
                    className="py-1 text-xs w-32 shrink-0"
                  >
                    <option value="MOBILE">MOBILE</option>
                    <option value="HOME">HOME</option>
                    <option value="WORK">WORK</option>
                    <option value="OTHER">OTHER</option>
                  </Select>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={handleAddPhone}
                    disabled={isAddingPhone || !newPhone.trim()}
                    className="shrink-0"
                  >
                    {isAddingPhone ? 'Adding...' : 'Add Phone'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Linked Financial Dependencies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Accounts */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Accounts
                  </span>
                  <Badge variant="emerald" size="xs">{customerHoldings.length}</Badge>
                </div>
                {customerHoldings.length === 0 ? (
                  <p className="text-[11px] text-obsidian-500 italic">No account holdings</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {customerHoldings.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-obsidian-800/50 last:border-0 font-mono">
                        <span className="text-emerald-300">ACC-{h.acc_id}</span>
                        <span className="text-obsidian-400 text-[10px]">{h.ownership_role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Loans */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-amber-400" /> Loans
                  </span>
                  <Badge variant="amber" size="xs">{customerLoans.length}</Badge>
                </div>
                {customerLoans.length === 0 ? (
                  <p className="text-[11px] text-obsidian-500 italic">No active loans</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {customerLoans.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-obsidian-800/50 last:border-0 font-mono">
                        <span className="text-amber-300">LN-{l.l_id}</span>
                        <span className="text-white text-[11px]">₹{Number(l.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Credit Cards */}
              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-violet-400" /> Cards
                  </span>
                  <Badge variant="violet" size="xs">{customerCards.length}</Badge>
                </div>
                {customerCards.length === 0 ? (
                  <p className="text-[11px] text-obsidian-500 italic">No credit cards</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {customerCards.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-obsidian-800/50 last:border-0 font-mono">
                        <span className="text-violet-300">{c.pno}</span>
                        <span className="text-obsidian-400 text-[10px]">{c.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Saved Transfer Beneficiaries (beneficiary 1:N) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-violet-400" />
                  Saved Transfer Payees (beneficiary 1:N)
                </h4>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={openAddBeneficiary}
                  icon={<PlusCircle className="w-3.5 h-3.5" />}
                >
                  Add Payee
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800">
                {customerBeneficiaries.length === 0 ? (
                  <p className="text-xs text-obsidian-500 italic">No transfer beneficiaries recorded for this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {customerBeneficiaries.map((b) => (
                      <div
                        key={b.beneficiary_id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-obsidian-900 border border-obsidian-800 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{b.beneficiary_name}</span>
                            <Badge variant="violet" size="xs">{b.nickname}</Badge>
                            {b.is_verified && <Badge variant="emerald" size="xs">VERIFIED</Badge>}
                          </div>
                          <div className="text-[11px] text-obsidian-400 font-mono mt-0.5">
                            A/C: {b.destination_account_num} • IFSC: {b.destination_ifsc} {b.bank_name ? `• ${b.bank_name}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditBeneficiary(b)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                            title="Edit Payee Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBeneficiary(b.beneficiary_id)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Remove Payee"
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
      {/* MODAL 2: CREATE CUSTOMER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Banking Customer"
        description="Creates a new customer record in CockroachDB with unique PAN validation"
        size="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="PAN (Mandatory & Unique) *"
              placeholder="e.g. ABCDE1234F"
              value={createForm.pan}
              onChange={(e) => setCreateForm({ ...createForm, pan: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Initial Mobile Number"
              placeholder="e.g. 9876500099"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              placeholder="First name"
              value={createForm.first_name}
              onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="Last name"
              value={createForm.last_name}
              onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={createForm.dob}
              onChange={(e) => setCreateForm({ ...createForm, dob: e.target.value })}
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

          <Select
            label="Assigned Relationship Officer (Employee)"
            value={createForm.emp_id}
            onChange={(e) => setCreateForm({ ...createForm, emp_id: e.target.value })}
          >
            <option value="">None (Unassigned)</option>
            {employees.map((emp) => (
              <option key={emp.emp_id} value={emp.emp_id}>
                {emp.first_name} {emp.last_name || ''} (EMP-{emp.emp_id})
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingCreate}>
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT CUSTOMER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Customer CUST-${selectedCustomer?.cid}`}
        description="Update personal contact information and relationship officer assignment"
        size="md"
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              value={editForm.first_name}
              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editForm.last_name}
              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={editForm.dob}
              onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
            />
          </div>

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
            <Select
              label="Assigned Relationship Officer (Employee)"
              value={editForm.emp_id}
              onChange={(e) => setEditForm({ ...editForm, emp_id: e.target.value })}
            >
              <option value="">None (Unassigned)</option>
              {employees.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  {emp.first_name} {emp.last_name || ''} (EMP-{emp.emp_id})
                </option>
              ))}
            </Select>

            <Select
              label="Customer Status"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: EDIT PHONE NUMBER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditPhoneModal}
        onClose={() => setIsEditPhoneModal(false)}
        title="Edit Contact Phone"
        description={`Update registered contact number for CUST-${selectedCustomer?.cid}`}
        size="sm"
      >
        <form onSubmit={handleUpdatePhone} className="space-y-4">
          {editPhoneError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editPhoneError}</span>
            </div>
          )}

          <Input
            label="Phone Number *"
            value={editPhoneForm.phone}
            onChange={(e) => setEditPhoneForm({ ...editPhoneForm, phone: e.target.value })}
            required
          />

          <Select
            label="Phone Classification"
            value={editPhoneForm.phone_type}
            onChange={(e) => setEditPhoneForm({ ...editPhoneForm, phone_type: e.target.value })}
          >
            <option value="MOBILE">MOBILE</option>
            <option value="HOME">HOME</option>
            <option value="WORK">WORK</option>
            <option value="OTHER">OTHER</option>
          </Select>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_primary_checkbox"
              checked={editPhoneForm.is_primary}
              onChange={(e) => setEditPhoneForm({ ...editPhoneForm, is_primary: e.target.checked })}
              className="rounded border-obsidian-700 bg-obsidian-800 text-cyan-500 focus:ring-0"
            />
            <label htmlFor="is_primary_checkbox" className="text-xs text-obsidian-200">
              Set as Primary Contact Number
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditPhoneModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditPhone}>
              Save Phone
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: ADD BENEFICIARY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddBeneficiaryModal}
        onClose={() => setIsAddBeneficiaryModal(false)}
        title="Add Transfer Payee / Beneficiary"
        description={`Record verified payee for CUST-${selectedCustomer?.cid}`}
        size="md"
      >
        <form onSubmit={handleAddBeneficiary} className="space-y-4">
          {beneficiaryError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{beneficiaryError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Beneficiary Nickname *"
              placeholder="e.g. Landlord, Mom, Business"
              value={beneficiaryForm.nickname}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, nickname: e.target.value })}
              required
            />
            <Input
              label="Payee Legal Name *"
              placeholder="Full Name as per bank account"
              value={beneficiaryForm.beneficiary_name}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, beneficiary_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Destination Account Number *"
              placeholder="Account Number"
              value={beneficiaryForm.destination_account_num}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, destination_account_num: e.target.value })}
              required
            />
            <Input
              label="Destination IFSC Code *"
              placeholder="e.g. FINO0001001"
              value={beneficiaryForm.destination_ifsc}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, destination_ifsc: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <Input
            label="Bank Name"
            placeholder="e.g. Finora Bank, State Bank of India"
            value={beneficiaryForm.bank_name}
            onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_name: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddBeneficiaryModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingBeneficiary}>
              Save Payee
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: EDIT BENEFICIARY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditBeneficiaryModal}
        onClose={() => setIsEditBeneficiaryModal(false)}
        title={`Edit Payee: ${selectedBeneficiary?.nickname}`}
        description="Update transfer beneficiary coordinates"
        size="md"
      >
        <form onSubmit={handleUpdateBeneficiary} className="space-y-4">
          {beneficiaryError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{beneficiaryError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Beneficiary Nickname *"
              value={beneficiaryForm.nickname}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, nickname: e.target.value })}
              required
            />
            <Input
              label="Payee Legal Name *"
              value={beneficiaryForm.beneficiary_name}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, beneficiary_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Destination Account Number *"
              value={beneficiaryForm.destination_account_num}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, destination_account_num: e.target.value })}
              required
            />
            <Input
              label="Destination IFSC Code *"
              value={beneficiaryForm.destination_ifsc}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, destination_ifsc: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <Input
            label="Bank Name"
            value={beneficiaryForm.bank_name}
            onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, bank_name: e.target.value })}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_verified_checkbox"
              checked={beneficiaryForm.is_verified}
              onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, is_verified: e.target.checked })}
              className="rounded border-obsidian-700 bg-obsidian-800 text-cyan-500 focus:ring-0"
            />
            <label htmlFor="is_verified_checkbox" className="text-xs text-obsidian-200">
              Verified Payee Status
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditBeneficiaryModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingBeneficiary}>
              Save Payee Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION & LIFECYCLE MANAGEMENT */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <DeleteConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          entityType="customer"
          entityId={String(selectedCustomer.cid)}
          entityTitle={`Customer CUST-${selectedCustomer.cid} (${selectedCustomer.first_name} ${selectedCustomer.last_name || ''})`}
          onSuccess={(msg) => {
            setStatusMessage({ type: 'success', text: msg });
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
};
