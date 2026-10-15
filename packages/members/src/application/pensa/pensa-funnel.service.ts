import type { PensaFunnelCounts, PensaFunnelReader } from '../../domain/ports/pensa-funnel.port'
import { ValidationError } from '../../domain/shared/errors'

export interface PensaFunnelView extends PensaFunnelCounts {
  days: number
  since: string
  /** Respondidas do jeito da criança (escrevendo ou falando), derivado das outras contagens. */
  answeredTyped: number
}

const DAY_MS = 86_400_000

/** O funil do Pensa v2 no painel (Uso de IA). Janela em dias: 1 a 365, padrão 30. */
export class GetPensaFunnelService {
  constructor(
    private readonly reader: PensaFunnelReader,
    private readonly clock: () => Date,
  ) {}

  async execute(days = 30): Promise<PensaFunnelView> {
    if (!Number.isInteger(days) || days < 1 || days > 365)
      throw new ValidationError('Período inválido (de 1 a 365 dias)')
    const now = this.clock()
    const since = new Date(now.getTime() - days * DAY_MS)
    const counts = await this.reader.funnel(since, now)
    return {
      ...counts,
      days,
      since: since.toISOString(),
      answeredTyped: Math.max(
        0,
        counts.questions - counts.waitingOnQuestion - counts.answeredByChoice - counts.answeredAny,
      ),
    }
  }
}
