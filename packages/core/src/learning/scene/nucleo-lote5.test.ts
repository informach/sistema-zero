import { describe, expect, test } from 'bun:test'
import { isSceneAction, type SceneAction, type SceneId, type SceneSetup } from './actions'
import { openScene, stepScene } from './engine'
import {
  AIM_ORIGIN,
  CONTACT_HEARTS,
  COOLDOWN_SHOT,
  cameraWindow,
  ENEMY_MAX_CACTI,
  enemyOnScreen,
  HOLD_LANE,
  HUNT_BASE,
  holdLaneNext,
  huntDistances,
  rechargeWords,
  tilemapCoinRow,
  tilemapLanding,
} from './nucleo'
import { sceneReadout, sceneSituation } from './readout'
import { hydrateSceneState, isSceneState, type SceneState } from './state'

/**
 * O redesenho do NÚCLEO do Iniciante 2D (lote 5 do Raio-X, G5, 16/09/2026): `hold-vs-press`,
 * `group-loop`, `enemy-type`, `camera`, `contact`, `cooldown`, `aim`, `diagonal` e `tilemap`.
 *
 * ⚠️ A régua é a da casa: a meta só cai quando a criança VIU o que ela afirma. Cada `describe` cobra o
 * gesto que derruba a meta e o meio gesto que NÃO derruba. O pedido seguido ao pé da letra mora em
 * `pedidos-no-motor.test.ts`; os números do relógio, em `clock.test.ts`.
 */

const FATIA = 0.05

function crianca(scene: SceneId, setup?: SceneSetup) {
  const start = setup ? { scene, setup } : { scene }
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
  }
  return api
}

const afunda: SceneAction = { type: 'hold', on: true }
const solta: SceneAction = { type: 'hold', on: false }
const ligar = (port: string, enabled = true) => ({ type: 'connect', port, enabled }) as SceneAction

describe('hold-vs-press: uma tecla, duas raquetes', () => {
  test('⭐ afundar a tecla move as DUAS: a de cima dá um passo, a de baixo anda enquanto dura', () => {
    const c = crianca('hold-vs-press').faz(afunda)
    expect(c.estado.input.pressSteps).toBe(1)
    expect(c.estado.input.pressX).toBe(HOLD_LANE.start + HOLD_LANE.step)
    expect(c.estado.input.holdSteps).toBe(0)
    c.tempo(1)
    // 1 s a 4 por segundo: quatro passos da de baixo, e a de cima parada no primeiro.
    expect(c.estado.input.holdSteps).toBe(4)
    expect(c.estado.input.pressSteps).toBe(1)
    expect(c.estado.input.pressX).toBe(HOLD_LANE.start + HOLD_LANE.step)
    // Os fantasmas marcam onde as duas estavam quando a tecla afundou.
    expect(c.estado.input.pressFrom).toBe(HOLD_LANE.start)
    expect(c.estado.input.holdFrom).toBe(HOLD_LANE.start)
  })

  test('⚠️⚠️ a repetição do teclado (afundar de novo o que já está afundado) não é outro aperto', () => {
    const c = crianca('hold-vs-press').faz(afunda, afunda, afunda)
    expect(c.estado.input.presses).toBe(1)
    expect(c.estado.input.pressSteps).toBe(1)
  })

  test('⚠️ o toque rápido cai só SOLTANDO, e uma segurada longa não é toque', () => {
    const toque = crianca('hold-vs-press').faz(afunda)
    expect(toque.viu('one-step')).toBe(false)
    toque.faz(solta)
    expect(toque.viu('one-step')).toBe(true)

    const longa = crianca('hold-vs-press').faz(afunda).tempo(2).faz(solta)
    expect(longa.viu('one-step')).toBe(false)
    expect(longa.viu('apart')).toBe(true)
  })

  test('⚠️⚠️ "não parou de andar" pede TRÊS quadros; num só as duas estão no mesmo passo', () => {
    const c = crianca('hold-vs-press').faz(afunda).tempo(0.5)
    expect(c.estado.input.holdSteps).toBe(2)
    expect(c.viu('while-held')).toBe(false)
    c.tempo(0.25)
    expect(c.viu('while-held')).toBe(true)
  })

  test('⚠️ "a de cima deu um passo só" pede 1 s de segurada e o gesto inteiro (soltar)', () => {
    const curta = crianca('hold-vs-press').faz(afunda).tempo(0.75).faz(solta)
    expect(curta.viu('apart')).toBe(false)
    const segurando = crianca('hold-vs-press').faz(afunda).tempo(3)
    expect(segurando.viu('apart')).toBe(false)
  })

  test('⚠️⚠️ a raquete que chega no fim da pista VOLTA ao começo: segurar de novo sempre anda', () => {
    const ultimo = HOLD_LANE.start + (HOLD_LANE.places - 1) * HOLD_LANE.step
    expect(holdLaneNext(ultimo)).toBe(HOLD_LANE.start)
    // Um retrato antigo tinha a raquete em 440 (de 10 em 10): ela entra na grade.
    expect(holdLaneNext(440)).toBe(HOLD_LANE.start)
    const c = crianca('hold-vs-press').faz(afunda).tempo(10).faz(solta).faz(afunda).tempo(1)
    expect(c.estado.input.holdSteps).toBe(4)
    expect(isSceneState(c.estado)).toBe(true)
  })

  test('a faixa conta os PASSOS desta vez, e a abertura não diz nada das raquetes', () => {
    expect(sceneSituation('hold-vs-press', openScene({ scene: 'hold-vs-press' }))).toBe(
      'A tecla está solta. Nenhuma raquete anda agora.',
    )
    const c = crianca('hold-vs-press').faz(afunda).tempo(0.75)
    expect(sceneReadout('hold-vs-press', c.estado).map((l) => l.value)).toEqual([
      '1 passo',
      '3 passos',
      'segurada',
    ])
  })
})

