'use client';
import { useEffect, useState } from 'react';
import type { Stage, StageKind } from '@/lib/db/schema';
import { apiGet, apiSend } from '@/lib/api/client';
import { Select } from '@/components/ui/Select';

const KINDS = { open: 'Aberta', won: 'Ganho', lost: 'Perdido' };
const KIND_OPTIONS = Object.entries(KINDS).map(([value, label]) => ({ value, label }));
function StageEditor({ stage, disabled, onSave }: { stage: Stage; disabled: boolean; onSave: (patch: { name: string; kind: StageKind; color: string }) => void }) {
  const [name, setName] = useState(stage.name);
  const [kind, setKind] = useState(stage.kind);
  const [color, setColor] = useState(stage.color ?? '#737373');
  return <form className="stage-editor" onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), kind, color }); }}>
    <input aria-label={'Nome de ' + stage.name} required value={name} onChange={(e) => setName(e.target.value)} />
    <Select aria-label={'Tipo de ' + stage.name} value={kind} onValueChange={(value) => setKind(value as StageKind)} options={KIND_OPTIONS} />
    <input aria-label={'Cor de ' + stage.name} type="color" value={color.length === 4 ? '#' + color.slice(1).split('').map((c) => c + c).join('') : color} onChange={(e) => setColor(e.target.value)} />
    <button className="btn btn-outline" disabled={disabled || !name.trim()}>Salvar etapa</button>
  </form>;
}

export function StagesView() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<StageKind>('open');
  const [color, setColor] = useState('#737373');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState<Stage | null>(null);
  const [destination, setDestination] = useState('');
  useEffect(() => {
    let active = true;
    apiGet<Stage[]>('/api/stages').then((rows) => { if (active) { setStages(rows); setLoaded(true); } })
      .catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function perform(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); setStages(await apiGet<Stage[]>('/api/stages')); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  function move(index: number, delta: number) {
    const ids = stages.map((s) => s.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    void perform(() => apiSend('/api/stages', 'PUT', { orderedIds: ids }));
  }
  return <div className="view">
    <span className="mono">Configuração</span><h1>Etapas do funil</h1>
    <p className="page-description">Organize seu processo comercial. Cada mudança de etapa fica registrada no histórico do lead.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!loaded && !error && <p className="empty">Carregando etapas…</p>}
    <div className="panel stages-list">
      {stages.map((stage, index) => <section key={stage.id} className="stage-row">
        <span className="mono">{String(stage.position).padStart(2, '0')}</span>
        <StageEditor key={stage.id + stage.name + stage.kind + stage.color} stage={stage} disabled={busy}
          onSave={(patch) => void perform(() => apiSend('/api/stages/' + stage.id, 'PATCH', patch))} />
        <div className="stage-actions">
          <button className="btn btn-outline" aria-label={'Subir ' + stage.name} disabled={busy || index === 0} onClick={() => move(index, -1)}>↑</button>
          <button className="btn btn-outline" aria-label={'Descer ' + stage.name} disabled={busy || index === stages.length - 1} onClick={() => move(index, 1)}>↓</button>
          <button className="btn btn-outline" disabled={busy || stages.length <= 1} onClick={() => { setDeleting(stage); setDestination(''); }}>Excluir {stage.name}</button>
        </div>
      </section>)}
    </div>
    {deleting && <section role="dialog" aria-modal="false" aria-labelledby="delete-title" className="panel delete-panel">
      <h2 id="delete-title">Excluir {deleting.name}</h2>
      <p>Escolha para onde mover os leads desta etapa. Os leads e seus históricos serão preservados.</p>
      <label className="field"><span>Etapa de destino</span><Select aria-label="Etapa de destino" value={destination} onValueChange={setDestination}
        options={[{ value: '', label: 'Escolha uma etapa' }, ...stages.filter((stage) => stage.id !== deleting.id).map((stage) => ({ value: stage.id, label: stage.name }))]} /></label>
      <div className="stage-actions">
        <button className="btn" disabled={!destination || busy} onClick={() => void perform(async () => {
          await apiSend('/api/stages/' + deleting.id + '?moveLeadsTo=' + destination, 'DELETE'); setDeleting(null);
        })}>Confirmar exclusão</button>
        <button className="btn btn-outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
      </div>
    </section>}
    <form className="panel create-stage" onSubmit={(e) => { e.preventDefault(); void perform(async () => {
      await apiSend('/api/stages', 'POST', { name: name.trim(), kind, color }); setName('');
    }); }}>
      <label className="field"><span className="mono">Nova etapa</span><input required value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field"><span className="mono">Tipo</span><Select aria-label="Tipo da nova etapa" value={kind} onValueChange={(value) => setKind(value as StageKind)} options={KIND_OPTIONS} /></label>
      <label className="field"><span className="mono">Cor</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
      <button className="btn" disabled={busy || !name.trim()}>Adicionar</button>
    </form>
  </div>;
}
