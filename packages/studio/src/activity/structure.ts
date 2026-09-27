import type { SZIRInput } from '#ir'
import type { CheckResult, StructureCheck, StructureRule } from '../studio/activity'

/**
 * Avaliação PURA das checagens de ESTRUTURA — anda o IR do projeto SEM rodar nada.
 *
 * ⚠️ Este é o ÚNICO tipo de checagem recalculado no servidor (members). O
 * `evaluateStructureChecks` do members PRECISA espelhar este algoritmo (mesmas
 * fixtures) — qualquer mudança aqui exige mudar lá. Mantido sem dependência de
 * React/DOM justamente para o mirror ser trivial.
 */

import { evaluateStudioProjectStructure } from '../blockly/projectCheckAuthoring'

export function evaluateStructureRule(
  rule: StructureRule,
  ir: SZIRInput | null,
  blocksState: unknown,
): boolean {
  return evaluateStudioProjectStructure(rule, { ir, blocksState })
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
  ir: SZIRInput | null,
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
