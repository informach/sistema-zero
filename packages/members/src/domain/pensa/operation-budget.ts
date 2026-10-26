import * as P from '@sistemazero/core/pensa'

/**
 * O orçamento de uma operação do Pensa, numa régua só: a reivindicação do trabalho recusa por
 * ela e a view diz por ela se "Tentar de novo" ainda pode dar certo (`retryable`).
 *
 * Incidente de 26/10/2026 (staging): a rodada de conversa gastou as duas tentativas da unidade
 * (a primeira e o reparo automático do worker) e a tela seguiu oferecendo "Tentar de novo",
 * que a reivindicação recusava na hora, para sempre. Uma unidade nunca ganha tentativa nova
 * (doc do planner: "Cada unidade admite até 2 tentativas"; o reparo não ganha orçamento
 * invisível); quem destrava a conversa é um pedido NOVO da criança, que abre outra rodada.
 */
export interface PensaOperationBudgetRow {
  id: string
  kind: string
  step: string
  status: string
  input: Record<string, unknown>
  output: Record<string, unknown>
}

const emptyBudget: P.PensaOperationBudget = {
  dialogueCalls: 0,
  roundCalls: 0,
  planningCalls: 0,
  helpCalls: 0,
  unitAttempts: {},
}

/** O pedido da criança que paga a rodada; as tentativas são contadas por pedido e unidade. */
function requestKey(row: PensaOperationBudgetRow): string {
  return String(row.input.messageRequestId ?? row.id)
}

/** As partes do manifesto são únicas e o teto cobre de uma a duas tentativas por parte. */
export function pensaManifestCoherent(manifest: P.PensaWorkManifest): boolean {
  return (
    new Set(manifest.units.map((u) => u.id)).size === manifest.units.length &&
    manifest.maxCalls >= manifest.units.length &&
    manifest.maxCalls <= manifest.units.length * P.PENSA_LIMITS.attemptsPerUnit &&
    manifest.units.some((u) => u.id === 'outline')
  )
}

/** A unidade lógica que a próxima reivindicação gasta; `null` quando ela não está no manifesto. */
export function pensaOperationUnit(row: PensaOperationBudgetRow): string | null {
  if (row.step === 'understanding') return `understanding:${requestKey(row)}`
  if (row.step === 'answer') return `answer:${row.id}`
  if (row.step === 'outline') return 'outline'
  const key = row.output.unitKey
  const manifest = P.PensaWorkManifestSchema.safeParse(row.output.manifest)
  if (
    !manifest.success ||
    typeof key !== 'string' ||
    !manifest.data.units.some((u) => u.id === key)
  )
    return null
  return key
}

/**
 * Por que a próxima chamada ao provedor não cabe: `plan` quando o manifesto inteiro já gastou o
 * combinado, `unit` quando esta parte (ou a fase) chegou ao teto; `null` quando cabe.
 */
export function pensaBudgetRefusal(
  row: PensaOperationBudgetRow,
  unitId: string,
  budget: P.PensaOperationBudget,
  manifest: P.PensaWorkManifest | null,
): 'plan' | 'unit' | null {
  const request = requestKey(row)
  const dialogue = row.step === 'understanding'
  const help = row.kind === 'help'
  if (!dialogue && !help && manifest) {
    const used = manifest.units.reduce(
      (n, unit) => n + (budget.unitAttempts[`${request}:${unit.id}`] ?? 0),
      0,
    )
    if (used >= manifest.maxCalls) return 'plan'
  }
  if (
    (budget.unitAttempts[`${request}:${unitId}`] ?? 0) >= P.PENSA_LIMITS.attemptsPerUnit ||
    (help
      ? budget.helpCalls >= P.PENSA_LIMITS.helpCalls
      : dialogue
        ? budget.dialogueCalls >= P.PENSA_LIMITS.dialogueCalls ||
          budget.roundCalls >= P.PENSA_LIMITS.dialogueCallsPerRound
        : budget.planningCalls >= P.PENSA_LIMITS.planningCalls)
  )
    return 'unit'
  return null
}

/** O orçamento gravado na operação (ausente = nada gasto). */
export function pensaOperationBudget(row: PensaOperationBudgetRow): P.PensaOperationBudget | null {
  const budget = P.PensaOperationBudgetSchema.safeParse(row.input.budget ?? emptyBudget)
  return budget.success ? budget.data : null
}

/**
 * Uma operação que falhou só oferece "Tentar de novo" quando a próxima reivindicação cabe no
 * orçamento. A cota do dia/mês da conta fica de fora: ela renova com o tempo e tem recado próprio.
 */
export function pensaOperationRetryable(row: PensaOperationBudgetRow): boolean {
  if (row.status !== 'failed' || !['planning', 'help'].includes(row.kind)) return false
  const unitId = pensaOperationUnit(row)
  const budget = pensaOperationBudget(row)
  if (!unitId || !budget) return false
  let manifest: P.PensaWorkManifest | null = null
  if (row.output.manifest) {
    const parsed = P.PensaWorkManifestSchema.safeParse(row.output.manifest)
    if (!parsed.success || !pensaManifestCoherent(parsed.data)) return false
    manifest = parsed.data
  }
  return pensaBudgetRefusal(row, unitId, budget, manifest) === null
}
