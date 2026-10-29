import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
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
import { evaluateStudioProjectStructure } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'

export const manifesto = criarManifesto()
const raiz = new URL('../../aulas-interativas/', import.meta.url)
const cursos = [
  'faisca/cade-todo-mundo',
  'faisca/desafio-primeiro-jogo',
  'faisca/o-jardim-secreto',
  'construtor/nave-contra-asteroides',
  'construtor/o-jogo-do-meu-jeito',
]
export const blocosDoPosto = new Set(
  cursos.flatMap((curso) => {
    const dados = JSON.parse(readFileSync(new URL(`${curso}/blocos.json`, raiz), 'utf8'))
    return dados.blocks ?? dados['2d']
  }),
)
export function tipos(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(tipos)
  const o = value as Record<string, unknown>
  return [
    ...(typeof o.type === 'string' && o.type.startsWith('sz_') ? [o.type] : []),
    ...Object.values(o).flatMap(tipos),
  ]
}

test('o arquivo importável corresponde à fonte e só usa blocos dos cursos até Construtor', async () => {
  expect(creatorJourneyLevel('coder').reward.blockLevel).toBe('iniciante-2d')
  const arquivo = await Bun.file(new URL('./bosque.manifesto.json', import.meta.url)).json()
  expect(arquivo).toEqual(manifesto)
  for (const d of manifesto.desafios) {
    for (const p of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const project = p as { ir: unknown; blocksState: unknown }
      expect(SZIRV2Schema.safeParse(project.ir).success, d.slug).toBe(true)
      const usados = [...new Set(tipos(project.blocksState))]
      expect(
        usados.filter((t) => !blocosDoPosto.has(t)),
        d.slug,
      ).toEqual([])
      expect(
        usados.filter((t) => resolveBlockLevel(t) !== 'iniciante-2d'),
        d.slug,
      ).toEqual([])
      expect(usados.filter((t) => /sz_(?:html|css|canvas|adv_raw|js_object)/.test(t))).toEqual([])
    }
    const checks = d.conteudo.objetivos as SectionJavaScriptProjectCheck[]
    expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }), d.slug).toBe(
      true,
    )
    expect(
      checks.reduce(
        (sum, c) => sum + (isSectionExecutionRule(c.rule) ? executionRuleBudgetMs(c.rule) : 0),
        0,
      ),
    ).toBeLessThanOrEqual(40000)
    for (const c of checks) {
      if (isSectionExecutionRule(c.rule)) continue
      expect(evaluateStudioProjectStructure(c.rule, d.conteudo.gabarito), c.id).toBe(true)
      expect(evaluateStudioProjectStructure(c.rule, d.conteudo.projetoInicial), c.id).toBe(false)
    }
  }
})
