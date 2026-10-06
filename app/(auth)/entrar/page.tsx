import { AuthForm } from '@/components/auth/AuthForm';
import { safeNext } from '@/lib/auth/redirect';

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="entrar" next={safeNext((await searchParams).next)} />;
}
