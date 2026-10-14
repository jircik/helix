import { AuthForm } from '@/components/auth/AuthForm';
import { safeNext } from '@/lib/auth/redirect';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="signup" next={safeNext((await searchParams).next)} />;
}
