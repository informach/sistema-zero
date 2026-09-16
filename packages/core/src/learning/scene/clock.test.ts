import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isSceneAction,
  SCENE_FRAME_RATE,
  SCENE_IDS,
  type SceneAction,
  type SceneId,
  sceneFrameRate,
  sceneLongFrame,
  sceneStepLabel,
  sceneStepSeconds,
} from './actions'
import { SCENE_MODELS } from './catalog'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation, sceneGoals } from './evaluate'
import {
  type DemonstrationActivity,
  isDemonstrationActivity,
  sceneScript,
  sceneStart,
} from './index'
import {
  applyExperimentSegment,
  type ExperimentCommand,
  type ExperimentSession,
  initialDemonstration,
  initialExperiment,
  isExperimentCommand,
  packExperiment,
  readDemonstrationSession,
  readExperimentSession,
  SESSION_LIMITS,
  stepDemonstration,
  stepExperiment,
} from './session'
import { hydrateSceneState, isSceneState, type SceneStart, type SceneState } from './state'

/**
 * ⭐⭐ O relógio de quadro fixo (lote 4 do Raio-X, 16/09/2026).
 *
 * O motor contava UM quadro por chamada de `advance`, qualquer que fosse o tempo, e o player manda
 * três tamanhos: o ▶ em fatias irregulares de ~0,04 s, o passo de um quadro e o roteiro de 1 s. A
 * `contact` perdia ~25 de vida por segundo com o ▶ e 1 no roteiro; a `diagonal` marcava 3,39, 16,97
 * ou 84,85 conforme o botão. Estes testes travam a promessa inteira: o MESMO tempo dá o MESMO mundo
 * em qualquer fatiamento, o passo é exatamente um quadro, o servidor rejoga igual ao navegador, e o
 * que já está gravado continua abrindo.
 */

type CenaComRelogio = keyof typeof SCENE_FRAME_RATE
/** Um gesto da criança, ou um número: tantos segundos de ▶. */
type Plano = (SceneAction | number)[]

const ligar = (port: string, enabled = true) => ({ type: 'connect', port, enabled }) as SceneAction

/**
 * Um roteiro de gestos por cena com relógio, com tempos que NÃO caem em quadro inteiro (1,3 s a 5
 * por segundo, 0,45 s a 10): é a sobra atravessando o gesto seguinte que um fatiamento diferente
 * erraria.
 */
const PLANOS: Record<CenaComRelogio, Plano> = {
  'draw-loop': [1.3, { type: 'loop', on: true }, 2.1, { type: 'erase', on: true }, 1.7],
  frames: [
    { type: 'rate', perSecond: 1 },
    { type: 'play', on: true },
    2.6,
    { type: 'rate', perSecond: 8 },
    1.35,
    { type: 'rate', perSecond: 5 },
    0.7,
  ],
  lives: [ligar('condition'), 2.5, ligar('life'), { type: 'collide' }, 1.6, { type: 'collide' }, 2],
  gravity: [
    { type: 'jump', input: 'tap' },
    1.1,
    ligar('gravity'),
    { type: 'jump', input: 'tap' },
    1.7,
  ],
  impulse: [
    { type: 'jump', input: 'tap' },
    2,
    { type: 'impulse', force: 14 },
    { type: 'jump', input: 'tap' },
    2.3,
  ],
  'jump-sound': [
    { type: 'jump', input: 'key' },
    0.13,
    { type: 'jump', input: 'key' },
    ligar('sound'),
    1.2,
    { type: 'jump', input: 'tap' },
    0.9,
  ],
  spawn: [1.4, ligar('timer'), 2.35, { type: 'interval', seconds: 0.5 }, 1.8],
  cleanup: [6.3, ligar('cleanup'), 2.2],
  'game-state': [1.2, ligar('condition'), 1.1, { type: 'start', input: 'tap' }, 1.9],
  score: [ligar('condition'), 1.3, { type: 'start', input: 'key' }, 3.4, { type: 'collide' }, 1.2],
  // ⚠️ Mudou de propósito (lote 5): `random` e `acceleration` saíram da tabela do relógio (o tempo
  // delas mora no gesto), e a `restart` passou a mover os cactos até a batida, a 20 por segundo.
  restart: [
    { type: 'start', input: 'tap' },
    3.3,
    { type: 'start', input: 'tap' },
    { type: 'start', input: 'tap' },
    0.4,
  ],
  velocity: [
    { type: 'velocity', vx: 5, vy: 0 },
    1.7,
    { type: 'velocity', vx: -3, vy: 2 },
    2.3,
    { type: 'velocity', vx: 0, vy: 0 },
    1.1,
  ],
  'hold-vs-press': [
    { type: 'press' },
    { type: 'press' },
    0.5,
    { type: 'hold', on: true },
    2.3,
    { type: 'hold', on: false },
    0.7,
  ],
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a `group-loop` ganhou relógio, a `enemy-type` move os
  // cactos (e a cópia ao nascer), a `contact` encosta em 0 com as duas pistas e a `diagonal` saiu.
  'group-loop': [{ type: 'look', id: 1 }, 1.3, ligar('loop'), 2.35, ligar('loop', false), 0.7],
  'enemy-type': [
    { type: 'spawnOne' },
    { type: 'spawnOne' },
    1.2,
    { type: 'define', field: 'speed', value: 7 },
    0.55,
    ligar('copy'),
    { type: 'define', field: 'speed', value: 2 },
    { type: 'spawnOne' },
    1.35,
  ],
  contact: [
    { type: 'approach', distance: 0 },
    1.3,
    { type: 'approach', distance: 100 },
    0.6,
    { type: 'approach', distance: 0 },
    0.9,
  ],
  cooldown: [
    { type: 'recharge', seconds: 1 },
    { type: 'shoot' },
    { type: 'shoot' },
    0.7,
    { type: 'shoot' },
    0.45,
    { type: 'shoot' },
    1.2,
    { type: 'shoot' },
  ],
  aim: [
    { type: 'target', x: 120, y: 220 },
    { type: 'shoot' },
    0.65,
    ligar('aim'),
    { type: 'shoot' },
    1.35,
  ],
  pool: [3.2, ligar('recycle'), 4.6],
  'entity-state': [
    { type: 'brain', id: 1, state: 'mirar' },
    { type: 'brain', id: 2, state: 'atirar' },
    2.4,
    { type: 'brain', id: 3, state: 'recarregar' },
    1.3,
  ],
  'delta-time': [2.3, { type: 'count', kind: 'seconds' }, 1.7],
  'circle-collision': [4.1, { type: 'radius', which: 'a', value: 10 }, 1.9],
}

