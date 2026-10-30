import { expect, test } from 'bun:test'
import { creatorJourneyLevel } from '../../../packages/core/src/journey/catalog'
import {
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'
import { montarProjeto } from './projetos'

test('JSON corresponde à fonte, IR é válido e objetivos cabem no executor', async () => {
  expect(creatorJourneyLevel('explorer').reward.blockLevel).toBe('iniciante-3d')
  const manifesto = criarManifesto()
  expect(await Bun.file(new URL('./recife.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(manifesto, null, 2)}\n`,
  )
  expect(await Bun.file(new URL('./recife-adulto.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(criarManifesto('adulto'), null, 2)}\n`,
  )
  for (const d of manifesto.desafios) {
    for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const p = raw as { ir: unknown; blocksState: unknown }
      expect(SZIRV2Schema.safeParse(p.ir).success, d.slug).toBe(true)
      const tipos = JSON.stringify(p.blocksState).match(/"type":"(sz_[^"]+)"/g) ?? []
      // O principal conserva o repertório original. Os cinco complementos são
      // conferidos contra as listas reais até Inventor em quadros-iniciais.test.ts.
      if (d.quadro === 6 || d.tipo === 'desafio-do-dia')
        for (const tipo of tipos)
          expect(resolveBlockLevel(JSON.parse(`{${tipo}}`).type), tipo).toBe('iniciante-2d')
    }
    const checks = d.conteudo.objetivos as SectionJavaScriptProjectCheck[]
    for (const check of checks) expect(isSectionExecutionRule(check.rule), check.id).toBe(true)
    expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }), d.slug).toBe(
      true,
    )
    expect(
      checks.reduce(
        (s, c) => s + (isSectionExecutionRule(c.rule) ? executionRuleBudgetMs(c.rule) : 0),
        0,
      ),
      d.slug,
    ).toBeLessThanOrEqual(40000)
  }
})

test('cada variação mantém o cenário e altera só um evento principal, além do extra', () => {
  const semantic = (value: unknown) =>
    JSON.stringify(value, (key, item) => (key === 'id' ? undefined : item))
  for (const variacao of ['rapida', 'pontos', 'alvo-novo'] as const) {
    const inicial = montarProjeto(variacao, false)
    const gabarito = montarProjeto(variacao, true)
    const a = SZIRV2Schema.parse(inicial.ir).behavior
    const b = SZIRV2Schema.parse(gabarito.ir).behavior
    expect(inicial.assets).toEqual(gabarito.assets)
    expect(semantic(a.start)).toBe(semantic(b.start))
    expect(semantic(a.loops)).toBe(semantic(b.loops))
    const principais = a.events.filter((s) => s.type !== 'g2d:onKey')
    const completos = b.events.filter((s) => s.type !== 'g2d:onKey')
    expect(principais.length).toBe(completos.length)
    const alterados = principais.filter((s, i) => semantic(s) !== semantic(completos[i]))
    expect(alterados).toHaveLength(1)
    expect(alterados[0]?.type).toBe(variacao === 'rapida' ? 'g2d:onGroupClick' : 'g2d:onOverlap')
  }
})
