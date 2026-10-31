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
import { SZIRV2Schema } from '../../../packages/studio/src/ir/schema'
import { criarManifesto } from './gerar-manifesto'
import { montarProjeto } from './projetos'

test('JSON corresponde à fonte, IR é válido e objetivos cabem no executor', async () => {
  const teto = creatorJourneyLevel('elite').reward.blockLevel
  expect(teto).toBe('intermediario-2d')
  const manifesto = criarManifesto()
  expect(await Bun.file(new URL('./pico.manifesto.json', import.meta.url)).text()).toBe(
    `${JSON.stringify(manifesto, null, 2)}\n`,
  )
  expect(await Bun.file(new URL('./pico-adulto.manifesto.json', import.meta.url)).text()).toBe(
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

test('cada variação mantém o cenário e altera só um evento principal, além do extra', () => {
  const semantic = (value: unknown) =>
    JSON.stringify(value, (key, item) => (key === 'id' ? undefined : item))
  for (const variacao of ['pulo-alto', 'floco', 'quedas'] as const) {
    const inicial = montarProjeto(variacao, false)
    const gabarito = montarProjeto(variacao, true)
    const a = SZIRV2Schema.parse(inicial.ir).behavior
    const b = SZIRV2Schema.parse(gabarito.ir).behavior
    expect(inicial.assets).toEqual(gabarito.assets)
    expect(semantic(a.start)).toBe(semantic(b.start))
    expect(semantic(a.loops)).toBe(semantic(b.loops))
    // O extra é a seta para cima; Espaço (pular) é evento principal desde C01b.
    const extra = (s: (typeof a.events)[number]) => s.type === 'g2d:onKey' && s.key === 'ArrowUp'
    const principais = a.events.filter((s) => !extra(s))
    const completos = b.events.filter((s) => !extra(s))
    expect(principais.length).toBe(completos.length)
    const alterados = principais.filter((s, i) => semantic(s) !== semantic(completos[i]))
    expect(alterados).toHaveLength(1)
    expect(alterados[0]?.type).toBe(variacao === 'pulo-alto' ? 'g2d:onKey' : 'g2d:onOverlap')
  }
})

test('o principal deixa incompleto só o movimento, o pulo, a água e a bandeira', () => {
  const inicial = SZIRV2Schema.parse(montarProjeto('plataforma', false).ir).behavior
  const gabarito = SZIRV2Schema.parse(montarProjeto('plataforma', true).ir).behavior
  const semantic = (value: unknown) =>
    JSON.stringify(value, (key, item) => (key === 'id' ? undefined : item))
  expect(semantic(inicial.start)).toBe(semantic(gabarito.start))
  const recomecar = (events: typeof inicial.events) =>
    events.find((s) => s.type === 'g2d:onKey' && s.key === 'Enter')
  expect(semantic(recomecar(inicial.events))).toBe(semantic(recomecar(gabarito.events)))
  for (const s of inicial.events)
    if (s.type !== 'g2d:onKey' || s.key !== 'Enter')
      expect('body' in s && s.body, s.type).toEqual([])
})
