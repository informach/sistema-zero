import { describe, expect, test } from 'bun:test'
import {
  CAMINHOS_LIVRES_NAVE_INIMIGO,
  meioSegundo,
  nave,
  origem,
  proximoTiro,
  recomecar,
} from '../../../tests/fixtures/caminhos-livres/nave-inimigo'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { ENEMY_FIRE, isSceneAction, type SceneAction } from './actions'
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
import { enemyFireX, isSceneState, type SceneState } from './state'
import { falasDaCena, VOZ_LIMITS } from './voz'

/**
 * O inimigo que atira (`enemy-fire`, Poder "Inimigo que atira" do Construtor, Nave contra
 * Asteroides, 28/11/2026): a inimiga com tiros próprios. Só a ideia, em exploração livre com o Zappy.
 */
export const BLOCO_DO_INIMIGO: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'enemy-fire',
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['fixed-origin', 'enemy-origin', 'shot-hurts', 'restart-clears'],
  },
}
const start = sceneStart(BLOCO_DO_INIMIGO)
const jogar = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DO_INIMIGO, jogar(actions)).id
const metas = (s: SceneState) => s.evidence.discoveries
const vezes = (n: number, a: SceneAction) => Array.from({ length: n }, () => a)
const DOIS_DO_MEIO = [proximoTiro, proximoTiro]
const DOIS_DA_INIMIGA = [origem('enemy'), proximoTiro, proximoTiro]

const falas = new Map(discoverySpeechSteps('enemy-fire').map(({ id, text }) => [id, text] as const))

