import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId, SceneSetup } from './actions'
import { maisPerto, openScene, stepScene } from './engine'
import { sceneHint } from './evaluate'
import {
  AIM_ORIGIN,
  CONTACT_HEARTS,
  COOLDOWN_SHOT,
  ENEMY_MAX_CACTI,
  HOLD_LANE,
  HUNT_LOOP_SEEN_TICKS,
  huntDistances,
  tilemapMarkedRows,
} from './nucleo'
import { SCENE_QUESTIONS } from './questions'
import { sceneReadout, sceneSituation } from './readout'
import { isSceneState, type SceneState } from './state'

/**
 * Os consertos dos dois reviews da onda B do lote 5 do Raio-X no NÚCLEO do Iniciante 2D (16/09/2026):
 * `review-lote5-ondaB-correcao.md` (ALTO-1, MÉDIO-1, MÉDIO-2 e os BAIXOS das nove cenas) e a seção G5 de
 * `review-lote5-ondaB-experiencia.md`. Relatório: `implementacao/consertos-5b-g5.md`.
 *
 * ⚠️ Cada teste reprova sem o conserto dele: a asserção nomeia o estado que o conserto criou (a meta que
 * passou a cair, ou a que deixou de cair) e o caminho é o da criança, em fatias de 0,05 s do ▶.
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

const ligar = (port: string, enabled = true) => ({ type: 'connect', port, enabled }) as SceneAction
const nascer: SceneAction = { type: 'spawnOne' }
const medirOsTres: SceneAction[] = [
  { type: 'look', id: 1 },
  { type: 'look', id: 2 },
  { type: 'look', id: 3 },
]

describe('enemy-type: ALTO-1, a pista cheia não tranca a cópia', () => {
  test('⚠️⚠️ com 8 cactos, nascer tira o mais antigo, e `copied` cai', () => {
    const c = crianca('enemy-type')
    for (let i = 0; i < ENEMY_MAX_CACTI; i++) c.faz(nascer)
    c.faz({ type: 'define', field: 'speed', value: 7 }).tempo(0.1)
    expect(c.viu('all-change')).toBe(true)
    c.faz(ligar('copy'), { type: 'define', field: 'speed', value: 2 })
    const maisAntigo = Math.min(...c.estado.blueprint.cacti.map((k) => k.seq))
    c.faz(nascer)
    expect(c.estado.blueprint.cacti).toHaveLength(ENEMY_MAX_CACTI)
    expect(c.estado.blueprint.cacti.some((k) => k.seq === maisAntigo)).toBe(false)
    expect(c.estado.caption).toBe(
      'A pista estava cheia. Saiu o cacto que nasceu primeiro, e nasceu mais um cacto.',
    )
    c.tempo(1)
    expect(c.viu('copied')).toBe(true)
    expect(isSceneState(c.estado)).toBe(true)
  })

  test('⚠️ um caso com 8 cactos na pista deixa a criança fazer nascer três', () => {
    const c = crianca('enemy-type', { actions: Array.from({ length: 8 }, () => nascer) })
    c.faz(nascer, nascer, nascer)
    expect(c.viu('many')).toBe(true)
  })

  test('BAIXO-3: o caso com nascimentos não entrega "nasceram três" no primeiro toque', () => {
    const c = crianca('enemy-type', { actions: [nascer, nascer, nascer] })
    expect(c.estado.blueprint.born).toBe(0)
    c.faz(nascer)
    expect(c.viu('many')).toBe(false)
    c.faz(nascer, nascer)
    expect(c.viu('many')).toBe(true)
  })

  test('ALTO (experiência): a pergunta final pergunta a DIFERENÇA, e a frase diz a velocidade de cada um', () => {
    const { explain, prediction } = SCENE_QUESTIONS['enemy-type']
    expect(explain.prompt).toBe('Qual é a diferença entre ler a ficha e copiar a ficha ao nascer?')
    const certa = explain.choices.find((c) => c.id === explain.correctChoiceId)
    expect(certa?.label).toContain('Quem copiou ao nascer fica com o número de quando nasceu.')
    // MÉDIO: o palpite também volta mudando só a VIDA, e não pode afirmar "o número novo".
    expect(prediction.choices.find((c) => c.id === 'novos')?.shows).toBe(
      'Cada cacto que já andava mudou junto com a ficha, no mesmo quadro.',
    )
    const copia = crianca('enemy-type')
      .faz(nascer, nascer, ligar('copy'), { type: 'define', field: 'speed', value: 8 }, nascer)
      .tempo(0.1)
    // Da esquerda para a direita: o novo nasceu à esquerda dos dois que ocupavam a entrada.
    expect(sceneSituation('enemy-type', copia.estado)).toBe(
      '3 cactos na pista, com velocidade 8, 3 e 3.',
    )
  })
})

describe('group-loop: o laço que segue o mais perto', () => {
  test('⚠️⚠️ ALTO (experiência): no caminho natural, a escolha certa FICA e a troca vem com o tempo', () => {
    const c = crianca('group-loop').faz(...medirOsTres)
    c.faz({ type: 'choose', id: maisPerto(c.estado.hunt.distances) }, ligar('loop'))
    expect(c.estado.hunt.chosen).toBe(2)
    // Era 0,12 s: o anel pulava do 2º no primeiro quadro, e a cena concluía.
    c.tempo(1.2)
    expect(c.estado.hunt.chosen).toBe(2)
    expect(c.viu('auto')).toBe(false)
    c.tempo(1.8)
    expect(c.viu('auto')).toBe(true)
  })

  test('⚠️⚠️ uma troca no PRIMEIRO segundo de laço ligado não conta', () => {
    // Acha um instante do vaivém em que o mais perto troca logo depois de ligar.
    const fps = 10
    let fase = -1
    for (let t = 0; t < 120 && fase < 0; t++)
      for (let k = 1; k < HUNT_LOOP_SEEN_TICKS - 2; k++)
        if (maisPerto(huntDistances(t + k, fps)) !== maisPerto(huntDistances(t, fps))) {
          fase = t
          break
        }
    expect(fase).toBeGreaterThanOrEqual(0)
    const c = crianca('group-loop')
      .tempo(fase / fps)
      .faz(ligar('loop'))
    const escolhido = c.estado.hunt.chosen
    c.tempo(0.7)
    expect(c.estado.hunt.chosen).not.toBe(escolhido)
    expect(c.viu('auto')).toBe(false)
  })

  test('⚠️⚠️ MÉDIO-1: "Escolher" com o laço ligado é recusado, e não derruba `auto`', () => {
    const c = crianca('group-loop').faz(...medirOsTres, { type: 'choose', id: 2 }, ligar('loop'))
    c.tempo(1.1)
    const antes = c.estado.hunt.chosen
    c.faz({ type: 'choose', id: antes === 1 ? 3 : 1 })
    expect(c.estado.hunt.chosen).toBe(antes)
    expect(c.estado.caption).toBe('O laço está escolhendo sozinho.')
    c.tempo(0.1)
    // Um quadro depois, o mais perto é o mesmo: nada caiu.
    expect(maisPerto(c.estado.hunt.distances)).toBe(antes)
    expect(c.viu('auto')).toBe(false)
  })

  test('⚠️⚠️ MÉDIO (experiência): sem o laço, medir é uma FOTO; com o laço, as réguas são de agora', () => {
    const c = crianca('group-loop').faz(...medirOsTres)
    const foto = [...c.estado.hunt.measured]
    expect(foto).toEqual(c.estado.hunt.distances)
    c.tempo(1)
    expect(c.estado.hunt.distances).not.toEqual(foto)
    expect(c.estado.hunt.measured).toEqual(foto)
    expect(sceneSituation('group-loop', c.estado)).toContain(
      'Os cactos andaram depois de você medir.',
    )
    // A faixa mostra os TRÊS números (com "?" até medir).
    expect(sceneReadout('group-loop', openScene({ scene: 'group-loop' }))[0]?.value).toBe(
      '1º ?, 2º ?, 3º ?',
    )
    expect(sceneReadout('group-loop', c.estado)[0]?.value).toBe(
      `1º ${foto[0]}, 2º ${foto[1]}, 3º ${foto[2]}`,
    )
    c.faz(ligar('loop')).tempo(0.5)
    expect(c.estado.hunt.measured).toEqual(c.estado.hunt.distances)
  })

  test('BAIXO (experiência): escolher o que falta medir não lê como erro de digitação', () => {
    const c = crianca('group-loop').faz({ type: 'look', id: 1 }, { type: 'choose', id: 2 })
    expect(c.estado.caption).toBe('Você escolheu o 2º sem medir. Ainda falta medir o 2º e o 3º.')
  })

  test('BAIXO-5: o caso com tempo não faz as distâncias SALTAREM no primeiro quadro', () => {
    const c = crianca('group-loop', {
      actions: [ligar('loop'), { type: 'advance', seconds: 2 }],
    })
    const ticks = c.estado.hunt.ticks
    expect(ticks).toBe(20)
    expect(c.estado.hunt.distances).toEqual(huntDistances(20, 10))
    c.tempo(0.1)
    expect(c.estado.hunt.distances).toEqual(huntDistances(21, 10))
    expect(c.estado.hunt.loopTicks).toBe(1)
    expect(c.viu('auto')).toBe(false)
  })
})

describe('hold-vs-press', () => {
  test('⚠️⚠️ MÉDIO (experiência): cada aperto recomeça as raquetes, e a de baixo não termina ATRÁS', () => {
    const c = crianca('hold-vs-press')
      .faz({ type: 'hold', on: true })
      .tempo(4.5)
      .faz({ type: 'hold', on: false })
    // A segunda segurada: com as duas saindo do fim da pista, a de baixo dava a volta em meio segundo.
    c.faz({ type: 'hold', on: true })
    expect(c.estado.input.holdX).toBe(HOLD_LANE.start)
    expect(c.estado.input.pressX).toBe(HOLD_LANE.start + HOLD_LANE.step)
    c.tempo(2)
    expect(c.estado.input.holdX).toBeGreaterThan(c.estado.input.pressX)
  })

  test('BAIXO-4: o caso que deixa a tecla segurada não entrega "toque rápido" ao soltar', () => {
    const c = crianca('hold-vs-press', {
      actions: [
        { type: 'hold', on: true },
        { type: 'advance', seconds: 0.25 },
      ],
    })
    expect(c.estado.input.holding).toBe(false)
    c.faz({ type: 'hold', on: false })
    expect(c.viu('one-step')).toBe(false)
  })
})

describe('contact: ALTO (experiência), a conclusão mostra a regra', () => {
  test('⚠️⚠️ depois de um "fim de jogo" as DUAS pistas recomeçam, e `apart` cai no terceiro quadro', () => {
    const c = crianca('contact').faz({ type: 'approach', distance: 0 }).tempo(3)
    expect(c.estado.hit.top).toBe(0)
    expect(c.estado.hit.bottom).toBe(CONTACT_HEARTS - 1)
    c.faz({ type: 'approach', distance: 100 }).tempo(0.25)
    expect([c.estado.hit.top, c.estado.hit.bottom]).toEqual([CONTACT_HEARTS, CONTACT_HEARTS])
    c.faz({ type: 'approach', distance: 0 }).tempo(0.25)
    // No primeiro quadro da encostada nova a cena concluía com "embaixo 2, em cima 1".
    expect(c.viu('apart')).toBe(false)
    c.tempo(0.5)
    expect(c.viu('apart')).toBe(true)
    expect(sceneReadout('contact', c.estado).map((l) => l.value)).toEqual([
      '0',
      '3 corações a menos',
      '1 coração a menos',
    ])
  })
})

describe('cooldown: MÉDIO (experiência), o pedido de `spaced` ao pé da letra', () => {
  test('⚠️⚠️ esperar "Pronto para atirar", ler e só então apertar ainda mostra o vão', () => {
    const c = crianca('cooldown').faz({ type: 'recharge', seconds: 1 }, { type: 'shoot' })
    while (!sceneSituation('cooldown', c.estado).startsWith('Pronto para atirar.')) c.tempo(FATIA)
    // Dois segundos lendo a frase antes de apertar. Com 150 por segundo, o tiro já tinha saído.
    c.tempo(2).faz({ type: 'shoot' })
    expect(COOLDOWN_SHOT.speed * 3).toBeLessThanOrEqual(COOLDOWN_SHOT.end)
    expect(c.estado.weapon.bullets).toHaveLength(2)
    expect(c.viu('spaced')).toBe(true)
  })
})

describe('aim: BAIXO-6, o acerto no disparo não é "foi pela seta"', () => {
  test('com o alvo em cima do Dino e a mira ligada, `follows` não cai', () => {
    const c = crianca('aim').faz(
      { type: 'target', x: AIM_ORIGIN.x, y: AIM_ORIGIN.y + 10 },
      ligar('aim'),
      { type: 'shoot' },
    )
    expect(c.estado.sight.result).toBe('acertou')
    expect(c.viu('follows')).toBe(false)
    c.faz({ type: 'target', x: 120, y: 220 }, { type: 'shoot' }).tempo(1)
    expect(c.viu('follows')).toBe(true)
  })
})

describe('tilemap: BAIXO-2, só a linha escrita e só as peças que ficaram', () => {
  test('⚠️⚠️ um caso com "ooo" não fecha as moedas no primeiro "o" escrito em outra linha', () => {
    const ooo = [3, 4, 5].map(
      (col) => ({ type: 'paint-tile', row: 2, col, tile: 'o' }) as SceneAction,
    )
    const c = crianca('tilemap', { actions: ooo })
    c.faz({ type: 'paint-tile', row: 0, col: 0, tile: 'o' })
    expect(c.viu('coin-row')).toBe(false)
    c.faz(...[1, 2].map((col) => ({ type: 'paint-tile', row: 0, col, tile: 'o' }) as SceneAction))
    expect(c.viu('coin-row')).toBe(true)
  })

  test('⚠️⚠️ uma peça APAGADA não conta para "a mesma peça em duas linhas"', () => {
    const c = crianca('tilemap').faz(
      { type: 'paint-tile', row: 3, col: 4, tile: '#' },
      { type: 'paint-tile', row: 3, col: 4, tile: '.' },
      { type: 'paint-tile', row: 1, col: 4, tile: '#' },
    )
    expect(c.viu('same-letter')).toBe(false)
    c.faz({ type: 'paint-tile', row: 2, col: 7, tile: '#' })
    expect(c.viu('same-letter')).toBe(true)
  })

  test('⚠️ a marca é da CASA: o retrato com marca fora do formato é recusado', () => {
    const rows = [
      '..........',
      '..........',
      '..........',
      '...#......',
      '..........',
      '##########',
    ]
    // Só a casa que AINDA tem a peça conta; a marca de uma casa apagada some da conta.
    expect(tilemapMarkedRows(rows, ['#3:3', '#1:2'], '#')).toEqual([3])
    const cru = JSON.parse(JSON.stringify(openScene({ scene: 'tilemap' })))
    cru.grid.marks = ['#3:3', 'o1:0']
    expect(isSceneState(cru)).toBe(true)
    cru.grid.marks = ['#3']
    expect(isSceneState(cru)).toBe(false)
  })
})

describe('BAIXO-10: as pistas chegam à última meta', () => {
  const pistas = (scene: SceneId, estado: SceneState) =>
    [2, 3].map((nivel) => sceneHint(scene, estado, nivel))

  test('group-loop, enemy-type, cooldown e tilemap', () => {
    const laco = crianca('group-loop').faz(...medirOsTres, { type: 'choose', id: 2 })
    expect(pistas('group-loop', laco.estado).join(' ')).toContain('laço')

    const ficha = crianca('enemy-type')
      .faz(nascer, nascer, { type: 'define', field: 'speed', value: 7 })
      .tempo(0.1)
    expect(pistas('enemy-type', ficha.estado).join(' ')).toContain('Copiar a ficha ao nascer')
    expect(
      sceneHint('enemy-type', ficha.estado, 3, { obstacle: { name: 'pedra', gender: 'f' } }),
    ).toContain('mais uma pedra')

    const arma = crianca('cooldown').faz(
      { type: 'recharge', seconds: 1 },
      { type: 'shoot' },
      { type: 'shoot' },
    )
    expect(pistas('cooldown', arma.estado).join(' ')).toContain('Pronto para atirar')

    const mapa = crianca('tilemap').faz(
      ...[3, 4, 5].map((col) => ({ type: 'paint-tile', row: 2, col, tile: 'o' }) as SceneAction),
    )
    expect(pistas('tilemap', mapa.estado).join(' ')).toContain('outra linha')
  })
})
