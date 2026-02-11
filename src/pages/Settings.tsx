import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { OrganizationSection } from '@/components/settings/OrganizationSection';
import { TeamSection } from '@/components/settings/TeamSection';
import { RolesSection } from '@/components/settings/RolesSection';
import { FinanceSection } from '@/components/settings/FinanceSection';
import { ToolsSection } from '@/components/settings/ToolsSection';
import { ProfileSection } from '@/components/settings/ProfileSection';

export type SettingsSection = 'company' | 'localization' | 'team' | 'roles' | 'categories' | 'accounts' | 'business_lines' | 'profile';

const SECTION_TITLES: Record<SettingsSection, { title: string; subtitle: string }> = {
  company: { title: 'Company Profile', subtitle: 'Manage your business identity and billing details.' },
  localization: { title: 'Localization & Formatting', subtitle: 'Configure how data is displayed across the platform.' },
  team: { title: 'Team Members', subtitle: 'Manage team access and roles.' },
  roles: { title: 'Roles & Permissions', subtitle: 'Configure what users can see and do.' },
  categories: { title: 'Categories', subtitle: 'Manage income and expense categories.' },
  accounts: { title: 'Accounts', subtitle: 'Manage bank accounts, cash desks, and groups.' },
  business_lines: { title: 'Business Lines', subtitle: 'Define your revenue streams and products.' },
  profile: { title: 'My Profile', subtitle: 'Manage your personal information and password.' },
};

const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>('company');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section && section in SECTION_TITLES) {
      setActiveSection(section as SettingsSection);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleSave = () => setIsDirty(false);
  const handleCancel = () => setIsDirty(false);
  const markDirty = () => setIsDirty(true);

  const sectionInfo = SECTION_TITLES[activeSection];

  return (
    <div className="flex h-full">
      <SettingsSidebar active={activeSection} onSelect={setActiveSection} />
      <div className="flex-1 p-8 pb-24 overflow-y-auto">
        <h2 className="text-xl font-semibold">{sectionInfo.title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{sectionInfo.subtitle}</p>

        {activeSection === 'company' && <OrganizationSection onDirty={markDirty} />}
        {activeSection === 'localization' && <ToolsSection onDirty={markDirty} />}
        {activeSection === 'team' && <TeamSection onDirty={markDirty} />}
        {activeSection === 'roles' && <RolesSection onDirty={markDirty} />}
        {activeSection === 'categories' && <FinanceSection onDirty={markDirty} section="categories" />}
        {activeSection === 'accounts' && <FinanceSection onDirty={markDirty} section="accounts" />}
        {activeSection === 'business_lines' && <FinanceSection onDirty={markDirty} section="business_lines" />}
        {activeSection === 'profile' && <ProfileSection />}
      </div>

    </div>
  );
};

export default Settings;
