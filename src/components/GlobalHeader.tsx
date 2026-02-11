import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ChevronUp, TrendingUp, TrendingDown, ArrowRight, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useData } from '@/contexts/DataContext';

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/projects': 'Projects',
  '/counterparties': 'Counterparties',
  '/calendar': 'Payment Calendar',
  '/analytics': 'Financial Reports',
  '/settings': 'Settings',
};

export const GlobalHeader: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { calculatedAccounts } = useData();
  const [addOpen, setAddOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const pageName = PAGE_NAMES[pathname] || PAGE_NAMES[Object.keys(PAGE_NAMES).find(k => k !== '/' && pathname.startsWith(k)) || ''] || 'Page';
  const totalCash = calculatedAccounts.reduce((s, a) => s + a.balance, 0);

  const formatCurrency = (val: number) => {
    const abs = Math.abs(val);
    return `$${abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleAddTransaction = (type: string) => {
    setAddOpen(false);
    navigate(`/transactions?add=${type}`);
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold">{pageName}</h1>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          className="h-8 w-8"
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : theme === 'system' ? (
            <Monitor className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        <div className="text-right">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Business Cash</p>
          <p className="text-sm font-semibold">{formatCurrency(totalCash)}</p>
        </div>

        <DropdownMenu open={addOpen} onOpenChange={setAddOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4" />
              Add New
              <ChevronUp className={`h-3 w-3 transition-transform ${addOpen ? '' : 'rotate-180'}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="gap-2" onClick={() => handleAddTransaction('INCOME')}>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Income
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => handleAddTransaction('EXPENSE')}>
              <TrendingDown className="h-4 w-4 text-rose-600" />
              Expense
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => handleAddTransaction('TRANSFER')}>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Transfer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
