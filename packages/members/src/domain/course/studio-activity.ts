/**
 * Atividade com AUTO-CORREÇÃO do bloco Estúdio (correção HÍBRIDA — lado servidor).
 *
 * Estes tipos são o ESPELHO (mantido à mão) dos de `@sistemazero/studio`
 * (`src/studio/activity.ts`) — o members é backend e NÃO importa a lib do editor.
 *
 * **O que o servidor faz:** RECALCULA só as checagens de `structure` andando o IR
 * do projeto submetido (anti-cola barato, sem executar). Para `behavior`/
 * `testcase`/`code` REGISTRA o resultado reportado pelo cliente (marcado
 * `verifiedBy:'client'`) — não há sandbox/DOM no servidor. A nota gravada/gate usa
 * o conjunto inteiro; `structure` é recalculada no servidor, sem comprovar execução.
 *
 * As regras e o avaliador estrutural vêm de `@sistemazero/core/learning`,
 * compartilhados com a simulação do professor e com o Estúdio.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

export interface ActivityCheckBase {
  id: string
  label: string
  hint?: string
  /** Peso na nota (default 1). */
  weight?: number
}

export type StructureRule = import('@sistemazero/core/learning').SectionStructureRule

export interface StructureCheck extends ActivityCheckBase {
  kind: 'structure'
  rule: StructureRule
}

export type BehaviorRule =
  | { type: 'consoleContains'; text: string }
  | { type: 'domSelectorExists'; selector: string }
  | { type: 'domSelectorText'; selector: string; text: string }
  | { type: 'globalEquals'; name: string; value: JsonValue }

export interface BehaviorCheck extends ActivityCheckBase {
  kind: 'behavior'
  rule: BehaviorRule
}

export interface TestCaseCheck extends ActivityCheckBase {
  kind: 'testcase'
  functionName: string
  /** `id` é só p/ a UI de autoria (key estável); o grading ignora. */
  cases: { id?: string; args: JsonValue[]; expected: JsonValue }[]
}

export interface CodeCheck extends ActivityCheckBase {
  kind: 'code'
  source: string
}

export type ActivityCheck = StructureCheck | BehaviorCheck | TestCaseCheck | CodeCheck
export type ActivityCheckKind = ActivityCheck['kind']

export interface LessonActivity {
  instructions: string
  checks: ActivityCheck[]
  passingScore?: number
}

export type CheckVerifiedBy = 'server' | 'client'

export interface StudioCheckResult {
  checkId: string
  kind: ActivityCheckKind
  passed: boolean
  message?: string
  verifiedBy: CheckVerifiedBy
}

/** O que o cliente reporta no envio (subconjunto — sem `kind`/`verifiedBy`). */
export interface ClientCheckResult {
  checkId: string
  passed: boolean
  message?: string
}

export interface StudioGrade {
  /** 0–100, inteiro (soma dos pesos das passadas / soma dos pesos). */
  score: number
  /** `score >= passingScore` (ou `true` quando formativa). */
  passed: boolean
  results: StudioCheckResult[]
}

// ── Avaliação de ESTRUTURA (anda o IR do projeto submetido) ─────────────────

export { evaluateStudioProjectStructure as evaluateStructureRule } from '@sistemazero/studio/server-project-checks'

import { evaluateStudioProjectStructure as evaluateStructureRule } from '@sistemazero/studio/server-project-checks'

// ── Nota + autoria ───────────────────────────────────────────────────────────

function weightOf(check: ActivityCheck): number {
  const w = check.weight
  return typeof w === 'number' && w > 0 ? w : 1
}

/**
 * Gradua a entrega: RECALCULA `structure` no servidor; mescla o resultado
 * reportado pelo cliente p/ os demais. Nota ponderada (espelha `gradeQuizAttempt`);
 * sem `passingScore` é FORMATIVA (`passed: true`).
 */
