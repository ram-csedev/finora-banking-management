import {
  HealthResponse,
  PaginatedResponse,
  Customer,
  CustomerPhone,
  Account,
  AccountHolder,
  Nominee,
  Beneficiary,
  Transaction,
  Loan,
  LoanPayment,
  CreditCard,
  Branch,
  Employee,
  ResponsibleFor,
  TableMetadata,
  ColumnMetadata,
  IndexMetadata,
  ConstraintMetadata,
  RelationshipMetadata,
  SchemaGraph,
  WorkbenchPolicy,
  WorkbenchQueryResult,
  DeletePreviewResponse,
  LifecycleActionResult,
} from '../types';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function extractErrorMessage(errorData: any, status: number): string {
  if (errorData?.error) return errorData.error;
  if (errorData?.message) return errorData.message;
  if (errorData?.detail) return errorData.detail;
  return `Request failed with status ${status}`;
}

interface QuorumCheckResult {
  hasQuorum: boolean;
  activeNodesCount: number;
}

let quorumChecker: () => QuorumCheckResult = () => ({
  hasQuorum: true,
  activeNodesCount: 3,
});

export function registerRaftQuorumChecker(checker: () => QuorumCheckResult) {
  quorumChecker = checker;
}

function verifySimulatedQuorumGate(path: string) {
  // Read-only or internal simulator sync paths are exempt
  if (
    path.startsWith('/showcase/raft-') ||
    path.startsWith('/workbench/validate')
  ) {
    return;
  }

  const { hasQuorum, activeNodesCount } = quorumChecker();
  if (!hasQuorum) {
    throw new ApiError(
      `Simulated Raft Quorum Unavailable: Only ${activeNodesCount} of 3 simulated nodes online (minimum 2 required for consensus). Write operations are paused by the CockroachDB Multi-Raft simulation gate. Restore at least 2 nodes or click 'Reset Cluster' in the Architecture Showcase.`,
      503,
      { code: 'SIMULATED_RAFT_QUORUM_UNAVAILABLE', simulated: true, activeNodesCount }
    );
  }
}

