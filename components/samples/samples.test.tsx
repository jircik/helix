import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyWorkspace } from './EmptyWorkspace';
import { SampleBanner } from './SampleBanner';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiSend: vi.fn() }));
vi.mock('@/lib/api/client', () => api);
const reloadPage = vi.hoisted(() => vi.fn());
vi.mock('@/lib/browser', () => ({ reloadPage }));
beforeEach(() => vi.clearAllMocks());

describe('estado vazio', () => {
  it('oferece buscar no Google ou gerar exemplos', async () => {
    api.apiSend.mockResolvedValue({ leads: 60 });
    render(<EmptyWorkspace />);
    expect(screen.getByRole('link', { name: 'Buscar no Google' }).getAttribute('href')).toBe('/explorar');
    await userEvent.click(screen.getByRole('button', { name: 'Gerar dados de exemplo' }));
    expect(api.apiSend).toHaveBeenCalledWith('/api/samples', 'POST');
    expect(reloadPage).toHaveBeenCalled();
  });
});

describe('banner de exemplos', () => {
  it('só aparece com exemplos na conta e os remove', async () => {
    api.apiGet.mockResolvedValue({ hasSamples: true, hasLeads: true });
    api.apiSend.mockResolvedValue({ leads: 60, searches: 6 });
    render(<SampleBanner />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remover exemplos' }));
    expect(api.apiSend).toHaveBeenCalledWith('/api/samples', 'DELETE');
    expect(reloadPage).toHaveBeenCalled();
  });

  it('não renderiza nada sem exemplos', async () => {
    api.apiGet.mockResolvedValue({ hasSamples: false, hasLeads: true });
    const { container } = render(<SampleBanner />);
    await vi.waitFor(() => expect(api.apiGet).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
