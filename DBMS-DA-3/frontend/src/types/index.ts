export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'active';

export interface CockroachDBHealth {
  status: 'UP' | 'DOWN' | 'CONNECTING';
  database?: string;
  engine?: string;
  serverTime?: string;
  ssl?: boolean;
}

export interface HealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  cockroachDB: CockroachDBHealth;
  environment?: string;
  architecture?: {
    storageEngine: string;
    consensus: string;
    isolationLevel: string;
    cloudCluster: string;
    cloudRegion: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  entity: string;
  pagination: {
    page: number;
    limit: number;
    totalRecords: number | string;
    totalPages: number;
  };
  data: T[];
}

export interface Customer {
  cid: string;
  pan: string;
  first_name: string;
  last_name?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dob?: string;
  emp_id?: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at?: string;
}

export interface CustomerPhone {
  cid: string;
  phone: string;
  phone_type: 'MOBILE' | 'HOME' | 'WORK' | 'OTHER';
  is_primary: boolean;
  created_at?: string;
}

export interface Account {
  acc_id: string;
  b_id: string;
  balance: string | number;
  status: 'ACTIVE' | 'DORMANT' | 'FROZEN' | 'CLOSED';
  acc_type: 'SAVINGS' | 'CURRENT' | 'SALARY' | 'FIXED_DEPOSIT';
  created_at?: string;
}

export interface AccountHolder {
  acc_id: string;
  cid: string;
  ownership_role: 'PRIMARY' | 'JOINT' | 'SECONDARY' | 'GUARDIAN';
  is_primary: boolean;
  share_percentage: string | number;
  created_at?: string;
}

export interface Nominee {
  n_id: string;
  acc_id: string;
  cid?: string;
  first_name: string;
  last_name?: string;
  relationship: string;
  dob?: string;
  contact_phone?: string;
}

export interface Beneficiary {
  beneficiary_id: string;
  cid: string;
  nickname: string;
  beneficiary_name: string;
  destination_account_num: string;
  destination_ifsc: string;
  bank_name?: string;
  internal_acc_id?: string;
  is_verified: boolean;
  created_at?: string;
}

export interface CreditCard {
  pno: string;
  cid: string;
  type: 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX';
  card_limit: string | number;
  expiry: string;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'CANCELLED';
  cvv?: string;
}

export interface Loan {
  l_id: string;
  cid: string;
  l_type: 'HOME' | 'PERSONAL' | 'AUTO' | 'EDUCATION' | 'BUSINESS';
  amount: string | number;
  interest: string | number;
  term: number;
  start_date: string;
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED' | 'APPLIED';
  assigned_emp_id?: string;
}

export interface LoanPayment {
  payment_id: string;
  l_id: string;
  payment_date: string;
  amount: string | number;
  principal_amount: string | number;
  interest_amount: string | number;
  payment_mode: 'NEFT' | 'RTGS' | 'UPI' | 'AUTO_DEBIT' | 'CASH';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  remarks?: string;
}

export interface Branch {
  b_id: string;
  branch_name: string;
  city: string;
  state: string;
  pincode: string;
  ifsc: string;
  contact?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
}

export interface Employee {
  emp_id: string;
  first_name: string;
  last_name?: string;
  salary: string | number;
  hire_date?: string;
  b_id: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ON_LEAVE' | 'TERMINATED';
}

export interface ResponsibleFor {
  rf_id: string;
  emp_id: string;
  b_id: string;
  role_type: string;
  l_id?: string;
  t_id?: string;
  assigned_date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'REVOKED' | 'TRANSFERRED';
  notes?: string;
}

export interface Transaction {
  t_id: string;
  acc_id: string;
  trans_date: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'INTEREST_CREDIT' | 'FEE_DEBIT';
  amount: string | number;
  mode: 'CASH' | 'ATM' | 'NEFT' | 'RTGS' | 'UPI' | 'INTERNAL_TRANSFER' | 'CHEQUE';
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED';
  related_acc_id?: string;
  related_trans_id?: string;
  description?: string;
  processed_by_emp_id?: string;
}

export interface NavItemConfig {
  path: string;
  label: string;
  iconName: string;
  badge?: string;
  category: 'Banking' | 'Architecture' | 'Tools';
  description: string;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  iconName: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
  isLoading?: boolean;
}

// Database Metadata & Catalog Explorer Types
export interface TableMetadata {
  tableName: string;
  tableType: 'BASE TABLE' | 'VIEW';
  columnCount: number;
  rowCount: number;
  isExactCount: boolean;
  viewDefinition?: string | null;
}

export interface ColumnMetadata {
  column_name: string;
  ordinal_position: number | string;
  data_type: string;
  is_nullable: string;
  column_default?: string | null;
  character_maximum_length?: number | string | null;
  numeric_precision?: number | string | null;
  numeric_scale?: number | string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table_name?: string | null;
  foreign_column_name?: string | null;
}

export interface IndexMetadata {
  indexname: string;
  indexdef: string;
}

export interface ConstraintMetadata {
  constraint_name: string;
  constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  column_name?: string | null;
  foreign_table?: string | null;
  foreign_column?: string | null;
  check_clause?: string | null;
}

export interface RelationshipMetadata {
  constraint_name: string;
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  delete_rule: string;
  update_rule: string;
}

export interface SchemaGraph {
  tables: TableMetadata[];
  relationships: RelationshipMetadata[];
  generatedAt: string;
}

// SQL Workbench Types
export interface WorkbenchPolicy {
  mode: string;
  statementTimeoutMs: number;
  maxRowLimit: number;
  multipleStatementsAllowed: boolean;
  allowedOperations: string[];
  prohibitedCommands: string[];
  description: string;
}

export interface WorkbenchQueryResult {
  success: boolean;
  query: string;
  rowCount: number;
  returnedRows: number;
  isTruncated: boolean;
  durationMs: number;
  fields: { name: string; dataTypeID: number }[];
  data: Record<string, any>[];
  error?: string;
  message?: string;
  code?: string | null;
  position?: number | string | null;
}

// Phase 7 Deletion & Lifecycle Management Types
export interface ImpactRecord {
  label: string;
  count: number;
  description: string;
}

export interface AllowedAction {
  action: string;
  label: string;
  variant: 'danger' | 'warning' | 'success' | 'secondary' | 'info';
  enabled: boolean;
  disabledReason: string | null;
}

export interface DeletePreviewData {
  entityType: string;
  entityId: string;
  entityTitle: string;
  target: any;
  isBlocked: boolean;
  blockReasons: string[];
  impact: {
    recordsToDelete: ImpactRecord[];
    relationshipsToRemove: ImpactRecord[];
    retainedRecords: ImpactRecord[];
    protectedFinancialRecords: ImpactRecord[];
  };
  allowedActions: AllowedAction[];
}

export interface DeletePreviewResponse {
  success: boolean;
  data: DeletePreviewData;
}

export interface LifecycleActionResult {
  success: boolean;
  action: string;
  message: string;
  data?: any;
}
