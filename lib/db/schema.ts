import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const TEMPERATURES = ['quente', 'morno', 'frio'] as const;
export const VERIFICATIONS = ['pendente', 'qualificado', 'descartado'] as const;
export const STAGE_KINDS = ['open', 'won', 'lost'] as const;
export const ACTIVITY_KINDS = [
  'ligacao', 'email', 'whatsapp', 'dm', 'visita', 'nota', 'stage_change',
] as const;

export type Temperature = (typeof TEMPERATURES)[number];
export type Verification = (typeof VERIFICATIONS)[number];
export type StageKind = (typeof STAGE_KINDS)[number];
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const stages = sqliteTable('stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  color: text('color'),
  kind: text('kind', { enum: STAGE_KINDS }).notNull().default('open'),
}, (t) => [check('stages_kind_check', sql`${t.kind} in ('open', 'won', 'lost')`)]);

export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  placeId: text('place_id'),
  name: text('name').notNull(),
  formattedAddress: text('formatted_address'),
  lat: real('lat'),
  lng: real('lng'),
  phone: text('phone'),
  websiteUri: text('website_uri'),
  rating: real('rating'),
  userRatingCount: integer('user_rating_count'),
  businessStatus: text('business_status'),
  primaryType: text('primary_type'),
  primaryTypeDisplay: text('primary_type_display'),
  googleMapsUri: text('google_maps_uri'),
  rawJson: text('raw_json'),
  capturedAt: text('captured_at').notNull(),
  temperature: text('temperature', { enum: TEMPERATURES }).notNull(),
  stageId: integer('stage_id').references(() => stages.id),
  verification: text('verification', { enum: VERIFICATIONS }).notNull().default('pendente'),
  disqualifyReason: text('disqualify_reason'),
  verifiedBy: text('verified_by', { enum: ['manual', 'ai'] }),
  verifiedAt: text('verified_at'),
  contactName: text('contact_name'),
  email: text('email'),
  instagram: text('instagram'),
  whatsapp: text('whatsapp'),
  notes: text('notes'),
  nextAction: text('next_action'),
  nextActionAt: text('next_action_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('leads_place_id_ux').on(t.placeId),
  index('leads_temperature_ix').on(t.temperature),
  index('leads_verification_ix').on(t.verification),
  index('leads_stage_ix').on(t.stageId),
  index('leads_next_action_ix').on(t.nextActionAt),
  check('leads_temperature_check', sql`${t.temperature} in ('quente', 'morno', 'frio')`),
  check('leads_verification_check', sql`${t.verification} in ('pendente', 'qualificado', 'descartado')`),
  check('leads_verified_by_check', sql`${t.verifiedBy} is null or ${t.verifiedBy} in ('manual', 'ai')`),
]);

export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  leadId: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ACTIVITY_KINDS }).notNull(),
  body: text('body'),
  occurredAt: text('occurred_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('activities_lead_ix').on(t.leadId, t.occurredAt),
  check('activities_kind_check', sql`${t.kind} in ('ligacao', 'email', 'whatsapp', 'dm', 'visita', 'nota', 'stage_change')`),
]);

export const searchPresets = sqliteTable('search_presets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), textQuery: text('text_query').notNull(),
  includedType: text('included_type'), minRating: real('min_rating'),
  filtersJson: text('filters_json').notNull(), maxPages: integer('max_pages').notNull().default(3),
  createdAt: text('created_at').notNull(), lastUsedAt: text('last_used_at'),
});

export const searches = sqliteTable('searches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  presetId: integer('preset_id').references(() => searchPresets.id),
  textQuery: text('text_query').notNull(), includedType: text('included_type'),
  minRating: real('min_rating'), filtersJson: text('filters_json').notNull(),
  pagesFetched: integer('pages_fetched').notNull().default(0),
  apiRequests: integer('api_requests').notNull().default(0), rawCount: integer('raw_count').notNull().default(0),
  newCount: integer('new_count').notNull().default(0), executedAt: text('executed_at').notNull(), error: text('error'),
});

export const leadSearches = sqliteTable('lead_searches', {
  leadId: integer('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  searchId: integer('search_id').notNull().references(() => searches.id, { onDelete: 'cascade' }),
  wasNew: integer('was_new', { mode: 'boolean' }).notNull(),
}, (t) => [primaryKey({ columns: [t.leadId, t.searchId] })]);

export type Stage = typeof stages.$inferSelect;
export type NewStage = typeof stages.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;
export type SearchPreset = typeof searchPresets.$inferSelect;
export type NewSearchPreset = typeof searchPresets.$inferInsert;

export const DEFAULT_STAGES: NewStage[] = [
  { name: 'Novo', position: 1, color: '#737373', kind: 'open' },
  { name: 'Contatado', position: 2, color: '#2f6b4f', kind: 'open' },
  { name: 'Reunião', position: 3, color: '#1f4f7a', kind: 'open' },
  { name: 'Proposta', position: 4, color: '#7a5b1f', kind: 'open' },
  { name: 'Fechado', position: 5, color: '#0a0a0a', kind: 'won' },
  { name: 'Perdido', position: 6, color: '#a33', kind: 'lost' },
];
