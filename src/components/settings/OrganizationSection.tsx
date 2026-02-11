import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export const OrganizationSection: React.FC<{ onDirty: () => void }> = ({ onDirty }) => {
  const { companySettings, setCompanySettings, accounts } = useData();

  const [form, setForm] = useState({
    name: '', business_type: 'LLC',
    base_currency: 'USD', default_account_id: '',
  });

  useEffect(() => {
    if (companySettings) {
      setForm({
        name: companySettings.name || '',
        business_type: (companySettings as any).business_type || 'LLC',
        base_currency: (companySettings as any).base_currency || 'USD',
        default_account_id: (companySettings as any).default_account_id || '',
      });
    }
  }, [companySettings]);

  const update = async (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    onDirty();
    if (companySettings?.id) {
      await supabase.from('company_settings').update({ [field]: value } as any).eq('id', companySettings.id);
    } else {
      const { data } = await supabase.from('company_settings').insert({ [field]: value } as any).select().single();
      if (data) setCompanySettings(data as any);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Info */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">General Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Company Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Business Type</Label>
              <Select value={form.business_type} onValueChange={v => update('business_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLC">LLC</SelectItem>
                  <SelectItem value="Sole Proprietor">Sole Proprietor</SelectItem>
                  <SelectItem value="Agency">Agency</SelectItem>
                  <SelectItem value="Corporation">Corporation</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Defaults */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Financial Defaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Base Currency</Label>
              <Select value={form.base_currency} onValueChange={v => update('base_currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="UZS">UZS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Default Account</Label>
              <Select value={form.default_account_id || 'none'} onValueChange={v => update('default_account_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
