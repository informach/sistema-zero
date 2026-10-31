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
import { montarProjeto, VARIACOES } from './projetos'

test('JSON corresponde à fonte, IR é válido e objetivos cabem no executor', async () => {
  expect(creatorJourneyLevel('architect').reward.blockLevel).toBe('intermediario-3d')
  const manifesto = criarManifesto()
  expect(await Bun.file(new URL('./vale.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(manifesto, null, 2)}\n`,
  )
  expect(await Bun.file(new URL('./vale-adulto.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(criarManifesto('adulto'), null, 2)}\n`,
  )
  for (const d of manifesto.desafios) {
    for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const p = raw as { ir: unknown; blocksState: unknown }
      expect(SZIRV2Schema.safeParse(p.ir).success, d.slug).toBe(true)
      const tipos = JSON.stringify(p.blocksState).match(/"type":"(sz_[^"]+)"/g) ?? []
      for (const tipo of tipos)
        expect(['iniciante-2d', 'intermediario-2d']).toContain(
          resolveBlockLevel(JSON.parse(`{${tipo}}`).type),
        )
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

test('cada variação do Guardião muda uma regra, além do evento extra (lacunas, 01/11/2026)', () => {
  const semantic = (v: unknown) => JSON.stringify(v, (k, x) => (k === 'id' ? undefined : x))
  for (const variacao of VARIACOES) {
    const a = SZIRV2Schema.parse(montarProjeto(variacao, false).ir).behavior
    const b = SZIRV2Schema.parse(montarProjeto(variacao, true).ir).behavior
    // O começo é o mesmo; muda a regra (num evento ou no laço) e o Enter do extra.
    expect(semantic(a.start)).toBe(semantic(b.start))
    const semEnter = (x: typeof a) =>
      x.events.filter((s) => s.type !== 'g2d:onKey' || s.key !== 'Enter')
    expect(semantic([semEnter(a), a.loops])).not.toBe(semantic([semEnter(b), b.loops]))
  }
})
