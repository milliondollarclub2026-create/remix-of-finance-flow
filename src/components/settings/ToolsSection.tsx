import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

export const ToolsSection: React.FC<{ onDirty: () => void }> = ({ onDirty }) => {
  const { companySettings, setCompanySettings } = useData();

  const [loc, setLoc] = useState({
    language: 'English',
    timezone: 'America/New_York',
    date_format: 'DD.MM.YYYY',
    thousands_separator: ' ',
    decimal_separator: '.',
    currency_symbol: '$',
    currency_position: 'before',
  });

  useEffect(() => {
    if (companySettings) {
      setLoc({
        language: companySettings.language || 'English',
        timezone: companySettings.timezone || 'America/New_York',
        date_format: companySettings.date_format || 'DD.MM.YYYY',
        thousands_separator: companySettings.thousands_separator || ' ',
        decimal_separator: companySettings.decimal_separator || '.',
        currency_symbol: companySettings.currency_symbol || '$',
        currency_position: companySettings.currency_position || 'before',
      });
    }
  }, [companySettings]);

  const update = async (field: string, value: string) => {
    setLoc(prev => ({ ...prev, [field]: value }));
    onDirty();

    if (companySettings?.id) {
      await supabase.from('company_settings').update({ [field]: value }).eq('id', companySettings.id);
    } else {
      const { data } = await supabase.from('company_settings').insert({ [field]: value }).select().single();
      if (data) setCompanySettings(data as any);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={loc.language} onValueChange={v => update('language', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Russian">Russian</SelectItem>
                <SelectItem value="German">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date Format</Label>
            <Select value={loc.date_format} onValueChange={v => update('date_format', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD.MM.YYYY">DD.MM.YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Thousands Separator</Label>
              <Select value={loc.thousands_separator} onValueChange={v => update('thousands_separator', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Space ( )</SelectItem>
                  <SelectItem value=",">Comma (,)</SelectItem>
                  <SelectItem value=".">Period (.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Decimal Separator</Label>
              <Select value={loc.decimal_separator} onValueChange={v => update('decimal_separator', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=".">Period (.)</SelectItem>
                  <SelectItem value=",">Comma (,)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Currency Symbol</Label>
              <Input value={loc.currency_symbol} onChange={e => update('currency_symbol', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Symbol Position</Label>
              <Select value={loc.currency_position} onValueChange={v => update('currency_position', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before ($100)</SelectItem>
                  <SelectItem value="after">After (100$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
