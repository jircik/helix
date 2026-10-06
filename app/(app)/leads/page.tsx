import { Topbar } from '@/components/shell/Topbar';
import { LeadsView } from '@/components/leads/LeadsView';

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ leadId?: string }> }) {
  const rawId = Number((await searchParams).leadId);
  const initialLeadId = Number.isSafeInteger(rawId) && rawId > 0 ? rawId : null;
  return (
    <>
      <Topbar title="Leads" />
      <LeadsView initialLeadId={initialLeadId} />
    </>
  );
}
