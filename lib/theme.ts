/**
 * Preferência de tema. Só o valor resolvido — claro ou escuro — vira atributo
 * no `<html>`; "sistema" é uma preferência, não um tema.
 *
 * O claro é a ausência de `data-theme`, então o `:root` do CSS continua sendo
 * a definição canônica e nunca depende de JavaScript ter rodado.
 */
export const THEMES = ['sistema', 'claro', 'escuro'] as const;
export type Theme = (typeof THEMES)[number];

/** O que de fato pinta a tela. */
export type ResolvedTheme = 'claro' | 'escuro';

export const DEFAULT_THEME: Theme = 'sistema';
export const THEME_STORAGE_KEY = 'helix:tema';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Só o que precisamos de um Storage — facilita testar sem o navegador. */
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** Lê a preferência guardada. Storage indisponível ou sujo cai no padrão. */
export function readStoredTheme(storage: ThemeStorage): Theme {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'sistema') return systemPrefersDark ? 'escuro' : 'claro';
  return theme;
}

/**
 * Aplica no documento e, se receber um storage, persiste a escolha.
 * Falha de escrita não impede a troca — o tema vale para esta sessão.
 */
export function applyTheme(
  theme: Theme,
  systemPrefersDark: boolean,
  storage?: ThemeStorage,
): ResolvedTheme {
  const resolved = resolveTheme(theme, systemPrefersDark);

  if (resolved === 'escuro') {
    document.documentElement.setAttribute('data-theme', 'escuro');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  if (storage) {
    try { storage.setItem(THEME_STORAGE_KEY, theme); } catch { /* modo privado */ }
  }

  return resolved;
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(DARK_QUERY).matches;
}

/**
 * Roda antes da primeira pintura, inline no <head>. Sem isso o app pisca
 * branco a cada carregamento — agressivo num tema preto.
 * Serializado como string porque precisa ir para dentro de uma <script>.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(t!=='claro'&&t!=='escuro'&&t!=='sistema')t=${JSON.stringify(DEFAULT_THEME)};
var d=t==='escuro'||(t==='sistema'&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);
if(d)document.documentElement.setAttribute('data-theme','escuro');
}catch(e){}})();`;
