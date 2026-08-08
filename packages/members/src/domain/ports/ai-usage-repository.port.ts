/**
 * Porta do contador de uso de IA por CONTA (quota diária + mensal).
 *
 * O `consume` é ATÔMICO: checa os dois tetos E incrementa numa transação
 * serializada por conta (advisory lock) — dois consumos simultâneos nunca furam
 * o limite. `privileged` (equipe) NUNCA é recusado, mas o uso é GRAVADO mesmo
 * assim (visibilidade de custo no admin, com a flag para filtrar).
 */
export interface ConsumeAiUsageInput {
  accountId: string
  /** Dia civil de São Paulo `YYYY-MM-DD` (o use case deriva — mesma régua do streak). */
  day: string
  /** Prefixo `YYYY-MM` do mês civil SP (derivado do `day`). */
  month: string
  /** Identificador do recurso (`pensa-chat` | `pensa-synthesis` | `studio-describe` | futuros). */
  feature: string
  /** Equipe (superadmin/admin/staff): grava mas nunca recusa. */
  privileged: boolean
  dailyLimit: number
  monthlyLimit: number
  now: Date
}

export interface ConsumeAiUsageOutcome {
  allowed: boolean
  /** Qual teto barrou (só quando `allowed: false`). */
  scope?: 'day' | 'month'
  /** Uso do dia APÓS este consumo (ou o atual, quando recusado). */
  usedDay: number
  /** Uso do mês APÓS este consumo (ou o atual, quando recusado). */
  usedMonth: number
}

export interface AiUsageFeatureTotal {
  feature: string
  used: number
}

export interface AiUsageDayTotal {
  /** `YYYY-MM-DD` */
  day: string
  used: number
}

export interface AiUsageAccountTotal {
  accountId: string
  used: number
  privileged: boolean
}

export interface AiUsageMonthStats {
  /** `YYYY-MM` consultado. */
  month: string
  monthUsed: number
  /** Uso do dia civil SP corrente (0 fora do mês consultado). */
  todayUsed: number
  /** Contas distintas com uso no mês. */
  accounts: number
  byFeature: AiUsageFeatureTotal[]
  days: AiUsageDayTotal[]
  topAccounts: AiUsageAccountTotal[]
}

export interface AiUsageTotals {
  usedDay: number
  usedMonth: number
}

export interface AiUsageRepository {
  consume(input: ConsumeAiUsageInput): Promise<ConsumeAiUsageOutcome>
  /**
   * Leitura pura do consumo da conta — NÃO grava e NÃO consome crédito (é o que
   * alimenta o medidor "quanto ainda tenho"). Deliberadamente SEM o advisory lock
   * do `consume`: o lock é por conta e serializaria a leitura contra consumos em
   * voo. Ler um crédito atrasado num medidor é irrelevante; travar o load da tela
   * da criança não é.
   */
  totals(input: { accountId: string; day: string; month: string }): Promise<AiUsageTotals>
  statsForMonth(month: string, today: string, topLimit: number): Promise<AiUsageMonthStats>
}
