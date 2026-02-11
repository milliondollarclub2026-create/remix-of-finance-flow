import {
  AccountGroup, Account, Transaction, PlannedPayment,
  CategoryGroup, Category, Project, Counterparty,
  BusinessLine, Product, User, Role, AppSettings,
  type ModuleKey, type ActionKey,
} from '@/types';
import { format, subDays, addDays } from 'date-fns';

const today = new Date();
const d = (offset: number) => format(offset > 0 ? addDays(today, offset) : subDays(today, Math.abs(offset)), 'yyyy-MM-dd');

// ==================== ACCOUNT GROUPS & ACCOUNTS ====================

export const accountGroups: AccountGroup[] = [
  { id: 'ag1', name: 'Bank Accounts', order: 0 },
  { id: 'ag2', name: 'Cash', order: 1 },
  { id: 'ag3', name: 'Crypto', order: 2 },
];

export const accounts: Account[] = [
  { id: 'a1', groupId: 'ag1', name: 'Main Checking', openingBalance: 50000, currency: 'USD', balance: 0, order: 0 },
  { id: 'a2', groupId: 'ag1', name: 'Savings', openingBalance: 120000, currency: 'USD', balance: 0, order: 1 },
  { id: 'a3', groupId: 'ag2', name: 'Petty Cash', openingBalance: 2000, currency: 'USD', balance: 0, order: 0 },
  { id: 'a4', groupId: 'ag3', name: 'BTC Wallet', openingBalance: 15000, currency: 'USD', balance: 0, order: 0 },
];

// ==================== CATEGORY GROUPS & CATEGORIES ====================

export const categoryGroups: CategoryGroup[] = [
  { id: 'cg1', name: 'Revenue', type: 'INCOME', order: 0 },
  { id: 'cg2', name: 'Operating Expenses', type: 'EXPENSE', order: 0 },
  { id: 'cg3', name: 'Personnel', type: 'EXPENSE', order: 1 },
];

export const categories: Category[] = [
  { id: 'c1', groupId: 'cg1', name: 'Service Revenue', type: 'INCOME', order: 0 },
  { id: 'c2', groupId: 'cg1', name: 'Product Sales', type: 'INCOME', order: 1 },
  { id: 'c3', groupId: 'cg2', name: 'Office Rent', type: 'EXPENSE', order: 0 },
  { id: 'c4', groupId: 'cg2', name: 'Software Subscriptions', type: 'EXPENSE', order: 1 },
  { id: 'c5', groupId: 'cg2', name: 'Marketing', type: 'EXPENSE', order: 2 },
  { id: 'c6', groupId: 'cg3', name: 'Salaries', type: 'EXPENSE', order: 0 },
  { id: 'c7', groupId: 'cg3', name: 'Contractor Payments', type: 'EXPENSE', order: 1 },
];

// ==================== PROJECTS ====================

export const projects: Project[] = [
  { id: 'p1', name: 'Website Redesign', plannedIncome: 80000, plannedExpense: 35000, status: 'ACTIVE' },
  { id: 'p2', name: 'Mobile App v2', plannedIncome: 150000, plannedExpense: 90000, status: 'ACTIVE' },
  { id: 'p3', name: 'Brand Campaign', plannedIncome: 25000, plannedExpense: 20000, status: 'COMPLETED' },
];

// ==================== COUNTERPARTIES ====================

export const counterparties: Counterparty[] = [
  { id: 'cp1', name: 'Acme Corp', type: 'CLIENT', email: 'billing@acme.com' },
  { id: 'cp2', name: 'CloudHost Inc', type: 'VENDOR', email: 'invoices@cloudhost.com' },
  { id: 'cp3', name: 'Jane Freelancer', type: 'CONTRACTOR', email: 'jane@freelance.io' },
];

// ==================== BUSINESS LINES & PRODUCTS ====================

