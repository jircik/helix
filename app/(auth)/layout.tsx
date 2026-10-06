import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getSessionUser()) redirect('/');
  return <main className="auth-shell">{children}</main>;
}
