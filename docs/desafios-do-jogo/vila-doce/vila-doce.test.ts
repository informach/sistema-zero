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

test('JSON corresponde à fonte, IR é válido e objetivos cabem no executor', async () => {
  expect(creatorJourneyLevel('hacker').reward.blockLevel).toBe('iniciante-2d')
  const manifesto = criarManifesto()
  expect(await Bun.file(new URL('./vila-doce.manifesto.json', import.meta.url)).json()).toEqual(
    manifesto,
  )
  expect(
    await Bun.file(new URL('./vila-doce-adulto.manifesto.json', import.meta.url)).json(),
  ).toEqual(criarManifesto('adulto'))
  for (const d of manifesto.desafios) {
    for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const p = raw as { ir: unknown; blocksState: unknown }
      expect(SZIRV2Schema.safeParse(p.ir).success, d.slug).toBe(true)
      const tipos = JSON.stringify(p.blocksState).match(/"type":"(sz_[^"]+)"/g) ?? []
      for (const tipo of tipos)
        expect(resolveBlockLevel(JSON.parse(`{${tipo}}`).type), tipo).toBe('iniciante-2d')
    }
    const checks = d.conteudo.objetivos as SectionJavaScriptProjectCheck[]
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
