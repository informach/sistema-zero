/**
 * Marca de "corpo acima do limite", detectada no `onParse` (que tem acesso ao
 * env). O marcador é consumido no `onTransform` global para devolver 413 antes
 * dos handlers; isso mantém a defesa centralizada em um ponto só.
 * Indexada pelo `Request` (WeakSet → coletado pelo GC).
 */
const oversizeBodies = new WeakSet<Request>()

export function markOversizeBody(request: Request): void {
  oversizeBodies.add(request)
}

export function isOversizeBody(request: Request): boolean {
  return oversizeBodies.has(request)
}