describe('group-loop: medir cada cacto, e o laço que mede de novo', () => {
  test('⚠️⚠️ as distâncias abrem PARECIDAS, e o mais perto é o do meio', () => {
    const { distances } = openScene({ scene: 'group-loop' }).hunt
    expect(distances).toEqual([...HUNT_BASE])
    expect(Math.max(...distances) - Math.min(...distances)).toBeLessThanOrEqual(15)
    expect(distances.indexOf(Math.min(...distances))).toBe(1)
  })

  test('⚠️⚠️ ligar o laço NÃO é a descoberta; ela é a escolha trocar sozinha com o tempo', () => {
    const c = crianca('group-loop').faz(ligar('loop'))
    expect(c.estado.hunt.chosen).toBe(2)
    expect(c.viu('auto')).toBe(false)
    // Parado, nada muda: o laço mede os mesmos números.
    c.faz(ligar('loop', false), ligar('loop'))
    expect(c.viu('auto')).toBe(false)
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): da fase 0 o 2º segue o mais perto
    // por 1,6 s (o 1º caía em 0,12 s), e a troca só conta depois de 1 s de laço ligado.
    c.tempo(1)
    expect(c.viu('auto')).toBe(false)
    c.tempo(1)
    expect(c.viu('auto')).toBe(true)
  })

  test('⚠️⚠️ de QUALQUER momento do vaivém, 3 s com o laço bastam (o pedido diz "por 3 segundos")', () => {
    for (let fase = 0; fase <= 120; fase += 7) {
      const c = crianca('group-loop')
        .tempo(fase / 10)
        .faz(ligar('loop'))
        .tempo(3)
      expect(c.viu('auto'), `fase ${fase}`).toBe(true)
    }
  })

  test('o relógio mexe nos cactos, e o número medido é o de AGORA', () => {
    const c = crianca('group-loop').faz({ type: 'look', id: 1 }).tempo(1)
    expect(c.estado.hunt.distances).toEqual(huntDistances(10, 10))
    expect(c.estado.hunt.distances).not.toEqual([...HUNT_BASE])
  })

  test('⚠️ escolher sem medir é aceito, marcado, e a frase diz quem ficou sem medir', () => {
    const c = crianca('group-loop').faz({ type: 'look', id: 2 }, { type: 'choose', id: 2 })
    expect(c.estado.hunt.blind).toBe(true)
    expect(c.estado.caption).toBe('Você escolheu o 2º sem medir o 1º e o 3º.')
    expect(c.viu('nearest')).toBe(false)
    c.faz({ type: 'look', id: 1 }, { type: 'look', id: 3 }, { type: 'choose', id: 2 })
    expect(c.estado.hunt.blind).toBe(false)
    expect(c.estado.caption).toBe('O 2º é o mais perto dos três.')
    expect(c.viu('nearest')).toBe(true)
  })
})

