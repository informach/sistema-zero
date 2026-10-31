import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
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
import { criarManifesto, criarManifestoDaIlha } from './gerar-manifesto'
import { PEDIDOS_DAS_ILHAS } from './pedidos-das-ilhas'

const manifesto = criarManifesto()
const raiz = new URL('../../aulas-interativas/', import.meta.url)
/** Só a trilha do Faísca: o pedido do Nico é da sua ilha, aberta no primeiro posto. */
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

test('o pedido do Nico: arquivos iguais à fonte, só blocos do Faísca, curto e sem cor (A23)', async () => {
  expect(
    await Bun.file(new URL('./sua-ilha-moradores.manifesto.json', import.meta.url)).json(),
  ).toEqual(manifesto)
  expect(
    await Bun.file(new URL('./sua-ilha-moradores-adulto.manifesto.json', import.meta.url)).json(),
  ).toEqual(criarManifesto('adulto'))
  for (const m of [manifesto, criarManifesto('adulto')])
    for (const d of m.desafios) {
      expect(d.tipo).toBe('pedido-de-morador')
      expect(d.ilha).toBe('sua-ilha')
      expect(d.quadro).toBeNull()
      expect(d.publicar).toBe(true)
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
      expect(JSON.stringify(d.conteudo.projetoInicial)).not.toBe(
        JSON.stringify(d.conteudo.gabarito),
      )
      const checks = d.conteudo.objetivos as SectionJavaScriptProjectCheck[]
      expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks })).toBe(true)
      expect(checks.every((c) => isSectionExecutionRule(c.rule))).toBe(true)
      // Um pedido curto: bem abaixo do orçamento de um quadro.
      expect(
        checks.reduce((soma, c) => soma + executionRuleBudgetMs(c.rule as never), 0),
      ).toBeLessThanOrEqual(15000)
    }
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
      expect(/^\s*(Qual|Quem|Como|Onde|Quando|Por que|O que)\b.*\?/.test(t), d.slug).toBe(false)
    }
  }
})

/**
 * Os pedidos das ilhas do anel (lacunas, 01/11/2026): a primeira atividade de uma ilha reaplica o
 * que veio antes (Jornada). O Bosque usa só o Faísca; as outras, o Faísca e o Construtor.
 */
const TRILHA_ATE_O_CONSTRUTOR = [...TRILHA_DO_FAISCA, 'construtor/nave-contra-asteroides']
const blocosAteOConstrutor = new Set(
  TRILHA_ATE_O_CONSTRUTOR.flatMap((curso) => {
    const dados = JSON.parse(readFileSync(new URL(`${curso}/blocos.json`, raiz), 'utf8'))
    return dados.blocks ?? dados['2d']
  }),
)

test('os pedidos das ilhas: um por ilha do anel, arquivos iguais à fonte, só a trilha de antes', async () => {
  expect(PEDIDOS_DAS_ILHAS.map((p) => p.ilha).sort()).toEqual(
    ['bosque', 'nuvens', 'pico', 'recife', 'vale-dos-dinos', 'vila-doce'].sort(),
  )
  for (const p of PEDIDOS_DAS_ILHAS)
    for (const publico of ['kids', 'adulto'] as const) {
      const m = criarManifestoDaIlha(p, publico)
      const arquivo = `./${p.ilha}-moradores${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`
      expect(await Bun.file(new URL(arquivo, import.meta.url)).json()).toEqual(m)
      const trilha = p.ilha === 'bosque' ? blocosDaTrilha : blocosAteOConstrutor
      for (const d of m.desafios) {
        expect(d.tipo).toBe('pedido-de-morador')
        expect(d.ilha).toBe(p.ilha)
        expect(d.conteudo.recompensa.cor).toBe(false)
        expect(d.conteudo.recompensa.moedas).toBe(5)
        for (const projeto of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
          const project = projeto as { ir: unknown; blocksState: unknown }
          expect(SZIRV2Schema.safeParse(project.ir).success, d.slug).toBe(true)
          const usados = [...new Set(tipos(project.blocksState))]
          expect(
            usados.filter((t) => !trilha.has(t)),
            d.slug,
          ).toEqual([])
        }
        const checks = d.conteudo.objetivos as SectionJavaScriptProjectCheck[]
        expect(checks.some((c) => c.optional)).toBe(true)
        expect(checks.every((c) => isSectionExecutionRule(c.rule))).toBe(true)
        expect(
          checks.reduce((soma, c) => soma + executionRuleBudgetMs(c.rule as never), 0),
        ).toBeLessThanOrEqual(15000)
        if (publico === 'kids')
          for (const t of [
            d.conteudo.titulo,
            d.conteudo.enunciado,
            ...d.conteudo.dicas,
            d.conteudo.desafioExtra?.texto ?? '',
            ...checks.map((c) => c.label),
          ]) {
            expect(t, d.slug).not.toMatch(/[—–!]/)
            expect(/^\s*(Qual|Quem|Como|Onde|Quando|Por que|O que)\b.*\?/.test(t), d.slug).toBe(
              false,
            )
          }
      }
    }
})
