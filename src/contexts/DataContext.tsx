import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CashFlowPoint, KPIData, ExpenseStructureSlice,
} from '@/types';
import { format, subDays, addDays, isAfter, isBefore, parseISO, differenceInDays, startOfDay, startOfQuarter, endOfQuarter } from 'date-fns';

// DB row types
export interface DbAccountGroup { id: string; name: string; sort_order: number; }
export interface DbAccount { id: string; group_id: string; name: string; opening_balance: number; currency: string; sort_order: number; balance?: number; }
export interface DbTransaction { id: string; date: string; type: string; status: string; amount: number; account_id: string; to_account_id?: string; category_id?: string; project_id?: string; counterparty_id?: string; description: string; }
export interface DbPlannedPayment { id: string; date: string; type: string; amount: number; account_id: string; to_account_id?: string; category_id?: string; project_id?: string; description: string; is_recurring: boolean; }
export interface DbCategoryGroup { id: string; name: string; type: string; sort_order: number; }
export interface DbCategory { id: string; group_id: string; name: string; type: string; sort_order: number; }
export interface DbProject { id: string; name: string; planned_income: number; planned_expense: number; status: string; manager_id?: string; business_line_id?: string; start_date?: string; end_date?: string; description?: string; }
export interface DbCounterparty { id: string; name: string; type: string; email: string; phone: string; legal_name?: string; tax_id?: string; address?: string; comment?: string; is_employee?: boolean; status?: string; }
export interface DbBusinessLine { id: string; name: string; }
export interface DbProduct { id: string; business_line_id: string; name: string; price: number; }
export interface DbRole { id: string; name: string; permissions: any; is_system?: boolean; }
export interface DbProfile { id: string; name: string; email: string; status: string; avatar: string; role_id: string; user_id?: string; }
export interface DbCompanySettings { id: string; name: string; legal_name: string; tax_id: string; address: string; phone: string; email: string; website: string; logo: string; language: string; timezone: string; date_format: string; thousands_separator: string; decimal_separator: string; currency_symbol: string; currency_position: string; business_type?: string; country?: string; base_currency?: string; default_account_id?: string; }

interface DateRange { from: Date; to: Date; }

interface DataContextType {
  // Data
  accountGroups: DbAccountGroup[];
  accounts: DbAccount[];
  transactions: DbTransaction[];
  plannedPayments: DbPlannedPayment[];
  categoryGroups: DbCategoryGroup[];
  categories: DbCategory[];
  projects: DbProject[];
  counterparties: DbCounterparty[];
  businessLines: DbBusinessLine[];
  products: DbProduct[];
  roles: DbRole[];
  profiles: DbProfile[];
  companySettings: DbCompanySettings | null;

  // Loading
  loading: boolean;

  // Setters (for local state updates after DB mutations)
  setAccountGroups: React.Dispatch<React.SetStateAction<DbAccountGroup[]>>;
  setAccounts: React.Dispatch<React.SetStateAction<DbAccount[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<DbTransaction[]>>;
  setPlannedPayments: React.Dispatch<React.SetStateAction<DbPlannedPayment[]>>;
  setCategoryGroups: React.Dispatch<React.SetStateAction<DbCategoryGroup[]>>;
  setCategories: React.Dispatch<React.SetStateAction<DbCategory[]>>;
  setProjects: React.Dispatch<React.SetStateAction<DbProject[]>>;
  setCounterparties: React.Dispatch<React.SetStateAction<DbCounterparty[]>>;
  setRoles: React.Dispatch<React.SetStateAction<DbRole[]>>;
  setProfiles: React.Dispatch<React.SetStateAction<DbProfile[]>>;
  setCompanySettings: React.Dispatch<React.SetStateAction<DbCompanySettings | null>>;

  // Filters
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;

  // Calculated
  calculatedAccounts: DbAccount[];
  kpis: KPIData[];
  cashFlowSeries: CashFlowPoint[];
  cashGapDate: string | null;
  expenseStructure: ExpenseStructureSlice[];
  incomeStructure: ExpenseStructureSlice[];

  // Refetch
  refetchAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
};

const COLORS = [
  'hsl(220, 70%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)',
  'hsl(330, 81%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(160, 60%, 45%)',
  'hsl(280, 65%, 60%)',
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountGroups, setAccountGroups] = useState<DbAccountGroup[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [plannedPayments, setPlannedPayments] = useState<DbPlannedPayment[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<DbCategoryGroup[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [counterparties, setCounterparties] = useState<DbCounterparty[]>([]);
  const [businessLines, setBusinessLines] = useState<DbBusinessLine[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [companySettings, setCompanySettings] = useState<DbCompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfQuarter(new Date()),
    to: endOfQuarter(new Date()),
  });
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const refetchAll = useCallback(async () => {
    setLoading(true);
    const [
      agRes, aRes, tRes, ppRes, cgRes, cRes, pRes, cpRes, blRes, prRes, rRes, pfRes, csRes
    ] = await Promise.all([
      supabase.from('account_groups').select('*').order('sort_order'),
      supabase.from('accounts').select('*').order('sort_order'),
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('planned_payments').select('*').order('date'),
      supabase.from('category_groups').select('*').order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('projects').select('*').order('created_at'),
      supabase.from('counterparties').select('*').order('created_at'),
      supabase.from('business_lines').select('*').order('created_at'),
      supabase.from('products').select('*').order('created_at'),
      supabase.from('roles').select('*').order('created_at'),
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('company_settings').select('*').limit(1).single(),
    ]);

    if (agRes.data) setAccountGroups(agRes.data);
    if (aRes.data) setAccounts(aRes.data);
    if (tRes.data) setTransactions(tRes.data);
    if (ppRes.data) setPlannedPayments(ppRes.data);
    if (cgRes.data) setCategoryGroups(cgRes.data);
    if (cRes.data) setCategories(cRes.data);
    if (pRes.data) setProjects(pRes.data);
    if (cpRes.data) setCounterparties(cpRes.data);
    if (blRes.data) setBusinessLines(blRes.data);
    if (prRes.data) setProducts(prRes.data);
    if (rRes.data) setRoles(rRes.data);
    if (pfRes.data) setProfiles(pfRes.data);
    if (csRes.data) setCompanySettings(csRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { refetchAll(); }, [refetchAll]);

  // Filter transactions by selected account and project
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (selectedAccountId !== 'all' && t.account_id !== selectedAccountId) return false;
      if (selectedProjectId !== 'all' && t.project_id !== selectedProjectId) return false;
      return true;
    });
  }, [transactions, selectedAccountId, selectedProjectId]);

