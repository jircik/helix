import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

// Provisório: a raiz vai virar landing page.
export default function RootPage() {
  redirect(ROUTES.dashboard);
}
