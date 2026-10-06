import { AuthForm } from '@/components/auth/AuthForm';
import { safeNext } from '@/lib/auth/redirect';

export default async function CriarContaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <AuthForm mode="criar-conta" next={safeNext((await searchParams).next)} />;
}
