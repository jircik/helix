'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Activity, ActivityKind, Lead } from '@/lib/db/schema';
import type { UserBlockPatch } from '@/lib/repo/leads';
import { apiGet, apiSend } from '@/lib/api/client';

export interface LeadDetailData {
  lead: Lead;
  activities: Activity[];
}

/**
 * Estado do modal de detalhe: qual lead está aberto, o que já carregou e as
 * três escritas que ele faz.
 *
 * `onChanged` avisa a tela dona da lista que algo mudou — o Pipeline precisa
 * recarregar para o card trocar de coluna, e as listas para refletir etapa e
 * verificação. Recarregar é responsabilidade de quem tem a lista, não daqui.
 */
export function useLeadDetail(
  onChanged?: () => void | Promise<void>,
  /** Abre já num lead — usado pelo link /leads?leadId=N. */
  initialOpenId: number | null = null,
) {
  const [openId, setOpenId] = useState<number | null>(initialOpenId);
  const [detail, setDetail] = useState<LeadDetailData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (openId === null) return;
    let active = true;
    apiGet<LeadDetailData>('/api/leads/' + openId)
      .then((out) => { if (active) setDetail(out); })
      .catch((e: Error) => { if (active) setErro(e.message); });
    return () => { active = false; };
  }, [openId, revision]);

  const refresh = useCallback(async () => {
    setRevision((value) => value + 1);
    await onChanged?.();
  }, [onChanged]);

  const patch = useCallback(async (body: UserBlockPatch) => {
    if (openId === null) return;
    await apiSend('/api/leads/' + openId, 'PATCH', body);
    await refresh();
  }, [openId, refresh]);

  const moveStage = useCallback(async (stageId: number) => {
    if (openId === null) return;
    await apiSend('/api/leads/' + openId + '/stage', 'PUT', { stageId });
    await refresh();
  }, [openId, refresh]);

  const addActivity = useCallback(async (input: { kind: ActivityKind; body: string }) => {
    if (openId === null) return;
    await apiSend('/api/leads/' + openId + '/activities', 'POST', input);
    await refresh();
  }, [openId, refresh]);

  return {
    openId,
    /** Só entrega o detalhe quando ele é do lead aberto — evita piscar o anterior. */
    detail: detail?.lead.id === openId ? detail : null,
    erro,
    open: setOpenId,
    close: useCallback(() => setOpenId(null), []),
    patch,
    moveStage,
    addActivity,
  };
}
