import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemePicker } from './ThemePicker';
import { THEME_STORAGE_KEY } from '@/lib/theme';

function setSystemPrefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  setSystemPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemePicker', () => {
  it('oferece as três opções', () => {
    render(<ThemePicker />);
    const opcoes = screen.getAllByRole('radio');
    expect(opcoes.map((opcao) => opcao.textContent?.split('\n')[0])).toHaveLength(3);
    expect(screen.getByText('Sistema')).toBeDefined();
    expect(screen.getByText('Claro')).toBeDefined();
    expect(screen.getByText('Escuro')).toBeDefined();
  });

  it('marca sistema quando nada foi escolhido ainda', async () => {
    render(<ThemePicker />);
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /Sistema/ }).getAttribute('aria-checked')).toBe('true');
    });
  });

  it('marca a opção guardada no storage', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'escuro');
    render(<ThemePicker />);
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /Escuro/ }).getAttribute('aria-checked')).toBe('true');
    });
  });

  it('aplica o escuro no documento ao escolher', async () => {
    render(<ThemePicker />);
    await userEvent.click(screen.getByRole('radio', { name: /Escuro/ }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('escuro');
  });

  it('volta ao claro removendo o atributo', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'escuro');
    render(<ThemePicker />);

    await userEvent.click(screen.getByRole('radio', { name: /Claro/ }));

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('claro');
  });

  it('com sistema, obedece a preferência do SO', async () => {
    setSystemPrefersDark(true);
    render(<ThemePicker />);

    await userEvent.click(screen.getByRole('radio', { name: /Sistema/ }));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('sistema');
    expect(document.documentElement.getAttribute('data-theme')).toBe('escuro');
  });
});
