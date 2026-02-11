import React from 'react';
import { Building2, Globe, Users, Shield, Tag, Wallet, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SettingsSection } from '@/pages/Settings';

const GROUPS = [
  {
    label: 'Organization',
    items: [
      { key: 'company' as SettingsSection, label: 'Company Profile', icon: Building2 },
      { key: 'localization' as SettingsSection, label: 'Localization', icon: Globe },
      { key: 'team' as SettingsSection, label: 'Team Members', icon: Users },
      { key: 'roles' as SettingsSection, label: 'Roles & Permissions', icon: Shield },
    ],
  },
  {
    label: 'Finance',
    items: [
      { key: 'categories' as SettingsSection, label: 'Categories', icon: Tag },
      { key: 'accounts' as SettingsSection, label: 'Accounts', icon: Wallet },
      { key: 'business_lines' as SettingsSection, label: 'Business Lines', icon: Building },
    ],
  },
];

interface Props {
  active: SettingsSection;
  onSelect: (s: SettingsSection) => void;
}

export const SettingsSidebar: React.FC<Props> = ({ active, onSelect }) => (
  <aside className="w-64 border-r border-border bg-card p-5 space-y-6 shrink-0">
    {GROUPS.map(group => (
      <div key={group.label}>
        <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-3 px-3">{group.label}</p>
        <div className="space-y-0.5">
          {group.items.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active === key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {active === key && <span className="ml-auto text-primary">›</span>}
            </button>
          ))}
        </div>
      </div>
    ))}
  </aside>
);
