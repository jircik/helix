'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api/client';
import { reloadPage } from '@/lib/browser';
import type { SampleState } from '@/lib/services/samples';

export function useSampleState(load = true) {
  const [state, setState] = useState<SampleState | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!load) return;
    let active = true;
    apiGet<SampleState>('/api/samples').then((out) => { if (active) setState(out); }).catch(() => {});
    return () => { active = false; };
  }, [load]);

  async function run(method: 'POST' | 'DELETE') {
    setBusy(true);
    setErro(null);
    try {
      await apiSend('/api/samples', method);
      reloadPage();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return { state, busy, erro, generate: () => run('POST'), remove: () => run('DELETE') };
}
