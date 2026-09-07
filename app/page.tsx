import { Topbar } from '@/components/shell/Topbar';
import { OverviewView } from '@/components/overview/OverviewView';

export default function HomePage() {
  return (
    <>
      <Topbar title="Visão geral" />
      <OverviewView />
    </>
  );
}
