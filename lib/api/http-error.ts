/** Erro com status HTTP explícito (ex.: 429 de cota). */
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}
