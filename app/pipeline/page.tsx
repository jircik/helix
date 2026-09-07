import { Topbar } from '@/components/shell/Topbar';
import { PipelineView } from '@/components/pipeline/PipelineView';

export default function PipelinePage() {
  return (
    <>
      <Topbar title="Pipeline" />
      <PipelineView />
    </>
  );
}
