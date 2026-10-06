import type { ReactNode } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { requireUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="shell">
      <Sidebar user={{ name: user.name, email: user.email }} />
      <main className="main">{children}</main>
    </div>
  );
}
