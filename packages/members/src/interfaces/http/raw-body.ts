/**
 * O corpo BRUTO (texto exato) é guardado no `onParse` para a verificação HMAC dos
 * webhooks (a assinatura é sobre os bytes exatos). Indexado pelo `Request`
 * (WeakMap → coletado pelo GC). `oversize` marca corpos acima do limite (→ 413).
 */
const rawBodies = new WeakMap<Request, string>()
const oversizeBodies = new WeakSet<Request>()

export function setRawBody(request: Request, text: string): void {
  rawBodies.set(request, text)
}

export function getRawBody(request: Request): string {
  return rawBodies.get(request) ?? ''
}

export function markOversizeBody(request: Request): void {
  oversizeBodies.add(request)
}

export function isOversizeBody(request: Request): boolean {
  return oversizeBodies.has(request)
}
