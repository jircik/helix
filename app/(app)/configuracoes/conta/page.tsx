import { AccountView } from '@/components/settings/AccountView';
import { requireUser } from '@/lib/auth/session';

export default async function ContaPage() {
  const user = await requireUser();
  return <AccountView user={{ name: user.name, email: user.email }} />;
}