describe('o inimigo que atira: o motor', () => {
  test('abre no tique 0, com a origem e a nave no meio, três vidas e nenhum tiro', () => {
    expect(openScene(start).enemyFire).toEqual({
      tick: 0,
      origin: 'middle',
      shipX: 400,
      lives: 3,
      shots: [],
      middleFrom: [],
      enemyFrom: [],
      last: null,
    })
  })

  test('a inimiga anda um passo por tique, e dois tiros seguidos nunca saem do mesmo lugar', () => {
    const lugares = Array.from({ length: 24 }, (_, i) => enemyFireX(i + 1))
    for (let i = 1; i < lugares.length; i++) expect(lugares[i]).not.toBe(lugares[i - 1])
    const nosTiros = [3, 6, 9, 12, 15, 18, 21, 24].map(enemyFireX)
    expect(nosTiros).toEqual([600, 300, 400, 500, 200, 500, 400, 300])
    for (let i = 1; i < nosTiros.length; i++) expect(nosTiros[i]).not.toBe(nosTiros[i - 1])
  })

  test('a cada três tiques a inimiga atira; o tiro desce e chega à nave em quatro tiques', () => {
    const dois = jogar(vezes(2, meioSegundo)).enemyFire
    expect(dois.shots).toEqual([])
    const tres = jogar(vezes(3, meioSegundo)).enemyFire
    expect(tres.shots).toEqual([{ x: 400, y: 60, origin: 'middle', from: 600 }])
    // Com a nave à direita, o tiro do meio chega à fileira dela e passa reto.
    const passa = jogar([nave(600), ...vezes(7, meioSegundo)]).enemyFire
    expect(passa.shots.find((shot) => shot.from === 600)?.y).toBe(ENEMY_FIRE.shipY)
    expect(passa.lives).toBe(3)
    const saiu = jogar([nave(600), ...vezes(8, meioSegundo)]).enemyFire
    expect(saiu.shots.some((shot) => shot.from === 600)).toBe(false)
    expect(saiu.lives).toBe(3)
  })

  test('com a origem na inimiga, o tiro nasce embaixo da inimiga', () => {
    const s = jogar([origem('enemy'), proximoTiro]).enemyFire
    expect(s.shots).toEqual([{ x: 600, y: 60, origin: 'enemy', from: 600 }])
  })

  test('o tiro que encosta na nave sai e tira uma vida; sem vidas, a partida acaba', () => {
    const s = jogar(vezes(7, meioSegundo))
    expect(s.enemyFire.lives).toBe(2)
    expect(s.enemyFire.shots.map((shot) => shot.from)).toEqual([300])
    expect(s.caption).toContain('Um tiro encostou na nave e saiu.')
    // Levar a nave para baixo de um tiro que já está na fileira dela também encosta.
    const naFileira = jogar([nave(600), ...vezes(7, meioSegundo)])
    const embaixo = stepScene(start, naFileira, nave(400))
    expect(embaixo.enemyFire.lives).toBe(2)
    expect(metas(embaixo)).toContain('shot-hurts')
    const fim = jogar(vezes(13, meioSegundo))
    expect(fim.enemyFire.lives).toBe(0)
    expect(stepScene(start, fim, meioSegundo)).toBe(fim)
    expect(stepScene(start, fim, proximoTiro)).toBe(fim)
  })

  test('⚠️ a meta só cai quando a criança VIU', () => {
    expect(metas(openScene(start))).toEqual([])
    // Um tiro só, de cada origem, não compara nada.
    expect(metas(jogar([proximoTiro]))).toEqual([])
    expect(metas(jogar([origem('enemy'), proximoTiro]))).toEqual([])
    // Um tiro do meio e um da inimiga também não.
    expect(metas(jogar([proximoTiro, origem('enemy'), proximoTiro]))).toEqual([])
    expect(metas(jogar(DOIS_DO_MEIO))).toEqual(['fixed-origin'])
    expect(metas(jogar(DOIS_DA_INIMIGA))).toEqual(['enemy-origin'])
    // Trocar a origem e a nave não fecha nada; recomeçar no tique 0 não faz nada.
    expect(metas(jogar([origem('enemy'), nave(200), origem('middle')]))).toEqual([])
    const aberta = openScene(start)
    expect(stepScene(start, aberta, recomecar)).toBe(aberta)
    // Recomeçar sem tiro no ar nem vida perdida não mostra a limpeza.
    expect(metas(jogar([meioSegundo, recomecar]))).toEqual([])
    expect(metas(jogar([proximoTiro, recomecar]))).toEqual(['restart-clears'])
  })

  test('"Recomeçar a partida" limpa os tiros e as vidas, guarda as escolhas e as descobertas', () => {
    const antes = jogar([...DOIS_DO_MEIO, nave(200), meioSegundo])
    expect(antes.enemyFire.shots.length).toBeGreaterThan(0)
    const s = stepScene(start, antes, recomecar)
    expect(s.enemyFire).toEqual({
      ...openScene(start).enemyFire,
      shipX: 200,
      last: 'restart',
    })
    expect(metas(s)).toEqual(['fixed-origin', 'restart-clears'])
    // Vale também fora da exploração livre: é um botão da cena.
    const guiada = { scene: 'enemy-fire' as const }
    const g = [proximoTiro, recomecar].reduce((e, a) => stepScene(guiada, e, a), openScene(guiada))
    expect(g.enemyFire.shots).toEqual([])
  })

  test('as ações valem só nesta cena, e o caso não aceita nenhuma', () => {
    for (const a of [origem('enemy'), nave(200), meioSegundo, proximoTiro, recomecar]) {
      expect(isSceneAction(a, 'enemy-fire')).toBe(true)
      expect(isSceneAction(a, 'spread-shot')).toBe(false)
      expect(isSceneSetup({ ...BLOCO_DO_INIMIGO.setup, actions: [a] }, 'enemy-fire')).toBe(false)
    }
    expect(isSceneAction({ type: 'enemy-ship', x: 300 }, 'enemy-fire')).toBe(false)
    expect(isSceneAction({ type: 'enemy-origin', origin: 'ship' }, 'enemy-fire')).toBe(false)
    expect(isSceneSetup(BLOCO_DO_INIMIGO.setup, 'enemy-fire')).toBe(true)
  })

  test('o retrato guardado volta igual, e o incoerente é recusado', () => {
    let sessao = initialExperiment(start)
    for (const a of [...DOIS_DO_MEIO, ...DOIS_DA_INIMIGA, meioSegundo])
      sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('enemy-fire', packExperiment('enemy-fire', sessao))
    expect(lido?.state.enemyFire).toEqual(sessao.state.enemyFire)
    const s = sessao.state
    expect(isSceneState(JSON.parse(JSON.stringify(s)))).toBe(true)
    const com = (e: SceneState, f: Partial<SceneState['enemyFire']>) =>
      isSceneState({ ...e, enemyFire: { ...e.enemyFire, ...f } })
    expect(com(s, { lives: 4 })).toBe(false)
    expect(com(s, { shipX: 300 as 200 })).toBe(false)
    expect(com(s, { middleFrom: [600, 600] })).toBe(false)
    expect(com(s, { shots: [{ x: 500, y: 60, origin: 'middle', from: 500 }] })).toBe(false)
    expect(com(s, { shots: [{ x: 400, y: 100, origin: 'middle', from: 500 }] })).toBe(false)
    expect(com(openScene(start), { shots: [{ x: 400, y: 60, origin: 'middle', from: 600 }] })).toBe(
      false,
    )
  })

  test('a faixa e a frase dizem os números, nunca a regra', () => {
    const s = jogar([origem('enemy'), proximoTiro])
    expect(sceneReadout('enemy-fire', s).map((r) => `${r.label} ${r.value}`)).toEqual([
      'tiros no ar 1',
      'vidas 3',
      'origem na inimiga',
    ])
    expect(sceneSituation('enemy-fire', openScene(start))).toBe(
      'A inimiga está à esquerda, e a nave está no meio. A origem do tiro está no meio. Nenhum tiro está no ar, e a nave tem 3 vidas.',
    )
    expect(sceneSituation('enemy-fire', { ...s, caption: '' })).toBe(
      'A inimiga está na ponta direita, e a nave está no meio. A origem do tiro está na inimiga. 1 tiro está no ar, e a nave tem 3 vidas.',
    )
  })
})