describe('enemy-type: a ficha lida sempre × a cópia ao nascer', () => {
  test('⭐ os cactos ANDAM com a velocidade da ficha e reaparecem à direita', () => {
    const c = crianca('enemy-type').faz({ type: 'spawnOne' })
    expect(c.estado.blueprint.cacti[0]?.x).toBe(430)
    c.tempo(1)
    // Velocidade 3 = 60 por segundo.
    expect(c.estado.blueprint.cacti[0]?.x).toBe(370)
    c.tempo(10)
    expect(isSceneState(c.estado)).toBe(true)
    expect(c.estado.blueprint.cacti[0]?.x).toBeGreaterThan(-60)
  })

  test('⚠️ nascer com o relógio parado não empilha: cada um fica ao lado do outro', () => {
    const c = crianca('enemy-type').faz(
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'spawnOne' },
    )
    const xs = c.estado.blueprint.cacti.map((k) => k.x)
    expect(new Set(xs).size).toBe(3)
    expect(xs.every(enemyOnScreen)).toBe(true)
  })

  test('⚠️ a pista tem teto: o motor não empilha cactos além dele', () => {
    const c = crianca('enemy-type')
    for (let i = 0; i < ENEMY_MAX_CACTI + 3; i++) c.faz({ type: 'spawnOne' })
    expect(c.estado.blueprint.cacti).toHaveLength(ENEMY_MAX_CACTI)
    expect(isSceneState(c.estado)).toBe(true)
  })

  test('⚠️⚠️ "todos mudaram" pede o QUADRO depois da mudança, com dois cactos que já andavam', () => {
    const um = crianca('enemy-type')
      .faz({ type: 'spawnOne' }, { type: 'define', field: 'speed', value: 7 })
      .tempo(1)
    expect(um.viu('all-change')).toBe(false)
    const dois = crianca('enemy-type').faz(
      { type: 'spawnOne' },
      { type: 'spawnOne' },
      { type: 'define', field: 'speed', value: 7 },
    )
    expect(dois.viu('all-change')).toBe(false)
    dois.tempo(0.1)
    expect(dois.viu('all-change')).toBe(true)
    // E os dois andaram com o número NOVO nesse quadro (7 × 2 = 14).
    expect(dois.estado.blueprint.cacti.map((k) => k.x)).toEqual([430 - 14, 370 - 14])
  })

  test('⚠️ nascer DEPOIS de mudar a ficha não é "os que já andavam mudaram"', () => {
    const c = crianca('enemy-type').faz(
      { type: 'define', field: 'speed', value: 7 },
      { type: 'spawnOne' },
      { type: 'spawnOne' },
    )
    c.tempo(1)
    expect(c.viu('all-change')).toBe(false)
  })

  test('⭐⭐ copiando ao nascer, o antigo guarda o número e o novo nasce com o número novo', () => {
    const c = crianca('enemy-type')
      .faz({ type: 'spawnOne' }, { type: 'spawnOne' })
      .faz(ligar('copy'), { type: 'define', field: 'speed', value: 9 })
      .tempo(1)
    // Os antigos continuam em 3 (60 por segundo), e a ficha diz 9.
    expect(c.estado.blueprint.cacti.map((k) => k.speed)).toEqual([3, 3])
    expect(c.viu('copied')).toBe(false)
    c.faz({ type: 'spawnOne' }).tempo(0.1)
    expect(c.estado.blueprint.cacti.at(-1)?.speed).toBe(9)
    expect(c.viu('copied')).toBe(true)
    // Com a cópia, a ficha mudada não fecha "todos mudaram juntos".
    expect(c.viu('all-change')).toBe(false)
  })

  test('⚠️ ligar a cópia não faz os antigos pularem para um número velho', () => {
    const c = crianca('enemy-type')
      .faz({ type: 'spawnOne' }, { type: 'define', field: 'speed', value: 8 })
      .faz(ligar('copy'))
    expect(c.estado.blueprint.cacti[0]?.speed).toBe(8)
  })
})

