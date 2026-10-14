import { AuthForm } from '@/components/auth/AuthForm';
import { safeNext } from '@/lib/auth/redirect';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="login" next={safeNext((await searchParams).next)} />;
}