describe('o inimigo que atira: o Zappy fala só da ideia', () => {
  test('as falas têm o prefixo da cena e cabem na voz do bloco', () => {
    for (const id of falas.keys()) expect(id.startsWith('enemy-fire-')).toBe(true)
    const slots = falasDaCena({ instructions: 'Teste a inimiga.', activity: BLOCO_DO_INIMIGO })
    expect(slots.length).toBeLessThanOrEqual(VOZ_LIMITS.entradas)
    expect(falas.size).toBe(22)
    expect([...falas.keys()].filter((id) => id.endsWith('-complete'))).toEqual([
      'enemy-fire-complete',
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
      'No meio',
      'Na inimiga',
      'Nave à esquerda',
      'Nave no meio',
      'Nave à direita',
      'Avançar meio segundo',
      'Avançar até o próximo tiro',
      'Recomeçar a partida',
    ]
    let citados = 0
    for (const [id, texto] of falas)
      for (const citado of texto.matchAll(
        /(?:clique em|depois em|escolha) ([^.?,:]+?)(?: e |[.?,:]| de novo| para | duas vezes| ou )/gi,
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
    ['enemy-fire-start', /mesmo lugar|lugar fixo|nasceram|embaixo da inimiga|acompanha/i],
    ['enemy-fire-ask-fixed', /mesmo lugar|lugar fixo|nasceram|não muda/i],
    ['enemy-fire-ask-enemy', /embaixo da inimiga|acompanha|onde a inimiga estava/i],
    ['enemy-fire-ask-hurts', /sumiu|perdeu|tira uma vida|sai\b/i],
    ['enemy-fire-ask-restart', /limpa|tirou|voltaram|saíram/i],
    ['enemy-fire-over', /limpa|tirou|voltaram|saíram/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
  test('a fala de depois explica o teste visto e só convida ao próximo', () => {
    expect(falas.get('enemy-fire-fixed-then-enemy')).toMatch(/^Com a origem No meio/)
    expect(falas.get('enemy-fire-fixed-then-enemy')).not.toMatch(/embaixo da inimiga|acompanha/)
    expect(falas.get('enemy-fire-enemy-then-hurts')).not.toMatch(/perdeu|sumiu/)
    expect(falas.get('enemy-fire-hurts-then-restart')).not.toMatch(/limpa|voltaram/)
    expect(falas.has('enemy-fire-restart-then-over')).toBe(false)
  })
})

describe('o inimigo que atira: a fala acompanha a ordem escolhida', () => {
  test('na ordem da aula', () => {
    expect(fala([])).toBe('enemy-fire-start')
    expect(fala([proximoTiro])).toBe('enemy-fire-start')
    expect(fala(DOIS_DO_MEIO)).toBe('enemy-fire-fixed-then-enemy')
    expect(fala([...DOIS_DO_MEIO, origem('enemy')])).toBe('enemy-fire-ask-enemy')
    // A nave do meio: os tiros do meio encostam enquanto a inimiga atira na origem nova.
    const dois = [...DOIS_DO_MEIO, ...DOIS_DA_INIMIGA]
    expect(metas(jogar(dois))).toEqual(['fixed-origin', 'shot-hurts', 'enemy-origin'])
    expect(fala(dois)).toBe('enemy-fire-enemy-then-restart')
    expect(fala([...dois, recomecar])).toBe('enemy-fire-complete')
  })
  test('a nave fora do caminho dos tiros: o encosto vem depois', () => {
    const fora = [nave(200), ...DOIS_DO_MEIO, ...DOIS_DA_INIMIGA]
    expect(metas(jogar(fora))).toEqual(['fixed-origin', 'enemy-origin'])
    expect(fala(fora)).toBe('enemy-fire-enemy-then-hurts')
    expect(fala([...fora, nave(400)])).toBe('enemy-fire-ask-hurts')
  })
  test('a partida que acabou pede para recomeçar', () => {
    const fim = [...DOIS_DO_MEIO, ...vezes(7, meioSegundo)]
    const s = jogar(fim)
    expect(s.enemyFire.lives).toBe(0)
    // O último tiro encostou: a fala explica o encosto e manda recomeçar a partida.
    expect(fala(fim)).toBe('enemy-fire-hurts-then-over')
    expect(fala([...fim, origem('enemy')])).toBe('enemy-fire-over')
    expect(fala([...fim, recomecar])).toBe('enemy-fire-restart-then-enemy')
  })
  test('começando por Recomeçar a partida: a fala volta à origem no meio', () => {
    expect(fala([proximoTiro, recomecar])).toBe('enemy-fire-restart-then-fixed')
  })
})

describe('o inimigo que atira: o caminho livre', () => {
  test.each([
    ['o caminho de fábrica', scenePaths['enemy-fire']],
    ['o caminho livre', CAMINHOS_LIVRES_NAVE_INIMIGO['enemy-fire'] ?? []],
  ])('%s completa as quatro metas e fecha com enemy-fire-complete', (_nome, caminho) => {
    let sessao = initialExperiment(start)
    for (const a of caminho) sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DO_INIMIGO))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DO_INIMIGO, sessao.state).id).toBe('enemy-fire-complete')
  })
})
