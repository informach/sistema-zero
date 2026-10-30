import { expect, test } from 'bun:test'
import {
  creatorJourneyLevel,
  JOURNEY_COURSE_TIERS,
} from '../../../packages/core/src/journey/catalog'
import {
  executionRuleBudgetMs,
  isSectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import {
  isSectionCompletion,
  type SectionJavaScriptProjectCheck,
} from '../../../packages/core/src/learning/section-progression'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import { type JSStatement, SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'
import { montarProjeto } from './projetos'

const semantic = (value: unknown) =>
  JSON.stringify(value, (key, item) => (key === 'id' ? undefined : item))

test('JSON corresponde à fonte, IR é válido e objetivos cabem no executor', async () => {
  const teto = creatorJourneyLevel('champion').reward.blockLevel
  expect(teto).toBe('avancado-2d')
  const manifesto = criarManifesto()
  expect(await Bun.file(new URL('./nuvens.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(manifesto, null, 2)}\n`,
  )
  expect(await Bun.file(new URL('./nuvens-adulto.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(criarManifesto('adulto'), null, 2)}\n`,
  )
  for (const d of manifesto.desafios) {
    for (const raw of [d.conteudo.projetoInicial, d.conteudo.gabarito]) {
      const p = raw as { ir: unknown; blocksState: unknown }
      expect(SZIRV2Schema.safeParse(p.ir).success, d.slug).toBe(true)
      const tipos = JSON.stringify(p.blocksState).match(/"type":"(sz_[^"]+)"/g) ?? []
      for (const tipo of tipos) {
        const nivel = resolveBlockLevel(JSON.parse(`{${tipo}}`).type)
        expect(
          JOURNEY_COURSE_TIERS.indexOf(nivel),
          `${tipo} é ${nivel}, acima de ${teto}`,
        ).toBeLessThanOrEqual(JOURNEY_COURSE_TIERS.indexOf(teto))
      }
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

/** A simulação "a cada 1 segundo" (um bloco raiz, ao lado do laço de cada quadro). */
function simulacao(loops: JSStatement[]): JSStatement | undefined {
  return loops.find((s) => s.type === 'g2d:everySeconds')
}
/** O resto dos blocos raiz (o laço que desenha): igual no inicial e no gabarito. */
const semSimulacao = (loops: JSStatement[]) =>
  semantic(loops.filter((s) => s.type !== 'g2d:everySeconds'))

test('cada variação mantém o cenário e muda uma regra só, além do extra', () => {
  const mudou = { 'rega-forte': 'regar', 'sol-forte': 'simulacao', chuva: 'simulacao' } as const
  for (const variacao of ['rega-forte', 'sol-forte', 'chuva'] as const) {
    const inicial = montarProjeto(variacao, false)
    const gabarito = montarProjeto(variacao, true)
    const a = SZIRV2Schema.parse(inicial.ir).behavior
    const b = SZIRV2Schema.parse(gabarito.ir).behavior
    expect(inicial.assets).toEqual(gabarito.assets)
    expect(semantic(a.start)).toBe(semantic(b.start))
    // O extra é o Enter; Espaço (regar) e a seta para cima (sol) são principais desde C01b.
    const extra = (s: (typeof a.events)[number]) => s.type === 'g2d:onKey' && s.key === 'Enter'
    const principais = a.events.filter((s) => !extra(s))
    const completos = b.events.filter((s) => !extra(s))
    const eventosMudados = principais.filter((s, i) => semantic(s) !== semantic(completos[i]))
    // O laço só pode mudar na simulação; fora dela, é o mesmo desenho.
    expect(semSimulacao(a.loops)).toBe(semSimulacao(b.loops))
    const simulacaoMudou = semantic(simulacao(a.loops)) !== semantic(simulacao(b.loops))
    const regraMudada = simulacaoMudou ? 'simulacao' : eventosMudados.length ? 'regar' : 'nada'
    expect(eventosMudados.length + Number(simulacaoMudou), variacao).toBe(1)
    expect(regraMudada, variacao).toBe(mudou[variacao])
  }
})

test('o principal deixa incompletas só as teclas e a simulação; a flor já troca de desenho', () => {
  const inicial = SZIRV2Schema.parse(montarProjeto('jardim', false).ir).behavior
  const gabarito = SZIRV2Schema.parse(montarProjeto('jardim', true).ir).behavior
  expect(semantic(inicial.start)).toBe(semantic(gabarito.start))
  for (const s of inicial.events) expect('body' in s && s.body, s.type).toEqual([])
  expect(simulacao(inicial.loops)).toMatchObject({ type: 'g2d:everySeconds', body: [] })
  expect(semSimulacao(inicial.loops)).toBe(semSimulacao(gabarito.loops))
})
