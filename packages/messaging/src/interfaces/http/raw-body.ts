/**
 * O corpo bruto (texto exato enviado) é necessário para verificar a assinatura
 * dos webhooks de status (SendGrid ECDSA / Evolution). Como o corpo de um
 * `Request` só pode ser lido uma vez, capturamos no `onParse` e guardamos aqui,
 * indexado pelo próprio `Request` (WeakMap → coletado pelo GC).
 */
const rawBodyStore = new WeakMap<Request, string>()

export function storeRawBody(request: Request, raw: string): void {
  rawBodyStore.set(request, raw)
}

export function getRawBody(request: Request): string {
  return rawBodyStore.get(request) ?? ''
}

/** Marca de "corpo acima do limite" (anti-DoS), detectada no `onParse`. */
const oversizeBodies = new WeakSet<Request>()

export function markOversizeBody(request: Request): void {
  oversizeBodies.add(request)
}

export function isOversizeBody(request: Request): boolean {
  return oversizeBodies.has(request)
}