/** Um gerador determinístico (a mesma semente dá as mesmas fatias: o teste não pisca). */
function aleatorio(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * As fatias em que um tempo chega ao motor. ⚠️ Todas somam EXATAMENTE o mesmo tempo: a última é o
 * que falta. É isso que o teste compara; o player de verdade descarta o que acumulou ao pausar.
 */
type Fatiamento = (segundos: number) => number[]
const emPedacos =
  (pedaco: () => number): Fatiamento =>
  (segundos) => {
    const fatias: number[] = []
    let resta = segundos
    while (resta > 1e-9) {
      const f = Math.min(pedaco(), resta)
      // ⚠️ O `advance` tem piso de 0,001 s: a sobra menor que isso vai junto com a fatia anterior.
      if (resta - f < 0.001) {
        fatias.push(resta)
        break
      }
      fatias.push(f)
      resta -= f
    }
    return fatias
  }
/** O ▶ do player: quadros de 60 Hz com tremida, juntados até passar de 0,04 s. */
const doPlayer = (semente: number): Fatiamento => {
  const r = aleatorio(semente)
  return emPedacos(() => {
    let junto = 0
    while (junto < 0.04) junto += 1 / 60 + (r() - 0.5) * 0.0006
    return junto
  })
}
/** Cada quadro de 60 Hz do navegador (~16 ms com tremida), sem juntar. */
const quadroDoNavegador = (semente: number): Fatiamento => {
  const r = aleatorio(semente)
  return emPedacos(() => 1 / 60 + (r() - 0.5) * 0.0006)
}
const fixas =
  (tamanho: number): Fatiamento =>
  (segundos) =>
    emPedacos(() => tamanho)(segundos)
/** O tempo inteiro numa chamada só, como o roteiro do professor. */
const inteiro: Fatiamento = (segundos) => [segundos]

function tocar(scene: SceneId, plano: Plano, fatiar: Fatiamento, de?: SceneState): SceneState {
  const start = { scene }
  let s = de ?? openScene(start)
  for (const passo of plano) {
    if (typeof passo !== 'number') {
      s = stepScene(start, s, passo)
      continue
    }
    for (const seconds of fatiar(passo)) s = stepScene(start, s, { type: 'advance', seconds })
  }
  return s
}

/**
 * O mundo, sem o que depende de QUANTAS chamadas houve: o contador de ações (uma por fatia) e a
 * sobra do relógio (a mesma, a menos do arredondamento binário de somas diferentes).
 */
function mundo(s: SceneState) {
  const { evidence, clock, ...resto } = s
  expect(clock.carry).toBeGreaterThanOrEqual(0)
  return { ...resto, evidence: { ...evidence, actions: 0 } }
}

describe('⭐⭐ o mesmo tempo dá o mesmo mundo, em qualquer fatiamento', () => {
  const cenas = Object.keys(SCENE_FRAME_RATE) as CenaComRelogio[]

  test('a tabela do relógio é a régua de quem tem tempo: toda cena com `advance` tem ritmo, e só elas', () => {
    for (const scene of SCENE_IDS) {
      const temRelogio = sceneFrameRate(scene) !== null
      // `isSceneAction` é a régua do player para mostrar o ▶: as duas não podem divergir.
      expect(Boolean(PLANOS[scene as CenaComRelogio]), scene).toBe(temRelogio)
    }
    for (const scene of cenas) {
      const fps = SCENE_FRAME_RATE[scene]
      // Inteiro, de 1 a 30: os números por segundo divididos pelo ritmo ficam exatos, e o validador
      // aceita a sobra (menor que um quadro, ou seja, menor que 1 s).
      expect(Number.isInteger(fps), scene).toBe(true)
      expect(fps, scene).toBeGreaterThanOrEqual(1)
      expect(fps, scene).toBeLessThanOrEqual(30)
    }
  })

  test('⚠️⚠️ ▶ do player (60 Hz com tremida), quadros de 16 ms, fatias de 0,2 s e de 1 s: o mesmo mundo do `advance` inteiro', () => {
    for (const scene of cenas) {
      const plano = PLANOS[scene]
      // ⚠️ Mudou de propósito (review do lote 4): a referência é o `advance` INTEIRO, como o roteiro
      // manda. Com fatias de 1 s ela não pegava a frase do pouso, que só o `advance` inteiro deixava
      // na tela (o conserto está no `advance` do motor).
      const referencia = mundo(tocar(scene, plano, inteiro))
      for (const [nome, fatiar] of [
        ['▶ do player', doPlayer(7)],
        ['▶ do player, outra tremida', doPlayer(42)],
        ['quadros de 16 ms', quadroDoNavegador(3)],
        ['fatias de 0,2 s', fixas(0.2)],
        ['fatias de 1 s', fixas(1)],
      ] as const) {
        const s = tocar(scene, plano, fatiar)
        expect(mundo(s), `${scene}: ${nome}`).toEqual(referencia)
        expect(isSceneState(s), `${scene}: ${nome}`).toBe(true)
      }
    }
  })

  test('⚠️ anti-vácuo: os planos MUDAM o mundo, e os números são os do ritmo de cada cena', () => {
    // Um plano que não mexe em nada passaria no teste acima com qualquer motor.
    const r = (scene: CenaComRelogio) => tocar(scene, PLANOS[scene], doPlayer(1))
    // draw-loop: 5,1 s a 4 por segundo são 20 quadros; o rastro dos 2,1 s (8 quadros) ficou para trás.
    expect(r('draw-loop').render.frames).toBe(20)
    // contact: 1,3 s a 4 por segundo encostado = 5 corações em cima e UM embaixo; e UM na volta.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): as duas pistas ao mesmo tempo.
    const contato = tocar('contact', PLANOS.contact.slice(0, 2), doPlayer(1))
    expect(contato.hit.top).toBe(10 - 5)
    expect(contato.hit.bottom).toBe(10 - 1)
    expect(r('contact').evidence.discoveries).toContain('apart')
    // velocity: 1,7 s a 5 por segundo = 8 quadros de x + 5.
    const andou = tocar('velocity', PLANOS.velocity.slice(0, 2), doPlayer(1))
    expect(andou.drive.x).toBe(60 + 8 * 5)
    expect(andou.drive.ticks).toBe(8)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a `diagonal` saiu do relógio (o gesto é "Andar 1
    // segundo"). No lugar dela, a `group-loop`: 1,3 s a 10 por segundo = 13 quadros de vaivém.
    expect(tocar('group-loop', PLANOS['group-loop'].slice(0, 2), doPlayer(1)).hunt.ticks).toBe(13)
    expect(r('group-loop').evidence.discoveries).toContain('auto')
    // enemy-type: 1,2 s a velocidade 3 = 12 quadros de 6 (430 − 72); e a cópia ao nascer.
    const ficha = tocar('enemy-type', PLANOS['enemy-type'].slice(0, 3), doPlayer(1))
    expect(ficha.blueprint.cacti[0]?.x).toBe(430 - 12 * 6)
    expect(r('enemy-type').evidence.discoveries).toContain('copied')
    // pool: um cacto por segundo, que ATRAVESSA a tela em 10 quadros. ⚠️ Mudou de propósito (lote 5
    // do Raio-X): o nº 1 entra no primeiro quadro, então 3,2 s já são 4 fabricados (o nº 4 entrou em
    // 3,1 s) e 2,9 s são 3.
    expect(tocar('pool', [3.2], doPlayer(1)).nursery.created).toBe(4)
    expect(tocar('pool', [2.9], doPlayer(1)).nursery.created).toBe(3)
    // lives: 2,5 s de ponto = 2 pontos (e não 1,999 por soma binária).
    expect(tocar('lives', PLANOS.lives.slice(0, 2), doPlayer(1)).lifeline.points).toBe(2)
    // spawn: sem relógio, UM cacto por quadro a 30 por segundo.
    expect(tocar('spawn', [1.4], doPlayer(1)).crowd.born).toBe(42)
    // circle-collision: 2 inteiros por quadro, e a batida exata em 60.
    const perto = tocar('circle-collision', [4.1], doPlayer(1))
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): o relógio só aproxima ATÉ a
    // batida. Em 4 s (40 quadros) ela chega a 60, e o décimo de segundo a mais não mexe em nada.
    expect(perto.circles.distance).toBe(140 - 40 * 2)
    expect(perto.evidence.discoveries).toContain('touch')
    // hold-vs-press: 2,3 s segurando a 4 por segundo = 9 passos de 30 da raquete de baixo.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): o passo é de 30, e é contado desde que a tecla afundou.
    const tecla = tocar('hold-vs-press', PLANOS['hold-vs-press'].slice(0, 5), doPlayer(1))
    expect(tecla.input.holdSteps).toBe(9)
    expect(tecla.input.holdX).toBe(40 + 30 * 9)
    // aim: o tiro com a mira ligada acerta o alvo em x 120, y 220.
    expect(r('aim').sight.result).toBe('acertou')
  })
})

/**
 * O que um quadro MEXE em cada cena, a partir de um estado preparado para ele aparecer. É a prova de
 * que o passo avança exatamente um quadro, e não "um pouco de tempo".
 */
const CONTADOR: Record<
  CenaComRelogio,
  { preparo: SceneAction[]; conta: (s: SceneState) => number }
> = {
  'draw-loop': { preparo: [], conta: (s) => s.render.frames },
  frames: {
    // 24 trocas por segundo não cabe (máx. 12): a 12 por segundo, uma troca a cada dois quadros.
    preparo: [
      { type: 'rate', perSecond: 12 },
      { type: 'play', on: true },
    ],
    conta: (s) => s.animation.swaps * 2 + Math.round(s.animation.elapsed * 24),
  },
  lives: { preparo: [ligar('condition')], conta: (s) => s.lifeline.points },
  gravity: { preparo: [], conta: (s) => Math.round(s.crowd.elapsed * 30) },
  impulse: { preparo: [], conta: (s) => Math.round(s.crowd.elapsed * 30) },
  'jump-sound': { preparo: [], conta: (s) => Math.round(s.crowd.elapsed * 30) },
  spawn: { preparo: [], conta: (s) => s.crowd.born },
  cleanup: { preparo: [], conta: (s) => Math.round(s.crowd.elapsed * 20) },
  'game-state': { preparo: [], conta: (s) => Math.round(s.crowd.elapsed * 20) },
  score: { preparo: [], conta: (s) => s.match.points },
  restart: {
    preparo: [{ type: 'start', input: 'tap' }],
    conta: (s) => Math.round(s.crowd.elapsed * 20),
  },
  velocity: { preparo: [], conta: (s) => s.drive.ticks },
  'hold-vs-press': { preparo: [], conta: (s) => s.input.ticks },
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): os cactos da ficha andam, e o laço mede a cada quadro.
  'group-loop': { preparo: [], conta: (s) => s.hunt.ticks },
  'enemy-type': { preparo: [], conta: (s) => s.blueprint.ticks },
  contact: { preparo: [{ type: 'approach', distance: 0 }], conta: (s) => s.hit.damage },
  cooldown: {
    preparo: [{ type: 'recharge', seconds: 2 }, { type: 'shoot' }],
    conta: (s) => Math.round((2 - s.weapon.ready) * 10),
  },
  // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): o tiro VOA, 30 por quadro, a partir do Dino em x 240.
  aim: {
    preparo: [{ type: 'target', x: 240, y: 20 }, { type: 'shoot' }],
    conta: (s) => (s.sight.bulletX - 240) / 30,
  },
  pool: { preparo: [], conta: (s) => s.nursery.ticks },
  'entity-state': { preparo: [], conta: (s) => s.brains.ticks },
  'delta-time': { preparo: [], conta: (s) => Math.round(s.machines.elapsed * 10) },
  'circle-collision': { preparo: [], conta: (s) => (140 - s.circles.distance) / 2 },
}

