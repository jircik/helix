import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CSS = 'app/globals.css';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Tokens declarados em qualquer bloco do CSS — :root e os temas. */
function declaredTokens(): Set<string> {
  const css = readFileSync(CSS, 'utf8');
  return new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]!));
}

function referencedTokens(text: string): string[] {
  return [...text.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!);
}

describe('tokens de design', () => {
  it('todo var() no CSS aponta para um token declarado', () => {
    const declared = declaredTokens();
    const orfaos = [...new Set(referencedTokens(readFileSync(CSS, 'utf8')))]
      .filter((token) => !declared.has(token) && !token.startsWith('--radix'));

    expect(orfaos).toEqual([]);
  });

  it('todo var() nos componentes aponta para um token declarado', () => {
    const declared = declaredTokens();
    const orfaos: string[] = [];

    for (const file of [...walk('components'), ...walk('app')]) {
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
      for (const token of referencedTokens(readFileSync(file, 'utf8'))) {
        if (!declared.has(token)) orfaos.push(`${file}: ${token}`);
      }
    }

    expect(orfaos).toEqual([]);
  });

  it('o tema escuro redefine todo token de cor do claro', () => {
    const css = readFileSync(CSS, 'utf8');
    const bloco = (seletor: string) =>
      new Set([...css.split(seletor + ' {')[1]!.split('}')[0]!.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));

    const claro = bloco(':root');
    const escuro = bloco('[data-theme="escuro"]');
    // Medidas não mudam com o tema; cor sim.
    const semTema = new Set(['--sidebar', '--topbar']);
    const faltando = [...claro].filter((token) => !escuro.has(token) && !semTema.has(token));

    expect(faltando).toEqual([]);
  });
});
