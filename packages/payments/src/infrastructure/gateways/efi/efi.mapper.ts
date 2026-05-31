import type { ProviderChargeStatus } from '../../../domain/ports/payment-gateway.port'

/**
 * Mapeia o status de uma cobrança Pix (cob) da Efí/BACEN para o nosso
 * vocabulário (`ProviderChargeStatus`).
 *
 * ATIVA → aguardando; CONCLUIDA → paga; REMOVIDA_* → expirada/cancelada.
 */
export function mapCobStatus(status: string | undefined): ProviderChargeStatus {
  switch (status) {
    case 'CONCLUIDA':
      return 'PAID'
    case 'ATIVA':
      return 'PENDING'
    case 'REMOVIDA_PELO_USUARIO_RECEBEDOR':
    case 'REMOVIDA_PELO_PSP':
      return 'EXPIRED'
    default:
      return 'PENDING'
  }
}

/** Converte "10.00" (reais, string da Efí) para centavos (bigint). */
export function reaisStringToCents(value: string | number | undefined): bigint {
  if (value === undefined || value === null) return 0n
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return 0n
  return BigInt(Math.round(num * 100))
}