export function gradeStudioActivity(
  activity: LessonActivity,
  submittedProject: unknown,
  clientResults: readonly ClientCheckResult[],
): StudioGrade {
  const byClientId = new Map(clientResults.map((r) => [r.checkId, r]))
  const results: StudioCheckResult[] = activity.checks.map((check) => {
    if (check.kind === 'structure') {
      return {
        checkId: check.id,
        kind: 'structure',
        passed: evaluateStructureRule(check.rule, submittedProject),
        verifiedBy: 'server',
      }
    }
    const reported = byClientId.get(check.id)
    return {
      checkId: check.id,
      kind: check.kind,
      passed: reported?.passed ?? false,
      message: reported ? reported.message : 'sem resultado reportado',
      verifiedBy: 'client',
    }
  })

  const totalWeight = activity.checks.reduce((sum, c) => sum + weightOf(c), 0)
  const passedById = new Map(results.map((r) => [r.checkId, r.passed]))
  const passedWeight = activity.checks.reduce(
    (sum, c) => sum + (passedById.get(c.id) ? weightOf(c) : 0),
    0,
  )
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100
  const passed = activity.passingScore === undefined ? true : score >= activity.passingScore
  return { score, passed, results }
}

/**
 * Coerência da atividade na AUTORIA (além do shape TypeBox). Retorna a mensagem
 * do problema, ou `null` se válida. Espelha `validateQuizAuthoring`.
 */
export function validateStudioActivityAuthoring(activity: LessonActivity): string | null {
  // Atividade COM nota de corte PRECISA de ≥1 checagem (senão a nota é sempre 100
  // e o gate seria vácuo) — espelha o quiz com passingScore sem questões.
  if (activity.passingScore !== undefined) {
    if (activity.checks.length === 0) {
      return 'Uma atividade com nota de corte precisa de ao menos uma checagem'
    }
    // O gate confiável é o `structure` (recalculado no servidor); behavior/testcase/
    // code são REPORTADOS pelo cliente (os checkIds vão ao aluno) e burláveis. Uma
    // atividade GATED sem nenhuma checagem de estrutura teria a aprovação trivialmente
    // forjável — exige ≥1 `structure` (espelha "quiz gated precisa de ≥1 questão").
    if (!activity.checks.some((c) => c.kind === 'structure')) {
      return 'Uma atividade com nota de corte precisa de ao menos uma checagem de estrutura (a única à prova de fraude)'
    }
    // …e o `structure` (recalculado no servidor) precisa de PESO SUFICIENTE: se as
    // checagens client-trusted (behavior/testcase/code, REPORTADAS pelo cliente e
    // burláveis) somarem peso bastante p/ bater a nota de corte sozinhas, o aluno
    // forja `passed` nelas e passa o gate sem o servidor verificar nada. Exige que a
    // nota MÁXIMA forjável sem estrutura fique ABAIXO da nota de corte (i.e. é
    // impossível passar sem o `structure` server-side contribuir).
    const totalWeight = activity.checks.reduce((sum, c) => sum + weightOf(c), 0)
    const structureWeight = activity.checks
      .filter((c) => c.kind === 'structure')
      .reduce((sum, c) => sum + weightOf(c), 0)
    const maxForgeableScore =
      totalWeight > 0 ? Math.round(((totalWeight - structureWeight) / totalWeight) * 100) : 0
    if (maxForgeableScore >= activity.passingScore) {
      return 'As checagens de estrutura (à prova de fraude) precisam de peso suficiente: hoje a nota é alcançável só com as checagens reportadas pelo cliente (burláveis). Aumente o peso das checagens de estrutura ou reduza a nota de corte.'
    }
  }
  const ids = new Set<string>()
  for (const check of activity.checks) {
    if (!check.id) return 'Toda checagem precisa de um id'
    if (ids.has(check.id)) return `Checagem com id duplicado: ${check.id}`
    ids.add(check.id)
    if (typeof check.weight === 'number' && check.weight <= 0) {
      return `A checagem ${check.id} tem peso inválido (use > 0)`
    }
    if (check.kind === 'code' && !check.source.trim()) {
      return `A checagem ${check.id} (código) precisa de uma asserção`
    }
    if (check.kind === 'testcase') {
      if (!check.functionName.trim()) {
        return `A checagem ${check.id} (caso de teste) precisa do nome da função`
      }
      if (check.cases.length === 0) {
        return `A checagem ${check.id} (caso de teste) precisa de ao menos um caso`
      }
    }
    if (check.kind === 'structure') {
      const r = check.rule
      if (
        (r.type === 'declaresVariable' ||
          r.type === 'definesFunction' ||
          r.type === 'callsFunction') &&
        !r.name.trim()
      ) {
        return `A checagem ${check.id} (estrutura) precisa de um nome`
      }
      if (r.type === 'usesBlock' && !r.blockType.trim()) {
        return `A checagem ${check.id} (estrutura) precisa do tipo de bloco`
      }
    }
  }
  return null
}
