import { describe, expect, test } from 'bun:test'
import {
  CAMINHOS_LIVRES_NAVE_TRIPLO,
  chegarem,
  desvio,
  disparar,
  tiroTriplo,
  voltarAoComeco,
} from '../../../tests/fixtures/caminhos-livres/nave-triplo'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { isSceneAction, type SceneAction, SPREAD_SHOT } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  isSceneSetup,
  sceneStart,
  sceneTargets,
} from './index'
import { sceneReadout, sceneSituation } from './readout'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { isSceneState, type SceneState, spreadShotHits } from './state'
import { falasDaCena, VOZ_LIMITS } from './voz'

/**
 * O tiro triplo (`spread-shot`, Poder "Tiro triplo" do Construtor, Nave contra Asteroides,
 * 28/11/2026): um disparo cria três lasers, e a velocidade para o lado de cada laser escolhe o
 * caminho dele. Só a ideia, em exploração livre com o Zappy.
 */
export const BLOCO_DO_TIRO_TRIPLO: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'spread-shot',
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['single-one', 'triple-stacked', 'triple-spread', 'deviation-matters'],
  },
}
const start = sceneStart(BLOCO_DO_TIRO_TRIPLO)
const jogar = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DO_TIRO_TRIPLO, jogar(actions)).id
const metas = (s: SceneState) => s.evidence.discoveries
const rajada = (...antes: SceneAction[]): SceneAction[] => [...antes, disparar, chegarem]
const TRIPLO_0 = rajada(tiroTriplo(true))
const LEQUE = rajada(tiroTriplo(true), desvio(2))

const falas = new Map(
  discoverySpeechSteps('spread-shot').map(({ id, text }) => [id, text] as const),
)