describe('⭐⭐ o passo avança QUADROS INTEIROS da cena', () => {
  test('⚠️⚠️ "Avançar 1 quadro" = um quadro, "Um passo" = os quadros inteiros de ~0,2 s, mesmo com o ▶ tendo deixado uma sobra', () => {
    for (const scene of Object.keys(SCENE_FRAME_RATE) as CenaComRelogio[]) {
      const fps = SCENE_FRAME_RATE[scene]
      const start = { scene }
      const { preparo, conta } = CONTADOR[scene]
      // ⚠️ Mudou de propósito (review do lote 4): o passo era SEMPRE um quadro, e nas cenas rápidas
      // isso era um tique invisível (30 cliques para um pulo). Onde o quadro é o assunto ele continua
      // um quadro; nas outras, os quadros inteiros mais perto de 0,2 s.
      const segundos = sceneStepSeconds(scene) as number
      const porPasso = Math.round(segundos * fps)
      expect(Math.abs(segundos * fps - porPasso), scene).toBeLessThan(1e-9)
      expect(porPasso, scene).toBe(
        sceneStepLabel(scene) === 'Avançar 1 quadro' ? 1 : Math.max(1, Math.round(0.2 * fps)),
      )
      for (const sobra of [0, 0.37, 0.93]) {
        let s = preparo.reduce((e, a) => stepScene(start, e, a), openScene(start))
        // Um pedaço do ▶ que NÃO fecha quadro: a criança pausou no meio.
        if (sobra > 0) s = stepScene(start, s, { type: 'advance', seconds: sobra / fps })
        const antes = conta(s)
        // ⚠️ Nas três em que o quadro não ACUMULA nada, um passo só; a sobra intacta (abaixo) é o que
        // prova, nelas, que o passo não andou um quadro a mais.
        // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a `aim` e a `enemy-type` passaram a ACUMULAR
        // (o tiro voa, os cactos andam) e a `diagonal` saiu do relógio. Ninguém fica de fora.
        const passos = 3
        for (let i = 0; i < passos; i++)
          s = stepScene(start, s, { type: 'advance', seconds: segundos })
        const quadros = passos * porPasso
        expect(conta(s) - antes, `${scene}, sobra ${sobra}`).toBe(quadros)
        // E a sobra continua a mesma: o passo não comeu nem deixou pedaço de quadro. ⚠️ Comparada
        // DIRETO desde que a sobra é fração de quadro.
        expect(s.clock.carry, `${scene}, sobra ${sobra}`).toBeCloseTo(sobra, 6)
      }
    }
  })

  test('o nome e o tempo do passo: "Avançar 1 quadro" onde o quadro é o assunto, "Um passo" de ~0,2 s nas outras', () => {
    const quadro = SCENE_IDS.filter((s) => sceneStepLabel(s) === 'Avançar 1 quadro')
    expect(quadro.sort()).toEqual(['contact', 'draw-loop', 'hold-vs-press', 'spawn', 'velocity'])
    // As que chamam de quadro o DESENHO, ou os quadros de outro computador, não podem dizer isso.
    for (const s of ['frames', 'delta-time'] as const) expect(sceneStepLabel(s)).toBe('Um passo')
    // Sem relógio, sem botão.
    for (const s of SCENE_IDS) {
      expect(sceneStepLabel(s) === null, s).toBe(sceneFrameRate(s) === null)
      expect(sceneStepSeconds(s) === null, s).toBe(sceneFrameRate(s) === null)
    }
    // Os números da tabela do review: 6 quadros no salto, 5 na `frames`, 4 nas de 20 por segundo, 2
    // nas de 10 e o segundo inteiro nas de 1 por segundo.
    const quadrosPorPasso = (s: CenaComRelogio) =>
      Math.round((sceneStepSeconds(s) as number) * SCENE_FRAME_RATE[s])
    expect(quadrosPorPasso('gravity')).toBe(6)
    // ⚠️ Mudou de propósito (lote 5): a `random` saiu da tabela; a `restart` anda 4 por passo.
    expect(quadrosPorPasso('restart')).toBe(4)
    expect(quadrosPorPasso('frames')).toBe(5)
    expect(quadrosPorPasso('cleanup')).toBe(4)
    expect(quadrosPorPasso('circle-collision')).toBe(2)
    expect(sceneStepSeconds('score')).toBe(1)
    expect(sceneStepSeconds('draw-loop')).toBe(0.25)
    expect(sceneStepSeconds('spawn')).toBe(1 / 30)
    // Anti-vácuo, no motor: do pulo ao chão na `gravity` são 5 cliques, e não 30.
    const g = { scene: 'gravity' } as const
    let s = [ligar('gravity'), { type: 'jump', input: 'tap' } as SceneAction].reduce(
      (e, a) => stepScene(g, e, a),
      openScene(g),
    )
    let cliques = 0
    while (s.flight.time !== null && cliques < 60) {
      s = stepScene(g, s, { type: 'advance', seconds: sceneStepSeconds('gravity') as number })
      cliques++
    }
    expect(cliques).toBe(5)
  })
})

