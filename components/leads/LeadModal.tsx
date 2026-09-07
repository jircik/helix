'use client';

import { useState } from 'react';
import type { Activity, ActivityKind, Lead, Stage, Verification } from '@/lib/db/schema';
import type { UserBlockPatch } from '@/lib/repo/leads';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { TemperatureBadge } from '@/components/ui/TemperatureBadge';
import { LeadMap } from '@/components/map/LeadMap';
import { toDateInput, dateInputToIso } from '@/lib/dates';

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  ligacao: 'Ligação', email: 'E-mail', whatsapp: 'WhatsApp',
  dm: 'DM', visita: 'Visita', nota: 'Nota', stage_change: 'Mudança de etapa',
};

const REGISTRAVEIS: ActivityKind[] = ['ligacao', 'email', 'whatsapp', 'dm', 'visita', 'nota'];

const TABS = [
  { id: 'empresa', label: 'Empresa' },
  { id: 'dados', label: 'Dados' },
  { id: 'mapa', label: 'Mapa' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Props {
  lead: Lead;
  activities: Activity[];
  stages: Stage[];
  onPatch: (patch: UserBlockPatch) => Promise<void>;
  onMoveStage: (stageId: number) => Promise<void>;
  onAddActivity: (input: { kind: ActivityKind; body: string }) => Promise<void>;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

/** Linha somente-leitura do bloco do Google. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="data-row">
      <span className="mono">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function LeadModal({
  lead, activities, stages, onPatch, onMoveStage, onAddActivity, onClose,
}: Props) {
  const [tab, setTab] = useState<TabId>('empresa');
  const [form, setForm] = useState({
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
  const [movingStage, setMovingStage] = useState(false);
  const [adding, setAdding] = useState(false);
  const [novaAtividade, setNovaAtividade] = useState<{ kind: ActivityKind; body: string }>({
    kind: 'ligacao', body: '',
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function trocarEtapa(value: string) {
    const stageId = Number(value);
    if (movingStage || !stageId || stageId === lead.stageId) return;
    setMovingStage(true);
    setErro(null);
    try { await onMoveStage(stageId); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setMovingStage(false); }
  }

  async function salvar() {
    if (saving) return;
    if (form.verification === 'descartado' && form.disqualifyReason.trim() === '') {
      setErro('Informe o motivo do descarte — sem ele você vai reavaliar esse lead de novo.');
      setTab('dados');
      return;
    }
    setErro(null);
    setSaving(true);
    try {
      await onPatch({
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
    setAdding(true);
    setErro(null);
    try {
      await onAddActivity({ kind: novaAtividade.kind, body: novaAtividade.body.trim() });
      setNovaAtividade({ kind: novaAtividade.kind, body: '' });
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setAdding(false); }
  }

  const subtitle = (
    <>
      <span>{lead.phone ?? 'Sem telefone'}</span>
      <span>{lead.primaryTypeDisplay ?? 'Sem tipo'}</span>
      <TemperatureBadge temperature={lead.temperature} />
    </>
  );

  const toolbar = (
    <>
      <div className="tabs" role="tablist" aria-label="Seções do lead">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === item.id}
            aria-controls={'painel-' + item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Select
        aria-label="Etapa do funil"
        value={lead.stageId ?? ''}
        disabled={movingStage || stages.length === 0}
        onValueChange={trocarEtapa}
        options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
        placeholder="Sem etapa"
      />
    </>
  );

  return (
    <Modal
      size="wide"
      title={lead.name}
      subtitle={subtitle}
      toolbar={toolbar}
      closeLabel="Fechar detalhes do lead"
      onClose={onClose}
    >
      <div className="modal-body modal-scroll">
        {erro && <p role="alert" className="error">{erro}</p>}

        {tab === 'empresa' && (
          <div id="painel-empresa" role="tabpanel" className="data-grid">
            <Row label="Nome">{lead.name}</Row>
            <Row label="Endereço">{lead.formattedAddress ?? '—'}</Row>
            <Row label="Telefone">{lead.phone ?? '—'}</Row>
            <Row label="Site">
              {lead.websiteUri
                ? <a href={lead.websiteUri} target="_blank" rel="noreferrer noopener">{lead.websiteUri}</a>
                : 'Sem site'}
            </Row>
            <Row label="Avaliações">{lead.rating ?? '—'} · {lead.userRatingCount ?? 0} avaliações</Row>
            <Row label="Situação">{lead.businessStatus ?? '—'}</Row>
            <Row label="Tipo">{lead.primaryTypeDisplay ?? '—'}</Row>
            {lead.googleMapsUri && (
              <Row label="Google Maps">
                <a href={lead.googleMapsUri} target="_blank" rel="noreferrer noopener">Abrir no Maps</a>
              </Row>
            )}
            <p className="modal-note">
              Capturado em {formatDate(lead.capturedAt)}. Este bloco é um retrato do Google e
              não pode ser editado — se você descobriu algo diferente, registre no motivo de
              descarte ou nas notas, na aba Dados.
            </p>
          </div>
        )}

        {tab === 'mapa' && (
          <div id="painel-mapa" role="tabpanel">
            {lead.lat != null && lead.lng != null ? (
              <>
                <div className="lead-map">
                  <LeadMap
                    rows={[lead]}
                    selectedId={lead.id}
                    onSelect={() => {}}
                    center={{ lat: lead.lat, lng: lead.lng }}
                    zoom={16}
                  />
                </div>
                <p className="modal-note">
                  {lead.formattedAddress ?? 'Sem endereço'}
                  {lead.googleMapsUri && (
                    <> · <a href={lead.googleMapsUri} target="_blank" rel="noreferrer noopener">Abrir no Google Maps</a></>
                  )}
                </p>
              </>
            ) : (
              <p className="empty">Este lead não tem coordenada — só leads vindos da busca do Google têm.</p>
            )}
          </div>
        )}

        {tab === 'dados' && (
          <div id="painel-dados" role="tabpanel" className="data-form">
            <label className="field">
              <span className="mono">Verificação</span>
              <Select
                aria-label="Verificação"
                value={form.verification}
                onValueChange={(value) => set('verification', value as Verification)}
                options={[
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'qualificado', label: 'Qualificado' },
                  { value: 'descartado', label: 'Descartado' },
                ]}
              />
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

            <div className="field-grid">
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
                <span className="mono">Próxima ação</span>
                <input value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
              </label>
              <label className="field">
                <span className="mono">Quando</span>
                <input
                  type="date"
                  aria-label="Quando"
                  value={form.nextActionAt}
                  onChange={(e) => set('nextActionAt', e.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span className="mono">Notas</span>
              <textarea aria-label="Notas" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </label>

            <section className="timeline">
              <h3>Timeline</h3>
              <div className="field-grid">
                <label className="field">
                  <span className="mono">Tipo</span>
                  <Select
                    aria-label="Tipo"
                    value={novaAtividade.kind}
                    onValueChange={(value) => setNovaAtividade((p) => ({ ...p, kind: value as ActivityKind }))}
                    options={REGISTRAVEIS.map((kind) => ({ value: kind, label: ACTIVITY_LABELS[kind] }))}
                  />
                </label>
                <label className="field">
                  <span className="mono">O que aconteceu</span>
                  <input
                    value={novaAtividade.body}
                    onChange={(e) => setNovaAtividade((p) => ({ ...p, body: e.target.value }))}
                  />
                </label>
              </div>
              <button type="button" className="btn btn-outline" disabled={adding} onClick={registrar}>
                {adding ? 'Registrando…' : 'Registrar'}
              </button>

              {activities.length === 0 ? (
                <p className="empty">Nada registrado ainda.</p>
              ) : (
                <ul className="timeline-list">
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <span className="mono">
                        {ACTIVITY_LABELS[activity.kind]} · {formatDate(activity.occurredAt)}
                      </span>
                      <div>{activity.body}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <span />
        <button type="button" className="btn btn-outline" onClick={onClose}>Fechar</button>
        <button type="button" className="btn" disabled={saving} onClick={salvar}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}
