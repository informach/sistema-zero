import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId } from './actions'
import type { SceneCast } from './cast'
import {
  DIFERENCA_DE_ALTURA,
  openScene,
  SALTO_SEM_VOLTA,
  sceneJumpLeftView,
  stepScene,
  TOPO_DO_SALTO,
} from './engine'
import { evaluateExperimentation, sceneHint } from './evaluate'
import { sceneReadout, sceneSituation } from './readout'
import {
  isSceneState,
  type SceneState,
  SOUND_BEATS_MAX,
  START_TRIES_MAX,
  sceneCactiOnScreen,
} from './state'

/**
 * O redesenho do Corre Dino, primeira metade (lote 5 do Raio-X, 16/09/2026): `layers`, `gravity`,
 * `impulse`, `jump-sound`, `spawn`, `cleanup`, `game-state` e `controls`.
 *
 * ⚠️ A régua é a da casa: a meta só cai quando a criança VIU o que ela afirma. Cada `describe` cobra
 * as duas metades, o gesto que derruba a meta e o meio gesto (ou o estado de abertura) que NÃO derruba.
 * O pedido seguido ao pé da letra mora em `pedidos-no-motor.test.ts`.
 */

const FATIA = 0.05

/** Uma criança mexendo numa cena: gestos e o ▶ em fatias, como o player. */
function crianca(scene: SceneId, cast?: SceneCast) {
  const start = { scene }
  let estado: SceneState = openScene(start)
  const api = {
    get estado() {
      return estado
    },
    faz(...acoes: SceneAction[]) {
      for (const a of acoes) estado = stepScene(start, estado, a)
      return api
    },
    tempo(segundos: number) {
      for (let i = 0; i < Math.round(segundos / FATIA); i++)
        estado = stepScene(start, estado, { type: 'advance', seconds: FATIA })
      return api
    },
    viu: (meta: string) => estado.evidence.discoveries.includes(meta),
    avalia: () => evaluateExperimentation(scene, estado, true, cast),
  }
  return api
}

describe('layers: o Dino aparece, e depois esconde de novo só com a ordem', () => {
  test('⚠️⚠️ um toque não fecha as duas metas, e trocar para onde já estava não conta', () => {
    const c = crianca('layers')
    c.faz({ type: 'layer', front: false })
    expect(c.estado.evidence.discoveries).toEqual([])
    c.faz({ type: 'layer', front: true })
    expect(c.estado.evidence.discoveries).toEqual(['front'])
    c.faz({ type: 'layer', front: true })
    expect(c.viu('covered')).toBe(false)
  })

  test('esconder de novo só vale DEPOIS de ter visto o Dino na frente', () => {
    const c = crianca('layers')
    c.faz({ type: 'layer', front: true }, { type: 'layer', front: false })
    expect(c.viu('covered')).toBe(true)
  })

  test('⚠️ as duas metas caídas com a floresta por último pedem o arranjo do jogo, pelo nome', () => {
    const cast: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    const c = crianca('layers', cast)
    c.faz({ type: 'layer', front: true }, { type: 'layer', front: false })
    const r = c.avalia()
    expect(r.passed).toBe(false)
    // ⚠️ Mudou de propósito (full review de experiência, M4): a arrumação final é a meta
    // `back-in-front`, e o "Ainda falta" é o pedido dela.
    expect(r.feedback).toBe('Leve a pedra de novo para o fim da ordem de desenhar.')
    c.faz({ type: 'layer', front: true })
    expect(c.avalia().passed).toBe(true)
  })

  test('a pista fala da missão que FALTA', () => {
    const c = crianca('layers')
    c.faz({ type: 'layer', front: true })
    expect(sceneHint('layers', c.estado, 3)).toBe(
      'Com o Dino no fim da lista, leve a floresta para o fim.',
    )
  })
})

