'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Visão geral', icon: 'overview' },
  { href: '/explorar', label: 'Explorar', icon: 'explore' },
  { href: '/leads', label: 'Leads', icon: 'leads' },
  { href: '/pipeline', label: 'Pipeline', icon: 'pipeline' },
  { href: '/configuracoes', label: 'Configurações', icon: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <div className="sidebar-heading"><Link className="brand" href="/" aria-label="Helix — início">
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
            aria-current={pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + '/')) ? 'page' : undefined}
          >
            <Icon name={link.icon} /><span className={collapsed ? 'sr-only' : undefined}>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer"><span className="status-dot" /><span className={collapsed ? 'sr-only' : 'mono'}>Workspace local</span></div>
    </aside>
  );
}
