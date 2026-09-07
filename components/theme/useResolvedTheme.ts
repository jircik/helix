'use client';

import { useEffect, useState } from 'react';
import type { ResolvedTheme } from '@/lib/theme';

function current(): ResolvedTheme {
  return document.documentElement.getAttribute('data-theme') === 'escuro' ? 'escuro' : 'claro';
}

/**
 * O tema que está pintando a tela agora.
 *
 * Observa o atributo no `<html>` em vez de guardar estado próprio: assim
 * funciona seja qual for a origem da troca — o seletor de aparência, o script
 * de boot ou o sistema operacional mudando sozinho.
 */
export function useResolvedTheme(): ResolvedTheme {
  // O servidor não tem documento; o claro é o padrão do CSS e evita descasar.
  const [theme, setTheme] = useState<ResolvedTheme>('claro');

  useEffect(() => {
    const sync = () => setTheme(current());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
