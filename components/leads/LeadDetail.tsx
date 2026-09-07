'use client';

import { useState } from 'react';
import type { Activity, ActivityKind, Lead, Stage, Verification } from '@/lib/db/schema';
import type { UserBlockPatch } from '@/lib/repo/leads';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';
import { toDateInput, dateInputToIso } from '@/lib/dates';
import { Select } from '@/components/ui/Select';

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  ligacao: 'Ligação', email: 'E-mail', whatsapp: 'WhatsApp',
  dm: 'DM', visita: 'Visita', nota: 'Nota', stage_change: 'Mudança de etapa',
};

const REGISTRAVEIS: ActivityKind[] = ['ligacao', 'email', 'whatsapp', 'dm', 'visita', 'nota'];

interface Props {
  lead: Lead;
  activities: Activity[];
  stages: Stage[];
  onPatch: (patch: UserBlockPatch) => Promise<void>;
  onAddActivity: (input: { kind: ActivityKind; body: string }) => Promise<void>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export function LeadDetail({ lead, activities, stages, onPatch, onAddActivity }: Props) {
  const [form, setForm] = useState({
    stageId: lead.stageId ?? stages[0]?.id ?? null,
    verification: lead.verification,
    disqualifyReason: lead.disqualifyReason ?? '',
    contactName: lead.contactName ?? '',
    email: lead.email ?? '',
    instagram: lead.instagram ?? '',
    whatsapp: lead.whatsapp ?? '',
    notes: lead.notes ?? '',
    nextAction: lead.nextAction ?? '',
    nextActionAt: toDateInput(lead.nextActionAt),
  });
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState<{ kind: ActivityKind; body: string }>({
    kind: 'ligacao', body: '',
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function salvar() {
    if (saving) return;
    if (form.verification === 'descartado' && form.disqualifyReason.trim() === '') {
      setErro('Informe o motivo do descarte — sem ele você vai reavaliar esse lead de novo.');
      return;
    }
    setErro(null);
    setSaving(true);
    try { await onPatch({
      stageId: form.stageId,
      verification: form.verification,
      disqualifyReason: form.disqualifyReason.trim() || null,
      contactName: form.contactName.trim() || null,
      email: form.email.trim() || null,
      instagram: form.instagram.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      notes: form.notes.trim() || null,
      nextAction: form.nextAction.trim() || null,
      nextActionAt: dateInputToIso(form.nextActionAt),
    });
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function registrar() {
    if (adding || novaAtividade.body.trim() === '') return;
    setAdding(true); setErro(null);
    try { await onAddActivity({ kind: novaAtividade.kind, body: novaAtividade.body.trim() });
    setNovaAtividade({ kind: novaAtividade.kind, body: '' });
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setAdding(false); }
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section className="panel">
        <div className="panel-head">
          <h2 style={{ margin: 0, fontSize: 13 }}>Dados do Google</h2>
          <TemperatureBadge temperature={lead.temperature} />
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 10, fontSize: 12 }}>
          <div><span className="mono">Nome</span><div>{lead.name}</div></div>
          <div><span className="mono">Endereço</span><div>{lead.formattedAddress ?? '—'}</div></div>
          <div><span className="mono">Telefone</span><div>{lead.phone ?? '—'}</div></div>
          <div>
            <span className="mono">Site</span>
            <div>{lead.websiteUri ?? 'Sem site'}</div>
          </div>
          <div>
            <span className="mono">Avaliações</span>
            <div>{lead.rating ?? '—'} · {lead.userRatingCount ?? 0} avaliações</div>
          </div>
          <div><span className="mono">Situação</span><div>{lead.businessStatus ?? '—'}</div></div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 11 }}>
            Capturado em {formatDate(lead.capturedAt)}. Este bloco é um retrato do
            Google e não pode ser editado — se você descobriu algo diferente,
            registre no motivo de descarte ou nas notas.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2 style={{ margin: 0, fontSize: 13 }}>Seus dados</h2></div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          {erro && <p className="error">{erro}</p>}

          <label className="field">
            <span className="mono">Etapa</span>
            <Select aria-label="Etapa" value={form.stageId ?? ''} onValueChange={(value) => set('stageId', Number(value))}
              options={stages.map((stage) => ({ value: stage.id, label: stage.name }))} />
          </label>

          <label className="field">
            <span className="mono">Verificação</span>
            <Select aria-label="Verificação" value={form.verification} onValueChange={(value) => set('verification', value as Verification)}
              options={[{ value: 'pendente', label: 'Pendente' }, { value: 'qualificado', label: 'Qualificado' }, { value: 'descartado', label: 'Descartado' }]} />
          </label>

          {form.verification === 'descartado' && (
            <label className="field">
              <span className="mono">Motivo do descarte</span>
              <input
                value={form.disqualifyReason}
                onChange={(e) => set('disqualifyReason', e.target.value)}
                placeholder="tem site, fechou, fora do perfil…"
              />
            </label>
          )}

          <label className="field">
            <span className="mono">Contato</span>
            <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
          </label>
          <label className="field">
            <span className="mono">E-mail</span>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="field">
            <span className="mono">Instagram</span>
            <input value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
          </label>
          <label className="field">
            <span className="mono">WhatsApp</span>
            <input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </label>
          <label className="field">
            <span className="mono">Notas</span>
            <textarea aria-label="Notas" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
          <label className="field">
            <span className="mono">Próxima ação</span>
            <input value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
          </label>
          <label className="field">
            <span className="mono">Quando</span>
            <input
              type="date"
              value={form.nextActionAt.slice(0, 10)}
              onChange={(e) => set('nextActionAt', e.target.value)}
            />
          </label>

          <button className="btn" disabled={saving || !stages.length} onClick={salvar}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2 style={{ margin: 0, fontSize: 13 }}>Timeline</h2></div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
          <label className="field">
            <span className="mono">Tipo</span>
            <Select aria-label="Tipo" value={novaAtividade.kind} onValueChange={(value) => setNovaAtividade((previous) => ({ ...previous, kind: value as ActivityKind }))}
              options={REGISTRAVEIS.map((kind) => ({ value: kind, label: ACTIVITY_LABELS[kind] }))} />
          </label>
          <label className="field">
            <span className="mono">O que aconteceu</span>
            <input
              value={novaAtividade.body}
              onChange={(e) => setNovaAtividade((p) => ({ ...p, body: e.target.value }))}
            />
          </label>
          <button className="btn btn-outline" disabled={adding} onClick={registrar}>{adding ? 'Registrando…' : 'Registrar'}</button>

          {activities.length === 0 ? (
            <p className="empty">Nada registrado ainda.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {activities.map((a) => (
                <li key={a.id} style={{ borderLeft: '2px solid var(--line)', paddingLeft: 12 }}>
                  <span className="mono">
                    {ACTIVITY_LABELS[a.kind]} · {formatDate(a.occurredAt)}
                  </span>
                  <div style={{ fontSize: 12 }}>{a.body}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
