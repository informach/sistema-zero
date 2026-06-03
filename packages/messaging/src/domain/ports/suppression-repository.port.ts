import type { Channel } from '../shared/channel'

export interface SuppressionRepository {
  /** O endereço (e-mail/telefone) está suprimido neste canal? */
  isSuppressed(channel: Channel, address: string): Promise<boolean>
  /** Adiciona à lista de supressão (idempotente — ON CONFLICT DO NOTHING). */
  add(channel: Channel, address: string, reason: string): Promise<void>
}