  // Rolling balance calculation
  const calculatedAccounts = useMemo(() => {
    return accounts.map(acc => {
      const approved = transactions.filter(t => t.status === 'APPROVED');
      const incomes = approved.filter(t => t.type === 'INCOME' && t.account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      const expenses = approved.filter(t => t.type === 'EXPENSE' && t.account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      const transfersOut = approved.filter(t => t.type === 'TRANSFER' && t.account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      const transfersIn = approved.filter(t => t.type === 'TRANSFER' && t.to_account_id === acc.id).reduce((s, t) => s + Number(t.amount), 0);
      return { ...acc, balance: Number(acc.opening_balance) + incomes - expenses - transfersOut + transfersIn };
    });
  }, [accounts, transactions]);

  // KPIs
  const kpis = useMemo((): KPIData[] => {
    const { from, to } = dateRange;
    const periodDays = differenceInDays(to, from) || 1;
    const prevFrom = subDays(from, periodDays);
    const prevTo = subDays(to, periodDays);

    const inRange = (t: DbTransaction, f: Date, e: Date) => {
      const td = parseISO(t.date);
      return t.status === 'APPROVED' && !isBefore(td, f) && !isAfter(td, e);
    };

    const txns = filteredTransactions;

    const currentIncome = txns.filter(t => inRange(t, from, to) && t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const prevIncome = txns.filter(t => inRange(t, prevFrom, prevTo) && t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const currentExpense = txns.filter(t => inRange(t, from, to) && t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const prevExpense = txns.filter(t => inRange(t, prevFrom, prevTo) && t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const netProfit = currentIncome - currentExpense;
    const prevNetProfit = prevIncome - prevExpense;

    const relevantAccounts = selectedAccountId === 'all' ? calculatedAccounts : calculatedAccounts.filter(a => a.id === selectedAccountId);
    const totalCash = relevantAccounts.reduce((s, a) => s + a.balance, 0);

    const delta = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / Math.abs(prev)) * 100);

    const sparkline = (type: 'INCOME' | 'EXPENSE') => {
      const pts: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayEnd = subDays(to, i * Math.floor(periodDays / 7));
        const dayStart = subDays(dayEnd, Math.floor(periodDays / 7));
        pts.push(txns.filter(t => inRange(t, dayStart, dayEnd) && t.type === type).reduce((s, t) => s + Number(t.amount), 0));
      }
      return pts;
    };

    return [
      { label: 'Income', value: currentIncome, previousValue: prevIncome, delta: delta(currentIncome, prevIncome), sparkline: sparkline('INCOME') },
      { label: 'Expenses', value: currentExpense, previousValue: prevExpense, delta: delta(currentExpense, prevExpense), sparkline: sparkline('EXPENSE') },
      { label: 'Net Profit', value: netProfit, previousValue: prevNetProfit, delta: delta(netProfit, prevNetProfit), sparkline: sparkline('INCOME').map((v, i) => v - sparkline('EXPENSE')[i]) },
      { label: 'Business Cash', value: totalCash, previousValue: 0, delta: 0, sparkline: [totalCash] },
    ];
  }, [filteredTransactions, dateRange, calculatedAccounts, selectedAccountId]);

  // Cash Flow Forecast
  const cashFlowSeries = useMemo((): CashFlowPoint[] => {
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const points: CashFlowPoint[] = [];

    const relevantAccounts = selectedAccountId === 'all' ? accounts : accounts.filter(a => a.id === selectedAccountId);
    const totalOpeningBalance = relevantAccounts.reduce((s, a) => s + Number(a.opening_balance), 0);
    let runningBalance = totalOpeningBalance;

    const allDates: string[] = [];
    let cursor = dateRange.from;
    while (!isAfter(cursor, dateRange.to)) {
      allDates.push(format(cursor, 'yyyy-MM-dd'));
      cursor = addDays(cursor, 1);
    }

    for (const dateStr of allDates) {
      const isProjection = dateStr > todayStr;

      if (!isProjection) {
        const dayTxns = filteredTransactions.filter(t => t.date === dateStr && t.status === 'APPROVED');
        for (const t of dayTxns) {
          if (t.type === 'INCOME') runningBalance += Number(t.amount);
          else if (t.type === 'EXPENSE') runningBalance -= Number(t.amount);
        }
        points.push({ date: dateStr, actual: runningBalance, balance: runningBalance, isProjection: false });
      } else {
        const dayPlanned = plannedPayments.filter(pp => pp.date === dateStr);
        for (const pp of dayPlanned) {
          if (pp.type === 'INCOME') runningBalance += Number(pp.amount);
          else if (pp.type === 'EXPENSE') runningBalance -= Number(pp.amount);
        }
        points.push({ date: dateStr, forecast: runningBalance, balance: runningBalance, isProjection: true });
      }
    }
    return points;
  }, [accounts, filteredTransactions, plannedPayments, dateRange, selectedAccountId]);

  const cashGapDate = useMemo(() => {
    const gap = cashFlowSeries.find(p => p.isProjection && p.balance < 0);
    return gap ? gap.date : null;
  }, [cashFlowSeries]);

  // Expense Structure
  const expenseStructure = useMemo((): ExpenseStructureSlice[] => {
    const { from, to } = dateRange;
    const expenses = filteredTransactions.filter(t => {
      const td = parseISO(t.date);
      return t.status === 'APPROVED' && t.type === 'EXPENSE' && !isBefore(td, from) && !isAfter(td, to);
    });
    const byCat: Record<string, number> = {};
    for (const t of expenses) {
      const cat = categories.find(c => c.id === t.category_id);
      const name = cat?.name || 'Other';
      byCat[name] = (byCat[name] || 0) + Number(t.amount);
    }
    const total = Object.values(byCat).reduce((s, v) => s + v, 0);
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name, value,
        percentage: total ? Math.round((value / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
      }));
  }, [filteredTransactions, categories, dateRange]);

  // Income Structure
  const incomeStructure = useMemo((): ExpenseStructureSlice[] => {
    const { from, to } = dateRange;
    const incomes = filteredTransactions.filter(t => {
      const td = parseISO(t.date);
      return t.status === 'APPROVED' && t.type === 'INCOME' && !isBefore(td, from) && !isAfter(td, to);
    });
    const byCat: Record<string, number> = {};
    for (const t of incomes) {
      const cat = categories.find(c => c.id === t.category_id);
      const name = cat?.name || 'Other';
      byCat[name] = (byCat[name] || 0) + Number(t.amount);
    }
    const total = Object.values(byCat).reduce((s, v) => s + v, 0);
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name, value,
        percentage: total ? Math.round((value / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
      }));
  }, [filteredTransactions, categories, dateRange]);

  const value = useMemo(() => ({
    accountGroups, accounts, transactions, plannedPayments, categoryGroups, categories,
    projects, counterparties, businessLines, products, roles, profiles, companySettings, loading,
    setAccountGroups, setAccounts, setTransactions, setPlannedPayments,
    setCategoryGroups, setCategories, setProjects, setCounterparties, setRoles, setProfiles, setCompanySettings,
    dateRange, setDateRange,
    selectedAccountId, setSelectedAccountId,
    selectedProjectId, setSelectedProjectId,
    calculatedAccounts, kpis, cashFlowSeries, cashGapDate, expenseStructure, incomeStructure,
    refetchAll,
  }), [accountGroups, accounts, transactions, plannedPayments, categoryGroups, categories,
    projects, counterparties, businessLines, products, roles, profiles, companySettings, loading,
    dateRange, selectedAccountId, selectedProjectId,
    calculatedAccounts, kpis, cashFlowSeries, cashGapDate, expenseStructure, incomeStructure, refetchAll]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