describe('o tiro triplo: o motor', () => {
  test('abre com o tiro simples, desvio 0, as três pedras e nenhum laser', () => {
    expect(openScene(start).spreadShot).toEqual({
      triple: false,
      deviation: 0,
      rocks: [true, true, true],
      lasers: [],
      volley: null,
    })
  })

  test('Disparar cria um laser com o tiro simples e três com o triplo, todos na ponta da nave', () => {
    expect(jogar([disparar]).spreadShot.lasers).toEqual([{ x: 400, y: 440, vx: 0 }])
    expect(jogar([tiroTriplo(true), desvio(2), disparar]).spreadShot.lasers).toEqual([
      { x: 400, y: 440, vx: -2 },
      { x: 400, y: 440, vx: 0 },
      { x: 400, y: 440, vx: 2 },
    ])
  })

  test('a geometria da aula: desvio 2 acerta as três pedras; desvio 1 passa entre as dos lados', () => {
    const leque = jogar(LEQUE).spreadShot
    expect(spreadShotHits(leque).sort()).toEqual([0, 1, 2])
    expect(leque.rocks).toEqual([false, false, false])
    // Os lasers dos lados chegam perto de 297 e de 503, os x das pedras dos lados.
    const [esquerda, , direita] = leque.volley?.ends ?? []
    expect(Math.abs((esquerda?.x ?? 0) - SPREAD_SHOT.rocks[0])).toBeLessThanOrEqual(10)
    expect(Math.abs((direita?.x ?? 0) - SPREAD_SHOT.rocks[2])).toBeLessThanOrEqual(10)
    const um = jogar(rajada(tiroTriplo(true), desvio(1))).spreadShot
    expect(spreadShotHits(um)).toEqual([1])
    expect(um.rocks).toEqual([true, false, true])
    // Os dos lados passam entre as pedras (perto de 349 e de 451 na altura delas) e saem por cima.
    expect(um.volley?.ends.map((end) => end.rock)).toEqual([null, 1, null])
    expect(um.volley?.ends[0]?.y).toBeLessThan(0)
  })

  test('com desvio 0, os três seguem juntos e só a pedra do meio sai', () => {
    const s = jogar(TRIPLO_0).spreadShot
    expect(spreadShotHits(s)).toEqual([1])
    expect(s.rocks).toEqual([true, false, true])
    expect(new Set(s.volley?.ends.map((end) => end.x))).toEqual(new Set([400]))
  })

  test('uma rajada de cada vez; trocar as escolhas no ar vale para o próximo disparo', () => {
    const noAr = jogar([tiroTriplo(true), disparar])
    expect(stepScene(start, noAr, disparar)).toBe(noAr)
    const trocado = stepScene(start, noAr, desvio(2))
    expect(trocado.spreadShot.lasers.map((l) => l.vx)).toEqual([0, 0, 0])
    expect(spreadShotHits(stepScene(start, trocado, chegarem).spreadShot)).toEqual([1])
    // Sem lasers no ar, "Ver os lasers chegarem" não faz nada.
    const aberta = openScene(start)
    expect(stepScene(start, aberta, chegarem)).toBe(aberta)
  })

  test('o próximo Disparar põe as três pedras de volta', () => {
    const s = jogar([...LEQUE, disparar])
    expect(s.spreadShot.rocks).toEqual([true, true, true])
    expect(s.caption).toContain('As três pedras voltaram ao lugar.')
  })

  test('⚠️ a meta só cai quando a criança VIU', () => {
    // Abrir, escolher e disparar sem ver chegar não fecham nada.
    expect(metas(openScene(start))).toEqual([])
    expect(metas(jogar([disparar]))).toEqual([])
    expect(metas(jogar([tiroTriplo(true), desvio(2), disparar]))).toEqual([])
    // Cada rajada fecha a meta dela quando chega.
    expect(metas(jogar(rajada()))).toEqual(['single-one'])
    expect(metas(jogar(TRIPLO_0))).toEqual(['triple-stacked'])
    expect(metas(jogar(LEQUE))).toEqual(['triple-spread'])
    // O desvio 1 é uma comparação: antes de ver o leque do desvio 2, não conta.
    expect(metas(jogar(rajada(tiroTriplo(true), desvio(1))))).toEqual([])
    expect(metas(jogar([...LEQUE, ...rajada(desvio(1))]))).toEqual([
      'triple-spread',
      'deviation-matters',
    ])
    // Com o tiro simples, o desvio não muda nada: é o tiro simples.
    expect(metas(jogar(rajada(desvio(2))))).toEqual(['single-one'])
  })

  test('"Voltar ao começo" devolve as pedras e guarda escolhas e descobertas; fora do modo livre não faz nada', () => {
    const s = jogar([...LEQUE, voltarAoComeco])
    expect(s.spreadShot).toEqual({ ...openScene(start).spreadShot, triple: true, deviation: 2 })
    expect(metas(s)).toEqual(['triple-spread'])
    const guiada = { scene: 'spread-shot' as const }
    const aberta = openScene(guiada)
    expect(stepScene(guiada, aberta, voltarAoComeco)).toBe(aberta)
  })

  test('as ações valem só nesta cena, e o caso não aceita nenhuma', () => {
    for (const a of [tiroTriplo(true), desvio(1), disparar, chegarem]) {
      expect(isSceneAction(a, 'spread-shot')).toBe(true)
      expect(isSceneAction(a, 'timed-shield')).toBe(false)
      expect(isSceneSetup({ ...BLOCO_DO_TIRO_TRIPLO.setup, actions: [a] }, 'spread-shot')).toBe(
        false,
      )
    }
    expect(isSceneAction({ type: 'spread-deviation', deviation: 3 }, 'spread-shot')).toBe(false)
    expect(isSceneAction({ type: 'spread-triple', on: 'sim' }, 'spread-shot')).toBe(false)
    expect(isSceneSetup(BLOCO_DO_TIRO_TRIPLO.setup, 'spread-shot')).toBe(true)
  })

  test('o retrato guardado volta igual, e o incoerente é recusado', () => {
    let sessao = initialExperiment(start)
    for (const a of [...LEQUE, desvio(1), disparar])
      sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('spread-shot', packExperiment('spread-shot', sessao))
    expect(lido?.state.spreadShot).toEqual(sessao.state.spreadShot)
    const noAr = sessao.state
    expect(isSceneState(JSON.parse(JSON.stringify(noAr)))).toBe(true)
    const chegou = jogar(LEQUE)
    expect(isSceneState(JSON.parse(JSON.stringify(chegou)))).toBe(true)
    const com = (s: SceneState, sp: Partial<SceneState['spreadShot']>) =>
      isSceneState({ ...s, spreadShot: { ...s.spreadShot, ...sp } })
    expect(com(noAr, { deviation: 3 as 2 })).toBe(false)
    expect(com(noAr, { rocks: [true, false, true] })).toBe(false)
    expect(com(noAr, { lasers: [{ x: 400, y: 440, vx: 0 }] })).toBe(false)
    expect(com(chegou, { rocks: [true, true, true] })).toBe(false)
    expect(com(openScene(start), { lasers: [{ x: 400, y: 440, vx: 0 }] })).toBe(false)
  })

  test('a faixa e a frase dizem os números, nunca a regra', () => {
    const noAr = jogar([tiroTriplo(true), desvio(2), disparar])
    expect(sceneReadout('spread-shot', noAr).map((r) => `${r.label} ${r.value}`)).toEqual([
      'lasers no ar 3',
      'pedras acertadas 0',
      'desvio 2',
    ])
    expect(sceneSituation('spread-shot', { ...noAr, caption: '' })).toBe(
      'O tiro triplo está ligado, com desvio 2. 3 lasers estão no ar.',
    )
    expect(sceneSituation('spread-shot', openScene(start))).toBe(
      'O tiro triplo está desligado. Três pedras esperam no alto da tela.',
    )
    const um = { ...jogar(rajada(tiroTriplo(true), desvio(1))), caption: '' }
    expect(sceneSituation('spread-shot', um)).toBe(
      'O tiro triplo está ligado, com desvio 1. No último disparo, 1 pedra foi acertada.',
    )
  })
})

