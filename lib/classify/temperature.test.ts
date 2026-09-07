import { describe, it, expect } from 'vitest';
import { classify, extractHost } from './temperature';

describe('extractHost', () => {
  it('remove o www e devolve o host', () => {
    expect(extractHost('https://www.Barbearia.com.BR/precos')).toBe('barbearia.com.br');
  });

  it('aceita URL sem protocolo', () => {
    expect(extractHost('barbearia.com.br/precos')).toBe('barbearia.com.br');
  });

  it('devolve null para entrada inválida', () => {
    expect(extractHost('não é url')).toBeNull();
    expect(extractHost('')).toBeNull();
    expect(extractHost(null)).toBeNull();
  });
});

describe('classify', () => {
  it('trata ausência de site como quente', () => {
    expect(classify(null)).toBe('quente');
    expect(classify(undefined)).toBe('quente');
    expect(classify('   ')).toBe('quente');
  });

  it('trata URL inválida como quente', () => {
    expect(classify('não é url')).toBe('quente');
  });

  it('trata rede social como morno', () => {
    expect(classify('https://instagram.com/barbearia')).toBe('morno');
    expect(classify('https://www.facebook.com/barbearia')).toBe('morno');
    expect(classify('https://linktr.ee/barbearia')).toBe('morno');
  });

  it('trata marketplace como morno', () => {
    expect(classify('https://www.ifood.com.br/delivery/sp/x')).toBe('morno');
    expect(classify('https://www.doctoralia.com.br/clinica/y')).toBe('morno');
  });

  it('trata subdomínio de social como morno', () => {
    expect(classify('https://pedido.ifood.com.br/x')).toBe('morno');
  });

  it('trata site próprio como frio', () => {
    expect(classify('https://barbearia.com.br')).toBe('frio');
  });

  it('não confunde domínio que apenas contém o nome de uma social', () => {
    expect(classify('https://meuinstagram.com.br')).toBe('frio');
    expect(classify('https://facebookmarketing.com')).toBe('frio');
  });
});