describe('camera: a janela anda com a câmera', () => {
  test('⚠️⚠️ "o cenário passou" pede a JANELA mudar de lugar com a câmera seguindo', () => {
    const c = crianca('camera').faz({ type: 'walk', x: 700 }, ligar('camera'))
    expect(c.viu('follows')).toBe(true)
    expect(c.viu('window')).toBe(false)
    c.faz({ type: 'walk', x: 740 })
    expect(c.viu('window')).toBe(true)
  })

  test('⚠️ com o Dino no começo do mundo a janela não anda, e a meta não cai', () => {
    const c = crianca('camera')
      .faz({ type: 'walk', x: 700 }, { type: 'walk', x: 100 }, ligar('camera'))
      .faz({ type: 'walk', x: 140 })
    expect(cameraWindow(140, true)).toBe(0)
    expect(c.viu('window')).toBe(false)
  })

  test('⚠️ "voltou para a tela" pede o Dino FORA da tela parada no instante de ligar', () => {
    const c = crianca('camera').faz(
      { type: 'walk', x: 700 },
      { type: 'walk', x: 300 },
      ligar('camera'),
    )
    expect(c.viu('lost')).toBe(true)
    expect(c.viu('follows')).toBe(false)
  })

  test('a faixa e a frase dizem o pedaço que a tela mostra, com a mesma conta do palco', () => {
    const c = crianca('camera').faz({ type: 'walk', x: 700 }, ligar('camera'))
    expect(sceneReadout('camera', c.estado)[1]?.value).toBe('460 a 940')
    expect(sceneSituation('camera', c.estado)).toBe(
      'A tela mostra do 460 ao 940, com o Dino no meio.',
    )
    // ⚠️ Sem alerta na abertura: a câmera parada não é "o problema" embaixo da previsão.
    expect(
      sceneReadout('camera', openScene({ scene: 'camera' })).some((l) => l.tone === 'alert'),
    ).toBe(false)
  })
})

describe('contact: as duas regras ao mesmo tempo', () => {
  test('⚠️⚠️ encosta quando os DESENHOS se tocam: 0 encosta, 5 não', () => {
    const perto = crianca('contact').faz({ type: 'approach', distance: 5 }).tempo(1)
    expect(perto.estado.hit.top).toBe(CONTACT_HEARTS)
    const junto = crianca('contact').faz({ type: 'approach', distance: 0 }).tempo(0.25)
    expect(junto.estado.hit.top).toBe(CONTACT_HEARTS - 1)
    expect(junto.estado.hit.bottom).toBe(CONTACT_HEARTS - 1)
  })

  test('⭐⭐ "tirou em todo quadro" e "tirou um só" caem no MESMO terceiro quadro, lado a lado', () => {
    const c = crianca('contact').faz({ type: 'approach', distance: 0 }).tempo(0.5)
    expect(c.viu('drain')).toBe(false)
    expect(c.viu('once')).toBe(false)
    c.tempo(0.25)
    expect(c.viu('drain')).toBe(true)
    expect(c.viu('once')).toBe(true)
    expect(c.estado.hit.top).toBe(CONTACT_HEARTS - 3)
    expect(c.estado.hit.bottom).toBe(CONTACT_HEARTS - 1)
  })

  test('⚠️⚠️ a pista sem coração recomeça ao afastar: encostadas curtas nunca deixam a meta impossível', () => {
    const c = crianca('contact')
    for (let i = 0; i < 6; i++)
      c.faz({ type: 'approach', distance: 0 })
        .tempo(0.5)
        .faz({ type: 'approach', distance: 100 })
        .tempo(0.25)
    expect(c.viu('drain')).toBe(false)
    c.faz({ type: 'approach', distance: 0 }).tempo(1)
    expect(c.viu('drain')).toBe(true)
  })

  test('⚠️ a pergunta antiga (`mode`) continua legal e não zera nada', () => {
    const c = crianca('contact').faz({ type: 'approach', distance: 0 }).tempo(0.5)
    const antes = c.estado.hit
    c.faz({ type: 'mode', kind: 'event' })
    expect(c.estado.hit.top).toBe(antes.top)
    expect(c.estado.hit.bottom).toBe(antes.bottom)
  })

  test('a frase diz há quanto tempo estão encostados, com o nome colado ao verbo', () => {
    const c = crianca('contact').faz({ type: 'approach', distance: 0 }).tempo(0.75)
    expect(sceneSituation('contact', c.estado)).toBe(
      'O cacto está encostando no Dino há 3 quadros.',
    )
    expect(sceneSituation('contact', openScene({ scene: 'contact' }))).toBe(
      'O cacto está longe do Dino.',
    )
  })
})

