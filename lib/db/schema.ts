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

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

/** Tabelas do Better Auth. Nomes e colunas seguem o schema padrão da lib. */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowMs).$onUpdate(() => new Date()),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (t) => [index('session_user_ix').on(t.userId)]);

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdate(() => new Date()),
}, (t) => [index('account_user_ix').on(t.userId)]);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowMs),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowMs).$onUpdate(() => new Date()),
}, (t) => [index('verification_identifier_ix').on(t.identifier)]);

const ownerId = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' });

export const stages = sqliteTable('stages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  color: text('color'),
  kind: text('kind', { enum: STAGE_KINDS }).notNull().default('open'),
}, (t) => [
  index('stages_user_ix').on(t.userId, t.position),
  check('stages_kind_check', sql`${t.kind} in ('open', 'won', 'lost')`),
]);

export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: ownerId(),
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
  isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
}, (t) => [
  uniqueIndex('leads_user_place_ux').on(t.userId, t.placeId),
  index('leads_user_updated_ix').on(t.userId, t.updatedAt),
  index('leads_user_temperature_ix').on(t.userId, t.temperature),
  index('leads_user_verification_ix').on(t.userId, t.verification),
  index('leads_stage_ix').on(t.stageId),
  index('leads_user_next_action_ix').on(t.userId, t.nextActionAt),
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
  userId: ownerId(),
  name: text('name').notNull(), textQuery: text('text_query').notNull(),
  includedType: text('included_type'), minRating: real('min_rating'),
  filtersJson: text('filters_json').notNull(), maxPages: integer('max_pages').notNull().default(3),
  createdAt: text('created_at').notNull(), lastUsedAt: text('last_used_at'),
});

export const searches = sqliteTable('searches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: ownerId(),
  presetId: integer('preset_id').references(() => searchPresets.id),
  textQuery: text('text_query').notNull(), includedType: text('included_type'),
  minRating: real('min_rating'), filtersJson: text('filters_json').notNull(),
  pagesFetched: integer('pages_fetched').notNull().default(0),
  apiRequests: integer('api_requests').notNull().default(0), rawCount: integer('raw_count').notNull().default(0),
  newCount: integer('new_count').notNull().default(0), executedAt: text('executed_at').notNull(), error: text('error'),
  isSample: integer('is_sample', { mode: 'boolean' }).notNull().default(false),
}, (t) => [
  index('searches_user_executed_ix').on(t.userId, t.executedAt),
  index('searches_executed_ix').on(t.executedAt),
]);

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

export const DEFAULT_STAGES: Omit<NewStage, 'userId'>[] = [
  { name: 'Novo', position: 1, color: '#737373', kind: 'open' },
  { name: 'Contatado', position: 2, color: '#2f6b4f', kind: 'open' },
  { name: 'Reunião', position: 3, color: '#1f4f7a', kind: 'open' },
  { name: 'Proposta', position: 4, color: '#7a5b1f', kind: 'open' },
  { name: 'Fechado', position: 5, color: '#0a0a0a', kind: 'won' },
  { name: 'Perdido', position: 6, color: '#a33', kind: 'lost' },
];

export type User = typeof user.$inferSelect;
