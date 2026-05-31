/**
 * O corpo bruto (texto exato enviado) é necessário para (a) verificar a
 * assinatura HMAC e (b) calcular o fingerprint de idempotência. Como o corpo de
 * um `Request` só pode ser lido uma vez, capturamos no `onParse` e guardamos
 * aqui, indexado pelo próprio `Request` (WeakMap → coletado pelo GC).
 */
const rawBodyStore = new WeakMap<Request, string>()

export function storeRawBody(request: Request, raw: string): void {
  rawBodyStore.set(request, raw)
}

export function getRawBody(request: Request): string {
  return rawBodyStore.get(request) ?? ''
}

/**
 * Marca de "corpo acima do limite", detectada no `onParse` (que tem acesso ao
 * env). É consumida pelas rotas (`enforceBodyLimit`) para devolver 413 — o
 * `onParse` do Elysia não preserva erros tipados ao lançar (vira PARSE/400).
 */
const oversizeBodies = new WeakSet<Request>()

export function markOversizeBody(request: Request): void {
  oversizeBodies.add(request)
}

export function isOversizeBody(request: Request): boolean {
  return oversizeBodies.has(request)
}