describe('cooldown: os tiros voam', () => {
  test('⭐⭐ sem recarga os tiros saem COLADOS; com recarga aparece o vão', () => {
    const colados = crianca('cooldown').faz({ type: 'shoot' }, { type: 'shoot' }, { type: 'shoot' })
    expect(colados.estado.weapon.bullets).toEqual([0, COOLDOWN_SHOT.glued, COOLDOWN_SHOT.glued * 2])
    const vao = crianca('cooldown')
      .faz({ type: 'recharge', seconds: 1 }, { type: 'shoot' })
      .tempo(1)
      .faz({ type: 'shoot' })
    expect(vao.estado.weapon.bullets).toEqual([0, COOLDOWN_SHOT.speed])
    expect(vao.viu('spaced')).toBe(true)
  })

  test('⚠️⚠️ "saíram colados" cai no TERCEIRO tiro, sem depender do relógio, e só dentro de 1 s', () => {
    const tres = crianca('cooldown').faz({ type: 'shoot' }, { type: 'shoot' })
    expect(tres.viu('burst')).toBe(false)
    tres.faz({ type: 'shoot' })
    expect(tres.viu('burst')).toBe(true)
    const espalhados = crianca('cooldown')
      .faz({ type: 'shoot' })
      .tempo(0.6)
      .faz({ type: 'shoot' })
      .tempo(0.6)
      .faz({ type: 'shoot' })
    expect(espalhados.viu('burst')).toBe(false)
  })

  test('⚠️ o vão só conta com o tiro anterior À VISTA: um que já saiu da tela não mostra vão', () => {
    const c = crianca('cooldown')
      .faz({ type: 'recharge', seconds: 0.5 }, { type: 'shoot' })
      // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): o tiro anda 100 por segundo e
      // leva 4,4 s para sair da tela (era 2,9 s).
      .tempo(5)
    expect(c.estado.weapon.bullets).toEqual([])
    c.faz({ type: 'shoot' })
    expect(c.viu('spaced')).toBe(false)
  })

  test('⚠️ mexer na recarga não apaga os tiros que estão voando', () => {
    const c = crianca('cooldown')
      .faz({ type: 'shoot' })
      .tempo(0.3)
      .faz({ type: 'recharge', seconds: 2 })
    expect(c.estado.weapon.bullets).toEqual([COOLDOWN_SHOT.speed * 0.3])
  })

  test('⚠️⚠️ o aperto recusado não vira FILA: nenhum tiro sai depois, e a frase não diz "na espera"', () => {
    const c = crianca('cooldown').faz(
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
    )
    expect(c.estado.weapon.refusedAt).toBe(0)
    c.tempo(2)
    expect(c.estado.weapon.shots).toBe(1)
    expect(sceneSituation('cooldown', c.estado)).not.toContain('espera')
    expect(rechargeWords(0.5)).toBe('meio segundo')
    expect(rechargeWords(1.5)).toBe('1 segundo e meio')
  })
})

