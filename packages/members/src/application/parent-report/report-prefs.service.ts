import type { ParentReportRepository } from '../../domain/ports/parent-report-repository.port'

export interface ParentReportPrefsView {
  /** `true` = o responsável DESATIVOU o resumo semanal por e-mail. */
  disabled: boolean
}

/**
 * Preferência do report semanal (opt-out) — toggle na Área dos pais. Keyada na
 * CONTA (o e-mail vai ao responsável); a rota resolve a conta pelo header.
 */
export class ParentReportPrefsService {
  constructor(
    private readonly reports: ParentReportRepository,
    private readonly clock: () => Date,
  ) {}

  async get(accountId: string): Promise<ParentReportPrefsView> {
    return { disabled: await this.reports.isDisabled(accountId) }
  }

  async set(accountId: string, disabled: boolean): Promise<ParentReportPrefsView> {
    await this.reports.setDisabled(accountId, disabled, this.clock())
    return { disabled }
  }
}
