import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Landing } from '@/components/landing/Landing';
import { getSessionUser } from '@/lib/auth/session';
import { ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Helix — CRM de prospecção geográfica',
  description: 'Encontre no Google Maps negócios sem site próprio, classifique cada um e acompanhe o contato num pipeline.',
};

// Quem já entrou vai direto para o app.
export default async function RootPage() {
  if (await getSessionUser()) redirect(ROUTES.dashboard);
  return <Landing />;
}