describe('o tiro triplo: o Zappy fala só da ideia', () => {
  test('as falas têm o prefixo da cena e cabem na voz do bloco', () => {
    for (const id of falas.keys()) expect(id.startsWith('spread-shot-')).toBe(true)
    const slots = falasDaCena({ instructions: 'Teste o tiro.', activity: BLOCO_DO_TIRO_TRIPLO })
    expect(slots.length).toBeLessThanOrEqual(VOZ_LIMITS.entradas)
    expect(falas.size).toBe(18)
    expect([...falas.keys()].filter((id) => id.endsWith('-complete'))).toEqual([
      'spread-shot-complete',
    ])
  })
  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, Se, então, senão, variável nem código', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bbloco|\bregra|\bentão\b|\bsenão\b|\bSe\b|variável|constante|código|\baperte\b|\bele\b|\bela\b|\beles\b|\bdele\b|\bnele\b/,
    )
  })
  test('os botões citados são os da tela', () => {
    const botoes = [
      'Tiro triplo',
      'Desvio 0',
      'Desvio 1',
      'Desvio 2',
      'Disparar',
      'Ver os lasers chegarem',
      'Voltar ao começo',
    ]
    let citados = 0
    for (const [id, texto] of falas)
      for (const citado of texto.matchAll(
        /(?:clique em|depois em|escolha) ([^.?,:]+?)(?: e |[.?,:]| de novo| para )/gi,
      )) {
        citados++
        expect(
          botoes.some((b) => citado[1]?.startsWith(b)),
          `${id}: "${citado[1]}"`,
        ).toBe(true)
      }
    expect(citados).toBeGreaterThan(30)
  })
  // Antes de um teste, a fala não conta o que ele mostra.
  const ANTES: [string, RegExp][] = [
    ['spread-shot-start', /um laser só|um só|pedra do meio|juntos|leque/i],
    ['spread-shot-ask-single', /um laser só|um só|pedra do meio/i],
    ['spread-shot-ask-stacked', /juntos|mesmo caminho|um só|pedra do meio/i],
    ['spread-shot-ask-spread', /leque|seu caminho|pedras dos lados|acert/i],
    ['spread-shot-ask-matters', /passa|entre as pedras|menos/i],
    ['spread-shot-in-air', /juntos|leque|acert|passa|entre/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
  test('a fala de depois explica o teste visto e só convida ao próximo', () => {
    expect(falas.get('spread-shot-single-then-stacked')).toMatch(/^Com o Tiro triplo desligado/)
    expect(falas.get('spread-shot-single-then-stacked')).not.toMatch(/juntos|mesmo caminho/)
    expect(falas.get('spread-shot-stacked-then-spread')).not.toMatch(/leque|seu caminho/)
    expect(falas.get('spread-shot-spread-then-matters')).not.toMatch(/entre as pedras/)
    expect(falas.has('spread-shot-matters-then-spread')).toBe(false)
  })
})

describe('o tiro triplo: a fala acompanha a ordem escolhida', () => {
  test('na ordem da aula', () => {
    expect(fala([])).toBe('spread-shot-start')
    expect(fala([disparar])).toBe('spread-shot-in-air')
    expect(fala(rajada())).toBe('spread-shot-single-then-stacked')
    expect(fala([...rajada(), tiroTriplo(true)])).toBe('spread-shot-ask-stacked')
    const dois = [...rajada(), ...TRIPLO_0]
    expect(fala(dois)).toBe('spread-shot-stacked-then-spread')
    const tres = [...dois, ...rajada(desvio(2))]
    expect(fala(tres)).toBe('spread-shot-spread-then-matters')
    expect(fala([...tres, desvio(1)])).toBe('spread-shot-ask-matters')
    expect(fala([...tres, ...rajada(desvio(1))])).toBe('spread-shot-complete')
  })
  test('começando pelo tiro triplo: a fala volta ao tiro simples', () => {
    expect(fala([tiroTriplo(true)])).toBe('spread-shot-start')
    expect(fala(TRIPLO_0)).toBe('spread-shot-stacked-then-single')
    expect(fala([...TRIPLO_0, ...rajada(desvio(2))])).toBe('spread-shot-spread-then-single')
    // O desvio 1 antes do leque não é teste nenhum: a fala segue pedindo o que falta.
    expect(fala(rajada(tiroTriplo(true), desvio(1)))).toBe('spread-shot-start')
    expect(fala([...TRIPLO_0, ...rajada(desvio(1))])).toBe('spread-shot-ask-single')
    // Trocar a escolha depois de um teste já é ir para o próximo: a fala pede o que falta.
    expect(fala([...TRIPLO_0, tiroTriplo(false)])).toBe('spread-shot-ask-single')
  })
})

describe('o tiro triplo: o caminho livre', () => {
  test.each([
    ['o caminho de fábrica', scenePaths['spread-shot']],
    ['o caminho livre', CAMINHOS_LIVRES_NAVE_TRIPLO['spread-shot'] ?? []],
  ])('%s completa as quatro metas e fecha com spread-shot-complete', (_nome, caminho) => {
    let sessao = initialExperiment(start)
    for (const a of caminho) sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DO_TIRO_TRIPLO))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DO_TIRO_TRIPLO, sessao.state).id).toBe('spread-shot-complete')
  })
})
