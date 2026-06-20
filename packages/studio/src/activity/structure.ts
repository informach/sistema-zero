import type { SZIR } from '#ir'
import type { CheckResult, StructureCheck, StructureRule } from '../studio/activity'

/**
 * Avaliação PURA das checagens de ESTRUTURA — anda o IR do projeto SEM rodar nada.
 *
 * ⚠️ Este é o ÚNICO tipo de checagem recalculado no servidor (members). O
 * `evaluateStructureChecks` do members PRECISA espelhar este algoritmo (mesmas
 * fixtures) — qualquer mudança aqui exige mudar lá. Mantido sem dependência de
 * React/DOM justamente para o mirror ser trivial.
 */

const LOOP_TYPES: ReadonlySet<string> = new Set([
  'repeat',
  'while',
  'doWhile',
  'forOf',
  'forRange',
  'forEach',
])

const CALL_TYPES: ReadonlySet<string> = new Set(['callFunction', 'call'])

// Trava de profundidade (espelha o espírito do MAX_GENERATOR_DEPTH): IR
// patológica nunca estoura a pilha — a walk é iterativa com pilha explícita.
const MAX_WALK_NODES = 200_000

/** Visita TODO objeto-nó (statement/expression) da árvore de IR `js`. */
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

/** Coleta os `type` de blocos na serialização do Blockly (blocksState). */
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

/** Avalia UMA regra de estrutura contra o IR/blocksState. */
export function evaluateStructureRule(
  rule: StructureRule,
  ir: SZIR | null,
  blocksState: unknown,
): boolean {
  const js = ir?.js ?? []
  switch (rule.type) {
    case 'usesLoop':
      return someJsNode(js, (n) => LOOP_TYPES.has(n.type as string))
    case 'declaresVariable':
      // SÓ conta como DECLARAÇÃO, não uma referência. No IR há dois nós `type:'var'`:
      // o STATEMENT de declaração (tem `value`) e a EXPRESSÃO de referência (sem
      // `value`). `declareVar` é a declaração sem valor. Sem o `'value' in n`, um
      // aluno que apenas USA a variável passava no check (anti-cola recalculado no
      // servidor — members espelha este predicado).
      return someJsNode(
        js,
        (n) =>
          (n.type === 'declareVar' || (n.type === 'var' && 'value' in n)) && n.name === rule.name,
      )
    case 'definesFunction':
      return someJsNode(js, (n) => n.type === 'funcDecl' && n.name === rule.name)
    case 'callsFunction':
      return someJsNode(js, (n) => CALL_TYPES.has(n.type as string) && n.name === rule.name)
    case 'usesBlock':
      return someBlockType(blocksState, rule.blockType)
  }
}

/**
 * Avalia as checagens de estrutura no CLIENTE (preview do botão "Verificar") →
 * resultados `verifiedBy:'client'`. NÃO é a fonte da verdade: o servidor (members)
 * RECALCULA `structure` sobre o IR submetido e sobrescreve com `verifiedBy:'server'`
 * — é esse recálculo que vale para o gate (anti-fraude), com as MESMAS regras
 * (`evaluateStructureRule`). Aqui o label é 'client' de propósito (é computado no
 * cliente); a autoridade é o espelho server-side.
 */
export function evaluateStructureChecks(
  ir: SZIR | null,
  blocksState: unknown,
  checks: readonly StructureCheck[],
): CheckResult[] {
  return checks.map((check) => ({
    checkId: check.id,
    kind: 'structure' as const,
    passed: evaluateStructureRule(check.rule, ir, blocksState),
    verifiedBy: 'client' as const,
  }))
}
