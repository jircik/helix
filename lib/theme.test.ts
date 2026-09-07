import { describe, it, expect, beforeEach } from 'vitest';
import {
  THEMES, THEME_STORAGE_KEY, DEFAULT_THEME,
  isTheme, readStoredTheme, resolveTheme, applyTheme,
} from './theme';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => (key in data ? data[key]! : null),
    setItem: (key: string, value: string) => { data[key] = value; },
    removeItem: (key: string) => { delete data[key]; },
    data,
  };
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('THEMES', () => {
  it('oferece claro, escuro e sistema', () => {
    expect(THEMES).toEqual(['sistema', 'claro', 'escuro']);
  });

  it('usa sistema como padrão', () => {
    expect(DEFAULT_THEME).toBe('sistema');
  });
});

describe('isTheme', () => {
  it('aceita os três valores conhecidos', () => {
    expect(isTheme('claro')).toBe(true);
    expect(isTheme('escuro')).toBe(true);
    expect(isTheme('sistema')).toBe(true);
  });

  it('recusa qualquer outra coisa', () => {
    expect(isTheme('dark')).toBe(false);
    expect(isTheme('')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe('readStoredTheme', () => {
  it('lê o tema guardado', () => {
    const storage = fakeStorage({ [THEME_STORAGE_KEY]: 'escuro' });
    expect(readStoredTheme(storage)).toBe('escuro');
  });

  it('cai no padrão quando não há nada guardado', () => {
    expect(readStoredTheme(fakeStorage())).toBe(DEFAULT_THEME);
  });

  it('cai no padrão quando o valor guardado é lixo', () => {
    const storage = fakeStorage({ [THEME_STORAGE_KEY]: 'roxo' });
    expect(readStoredTheme(storage)).toBe(DEFAULT_THEME);
  });

  it('cai no padrão quando o storage lança', () => {
    const quebrado = {
      getItem: () => { throw new Error('bloqueado pelo navegador'); },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(readStoredTheme(quebrado)).toBe(DEFAULT_THEME);
  });
});

describe('resolveTheme', () => {
  it('claro e escuro se resolvem em si mesmos, sem consultar o sistema', () => {
    expect(resolveTheme('claro', true)).toBe('claro');
    expect(resolveTheme('escuro', false)).toBe('escuro');
  });

  it('sistema segue a preferência do sistema operacional', () => {
    expect(resolveTheme('sistema', true)).toBe('escuro');
    expect(resolveTheme('sistema', false)).toBe('claro');
  });
});

describe('applyTheme', () => {
  it('marca data-theme no html quando resolve escuro', () => {
    applyTheme('escuro', false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
  });

  it('remove o atributo no claro, deixando o :root valer', () => {
    document.documentElement.setAttribute('data-theme', 'escuro');
    applyTheme('claro', true);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('com sistema, obedece a preferência recebida', () => {
    applyTheme('sistema', true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');

    applyTheme('sistema', false);
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('grava a escolha quando recebe um storage', () => {
    const storage = fakeStorage();
    applyTheme('escuro', false, storage);
    expect(storage.data[THEME_STORAGE_KEY]).toBe('escuro');
  });

  it('não quebra quando o storage recusa a escrita', () => {
    const quebrado = {
      getItem: () => null,
      setItem: () => { throw new Error('modo privado'); },
      removeItem: () => {},
    };
    expect(() => applyTheme('escuro', false, quebrado)).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
  });
});