describe('⚠️⚠️ nas cenas de quadro LONGO o gesto recomeça o quadro (review do lote 4)', () => {
  const start = (scene: SceneId) => ({ scene })
  const faz = (scene: SceneId, acoes: SceneAction[]) =>
    acoes.reduce((e, a) => stepScene(start(scene), e, a), openScene(start(scene)))
  const segurar = (scene: SceneId, s: SceneState, segundos: number, fatia = 0.04) => {
    let e = s
    for (let t = 0; t + 1e-9 < segundos; t += fatia)
      e = stepScene(start(scene), e, { type: 'advance', seconds: fatia })
    return e
  }
  /** Uma fatia do ▶: quadros de 60 Hz com tremida forte, juntados até passar de 0,04 s. */
  const fatiaDo = (r: () => number) => () => {
    let j = 0
    while (j < 0.04) j += 1 / 60 + (r() - 0.5) * 0.004
    return j
  }

  test('a régua: só as de 1 ou 2 quadros por segundo', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): a `diagonal` saiu do relógio.
    expect(SCENE_IDS.filter(sceneLongFrame).sort()).toEqual([
      'entity-state',
      'lives',
      // ⚠️ Mudou de propósito (lote 5 do Raio-X): a `pool` subiu para 10 por segundo (o cacto anda).
      'score',
    ])
  })

  test('⚠️⚠️ score: com o ▶ em fatias irregulares, "ficou parado" só cai depois de 1 s INTEIRO a partir do gesto', () => {
    // ⚠️ Mudou de propósito (lote 5): "o início esperou" pede antes o placar SOLTO crescendo no início.
    const casos: [string, SceneAction[], SceneAction][] = [
      ['score-start', [{ type: 'advance', seconds: 1 }], ligar('condition')],
      // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5, A6): "parou no fim" pede antes os
      // pontos crescendo jogando, então o preparo joga um segundo inteiro.
      [
        'score-end',
        [ligar('condition'), { type: 'start', input: 'key' }, { type: 'advance', seconds: 1 }],
        { type: 'collide' },
      ],
    ]
    for (const [meta, preparo, gesto] of casos) {
      const tempos: number[] = []
      for (let semente = 1; semente <= 400; semente++) {
        const r = aleatorio(semente)
        const fatia = fatiaDo(r)
        let s = faz('score', preparo)
        // ▶ por um tempo sorteado ANTES do gesto: a sobra fica em qualquer ponto do quadro.
        const antes = r() * 3
        for (let t = 0; t < antes; ) {
          const f = fatia()
          s = stepScene(start('score'), s, { type: 'advance', seconds: f })
          t += f
        }
        expect(s.evidence.discoveries, `${meta}, semente ${semente}`).not.toContain(meta)
        s = stepScene(start('score'), s, gesto)
        expect(s.clock.carry).toBe(0)
        let depois = 0
        while (!s.evidence.discoveries.includes(meta) && depois < 5) {
          const f = fatia()
          s = stepScene(start('score'), s, { type: 'advance', seconds: f })
          depois += f
        }
        tempos.push(depois)
      }
      // Nunca antes de um segundo inteiro depois do gesto, e no máximo uma fatia depois dele. Antes do
      // conserto o mínimo era 0,05 s.
      expect(Math.min(...tempos), meta).toBeGreaterThanOrEqual(1 - 1e-6)
      expect(Math.max(...tempos), meta).toBeLessThan(1.07)
    }
  })

  test('⚠️⚠️ o caso do review: ▶ de 0,96 s, gesto, e a meta NÃO cai em 0,5 s e cai em 1 s', () => {
    // ⚠️ 1,96 s e não 0,96 (lote 5): o primeiro segundo é o placar solto crescendo no início.
    const inicio = segurar('score', openScene(start('score')), 1.96)
    expect(inicio.evidence.discoveries).toContain('score-idle-wrong')
    expect(inicio.clock.carry).toBeCloseTo(0.96, 6)
    const guardado = stepScene(start('score'), inicio, ligar('condition'))
    expect(segurar('score', guardado, 0.52).evidence.discoveries).not.toContain('score-start')
    expect(segurar('score', guardado, 1).evidence.discoveries).toContain('score-start')

    const partida = faz('score', [ligar('condition'), { type: 'start', input: 'key' }])
    // ⚠️ 1,96 s e não 0,96 (consertos do review da onda A do lote 5, A6): "parou no fim" pede antes um
    // ponto jogando, e ele cai no primeiro segundo; a sobra de 0,96 continua sendo o caso do review.
    const jogou = segurar('score', partida, 1.96)
    expect(jogou.evidence.discoveries).toContain('score-playing')
    const bateu = stepScene(start('score'), jogou, { type: 'collide' })
    expect(segurar('score', bateu, 0.52).evidence.discoveries).not.toContain('score-end')
    expect(segurar('score', bateu, 1).evidence.discoveries).toContain('score-end')

    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a `pool` saiu daqui. A 10 por segundo o gesto não
    // recomeça o quadro, e o adiantamento máximo é um quadro de 0,1 s (o teste do tempo, abaixo).
  })

  test('⚠️ desfazer também é gesto: volta sem a sobra de antes do gesto desfeito', () => {
    const cena = start('score')
    let s = initialExperiment(cena)
    for (const a of [ligar('condition'), { type: 'start', input: 'key' } as SceneAction])
      s = stepExperiment(cena, s, a).session
    for (let i = 0; i < 24; i++)
      s = stepExperiment(cena, s, { type: 'advance', seconds: 0.04 }).session
    // Jogando há 0,96 s, sem ponto ainda. Bate, e desfaz a batida.
    expect(s.state.match.points).toBe(0)
    s = stepExperiment(cena, s, { type: 'collide' }).session
    s = stepExperiment(cena, s, { type: 'undo' }).session
    expect(s.state.match.screen).toBe('playing')
    expect(s.state.clock.carry).toBe(0)
    // Sem o conserto, o ponto (e "os pontos cresceram durante a partida") vinha 0,04 s depois.
    for (let i = 0; i < 13; i++)
      s = stepExperiment(cena, s, { type: 'advance', seconds: 0.04 }).session
    expect(s.state.evidence.discoveries).not.toContain('score-playing')
    for (let i = 0; i < 13; i++)
      s = stepExperiment(cena, s, { type: 'advance', seconds: 0.04 }).session
    expect(s.state.evidence.discoveries).toContain('score-playing')
  })

  test('⚠️ nas de 4 por segundo em diante o gesto NÃO mexe na sobra, e a pista em nenhuma', () => {
    const c = start('contact')
    const meio = stepScene(c, openScene(c), { type: 'advance', seconds: 0.5 / 4 })
    expect(stepScene(c, meio, { type: 'approach', distance: 20 }).clock.carry).toBeCloseTo(0.5, 6)
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a pista na `entity-state`, que continua de quadro longo
    // (a `pool` subiu para 10 por segundo).
    const p = start('entity-state')
    const torres = stepScene(p, openScene(p), { type: 'advance', seconds: 0.6 })
    expect(stepScene(p, torres, { type: 'hint', level: 1 }).clock.carry).toBeCloseTo(0.6, 6)
  })
})

