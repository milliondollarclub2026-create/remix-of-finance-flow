// ==================== ENUMS ====================

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionStatus = 'DRAFT' | 'PENDING' | 'APPROVED';
export type CounterpartyType = 'CLIENT' | 'VENDOR' | 'CONTRACTOR';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type UserStatus = 'ACTIVE' | 'DISABLED';
export type Scope = 'ALL' | 'OWN';

export type ModuleKey =
  | 'dashboard'
  | 'projects'
  | 'transactions'
  | 'accounts'
  | 'categories'
  | 'counterparties'
  | 'reports'
  | 'settings';

export type ActionKey = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

// ==================== FINANCE CORE ====================

export interface AccountGroup {
  id: string;
  name: string;
  order: number;
}

export interface Account {
  id: string;
  groupId: string;
  name: string;
  openingBalance: number;
  currency: string;
  balance: number; // calculated
  order: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO date
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  accountId: string;
  toAccountId?: string; // for TRANSFER
  categoryId?: string;
  projectId?: string;
  counterpartyId?: string;
  description: string;
}

export interface PlannedPayment {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  projectId?: string;
  description: string;
  isRecurring: boolean;
}

export interface CategoryGroup {
  id: string;
  name: string;
  type: CategoryType;
  order: number;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  type: CategoryType;
  order: number;
}

// ==================== BUSINESS LOGIC ====================

export interface Project {
  id: string;
  name: string;
  plannedIncome: number;
  plannedExpense: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}

export interface Counterparty {
  id: string;
  name: string;
  type: CounterpartyType;
  email?: string;
  phone?: string;
}

export interface BusinessLine {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  businessLineId: string;
  name: string;
  price: number;
}

// ==================== SYSTEM & AUTH ====================

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  avatar?: string;
  roleId: string;
}

export interface ModulePermission {
  moduleKey: ModuleKey;
  actions: Record<ActionKey, boolean>;
  scope: Scope;
}

export interface Role {
  id: string;
  name: string;
  permissions: ModulePermission[];
}

export interface CompanySettings {
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo?: string;
}

export interface LocalizationSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  thousandsSeparator: string;
  decimalSeparator: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
}

export interface AppSettings {
  company: CompanySettings;
  localization: LocalizationSettings;
}

// ==================== CALCULATED / VIEW MODELS ====================

export interface CashFlowPoint {
  date: string;
  actual?: number;
  forecast?: number;
  balance: number;
  isProjection: boolean;
}

export interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  delta: number; // percentage
  sparkline: number[];
}

export interface ExpenseDynamicsPoint {
  month: string;
  [categoryName: string]: string | number;
}

export interface ExpenseStructureSlice {
  name: string;
  value: number;
  percentage: number;
  color: string;
}
