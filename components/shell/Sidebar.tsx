'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { authClient } from '@/lib/auth/client';
import { Logo } from '@/components/ui/Logo';
import { ROUTES } from '@/lib/routes';

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: ROUTES.dashboard, label: 'Visão geral', icon: 'overview' },
  { href: ROUTES.explore, label: 'Explorar', icon: 'explore' },
  { href: ROUTES.leads, label: 'Leads', icon: 'leads' },
  { href: ROUTES.pipeline, label: 'Pipeline', icon: 'pipeline' },
  { href: ROUTES.settings, label: 'Configurações', icon: 'settings' },
];

export function Sidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // As leituras de sessão no servidor não conseguem regravar o cookie; esta chamada passa pelo
  // route handler, que reemite o cookie quando o Better Auth renova a sessão (7 dias com uso).
  useEffect(() => { authClient.getSession().catch(() => {}); }, []);

  async function sair() {
    try { await authClient.signOut(); } catch { /* segue para a tela de entrada mesmo assim */ }
    router.replace(ROUTES.login);
    router.refresh();
  }

  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <div className="sidebar-heading"><Link className="brand" href={ROUTES.dashboard} aria-label="Helix — início">
        {collapsed ? <Logo /> : <span>HELIX</span>}
      </Link>
      <button type="button" className="sidebar-toggle" aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} aria-expanded={!collapsed} aria-controls="main-navigation" onClick={() => setCollapsed((value) => !value)}>
        <Icon name={collapsed ? 'expand' : 'collapse'} />
      </button></div>
      <nav className="nav" id="main-navigation" aria-label="Menu principal">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            title={collapsed ? link.label : undefined}
            aria-label={link.label}
            aria-current={pathname === link.href || pathname.startsWith(link.href + '/') ? 'page' : undefined}
          >
            <Icon name={link.icon} /><span className={collapsed ? 'sr-only' : undefined}>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" title={collapsed ? `${user.name} · ${user.email}` : undefined}>
          <span className="sidebar-avatar" aria-hidden="true">{user.name.trim().charAt(0) || '?'}</span>
          <span className={collapsed ? 'sr-only' : 'sidebar-user-name'}>{user.name}</span>
        </div>
        <button type="button" className="sidebar-toggle" aria-label="Sair" title="Sair"
          onClick={sair}>
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
