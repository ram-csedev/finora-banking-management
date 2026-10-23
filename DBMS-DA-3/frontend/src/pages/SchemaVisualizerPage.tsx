import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  ExternalLink,
  Info,
  X,
  HelpCircle,
  Sparkles,
  Layers,
  Database,
  ArrowRight,
  Link2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/Input';
import { api } from '../api/client';
import { TableMetadata, ColumnMetadata, RelationshipMetadata } from '../types';

/* =========================================================================
   TRADITIONAL CHEN-NOTATION RELATIONAL SCHEMA DEFINITIONS
   ========================================================================= */

interface ChenEntity {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

interface ChenAttribute {
  id: string;
  entityId: string;
  name: string;
  isPk: boolean;
  isFk: boolean;
  refTarget?: string;
  dataType?: string;
  x: number;
  y: number;
}

interface ChenRelationship {
  id: string;
  verb: string;
  entity1Id: string;
  entity2Id: string;
  card1: string; // '1' or 'M'
  card2: string; // 'N' or 'M' or '1'
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  constraintName?: string;
  isSelfRef?: boolean;
}

// 14 Base Entities with carefully balanced (x, y) coordinates
const CHEN_ENTITIES: ChenEntity[] = [
  { id: 'branch', name: 'BRANCH', label: 'BRANCH', x: 350, y: 260, width: 140, height: 46, description: 'Physical bank branches, IFSC identifiers, and operational regions' },
  { id: 'employee', name: 'EMPLOYEE', label: 'EMPLOYEE', x: 1050, y: 260, width: 140, height: 46, description: 'Bank personnel, department attachments, compensation, and supervisory roles' },
  { id: 'responsible_for', name: 'RESPONSIBLE_FOR', label: 'RESPONSIBLE_FOR', x: 700, y: 600, width: 160, height: 46, description: 'Shift duty assignments, branch attachments, and operational supervisory responsibilities' },
  { id: 'audit_log', name: 'AUDIT_LOG', label: 'AUDIT_LOG', x: 1750, y: 260, width: 140, height: 46, description: 'Append-only tamper-evident journal tracking operations and security mutations' },
  { id: 'account', name: 'ACCOUNT', label: 'ACCOUNT', x: 350, y: 950, width: 140, height: 46, description: 'Transactional deposit and savings accounts maintaining balances' },
  { id: 'account_holder', name: 'ACCOUNT_HOLDER', label: 'ACCOUNT_HOLDER', x: 950, y: 950, width: 160, height: 46, description: 'Associative entity representing M:N joint account ownership with equity shares' },
  { id: 'customer', name: 'CUSTOMER', label: 'CUSTOMER', x: 1550, y: 950, width: 140, height: 46, description: 'KYC-verified bank customers with PAN identifiers and assigned relationship officers' },
  { id: 'customer_phone', name: 'CUSTOMER_PHONE', label: 'CUSTOMER_PHONE', x: 2150, y: 700, width: 160, height: 46, description: 'Multivalued phone registry with primary phone designation' },
  { id: 'creditcard', name: 'CREDITCARD', label: 'CREDITCARD', x: 2150, y: 1000, width: 140, height: 46, description: 'Active credit lines, card limits, CVV hashes, and expiry dates' },
  { id: 'beneficiary', name: 'BENEFICIARY', label: 'BENEFICIARY', x: 2150, y: 1300, width: 140, height: 46, description: 'Whitelisted payees for internal and external inter-bank remittances' },
  { id: 'nominee', name: 'NOMINEE', label: 'NOMINEE', x: 350, y: 1550, width: 140, height: 46, description: 'Succession estate beneficiaries designated for bank accounts' },
  { id: 'transaction', name: 'TRANSACTION', label: 'TRANSACTION', x: 950, y: 1550, width: 140, height: 46, description: 'Bilateral atomic journal ledger tracking deposits, withdrawals, and transfers' },
  { id: 'loan', name: 'LOAN', label: 'LOAN', x: 1550, y: 1550, width: 140, height: 46, description: 'Disbursed credit facilities, principal balances, terms, and interest schedules' },
  { id: 'loan_payment', name: 'LOAN_PAYMENT', label: 'LOAN_PAYMENT', x: 2150, y: 1600, width: 140, height: 46, description: 'Installment repayments strictly enforcing amount = principal + interest' },
];

// Relationships (Diamonds) connecting the 14 entities
const CHEN_RELATIONSHIPS: ChenRelationship[] = [
  // 1. BRANCH - EMPLOYEE
  { id: 'rel_branch_employee', verb: 'employs', entity1Id: 'branch', entity2Id: 'employee', card1: '1', card2: 'N', x: 700, y: 260, width: 96, height: 48, description: 'Branch office employs bank officers and staff personnel', constraintName: 'fk_employee_branch' },
  // 2. BRANCH - ACCOUNT
  { id: 'rel_branch_account', verb: 'maintains', entity1Id: 'branch', entity2Id: 'account', card1: '1', card2: 'N', x: 350, y: 605, width: 100, height: 48, description: 'Physical branch hosts and maintains account balances', constraintName: 'fk_account_branch' },
  // 3. EMPLOYEE - CUSTOMER
  { id: 'rel_employee_customer', verb: 'manages', entity1Id: 'employee', entity2Id: 'customer', card1: '1', card2: 'N', x: 1300, y: 605, width: 96, height: 48, description: 'Assigned relationship manager oversees customer accounts', constraintName: 'fk_customer_employee' },
  // 4. BRANCH - RESPONSIBLE_FOR
  { id: 'rel_branch_responsible', verb: 'stationed at', entity1Id: 'branch', entity2Id: 'responsible_for', card1: '1', card2: 'N', x: 525, y: 430, width: 104, height: 48, description: 'Staff shift responsibility is anchored to a specific branch', constraintName: 'fk_responsible_branch' },
  // 5. EMPLOYEE - RESPONSIBLE_FOR
  { id: 'rel_employee_responsible', verb: 'assigned duty', entity1Id: 'employee', entity2Id: 'responsible_for', card1: '1', card2: 'N', x: 875, y: 430, width: 110, height: 48, description: 'Employee is assigned operational tasks and shift duties', constraintName: 'fk_responsible_employee' },
  // 6. EMPLOYEE - AUDIT_LOG
  { id: 'rel_employee_audit', verb: 'audited in', entity1Id: 'employee', entity2Id: 'audit_log', card1: '1', card2: 'N', x: 1400, y: 260, width: 100, height: 48, description: 'Employee security and mutation events are recorded in audit logs', constraintName: 'fk_audit_employee' },
  // 7. CUSTOMER - ACCOUNT_HOLDER (M:N via associative entity)
  { id: 'rel_customer_accountholder', verb: 'owns through', entity1Id: 'customer', entity2Id: 'account_holder', card1: '1', card2: 'N', x: 1250, y: 950, width: 110, height: 48, description: 'Customer holds title to accounts via associative holding contract', constraintName: 'fk_holder_customer' },
  // 8. ACCOUNT - ACCOUNT_HOLDER
  { id: 'rel_account_accountholder', verb: 'held by', entity1Id: 'account', entity2Id: 'account_holder', card1: '1', card2: 'N', x: 650, y: 950, width: 96, height: 48, description: 'Account is bound to one or more primary and joint holders', constraintName: 'fk_holder_account' },
  // 9. CUSTOMER - CUSTOMER_PHONE
  { id: 'rel_customer_phone', verb: 'has phone', entity1Id: 'customer', entity2Id: 'customer_phone', card1: '1', card2: 'N', x: 1850, y: 825, width: 100, height: 48, description: 'Customer registers multiple contact phone numbers', constraintName: 'fk_customer_phone' },
  // 10. CUSTOMER - CREDITCARD
  { id: 'rel_customer_creditcard', verb: 'holds card', entity1Id: 'customer', entity2Id: 'creditcard', card1: '1', card2: 'N', x: 1850, y: 975, width: 100, height: 48, description: 'Customer is issued revolving credit card facilities', constraintName: 'fk_creditcard_customer' },
  // 11. CUSTOMER - BENEFICIARY
  { id: 'rel_customer_beneficiary', verb: 'registers', entity1Id: 'customer', entity2Id: 'beneficiary', card1: '1', card2: 'N', x: 1850, y: 1125, width: 96, height: 48, description: 'Customer whitelists payees for recurring fund transfers', constraintName: 'fk_beneficiary_customer' },
  // 12. ACCOUNT - BENEFICIARY
  { id: 'rel_account_beneficiary', verb: 'linked payee', entity1Id: 'account', entity2Id: 'beneficiary', card1: '1', card2: 'N', x: 1250, y: 1200, width: 104, height: 48, description: 'Beneficiary points to internal account for fast transfers', constraintName: 'fk_beneficiary_internal_acc' },
  // 13. ACCOUNT - NOMINEE
  { id: 'rel_account_nominee', verb: 'designates', entity1Id: 'account', entity2Id: 'nominee', card1: '1', card2: 'N', x: 350, y: 1250, width: 100, height: 48, description: 'Account establishes estate succession nominee', constraintName: 'fk_nominee_account' },
  // 14. CUSTOMER - NOMINEE
  { id: 'rel_customer_nominee', verb: 'nominates', entity1Id: 'customer', entity2Id: 'nominee', card1: '1', card2: 'N', x: 950, y: 1250, width: 100, height: 48, description: 'Customer designates personal estate beneficiary', constraintName: 'fk_nominee_customer' },
  // 15. ACCOUNT - TRANSACTION
  { id: 'rel_account_transaction', verb: 'records', entity1Id: 'account', entity2Id: 'transaction', card1: '1', card2: 'N', x: 650, y: 1300, width: 96, height: 48, description: 'Account balances record financial credit/debit movements', constraintName: 'fk_transaction_account' },
  // 16. EMPLOYEE - TRANSACTION
  { id: 'rel_employee_transaction', verb: 'processes', entity1Id: 'employee', entity2Id: 'transaction', card1: '1', card2: 'N', x: 1050, y: 1000, width: 100, height: 48, description: 'Cashier or teller processes transactional movement', constraintName: 'fk_transaction_employee' },
  // 17. CUSTOMER - LOAN
  { id: 'rel_customer_loan', verb: 'borrows', entity1Id: 'customer', entity2Id: 'loan', card1: '1', card2: 'N', x: 1550, y: 1250, width: 96, height: 48, description: 'Customer takes out personal, home, or business credit loan', constraintName: 'fk_loan_customer' },
  // 18. EMPLOYEE - LOAN
  { id: 'rel_employee_loan', verb: 'approves', entity1Id: 'employee', entity2Id: 'loan', card1: '1', card2: 'N', x: 1350, y: 1400, width: 96, height: 48, description: 'Loan officer evaluates and sanctions credit facility', constraintName: 'fk_loan_employee' },
  // 19. LOAN - LOAN_PAYMENT
  { id: 'rel_loan_payment', verb: 'repaid by', entity1Id: 'loan', entity2Id: 'loan_payment', card1: '1', card2: 'N', x: 1850, y: 1600, width: 100, height: 48, description: 'Loan liability is cleared across scheduled repayment installments', constraintName: 'fk_payment_loan' },
  // 20. TRANSACTION - TRANSACTION (Self-Reference bilateral transfer link)
  { id: 'rel_transaction_self', verb: 'transfers to', entity1Id: 'transaction', entity2Id: 'transaction', card1: '1', card2: '1', x: 950, y: 1750, width: 104, height: 48, description: 'Bilateral debit transaction links to companion credit transfer entry', constraintName: 'fk_transaction_related_trans', isSelfRef: true },
];

// All Actual Introspected Columns for the 14 Base Tables (Chen Attribute Ovals)
const CHEN_ATTRIBUTES: ChenAttribute[] = [
  // BRANCH (8 attributes)
  { id: 'branch_b_id', entityId: 'branch', name: 'b_id', isPk: true, isFk: false, x: 180, y: 260 },
  { id: 'branch_name', entityId: 'branch', name: 'branch_name', isPk: false, isFk: false, x: 200, y: 190 },
  { id: 'branch_city', entityId: 'branch', name: 'city', isPk: false, isFk: false, x: 250, y: 150 },
  { id: 'branch_state', entityId: 'branch', name: 'state', isPk: false, isFk: false, x: 350, y: 135 },
  { id: 'branch_pincode', entityId: 'branch', name: 'pincode', isPk: false, isFk: false, x: 440, y: 150 },
  { id: 'branch_ifsc', entityId: 'branch', name: 'ifsc', isPk: false, isFk: false, x: 200, y: 330 },
  { id: 'branch_contact', entityId: 'branch', name: 'contact', isPk: false, isFk: false, x: 250, y: 370 },
  { id: 'branch_created_at', entityId: 'branch', name: 'created_at', isPk: false, isFk: false, x: 350, y: 385 },

  // EMPLOYEE (8 attributes)
  { id: 'emp_id', entityId: 'employee', name: 'emp_id', isPk: true, isFk: false, x: 1050, y: 125 },
  { id: 'emp_first_name', entityId: 'employee', name: 'first_name', isPk: false, isFk: false, x: 1160, y: 155 },
  { id: 'emp_last_name', entityId: 'employee', name: 'last_name', isPk: false, isFk: false, x: 1225, y: 205 },
  { id: 'emp_salary', entityId: 'employee', name: 'salary', isPk: false, isFk: false, x: 955, y: 150 },
  { id: 'emp_hire_date', entityId: 'employee', name: 'hire_date', isPk: false, isFk: false, x: 895, y: 195 },
  { id: 'emp_b_id', entityId: 'employee', name: 'b_id', isPk: false, isFk: true, refTarget: 'branch(b_id)', x: 885, y: 290 },
  { id: 'emp_email', entityId: 'employee', name: 'email', isPk: false, isFk: false, x: 1215, y: 290 },
  { id: 'emp_created_at', entityId: 'employee', name: 'created_at', isPk: false, isFk: false, x: 1050, y: 385 },

  // AUDIT_LOG (10 attributes)
  { id: 'audit_log_id', entityId: 'audit_log', name: 'log_id', isPk: true, isFk: false, x: 1750, y: 125 },
  { id: 'audit_emp_id', entityId: 'audit_log', name: 'emp_id', isPk: false, isFk: true, refTarget: 'employee(emp_id)', x: 1640, y: 150 },
  { id: 'audit_actor_type', entityId: 'audit_log', name: 'actor_type', isPk: false, isFk: false, x: 1860, y: 150 },
  { id: 'audit_actor_id', entityId: 'audit_log', name: 'actor_id', isPk: false, isFk: false, x: 1910, y: 210 },
  { id: 'audit_action', entityId: 'audit_log', name: 'action', isPk: false, isFk: false, x: 1920, y: 280 },
  { id: 'audit_entity_name', entityId: 'audit_log', name: 'entity_name', isPk: false, isFk: false, x: 1900, y: 350 },
  { id: 'audit_entity_id', entityId: 'audit_log', name: 'entity_id', isPk: false, isFk: false, x: 1830, y: 395 },
  { id: 'audit_details', entityId: 'audit_log', name: 'details', isPk: false, isFk: false, x: 1690, y: 395 },
  { id: 'audit_ip_address', entityId: 'audit_log', name: 'ip_address', isPk: false, isFk: false, x: 1610, y: 350 },
  { id: 'audit_created_at', entityId: 'audit_log', name: 'created_at', isPk: false, isFk: false, x: 1580, y: 260 },

  // RESPONSIBLE_FOR (10 attributes)
  { id: 'rf_rf_id', entityId: 'responsible_for', name: 'rf_id', isPk: true, isFk: false, x: 700, y: 470 },
  { id: 'rf_emp_id', entityId: 'responsible_for', name: 'emp_id', isPk: false, isFk: true, refTarget: 'employee(emp_id)', x: 815, y: 505 },
  { id: 'rf_b_id', entityId: 'responsible_for', name: 'b_id', isPk: false, isFk: true, refTarget: 'branch(b_id)', x: 585, y: 505 },
  { id: 'rf_role_type', entityId: 'responsible_for', name: 'role_type', isPk: false, isFk: false, x: 865, y: 600 },
  { id: 'rf_l_id', entityId: 'responsible_for', name: 'l_id', isPk: false, isFk: true, refTarget: 'loan(l_id)', x: 825, y: 690 },
  { id: 'rf_t_id', entityId: 'responsible_for', name: 't_id', isPk: false, isFk: true, refTarget: 'transaction(t_id)', x: 700, y: 775 },
  { id: 'rf_assigned_date', entityId: 'responsible_for', name: 'assigned_date', isPk: false, isFk: false, x: 575, y: 690 },
  { id: 'rf_status', entityId: 'responsible_for', name: 'status', isPk: false, isFk: false, x: 535, y: 600 },
  { id: 'rf_notes', entityId: 'responsible_for', name: 'notes', isPk: false, isFk: false, x: 825, y: 745 },
  { id: 'rf_created_at', entityId: 'responsible_for', name: 'created_at', isPk: false, isFk: false, x: 575, y: 745 },

  // ACCOUNT (6 attributes)
  { id: 'acc_acc_id', entityId: 'account', name: 'acc_id', isPk: true, isFk: false, x: 180, y: 950 },
  { id: 'acc_b_id', entityId: 'account', name: 'b_id', isPk: false, isFk: true, refTarget: 'branch(b_id)', x: 210, y: 865 },
  { id: 'acc_balance', entityId: 'account', name: 'balance', isPk: false, isFk: false, x: 290, y: 825 },
  { id: 'acc_status', entityId: 'account', name: 'status', isPk: false, isFk: false, x: 210, y: 1035 },
  { id: 'acc_acc_type', entityId: 'account', name: 'acc_type', isPk: false, isFk: false, x: 290, y: 1075 },
  { id: 'acc_created_at', entityId: 'account', name: 'created_at', isPk: false, isFk: false, x: 400, y: 825 },

  // ACCOUNT_HOLDER (6 attributes)
  { id: 'ah_acc_id', entityId: 'account_holder', name: 'acc_id', isPk: true, isFk: true, refTarget: 'account(acc_id)', x: 840, y: 855 },
  { id: 'ah_cid', entityId: 'account_holder', name: 'cid', isPk: true, isFk: true, refTarget: 'customer(cid)', x: 1060, y: 855 },
  { id: 'ah_ownership_role', entityId: 'account_holder', name: 'ownership_role', isPk: false, isFk: false, x: 950, y: 825 },
  { id: 'ah_is_primary', entityId: 'account_holder', name: 'is_primary', isPk: false, isFk: false, x: 840, y: 1045 },
  { id: 'ah_share_percentage', entityId: 'account_holder', name: 'share_percentage', isPk: false, isFk: false, x: 950, y: 1075 },
  { id: 'ah_created_at', entityId: 'account_holder', name: 'created_at', isPk: false, isFk: false, x: 1060, y: 1045 },

  // CUSTOMER (11 attributes)
  { id: 'cust_cid', entityId: 'customer', name: 'cid', isPk: true, isFk: false, x: 1550, y: 815 },
  { id: 'cust_pan', entityId: 'customer', name: 'pan', isPk: false, isFk: false, x: 1660, y: 840 },
  { id: 'cust_first_name', entityId: 'customer', name: 'first_name', isPk: false, isFk: false, x: 1710, y: 890 },
  { id: 'cust_last_name', entityId: 'customer', name: 'last_name', isPk: false, isFk: false, x: 1725, y: 935 },
  { id: 'cust_city', entityId: 'customer', name: 'city', isPk: false, isFk: false, x: 1710, y: 1010 },
  { id: 'cust_state', entityId: 'customer', name: 'state', isPk: false, isFk: false, x: 1660, y: 1060 },
  { id: 'cust_pincode', entityId: 'customer', name: 'pincode', isPk: false, isFk: false, x: 1550, y: 1085 },
  { id: 'cust_dob', entityId: 'customer', name: 'dob', isPk: false, isFk: false, x: 1440, y: 1060 },
  { id: 'cust_emp_id', entityId: 'customer', name: 'emp_id', isPk: false, isFk: true, refTarget: 'employee(emp_id)', x: 1440, y: 840 },
  { id: 'cust_email', entityId: 'customer', name: 'email', isPk: false, isFk: false, x: 1390, y: 890 },
  { id: 'cust_created_at', entityId: 'customer', name: 'created_at', isPk: false, isFk: false, x: 1390, y: 1010 },

  // CUSTOMER_PHONE (5 attributes)
  { id: 'cp_cid', entityId: 'customer_phone', name: 'cid', isPk: true, isFk: true, refTarget: 'customer(cid)', x: 1990, y: 700 },
  { id: 'cp_phone', entityId: 'customer_phone', name: 'phone', isPk: true, isFk: false, x: 2150, y: 580 },
  { id: 'cp_phone_type', entityId: 'customer_phone', name: 'phone_type', isPk: false, isFk: false, x: 2300, y: 635 },
  { id: 'cp_is_primary', entityId: 'customer_phone', name: 'is_primary', isPk: false, isFk: false, x: 2300, y: 765 },
  { id: 'cp_created_at', entityId: 'customer_phone', name: 'created_at', isPk: false, isFk: false, x: 2150, y: 820 },

  // CREDITCARD (8 attributes)
  { id: 'cc_pno', entityId: 'creditcard', name: 'pno', isPk: true, isFk: false, x: 1990, y: 1000 },
  { id: 'cc_cid', entityId: 'creditcard', name: 'cid', isPk: false, isFk: true, refTarget: 'customer(cid)', x: 2015, y: 925 },
  { id: 'cc_type', entityId: 'creditcard', name: 'type', isPk: false, isFk: false, x: 2200, y: 885 },
  { id: 'cc_card_limit', entityId: 'creditcard', name: 'card_limit', isPk: false, isFk: false, x: 2305, y: 945 },
  { id: 'cc_expiry', entityId: 'creditcard', name: 'expiry', isPk: false, isFk: false, x: 2315, y: 1000 },
  { id: 'cc_status', entityId: 'creditcard', name: 'status', isPk: false, isFk: false, x: 2305, y: 1055 },
  { id: 'cc_cvv', entityId: 'creditcard', name: 'cvv', isPk: false, isFk: false, x: 2200, y: 1115 },
  { id: 'cc_created_at', entityId: 'creditcard', name: 'created_at', isPk: false, isFk: false, x: 2015, y: 1075 },

  // BENEFICIARY (10 attributes)
  { id: 'ben_beneficiary_id', entityId: 'beneficiary', name: 'beneficiary_id', isPk: true, isFk: false, x: 1985, y: 1300 },
  { id: 'ben_cid', entityId: 'beneficiary', name: 'cid', isPk: false, isFk: true, refTarget: 'customer(cid)', x: 2015, y: 1220 },
  { id: 'ben_nickname', entityId: 'beneficiary', name: 'nickname', isPk: false, isFk: false, x: 2150, y: 1175 },
  { id: 'ben_name', entityId: 'beneficiary', name: 'beneficiary_name', isPk: false, isFk: false, x: 2265, y: 1205 },
  { id: 'ben_dest_acc', entityId: 'beneficiary', name: 'destination_account_num', isPk: false, isFk: false, x: 2315, y: 1255 },
  { id: 'ben_dest_ifsc', entityId: 'beneficiary', name: 'destination_ifsc', isPk: false, isFk: false, x: 2315, y: 1325 },
  { id: 'ben_bank_name', entityId: 'beneficiary', name: 'bank_name', isPk: false, isFk: false, x: 2285, y: 1380 },
  { id: 'ben_internal_acc_id', entityId: 'beneficiary', name: 'internal_acc_id', isPk: false, isFk: true, refTarget: 'account(acc_id)', x: 2150, y: 1425 },
  { id: 'ben_is_verified', entityId: 'beneficiary', name: 'is_verified', isPk: false, isFk: false, x: 2030, y: 1395 },
  { id: 'ben_created_at', entityId: 'beneficiary', name: 'created_at', isPk: false, isFk: false, x: 1995, y: 1345 },

  // NOMINEE (9 attributes)
  { id: 'nom_n_id', entityId: 'nominee', name: 'n_id', isPk: true, isFk: false, x: 185, y: 1550 },
  { id: 'nom_acc_id', entityId: 'nominee', name: 'acc_id', isPk: false, isFk: true, refTarget: 'account(acc_id)', x: 215, y: 1470 },
  { id: 'nom_cid', entityId: 'nominee', name: 'cid', isPk: false, isFk: true, refTarget: 'customer(cid)', x: 350, y: 1425 },
  { id: 'nom_first_name', entityId: 'nominee', name: 'first_name', isPk: false, isFk: false, x: 470, y: 1455 },
  { id: 'nom_last_name', entityId: 'nominee', name: 'last_name', isPk: false, isFk: false, x: 510, y: 1505 },
  { id: 'nom_relationship', entityId: 'nominee', name: 'relationship', isPk: false, isFk: false, x: 510, y: 1585 },
  { id: 'nom_dob', entityId: 'nominee', name: 'dob', isPk: false, isFk: false, x: 470, y: 1645 },
  { id: 'nom_contact_phone', entityId: 'nominee', name: 'contact_phone', isPk: false, isFk: false, x: 350, y: 1675 },
  { id: 'nom_created_at', entityId: 'nominee', name: 'created_at', isPk: false, isFk: false, x: 215, y: 1630 },

  // TRANSACTION (11 attributes)
  { id: 'tx_t_id', entityId: 'transaction', name: 't_id', isPk: true, isFk: false, x: 785, y: 1550 },
  { id: 'tx_acc_id', entityId: 'transaction', name: 'acc_id', isPk: false, isFk: true, refTarget: 'account(acc_id)', x: 795, y: 1465 },
  { id: 'tx_trans_date', entityId: 'transaction', name: 'trans_date', isPk: false, isFk: false, x: 1000, y: 1420 },
  { id: 'tx_type', entityId: 'transaction', name: 'type', isPk: false, isFk: false, x: 1070, y: 1455 },
  { id: 'tx_amount', entityId: 'transaction', name: 'amount', isPk: false, isFk: false, x: 1115, y: 1505 },
  { id: 'tx_mode', entityId: 'transaction', name: 'mode', isPk: false, isFk: false, x: 1115, y: 1585 },
  { id: 'tx_status', entityId: 'transaction', name: 'status', isPk: false, isFk: false, x: 1075, y: 1645 },
  { id: 'tx_related_acc_id', entityId: 'transaction', name: 'related_acc_id', isPk: false, isFk: true, refTarget: 'account(acc_id)', x: 950, y: 1680 },
  { id: 'tx_related_trans_id', entityId: 'transaction', name: 'related_trans_id', isPk: false, isFk: true, refTarget: 'transaction(t_id)', x: 825, y: 1645 },
  { id: 'tx_description', entityId: 'transaction', name: 'description', isPk: false, isFk: false, x: 790, y: 1595 },
  { id: 'tx_processed_by_emp_id', entityId: 'transaction', name: 'processed_by_emp_id', isPk: false, isFk: true, refTarget: 'employee(emp_id)', x: 860, y: 1395 },

  // LOAN (10 attributes)
  { id: 'loan_l_id', entityId: 'loan', name: 'l_id', isPk: true, isFk: false, x: 1550, y: 1425 },
  { id: 'loan_cid', entityId: 'loan', name: 'cid', isPk: false, isFk: true, refTarget: 'customer(cid)', x: 1430, y: 1455 },
  { id: 'loan_l_type', entityId: 'loan', name: 'l_type', isPk: false, isFk: false, x: 1390, y: 1515 },
  { id: 'loan_amount', entityId: 'loan', name: 'amount', isPk: false, isFk: false, x: 1390, y: 1585 },
  { id: 'loan_interest', entityId: 'loan', name: 'interest', isPk: false, isFk: false, x: 1430, y: 1645 },
  { id: 'loan_term', entityId: 'loan', name: 'term', isPk: false, isFk: false, x: 1550, y: 1680 },
  { id: 'loan_start_date', entityId: 'loan', name: 'start_date', isPk: false, isFk: false, x: 1670, y: 1645 },
  { id: 'loan_status', entityId: 'loan', name: 'status', isPk: false, isFk: false, x: 1710, y: 1585 },
  { id: 'loan_assigned_emp_id', entityId: 'loan', name: 'assigned_emp_id', isPk: false, isFk: true, refTarget: 'employee(emp_id)', x: 1670, y: 1455 },
  { id: 'loan_created_at', entityId: 'loan', name: 'created_at', isPk: false, isFk: false, x: 1710, y: 1515 },

  // LOAN_PAYMENT (9 attributes)
  { id: 'lp_payment_id', entityId: 'loan_payment', name: 'payment_id', isPk: true, isFk: false, x: 1985, y: 1600 },
  { id: 'lp_l_id', entityId: 'loan_payment', name: 'l_id', isPk: false, isFk: true, refTarget: 'loan(l_id)', x: 2015, y: 1520 },
  { id: 'lp_payment_date', entityId: 'loan_payment', name: 'payment_date', isPk: false, isFk: false, x: 2150, y: 1475 },
  { id: 'lp_amount', entityId: 'loan_payment', name: 'amount', isPk: false, isFk: false, x: 2270, y: 1505 },
  { id: 'lp_principal_amount', entityId: 'loan_payment', name: 'principal_amount', isPk: false, isFk: false, x: 2315, y: 1555 },
  { id: 'lp_interest_amount', entityId: 'loan_payment', name: 'interest_amount', isPk: false, isFk: false, x: 2315, y: 1635 },
  { id: 'lp_payment_mode', entityId: 'loan_payment', name: 'payment_mode', isPk: false, isFk: false, x: 2270, y: 1695 },
  { id: 'lp_status', entityId: 'loan_payment', name: 'status', isPk: false, isFk: false, x: 2150, y: 1725 },
  { id: 'lp_remarks', entityId: 'loan_payment', name: 'remarks', isPk: false, isFk: false, x: 2015, y: 1680 },
];

export const SchemaVisualizerPage: React.FC = () => {
  const navigate = useNavigate();

  // Canvas Pan & Zoom State
  const [zoom, setZoom] = useState<number>(0.56);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover Interactions State
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [hoveredRelationship, setHoveredRelationship] = useState<string | null>(null);
  const [hoveredFkAttrId, setHoveredFkAttrId] = useState<string | null>(null);

  // Click Selection State (compact detail drawer / popover)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  // Foreign Key Attribute Click Popover State
  const [selectedFkAttr, setSelectedFkAttr] = useState<ChenAttribute | null>(null);
  const [highlightedTargetEntityId, setHighlightedTargetEntityId] = useState<string | null>(null);

  // Search & Views State
  const [searchQuery, setSearchQuery] = useState('');
  const [showLegend, setShowLegend] = useState(true);
  const [showViewsNotice, setShowViewsNotice] = useState(false);

  // Live Metadata Integration
  const [tableMetadata, setTableMetadata] = useState<Record<string, TableMetadata>>({});
  const [liveCols, setLiveCols] = useState<Record<string, ColumnMetadata[]>>({});
  const [relationships, setRelationships] = useState<RelationshipMetadata[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Precise Diagram Content Bounds (Encompassing 14 Entities & 117 Attributes)
  const DIAG_BOUNDS = useMemo(
    () => ({
      minX: 120,
      maxX: 2380,
      minY: 90,
      maxY: 1780,
      width: 2260,
      height: 1690,
      centerX: 1250,
      centerY: 935,
    }),
    []
  );

  // Responsive Fit-to-Screen Centering
  const handleFitScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    const padding = 36;
    const scaleX = (clientWidth - padding * 2) / DIAG_BOUNDS.width;
    const scaleY = (clientHeight - padding * 2) / DIAG_BOUNDS.height;
    const fitZoom = Math.min(scaleX, scaleY, 0.95);
    const clampedZoom = Math.max(Number(fitZoom.toFixed(2)), 0.38);
    setZoom(clampedZoom);
    setPan({
      x: Math.round(clientWidth / 2 - DIAG_BOUNDS.centerX * clampedZoom),
      y: Math.round(clientHeight / 2 - DIAG_BOUNDS.centerY * clampedZoom),
    });
  }, [DIAG_BOUNDS]);

