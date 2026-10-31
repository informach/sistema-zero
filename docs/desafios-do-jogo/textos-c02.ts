import { expect } from 'bun:test'
import type { DesafioDoManifesto } from '../../packages/arquipelago-contracts/src/desafios'
import {
  EXECUTION_LIMITS,
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionProjectCheck,
} from '../../packages/core/src/learning/section-progression'

/**
 * As réguas comuns dos pacotes C02 (30/10/2026): textos da criança sem travessão, sem
 * exclamação e sem abrir com pergunta; objetivos válidos para o core, todos rodando o projeto, e
 * dentro do orçamento do executor. Desde §6.28 A2, cada um é o sexto quadro da ilha: pinta e pede
 * publicação, menos o do Vale (abre só com o curso-base do posto, A3).
 */
export function conferirDesafioC02(d: DesafioDoManifesto) {
  expect(d.tipo).toBe('quadro-das-cores')
  expect(d.quadro).toBe(6)
  // O Vale em texto espera os cursos do Arquiteto (a Ponte não tem fonte ainda; A1).
  expect(d.publicar).toBe(d.ilha !== 'vale-dos-dinos')
  expect(d.conteudo.recompensa.cor).toBe(true)
  expect(d.conteudo.blocosManuais).toEqual({ acrescentar: [], retirar: [] })
  const textos = [
    d.conteudo.titulo,
    d.conteudo.enunciado,
    ...d.conteudo.dicas,
    d.conteudo.desafioExtra?.titulo,
    d.conteudo.desafioExtra?.texto,
    ...d.conteudo.objetivos.flatMap((o) => [o.label, o.hint]),
  ].filter((t): t is string => typeof t === 'string')
  for (const texto of textos) {
    expect(texto, d.slug).not.toMatch(/[!—]/)
    expect(texto.split(/[.\n]/)[0], d.slug).not.toContain('?')
  }
  const checks = d.conteudo.objetivos as unknown as SectionProjectCheck[]
  expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }), d.slug).toBe(
    true,
  )
  expect(checks.some((c) => !c.optional)).toBe(true)
  expect(checks.some((c) => c.optional)).toBe(true)
  let espera = 0
  for (const check of checks) {
    expect(isSectionExecutionRule(check.rule as { type: string }), check.id).toBe(true)
    const rule = check.rule as Parameters<typeof executionRuleBudgetMs>[0]
    espera +=
      executionRuleBudgetMs(rule) +
      (check.programmingLanguage === 'python' ? (check.stdin?.length ?? 0) * 1000 : 0)
  }
  expect(espera, d.slug).toBeLessThanOrEqual(EXECUTION_LIMITS.maxSectionWaitMs)
  expect(checks.length).toBeLessThanOrEqual(EXECUTION_LIMITS.maxObjectives)
}
