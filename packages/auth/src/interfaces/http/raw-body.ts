/**
 * Marca de "corpo acima do limite", detectada no `onParse` (que tem acesso ao
 * env). É consumida pelas rotas para devolver 413 — o `onParse` do Elysia não
 * preserva erros tipados ao lançar (vira PARSE/400). Indexada pelo `Request`
 * (WeakSet → coletado pelo GC).
 */
const oversizeBodies = new WeakSet<Request>()

export function markOversizeBody(request: Request): void {
  oversizeBodies.add(request)
}

export function isOversizeBody(request: Request): boolean {
  return oversizeBodies.has(request)
}
