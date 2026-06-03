import type { WhatsAppInstance } from '../lane/whatsapp-instance.aggregate'
import type { PacingConfig, PacingUpdate } from '../services/pacing'

export interface WhatsAppInstanceRepository {
  create(instance: WhatsAppInstance): Promise<void>
  update(instance: WhatsAppInstance): Promise<void>
  findById(id: string): Promise<WhatsAppInstance | null>
  findByInstanceName(instanceName: string): Promise<WhatsAppInstance | null>
  list(query: {
    limit: number
    offset: number
  }): Promise<{ items: WhatsAppInstance[]; total: number }>

  /**
   * Seleciona (atômico, `FOR UPDATE SKIP LOCKED`) UMA lane disponível (habilitada,
   * conectada, livre e com cota — via `isLaneAvailable`) e a RESERVA empurrando
   * `next_available_at` por `leaseMs` (evita que outro tick/réplica reuse o número
   * enquanto o envio está em voo). Retorna o agregado com o estado PRÉ-envio.
   */
  reserveAvailableLane(
    now: Date,
    leaseMs: number,
    config: PacingConfig,
  ): Promise<WhatsAppInstance | null>
  /** Aplica o ritmo após um envio bem-sucedido (contadores + próximo horário). */
  applyLanePacing(id: string, update: PacingUpdate): Promise<void>
  /** Adia a lane até `until` (libera/atrasa após envio sem sucesso ou sem trabalho). */
  delayLane(id: string, until: Date): Promise<void>
}
