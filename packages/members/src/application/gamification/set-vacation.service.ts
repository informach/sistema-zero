import type { CourseAudience } from '../../domain/course/course'
import { localDateSaoPaulo } from '../../domain/gamification/gamification'
import { VacationInvalidError } from '../../domain/gamification/gamification.errors'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** Teto da janela (anti-abuso): férias longas demais virariam "streak eterno". */
const MAX_VACATION_DAYS = 30

/** Quantidade de dias civis cobertos por uma janela inclusiva `[a,b]`. */
function inclusiveDaysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()
  return Math.round(ms / 86_400_000) + 1
}

/**
 * Agenda (ou limpa) a janela de FÉRIAS do perfil — dias dentro dela não quebram a
 * sequência. Valida formato, ordem, não-passado e teto de 30 dias. `from=to=null` limpa.
 */
export class SetVacationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    from: string | null,
    to: string | null,
  ): Promise<{ vacationFrom: string | null; vacationTo: string | null }> {
    const now = this.clock()
    if (from === null && to === null) {
      await this.repo.setVacation(userId, accountId, audience, null, null, now)
      return { vacationFrom: null, vacationTo: null }
    }
    if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
      throw new VacationInvalidError()
    }
    const today = localDateSaoPaulo(now)
    if (to < from) throw new VacationInvalidError('A data de fim é antes do início')
    if (to < today) throw new VacationInvalidError('As férias não podem ser no passado')
    if (inclusiveDaysBetween(from, to) > MAX_VACATION_DAYS) {
      throw new VacationInvalidError(`As férias podem durar no máximo ${MAX_VACATION_DAYS} dias`)
    }
    await this.repo.setVacation(userId, accountId, audience, from, to, now)
    return { vacationFrom: from, vacationTo: to }
  }
}