describe('⚠️⚠️ a sobra guardada e o custo do servidor (review do lote 4)', () => {
  test('⚠️⚠️ a sobra é FRAÇÃO de quadro: subir o ritmo de uma cena não solta vários quadros de uma vez', () => {
    // A mesma fração em qualquer ritmo.
    for (const scene of Object.keys(SCENE_FRAME_RATE) as CenaComRelogio[]) {
      const start = { scene }
      const fps = SCENE_FRAME_RATE[scene]
      const s = stepScene(start, openScene(start), { type: 'advance', seconds: 0.4 / fps })
      expect(s.clock.carry, scene).toBeCloseTo(0.4, 9)
    }
    // O cenário do review: uma sessão gravada com 0,9 de sobra (a de um quadro de 1 s) lida numa cena
    // de 10 por segundo. Em segundos seriam floor((0,9 + 0,04) × 10) = 9 quadros na primeira fatia;
    // em fração é UM.
    const c = { scene: 'circle-collision' } as const
    const guardada = { ...openScene(c), clock: { carry: 0.9 } }
    expect(isSceneState(guardada)).toBe(true)
    const depois = stepScene(c, guardada, { type: 'advance', seconds: 0.04 })
    expect(140 - depois.circles.distance).toBe(2)
  })

  test('⚠️⚠️ o comando da criança pede no máximo 1 s e 30 quadros: um segmento roda no máximo 3.000 quadros', () => {
    let pior = 0
    for (const scene of Object.keys(SCENE_FRAME_RATE) as CenaComRelogio[]) {
      const start = { scene }
      const fps = SCENE_FRAME_RATE[scene]
      const aceita = (seconds: number) => isExperimentCommand({ type: 'advance', seconds }, start)
      // O player de produção (0,2 s), a fatia mais longa do ▶ com menos movimento (0,3 s) e o passo.
      expect(aceita(0.2), scene).toBe(true)
      expect(aceita(0.3), scene).toBe(true)
      expect(aceita(sceneStepSeconds(scene) as number), scene).toBe(true)
      expect(aceita(1), scene).toBe(fps <= SESSION_LIMITS.advanceFrames)
      expect(aceita(1.001), scene).toBe(false)
      expect(aceita(30), scene).toBe(false)
      // ⚠️ O teto é da CRIANÇA: o professor segue com a régua da cena no caso e no roteiro.
      expect(isSceneAction({ type: 'advance', seconds: 30 }, scene), scene).toBe(true)
      pior = Math.max(
        pior,
        Math.min(SESSION_LIMITS.advanceSeconds * fps, SESSION_LIMITS.advanceFrames),
      )
    }
    expect(pior * SESSION_LIMITS.segment).toBeLessThanOrEqual(3000)
    // E o servidor recusa o segmento hostil inteiro, antes de rodar quadro nenhum.
    const spawn = { scene: 'spawn' } as const
    expect(() =>
      applyExperimentSegment(spawn, null, {
        sessionId: 's',
        segmentId: 'g',
        baseSequence: 0,
        commands: Array.from({ length: 100 }, () => ({ type: 'advance', seconds: 30 })),
      }),
    ).toThrow()
  })

  test('⚠️ a frase do pouso não depende do fatiamento: sem nada no ar, o relógio não a apaga', () => {
    const js = { scene: 'jump-sound' } as const
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): o salto da `jump-sound` é de impulso 14 (~1,6 s), e a
    // frase do pouso diz só o que aconteceu.
    const plano: Plano = [{ type: 'jump', input: 'key' }, 1.8]
    const pouso = 'O Dino voltou ao chão.'
    expect(tocar('jump-sound', plano, inteiro).caption).toBe(pouso)
    expect(tocar('jump-sound', plano, doPlayer(3)).caption).toBe(pouso)
    // No ar, o relógio continua apagando a frase do gesto.
    const noAr = stepScene(js, openScene(js), { type: 'jump', input: 'tap' })
    expect(stepScene(js, noAr, { type: 'advance', seconds: 0.1 }).caption).toBe('')
  })
})