describe('gravity: a gravidade age no meio do voo', () => {
  test('⚠️⚠️ ligar no ar NÃO teletransporta: a altura continua, a subida freia e vira queda', () => {
    const c = crianca('gravity')
    c.faz({ type: 'jump', input: 'tap' }).tempo(1.5)
    expect(c.viu('floating')).toBe(true)
    const antes = c.estado.flight.y
    expect(antes).toBeGreaterThan(SALTO_SEM_VOLTA)
    c.faz({ type: 'connect', port: 'gravity', enabled: true })
    expect(c.estado.flight.y).toBe(antes)
    expect(c.estado.flight.time).not.toBeNull()
    const alturas: number[] = []
    while (c.estado.flight.time !== null && alturas.length < 200) {
      c.tempo(FATIA)
      alturas.push(c.estado.flight.y)
    }
    // Subiu mais um pouco, parou no alto e caiu até o chão.
    const topo = Math.max(...alturas)
    expect(topo).toBeGreaterThan(antes)
    expect(topo).toBeLessThan(antes + 70)
    expect(alturas.at(-1)).toBe(0)
    expect(c.viu('landed')).toBe(true)
  })

  test('⚠️ "com gravidade voltou ao chão" é comparação: pular com a gravidade já ligada não basta', () => {
    const c = crianca('gravity')
    c.faz({ type: 'connect', port: 'gravity', enabled: true }, { type: 'jump', input: 'tap' })
    c.tempo(1.2)
    expect(c.estado.flight.time).toBeNull()
    expect(c.viu('landed')).toBe(false)
  })

  test('⚠️ "não parou de subir" não cai no meio da subida de 120 de antes', () => {
    const c = crianca('gravity')
    c.faz({ type: 'jump', input: 'tap' }).tempo(0.6)
    expect(c.estado.flight.y).toBeGreaterThan(120)
    expect(c.viu('floating')).toBe(false)
  })

  test('desligar a gravidade descendo: o Dino segue descendo reto, pousa, e não conta como gravidade', () => {
    const c = crianca('gravity')
    c.faz({ type: 'jump', input: 'tap' }).tempo(1.5)
    c.faz({ type: 'connect', port: 'gravity', enabled: true }).tempo(1.2)
    expect(c.estado.flight.time).not.toBeNull()
    c.faz({ type: 'connect', port: 'gravity', enabled: false })
    c.tempo(10)
    expect(c.estado.flight.time).toBeNull()
    expect(c.estado.flight.y).toBe(0)
    expect(c.viu('landed')).toBe(false)
  })

  test('⚠️⚠️ o player para o ▶ na PASSAGEM pelo topo, e não a cada fatia acima dele', () => {
    const start = { scene: 'gravity' as const }
    let estado = stepScene(start, openScene(start), { type: 'jump', input: 'tap' })
    let paradas = 0
    for (let i = 0; i < 80; i++) {
      const depois = stepScene(start, estado, { type: 'advance', seconds: FATIA })
      if (sceneJumpLeftView('gravity', estado, depois)) paradas++
      estado = depois
    }
    expect(estado.flight.y).toBeGreaterThan(TOPO_DO_SALTO)
    expect(paradas).toBe(1)
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): sem gravidade, "saiu pelo alto e
    // não voltou" (parado ali, "passou do alto" parecia que o Dino tinha parado de subir).
    expect(sceneSituation('gravity', estado)).toContain('saiu pelo alto da tela')
  })

  test('a faixa diz a altura de AGORA, e sem o impulso', () => {
    const c = crianca('gravity')
    c.faz({ type: 'jump', input: 'tap' }).tempo(0.5)
    expect(sceneReadout('gravity', c.estado).map((r) => r.label)).toEqual([
      'gravidade',
      'altura agora',
    ])
  })
})

