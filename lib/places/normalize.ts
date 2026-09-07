import { classify } from '@/lib/classify/temperature';
import type { NormalizedPlace, PlaceRaw } from './types';

function orNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/** Devolve null para resultados sem id ou sem nome — sem eles o lead é inútil. */
export function normalize(raw: PlaceRaw): NormalizedPlace | null {
  const placeId = raw.id?.trim();
  const name = raw.displayName?.text?.trim();
  if (!placeId || !name) return null;

  const websiteUri = orNull(raw.websiteUri);

  return {
    placeId,
    name,
    formattedAddress: orNull(raw.formattedAddress),
    lat: orNull(raw.location?.latitude),
    lng: orNull(raw.location?.longitude),
    phone: orNull(raw.nationalPhoneNumber),
    websiteUri,
    rating: orNull(raw.rating),
    userRatingCount: orNull(raw.userRatingCount),
    businessStatus: orNull(raw.businessStatus),
    primaryType: orNull(raw.primaryType),
    primaryTypeDisplay: orNull(raw.primaryTypeDisplayName?.text),
    googleMapsUri: orNull(raw.googleMapsUri),
    rawJson: JSON.stringify(raw),
    temperature: classify(websiteUri),
  };
}
