'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Lead, Stage, Temperature } from '@/lib/db/schema';
import { apiGet, apiSend } from '@/lib/api/client';
import { LeadTable } from './LeadTable';
import { LeadModal } from './LeadModal';
import { DeleteLeadsDialog } from './DeleteLeadsDialog';
import { useLeadDetail } from './useLeadDetail';
import { LeadFilters } from './LeadFilters';

/**
 * O que a confirmação vai apagar. `ids: null` significa "tudo que o filtro
 * pega", inclusive o que está fora da página — quem resolve isso é o servidor.
 */
interface DeleteTarget {
  ids: number[] | null;
  count: number;
  nome: string | null;
}

export function LeadsView({ initialLeadId = null }: { initialLeadId?: number | null }) {
  const [temperatures, setTemperatures] = useState<Temperature[]>(['quente']);
  const [incluirDescartados, setIncluirDescartados] = useState(false);
  const [busca, setBusca] = useState('');
  const [stageId, setStageId] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stages, setStages] = useState<Stage[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loadedQuery, setLoadedQuery] = useState('');
  // A seleção guarda a query em que foi feita: trocar filtro ou página a
  // descarta sozinha, e o usuário nunca apaga lead que saiu da tela.
  const [selecao, setSelecao] = useState({ key: '', ids: [] as number[], todoFiltro: false });
  const [alvo, setAlvo] = useState<DeleteTarget | null>(null);
  const [apagando, setApagando] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const params = new URLSearchParams({
    temperatures: temperatures.join(','),
    verifications: incluirDescartados ? 'pendente,qualificado,descartado' : 'pendente,qualificado',
    limit: '50', offset: String(offset),
  });
  if (busca.trim()) params.set('search', busca.trim());
  if (stageId) params.set('stageId', stageId);
  const query = params.toString();
  const requestKey = query + ':' + revision;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      apiGet<{ rows: Lead[]; total: number }>('/api/leads?' + query).then((out) => {
        if (!active) return;
        // Apagar a página inteira deixa o offset além do fim; recua para a
        // última página que ainda tem lead em vez de mostrar uma lista vazia.
        if (out.rows.length === 0 && offset > 0) {
          setOffset(out.total > 0 ? Math.floor((out.total - 1) / 50) * 50 : 0);
          return;
        }
        setRows(out.rows); setTotal(out.total); setErro(null); setLoadedQuery(requestKey);
      }).catch((e: Error) => { if (active) { setErro(e.message); setLoadedQuery(requestKey); } });
    }, 120);
    return () => { active = false; clearTimeout(timer); };
  }, [query, requestKey, offset]);

  useEffect(() => {
    let active = true;
    apiGet<Stage[]>('/api/stages').then((out) => { if (active) setStages(out); })
      .catch((e: Error) => { if (active) setErro(e.message); });
    return () => { active = false; };
  }, []);

  const detalhe = useLeadDetail(useCallback(() => {
    setRevision((value) => value + 1);
  }, []), initialLeadId);
  const selectedId = detalhe.openId;
  function changeFilters(action: () => void) { action(); setOffset(0); }
  const loading = loadedQuery !== requestKey;

  const checked = selecao.key === query ? selecao.ids : [];
  const todoFiltro = selecao.key === query && selecao.todoFiltro;
  const paginaInteiraMarcada = rows.length > 0 && checked.length === rows.length;
  const selecionados = todoFiltro ? total : checked.length;

  function selecionar(ids: number[], todoFiltro = false) {
    setSelecao({ key: query, ids, todoFiltro });
  }

  function marcar(id: number, valor: boolean) {
    selecionar(valor ? [...checked, id] : checked.filter((item) => item !== id));
  }

  function pedirExclusao(target: DeleteTarget) {
    setErroExclusao(null);
    setAlvo(target);
  }

  async function confirmarExclusao() {
    if (!alvo) return;
    setApagando(true);
    setErroExclusao(null);
    try {
      const alvoParams = new URLSearchParams(query);
      alvoParams.delete('limit');
      alvoParams.delete('offset');
      if (alvo.ids) alvoParams.set('ids', alvo.ids.join(','));
      else alvoParams.set('all', '1');

      await apiSend('/api/leads?' + alvoParams, 'DELETE');

      if (detalhe.openId !== null && (alvo.ids === null || alvo.ids.includes(detalhe.openId))) {
        detalhe.close();
      }
      setAlvo(null);
      selecionar([]);
      setRevision((value) => value + 1);
    } catch (e) {
      setErroExclusao((e as Error).message);
    } finally {
      setApagando(false);
    }
  }

  return (
    <div className="view">
      <div className="page-heading"><div><span className="mono">Base comercial</span><h1>Leads</h1></div>
        <a className="btn btn-outline" href={'/api/leads/export?' + query}>Exportar CSV</a>
      </div>
      {(erro || detalhe.erro) && <p role="alert" className="error">{erro ?? detalhe.erro}</p>}
      <LeadFilters temperatures={temperatures} incluirDescartados={incluirDescartados}
        busca={busca} stageId={stageId} stages={stages}
        onTemperatures={(value) => changeFilters(() => setTemperatures(value))}
        onDescartados={(value) => changeFilters(() => setIncluirDescartados(value))}
        onBusca={(value) => changeFilters(() => setBusca(value))}
        onStage={(value) => changeFilters(() => setStageId(value))} />
      <div className="leads-layout">
        <div>
          {selecionados > 0 && (
            <div className="bulk-bar">
              <span className="mono" role="status">
                {selecionados === 1 ? '1 lead selecionado' : selecionados + ' leads selecionados'}
              </span>
              {/* A página não é o filtro: se sobra lead fora dela, o usuário
                  precisa poder dizer que quer o conjunto todo. */}
              {paginaInteiraMarcada && !todoFiltro && total > rows.length && (
                <button type="button" className="link-btn" onClick={() => selecionar(checked, true)}>
                  Selecionar os {total} leads do filtro
                </button>
              )}
              <button type="button" className="btn btn-outline" onClick={() => selecionar([])}>
                Limpar seleção
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => pedirExclusao({
                  ids: todoFiltro ? null : checked,
                  count: selecionados,
                  nome: null,
                })}
              >
                Apagar selecionados
              </button>
            </div>
          )}
          <div className="panel table-scroll" aria-busy={loading}>
            {loading ? <p className="empty">Carregando leads…</p> :
              <LeadTable rows={rows} selectedId={selectedId} onSelect={detalhe.open}
                checked={checked} onCheck={marcar} onCheckAll={(valor) => selecionar(valor ? rows.map((row) => row.id) : [])}
                onDelete={(lead) => pedirExclusao({ ids: [lead.id], count: 1, nome: lead.name })} />}
          </div>
          <div className="pagination">
            <span className="mono">{total} leads · página {Math.floor(offset / 50) + 1}</span>
            <button className="btn btn-outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 50))}>Anterior</button>
            <button className="btn btn-outline" disabled={offset + 50 >= total || loading} onClick={() => setOffset(offset + 50)}>Próxima</button>
          </div>
        </div>
      </div>
      {alvo && (
        <DeleteLeadsDialog
          count={alvo.count}
          nome={alvo.nome}
          apagando={apagando}
          erro={erroExclusao}
          onConfirm={confirmarExclusao}
          onCancel={() => { if (!apagando) { setAlvo(null); setErroExclusao(null); } }}
        />
      )}
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