describe('impulse: duas marcas que ficam', () => {
  test('a marca do salto que pousou vira a "de antes" no pulo seguinte', () => {
    const c = crianca('impulse')
    c.faz({ type: 'jump', input: 'tap' }).tempo(1.1)
    expect(c.estado.flight.before).toBe(0)
    c.faz({ type: 'impulse', force: 14 }, { type: 'jump', input: 'tap' })
    expect(c.estado.flight.before).toBeCloseTo(67.5, 5)
    expect(c.estado.flight.beforeForce).toBe(9)
    c.tempo(1.7)
    expect(c.viu('other-height')).toBe(true)
    expect(sceneReadout('impulse', c.estado).map((r) => r.value)).toEqual(['14', '68', '163'])
  })

  test('⚠️⚠️ marcas perto demais NÃO fecham "outra altura", nem com o 14', () => {
    const c = crianca('impulse')
    c.faz({ type: 'impulse', force: 13 }, { type: 'jump', input: 'tap' }).tempo(1.6)
    c.faz({ type: 'impulse', force: 14 }, { type: 'jump', input: 'tap' }).tempo(1.7)
    expect(Math.abs(c.estado.flight.peak - c.estado.flight.before)).toBeLessThan(
      DIFERENCA_DE_ALTURA,
    )
    expect(c.viu('other-height')).toBe(false)
  })

  test('a marca de antes é memória do gesto: o caso não a deixa para a criança', () => {
    const start = {
      scene: 'impulse' as const,
      setup: {
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1.1 },
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 1.1 },
        ] as SceneAction[],
      },
    }
    expect(openScene(start).flight.before).toBe(0)
  })
})

describe('jump-sound: a linha do tempo dos pulos e dos sons', () => {
  test('o salto desta cena dura mais: impulso 14', () => {
    expect(openScene({ scene: 'jump-sound' }).flight.force).toBe(14)
  })

  test('som sem pulo e pulo sem som viram batidas e metas', () => {
    const c = crianca('jump-sound')
    c.faz({ type: 'jump', input: 'key' }).tempo(0.2).faz({ type: 'jump', input: 'key' })
    expect(c.viu('false-sound')).toBe(true)
    c.tempo(1.6).faz({ type: 'jump', input: 'tap' })
    expect(c.viu('silent-jump')).toBe(true)
    expect(c.estado.sound.beats).toEqual([
      { pulo: true, som: true },
      { pulo: false, som: true },
      { pulo: true, som: false },
    ])
    expect(sceneSituation('jump-sound', { ...c.estado, caption: '' })).toBe('2 pulos e 2 sons.')
  })

  test('⚠️ um som em cada pulo pede a tecla E o toque, com a peça em Quando o Dino pular', () => {
    const c = crianca('jump-sound')
    c.faz({ type: 'connect', port: 'sound', enabled: true }, { type: 'jump', input: 'key' })
    c.tempo(1.6)
    expect(c.viu('every-jump')).toBe(false)
    c.faz({ type: 'jump', input: 'tap' })
    expect(c.viu('every-jump')).toBe(true)
  })

  test('⚠️ a linha do tempo tem CORTE no motor, e o retrato continua válido', () => {
    const c = crianca('jump-sound')
    for (let i = 0; i < SOUND_BEATS_MAX + 4; i++) c.faz({ type: 'jump', input: 'key' }).tempo(1.6)
    expect(c.estado.sound.beats).toHaveLength(SOUND_BEATS_MAX)
    expect(isSceneState(c.estado)).toBe(true)
  })
})

describe('spawn: a comparação sem relógio × com relógio fica', () => {
  test('⚠️⚠️ levar Criar cacto para o relógio guarda o trecho sem relógio antes de recomeçar', () => {
    const c = crianca('spawn')
    c.tempo(2)
    const nasceram = c.estado.crowd.born
    expect(nasceram).toBeGreaterThanOrEqual(59)
    c.faz({ type: 'connect', port: 'timer', enabled: true })
    expect(c.estado.crowd.born).toBe(0)
    expect(c.estado.crowd.untimedBorn).toBe(nasceram)
    c.tempo(2)
    const faixa = sceneReadout('spawn', c.estado)
    expect(faixa.find((r) => r.label === 'sem relógio')?.value).toBe(`${nasceram} em 2 s`)
    // ⚠️ Mudou de propósito (consertos do review da onda A do lote 5): os dois lados no mesmo molde,
    // com o tempo de cada um ("com relógio: 2 em 2 s").
    expect(faixa.find((r) => r.label === 'com relógio')?.value).toBe(
      `${c.estado.crowd.born} em 2 s`,
    )
  })

  test('sem trecho sem relógio, nada a comparar', () => {
    const c = crianca('spawn')
    c.faz({ type: 'connect', port: 'timer', enabled: true }).tempo(1)
    expect(sceneReadout('spawn', c.estado).some((r) => r.label === 'sem relógio')).toBe(false)
  })
})

