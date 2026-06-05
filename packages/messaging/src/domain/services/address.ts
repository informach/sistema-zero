import type { Channel } from '../shared/channel'

/**
 * Normaliza um endereço por canal para comparação/armazenamento estável:
 * e-mail em minúsculas; telefone só dígitos (remove `+`, espaços, separadores).
 * Sem isto a supressão vira queijo suíço — `User@X.com` ≠ `user@x.com` e
 * `+5511…` ≠ `5511…` não casariam na lista (consumidores diferentes mandam
 * formatos diferentes do MESMO destinatário).
 */
export function normalizeAddress(channel: Channel, address: string): string {
  const trimmed = address.trim()
  return channel === 'email' ? trimmed.toLowerCase() : trimmed.replace(/\D/g, '')
}
