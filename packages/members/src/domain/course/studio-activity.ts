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
 * o conjunto inteiro; só `structure` é à prova de fraude.
 *
 * ⚠️ O `evaluateStructure*` aqui PRECISA espelhar o `structure.ts` do studio
 * (mesmas fixtures) — mudou um, mude o outro.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

export interface ActivityCheckBase {
  id: string
  label: string
  hint?: string
  /** Peso na nota (default 1). */
  weight?: number
}

export type StructureRule =
  | { type: 'usesLoop' }
  | { type: 'declaresVariable'; name: string }
  | { type: 'definesFunction'; name: string }
  | { type: 'callsFunction'; name: string }
  | { type: 'usesBlock'; blockType: string }

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

const LOOP_TYPES: ReadonlySet<string> = new Set([
  'repeat',
  'while',
  'doWhile',
  'forOf',
  'forRange',
  'forEach',
])
const VAR_DECL_TYPES: ReadonlySet<string> = new Set(['var', 'declareVar'])
const CALL_TYPES: ReadonlySet<string> = new Set(['callFunction', 'call'])
const MAX_WALK_NODES = 200_000

function someJsNode(js: unknown, predicate: (node: Record<string, unknown>) => boolean): boolean {
  const stack: unknown[] = [js]
  let visited = 0
  while (stack.length > 0) {
    const current = stack.pop()
    if (visited++ > MAX_WALK_NODES) return false
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }
    if (!current || typeof current !== 'object') continue
    const node = current as Record<string, unknown>
    if (typeof node.type === 'string' && predicate(node)) return true
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') stack.push(value)
    }
  }
  return false
}

function someBlockType(blocksState: unknown, blockType: string): boolean {
  const stack: unknown[] = [blocksState]
  let visited = 0
  while (stack.length > 0) {
    const current = stack.pop()
    if (visited++ > MAX_WALK_NODES) return false
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }
    if (!current || typeof current !== 'object') continue
    const node = current as Record<string, unknown>
    if (node.type === blockType) return true
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') stack.push(value)
    }
  }
  return false
}

/** Extrai `ir.js` e `blocksState` do projeto submetido (JSON opaco). */
function extractIr(project: unknown): { js: unknown; blocksState: unknown } {
  const p = (project ?? {}) as Record<string, unknown>
  const ir = (p.ir ?? {}) as Record<string, unknown>
  return { js: ir.js ?? [], blocksState: p.blocksState ?? null }
}

export function evaluateStructureRule(rule: StructureRule, project: unknown): boolean {
  const { js, blocksState } = extractIr(project)
  switch (rule.type) {
    case 'usesLoop':
      return someJsNode(js, (n) => LOOP_TYPES.has(n.type as string))
    case 'declaresVariable':
      return someJsNode(js, (n) => VAR_DECL_TYPES.has(n.type as string) && n.name === rule.name)
    case 'definesFunction':
      return someJsNode(js, (n) => n.type === 'funcDecl' && n.name === rule.name)
    case 'callsFunction':
      return someJsNode(js, (n) => CALL_TYPES.has(n.type as string) && n.name === rule.name)
    case 'usesBlock':
      return someBlockType(blocksState, rule.blockType)
  }
}

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
  if (activity.passingScore !== undefined && activity.checks.length === 0) {
    return 'Uma atividade com nota de corte precisa de ao menos uma checagem'
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
