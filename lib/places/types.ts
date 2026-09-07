import type { Temperature } from '@/lib/db/schema';

/** Forma de um item de `places` na resposta de places:searchText. */
export interface PlaceRaw {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
}

export interface SearchTextResponse {
  places?: PlaceRaw[];
  nextPageToken?: string;
}

export interface NormalizedPlace {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  websiteUri: string | null;
  rating: number | null;
  userRatingCount: number | null;
  businessStatus: string | null;
  primaryType: string | null;
  primaryTypeDisplay: string | null;
  googleMapsUri: string | null;
  rawJson: string;
  temperature: Temperature;
}