describe('cleanup: a prateleira dos bastidores', () => {
  test('a cena abre com três cactos na pista, todos no grupo', () => {
    const s = openScene({ scene: 'cleanup' })
    expect(s.crowd.cacti).toHaveLength(3)
    expect(s.crowd.born).toBe(3)
    expect(sceneCactiOnScreen(s.crowd)).toBe(3)
  })

  test('⚠️⚠️ "saiu da tela e ficou no grupo" pede DOIS na prateleira', () => {
    const c = crianca('cleanup')
    c.tempo(0.5)
    expect(c.estado.crowd.born - c.estado.crowd.removed - sceneCactiOnScreen(c.estado.crowd)).toBe(
      1,
    )
    expect(c.viu('invisible-stored')).toBe(false)
    c.tempo(1)
    expect(c.viu('invisible-stored')).toBe(true)
  })

  test('com a regra, quem estava na prateleira vai para os removidos', () => {
    const c = crianca('cleanup')
    c.tempo(1.5).faz({ type: 'connect', port: 'cleanup', enabled: true }).tempo(0.1)
    expect(c.viu('removed')).toBe(true)
    expect(c.estado.crowd.born - c.estado.crowd.removed).toBe(sceneCactiOnScreen(c.estado.crowd))
    expect(sceneReadout('cleanup', c.estado).map((r) => r.label)).toEqual([
      'na tela',
      'no grupo',
      'remover quem sai',
    ])
  })
})

describe('game-state: Criar cacto dentro de Se jogando', () => {
  test('⚠️⚠️ "nada nasceu" pede 2 s de espera, e não um passo', () => {
    const c = crianca('game-state')
    c.tempo(1).faz({ type: 'connect', port: 'condition', enabled: true })
    c.tempo(1.5)
    expect(c.viu('waiting')).toBe(false)
    c.tempo(0.5)
    expect(c.viu('waiting')).toBe(true)
  })

  test('⚠️ a troca da peça e a volta ao início limpam a tela de início', () => {
    const c = crianca('game-state')
    c.tempo(2)
    expect(c.estado.crowd.cacti.length).toBeGreaterThan(0)
    c.faz({ type: 'connect', port: 'condition', enabled: true })
    expect(c.estado.crowd.cacti).toEqual([])
    c.faz({ type: 'start', input: 'tap' }).tempo(1.3)
    expect(c.viu('playing')).toBe(true)
    c.faz({ type: 'home' })
    expect(c.estado.crowd.cacti).toEqual([])
    expect(c.estado.crowd.born).toBe(0)
  })
})

describe('controls: os selos das tentativas', () => {
  test('tocar sem a peça no toque deixa o selo âmbar, e o Enter começa sempre', () => {
    const c = crianca('controls')
    c.faz({ type: 'start', input: 'tap' })
    expect(c.estado.match.tries).toEqual([{ input: 'tap', began: false }])
    expect(c.estado.caption).toBe('Você tocou, e nada aconteceu.')
    c.faz({ type: 'start', input: 'key' })
    expect(c.viu('start-key')).toBe(true)
    expect(c.estado.match.tries.at(-1)).toEqual({ input: 'key', began: true })
  })

  test('⚠️ as tentativas têm corte no motor', () => {
    const c = crianca('controls')
    for (let i = 0; i < START_TRIES_MAX + 3; i++) c.faz({ type: 'start', input: 'tap' })
    expect(c.estado.match.tries).toHaveLength(START_TRIES_MAX)
    expect(isSceneState(c.estado)).toBe(true)
  })
})
