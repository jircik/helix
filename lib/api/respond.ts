export function jsonOk<T>(data: T): Response {
  return Response.json(data as unknown as Record<string, unknown>, { status: 200 });
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function handle<T>(fn: () => T | Promise<T>): Promise<Response> {
  try {
    return jsonOk(await fn());
  } catch (error) {
    const message = error instanceof SyntaxError ? 'JSON inválido.' : error instanceof Error ? error.message : String(error);
    const status = /não encontrad/i.test(message) ? 404 : 400;
    return jsonError(message, status);
  }
}
