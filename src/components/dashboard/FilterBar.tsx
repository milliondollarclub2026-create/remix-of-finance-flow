import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Building2, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: 'This Month', fn: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'This Quarter', fn: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
  { label: 'This Year', fn: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { label: 'Last Month', fn: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last Quarter', fn: () => ({ from: startOfQuarter(subQuarters(new Date(), 1)), to: endOfQuarter(subQuarters(new Date(), 1)) }) },
  { label: 'Last Year', fn: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) },
  { label: 'All Time', fn: () => ({ from: new Date(2020, 0, 1), to: new Date(2030, 11, 31) }) },
];

export const FilterBar: React.FC = () => {
  const { dateRange, setDateRange, accounts, projects, selectedAccountId, setSelectedAccountId, selectedProjectId, setSelectedProjectId } = useData();
  const [dateOpen, setDateOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingStart, setSelectingStart] = useState(true);

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setDateRange(preset.fn());
    setDateOpen(false);
    setShowCalendar(false);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    if (selectingStart) {
      setDateRange(prev => ({ ...prev, from: date }));
      setSelectingStart(false);
    } else {
      setDateRange(prev => ({ ...prev, to: date }));
      setSelectingStart(true);
      setDateOpen(false);
      setShowCalendar(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Date Range Picker */}
      <Popover open={dateOpen} onOpenChange={(v) => { setDateOpen(v); if (!v) setShowCalendar(false); }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-xs h-9">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(dateRange.from, 'dd.MM.yyyy')} – {format(dateRange.to, 'dd.MM.yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Date inputs with calendar toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowCalendar(true); setSelectingStart(true); }}
                className="flex items-center gap-2 border border-input rounded-lg px-3 py-2 text-sm hover:border-primary transition-colors"
              >
                <span className={cn(selectingStart && showCalendar && 'text-primary font-medium')}>
                  {format(dateRange.from, 'dd.MM.yyyy')}
                </span>
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <span className="text-muted-foreground">–</span>
              <button
                onClick={() => { setShowCalendar(true); setSelectingStart(false); }}
                className="flex items-center gap-2 border border-input rounded-lg px-3 py-2 text-sm hover:border-primary transition-colors"
              >
                <span className={cn(!selectingStart && showCalendar && 'text-primary font-medium')}>
                  {format(dateRange.to, 'dd.MM.yyyy')}
                </span>
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Show presets or calendar */}
            {!showCalendar ? (
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map(p => (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 rounded-full"
                    onClick={() => handlePreset(p)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectingStart ? dateRange.from : dateRange.to}
                onSelect={handleCalendarSelect}
                className={cn("p-3 pointer-events-auto")}
                initialFocus
              />
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Account Filter */}
      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" />
            <SelectValue placeholder="All Accounts" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Project Filter */}
      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            <SelectValue placeholder="All Projects" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