describe('aim: o tiro que voa pela seta ou reto', () => {
  test('⭐⭐ sem a mira o tiro vai reto e passa longe do alvo lá embaixo', () => {
    const c = crianca('aim').faz({ type: 'shoot' })
    expect(c.estado.sight.flying).toBe(true)
    expect(c.viu('straight-miss')).toBe(false)
    c.tempo(0.5)
    expect(c.estado.sight.bulletY).toBe(AIM_ORIGIN.y)
    c.tempo(0.5)
    expect(c.estado.sight.result).toBe('errou')
    expect(c.viu('straight-miss')).toBe(true)
    expect(c.viu('follows')).toBe(false)
  })

  test('⚠️ sem a mira, com o alvo NA FRENTE, o tiro reto acerta: não é "reto e errou"', () => {
    const c = crianca('aim')
      .faz({ type: 'target', x: 400, y: AIM_ORIGIN.y }, { type: 'shoot' })
      .tempo(1)
    expect(c.estado.sight.result).toBe('acertou')
    expect(c.viu('straight-miss')).toBe(false)
    expect(c.viu('follows')).toBe(false)
  })

  test('⚠️⚠️ com a mira, "foi pela seta e acertou" cai no ACERTO, e não no disparo', () => {
    const c = crianca('aim').faz(ligar('aim'), { type: 'shoot' })
    expect(c.viu('follows')).toBe(false)
    c.tempo(1)
    expect(c.estado.sight.result).toBe('acertou')
    expect(c.viu('follows')).toBe(true)
  })

  test('⚠️ desligar a mira com o tiro no ar não desvia o tiro', () => {
    const c = crianca('aim')
      .faz(ligar('aim'), { type: 'shoot' })
      .tempo(0.1)
      .faz(ligar('aim', false))
      .tempo(1)
    expect(c.estado.sight.result).toBe('acertou')
    expect(c.viu('follows')).toBe(true)
  })

  test('⚠️ o alvo ATRÁS do Dino é um lugar de verdade: a mira atira para trás e acerta', () => {
    const c = crianca('aim')
      .faz({ type: 'target', x: 20, y: AIM_ORIGIN.y }, ligar('aim'), { type: 'shoot' })
      .tempo(1)
    expect(c.estado.sight.result).toBe('acertou')
  })

  test('⚠️ o acerto é conferido no TRECHO: um alvo entre dois quadros não é atravessado', () => {
    // A 30 por quadro, o tiro reto passa por x 255 e 285: o alvo em 270 fica entre os dois.
    const c = crianca('aim')
      .faz({ type: 'target', x: 270, y: AIM_ORIGIN.y }, { type: 'shoot' })
      .tempo(1)
    expect(c.estado.sight.result).toBe('acertou')
  })
})

describe('diagonal: andar 1 segundo', () => {
  test('⚠️⚠️ sem relógio: o `advance` é recusado e "Andar 1 segundo" é o gesto', () => {
    expect(isSceneAction({ type: 'advance', seconds: 1 }, 'diagonal')).toBe(false)
    expect(isSceneAction({ type: 'stride' }, 'diagonal')).toBe(true)
    expect(isSceneAction({ type: 'stride' }, 'velocity')).toBe(false)
  })

  test('⭐ reto 60, diagonal 84,85, diagonal corrigida 60: o mesmo em qualquer ordem', () => {
    const c = crianca('diagonal').faz({ type: 'direction', x: 0, y: -1 }, { type: 'stride' })
    expect(c.estado.walkPad).toMatchObject({ x: 0, y: -60, distance: 60, last: 'reto' })
    c.faz({ type: 'direction', x: -1, y: 1 }, { type: 'stride' })
    expect(c.estado.walkPad).toMatchObject({ x: -60, y: 60, distance: 84.85, last: 'diagonal' })
    c.faz(ligar('even'), { type: 'stride' })
    expect(c.estado.walkPad).toMatchObject({ distance: 60, last: 'corrigida' })
    expect(c.estado.walkPad.ghosts.map((g) => g.kind)).toEqual(['reto', 'diagonal', 'corrigida'])
    expect(isSceneState(c.estado)).toBe(true)
  })

  test('⚠️⚠️ "passou do círculo" pede o fantasma de uma andada RETA para comparar', () => {
    const semReto = crianca('diagonal').faz({ type: 'direction', x: 1, y: 1 }, { type: 'stride' })
    expect(semReto.viu('faster')).toBe(false)
    semReto.faz({ type: 'direction', x: 1, y: 0 }, { type: 'stride' })
    semReto.faz({ type: 'direction', x: 1, y: 1 }, { type: 'stride' })
    expect(semReto.viu('faster')).toBe(true)
  })

  test('⚠️⚠️ "a correção parou no círculo" pede o fantasma da diagonal SEM correção', () => {
    const c = crianca('diagonal').faz(
      ligar('even'),
      { type: 'direction', x: 1, y: 1 },
      { type: 'stride' },
    )
    expect(c.viu('same')).toBe(false)
  })

  test('⚠️ recomeçar apaga os fantasmas: a comparação volta a pedir as duas andadas', () => {
    const c = crianca('diagonal').faz(
      { type: 'direction', x: 1, y: 0 },
      { type: 'stride' },
      { type: 'reset' },
    )
    expect(c.estado.walkPad.ghosts).toEqual([])
    c.faz({ type: 'direction', x: 1, y: 1 }, { type: 'stride' })
    expect(c.viu('faster')).toBe(false)
  })

  test('⚠️ sem seta apertada o Dino não sai do lugar, e a frase diz isso', () => {
    const c = crianca('diagonal').faz({ type: 'stride' })
    expect(c.estado.walkPad.strides).toBe(0)
    expect(c.estado.caption).toBe('Nenhuma seta apertada: o Dino não saiu do lugar.')
  })
})

