import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, DbTransaction, DbProject } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Plus, Search, CalendarIcon, Users, Layers, MoreVertical,
  TrendingUp, TrendingDown, Upload, FileText, ArrowLeft, Download,
  ChevronLeft, ChevronRight, Settings2, Zap,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, getDay, getDaysInMonth, startOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED'], { required_error: 'Status is required' }),
  manager_id: z.string().optional(),
  business_line_id: z.string().optional(),
  description: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  planned_revenue: z.string().optional().refine(v => !v || v === '0' || (!isNaN(Number(v)) && Number(v) >= 0), 'Must be a positive number'),
  planned_expenses: z.string().optional().refine(v => !v || v === '0' || (!isNaN(Number(v)) && Number(v) >= 0), 'Must be a positive number'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

// ===== PROJECTS LIST VIEW =====

const ProjectsList: React.FC = () => {
  const {
    projects, transactions, plannedPayments, profiles, businessLines,
    categories, accounts, counterparties, calculatedAccounts,
    setProjects, setTransactions, companySettings,
  } = useData();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [blFilter, setBlFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');

  // Form state
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const projForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      status: 'ACTIVE',
      manager_id: 'none',
      business_line_id: 'none',
      description: '',
      start_date: undefined,
      end_date: undefined,
      planned_revenue: '0',
      planned_expenses: '0',
    },
  });

  const openCreate = () => {
    projForm.reset({
      name: '',
      status: 'ACTIVE',
      manager_id: 'none',
      business_line_id: 'none',
      description: '',
      start_date: undefined,
      end_date: undefined,
      planned_revenue: '0',
      planned_expenses: '0',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (values: ProjectFormValues) => {
    setSaving(true);
    const payload: any = {
      name: values.name.trim(),
      status: values.status,
      planned_income: parseFloat(values.planned_revenue || '0') || 0,
      planned_expense: parseFloat(values.planned_expenses || '0') || 0,
      description: values.description || '',
      manager_id: values.manager_id !== 'none' ? values.manager_id : null,
      business_line_id: values.business_line_id !== 'none' ? values.business_line_id : null,
      start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : null,
      end_date: values.end_date ? format(values.end_date, 'yyyy-MM-dd') : null,
    };
    const { data, error } = await supabase.from('projects').insert(payload).select().single();
    if (!error && data) {
      setProjects(prev => [...prev, data as unknown as DbProject]);
    }
    setSaving(false);
    setCreateOpen(false);
  };

  // Calculate actuals per project
  const projectFinancials = useMemo(() => {
    const map: Record<string, { actualRevenue: number; actualExpense: number }> = {};
    for (const p of projects) {
      map[p.id] = { actualRevenue: 0, actualExpense: 0 };
    }
    for (const t of transactions) {
      if (t.status !== 'APPROVED' || !t.project_id || !map[t.project_id]) continue;
      if (t.type === 'INCOME') map[t.project_id].actualRevenue += Number(t.amount);
      if (t.type === 'EXPENSE') map[t.project_id].actualExpense += Number(t.amount);
    }
    return map;
  }, [projects, transactions]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (blFilter !== 'all' && p.business_line_id !== blFilter) return false;
      if (managerFilter !== 'all' && p.manager_id !== managerFilter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, blFilter, managerFilter, searchQuery]);

  const totals = useMemo(() => {
    let actualRevenue = 0, actualExpense = 0, plannedRevenue = 0, plannedExpense = 0;
    for (const p of filtered) {
      const f = projectFinancials[p.id] || { actualRevenue: 0, actualExpense: 0 };
      actualRevenue += f.actualRevenue;
      actualExpense += f.actualExpense;
      plannedRevenue += Number(p.planned_income);
      plannedExpense += Number(p.planned_expense);
    }
    return { actualRevenue, actualExpense, plannedRevenue, plannedExpense };
  }, [filtered, projectFinancials]);

  const fmt = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const getManagerName = (id?: string) => profiles.find(p => p.id === id)?.name;
  const getBLName = (id?: string) => businessLines.find(b => b.id === id)?.name;

  const statusBadge = (status: string) => {
    const cls = status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-500';
    return <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded', cls)}>{status}</span>;
  };

  return (
    <div className="px-4 md:px-6 py-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Project
        </Button>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={blFilter} onValueChange={setBlFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Business Line" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Business Lines</SelectItem>
            {businessLines.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={managerFilter} onValueChange={setManagerFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Manager" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 w-60 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.7fr] items-center gap-4 px-6 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
          <div>Project</div>
          <div>Revenue</div>
          <div>Expenses</div>
          <div>Gross Profit</div>
          <div>Margin</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No projects found</div>
        )}
        {filtered.map(project => {
          const fin = projectFinancials[project.id] || { actualRevenue: 0, actualExpense: 0 };
          const actualProfit = fin.actualRevenue - fin.actualExpense;
          const plannedProfit = Number(project.planned_income) - Number(project.planned_expense);
          const actualMargin = fin.actualRevenue > 0 ? Math.round((actualProfit / fin.actualRevenue) * 100) : 0;
          const plannedMargin = Number(project.planned_income) > 0 ? Math.round((plannedProfit / Number(project.planned_income)) * 100) : 0;
          const manager = getManagerName(project.manager_id);
          const bl = getBLName(project.business_line_id);

          return (
            <div
              key={project.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_0.7fr] items-center gap-4 px-6 py-4 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {/* Project Info */}
              <div>
                <p className="text-sm font-semibold">{project.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {statusBadge(project.status)}
                  {project.start_date && project.end_date && (
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(project.start_date), 'M/d/yyyy')} — {format(parseISO(project.end_date), 'M/d/yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {manager && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {manager}
                    </span>
                  )}
                  {bl && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                      <Layers className="h-3 w-3" /> {bl}
                    </span>
                  )}
                </div>
              </div>

              {/* Revenue */}
              <div>
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-sm font-bold text-emerald-600">{fmt(fin.actualRevenue)}</p>
                    <p className="text-xs text-muted-foreground">{fmt(Number(project.planned_income))}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    <p>Actual</p>
                    <p>Planned</p>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div>
                <p className="text-sm font-bold text-destructive">–{fmt(fin.actualExpense)}</p>
                <p className="text-xs text-muted-foreground">–{fmt(Number(project.planned_expense))}</p>
              </div>

              {/* Gross Profit */}
              <div>
                <p className="text-sm font-bold text-emerald-600">{fmt(actualProfit)}</p>
                <p className="text-xs text-muted-foreground">{fmt(plannedProfit)}</p>
              </div>

              {/* Margin */}
              <div>
                <p className="text-sm font-bold">{actualMargin}%</p>
                <p className="text-xs text-muted-foreground">{plannedMargin}%</p>
              </div>
            </div>
          );
        })}

        {/* Totals Footer */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.7fr] items-center gap-4 px-6 py-4 bg-muted/30">
            <p className="text-sm font-bold">TOTAL</p>
            <div>
              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-sm font-bold text-emerald-600">{fmt(totals.actualRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{fmt(totals.plannedRevenue)}</p>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  <p>Actual</p>
                  <p>Planned</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-destructive">–{fmt(totals.actualExpense)}</p>
              <p className="text-xs text-muted-foreground">–{fmt(totals.plannedExpense)}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-600">{fmt(totals.actualRevenue - totals.actualExpense)}</p>
              <p className="text-xs text-muted-foreground">{fmt(totals.plannedRevenue - totals.plannedExpense)}</p>
            </div>
            <div>
              <p className="text-sm font-bold">
                {totals.actualRevenue > 0 ? Math.round(((totals.actualRevenue - totals.actualExpense) / totals.actualRevenue) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                {totals.plannedRevenue > 0 ? Math.round(((totals.plannedRevenue - totals.plannedExpense) / totals.plannedRevenue) * 100) : 0}%
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* CREATE PROJECT DIALOG */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Project</SheetTitle>
          </SheetHeader>
          <form onSubmit={projForm.handleSubmit(handleCreate)} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Project Name <span className="text-destructive">*</span></Label>
              <Input value={projForm.watch('name')} onChange={e => projForm.setValue('name', e.target.value, { shouldValidate: true })} placeholder="e.g. Mobile App Redesign" className="mt-1" />
              {projForm.formState.errors.name && (
                <p className="text-sm font-medium text-destructive mt-1">{projForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                <Select value={projForm.watch('status')} onValueChange={v => projForm.setValue('status', v as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Manager</Label>
                <Select value={projForm.watch('manager_id') || 'none'} onValueChange={v => projForm.setValue('manager_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Business Line</Label>
              <Select value={projForm.watch('business_line_id') || 'none'} onValueChange={v => projForm.setValue('business_line_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {businessLines.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Description</Label>
              <Textarea value={projForm.watch('description') || ''} onChange={e => projForm.setValue('description', e.target.value)} placeholder="Goals, scope, details..." className="mt-1" rows={3} />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Timeline</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1" type="button">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {projForm.watch('start_date') ? format(projForm.watch('start_date')!, 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={projForm.watch('start_date')} onSelect={d => { projForm.setValue('start_date', d); setStartDateOpen(false); }} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">End Date</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1" type="button">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {projForm.watch('end_date') ? format(projForm.watch('end_date')!, 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={projForm.watch('end_date')} onSelect={d => { projForm.setValue('end_date', d); setEndDateOpen(false); }} /></PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3">Financial Plan</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Planned Revenue</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input value={projForm.watch('planned_revenue') || '0'} onChange={e => projForm.setValue('planned_revenue', e.target.value, { shouldValidate: true })} className="pl-7" type="number" />
                  </div>
                  {projForm.formState.errors.planned_revenue && (
                    <p className="text-sm font-medium text-destructive mt-1">{projForm.formState.errors.planned_revenue.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Planned Expenses</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input value={projForm.watch('planned_expenses') || '0'} onChange={e => projForm.setValue('planned_expenses', e.target.value, { shouldValidate: true })} className="pl-7" type="number" />
                  </div>
                  {projForm.formState.errors.planned_expenses && (
                    <p className="text-sm font-medium text-destructive mt-1">{projForm.formState.errors.planned_expenses.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Creating...' : 'Create Project'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ===== PROJECT DETAIL VIEW =====

const ProjectDetail: React.FC<{ projectId: string }> = ({ projectId }) => {
  const {
    projects, transactions, plannedPayments, accounts, categories,
    counterparties, profiles, businessLines, calculatedAccounts,
    setTransactions, setProjects,
  } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [calMonth, setCalMonth] = useState(new Date());
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editStartDateOpen, setEditStartDateOpen] = useState(false);
  const [editEndDateOpen, setEditEndDateOpen] = useState(false);

  const project = projects.find(p => p.id === projectId);
  if (!project) return <div className="p-6 text-muted-foreground">Project not found</div>;

  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      status: project.status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
      manager_id: project.manager_id || 'none',
      business_line_id: project.business_line_id || 'none',
      description: project.description || '',
      start_date: project.start_date ? parseISO(project.start_date) : undefined,
      end_date: project.end_date ? parseISO(project.end_date) : undefined,
      planned_revenue: String(project.planned_income || 0),
      planned_expenses: String(project.planned_expense || 0),
    },
  });

  const openEdit = () => {
    editForm.reset({
      name: project.name,
      status: project.status as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
      manager_id: project.manager_id || 'none',
      business_line_id: project.business_line_id || 'none',
      description: project.description || '',
      start_date: project.start_date ? parseISO(project.start_date) : undefined,
      end_date: project.end_date ? parseISO(project.end_date) : undefined,
      planned_revenue: String(project.planned_income || 0),
      planned_expenses: String(project.planned_expense || 0),
    });
    setEditOpen(true);
  };

  const handleEdit = async (values: ProjectFormValues) => {
    setEditSaving(true);
    const payload: any = {
      name: values.name.trim(),
      status: values.status,
      planned_income: parseFloat(values.planned_revenue || '0') || 0,
      planned_expense: parseFloat(values.planned_expenses || '0') || 0,
      description: values.description || '',
      manager_id: values.manager_id !== 'none' ? values.manager_id : null,
      business_line_id: values.business_line_id !== 'none' ? values.business_line_id : null,
      start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : null,
      end_date: values.end_date ? format(values.end_date, 'yyyy-MM-dd') : null,
    };
    const { data, error } = await supabase.from('projects').update(payload).eq('id', projectId).select().single();
    if (!error && data) {
      setProjects(prev => prev.map(p => p.id === projectId ? data as unknown as DbProject : p));
    }
    setEditSaving(false);
    setEditOpen(false);
  };

  const manager = profiles.find(p => p.id === project.manager_id);
  const bl = businessLines.find(b => b.id === project.business_line_id);

  // Project transactions
  const projTxns = transactions.filter(t => t.project_id === projectId && t.status === 'APPROVED');
  const projPlanned = plannedPayments.filter(pp => pp.project_id === projectId);

  const actualRevenue = projTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const actualExpense = projTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const grossProfit = actualRevenue - actualExpense;
  const profitability = actualRevenue > 0 ? Math.round((grossProfit / actualRevenue) * 100) : 0;
  const plannedProfit = Number(project.planned_income) - Number(project.planned_expense);
  const plannedProfitability = Number(project.planned_income) > 0 ? Math.round((plannedProfit / Number(project.planned_income)) * 100) : 0;

  // Receivables / Payables (simplified: income planned minus actual = owed to you)
  const receivables = Math.max(0, Number(project.planned_income) - actualRevenue);
  const payables = Math.max(0, Number(project.planned_expense) - actualExpense);

  const fmt = (v: number) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  const getCategoryName = (id?: string | null) => categories.find(c => c.id === id)?.name || '—';
  const getCounterpartyName = (id?: string | null) => counterparties.find(c => c.id === id)?.name || '';
  const getAccountLabel = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? `${acc.name} (${acc.currency})` : '';
  };

  // All transactions + planned for this project (for ledger)
  const allRows = useMemo(() => {
    const rows: Array<DbTransaction & { isPlanned: boolean }> = [];
    for (const t of transactions.filter(tx => tx.project_id === projectId)) {
      rows.push({ ...t, isPlanned: false });
    }
    for (const pp of projPlanned) {
      rows.push({
        id: pp.id, date: pp.date, type: pp.type, amount: pp.amount,
        account_id: pp.account_id, to_account_id: pp.to_account_id || undefined,
        category_id: pp.category_id || undefined, project_id: pp.project_id || undefined,
        counterparty_id: undefined, description: pp.description || '', status: 'PLANNED',
        created_at: '', isPlanned: true,
      } as any);
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [transactions, projPlanned, projectId]);

  // Documents count placeholder
  const docsCount = 0;

  return (
    <div className="px-4 md:px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </button>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {manager?.name || 'Available to all'}</span>
            {bl && <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {bl.name}</span>}
            {project.start_date && project.end_date && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(parseISO(project.start_date), 'M/d/yyyy')} — {format(parseISO(project.end_date), 'M/d/yyyy')}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={openEdit}><MoreVertical className="h-5 w-5" /></Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-6">
          {['Overview', 'Payment Calendar', 'Financial Report', 'Documents'].map(tab => {
            const val = tab.toLowerCase().replace(/ /g, '-');
            return (
              <TabsTrigger
                key={val}
                value={val === 'documents' ? 'documents' : val === 'overview' ? 'overview' : val === 'payment-calendar' ? 'calendar' : 'report'}
                className={cn(
                  'rounded-none border-b-2 border-transparent px-0 pb-2 text-sm font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                )}
              >
                {tab} {tab === 'Documents' && <span className="ml-1 text-xs text-muted-foreground">{docsCount}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* KPI Cards */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-border">
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">Gross Profit</p>
                  <p className="text-2xl font-bold text-emerald-600">{fmt(grossProfit)}</p>
                  <p className="text-xs text-muted-foreground">{fmt(plannedProfit)} planned</p>
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold">{fmt(actualRevenue)}</p>
                  <p className="text-xs text-muted-foreground">{fmt(Number(project.planned_income))} planned</p>
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold">{fmt(actualExpense)}</p>
                  <p className="text-xs text-muted-foreground">{fmt(Number(project.planned_expense))} planned</p>
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">Profitability</p>
                  <p className="text-lg font-bold">{profitability}%</p>
                  <p className="text-xs text-muted-foreground">{plannedProfitability}% planned</p>
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">Contractors owe you</p>
                  <p className="text-lg font-bold text-emerald-600">{fmt(receivables)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Ledger */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
            <h3 className="text-lg font-semibold mb-3">Transactions</h3>
            {/* Table Header */}
            <div className="grid grid-cols-[40px_100px_1fr_1.5fr_1fr_1fr] items-center gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <div><Checkbox /></div>
              <div>Date</div>
              <div>Amount</div>
              <div>Category/Description</div>
              <div>Counterparty</div>
              <div>Account</div>
            </div>

            {allRows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No transactions for this project</div>
            ) : (
              allRows.map(row => (
                <div key={row.id} className={cn('grid grid-cols-[40px_100px_1fr_1.5fr_1fr_1fr] items-center gap-2 px-3 py-3 border-b border-border/50', row.isPlanned && 'opacity-60')}>
                  <div><Checkbox /></div>
                  <div className="flex items-center gap-1.5">
                    {row.isPlanned && <span className="text-[9px] font-semibold bg-muted text-muted-foreground px-1 py-0.5 rounded">PLAN</span>}
                    <span className="text-sm">{format(parseISO(row.date), 'M/d/yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {row.type === 'INCOME' ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                    <span className={cn('text-sm font-medium', row.type === 'INCOME' ? 'text-emerald-600' : 'text-destructive')}>
                      {row.type === 'INCOME' ? '+ ' : '– '}${Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{getCategoryName(row.category_id)}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">{getCounterpartyName(row.counterparty_id)}</div>
                  <div className="text-sm font-medium">{getAccountLabel(row.account_id)}</div>
                </div>
              ))
            )}
            </div>
          </div>
        </TabsContent>

        {/* PAYMENT CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <PaymentCalendarTab projectId={projectId} calMonth={calMonth} setCalMonth={setCalMonth} />
        </TabsContent>

        {/* FINANCIAL REPORT TAB */}
        <TabsContent value="report" className="mt-4">
          <FinancialReportTab projectId={projectId} />
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* EDIT PROJECT SHEET */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
          </SheetHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Project Name <span className="text-destructive">*</span></Label>
              <Input value={editForm.watch('name')} onChange={e => editForm.setValue('name', e.target.value, { shouldValidate: true })} placeholder="e.g. Mobile App Redesign" className="mt-1" />
              {editForm.formState.errors.name && (
                <p className="text-sm font-medium text-destructive mt-1">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                <Select value={editForm.watch('status')} onValueChange={v => editForm.setValue('status', v as 'ACTIVE' | 'COMPLETED' | 'ARCHIVED')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Manager</Label>
                <Select value={editForm.watch('manager_id') || 'none'} onValueChange={v => editForm.setValue('manager_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Business Line</Label>
              <Select value={editForm.watch('business_line_id') || 'none'} onValueChange={v => editForm.setValue('business_line_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {businessLines.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Description</Label>
              <Textarea value={editForm.watch('description') || ''} onChange={e => editForm.setValue('description', e.target.value)} placeholder="Goals, scope, details..." className="mt-1" rows={3} />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Timeline</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</Label>
                  <Popover open={editStartDateOpen} onOpenChange={setEditStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1" type="button">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.watch('start_date') ? format(editForm.watch('start_date')!, 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.watch('start_date')} onSelect={d => { editForm.setValue('start_date', d); setEditStartDateOpen(false); }} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">End Date</Label>
                  <Popover open={editEndDateOpen} onOpenChange={setEditEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1" type="button">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.watch('end_date') ? format(editForm.watch('end_date')!, 'dd/MM/yyyy') : 'dd/mm/yyyy'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.watch('end_date')} onSelect={d => { editForm.setValue('end_date', d); setEditEndDateOpen(false); }} /></PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3">Financial Plan</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Planned Revenue</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input value={editForm.watch('planned_revenue') || '0'} onChange={e => editForm.setValue('planned_revenue', e.target.value, { shouldValidate: true })} className="pl-7" type="number" />
                  </div>
                  {editForm.formState.errors.planned_revenue && (
                    <p className="text-sm font-medium text-destructive mt-1">{editForm.formState.errors.planned_revenue.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">Planned Expenses</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input value={editForm.watch('planned_expenses') || '0'} onChange={e => editForm.setValue('planned_expenses', e.target.value, { shouldValidate: true })} className="pl-7" type="number" />
                  </div>
                  {editForm.formState.errors.planned_expenses && (
                    <p className="text-sm font-medium text-destructive mt-1">{editForm.formState.errors.planned_expenses.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ===== PAYMENT CALENDAR =====
const PaymentCalendarTab: React.FC<{ projectId: string; calMonth: Date; setCalMonth: (d: Date) => void }> = ({ projectId, calMonth, setCalMonth }) => {
  const { transactions, plannedPayments, accounts } = useData();

  const projTxns = transactions.filter(t => t.project_id === projectId && t.status === 'APPROVED');
  const projPlanned = plannedPayments.filter(pp => pp.project_id === projectId);

  // Build calendar data
  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const daysInMonth = getDaysInMonth(calMonth);

  // Cash flow chart data
  const chartData = useMemo(() => {
    const totalOpening = accounts.reduce((s, a) => s + Number(a.opening_balance), 0);
    let balance = totalOpening;
    // Apply all txns before this month
    for (const t of projTxns) {
      if (t.date < format(monthStart, 'yyyy-MM-dd')) {
        if (t.type === 'INCOME') balance += Number(t.amount);
        else if (t.type === 'EXPENSE') balance -= Number(t.amount);
      }
    }

    const points: { day: number; balance: number; isProjection: boolean }[] = [];
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = format(new Date(calMonth.getFullYear(), calMonth.getMonth(), d), 'yyyy-MM-dd');
      const isProjection = dateStr > todayStr;

      const dayTxns = projTxns.filter(t => t.date === dateStr);
      const dayPlanned = projPlanned.filter(pp => pp.date === dateStr);

      for (const t of dayTxns) {
        if (t.type === 'INCOME') balance += Number(t.amount);
        else if (t.type === 'EXPENSE') balance -= Number(t.amount);
      }
      if (isProjection) {
        for (const pp of dayPlanned) {
          if (pp.type === 'INCOME') balance += Number(pp.amount);
          else if (pp.type === 'EXPENSE') balance -= Number(pp.amount);
        }
      }

      points.push({ day: d, balance, isProjection });
    }
    return points;
  }, [projTxns, projPlanned, accounts, calMonth, monthStart, daysInMonth]);

  const cashGap = chartData.find(p => p.isProjection && p.balance < 0);

  // Calendar grid
  const dayOfWeekStart = (getDay(monthStart) + 6) % 7; // Monday = 0
  const cells: (number | null)[] = Array(dayOfWeekStart).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayData = (day: number) => {
    const dateStr = format(new Date(calMonth.getFullYear(), calMonth.getMonth(), day), 'yyyy-MM-dd');
    const income = projTxns.filter(t => t.date === dateStr && t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
      + projPlanned.filter(pp => pp.date === dateStr && pp.type === 'INCOME').reduce((s, pp) => s + Number(pp.amount), 0);
    const expense = projTxns.filter(t => t.date === dateStr && t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
      + projPlanned.filter(pp => pp.date === dateStr && pp.type === 'EXPENSE').reduce((s, pp) => s + Number(pp.amount), 0);
    const point = chartData.find(p => p.day === day);
    return { income, expense, balance: point?.balance || 0 };
  };

  const todayDay = new Date().getMonth() === calMonth.getMonth() && new Date().getFullYear() === calMonth.getFullYear() ? new Date().getDate() : -1;

  const fmtShort = (v: number) => {
    if (v === 0) return '';
    const sign = v >= 0 ? '+' : '';
    return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCalMonth(subMonths(calMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold">{format(calMonth, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" onClick={() => setCalMonth(addMonths(calMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>

        {cashGap && (
          <div className="ml-auto flex items-center gap-1.5 text-destructive text-sm border border-destructive/30 rounded-full px-3 py-1">
            <Zap className="h-4 w-4" />
            Cash Gap {format(new Date(calMonth.getFullYear(), calMonth.getMonth(), cashGap.day), 'MM/dd/yyyy')}
          </div>
        )}
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Account Balance</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="projBalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(228, 68%, 55%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(228, 68%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Balance']} />
              <ReferenceLine y={0} stroke="hsl(0, 84%, 60%)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="balance" stroke="hsl(228, 68%, 55%)" fill="url(#projBalFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
            <div key={d} className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-2 border-b border-border">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="h-28 border-b border-r border-border bg-muted/10" />;
            const data = getDayData(day);
            const isToday = day === todayDay;
            return (
              <div key={i} className={cn('h-28 border-b border-r border-border p-1.5 text-xs', data.balance < 0 && 'bg-destructive/5')}>
                <div className="flex justify-end">
                  <span className={cn('w-6 h-6 flex items-center justify-center rounded-full text-xs', isToday && 'bg-primary text-primary-foreground font-bold')}>{day}</span>
                </div>
                {(data.income > 0 || data.expense > 0) && (
                  <div className="mt-1 space-y-0.5">
                    {data.income > 0 && <p className="text-emerald-600 text-[10px] font-medium">+${data.income.toLocaleString()}</p>}
                    {data.expense > 0 && <p className="text-destructive text-[10px] font-medium">–${data.expense.toLocaleString()}</p>}
                    <p className={cn('text-[10px]', data.balance < 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      ${data.balance.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ===== FINANCIAL REPORT TAB =====
const FinancialReportTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { transactions, categories } = useData();
  const projTxns = transactions.filter(t => t.project_id === projectId && t.status === 'APPROVED');

  const totalRevenue = projTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = projTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalRevenue - totalExpense;
  const netMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Group by category
  const revenueByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};

  for (const t of projTxns) {
    const catName = categories.find(c => c.id === t.category_id)?.name || 'Other';
    if (t.type === 'INCOME') {
      revenueByCategory[catName] = (revenueByCategory[catName] || 0) + Number(t.amount);
    } else if (t.type === 'EXPENSE') {
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + Number(t.amount);
    }
  }

  const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  return (
    <Card className="max-w-3xl mx-auto">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Income Statement</h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" /> Cash Basis</span>
        </div>

        {/* Revenue */}
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase mb-2">Revenue</p>
          <div className="flex justify-end mb-1"><span className="text-lg font-bold">{fmt(totalRevenue)}</span></div>
          {Object.entries(revenueByCategory).sort((a, b) => b[1] - a[1]).map(([name, val]) => (
            <div key={name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm">{name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0}%</span>
                <span className="text-sm font-medium">{fmt(val)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Expenses */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Operating Expenses</p>
          <div className="flex justify-end mb-1"><span className="text-lg font-bold">{fmt(totalExpense)}</span></div>
          {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([name, val]) => (
            <div key={name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-sm">{name}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0}%</span>
                <span className="text-sm font-medium">{fmt(val)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Net Profit */}
        <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Net Profit</p>
            <p className="text-xs text-muted-foreground">Net Margin</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-emerald-600">{fmt(netProfit)}</p>
            <p className="text-sm text-emerald-600">{netMargin}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ===== DOCUMENTS TAB =====
const DocumentsTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Array<{ id: string; file_name: string; file_url: string; uploaded_at: string }>>([]);

  // Load docs
  React.useEffect(() => {
    supabase.from('project_documents').select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false })
      .then(({ data }) => { if (data) setDocs(data as any); });
  }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${projectId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('project-documents').upload(path, file);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('project-documents').getPublicUrl(path);
      const { data: doc } = await supabase.from('project_documents').insert({
        project_id: projectId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
      }).select().single();
      if (doc) setDocs(prev => [doc as any, ...prev]);
    }
    setUploading(false);
  };

  return (
    <Card>
      <CardContent className="p-8">
        {docs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Project Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">Contracts, invoices, and other files live here</p>
            <label>
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              <Button asChild className="gap-2 cursor-pointer" variant="default">
                <span><Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload File'}</span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Documents</h3>
              <label>
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                <Button asChild size="sm" className="gap-1.5 cursor-pointer">
                  <span><Upload className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload'}</span>
                </Button>
              </label>
            </div>
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(doc.uploaded_at), 'M/d/yyyy')}</p>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===== MAIN ROUTER =====
const Projects: React.FC = () => {
  const { projectId } = useParams();
  if (projectId) return <ProjectDetail projectId={projectId} />;
  return <ProjectsList />;
};

export default Projects;