export const businessLines: BusinessLine[] = [
  { id: 'bl1', name: 'Consulting' },
  { id: 'bl2', name: 'SaaS' },
];

export const products: Product[] = [
  { id: 'pr1', businessLineId: 'bl1', name: 'Strategy Workshop', price: 5000 },
  { id: 'pr2', businessLineId: 'bl2', name: 'Pro Plan', price: 99 },
];

// ==================== TRANSACTIONS ====================

export const transactions: Transaction[] = [
  // Past incomes
  { id: 't1', date: d(-45), type: 'INCOME', status: 'APPROVED', amount: 25000, accountId: 'a1', categoryId: 'c1', projectId: 'p1', counterpartyId: 'cp1', description: 'Acme milestone 1' },
  { id: 't2', date: d(-30), type: 'INCOME', status: 'APPROVED', amount: 18000, accountId: 'a1', categoryId: 'c1', projectId: 'p2', counterpartyId: 'cp1', description: 'App dev phase 1' },
  { id: 't3', date: d(-20), type: 'INCOME', status: 'APPROVED', amount: 12000, accountId: 'a1', categoryId: 'c2', description: 'Product sales batch' },
  { id: 't4', date: d(-10), type: 'INCOME', status: 'APPROVED', amount: 30000, accountId: 'a1', categoryId: 'c1', projectId: 'p2', description: 'App dev phase 2' },
  { id: 't5', date: d(-5), type: 'INCOME', status: 'APPROVED', amount: 8000, accountId: 'a2', categoryId: 'c2', description: 'Recurring sales' },

  // Past expenses
  { id: 't6', date: d(-40), type: 'EXPENSE', status: 'APPROVED', amount: 5000, accountId: 'a1', categoryId: 'c3', description: 'Office rent Jan' },
  { id: 't7', date: d(-35), type: 'EXPENSE', status: 'APPROVED', amount: 1200, accountId: 'a1', categoryId: 'c4', description: 'SaaS tools' },
  { id: 't8', date: d(-28), type: 'EXPENSE', status: 'APPROVED', amount: 15000, accountId: 'a1', categoryId: 'c6', description: 'Salaries Feb' },
  { id: 't9', date: d(-25), type: 'EXPENSE', status: 'APPROVED', amount: 8000, accountId: 'a1', categoryId: 'c5', projectId: 'p3', description: 'Ad campaign' },
  { id: 't10', date: d(-15), type: 'EXPENSE', status: 'APPROVED', amount: 5000, accountId: 'a1', categoryId: 'c3', description: 'Office rent Feb' },
  { id: 't11', date: d(-12), type: 'EXPENSE', status: 'APPROVED', amount: 6000, accountId: 'a1', categoryId: 'c7', counterpartyId: 'cp3', description: 'Contractor invoice' },
  { id: 't12', date: d(-8), type: 'EXPENSE', status: 'APPROVED', amount: 15000, accountId: 'a1', categoryId: 'c6', description: 'Salaries Mar' },
  { id: 't13', date: d(-3), type: 'EXPENSE', status: 'APPROVED', amount: 3500, accountId: 'a1', categoryId: 'c5', description: 'Google Ads' },

  // Transfers
  { id: 't14', date: d(-7), type: 'TRANSFER', status: 'APPROVED', amount: 10000, accountId: 'a2', toAccountId: 'a1', description: 'Savings to checking' },

  // Pending
  { id: 't15', date: d(-1), type: 'EXPENSE', status: 'PENDING', amount: 2500, accountId: 'a1', categoryId: 'c4', description: 'Annual license renewal' },
];

// ==================== PLANNED PAYMENTS ====================

