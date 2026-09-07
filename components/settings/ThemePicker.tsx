'use client';

import { useEffect, useState } from 'react';
import {
  DARK_QUERY, THEMES, applyTheme, readStoredTheme, systemPrefersDark,
  type Theme,
} from '@/lib/theme';

const LABELS: Record<Theme, { title: string; description: string }> = {
  sistema: {
    title: 'Sistema',
    description: 'Acompanha a preferência do seu sistema operacional e troca junto com ela.',
  },
  claro: {
    title: 'Claro',
    description: 'Preto sobre off-white. O tema original do Helix.',
  },
  escuro: {
    title: 'Escuro',
    description: 'Off-white sobre preto, com as mesmas proporções e bordas.',
  },
};

/** Amostra das cores do tema, montada com as próprias variáveis do CSS. */
function Preview({ theme }: { theme: Theme }) {
  return (
    <span className="theme-preview" data-preview={theme} aria-hidden="true">
      <span className="theme-preview-bar" />
      <span className="theme-preview-body">
        <span className="theme-preview-line" />
        <span className="theme-preview-line short" />
      </span>
    </span>
  );
}

export function ThemePicker() {
  // Começa nulo de propósito: o servidor não conhece o localStorage, e marcar
  // uma opção antes de ler o que está guardado piscaria a escolha errada.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTheme(readStoredTheme(window.localStorage)), 0);
    return () => clearTimeout(timer);
  }, []);

  // Com "sistema", trocar o tema do SO tem que refletir na hora.
  useEffect(() => {
    if (theme !== 'sistema' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('sistema', media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  function escolher(next: Theme) {
    setTheme(next);
    applyTheme(next, systemPrefersDark(), window.localStorage);
  }

  return (
    <div className="theme-options" role="radiogroup" aria-label="Tema">
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          className="theme-option"
          aria-checked={theme === option}
          onClick={() => escolher(option)}
        >
          <Preview theme={option} />
          <span className="theme-option-text">
            <strong>{LABELS[option].title}</strong>
            <small>{LABELS[option].description}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
