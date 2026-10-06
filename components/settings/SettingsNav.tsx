'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [{ href: '/configuracoes', label: 'Geral' }, { href: '/configuracoes/etapa', label: 'Etapas do funil' }, { href: '/configuracoes/aparencia', label: 'Aparência' }, { href: '/configuracoes/conta', label: 'Conta' }];
export function SettingsNav() {
  const pathname = usePathname();
  return <nav className="settings-nav" aria-label="Configurações"><span className="mono">Configurações</span>
    {SECTIONS.map((section) => <Link key={section.href} href={section.href} aria-current={pathname === section.href ? 'page' : undefined}>{section.label}</Link>)}
  </nav>;
}