describe('tilemap: letras que viram peças', () => {
  test('⚠️⚠️ "a mesma peça" pede DUAS LINHAS; apagar com "." não conta', () => {
    const apagou = crianca('tilemap').faz(
      { type: 'paint-tile', row: 5, col: 1, tile: '.' },
      { type: 'paint-tile', row: 5, col: 2, tile: '.' },
    )
    expect(apagou.viu('same-letter')).toBe(false)
    const mesmaLinha = crianca('tilemap').faz(
      { type: 'paint-tile', row: 2, col: 1, tile: '#' },
      { type: 'paint-tile', row: 2, col: 2, tile: '#' },
    )
    expect(mesmaLinha.viu('same-letter')).toBe(false)
    mesmaLinha.faz({ type: 'paint-tile', row: 4, col: 2, tile: '#' })
    expect(mesmaLinha.viu('same-letter')).toBe(true)
  })

  test('⭐⭐ "...ooo...." numa linha do meio fecha as moedas, e não fecha "a mesma peça" junto', () => {
    const c = crianca('tilemap').faz(
      { type: 'paint-tile', row: 2, col: 3, tile: 'o' },
      { type: 'paint-tile', row: 2, col: 4, tile: 'o' },
    )
    expect(c.viu('coin-row')).toBe(false)
    c.faz({ type: 'paint-tile', row: 2, col: 5, tile: 'o' })
    expect(c.viu('coin-row')).toBe(true)
    expect(c.viu('same-letter')).toBe(false)
    expect(tilemapCoinRow(c.estado.grid.rows)).toBe(2)
  })

  test('⚠️ três moedas no CHÃO (a última linha) não são "no ar", e separadas não são seguidas', () => {
    const chao = crianca('tilemap').faz(
      { type: 'paint-tile', row: 5, col: 0, tile: 'o' },
      { type: 'paint-tile', row: 5, col: 1, tile: 'o' },
      { type: 'paint-tile', row: 5, col: 2, tile: 'o' },
    )
    expect(chao.viu('coin-row')).toBe(false)
    const separadas = crianca('tilemap').faz(
      { type: 'paint-tile', row: 1, col: 0, tile: 'o' },
      { type: 'paint-tile', row: 1, col: 2, tile: 'o' },
      { type: 'paint-tile', row: 1, col: 4, tile: 'o' },
    )
    expect(separadas.viu('coin-row')).toBe(false)
  })

  test('⚠️⚠️ as marcas NÃO crescem com o mapa: o retrato continua legível', () => {
    const c = crianca('tilemap')
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 10; col++)
        c.faz({ type: 'paint-tile', row, col, tile: (row + col) % 2 ? 'o' : '#' })
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): a marca é da CASA, então o teto é
    // uma por casa do mapa (60), e não mais duas peças por linha.
    expect(c.estado.grid.marks.length).toBeLessThanOrEqual(60)
    expect(isSceneState(c.estado)).toBe(true)
  })

  test('o Dino pousa no primeiro bloco da coluna dele, e a casa escrita fica marcada', () => {
    const c = crianca('tilemap')
    expect(tilemapLanding(c.estado.grid.rows)).toBe(5)
    c.faz({ type: 'paint-tile', row: 2, col: 2, tile: '#' })
    expect(tilemapLanding(c.estado.grid.rows)).toBe(2)
    expect([c.estado.grid.lastRow, c.estado.grid.lastCol]).toEqual([2, 2])
    c.faz(
      { type: 'paint-tile', row: 2, col: 2, tile: '.' },
      { type: 'paint-tile', row: 5, col: 2, tile: '.' },
    )
    expect(tilemapLanding(c.estado.grid.rows)).toBeNull()
  })
})