  // Initial Auto-Fit Centering on Component Mount & Resize
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitScreen();
    }, 120);
    return () => clearTimeout(timer);
  }, [handleFitScreen]);

  // Fetch Live Table Metadata, Column Specs & Relationships from CockroachDB
  useEffect(() => {
    let isMounted = true;

    // Fetch Relationships (Foreign Key constraints)
    api.getMetadataRelationships().then((res) => {
      if (isMounted && res.success) {
        setRelationships(res.data);
      }
    }).catch(console.error);

    // Fetch Tables metadata (Row counts)
    api.getMetadataTables().then((res) => {
      if (isMounted && res.success) {
        const map: Record<string, TableMetadata> = {};
        res.data.forEach((t) => {
          map[t.tableName.toLowerCase()] = t;
        });
        setTableMetadata(map);
      }
    }).catch(console.error);

    // Fetch columns for all 14 entities to populate data types and nullability
    CHEN_ENTITIES.forEach((e) => {
      api.getMetadataColumns(e.id).then((res) => {
        if (isMounted && res.success) {
          setLiveCols((prev) => ({ ...prev, [e.id.toLowerCase()]: res.data }));
        }
      }).catch(console.error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcut: Escape closes popover and active highlights
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFkAttr(null);
        setHighlightedTargetEntityId(null);
        setSelectedEntityId(null);
        setSelectedRelationshipId(null);
        setShowViewsNotice(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Zoom
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.35), 2.0));
  };

  const handleResetZoom = () => {
    handleFitScreen();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.35), 2.0));
  };

  // Canvas Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.popover-interactive')) return;
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    // Clicking canvas background dismisses popovers
    setSelectedFkAttr(null);
    setHighlightedTargetEntityId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Quick Search Focus
  const handleSearchFocus = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) return;
    const match = CHEN_ENTITIES.find(
      (e) => e.name.toLowerCase().includes(text.toLowerCase()) || e.id.toLowerCase().includes(text.toLowerCase())
    );
    if (match && containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setPan({
        x: Math.round(clientWidth / 2 - match.x * zoom),
        y: Math.round(clientHeight / 2 - match.y * zoom),
      });
      setSelectedEntityId(match.id);
      setSelectedRelationshipId(null);
      setSelectedFkAttr(null);
    }
  };

  // Maps for fast entity lookups
  const entityMap = useMemo(() => {
    const map = new Map<string, ChenEntity>();
    CHEN_ENTITIES.forEach((e) => map.set(e.id, e));
    return map;
  }, []);

  // Active Highlight Checks according to exact prompt rules
  const isEntityDimmed = (entityId: string) => {
    if (highlightedTargetEntityId && selectedFkAttr) {
      return entityId !== selectedFkAttr.entityId && entityId !== highlightedTargetEntityId;
    }
    if (!hoveredEntity && !hoveredRelationship) return false;
    if (hoveredEntity) return hoveredEntity !== entityId;
    if (hoveredRelationship) {
      const rel = CHEN_RELATIONSHIPS.find((r) => r.id === hoveredRelationship);
      return !rel || (rel.entity1Id !== entityId && rel.entity2Id !== entityId);
    }
    return false;
  };

  const isAttributeDimmed = (attr: ChenAttribute) => {
    if (selectedFkAttr) {
      return attr.id !== selectedFkAttr.id;
    }
    if (!hoveredEntity && !hoveredRelationship) return false;
    if (hoveredEntity) return hoveredEntity !== attr.entityId;
    if (hoveredRelationship) return true; // Attributes dim on relationship hover
    return false;
  };

  const isRelationshipDimmed = (relId: string) => {
    if (selectedFkAttr || highlightedTargetEntityId) return true;
    if (!hoveredEntity && !hoveredRelationship) return false;
    if (hoveredRelationship) return hoveredRelationship !== relId;
    if (hoveredEntity) return true; // Unrelated relationship diamonds dim on entity hover
    return false;
  };

  // Selection objects
  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    return CHEN_ENTITIES.find((e) => e.id === selectedEntityId);
  }, [selectedEntityId]);

  const selectedRel = useMemo(() => {
    if (!selectedRelationshipId) return null;
    return CHEN_RELATIONSHIPS.find((r) => r.id === selectedRelationshipId);
  }, [selectedRelationshipId]);

  // Matching Foreign Key Constraints from CockroachDB metadata for clicked FK attribute
  const activeFkRels = useMemo(() => {
    if (!selectedFkAttr) return [];
    const fromTable = selectedFkAttr.entityId.toLowerCase();
    const fromCol = selectedFkAttr.name.toLowerCase();

    const matched = relationships.filter(
      (r) => r.from_table.toLowerCase() === fromTable && r.from_column.toLowerCase() === fromCol
    );

    if (matched.length > 0) return matched;

    // Fallback to refTarget while metadata initializes or if offline
    if (selectedFkAttr.refTarget) {
      const parts = selectedFkAttr.refTarget.split('(');
      const toTable = parts[0].trim();
      const toCol = parts[1]?.replace(')', '').trim() || '';
      return [
        {
          constraint_name: `fk_${fromTable}_${toTable}`,
          from_table: fromTable,
          from_column: fromCol,
          to_table: toTable,
          to_column: toCol,
          delete_rule: 'RESTRICT',
          update_rule: 'NO ACTION',
        },
      ];
    }

    return [];
  }, [selectedFkAttr, relationships]);

  // Column details (nullability, data type) for clicked FK attribute
  const activeFkColDetails = useMemo(() => {
    if (!selectedFkAttr) return null;
    const tableCols = liveCols[selectedFkAttr.entityId.toLowerCase()];
    if (!tableCols) return null;
    return tableCols.find((c) => c.column_name.toLowerCase() === selectedFkAttr.name.toLowerCase()) || null;
  }, [selectedFkAttr, liveCols]);

  // Center canvas on referenced table and highlight the connection
  const handleHighlightReferencedTable = (targetTable: string) => {
    const targetEntity = entityMap.get(targetTable.toLowerCase());
    if (!targetEntity) return;

    setHighlightedTargetEntityId(targetEntity.id);

    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setPan({
        x: Math.round(clientWidth / 2 - targetEntity.x * zoom),
        y: Math.round(clientHeight / 2 - targetEntity.y * zoom),
      });
    }
  };

  // Calculate Popover Position relative to Canvas Viewport
  const getPopoverStyle = () => {
    if (!selectedFkAttr || !containerRef.current) return { display: 'none' };
    const { clientWidth, clientHeight } = containerRef.current;

    // Screen coordinates of the clicked FK attribute oval
    const screenX = pan.x + selectedFkAttr.x * zoom;
    const screenY = pan.y + selectedFkAttr.y * zoom;

    const popoverWidth = 340;
    const popoverHeight = 330;

    // Default: position to the right of the oval (+45px)
    let left = screenX + 45;
    // If overflows right border of viewport, place to the left
    if (left + popoverWidth > clientWidth - 20) {
      left = screenX - popoverWidth - 45;
    }
    // Clamp within viewport
    left = Math.max(16, Math.min(left, clientWidth - popoverWidth - 16));

    // Center vertically on the oval
    let top = screenY - 80;
    top = Math.max(16, Math.min(top, clientHeight - popoverHeight - 16));

    return {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] animate-in fade-in duration-300 select-none overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="h-14 px-4 bg-obsidian-900 border-b border-obsidian-800 flex items-center justify-between gap-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Finora DA3 &mdash; Traditional Relational ER Diagram
              <Badge variant="emerald" size="xs">Chen Notation</Badge>
            </h2>
            <p className="text-[11px] text-obsidian-400">
              14 Entities (Rectangles) &bull; Attributes (Ovals with <u>PK</u> underline) &bull; 23 Interactive Foreign Keys ([FK] Popover) &bull; 20 Relationships &bull; 5 Analytical Views Documented
            </p>
          </div>
        </div>

        {/* Action Buttons & Canvas Controls */}
        <div className="flex items-center gap-3">
          <div className="w-56 hidden sm:block">
            <SearchInput
              placeholder="Find entity or column..."
              value={searchQuery}
              onChange={(e) => handleSearchFocus(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-obsidian-950 border border-obsidian-800 p-1 rounded-lg">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 text-obsidian-400 hover:text-white hover:bg-obsidian-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-cyan-400 px-2 min-w-[44px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1.5 text-obsidian-400 hover:text-white hover:bg-obsidian-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-obsidian-400 hover:text-white hover:bg-obsidian-800 rounded transition-colors"
              title="Reset Zoom & Center Diagram"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitScreen}
              className="p-1.5 text-obsidian-400 hover:text-white hover:bg-obsidian-800 rounded transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowViewsNotice(!showViewsNotice)}
            icon={<Layers className="w-3.5 h-3.5 text-purple-400" />}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            5 Views
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowLegend(!showLegend)}
            icon={<HelpCircle className="w-3.5 h-3.5 text-cyan-400" />}
          >
            {showLegend ? 'Hide Legend' : 'Legend'}
          </Button>
        </div>
      </div>

      {/* Main Pan/Zoom Canvas Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden bg-obsidian-950 ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(16, 185, 129, 0.08) 1.2px, transparent 1.2px)`,
          backgroundSize: '28px 28px',
        }}
      >
        {/* SVG Drawing Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <g
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.08s ease-out',
            }}
            className="pointer-events-auto"
          >
            {/* 1. Attribute Connecting Lines (Entity Center -> Attribute Center) */}
            <g className="attribute-lines">
              {CHEN_ATTRIBUTES.map((attr) => {
                const entity = entityMap.get(attr.entityId);
                if (!entity) return null;
                const dimmed = isAttributeDimmed(attr);
                const isHoveredAttrEntity = hoveredEntity === attr.entityId;
                const isSelectedFk = selectedFkAttr?.id === attr.id;

                return (
                  <line
                    key={`line_${attr.id}`}
                    x1={entity.x}
                    y1={entity.y}
                    x2={attr.x}
                    y2={attr.y}
                    stroke={
                      isSelectedFk
                        ? '#38bdf8'
                        : isHoveredAttrEntity
                        ? attr.isPk
                          ? '#f59e0b'
                          : attr.isFk
                          ? '#38bdf8'
                          : '#10b981'
                        : '#334155'
                    }
                    strokeWidth={isSelectedFk ? 2.4 : isHoveredAttrEntity ? 1.8 : 1.2}
                    opacity={dimmed ? 0.08 : 0.8}
                    style={{ transition: 'opacity 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease' }}
                  />
                );
              })}
            </g>

            {/* 1.5. Dynamic Glowing Foreign-Key Reference Line to Target Entity */}
            {selectedFkAttr && highlightedTargetEntityId && (
              <g className="fk-target-connection animate-in fade-in duration-200">
                {(() => {
                  const targetEntity = entityMap.get(highlightedTargetEntityId.toLowerCase());
                  if (!targetEntity) return null;
                  return (
                    <>
                      <line
                        x1={selectedFkAttr.x}
                        y1={selectedFkAttr.y}
                        x2={targetEntity.x}
                        y2={targetEntity.y}
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="6, 4"
                        filter="drop-shadow(0 0 8px rgba(56, 189, 248, 0.7))"
                      />
                      <circle
                        cx={targetEntity.x}
                        cy={targetEntity.y}
                        r="8"
                        fill="#0284c7"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="animate-ping"
                      />
                    </>
                  );
                })()}
              </g>
            )}

            {/* 2. Relationship Lines (Entity -> Diamond -> Entity) */}
            <g className="relationship-lines">
              {CHEN_RELATIONSHIPS.map((rel) => {
                const e1 = entityMap.get(rel.entity1Id);
                const e2 = entityMap.get(rel.entity2Id);
                if (!e1 || !e2) return null;
                const dimmed = isRelationshipDimmed(rel.id);
                const isHovered = hoveredRelationship === rel.id;

                if (rel.isSelfRef) {
                  // Self-referencing loop for TRANSACTION
                  const strokeCol = isHovered ? '#10b981' : '#475569';
                  const pathD = `M ${e1.x - 30} ${e1.y + e1.height / 2} Q ${e1.x - 70} ${rel.y} ${rel.x - rel.width / 2} ${rel.y} M ${rel.x + rel.width / 2} ${rel.y} Q ${e1.x + 70} ${rel.y} ${e1.x + 30} ${e1.y + e1.height / 2}`;
                  return (
                    <g key={`rel_lines_${rel.id}`} opacity={dimmed ? 0.08 : 1} style={{ transition: 'opacity 0.2s ease' }}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeCol}
                        strokeWidth={isHovered ? 2.5 : 1.6}
                      />
                      {/* Self ref cardinality labels */}
                      <text x={e1.x - 45} y={e1.y + 38} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">1</text>
                      <text x={e1.x + 45} y={e1.y + 38} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">1</text>
                    </g>
                  );
                }

                // Line 1: Entity 1 to Diamond
                const line1Stroke = isHovered ? '#10b981' : '#475569';
                // Midpoint for cardinality 1 label (near entity 1)
                const c1x = e1.x + (rel.x - e1.x) * 0.32;
                const c1y = e1.y + (rel.y - e1.y) * 0.32 - 8;

                // Midpoint for cardinality 2 label (near entity 2)
                const c2x = rel.x + (e2.x - rel.x) * 0.68;
                const c2y = rel.y + (e2.y - rel.y) * 0.68 - 8;

                return (
                  <g key={`rel_lines_${rel.id}`} opacity={dimmed ? 0.08 : 1} style={{ transition: 'opacity 0.2s ease' }}>
                    {/* Segment 1: Entity 1 to Diamond */}
                    <line
                      x1={e1.x}
                      y1={e1.y}
                      x2={rel.x}
                      y2={rel.y}
                      stroke={line1Stroke}
                      strokeWidth={isHovered ? 2.4 : 1.5}
                    />
                    {/* Segment 2: Diamond to Entity 2 */}
                    <line
                      x1={rel.x}
                      y1={rel.y}
                      x2={e2.x}
                      y2={e2.y}
                      stroke={line1Stroke}
                      strokeWidth={isHovered ? 2.4 : 1.5}
                    />

                    {/* Cardinality Markers */}
                    <rect
                      x={c1x - 9}
                      y={c1y - 9}
                      width={18}
                      height={14}
                      rx={3}
                      fill="#060b13"
                      stroke={isHovered ? '#10b981' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      x={c1x}
                      y={c1y + 2}
                      fill={isHovered ? '#10b981' : '#94a3b8'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {rel.card1}
                    </text>

                    <rect
                      x={c2x - 9}
                      y={c2y - 9}
                      width={18}
                      height={14}
                      rx={3}
                      fill="#060b13"
                      stroke={isHovered ? '#10b981' : '#334155'}
                      strokeWidth={1}
                    />
                    <text
                      x={c2x}
                      y={c2y + 2}
                      fill={isHovered ? '#10b981' : '#94a3b8'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {rel.card2}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 3. Attribute Ovals (Ellipses) */}
            <g className="attributes">
              {CHEN_ATTRIBUTES.map((attr) => {
                const dimmed = isAttributeDimmed(attr);
                const isHoveredAttrEntity = hoveredEntity === attr.entityId;
                const isFkSelected = selectedFkAttr?.id === attr.id;
                const isFkHovered = hoveredFkAttrId === attr.id;

                const rx = Math.max(38, attr.name.length * 4.6 + 12);
                const ry = 16;

                // Color schemes: PK = Amber Underline, FK = Cyan marker, Normal = Lime/Emerald
                const fillCol = isFkSelected
                  ? '#0c4a6e'
                  : isFkHovered
                  ? '#082f49'
                  : isHoveredAttrEntity
                  ? attr.isPk
                    ? '#221d0a'
                    : attr.isFk
                    ? '#08202d'
                    : '#0c271e'
                  : '#091512';

                const strokeCol = isFkSelected
                  ? '#38bdf8'
                  : isFkHovered
                  ? '#38bdf8'
                  : isHoveredAttrEntity
                  ? attr.isPk
                    ? '#f59e0b'
                    : attr.isFk
                    ? '#38bdf8'
                    : '#34d399'
                  : attr.isPk
                  ? '#b45309'
                  : attr.isFk
                  ? '#0284c7'
                  : '#15803d';

                const textCol = isFkSelected
                  ? '#ffffff'
                  : isHoveredAttrEntity || isFkHovered
                  ? '#ffffff'
                  : attr.isPk
                  ? '#fde68a'
                  : attr.isFk
                  ? '#bae6fd'
                  : '#cbd5e1';

                return (
                  <g
                    key={`attr_${attr.id}`}
                    opacity={dimmed ? 0.08 : 1}
                    style={{ transition: 'opacity 0.2s ease, transform 0.15s ease' }}
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      if (attr.isFk) setHoveredFkAttrId(attr.id);
                    }}
                    onMouseLeave={() => {
                      if (attr.isFk) setHoveredFkAttrId(null);
                    }}
                    onClick={(e) => {
                      if (attr.isFk) {
                        e.stopPropagation(); // Prevent canvas background click and entity selection
                        setSelectedFkAttr(attr);
                        setSelectedEntityId(null);
                        setSelectedRelationshipId(null);
                        setHighlightedTargetEntityId(null);
                      } else {
                        setSelectedEntityId(attr.entityId);
                        setSelectedRelationshipId(null);
                        setSelectedFkAttr(null);
                        setHighlightedTargetEntityId(null);
                      }
                    }}
                  >
                    <title>
                      {attr.isFk
                        ? `Foreign Key: Click to inspect reference -> ${attr.refTarget || 'CockroachDB Reference'}`
                        : attr.isPk
                        ? `Primary Key: ${attr.name}`
                        : `Attribute: ${attr.name}`}
                    </title>

                    {/* Attribute Oval */}
                    <ellipse
                      cx={attr.x}
                      cy={attr.y}
                      rx={rx}
                      ry={ry}
                      fill={fillCol}
                      stroke={strokeCol}
                      strokeWidth={isFkSelected ? 2.6 : isFkHovered ? 2.2 : isHoveredAttrEntity ? 1.8 : 1.2}
                      strokeDasharray={attr.isFk && !attr.isPk ? '3.5, 2.5' : undefined}
                      filter={
                        isFkSelected
                          ? 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.8))'
                          : isFkHovered
                          ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))'
                          : undefined
                      }
                    />

                    {/* Attribute Name Text */}
                    <text
                      x={attr.x}
                      y={attr.y + 3.5}
                      fill={textCol}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight={attr.isPk || isFkSelected ? 'bold' : '500'}
                      textAnchor="middle"
                    >
                      {attr.name}
                    </text>

                    {/* Traditional Primary Key Underline */}
                    {attr.isPk && (
                      <line
                        x1={attr.x - (attr.name.length * 2.8)}
                        y1={attr.y + 6}
                        x2={attr.x + (attr.name.length * 2.8)}
                        y2={attr.y + 6}
                        stroke={strokeCol}
                        strokeWidth="1.4"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* 4. Relationship Diamonds */}
            <g className="relationships">
              {CHEN_RELATIONSHIPS.map((rel) => {
                const dimmed = isRelationshipDimmed(rel.id);
                const isHovered = hoveredRelationship === rel.id;
                const isSelected = selectedRelationshipId === rel.id;

                // Diamond geometry
                const halfW = rel.width / 2;
                const halfH = rel.height / 2;
                const points = `${rel.x},${rel.y - halfH} ${rel.x + halfW},${rel.y} ${rel.x},${rel.y + halfH} ${rel.x - halfW},${rel.y}`;

                return (
                  <g
                    key={`rel_${rel.id}`}
                    opacity={dimmed ? 0.08 : 1}
                    style={{ transition: 'opacity 0.2s ease' }}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRelationship(rel.id)}
                    onMouseLeave={() => setHoveredRelationship(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRelationshipId(rel.id);
                      setSelectedEntityId(null);
                      setSelectedFkAttr(null);
                      setHighlightedTargetEntityId(null);
                    }}
                  >
                    {/* Diamond Shape */}
                    <polygon
                      points={points}
                      fill={isHovered || isSelected ? '#292008' : '#141105'}
                      stroke={isHovered || isSelected ? '#fbbf24' : '#b45309'}
                      strokeWidth={isHovered || isSelected ? 2.5 : 1.6}
                      filter={isHovered ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))' : undefined}
                    />

                    {/* Relationship Verb */}
                    <text
                      x={rel.x}
                      y={rel.y + 3.5}
                      fill={isHovered || isSelected ? '#fef08a' : '#fcd34d'}
                      fontSize="10"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      textAnchor="middle"
                      letterSpacing="0.02em"
                    >
                      {rel.verb}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 5. Entity Rectangles (Chen Notation) */}
            <g className="entities">
              {CHEN_ENTITIES.map((entity) => {
                const dimmed = isEntityDimmed(entity.id);
                const isHovered = hoveredEntity === entity.id;
                const isSelected = selectedEntityId === entity.id;
                const isTargetHighlighted = highlightedTargetEntityId === entity.id;
                const meta = tableMetadata[entity.id.toLowerCase()];

                const rectX = entity.x - entity.width / 2;
                const rectY = entity.y - entity.height / 2;

                const fillCol = isTargetHighlighted
                  ? '#042f2e'
                  : isHovered || isSelected
                  ? '#0f2922'
                  : '#081714';

                const strokeCol = isTargetHighlighted
                  ? '#22d3ee'
                  : isHovered || isSelected
                  ? '#34d399'
                  : '#059669';

                return (
                  <g
                    key={`entity_${entity.id}`}
                    opacity={dimmed ? 0.12 : 1}
                    style={{ transition: 'opacity 0.2s ease' }}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEntity(entity.id)}
                    onMouseLeave={() => setHoveredEntity(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntityId(entity.id);
                      setSelectedRelationshipId(null);
                      setSelectedFkAttr(null);
                      setHighlightedTargetEntityId(null);
                    }}
                  >
                    {/* Entity Rectangle */}
                    <rect
                      x={rectX}
                      y={rectY}
                      width={entity.width}
                      height={entity.height}
                      rx={3}
                      fill={fillCol}
                      stroke={strokeCol}
                      strokeWidth={isTargetHighlighted ? 3 : isHovered || isSelected ? 2.5 : 1.8}
                      filter={
                        isTargetHighlighted
                          ? 'drop-shadow(0 0 14px rgba(34, 211, 238, 0.6))'
                          : isHovered || isSelected
                          ? 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.35))'
                          : undefined
                      }
                    />

                    {/* Entity Name */}
                    <text
                      x={entity.x}
                      y={entity.y - 1}
                      fill="#ffffff"
                      fontSize="12"
                      fontFamily="monospace"
                      fontWeight="bold"
                      letterSpacing="0.05em"
                      textAnchor="middle"
                    >
                      {entity.name}
                    </text>

                    {/* Metadata Sub-label: Row Count from Live DB */}
                    <text
                      x={entity.x}
                      y={entity.y + 13}
                      fill={isTargetHighlighted ? '#67e8f9' : isHovered ? '#6ee7b7' : '#059669'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {meta ? `${meta.rowCount} rows` : 'Base Table'}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating Compact Legend (Bottom-Left) */}
        {showLegend && (
          <div className="popover-interactive absolute bottom-4 left-4 p-3.5 rounded-xl bg-obsidian-900/95 border border-obsidian-800 shadow-xl backdrop-blur-md text-xs font-mono space-y-2.5 z-10 max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-obsidian-800">
              <span className="text-white font-bold flex items-center gap-1.5 text-[11px]">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                Chen ER Notation Legend
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-obsidian-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-3.5 rounded-sm bg-emerald-950 border border-emerald-500" />
                <span className="text-obsidian-300">Rectangle: Entity (14 Base Tables)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-3 rounded-full bg-slate-900 border border-slate-600" />
                <span className="text-obsidian-300">Oval: Attribute (Columns)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-3 rounded-full bg-amber-950 border border-amber-500 flex items-center justify-center">
                  <div className="w-2.5 h-0.5 bg-amber-400" />
                </div>
                <span className="text-amber-300 font-semibold"><u>Underlined</u>: Primary Key (PK)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-3 rounded-full bg-cyan-950 border border-cyan-400 border-dashed" />
                <span className="text-cyan-300 font-semibold">Dashed Oval: Foreign Key (Clickable &bull; 23 FKs)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rotate-45 bg-amber-950 border border-amber-400" />
                <span className="text-amber-400">Diamond: Relationship Verb (20 Structural)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="px-1.5 py-0.5 rounded bg-obsidian-950 border border-obsidian-700 text-cyan-300 text-[10px] font-bold">1 : N</span>
                <span className="text-obsidian-300">Cardinality (1-to-Many / M:N)</span>
              </div>
              <div className="pt-1 border-t border-obsidian-800/80 flex items-center gap-2 text-[10px] text-obsidian-400">
                <Layers className="w-3 h-3 text-purple-400 shrink-0" />
                <span>5 Analytical Views documented in Catalog</span>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICAL VIEWS DOCUMENTATION MODAL */}
        {showViewsNotice && (
          <div
            className="popover-interactive absolute top-4 right-4 w-96 p-4 rounded-xl bg-obsidian-900/98 border border-purple-500/40 shadow-2xl backdrop-blur-xl z-40 text-xs font-mono space-y-3 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-obsidian-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">Analytical Views Notice</span>
                  <span className="text-[10px] text-purple-300 font-normal">Excluded from Base Relational ERD</span>
                </div>
              </div>
              <button
                onClick={() => setShowViewsNotice(false)}
                className="p-1 text-obsidian-400 hover:text-white rounded hover:bg-obsidian-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-obsidian-300 text-[11px] font-sans leading-relaxed">
              In relational database design, <strong>Chen ER notation models persistent base entity sets</strong>. Finora DA3 includes <strong>5 compiled analytical views</strong> that are derived query projections rather than physical storage tables:
            </p>

            <div className="space-y-1.5">
              {[
                { name: 'dashboard_summary', desc: 'System KPI aggregates: total customers, liquid deposits, active credit lines' },
                { name: 'customer_dashboard', desc: '360° customer portfolio: accounts held, balances, and active loan status' },
                { name: 'transaction_dashboard', desc: 'Real-time transaction velocities, debit/credit totals, and audit states' },
                { name: 'loan_dashboard', desc: 'Portfolio risk: principal balances, interest accruals, and repayment ratios' },
                { name: 'creditcard_dashboard', desc: 'Credit line exposure: limits, active cards, and utilization percentages' },
              ].map((v) => (
                <div key={v.name} className="p-2 rounded bg-obsidian-950 border border-obsidian-800">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-bold text-[11px]">{v.name}</span>
                    <Badge variant="violet" size="xs">SQL VIEW</Badge>
                  </div>
                  <p className="text-[10px] text-obsidian-400 font-sans mt-0.5">{v.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded bg-obsidian-950/80 border border-obsidian-800/80 text-[10px] text-obsidian-400 leading-relaxed font-sans">
              <strong className="text-white font-mono">23 FK Constraints vs 20 Diamonds:</strong> All 23 live foreign-key constraints are represented as clickable attribute ovals. 20 correspond to distinct entity relationships; 3 represent role or optional target constraints (e.g. transfer companion account <code className="text-cyan-300">related_acc_id</code>, duty targets <code className="text-cyan-300">rf.l_id</code> and <code className="text-cyan-300">rf.t_id</code>). Click any FK oval to inspect live CockroachDB metadata and focus the target table.
            </div>

            <div className="pt-2 border-t border-obsidian-800 flex items-center justify-between">
              <span className="text-[10px] text-obsidian-400">View SQL definitions:</span>
              <Button
                variant="outline"
                size="xs"
                icon={<ExternalLink className="w-3 h-3" />}
                onClick={() => navigate('/database')}
              >
                Catalog Explorer
              </Button>
            </div>
          </div>
        )}

        {/* CLICKABLE FOREIGN-KEY ATTRIBUTE POPOVER (Anchored next to clicked oval) */}
        {selectedFkAttr && (
          <div
            style={getPopoverStyle()}
            className="popover-interactive absolute w-84 p-4 rounded-xl bg-obsidian-900/98 border border-cyan-500/40 shadow-2xl backdrop-blur-lg z-40 text-xs font-mono space-y-3 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 border-b border-obsidian-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Link2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs block leading-tight">Foreign Key Reference</span>
                  <span className="text-[10px] text-cyan-300 font-normal">
                    {selectedFkAttr.entityId}.{selectedFkAttr.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFkAttr(null);
                  setHighlightedTargetEntityId(null);
                }}
                className="p-1 text-obsidian-400 hover:text-white rounded hover:bg-obsidian-800"
                title="Close (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Foreign Key Constraints (Handles single, composite, or multiple FKs) */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {activeFkRels.map((rel, idx) => (
                <div key={idx} className="space-y-2.5">
                  {/* Source -> Target Visual Mapping */}
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-2">
                    {/* Referencing Column */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-obsidian-400 text-[10px] uppercase tracking-wider">Referencing Column:</span>
                      <Badge variant="cyan" size="xs">FOREIGN KEY</Badge>
                    </div>
                    <div className="text-white font-bold text-xs flex items-center gap-1.5 pl-1">
                      <span className="text-cyan-400">{rel.from_table}</span>
                      <span className="text-obsidian-500">.</span>
                      <span className="text-white">{rel.from_column}</span>
                    </div>

                    {/* Downward Reference Arrow */}
                    <div className="flex items-center gap-2 py-0.5 justify-center text-obsidian-500">
                      <div className="h-px bg-obsidian-800 flex-1" />
                      <div className="flex items-center gap-1 text-[10px] text-cyan-400/90 font-sans font-semibold">
                        <ArrowRight className="w-3 h-3 rotate-90 text-cyan-400" />
                        REFERENCES
                      </div>
                      <div className="h-px bg-obsidian-800 flex-1" />
                    </div>

                    {/* Referenced Column */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-obsidian-400 text-[10px] uppercase tracking-wider">Referenced Column:</span>
                      <Badge variant="emerald" size="xs">PRIMARY KEY</Badge>
                    </div>
                    <div className="text-white font-bold text-xs flex items-center gap-1.5 pl-1">
                      <span className="text-emerald-400">{rel.to_table}</span>
                      <span className="text-obsidian-500">.</span>
                      <span className="text-white">{rel.to_column}</span>
                    </div>
                  </div>

                  {/* Constraint Metadata Specifications from CockroachDB */}
                  <div className="p-2.5 rounded-lg bg-obsidian-950/80 border border-obsidian-800 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-obsidian-400">Constraint Name:</span>
                      <span className="text-cyan-300 font-semibold truncate max-w-[170px]" title={rel.constraint_name}>
                        {rel.constraint_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-obsidian-400">On Delete Action:</span>
                      <Badge
                        variant={
                          rel.delete_rule === 'CASCADE' ? 'amber' :
                          rel.delete_rule === 'SET NULL' ? 'cyan' : 'slate'
                        }
                        size="xs"
                      >
                        {rel.delete_rule}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-obsidian-400">Nullable Column:</span>
                      <Badge
                        variant={activeFkColDetails?.is_nullable === 'YES' ? 'cyan' : 'slate'}
                        size="xs"
                      >
                        {activeFkColDetails ? (activeFkColDetails.is_nullable === 'YES' ? 'YES (Optional)' : 'NO (Mandatory)') : 'NO'}
                      </Badge>
                    </div>
                    {activeFkColDetails?.data_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-obsidian-400">Data Type:</span>
                        <span className="text-obsidian-300 text-[10px]">{activeFkColDetails.data_type}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Center on Table + Catalog Link */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="xs"
                      className="flex-1 justify-center text-[11px]"
                      icon={<Maximize2 className="w-3 h-3" />}
                      onClick={() => handleHighlightReferencedTable(rel.to_table)}
                    >
                      Focus {rel.to_table}
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="text-[11px]"
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => navigate(`/database?table=${rel.to_table}`)}
                    >
                      Catalog
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Compact Entity/Relationship Inspector Popover (Top-Right on Click) */}
        {(selectedEntity || selectedRel) && !selectedFkAttr && (
          <div className="popover-interactive absolute top-4 right-4 w-80 p-4 rounded-xl bg-obsidian-900/95 border border-obsidian-750 shadow-2xl backdrop-blur-md z-30 space-y-3 animate-in slide-in-from-right-4 duration-200">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-2 border-b border-obsidian-800">
              <div className="flex items-center gap-2">
                {selectedEntity ? (
                  <Badge variant="emerald" size="xs">ENTITY (TABLE)</Badge>
                ) : (
                  <Badge variant="amber" size="xs">RELATIONSHIP (DIAMOND)</Badge>
                )}
                <span className="font-mono text-xs font-bold text-white">
                  {selectedEntity ? selectedEntity.name : selectedRel?.verb.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedEntityId(null);
                  setSelectedRelationshipId(null);
                }}
                className="p-1 text-obsidian-400 hover:text-white rounded hover:bg-obsidian-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Entity Details */}
            {selectedEntity && (
              <div className="space-y-3 font-mono text-xs">
                <p className="text-obsidian-300 text-[11px] font-sans leading-relaxed">
                  {selectedEntity.description}
                </p>

                <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-obsidian-400">Catalog Storage:</span>
                    <span className="text-white font-bold">public.{selectedEntity.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-obsidian-400">CockroachDB Rows:</span>
                    <span className="text-emerald-400 font-bold">
                      {tableMetadata[selectedEntity.id.toLowerCase()]?.rowCount ?? '...'} rows
                    </span>
                  </div>
                </div>

                {/* Columns Preview */}
                <div className="space-y-1">
                  <span className="text-[10px] text-obsidian-400 uppercase tracking-wider block">
                    Columns ({CHEN_ATTRIBUTES.filter((a) => a.entityId === selectedEntity.id).length}):
                  </span>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {CHEN_ATTRIBUTES.filter((a) => a.entityId === selectedEntity.id).map((attr) => (
                      <div
                        key={attr.id}
                        className="px-2 py-1 rounded bg-obsidian-950/80 border border-obsidian-800 flex items-center justify-between text-[11px]"
                      >
                        <span className={attr.isPk ? 'text-amber-300 font-bold' : attr.isFk ? 'text-cyan-300' : 'text-obsidian-300'}>
                          {attr.isPk ? <u>{attr.name}</u> : attr.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {attr.isPk && <Badge variant="amber" size="xs">PK</Badge>}
                          {attr.isFk && <Badge variant="cyan" size="xs">FK</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Cross-Navigation Link */}
                <div className="pt-2 border-t border-obsidian-800">
                  <Button
                    variant="outline"
                    size="xs"
                    className="w-full justify-center"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/database?table=${selectedEntity.id}`)}
                  >
                    Inspect in Database Catalog
                  </Button>
                </div>
              </div>
            )}

            {/* Relationship Details */}
            {selectedRel && (
              <div className="space-y-3 font-mono text-xs">
                <p className="text-obsidian-300 text-[11px] font-sans leading-relaxed">
                  {selectedRel.description}
                </p>

                <div className="p-2.5 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-obsidian-400">Relationship:</span>
                    <span className="text-amber-400 font-bold">{selectedRel.verb}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-obsidian-400">Participating Entities:</span>
                    <span className="text-white">
                      {selectedRel.entity1Id.toUpperCase()} &harr; {selectedRel.entity2Id.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-obsidian-400">Cardinality Ratio:</span>
                    <Badge variant="cyan" size="xs">
                      {selectedRel.card1} : {selectedRel.card2}
                    </Badge>
                  </div>
                  {selectedRel.constraintName && (
                    <div className="pt-1 border-t border-obsidian-800 flex items-center justify-between">
                      <span className="text-obsidian-400">CockroachDB Constraint:</span>
                      <span className="text-emerald-400 text-[10px]">{selectedRel.constraintName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="flex-1 text-[11px]"
                    onClick={() => setSelectedEntityId(selectedRel.entity1Id)}
                  >
                    View {selectedRel.entity1Id}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="flex-1 text-[11px]"
                    onClick={() => setSelectedEntityId(selectedRel.entity2Id)}
                  >
                    View {selectedRel.entity2Id}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
