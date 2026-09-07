import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemperatureBadge } from './TemperatureBadge';

describe('TemperatureBadge', () => {
  it('mostra o rótulo em português', () => {
    render(<TemperatureBadge temperature="quente" />);
    expect(screen.getByText('Quente')).toBeDefined();
  });

  it('marca a temperatura no atributo para o CSS', () => {
    render(<TemperatureBadge temperature="morno" />);
    expect(screen.getByText('Morno').getAttribute('data-temperature')).toBe('morno');
  });

  it('explica o significado no title', () => {
    render(<TemperatureBadge temperature="frio" />);
    expect(screen.getByText('Frio').getAttribute('title')).toContain('site próprio');
  });
});
