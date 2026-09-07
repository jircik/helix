import { describe, it, expect } from 'vitest';
import { normalize } from './normalize';
import type { PlaceRaw } from './types';

const completo: PlaceRaw = {
  id: 'ChIJ123',
  displayName: { text: 'Barbearia Valentins' },
  formattedAddress: 'R. Teodoro Sampaio, 100 - Pinheiros, São Paulo - SP',
  location: { latitude: -23.5617, longitude: -46.6899 },
  nationalPhoneNumber: '(11) 95459-2011',
  rating: 4.8,
  userRatingCount: 100,
  businessStatus: 'OPERATIONAL',
  primaryType: 'barber_shop',
  primaryTypeDisplayName: { text: 'Barbearia' },
  googleMapsUri: 'https://maps.google.com/?cid=1',
};

describe('normalize', () => {
  it('achata os campos aninhados da API', () => {
    const out = normalize(completo)!;
    expect(out.placeId).toBe('ChIJ123');
    expect(out.name).toBe('Barbearia Valentins');
    expect(out.primaryTypeDisplay).toBe('Barbearia');
    expect(out.lat).toBe(-23.5617);
    expect(out.lng).toBe(-46.6899);
  });

  it('classifica como quente quando não há websiteUri', () => {
    expect(normalize(completo)!.temperature).toBe('quente');
  });

  it('classifica como morno quando o site é Instagram', () => {
    const out = normalize({ ...completo, websiteUri: 'https://instagram.com/x' })!;
    expect(out.temperature).toBe('morno');
    expect(out.websiteUri).toBe('https://instagram.com/x');
  });

  it('classifica como frio quando há site próprio', () => {
    const out = normalize({ ...completo, websiteUri: 'https://valentins.com.br' })!;
    expect(out.temperature).toBe('frio');
  });

  it('preserva a resposta crua em rawJson', () => {
    const out = normalize(completo)!;
    expect(JSON.parse(out.rawJson)).toEqual(completo);
  });

  it('usa null para campos ausentes em vez de undefined', () => {
    const out = normalize({ id: 'x', displayName: { text: 'Sem dados' } })!;
    expect(out.lat).toBeNull();
    expect(out.lng).toBeNull();
    expect(out.phone).toBeNull();
    expect(out.rating).toBeNull();
    expect(out.formattedAddress).toBeNull();
  });

  it('descarta resultado sem id', () => {
    expect(normalize({ displayName: { text: 'X' } } as PlaceRaw)).toBeNull();
  });

  it('descarta resultado sem nome', () => {
    expect(normalize({ id: 'x' } as PlaceRaw)).toBeNull();
  });
});
