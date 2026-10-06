// Sem imports: usado também por componentes do cliente.
export interface QuotaStatus { used: number; limit: number; remaining: number }

export const QUOTA_EXCEEDED_MESSAGE =
  'Limite diário de demonstração atingido. Gere dados de exemplo para explorar o app.';