describe('⚠️⚠️ a meta que fala de TEMPO continua pedindo o tempo visto', () => {
  const start = (scene: SceneId) => ({ scene })
  const segurar = (scene: SceneId, s: SceneState, segundos: number, fatia = 0.04) => {
    let e = s
    for (let t = 0; t + 1e-9 < segundos; t += fatia)
      e = stepScene(start(scene), e, { type: 'advance', seconds: fatia })
    return e
  }

  test('score: "no início o placar ficou parado" só depois de um segundo inteiro parado', () => {
    // O motor contava 0,5 s de fatias; com o quadro de 1 s o quadro tem de FECHAR, e ele não fecha
    // adiantado: a meta nunca cai antes de a criança ter visto o tempo passar.
    // ⚠️ Mudou de propósito (lote 5): antes, o placar solto crescendo no início (a comparação).
    const solto = segurar('score', openScene(start('score')), 1)
    const guardado = stepScene(start('score'), solto, ligar('condition'))
    expect(segurar('score', guardado, 0.96).evidence.discoveries).not.toContain('score-start')
    expect(segurar('score', guardado, 1).evidence.discoveries).toContain('score-start')
  })

  test('pool: "parou de crescer" pede quatro segundos com a reciclagem ligada', () => {
    let s = segurar('pool', openScene(start('pool')), 3)
    expect(s.evidence.discoveries).toContain('grows')
    s = stepScene(start('pool'), s, ligar('recycle'))
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): 40 quadros de 0,1 s, e o gesto não recomeça o quadro
    // (a sobra de antes do fio adianta no máximo UM quadro).
    expect(segurar('pool', s, 3.88).evidence.discoveries).not.toContain('steady')
    expect(segurar('pool', s, 4).evidence.discoveries).toContain('steady')
  })

  test('spawn: a parede só com um segundo inteiro de relógio (30 cactos), e nunca com 0,2 s', () => {
    expect(segurar('spawn', openScene(start('spawn')), 0.2).evidence.discoveries).not.toContain(
      'every-frame',
    )
    const parede = segurar('spawn', openScene(start('spawn')), 1)
    expect(parede.crowd.born).toBe(30)
    expect(parede.evidence.discoveries).toContain('every-frame')
  })

  test('contact: "tirou vida em todo quadro" pede três quadros encostado, e não três fatias', () => {
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G5): o encosto é com os DESENHOS se tocando, em 0.
    const encostado = stepScene(start('contact'), openScene(start('contact')), {
      type: 'approach',
      distance: 0,
    })
    // Três fatias do ▶ (0,12 s) derrubavam a meta antes; hoje nem um coração saiu.
    const tres = segurar('contact', encostado, 0.12)
    expect(tres.hit.damage).toBe(0)
    expect(tres.evidence.discoveries).not.toContain('drain')
    expect(segurar('contact', encostado, 0.75).evidence.discoveries).toContain('drain')
  })

  test('delta-time: "chegaram juntos" na CHEGADA, andando a cada segundo, sem escorregar um quadro', () => {
    let s = segurar('delta-time', openScene(start('delta-time')), 2)
    expect(s.evidence.discoveries).toContain('apart')
    s = stepScene(start('delta-time'), s, { type: 'count', kind: 'seconds' })
    // ⚠️ Mudou de propósito (lote 5 do Raio-X): a meta é a chegada (120 a 40 por segundo = 30 quadros),
    // e não um segundo andando juntos. Trinta quadros de 0,1 s somam 2,9999999999999996: a meta cai no
    // trigésimo, e não no seguinte.
    let quadros = 0
    while (!s.evidence.discoveries.includes('together') && quadros < 40) {
      s = stepScene(start('delta-time'), s, { type: 'advance', seconds: 0.1 })
      quadros++
    }
    expect(quadros).toBe(30)
  })
})

