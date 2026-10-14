import { Topbar } from '@/components/shell/Topbar';
import { OverviewView } from '@/components/overview/OverviewView';

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Visão geral" />
      <OverviewView />
    </>
  );
}
