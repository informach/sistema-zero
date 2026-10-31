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
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'

const manifesto = criarManifesto()
const raiz = new URL('../../aulas-interativas/', import.meta.url)
/** Só a trilha do Faísca: a sua ilha abre no primeiro posto, sem extra nem Poder. */
const TRILHA_DO_FAISCA = ['faisca/desafio-primeiro-jogo', 'faisca/o-jardim-secreto']
const blocosDaTrilha = new Set(
  TRILHA_DO_FAISCA.flatMap((curso) => {
    const dados = JSON.parse(readFileSync(new URL(`${curso}/blocos.json`, raiz), 'utf8'))
    return dados.blocks ?? dados['2d']
  }),
)
function tipos(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(tipos)
  const o = value as Record<string, unknown>
  return [
    ...(typeof o.type === 'string' && o.type.startsWith('sz_') ? [o.type] : []),
    ...Object.values(o).flatMap(tipos),
  ]
}

test('os arquivos importáveis correspondem à fonte e só usam blocos da trilha do Faísca', async () => {
  expect(creatorJourneyLevel('noob').reward.blockLevel).toBe('iniciante-2d')
  expect(await Bun.file(new URL('./sua-ilha.manifesto.json', import.meta.url)).json()).toEqual(
    manifesto,
  )
  expect(
    await Bun.file(new URL('./sua-ilha-adulto.manifesto.json', import.meta.url)).json(),
  ).toEqual(criarManifesto('adulto'))
  expect(manifesto.desafios.map((d) => d.quadro)).toEqual([1, 2, 3, 4, 5, 6])
  for (const d of manifesto.desafios) {
    expect(d.ilha).toBe('sua-ilha')
    expect(d.conteudo.recompensa.cor).toBe(false)
    for (const p of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const project = p as { ir: unknown; blocksState: unknown }
      expect(SZIRV2Schema.safeParse(project.ir).success, d.slug).toBe(true)
      const usados = [...new Set(tipos(project.blocksState))]
      expect(
        usados.filter((t) => !blocosDaTrilha.has(t)),
        d.slug,
      ).toEqual([])
      expect(
        usados.filter((t) => resolveBlockLevel(t) !== 'iniciante-2d'),
        d.slug,
      ).toEqual([])
    }
    expect(JSON.stringify(d.conteudo.projetoInicial)).not.toBe(JSON.stringify(d.conteudo.gabarito))
    const checks = d.conteudo.objetivos as SectionJavaScriptProjectCheck[]
    expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }), d.slug).toBe(
      true,
    )
    expect(
      checks.every((c) => isSectionExecutionRule(c.rule)),
      d.slug,
    ).toBe(true)
    expect(
      checks.reduce((soma, c) => soma + executionRuleBudgetMs(c.rule as never), 0),
    ).toBeLessThanOrEqual(40000)
  }
})

test('o sexto quadro entrega o Pega-conchas ao fliperama', () => {
  expect(manifesto.desafios.find((d) => d.quadro === 6)?.conteudo.recompensa.atracao).toBe(
    'pega-conchas',
  )
})

test('textos da criança sem travessão, sem exclamação e sem começar por pergunta', () => {
  for (const d of manifesto.desafios) {
    const textos = [
      d.conteudo.titulo,
      d.conteudo.enunciado,
      ...d.conteudo.dicas,
      d.conteudo.desafioExtra?.texto ?? '',
      ...d.conteudo.objetivos.map((o) => o.label),
    ]
    for (const t of textos) {
      expect(t, d.slug).not.toMatch(/[—–!]/)
      expect(
        t.trim().startsWith('¿') || /^\s*(Qual|Quem|Como|Onde|Quando|Por que|O que)\b.*\?/.test(t),
        d.slug,
      ).toBe(false)
    }
  }
})