describe('⚠️⚠️ o servidor rejoga igual ao navegador, e o que está gravado continua abrindo', () => {
  /** A sessão inteira que o navegador monta, gesto a gesto e fatia a fatia. */
  function comandos(scene: CenaComRelogio): ExperimentCommand[] {
    const lista: ExperimentCommand[] = []
    const fatiar = doPlayer(11)
    for (const passo of PLANOS[scene]) {
      if (typeof passo !== 'number') lista.push(passo)
      else for (const seconds of fatiar(passo)) lista.push({ type: 'advance', seconds })
    }
    return lista
  }

  test('⚠️⚠️ os comandos do ▶ em segmentos de 100, guardados e relidos entre um e outro: o mesmo mundo', () => {
    for (const scene of Object.keys(SCENE_FRAME_RATE) as CenaComRelogio[]) {
      const start = { scene }
      const lista = comandos(scene)
      let navegador = initialExperiment(start)
      for (const c of lista) navegador = stepExperiment(start, navegador, c).session
      // O servidor: um checkpoint por segmento, EMPACOTADO e LIDO de volta, como no banco.
      let guardado: { sequence: number; session: ExperimentSession } | null = null
      for (let i = 0; i < lista.length; i += 100) {
        const aplicado = applyExperimentSegment(
          start,
          guardado
            ? {
                sequence: guardado.sequence,
                sessionId: 's',
                segmentId: 'g',
                session: guardado.session,
              }
            : null,
          {
            sessionId: 's',
            segmentId: `g${i}`,
            baseSequence: guardado?.sequence ?? 0,
            commands: lista.slice(i, i + 100),
          },
        )
        const relido = readExperimentSession(scene, packExperiment(scene, aplicado.session))
        expect(relido, scene).not.toBeNull()
        guardado = { sequence: aplicado.sequence, session: relido as ExperimentSession }
      }
      expect(guardado?.session.state, scene).toEqual(navegador.state)
    }
  })

  test('⚠️⚠️ retrato de ANTES do relógio (sem `clock`, com sobras velhas) abre, e segue no ritmo novo', () => {
    // Uma criança que mexeu na `lives` ontem: dois pontos, 0,96 s de resto das fatias do motor
    // antigo, as metas já descobertas. Sem hidratação o validador recusaria o retrato inteiro e a
    // sessão voltaria ao começo.
    const start = { scene: 'lives' } as const
    let ontem = openScene(start)
    for (const a of [ligar('condition'), ligar('life'), { type: 'collide' } as SceneAction])
      ontem = stepScene(start, ontem, a)
    const { clock: _sem, ...antigo } = {
      ...ontem,
      lifeline: { ...ontem.lifeline, points: 2, remainder: 0.96 },
      evidence: { ...ontem.evidence, discoveries: [...ontem.evidence.discoveries, 'points-stay'] },
    }
    expect(isSceneState(antigo)).toBe(false)
    const partes = [JSON.stringify({ scene: 'lives', state: antigo, past: [antigo], trials: [] })]
    const lido = readExperimentSession('lives', partes)
    expect(lido).not.toBeNull()
    if (!lido) return
    expect(lido.state.clock.carry).toBe(0)
    // O que ela já tinha descoberto continua valendo, com o MESMO resultado.
    const alvo = ['life-lost', 'points-stay']
    const antes = evaluateExperimentation(
      'lives',
      antigo as unknown as SceneState,
      true,
      undefined,
      alvo,
    )
    const depois = evaluateExperimentation('lives', lido.state, true, undefined, alvo)
    expect(depois).toEqual(antes)
    expect(sceneGoals('lives', lido.state, undefined, alvo)).toEqual(
      sceneGoals('lives', antigo as unknown as SceneState, undefined, alvo),
    )
    // E o relógio anda no ritmo novo a partir dali: 0,5 s nada, 1 s um ponto.
    let s: ExperimentSession = lido
    s = stepExperiment(start, s, { type: 'advance', seconds: 0.5 }).session
    expect(s.state.lifeline.points).toBe(2)
    s = stepExperiment(start, s, { type: 'advance', seconds: 0.5 }).session
    expect(s.state.lifeline.points).toBe(3)

    // A velocidade no meio do caminho, com a posição quebrada das fatias antigas.
    const v = { scene: 'velocity' } as const
    const { clock: _c, ...meio } = {
      ...openScene(v),
      drive: { ...openScene(v).drive, vx: 5, x: 87.5, fromX: 85, anchorX: 60 },
    }
    const hidratado = hydrateSceneState(meio) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    expect(stepScene(v, hidratado, { type: 'advance', seconds: 0.2 }).drive.x).toBe(92.5)

    // E a demonstração guardada no meio de uma etapa.
    const d = readDemonstrationSession('velocity', [
      JSON.stringify({
        scene: 'velocity',
        state: meio,
        step: 0,
        action: 1,
        elapsed: 0.35,
        ready: false,
        viewed: false,
      }),
    ])
    expect(d?.state.clock.carry).toBe(0)
  })
})

