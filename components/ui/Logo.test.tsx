import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('usa a cor da navegação no fundo, para o quadrado sumir no painel', () => {
    const { container } = render(<Logo />);
    const fundo = container.querySelector('path[fill]')!;
    expect(fundo.getAttribute('fill')).toBe('var(--surface)');
  });

  it('desenha a hélice em currentColor, para seguir o tema ativo', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('g')!.getAttribute('stroke')).toBe('currentColor');
    expect(container.querySelector('circle')!.getAttribute('fill')).toBe('currentColor');
  });

  it('não fixa nenhuma cor literal', () => {
    const { container } = render(<Logo />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('tem nome acessível', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'Helix' })).toBeDefined();
  });
});
