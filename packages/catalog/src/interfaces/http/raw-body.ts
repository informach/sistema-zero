/**
 * Marca de "corpo acima do limite", detectada no `onParse` (que tem acesso ao
 * env). O `onParse` do Elysia não preserva erros tipados ao lançar (vira
 * PARSE/400), então sinalizamos via WeakSet indexado pelo `Request`.
 */
const oversizeBodies = new WeakSet<Request>()

export function markOversizeBody(request: Request): void {
  oversizeBodies.add(request)
}

export function isOversizeBody(request: Request): boolean {
  return oversizeBodies.has(request)
}