describe('⚠️⚠️ os roteiros de demonstração continuam tocando no ritmo novo', () => {
  const docs = resolve(import.meta.dir, '../../../../../docs/aulas-interativas')
  const demonstracoes: { onde: string; activity: DemonstrationActivity }[] = []
  const andar = (valor: unknown, onde: string) => {
    if (Array.isArray(valor)) for (const v of valor) andar(v, onde)
    else if (valor && typeof valor === 'object') {
      const a = valor as { type?: string; scene?: string }
      if (a.type === 'demonstration' && typeof a.scene === 'string')
        demonstracoes.push({ onde, activity: valor as DemonstrationActivity })
      for (const v of Object.values(valor)) andar(v, onde)
    }
  }
  if (existsSync(docs))
    for (const pacote of readdirSync(docs).filter((p) => p.endsWith('-v6'))) {
      for (const aula of readdirSync(resolve(docs, pacote), { withFileTypes: true })) {
        const arquivo = resolve(docs, pacote, aula.name, 'manifesto.json')
        if (aula.isDirectory() && existsSync(arquivo))
          andar(JSON.parse(readFileSync(arquivo, 'utf8')), `${pacote}/${aula.name}`)
      }
      const opcionais = resolve(docs, pacote, 'demonstracoes-opcionais.json')
      if (existsSync(opcionais))
        andar(JSON.parse(readFileSync(opcionais, 'utf8')), `${pacote}/opcionais`)
    }
  for (const scene of SCENE_IDS)
    demonstracoes.push({ onde: 'catálogo', activity: { type: 'demonstration', scene } })

  test('a varredura LEU os manifestos (laço vazio aprova tudo)', () => {
    expect(demonstracoes.length).toBeGreaterThan(SCENE_IDS.length + 20)
  })

  test('⚠️⚠️ todo roteiro é válido (`playsOut`) e, tocado pelo ▶ do player, cumpre cada `waitFor`', () => {
    const faltas: string[] = []
    for (const { onde, activity } of demonstracoes) {
      const nome = `${onde} · ${activity.scene}`
      if (!isDemonstrationActivity(activity)) faltas.push(`${nome}: roteiro inválido`)
      const start: SceneStart = sceneStart(activity)
      const roteiro = sceneScript(activity)
      for (const semente of [1, 5]) {
        const r = aleatorio(semente)
        let s = stepDemonstration(start, roteiro, initialDemonstration(start), {
          type: 'start',
        }).session
        for (let i = 0; i < 6000 && !s.viewed; i++) {
          let junto = 0
          while (junto < 0.04) junto += 1 / 60 + (r() - 0.5) * 0.0006
          s = stepDemonstration(start, roteiro, s, { type: 'tick', seconds: junto }).session
          if (!s.ready) continue
          const espera = roteiro[s.step]?.waitFor
          if (espera && !s.state.evidence.discoveries.includes(espera))
            faltas.push(`${nome}, etapa ${s.step + 1}: ${espera}`)
          if (s.step < roteiro.length - 1)
            s = stepDemonstration(start, roteiro, s, { type: 'next' }).session
        }
        if (!s.viewed) faltas.push(`${nome}: não terminou`)
        // E o mundo no fim é o do roteiro tocado de uma vez (o `playsOut`).
        let deUmaVez = openScene(start)
        for (const passo of roteiro)
          for (const acao of passo.actions) deUmaVez = stepScene(start, deUmaVez, acao)
        expect(mundo(s.state), nome).toEqual(mundo(deUmaVez))
      }
    }
    expect(faltas).toEqual([])
  })

  test('⚠️ o roteiro do modelo continua dizendo a verdade no ritmo novo', () => {
    // `draw-loop`, etapa 2: "os desenhos de antes ficam na tela" sobre 5 Dinos: os 4 novos (1 s a 4
    // por segundo) e o do COMEÇO. ⚠️ Mudou de propósito (lote 5 do Raio-X): trocar a chave não apaga a
    // tela, então o desenho da abertura fica junto com o rastro.
    const dl = { scene: 'draw-loop' } as const
    let s = openScene(dl)
    for (const passo of SCENE_MODELS['draw-loop'].script.slice(0, 2))
      for (const a of passo.actions) s = stepScene(dl, s, a)
    expect(s.render.trail).toBe(5)
    // `lives`, etapa 1: "2 s de ponto" são 2 pontos.
    const lv = { scene: 'lives' } as const
    s = openScene(lv)
    for (const a of SCENE_MODELS.lives.script[0]?.actions ?? []) s = stepScene(lv, s, a)
    expect(s.lifeline.points).toBe(2)
    // `pool`, etapa 1: três segundos, três corpos criados.
    const pl = { scene: 'pool' } as const
    s = openScene(pl)
    for (const a of SCENE_MODELS.pool.script[0]?.actions ?? []) s = stepScene(pl, s, a)
    expect(s.nursery.created).toBe(3)
  })
})
