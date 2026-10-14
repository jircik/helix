'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

const SECTIONS = [{ href: ROUTES.settings, label: 'Geral' }, { href: ROUTES.settingsStage, label: 'Etapas do funil' }, { href: ROUTES.settingsAppearance, label: 'Aparência' }, { href: ROUTES.settingsAccount, label: 'Conta' }];
export function SettingsNav() {
  const pathname = usePathname();
  return <nav className="settings-nav" aria-label="Configurações"><span className="mono">Configurações</span>
    {SECTIONS.map((section) => <Link key={section.href} href={section.href} aria-current={pathname === section.href ? 'page' : undefined}>{section.label}</Link>)}
  </nav>;
}
