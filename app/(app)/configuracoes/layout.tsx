import type { ReactNode } from 'react';
import { Topbar } from '@/components/shell/Topbar';
import { SettingsNav } from '@/components/settings/SettingsNav';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <><Topbar title="Configurações" /><div className="settings-layout"><SettingsNav /><div className="settings-content">{children}</div></div></>;
}
