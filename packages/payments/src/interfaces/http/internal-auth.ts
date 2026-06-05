import { UnauthorizedError } from '@sistemazero/core/http'
import { safeEqual } from '@sistemazero/core/security'

/**
 * Defesa em profundidade: confirma que a chamada veio do GATEWAY. O gateway
 * injeta `x-internal-token` (header-inject, sobrescrevendo qualquer valor do
 * cliente) nas rotas admin + "minhas compras" — os headers `X-Auth-User-*` só
 * são confiáveis porque passaram por lá; sem este token, qualquer processo na
 * rede interna forjaria um admin (estorno!) ou o e-mail de um comprador chamando
 * o serviço direto. Sem `expected` (dev/local sem gateway) → no-op. Espelha o
 * members/catalog/messaging/auth (padrão 06/2026).
 */
export function assertInternalCaller(
  provided: string | undefined,
  expected: string | undefined,
): void {
  if (!expected) return
  if (!provided || !safeEqual(provided, expected)) {
    throw new UnauthorizedError('Chamada não autorizada (token interno ausente/inválido)')
  }
}
