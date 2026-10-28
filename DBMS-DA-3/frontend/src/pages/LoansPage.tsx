import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  PlusCircle,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Percent,
  Calendar,
  CreditCard as CreditCardIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Receipt,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { api } from '../api/client';
import { Loan, LoanPayment, CreditCard, Customer, Employee } from '../types';

export const LoansPage: React.FC = () => {
  // Active Tab: 'loans' | 'cards'
  const [activeTab, setActiveTab] = useState<'loans' | 'cards'>('loans');

  // State: Loans
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalLoans, setTotalLoans] = useState(0);
  const [loanPages, setLoanPages] = useState(1);
  const [currentLoanPage, setCurrentLoanPage] = useState(1);
  const [loanPageSize, setLoanPageSize] = useState(25);
  const [loanSearch, setLoanSearch] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('');

  // State: Credit Cards
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [cardPages, setCardPages] = useState(1);
  const [currentCardPage, setCurrentCardPage] = useState(1);
  const [cardPageSize, setCardPageSize] = useState(25);
  const [cardSearch, setCardSearch] = useState('');

  // Status & Loading
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isOriginateModal, setIsOriginateModal] = useState(false);
  const [isPaymentModal, setIsPaymentModal] = useState(false);
  const [isHistoryModal, setIsHistoryModal] = useState(false);
  const [isDeleteLoanModal, setIsDeleteLoanModal] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [isDeleteCardModal, setIsDeleteCardModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Form State: Originate Loan
  const [originateForm, setOriginateForm] = useState({
    cid: '',
    l_type: 'HOME',
    amount: '1500000',
    interest: '8.50',
    term: '120',
    start_date: new Date().toISOString().split('T')[0],
    assigned_emp_id: '',
  });
  const [isSubmittingOriginate, setIsSubmittingOriginate] = useState(false);
  const [originateError, setOriginateError] = useState<string | null>(null);

  // Form State: Loan Repayment (Checks amount = principal + interest)
  const [paymentForm, setPaymentForm] = useState({
    principal_amount: '10000',
    interest_amount: '2500',
    payment_mode: 'ONLINE',
    remarks: 'Monthly installment payment',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Form State: Edit Loan
  const [isEditLoanModal, setIsEditLoanModal] = useState(false);
  const [selectedEditLoan, setSelectedEditLoan] = useState<Loan | null>(null);
  const [editLoanForm, setEditLoanForm] = useState({
    l_type: 'HOME',
    interest: '8.50',
    term: '120',
    status: 'ACTIVE',
    assigned_emp_id: '',
  });
  const [isSubmittingEditLoan, setIsSubmittingEditLoan] = useState(false);
  const [editLoanError, setEditLoanError] = useState<string | null>(null);

  // Form State: Edit Credit Card
  const [isEditCardModal, setIsEditCardModal] = useState(false);
  const [selectedEditCard, setSelectedEditCard] = useState<CreditCard | null>(null);
  const [editCardForm, setEditCardForm] = useState({
    type: 'VISA',
    card_limit: '150000',
    expiry: '',
    status: 'ACTIVE',
  });
  const [isSubmittingEditCard, setIsSubmittingEditCard] = useState(false);
  const [editCardError, setEditCardError] = useState<string | null>(null);

  // Form State: Create Credit Card
  const [isCreateCardModal, setIsCreateCardModal] = useState(false);
  const [createCardForm, setCreateCardForm] = useState({
    cid: '',
    type: 'VISA',
    card_limit: '100000',
    expiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    cvv: '123',
    pno: '',
  });
  const [isSubmittingCreateCard, setIsSubmittingCreateCard] = useState(false);
  const [createCardError, setCreateCardError] = useState<string | null>(null);

  // Form State: Edit Loan Payment
  const [isEditPaymentModal, setIsEditPaymentModal] = useState(false);
  const [selectedEditPayment, setSelectedEditPayment] = useState<LoanPayment | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    payment_mode: 'ONLINE',
    remarks: '',
  });
  const [isSubmittingEditPayment, setIsSubmittingEditPayment] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  // Load auxiliary lists (customers, employees)
  useEffect(() => {
    async function loadAux() {
      try {
        const [cRes, eRes] = await Promise.all([
          api.listCustomers({ limit: 100 }).catch(() => ({ data: [] })),
          api.listEmployees({ limit: 50 }).catch(() => ({ data: [] })),
        ]);
        setCustomers(cRes.data || []);
        setEmployees(eRes.data || []);
        if (cRes.data?.length > 0) {
          setOriginateForm((p) => ({ ...p, cid: String(cRes.data[0].cid) }));
        }
      } catch (err) {
        // non-blocking
      }
    }
    loadAux();
  }, []);

  // Fetch Loans
  const fetchLoans = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentLoanPage,
        limit: loanPageSize,
      };
      if (loanSearch.trim()) params.search = loanSearch.trim();
      if (loanTypeFilter && loanTypeFilter !== 'all') params.l_type = loanTypeFilter;
      if (loanStatusFilter && loanStatusFilter !== 'all') params.status = loanStatusFilter;

      const res = await api.listLoans(params);
      setLoans(res.data || []);
      setTotalLoans(Number(res.pagination?.totalRecords) || 0);
      setLoanPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch loans.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentLoanPage, loanPageSize, loanSearch, loanTypeFilter, loanStatusFilter]);

  // Fetch Credit Cards
  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.listCreditCards({
        page: currentCardPage,
        limit: cardPageSize,
        search: cardSearch.trim() || undefined,
      });
      setCards(res.data || []);
      setTotalCards(Number(res.pagination?.totalRecords) || 0);
      setCardPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch credit cards.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentCardPage, cardPageSize, cardSearch]);

  useEffect(() => {
    if (activeTab === 'loans') fetchLoans();
    else fetchCards();
  }, [activeTab, fetchLoans, fetchCards]);

  // View Payment History for a Loan
  const openPaymentHistory = async (loan: Loan) => {
    setSelectedLoan(loan);
    setIsHistoryModal(true);
    setIsLoadingPayments(true);
    try {
      const res = await api.listLoanPayments({ l_id: loan.l_id, limit: 50 });
      setLoanPayments(res.data || []);
    } catch (err) {
      // non-blocking
    } finally {
      setIsLoadingPayments(false);
    }
  };

  // Submit Originate Loan
  const handleOriginateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOriginate(true);
    setOriginateError(null);
    try {
      const amt = parseFloat(originateForm.amount);
      const rate = parseFloat(originateForm.interest);
      const tenure = parseInt(originateForm.term, 10);
      if (isNaN(amt) || amt <= 0) throw new Error('Loan principal must be greater than zero.');
      if (isNaN(rate) || rate <= 0) throw new Error('Interest rate must be greater than zero.');
      if (isNaN(tenure) || tenure <= 0) throw new Error('Loan term must be at least 1 month.');

      const res = await api.createLoan({
        cid: originateForm.cid,
        l_type: originateForm.l_type,
        amount: amt,
        interest: rate,
        term: tenure,
        start_date: originateForm.start_date,
        status: 'ACTIVE',
        assigned_emp_id: originateForm.assigned_emp_id || undefined,
      });

      setIsOriginateModal(false);
      setStatusMessage({ type: 'success', text: `Loan LN-${res.data?.l_id || 'CREATED'} originated successfully.` });
      fetchLoans();
    } catch (err: any) {
      setOriginateError(err.message || 'Failed to originate loan.');
    } finally {
      setIsSubmittingOriginate(false);
    }
  };

  // Submit Repayment
  const handleLoanRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    setIsSubmittingPayment(true);
    setPaymentError(null);
    try {
      const princ = parseFloat(paymentForm.principal_amount) || 0;
      const intr = parseFloat(paymentForm.interest_amount) || 0;
      const total = princ + intr;

      if (total <= 0) throw new Error('Total repayment must be greater than zero.');

      await api.payLoanInstallment({
        l_id: selectedLoan.l_id,
        principal_amount: princ,
        interest_amount: intr,
        amount: total,
        payment_mode: paymentForm.payment_mode,
        remarks: paymentForm.remarks,
      });

      setIsPaymentModal(false);
      setStatusMessage({
        type: 'success',
        text: `Repayment of ₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Principal: ₹${princ}, Interest: ₹${intr}) processed for LN-${selectedLoan.l_id}.`,
      });
      fetchLoans();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment rejected.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openEditLoan = (loan: Loan) => {
    setSelectedEditLoan(loan);
    setEditLoanForm({
      l_type: loan.l_type,
      interest: String(loan.interest),
      term: String(loan.term),
      status: loan.status,
      assigned_emp_id: loan.assigned_emp_id ? String(loan.assigned_emp_id) : '',
    });
    setEditLoanError(null);
    setIsEditLoanModal(true);
  };

  const handleUpdateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditLoan) return;
    setIsSubmittingEditLoan(true);
    setEditLoanError(null);
    try {
      const rate = parseFloat(editLoanForm.interest);
      const tenure = parseInt(editLoanForm.term, 10);
      if (isNaN(rate) || rate < 0) throw new Error('Interest rate must be zero or positive.');
      if (isNaN(tenure) || tenure <= 0) throw new Error('Loan term must be at least 1 month.');

      await api.updateLoan(selectedEditLoan.l_id, {
        l_type: editLoanForm.l_type as any,
        interest: rate,
        term: tenure,
        status: editLoanForm.status as any,
        assigned_emp_id: editLoanForm.assigned_emp_id || undefined,
      });

      setIsEditLoanModal(false);
      setStatusMessage({ type: 'success', text: `Loan LN-${selectedEditLoan.l_id} updated successfully.` });
      fetchLoans();
    } catch (err: any) {
      setEditLoanError(err.message || 'Failed to update loan.');
    } finally {
      setIsSubmittingEditLoan(false);
    }
  };

  const openEditCard = (card: CreditCard) => {
    setSelectedEditCard(card);
    setEditCardForm({
      type: card.type,
      card_limit: String(card.card_limit),
      expiry: card.expiry ? new Date(card.expiry).toISOString().split('T')[0] : '',
      status: card.status,
    });
    setEditCardError(null);
    setIsEditCardModal(true);
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditCard) return;
    setIsSubmittingEditCard(true);
    setEditCardError(null);
    try {
      const limit = parseFloat(editCardForm.card_limit);
      if (isNaN(limit) || limit <= 0) throw new Error('Card limit must be greater than zero.');
      if (!editCardForm.expiry) throw new Error('Expiry date is required.');

      await api.updateCreditCard(selectedEditCard.pno, {
        type: editCardForm.type as any,
        card_limit: limit,
        expiry: editCardForm.expiry,
        status: editCardForm.status as any,
      });

      setIsEditCardModal(false);
      setStatusMessage({ type: 'success', text: `Credit card ${selectedEditCard.pno} updated successfully.` });
      fetchCards();
    } catch (err: any) {
      setEditCardError(err.message || 'Failed to update credit card.');
    } finally {
      setIsSubmittingEditCard(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreateCard(true);
    setCreateCardError(null);
    try {
      if (!createCardForm.cid) throw new Error('Please select a cardholder.');
      const limit = parseFloat(createCardForm.card_limit);
      if (isNaN(limit) || limit <= 0) throw new Error('Card limit must be greater than zero.');

      const pno = createCardForm.pno.trim() || `4532${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      const cvv = createCardForm.cvv.trim() || `${Math.floor(100 + Math.random() * 900)}`;

      await api.createCreditCard({
        pno,
        cid: createCardForm.cid,
        type: createCardForm.type as any,
        card_limit: limit,
        expiry: createCardForm.expiry,
        status: createCardForm.status as any,
        cvv,
      });

      setIsCreateCardModal(false);
      setStatusMessage({ type: 'success', text: `Credit card issued successfully: ${pno}` });
      fetchCards();
    } catch (err: any) {
      setCreateCardError(err.message || 'Failed to issue credit card.');
    } finally {
      setIsSubmittingCreateCard(false);
    }
  };

  const openEditPayment = (p: LoanPayment) => {
    setSelectedEditPayment(p);
    setEditPaymentForm({
      payment_mode: p.payment_mode,
      remarks: p.remarks || '',
    });
    setEditPaymentError(null);
    setIsEditPaymentModal(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditPayment) return;
    setIsSubmittingEditPayment(true);
    setEditPaymentError(null);
    try {
      await api.updateLoanPayment(selectedEditPayment.payment_id, {
        payment_mode: editPaymentForm.payment_mode,
        remarks: editPaymentForm.remarks,
      });

      setIsEditPaymentModal(false);
      setStatusMessage({ type: 'success', text: `Payment PAY-${selectedEditPayment.payment_id} updated.` });
      if (selectedLoan) {
        const pRes = await api.listLoanPayments({ l_id: selectedLoan.l_id });
        setLoanPayments(pRes.data || []);
      }
    } catch (err: any) {
      setEditPaymentError(err.message || 'Failed to update payment.');
    } finally {
      setIsSubmittingEditPayment(false);
    }
  };

  const getCustName = (cid?: string) => {
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
            <Landmark className="w-5 h-5 text-amber-400" />
            Lending & Credit Facilities
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Loan origination, installment payments (amount = principal + interest), and credit cards in CockroachDB
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={activeTab === 'loans' ? fetchLoans : fetchCards}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          {activeTab === 'loans' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setOriginateError(null);
                setIsOriginateModal(true);
              }}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Originate Loan
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCreateCardError(null);
                if (customers.length > 0) {
                  setCreateCardForm((p) => ({ ...p, cid: String(customers[0].cid) }));
                }
                setIsCreateCardModal(true);
              }}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Issue Credit Card
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-obsidian-800 pb-2">
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'loans'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Active Loan Facilities ({totalLoans})</span>
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'cards'
              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
              : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
          }`}
        >
          <CreditCardIcon className="w-4 h-4" />
          <span>Credit Card Portfolios ({totalCards})</span>
        </button>
      </div>

      {/* TAB 1: LOANS */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4 border-obsidian-750">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                icon={<Search className="w-4 h-4 text-obsidian-400" />}
                placeholder="Search by loan ID, customer, type, status..."
                value={loanSearch}
                onChange={(e) => {
                  setLoanSearch(e.target.value);
                  setCurrentLoanPage(1);
                }}
              />
              <Select
                value={loanTypeFilter}
                onChange={(e) => {
                  setLoanTypeFilter(e.target.value);
                  setCurrentLoanPage(1);
                }}
              >
                <option value="">All Loan Types</option>
                <option value="HOME">HOME</option>
                <option value="PERSONAL">PERSONAL</option>
                <option value="AUTO">AUTO</option>
                <option value="EDUCATION">EDUCATION</option>
                <option value="BUSINESS">BUSINESS</option>
              </Select>
              <Select
                value={loanStatusFilter}
                onChange={(e) => {
                  setLoanStatusFilter(e.target.value);
                  setCurrentLoanPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAID_OFF">PAID_OFF</option>
                <option value="DEFAULTED">DEFAULTED</option>
                <option value="APPLIED">APPLIED</option>
              </Select>
            </div>
          </Card>

          {/* Loans Grid */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <CardTitle>Loans Registry</CardTitle>
                  <Badge variant="amber" size="xs">
                    {totalLoans} Total Loans
                  </Badge>
                </div>
                <div className="text-xs text-obsidian-400 font-mono">
                  Page {currentLoanPage} of {loanPages || 1}
                </div>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Principal (INR)</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-obsidian-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                        <span>Loading loan portfolios...</span>
                      </div>
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <TableEmpty message="No loans found matching criteria." colSpan={8} />
                ) : (
                  loans.map((l) => (
                    <TableRow key={l.l_id}>
                      <TableCell className="font-mono text-cyan-400 font-semibold">
                        LN-{l.l_id}
                      </TableCell>
                      <TableCell className="text-white text-xs font-medium">
                        {getCustName(l.cid)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="amber" size="xs">{l.l_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-white text-sm">
                        ₹{parseFloat(String(l.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-cyan-300 text-xs">
                        {l.interest}%
                      </TableCell>
                      <TableCell className="text-obsidian-300 text-xs font-mono">
                        {l.term} mos
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'ACTIVE' ? 'emerald' : 'slate'} size="xs" dot>
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPaymentHistory(l)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-cyan-400 hover:bg-obsidian-800 transition-colors"
                            title="View Payment Installment History"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLoan(l);
                              setPaymentError(null);
                              setIsPaymentModal(true);
                            }}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-emerald-400 hover:bg-obsidian-800 transition-colors"
                            title="Record Repayment Installment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditLoan(l)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                            title="Edit Loan Facility"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setLoanToDelete(l);
                              setIsDeleteLoanModal(true);
                            }}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Delete or Settle Loan"
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
                  value={loanPageSize}
                  onChange={(e) => {
                    setLoanPageSize(Number(e.target.value));
                    setCurrentLoanPage(1);
                  }}
                  className="bg-obsidian-800 border border-obsidian-700 rounded px-2 py-1 text-obsidian-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {loans.length > 0 ? (currentLoanPage - 1) * loanPageSize + 1 : 0} -{' '}
                  {Math.min(currentLoanPage * loanPageSize, totalLoans)} of {totalLoans} records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentLoanPage((p) => Math.max(p - 1, 1))}
                  disabled={currentLoanPage <= 1 || isLoading}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-mono px-2 text-obsidian-200">
                  {currentLoanPage} / {loanPages || 1}
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentLoanPage((p) => Math.min(p + 1, loanPages))}
                  disabled={currentLoanPage >= loanPages || isLoading}
                  iconRight={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: CREDIT CARDS */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <Card className="p-4 border-obsidian-750">
            <Input
              icon={<Search className="w-4 h-4 text-obsidian-400" />}
              placeholder="Search by card number, customer, type, status..."
              value={cardSearch}
              onChange={(e) => {
                setCardSearch(e.target.value);
                setCurrentCardPage(1);
              }}
            />
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <CardTitle>Credit Cards Registry</CardTitle>
                  <Badge variant="violet" size="xs">
                    {totalCards} Active Portfolios
                  </Badge>
                </div>
                <div className="text-xs text-obsidian-400 font-mono">
                  Page {currentCardPage} of {cardPages || 1}
                </div>
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card Identifier</TableHead>
                  <TableHead>Cardholder</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Credit Limit (INR)</TableHead>
                  <TableHead>Expiry Date</TableHead>
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
                        <span>Loading credit card portfolios...</span>
                      </div>
                    </td>
                  </tr>
                ) : cards.length === 0 ? (
                  <TableEmpty message="No credit cards found." colSpan={7} />
                ) : (
                  cards.map((c) => (
                    <TableRow key={c.pno}>
                      <TableCell className="font-mono text-cyan-300 font-semibold">
                        {c.pno}
                      </TableCell>
                      <TableCell className="text-white text-xs font-medium">
                        {getCustName(c.cid)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="violet" size="xs">{c.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-white text-sm">
                        ₹{parseFloat(String(c.card_limit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-obsidian-300 font-mono">
                        {c.expiry ? new Date(c.expiry).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'ACTIVE' ? 'emerald' : 'rose'} size="xs" dot>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditCard(c)}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                            title="Edit Credit Card Portfolio"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCardToDelete(c);
                              setIsDeleteCardModal(true);
                            }}
                            className="p-1.5 rounded-lg text-obsidian-400 hover:text-rose-400 hover:bg-obsidian-800 transition-colors"
                            title="Manage Card (Delete, Block, Close)"
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
                  value={cardPageSize}
                  onChange={(e) => {
                    setCardPageSize(Number(e.target.value));
                    setCurrentCardPage(1);
                  }}
                  className="bg-obsidian-800 border border-obsidian-700 rounded px-2 py-1 text-obsidian-200 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Showing {cards.length > 0 ? (currentCardPage - 1) * cardPageSize + 1 : 0} -{' '}
                  {Math.min(currentCardPage * cardPageSize, totalCards)} of {totalCards} records
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentCardPage((p) => Math.max(p - 1, 1))}
                  disabled={currentCardPage <= 1 || isLoading}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-mono px-2 text-obsidian-200">
                  {currentCardPage} / {cardPages || 1}
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setCurrentCardPage((p) => Math.min(p + 1, cardPages))}
                  disabled={currentCardPage >= cardPages || isLoading}
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
      {/* MODAL 1: ORIGINATE LOAN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOriginateModal}
        onClose={() => setIsOriginateModal(false)}
        title="Originate New Loan Facility"
        description="Creates an authorized loan record anchored to borrower and credit officer"
        size="md"
      >
        <form onSubmit={handleOriginateLoan} className="space-y-4">
          {originateError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{originateError}</span>
            </div>
          )}

          <Select
            label="Borrower (Customer) *"
            value={originateForm.cid}
            onChange={(e) => setOriginateForm({ ...originateForm, cid: e.target.value })}
            required
          >
            {customers.map((c) => (
              <option key={c.cid} value={c.cid}>
                {c.first_name} {c.last_name || ''} (CUST-{c.cid})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Loan Category *"
              value={originateForm.l_type}
              onChange={(e) => setOriginateForm({ ...originateForm, l_type: e.target.value })}
            >
              <option value="HOME">HOME LOAN</option>
              <option value="PERSONAL">PERSONAL LOAN</option>
              <option value="AUTO">AUTO LOAN</option>
              <option value="EDUCATION">EDUCATION LOAN</option>
              <option value="BUSINESS">BUSINESS LOAN</option>
            </Select>

            <Input
              label="Principal Amount (INR) *"
              type="number"
              step="1000"
              min="1000"
              value={originateForm.amount}
              onChange={(e) => setOriginateForm({ ...originateForm, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Interest Rate (% p.a.) *"
              type="number"
              step="0.05"
              min="0.1"
              value={originateForm.interest}
              onChange={(e) => setOriginateForm({ ...originateForm, interest: e.target.value })}
              required
            />
            <Input
              label="Tenure (Months) *"
              type="number"
              min="1"
              value={originateForm.term}
              onChange={(e) => setOriginateForm({ ...originateForm, term: e.target.value })}
              required
            />
          </div>

          <Select
            label="Assigned Credit Officer"
            value={originateForm.assigned_emp_id}
            onChange={(e) => setOriginateForm({ ...originateForm, assigned_emp_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.first_name} {e.last_name || ''} (EMP-{e.emp_id})
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsOriginateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingOriginate}>
              Originate Loan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: LOAN REPAYMENT INSTALLMENT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPaymentModal}
        onClose={() => setIsPaymentModal(false)}
        title={`Repayment Installment: LN-${selectedLoan?.l_id}`}
        description="Demonstrates database check constraint: amount = principal_amount + interest_amount"
        size="md"
      >
        <form onSubmit={handleLoanRepayment} className="space-y-4">
          {paymentError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-obsidian-400">Total Loan Amount:</span>
              <span className="font-mono text-white">₹{selectedLoan?.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-400">Interest Rate:</span>
              <span className="font-mono text-cyan-300">{selectedLoan?.interest}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Principal Portion (INR) *"
              type="number"
              step="0.01"
              min="0"
              value={paymentForm.principal_amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, principal_amount: e.target.value })}
              required
            />
            <Input
              label="Interest Portion (INR) *"
              type="number"
              step="0.01"
              min="0"
              value={paymentForm.interest_amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, interest_amount: e.target.value })}
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-obsidian-900 border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-400">Calculated Total Installment (amount):</span>
            <span className="text-emerald-400 font-bold text-sm">
              ₹{(parseFloat(paymentForm.principal_amount || '0') + parseFloat(paymentForm.interest_amount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Payment Channel"
              value={paymentForm.payment_mode}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
            >
              <option value="AUTO_DEBIT">AUTO_DEBIT</option>
              <option value="UPI">UPI</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="CASH">CASH</option>
            </Select>

            <Input
              label="Remarks / Memo"
              value={paymentForm.remarks}
              onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" type="submit" isLoading={isSubmittingPayment}>
              Record Installment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: PAYMENT HISTORY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHistoryModal}
        onClose={() => setIsHistoryModal(false)}
        title={`Payment Ledger: LN-${selectedLoan?.l_id}`}
        description="All recorded repayments verifying principal and interest components in CockroachDB"
        size="lg"
      >
        <div className="space-y-4">
          {isLoadingPayments ? (
            <div className="py-8 text-center text-xs text-obsidian-400">Loading repayment history...</div>
          ) : loanPayments.length === 0 ? (
            <p className="py-8 text-center text-xs text-obsidian-500 italic">No repayments recorded for this loan yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanPayments.map((p) => (
                  <TableRow key={p.payment_id}>
                    <TableCell className="font-mono text-cyan-400 font-semibold">PAY-{p.payment_id}</TableCell>
                    <TableCell className="text-xs text-obsidian-300 font-mono">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-emerald-400">
                      ₹{parseFloat(String(p.amount)).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white">
                      ₹{parseFloat(String(p.principal_amount)).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-cyan-300">
                      ₹{parseFloat(String(p.interest_amount)).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-obsidian-400">{p.payment_mode}</TableCell>
                    <TableCell className="text-xs text-obsidian-300 max-w-xs truncate">{p.remarks || '—'}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => openEditPayment(p)}
                        className="p-1 rounded text-obsidian-400 hover:text-amber-400 hover:bg-obsidian-800 transition-colors"
                        title="Edit Payment Memo & Channel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Modal>

      {/* Delete / Settle Loan Modal */}
      {loanToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteLoanModal}
          onClose={() => {
            setIsDeleteLoanModal(false);
            setLoanToDelete(null);
          }}
          entityType="loan"
          entityId={String(loanToDelete.l_id)}
          entityTitle={`Loan LN-${loanToDelete.l_id} (${loanToDelete.l_type})`}
          onSuccess={(msg) => {
            setStatusMessage({ type: 'success', text: msg });
            fetchLoans();
          }}
        />
      )}

      {/* Delete / Block / Close Credit Card Modal */}
      {cardToDelete && (
        <DeleteConfirmModal
          isOpen={isDeleteCardModal}
          onClose={() => {
            setIsDeleteCardModal(false);
            setCardToDelete(null);
          }}
          entityType="creditcard"
          entityId={String(cardToDelete.pno)}
          entityTitle={`Credit Card •••• ${String(cardToDelete.pno).slice(-4)} (${cardToDelete.type})`}
          onSuccess={(msg) => {
            setStatusMessage({ type: 'success', text: msg });
            fetchCards();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT LOAN FACILITY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditLoanModal}
        onClose={() => setIsEditLoanModal(false)}
        title={`Edit Loan Facility: LN-${selectedEditLoan?.l_id}`}
        description="Update interest rate, tenure, status, or assigned loan officer in CockroachDB"
        size="md"
      >
        <form onSubmit={handleUpdateLoan} className="space-y-4">
          {editLoanError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editLoanError}</span>
            </div>
          )}

          {/* Read-Only Identity Card */}
          <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-obsidian-500 uppercase font-mono">Borrower</span>
              <p className="text-white font-medium truncate">{getCustName(selectedEditLoan?.cid)}</p>
            </div>
            <div>
              <span className="text-[10px] text-obsidian-500 uppercase font-mono">Principal (Fixed)</span>
              <p className="text-emerald-400 font-mono font-bold">
                ₹{selectedEditLoan ? parseFloat(String(selectedEditLoan.amount)).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-obsidian-500 uppercase font-mono">Originated Date</span>
              <p className="text-obsidian-300 font-mono">
                {selectedEditLoan?.start_date ? new Date(selectedEditLoan.start_date).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Loan Category *"
              value={editLoanForm.l_type}
              onChange={(e) => setEditLoanForm({ ...editLoanForm, l_type: e.target.value })}
              required
            >
              <option value="HOME">HOME LOAN</option>
              <option value="PERSONAL">PERSONAL LOAN</option>
              <option value="AUTO">AUTO LOAN</option>
              <option value="EDUCATION">EDUCATION LOAN</option>
              <option value="BUSINESS">BUSINESS LOAN</option>
            </Select>

            <Select
              label="Operational Status *"
              value={editLoanForm.status}
              onChange={(e) => setEditLoanForm({ ...editLoanForm, status: e.target.value })}
              required
            >
              <option value="ACTIVE">ACTIVE (In Good Standing)</option>
              <option value="PAID_OFF">PAID_OFF (Fully Settled)</option>
              <option value="DEFAULTED">DEFAULTED (In Default)</option>
              <option value="APPLIED">APPLIED (Pending Approval)</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Interest Rate (% p.a.) *"
              type="number"
              step="0.05"
              min="0"
              value={editLoanForm.interest}
              onChange={(e) => setEditLoanForm({ ...editLoanForm, interest: e.target.value })}
              required
            />
            <Input
              label="Tenure (Months) *"
              type="number"
              min="1"
              value={editLoanForm.term}
              onChange={(e) => setEditLoanForm({ ...editLoanForm, term: e.target.value })}
              required
            />
          </div>

          <Select
            label="Assigned Credit Officer"
            value={editLoanForm.assigned_emp_id}
            onChange={(e) => setEditLoanForm({ ...editLoanForm, assigned_emp_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.first_name} {e.last_name || ''} (EMP-{e.emp_id})
              </option>
            ))}
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditLoanModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditLoan}>
              Save Loan Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT CREDIT CARD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditCardModal}
        onClose={() => setIsEditCardModal(false)}
        title={`Edit Credit Card: •••• ${selectedEditCard?.pno.slice(-4)}`}
        description="Update card network, sanctioned credit limit, expiry date, or operational status"
        size="md"
      >
        <form onSubmit={handleUpdateCard} className="space-y-4">
          {editCardError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editCardError}</span>
            </div>
          )}

          {/* Read-Only Card Header */}
          <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-obsidian-500 uppercase font-mono">Card Number</span>
              <p className="text-white font-mono font-semibold">{selectedEditCard?.pno}</p>
            </div>
            <div>
              <span className="text-[10px] text-obsidian-500 uppercase font-mono">Cardholder</span>
              <p className="text-cyan-300 truncate">{getCustName(selectedEditCard?.cid)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Card Network *"
              value={editCardForm.type}
              onChange={(e) => setEditCardForm({ ...editCardForm, type: e.target.value })}
              required
            >
              <option value="VISA">VISA</option>
              <option value="MASTERCARD">MASTERCARD</option>
              <option value="RUPAY">RUPAY</option>
              <option value="AMEX">AMEX</option>
            </Select>

            <Select
              label="Card Status *"
              value={editCardForm.status}
              onChange={(e) => setEditCardForm({ ...editCardForm, status: e.target.value as any })}
              required
            >
              <option value="ACTIVE">ACTIVE (Authorized)</option>
              <option value="BLOCKED">BLOCKED (Temporary Hold)</option>
              <option value="EXPIRED">EXPIRED (Past Validity)</option>
              <option value="CANCELLED">CANCELLED (Terminated)</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Credit Limit (INR) *"
              type="number"
              step="5000"
              min="1000"
              value={editCardForm.card_limit}
              onChange={(e) => setEditCardForm({ ...editCardForm, card_limit: e.target.value })}
              required
            />
            <Input
              label="Expiration Date *"
              type="date"
              value={editCardForm.expiry}
              onChange={(e) => setEditCardForm({ ...editCardForm, expiry: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditCardModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditCard}>
              Save Card Details
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ISSUE CREDIT CARD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateCardModal}
        onClose={() => setIsCreateCardModal(false)}
        title="Issue New Credit Card"
        description="Creates a credit card portfolio linked to customer in CockroachDB"
        size="md"
      >
        <form onSubmit={handleCreateCard} className="space-y-4">
          {createCardError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{createCardError}</span>
            </div>
          )}

          <Select
            label="Cardholder (Customer) *"
            value={createCardForm.cid}
            onChange={(e) => setCreateCardForm({ ...createCardForm, cid: e.target.value })}
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
              label="Card Network *"
              value={createCardForm.type}
              onChange={(e) => setCreateCardForm({ ...createCardForm, type: e.target.value })}
            >
              <option value="VISA">VISA</option>
              <option value="MASTERCARD">MASTERCARD</option>
              <option value="RUPAY">RUPAY</option>
              <option value="AMEX">AMEX</option>
            </Select>

            <Input
              label="Credit Limit (INR) *"
              type="number"
              step="5000"
              min="1000"
              value={createCardForm.card_limit}
              onChange={(e) => setCreateCardForm({ ...createCardForm, card_limit: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expiration Date *"
              type="date"
              value={createCardForm.expiry}
              onChange={(e) => setCreateCardForm({ ...createCardForm, expiry: e.target.value })}
              required
            />
            <Input
              label="Card Number (Optional - Auto-generated if blank)"
              placeholder="16 digits"
              value={createCardForm.pno}
              onChange={(e) => setCreateCardForm({ ...createCardForm, pno: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsCreateCardModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingCreateCard}>
              Issue Card
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDIT PAYMENT REMARKS / MODE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditPaymentModal}
        onClose={() => setIsEditPaymentModal(false)}
        title={`Edit Payment Memo: PAY-${selectedEditPayment?.payment_id}`}
        description="Update repayment channel or audit notes (financial amounts remain immutable)"
        size="sm"
      >
        <form onSubmit={handleUpdatePayment} className="space-y-4">
          {editPaymentError && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{editPaymentError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-obsidian-500 font-mono">Total Paid:</span>
              <span className="font-mono font-bold text-emerald-400">₹{selectedEditPayment ? parseFloat(String(selectedEditPayment.amount)).toLocaleString() : '—'}</span>
            </div>
            <div className="flex justify-between text-[11px] text-obsidian-400">
              <span>Principal: ₹{selectedEditPayment?.principal_amount}</span>
              <span>Interest: ₹{selectedEditPayment?.interest_amount}</span>
            </div>
          </div>

          <Select
            label="Payment Channel *"
            value={editPaymentForm.payment_mode}
            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, payment_mode: e.target.value as any })}
            required
          >
            <option value="UPI">UPI</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="AUTO_DEBIT">AUTO_DEBIT</option>
            <option value="CASH">CASH</option>
          </Select>

          <Input
            label="Remarks / Memo"
            value={editPaymentForm.remarks}
            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, remarks: e.target.value })}
            placeholder="Audit notes or transaction reference"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-obsidian-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingEditPayment}>
              Save Memo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
