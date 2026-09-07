import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection, SAO_PAULO } from './useSelection';
import type { Lead } from '@/lib/db/schema';

const NOW = '2026-09-06T12:00:00.000Z';

function lead(id: number, lat: number | null, lng: number | null): Lead {
  return {
    id, placeId: `p${id}`, name: `Lead ${id}`, formattedAddress: null,
    lat, lng, phone: null, websiteUri: null, rating: null, userRatingCount: null,
    businessStatus: null, primaryType: null, primaryTypeDisplay: null,
    googleMapsUri: null, rawJson: '{}', capturedAt: NOW, temperature: 'quente',
    stageId: null, verification: 'pendente', disqualifyReason: null,
    verifiedBy: null, verifiedAt: null, contactName: null, email: null,
    instagram: null, whatsapp: null, notes: null, nextAction: null,
    nextActionAt: null, createdAt: NOW, updatedAt: NOW,
  } as Lead;
}

describe('useSelection', () => {
  it('começa sem seleção', () => {
    const { result } = renderHook(() => useSelection([lead(1, -23.5, -46.6)]));
    expect(result.current.selectedId).toBeNull();
    expect(result.current.selected).toBeNull();
  });

  it('seleciona e devolve o lead', () => {
    const rows = [lead(1, -23.5, -46.6), lead(2, -23.6, -46.7)];
    const { result } = renderHook(() => useSelection(rows));

    act(() => result.current.select(2));
    expect(result.current.selectedId).toBe(2);
    expect(result.current.selected?.name).toBe('Lead 2');
  });

  it('selecionar o mesmo id de novo mantém a seleção', () => {
    const { result } = renderHook(() => useSelection([lead(1, -23.5, -46.6)]));
    act(() => result.current.select(1));
    act(() => result.current.select(1));
    expect(result.current.selectedId).toBe(1);
  });

  it('centra no lead selecionado', () => {
    const rows = [lead(1, -23.5, -46.6), lead(2, -10, -40)];
    const { result } = renderHook(() => useSelection(rows));

    act(() => result.current.select(2));
    expect(result.current.center).toEqual({ lat: -10, lng: -40 });
  });

  it('sem seleção, centra no centroide dos leads com coordenada', () => {
    const rows = [lead(1, -20, -40), lead(2, -30, -50)];
    const { result } = renderHook(() => useSelection(rows));
    expect(result.current.center).toEqual({ lat: -25, lng: -45 });
  });

  it('ignora leads sem coordenada no centroide', () => {
    const rows = [lead(1, -20, -40), lead(2, null, null)];
    const { result } = renderHook(() => useSelection(rows));
    expect(result.current.center).toEqual({ lat: -20, lng: -40 });
  });

  it('cai em São Paulo quando nenhum lead tem coordenada', () => {
    const { result } = renderHook(() => useSelection([lead(1, null, null)]));
    expect(result.current.center).toEqual(SAO_PAULO);
  });

  it('cai em São Paulo com a lista vazia', () => {
    const { result } = renderHook(() => useSelection([]));
    expect(result.current.center).toEqual(SAO_PAULO);
  });

  it('limpa a seleção quando o lead sai da lista', () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useSelection(rows),
      { initialProps: { rows: [lead(1, -23.5, -46.6)] } },
    );

    act(() => result.current.select(1));
    rerender({ rows: [lead(2, -23.6, -46.7)] });

    expect(result.current.selected).toBeNull();
  });
});