export const plannedPayments: PlannedPayment[] = [
  { id: 'pp1', date: d(5), type: 'INCOME', amount: 20000, accountId: 'a1', categoryId: 'c1', projectId: 'p2', description: 'App dev phase 3', isRecurring: false },
  { id: 'pp2', date: d(10), type: 'EXPENSE', amount: 5000, accountId: 'a1', categoryId: 'c3', description: 'Office rent Apr', isRecurring: true },
  { id: 'pp3', date: d(15), type: 'EXPENSE', amount: 15000, accountId: 'a1', categoryId: 'c6', description: 'Salaries Apr', isRecurring: true },
  { id: 'pp4', date: d(20), type: 'EXPENSE', amount: 12000, accountId: 'a1', categoryId: 'c5', description: 'Marketing campaign', isRecurring: false },
  { id: 'pp5', date: d(30), type: 'INCOME', amount: 35000, accountId: 'a1', categoryId: 'c1', projectId: 'p1', description: 'Website final delivery', isRecurring: false },
  { id: 'pp6', date: d(35), type: 'EXPENSE', amount: 5000, accountId: 'a1', categoryId: 'c3', description: 'Office rent May', isRecurring: true },
  { id: 'pp7', date: d(40), type: 'EXPENSE', amount: 15000, accountId: 'a1', categoryId: 'c6', description: 'Salaries May', isRecurring: true },
  { id: 'pp8', date: d(45), type: 'EXPENSE', amount: 8000, accountId: 'a1', categoryId: 'c7', description: 'Contractor Q2', isRecurring: false },
];

// ==================== ROLES ====================

const allModules: ModuleKey[] = ['dashboard', 'projects', 'transactions', 'accounts', 'categories', 'counterparties', 'reports', 'settings'];
const allActions: Record<ActionKey, boolean> = { view: true, create: true, edit: true, delete: true, approve: true, export: true };
const viewOnly: Record<ActionKey, boolean> = { view: true, create: false, edit: false, delete: false, approve: false, export: false };

export const roles: Role[] = [
  {
    id: 'r1', name: 'Admin',
    permissions: allModules.map(m => ({ moduleKey: m, actions: { ...allActions }, scope: 'ALL' as const })),
  },
  {
    id: 'r2', name: 'Manager',
    permissions: allModules.map(m => ({
      moduleKey: m,
      actions: m === 'settings' ? { ...viewOnly } : { ...allActions, delete: false },
      scope: 'ALL' as const,
    })),
  },
  {
    id: 'r3', name: 'Accountant',
    permissions: allModules.map(m => {
      const scope: 'ALL' | 'OWN' = ['transactions', 'accounts'].includes(m) ? 'ALL' : 'OWN';
      return {
        moduleKey: m,
        actions: ['transactions', 'accounts', 'categories', 'reports'].includes(m) ? { ...allActions, delete: false } : { ...viewOnly },
        scope,
      };
    }),
  },
  {
    id: 'r4', name: 'Viewer',
    permissions: allModules.map(m => ({ moduleKey: m, actions: { ...viewOnly }, scope: 'OWN' as const })),
  },
];

// ==================== USERS ====================

export const users: User[] = [
  { id: 'u1', name: 'Alex Johnson', email: 'alex@company.com', status: 'ACTIVE', roleId: 'r1' },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@company.com', status: 'ACTIVE', roleId: 'r2' },
  { id: 'u3', name: 'Mike Rivera', email: 'mike@company.com', status: 'ACTIVE', roleId: 'r3' },
  { id: 'u4', name: 'Emma Wilson', email: 'emma@company.com', status: 'DISABLED', roleId: 'r4' },
];

// ==================== SETTINGS ====================

export const appSettings: AppSettings = {
  company: {
    name: 'Acme Financial',
    legalName: 'Acme Financial LLC',
    taxId: '12-3456789',
    address: '123 Business Ave, Suite 400, New York, NY 10001',
    phone: '+1 (555) 123-4567',
    email: 'info@acmefinancial.com',
    website: 'https://acmefinancial.com',
  },
  localization: {
    language: 'English',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    thousandsSeparator: ',',
    decimalSeparator: '.',
    currencySymbol: '$',
    currencyPosition: 'before',
  },
};