export const api = {
  async get<T>(path: string, queryParams?: Record<string, any>): Promise<T> {
    try {
      let url = `${API_BASE}${path}`;
      if (queryParams) {
        const cleanParams = new URLSearchParams();
        for (const [key, val] of Object.entries(queryParams)) {
          if (val !== undefined && val !== null && val !== '') {
            cleanParams.append(key, String(val));
          }
        }
        const qs = cleanParams.toString();
        if (qs) url += `?${qs}`;
      }

      const { hasQuorum, activeNodesCount } = quorumChecker();
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Simulated-Quorum': hasQuorum ? 'true' : 'false',
          'X-Simulated-Active-Nodes': String(activeNodesCount),
        },
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {}
        throw new ApiError(extractErrorMessage(errorData, response.status), response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network communication failure', 0);
    }
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    try {
      verifySimulatedQuorumGate(path);

      const { hasQuorum, activeNodesCount } = quorumChecker();
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Simulated-Quorum': hasQuorum ? 'true' : 'false',
          'X-Simulated-Active-Nodes': String(activeNodesCount),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {}
        throw new ApiError(extractErrorMessage(errorData, response.status), response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network communication failure', 0);
    }
  },

  async put<T>(path: string, body: unknown): Promise<T> {
    try {
      verifySimulatedQuorumGate(path);

      const { hasQuorum, activeNodesCount } = quorumChecker();
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Simulated-Quorum': hasQuorum ? 'true' : 'false',
          'X-Simulated-Active-Nodes': String(activeNodesCount),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {}
        throw new ApiError(extractErrorMessage(errorData, response.status), response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network communication failure', 0);
    }
  },

  async delete<T>(path: string): Promise<T> {
    try {
      verifySimulatedQuorumGate(path);

      const { hasQuorum, activeNodesCount } = quorumChecker();
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-Simulated-Quorum': hasQuorum ? 'true' : 'false',
          'X-Simulated-Active-Nodes': String(activeNodesCount),
        },
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {}
        throw new ApiError(extractErrorMessage(errorData, response.status), response.status, errorData);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Network communication failure', 0);
    }
  },

  // Health
  async getHealth(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  },

  // Customers
  async listCustomers(params?: { page?: number; limit?: number; search?: string; emp_id?: string; city?: string }): Promise<PaginatedResponse<Customer>> {
    return this.get<PaginatedResponse<Customer>>('/customers', params);
  },

  async getCustomer(id: string): Promise<{ success: boolean; data: Customer }> {
    return this.get<{ success: boolean; data: Customer }>(`/customers/${id}`);
  },

  async createCustomer(data: Partial<Customer>): Promise<{ success: boolean; message: string; data: Customer }> {
    return this.post<{ success: boolean; message: string; data: Customer }>('/customers', data);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<{ success: boolean; message: string; data: Customer }> {
    return this.put<{ success: boolean; message: string; data: Customer }>(`/customers/${id}`, data);
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string; deleted: Customer }> {
    return this.delete<{ success: boolean; message: string; deleted: Customer }>(`/customers/${id}`);
  },

  async getCustomerPhones(cid: string): Promise<PaginatedResponse<CustomerPhone>> {
    return this.get<PaginatedResponse<CustomerPhone>>('/entities/customer_phone', { cid, limit: 100 });
  },

  async createCustomerPhone(data: { cid: string; phone: string; phone_type: string; is_primary?: boolean }): Promise<{ success: boolean; data: CustomerPhone }> {
    return this.post<{ success: boolean; data: CustomerPhone }>('/entities/customer_phone', data);
  },

  async updateCustomerPhone(cid: string, phone: string, data: { phone?: string; phone_type?: string; is_primary?: boolean }): Promise<{ success: boolean; message: string; data: CustomerPhone }> {
    return this.put<{ success: boolean; message: string; data: CustomerPhone }>(`/entities/customer_phone/${cid}/${phone}`, data);
  },

  async deleteCustomerPhone(cid: string, phone: string): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/entities/customer_phone/${cid}/${phone}`);
  },

  // Beneficiaries
  async listBeneficiaries(params?: { page?: number; limit?: number; cid?: string; search?: string }): Promise<PaginatedResponse<Beneficiary>> {
    return this.get<PaginatedResponse<Beneficiary>>('/entities/beneficiary', params);
  },

  async createBeneficiary(data: Partial<Beneficiary>): Promise<{ success: boolean; message: string; data: Beneficiary }> {
    return this.post<{ success: boolean; message: string; data: Beneficiary }>('/entities/beneficiary', data);
  },

  async updateBeneficiary(id: string, data: Partial<Beneficiary>): Promise<{ success: boolean; message: string; data: Beneficiary }> {
    return this.put<{ success: boolean; message: string; data: Beneficiary }>(`/entities/beneficiary/${id}`, data);
  },

  async deleteBeneficiary(id: string): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/entities/beneficiary/${id}`);
  },

  // Accounts
  async listAccounts(params?: { page?: number; limit?: number; search?: string; b_id?: string; status?: string; acc_type?: string }): Promise<PaginatedResponse<Account>> {
    return this.get<PaginatedResponse<Account>>('/accounts', params);
  },

  async getAccount(id: string): Promise<{ success: boolean; data: Account }> {
    return this.get<{ success: boolean; data: Account }>(`/accounts/${id}`);
  },

  async createAccount(data: { acc_id?: string; b_id: string; balance?: number | string; acc_type: string; status?: string }): Promise<{ success: boolean; message: string; data: Account }> {
    return this.post<{ success: boolean; message: string; data: Account }>('/accounts', data);
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<{ success: boolean; message: string; data: Account }> {
    return this.put<{ success: boolean; message: string; data: Account }>(`/accounts/${id}`, data);
  },

  async listAccountHolders(params?: { acc_id?: string; cid?: string }): Promise<PaginatedResponse<AccountHolder>> {
    return this.get<PaginatedResponse<AccountHolder>>('/entities/account_holder', params);
  },

  async createAccountHolder(data: { acc_id: string; cid: string; ownership_role: string; is_primary: boolean; share_percentage: number }): Promise<{ success: boolean; data: AccountHolder }> {
    return this.post<{ success: boolean; data: AccountHolder }>('/entities/account_holder', data);
  },

  async updateAccountHolder(accId: string, cid: string, data: { ownership_role?: string; share_percentage?: number; is_primary?: boolean }): Promise<{ success: boolean; message: string; data: AccountHolder }> {
    return this.put<{ success: boolean; message: string; data: AccountHolder }>(`/entities/account_holder/${accId}/${cid}`, data);
  },

  async deleteAccountHolder(accId: string, cid: string): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/entities/account_holder/${accId}/${cid}`);
  },

  // Nominees
  async listNominees(params?: { acc_id?: string; cid?: string }): Promise<PaginatedResponse<Nominee>> {
    return this.get<PaginatedResponse<Nominee>>('/entities/nominee', params);
  },

  async createNominee(data: Partial<Nominee>): Promise<{ success: boolean; message: string; data: Nominee }> {
    return this.post<{ success: boolean; message: string; data: Nominee }>('/entities/nominee', data);
  },

  async updateNominee(id: string, data: Partial<Nominee>): Promise<{ success: boolean; message: string; data: Nominee }> {
    return this.put<{ success: boolean; message: string; data: Nominee }>(`/entities/nominee/${id}`, data);
  },

  async deleteNominee(id: string): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/entities/nominee/${id}`);
  },

  // Transactions & Core Banking Services
  async listTransactions(params?: { page?: number; limit?: number; search?: string; acc_id?: string; type?: string; status?: string }): Promise<PaginatedResponse<Transaction>> {
    return this.get<PaginatedResponse<Transaction>>('/transactions', params);
  },

  async updateTransaction(id: string, data: { description?: string }): Promise<{ success: boolean; message: string; data: Transaction }> {
    return this.put<{ success: boolean; message: string; data: Transaction }>(`/transactions/${id}`, data);
  },

  async deposit(data: { acc_id: string; amount: number; mode?: string; description?: string; emp_id?: string }) {
    return this.post<{ success: boolean; message: string; transaction: Transaction; account: Account }>('/banking/deposit', data);
  },

  async withdraw(data: { acc_id: string; amount: number; mode?: string; description?: string; emp_id?: string }) {
    return this.post<{ success: boolean; message: string; transaction: Transaction; account: Account }>('/banking/withdraw', data);
  },

  async transfer(data: { from_acc: string; to_acc: string; amount: number; mode?: string; description?: string; emp_id?: string }) {
    return this.post<{ success: boolean; message: string; transferAmount: number; fromAccount: { acc_id: string | number; balance: string | number; transaction: Transaction }; toAccount: { acc_id: string | number; balance: string | number; transaction: Transaction } }>('/banking/transfer', data);
  },

  // Loans & Credit
  async listLoans(params?: { page?: number; limit?: number; search?: string; cid?: string; status?: string; l_type?: string }): Promise<PaginatedResponse<Loan>> {
    return this.get<PaginatedResponse<Loan>>('/loans', params);
  },

  async createLoan(data: { l_id?: string; cid: string; l_type: string; amount: number | string; interest: number | string; term: number; start_date?: string; status?: string; assigned_emp_id?: string }) {
    return this.post<{ success: boolean; message: string; data: Loan }>('/loans', data);
  },

  async updateLoan(id: string, data: Partial<Loan>): Promise<{ success: boolean; message: string; data: Loan }> {
    return this.put<{ success: boolean; message: string; data: Loan }>(`/loans/${id}`, data);
  },

  async listLoanPayments(params?: { page?: number; limit?: number; l_id?: string }): Promise<PaginatedResponse<LoanPayment>> {
    return this.get<PaginatedResponse<LoanPayment>>('/loan-payments', params);
  },

  async payLoanInstallment(data: { l_id: string; amount: number; principal_amount: number; interest_amount: number; payment_mode: string; remarks?: string; emp_id?: string }) {
    return this.post<{ success: boolean; message: string; payment: LoanPayment }>('/banking/loan-payment', data);
  },

  async updateLoanPayment(id: string, data: { remarks?: string; payment_mode?: string }): Promise<{ success: boolean; message: string; data: LoanPayment }> {
    return this.put<{ success: boolean; message: string; data: LoanPayment }>(`/loan-payments/${id}`, data);
  },

  async listCreditCards(params?: { page?: number; limit?: number; search?: string; cid?: string; status?: string }): Promise<PaginatedResponse<CreditCard>> {
    return this.get<PaginatedResponse<CreditCard>>('/creditcards', params);
  },

  async createCreditCard(data: Partial<CreditCard>): Promise<{ success: boolean; message: string; data: CreditCard }> {
    return this.post<{ success: boolean; message: string; data: CreditCard }>('/creditcards', data);
  },

  async updateCreditCard(pno: string, data: Partial<CreditCard>): Promise<{ success: boolean; message: string; data: CreditCard }> {
    return this.put<{ success: boolean; message: string; data: CreditCard }>(`/creditcards/${pno}`, data);
  },

  // Branches & Staff
  async listBranches(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Branch>> {
    return this.get<PaginatedResponse<Branch>>('/branches', params);
  },

  async createBranch(data: Partial<Branch>) {
    return this.post<{ success: boolean; message: string; data: Branch }>('/branches', data);
  },

  async updateBranch(id: string, data: Partial<Branch>): Promise<{ success: boolean; message: string; data: Branch }> {
    return this.put<{ success: boolean; message: string; data: Branch }>(`/branches/${id}`, data);
  },

  async listEmployees(params?: { page?: number; limit?: number; search?: string; b_id?: string }): Promise<PaginatedResponse<Employee>> {
    return this.get<PaginatedResponse<Employee>>('/employees', params);
  },

  async createEmployee(data: Partial<Employee>) {
    return this.post<{ success: boolean; message: string; data: Employee }>('/employees', data);
  },

  async updateEmployee(id: string, data: Partial<Employee>): Promise<{ success: boolean; message: string; data: Employee }> {
    return this.put<{ success: boolean; message: string; data: Employee }>(`/employees/${id}`, data);
  },

  async listResponsibleFor(params?: { page?: number; limit?: number; search?: string; emp_id?: string; b_id?: string; status?: string }): Promise<PaginatedResponse<ResponsibleFor>> {
    return this.get<PaginatedResponse<ResponsibleFor>>('/responsible-for', params);
  },

  async createResponsibleFor(data: Partial<ResponsibleFor>) {
    return this.post<{ success: boolean; message: string; data: ResponsibleFor }>('/responsible-for', data);
  },

  async updateResponsibleFor(id: string, data: Partial<ResponsibleFor>): Promise<{ success: boolean; message: string; data: ResponsibleFor }> {
    return this.put<{ success: boolean; message: string; data: ResponsibleFor }>(`/responsible-for/${id}`, data);
  },

  async deleteResponsibleFor(id: string): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/responsible-for/${id}`);
  },

  // Database Metadata & Architecture Endpoints
  async getMetadataTables(): Promise<{ success: boolean; count: number; data: TableMetadata[] }> {
    return this.get<{ success: boolean; count: number; data: TableMetadata[] }>('/metadata/tables');
  },

  async getMetadataColumns(table: string): Promise<{ success: boolean; table: string; count: number; data: ColumnMetadata[] }> {
    return this.get<{ success: boolean; table: string; count: number; data: ColumnMetadata[] }>(`/metadata/columns/${table}`);
  },

  async getMetadataIndexes(table: string): Promise<{ success: boolean; table: string; count: number; data: IndexMetadata[] }> {
    return this.get<{ success: boolean; table: string; count: number; data: IndexMetadata[] }>(`/metadata/indexes/${table}`);
  },

  async getMetadataConstraints(table: string): Promise<{ success: boolean; table: string; count: number; data: ConstraintMetadata[] }> {
    return this.get<{ success: boolean; table: string; count: number; data: ConstraintMetadata[] }>(`/metadata/constraints/${table}`);
  },

  async getMetadataRelationships(): Promise<{ success: boolean; count: number; data: RelationshipMetadata[] }> {
    return this.get<{ success: boolean; count: number; data: RelationshipMetadata[] }>('/metadata/relationships');
  },

  async getMetadataSchema(): Promise<{ success: boolean; data: SchemaGraph }> {
    return this.get<{ success: boolean; data: SchemaGraph }>('/metadata/schema');
  },

  // SQL Query Workbench Endpoints
  async getWorkbenchPolicy(): Promise<{ success: boolean; policy: WorkbenchPolicy }> {
    return this.get<{ success: boolean; policy: WorkbenchPolicy }>('/workbench/policy');
  },

  async validateWorkbenchQuery(query: string): Promise<{ success: boolean; validation: { valid: boolean; reason?: string; isReadOnly?: boolean; cleanedQuery?: string } }> {
    return this.post<{ success: boolean; validation: { valid: boolean; reason?: string; isReadOnly?: boolean; cleanedQuery?: string } }>('/workbench/validate', { query });
  },

  async executeWorkbenchQuery(query: string): Promise<WorkbenchQueryResult> {
    return this.post<WorkbenchQueryResult>('/workbench/execute', { query });
  },

  // Phase 7 Deletion & Lifecycle Management Endpoints
  async getDeletePreview(entity: string, id: string, subId?: string): Promise<DeletePreviewResponse> {
    const path = subId
      ? `/entities/${entity}/${id}/${subId}/delete-preview`
      : `/entities/${entity}/${id}/delete-preview`;
    return this.get<DeletePreviewResponse>(path);
  },

  async confirmPermanentDelete(entity: string, id: string, subId?: string, options?: { empId?: string } | string): Promise<{ success: boolean; message: string; deleted?: any }> {
    const opts = typeof options === 'string' ? { empId: options } : options || {};
    const path = subId
      ? `/entities/${entity}/${id}/${subId}/delete-confirm`
      : `/entities/${entity}/${id}/delete-confirm`;
    return this.post<{ success: boolean; message: string; deleted?: any }>(path, {
      empId: opts.empId
    });
  },

  async executeLifecycleAction(entity: string, id: string, action: string, reason?: string, empId?: string): Promise<LifecycleActionResult> {
    return this.post<LifecycleActionResult>(`/entities/${entity}/${id}/lifecycle-action`, { action, reason, empId });
  },

  // CockroachDB Showcase Raft Simulation Endpoints
  async getRaftState(): Promise<{ success: boolean; data: any }> {
    return this.get('/showcase/raft-state');
  },

  async updateRaftState(state: { node1Up: boolean; node2Up: boolean; node3Up: boolean; raftLeader?: number }): Promise<{ success: boolean; data: any }> {
    return this.post('/showcase/raft-state', state);
  },

  async resetRaftState(): Promise<{ success: boolean; message: string; data: any }> {
    return this.post('/showcase/raft-reset', {});
  },
};