describe('⚠️⚠️ o CASO não pré-semeia a memória do gesto no núcleo', () => {
  test('passos, corações, tiros, fantasmas e marcas começam vazios', () => {
    const tecla = crianca('hold-vs-press', { actions: [afunda, { type: 'advance', seconds: 2 }] })
    expect(tecla.estado.input).toMatchObject({ pressSteps: 0, holdSteps: 0 })
    const encosto = crianca('contact', {
      actions: [
        { type: 'approach', distance: 0 },
        { type: 'advance', seconds: 2 },
      ],
    })
    expect(encosto.estado.hit).toMatchObject({
      top: CONTACT_HEARTS,
      bottom: CONTACT_HEARTS,
      touches: 0,
    })
    const arma = crianca('cooldown', { actions: [{ type: 'shoot' }, { type: 'shoot' }] })
    expect(arma.estado.weapon).toMatchObject({ bullets: [], shotTimes: [], refusedAt: -1 })
    arma.faz({ type: 'shoot' })
    expect(arma.viu('burst')).toBe(false)
    const andada = crianca('diagonal', {
      actions: [{ type: 'direction', x: 1, y: 0 }, { type: 'stride' }],
    })
    expect(andada.estado.walkPad.ghosts).toEqual([])
    const mapa = crianca('tilemap', {
      actions: [{ type: 'paint-tile', row: 1, col: 1, tile: '#' }],
    })
    expect(mapa.estado.grid.marks).toEqual([])
    mapa.faz({ type: 'paint-tile', row: 3, col: 1, tile: '#' })
    expect(mapa.viu('same-letter')).toBe(false)
  })
})

describe('retratos guardados antes do lote 5 do núcleo abrem', () => {
  test('⚠️⚠️ os campos novos são completados campo a campo', () => {
    const antigo = JSON.parse(JSON.stringify(openScene({ scene: 'contact' })))
    for (const campo of ['pressFrom', 'holdFrom', 'pressSteps', 'holdSteps'])
      delete antigo.input[campo]
    delete antigo.hunt.blind
    for (const campo of ['cacti', 'copy', 'ticks', 'seq', 'editSeq', 'pending'])
      delete antigo.blueprint[campo]
    for (const campo of ['top', 'bottom', 'frames', 'topTouch', 'bottomTouch', 'touches'])
      delete antigo.hit[campo]
    for (const campo of ['time', 'bullets', 'shotTimes', 'refusedAt']) delete antigo.weapon[campo]
    for (const campo of ['flying', 'bulletX', 'bulletY', 'bulletVX', 'bulletVY', 'aimed', 'result'])
      delete antigo.sight[campo]
    for (const campo of ['x', 'y', 'last', 'ghosts', 'strides']) delete antigo.walkPad[campo]
    for (const campo of ['marks', 'lastRow', 'lastCol']) delete antigo.grid[campo]
    // A raquete de antes andava de 10 em 10 até 440, e o alvo morava em 360, 80.
    antigo.input.holdX = 440
    antigo.sight.targetX = 360
    antigo.sight.targetY = 80
    expect(isSceneState(antigo)).toBe(false)
    const hidratado = hydrateSceneState(antigo) as SceneState
    expect(isSceneState(hidratado)).toBe(true)
    expect(hidratado.hit).toMatchObject({ top: CONTACT_HEARTS, bottom: CONTACT_HEARTS })
    expect(hidratado.sight).toMatchObject({
      targetX: 360,
      targetY: 80,
      flying: false,
      result: 'nada',
    })
    // E a raquete de 440 entra na grade (430, o último lugar), que é onde o fantasma dela fica.
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): afundar a tecla leva as duas
    // raquetes ao começo da pista, e no quadro seguinte a de baixo dá o primeiro passo.
    const depois = stepScene({ scene: 'hold-vs-press' }, hidratado, afunda)
    expect(isSceneState(depois)).toBe(true)
    expect(depois.input.holdFrom).toBe(430)
    const quadro = stepScene({ scene: 'hold-vs-press' }, depois, { type: 'advance', seconds: 0.25 })
    expect(quadro.input.holdX).toBe(HOLD_LANE.start + HOLD_LANE.step)
  })
})
