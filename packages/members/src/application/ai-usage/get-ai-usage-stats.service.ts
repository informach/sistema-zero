import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import type {
  AiUsageMonthStats,
  AiUsageRepository,
} from '../../domain/ports/ai-usage-repository.port'
import { ValidationError } from '../../domain/shared/errors'

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const TOP_ACCOUNTS_LIMIT = 20

/**
 * Agregados de uso de IA para o painel admin: total do mês, uso de hoje, contas
 * distintas, breakdown por feature, série por dia e top contas (com a flag
 * `privileged` para o painel rotular a equipe). `month` ausente → mês civil SP
 * corrente; formato inválido → 400.
 */
export class GetAiUsageStatsService {
  constructor(
    private readonly aiUsage: AiUsageRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(month?: string): Promise<AiUsageMonthStats> {
    const today = localDateSaoPaulo(this.clock())
    const target = month ?? today.slice(0, 7)
    if (!MONTH_RE.test(target)) {
      throw new ValidationError('Mês inválido (esperado YYYY-MM)')
    }
    return this.aiUsage.statsForMonth(target, today, TOP_ACCOUNTS_LIMIT)
  }
}
