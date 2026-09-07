'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Lead, Stage } from '@/lib/db/schema';
import { apiGet, apiSend, apiAllLeads } from '@/lib/api/client';
import { groupByStage } from '@/lib/pipeline/group';
import { LeadModal } from '@/components/leads/LeadModal';
import { useLeadDetail } from '@/components/leads/useLeadDetail';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';
import { Select } from '@/components/ui/Select';

export function PipelineView() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [rows, setRows] = useState<Lead[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
      return Promise.all([
        apiGet<Stage[]>('/api/stages'),
        apiAllLeads(new URLSearchParams('temperatures=quente,morno,frio&verifications=pendente,qualificado')),
      ]).then(([etapas, lista]) => {
      setStages(etapas);
      setRows(lista);
      setErro(null);
    }).catch((e: unknown) => {
      setErro(e instanceof Error ? e.message : String(e));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const detalhe = useLeadDetail(carregar);

  async function soltar(stageId: number) {
    if (dragging === null) return;
    const leadId = dragging;
    setDragging(null);
    await mover(leadId, stageId);
  }

  async function mover(leadId: number, stageId: number) {
    if (moving) return;
    setMoving(true);
    try {
      await apiSend(`/api/leads/${leadId}/stage`, 'PUT', { stageId });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally { setMoving(false); }
  }

  const colunas = groupByStage(stages, rows);

  return (
    <div className="view">
      <span className="mono">Fluxo comercial</span>
      <h1>Pipeline</h1>
      <p className="page-description">Arraste os leads entre etapas ou use o seletor em cada card.</p>
      {loading && <p className="empty">Carregando pipeline…</p>}

      {(erro || detalhe.erro) && <p role="alert" className="error" style={{ marginTop: 16 }}>{erro ?? detalhe.erro}</p>}

      <div className="kanban" style={{
        marginTop: 24, display: 'grid', gap: 16,
        gridTemplateColumns: `repeat(${Math.max(colunas.length, 1)}, minmax(240px, 1fr))`,
        overflowX: 'auto',
      }}>
        {colunas.map(({ stage, leads }) => (
          <section
            key={stage.id}
            className="panel"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void soltar(stage.id)}
            style={{ minHeight: 320 }}
          >
            <div className="panel-head">
              <span className="mono" style={{ color: stage.color ?? undefined }}>
                {stage.name}
              </span>
              <span className="mono">{leads.length}</span>
            </div>
            <div style={{ padding: 12, display: 'grid', gap: 10, alignContent: 'start', maxHeight: 'max(240px, calc(100dvh - 320px))', overflowY: 'auto' }}>
              {leads.map((lead) => (
                <article
                  key={lead.id}
                  draggable={!moving}
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(lead.id)); setDragging(lead.id); }}
                  onDragEnd={() => setDragging(null)}
                  style={{
                    padding: 12, border: '1px solid var(--line)',
                    background: 'var(--bg)', cursor: 'grab',
                    opacity: dragging === lead.id ? 0.4 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <button type="button" className="pipeline-card-open"
                      onClick={() => detalhe.open(lead.id)}>{lead.name}</button>
                    <TemperatureBadge temperature={lead.temperature} />
                  </div>
                  <label className="field" style={{ marginTop: 12 }}><span className="mono">Mover para</span>
                    <Select aria-label={'Etapa de ' + lead.name} value={lead.stageId ?? stages[0]?.id ?? ''} disabled={moving}
                      onValueChange={(value) => void mover(lead.id, Number(value))} options={stages.map((stage) => ({ value: stage.id, label: stage.name }))} /></label>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {lead.primaryTypeDisplay ?? '—'} · {lead.phone ?? 'sem telefone'}
                  </div>
                </article>
              ))}
              {leads.length === 0 && <p className="empty" style={{ padding: 20 }}>Vazio</p>}
            </div>
          </section>
        ))}
      </div>

      {detalhe.openId !== null && detalhe.detail && (
        <LeadModal
          key={detalhe.detail.lead.id + ':' + detalhe.detail.lead.updatedAt}
          lead={detalhe.detail.lead}
          activities={detalhe.detail.activities}
          stages={stages}
          onPatch={detalhe.patch}
          onMoveStage={detalhe.moveStage}
          onAddActivity={detalhe.addActivity}
          onClose={detalhe.close}
        />
      )}
    </div>
  );
}
