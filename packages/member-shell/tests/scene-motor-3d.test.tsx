import { describe, expect, test } from 'bun:test'
import {
  DELTA_RACE,
  MESH_POINTS,
  openScene,
  type SceneAction,
  type SceneCast,
  type SceneId,
  type SceneState,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { AxisZStage, MeshStage, PickRayStage } from '../src/components/scene-3d-stages'
import { MotorSceneControls } from '../src/components/scene-motor-controls'
import {
  CircleCollisionStage,
  DeltaTimeStage,
  EntityStateStage,
  PoolStage,
} from '../src/components/scene-motor-stages'

/**
 * Os palcos e a bancada do MOTOR e da PORTA DO 3D (lote 5 do Raio-X, G6).
 *
 * ⚠️ A régua do redesenho é desenhar o invisível: o número pintado em cada cacto, a pose de cada torre,
 * uma pegada por quadro, os raios deitados, o cubo que encolhe no fundo, os pontos embaixo da pele e a
 * reta que para na primeira caixa. Cada teste confere que o que o MOTOR guardou é o que o desenho mostra.
 */

const mundo = (scene: SceneId, ...acoes: SceneAction[]): SceneState => {
  let s = openScene({ scene })
  for (const a of acoes) s = stepScene({ scene }, s, a)
  return s
}
const tempo = (segundos: number): SceneAction[] =>
  Array.from({ length: Math.round(segundos / 0.05) }, () => ({ type: 'advance', seconds: 0.05 }))
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const nada = () => {}
const NAVE: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}
const todos = (texto: string, re: RegExp) => [...texto.matchAll(re)].map((m) => m[1] ?? '')

describe('pool', () => {
  test('⭐⭐ o número PINTADO no cacto da tela é o do motor, e a pilha guarda os que saíram', () => {
    const s = mundo('pool', ...tempo(3.15))
    expect(s.nursery.created).toBe(4)
    const desenho = html(<PoolStage state={s} />)
    expect(desenho).toContain(`data-cacto-da-tela="${s.nursery.onScreen}"`)
    expect(todos(desenho, /data-saiu="(\d+)"/g)).toEqual(['1', '2', '3'])
  })

  test('⭐ reciclando, o MESMO número volta e a pilha não cresce', () => {
    const antes = mundo('pool', ...tempo(3.05), { type: 'connect', port: 'recycle', enabled: true })
    const depois = mundo(
      'pool',
      ...tempo(3.05),
      { type: 'connect', port: 'recycle', enabled: true },
      ...tempo(4),
    )
    expect(depois.nursery.created).toBe(antes.nursery.created)
    expect(todos(html(<PoolStage state={depois} />), /data-saiu="(\d+)"/g)).toEqual(
      todos(html(<PoolStage state={antes} />), /data-saiu="(\d+)"/g),
    )
  })

  test('⚠️ com muitos na pilha, os mais antigos viram "+N" e o resto cabe na caixa', () => {
    const s = mundo('pool', ...tempo(11.15))
    const desenho = html(<PoolStage state={s} />)
    const saiu = todos(desenho, /data-saiu="(\d+)"/g).map(Number)
    expect(saiu.length).toBe(7)
    expect(desenho).toContain(`+${s.nursery.created - 1 - saiu.length}`)
    // O último desenhado é o mais novo que saiu.
    expect(saiu.at(-1)).toBe(s.nursery.created - 1)
  })

  test('o elenco veste a pista: asteroide no rodapé e na descrição, sem cacto', () => {
    const desenho = html(<PoolStage state={mundo('pool', ...tempo(3.15))} cast={NAVE} />)
    expect(desenho).toContain('asteroide')
    // ⚠️ Fora o nome do atributo (`data-cacto-da-tela`), que é contrato dos testes e ninguém lê.
    expect(desenho.replaceAll('data-cacto-da-tela', '')).not.toMatch(/cacto/i)
  })
})

describe('entity-state', () => {
  test('⭐⭐ cada torre na POSE do estado dela, e com o estado no jogo um balão só ligado às três', () => {
    const s = mundo(
      'entity-state',
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'atirar' },
      { type: 'brain', id: 3, state: 'recarregar' },
    )
    const desenho = html(<EntityStateStage state={s} />)
    expect(todos(desenho, /data-torre="([a-z]+)"/g)).toEqual(['mirar', 'atirar', 'recarregar'])
    expect(desenho).toContain('data-tiro')
    expect(desenho).toContain('data-recarga')
    expect(desenho).not.toContain('data-estado-do-jogo')
    const junto = stepScene({ scene: 'entity-state' }, s, { type: 'brain-scope', shared: true })
    expect(html(<EntityStateStage state={junto} />)).toContain('data-estado-do-jogo')
  })

  test('⚠️ o alvo de cada torre cabe no palco, inclusive o da 3ª', () => {
    const s = mundo(
      'entity-state',
      { type: 'brain-scope', shared: true },
      { type: 'brain', id: 1, state: 'mirar' },
    )
    const desenho = html(<EntityStateStage state={s} />)
    const alvos = todos(desenho, /<g data-alvo="true"><circle[^>]*cx="([\d.]+)"/g).map(Number)
    expect(alvos.length).toBe(3)
    for (const cx of alvos) expect(cx + 15).toBeLessThanOrEqual(560)
  })
})

describe('delta-time', () => {
  test('⭐ uma PEGADA por quadro desenhado, e a chegada escrita quando o rápido chega', () => {
    const s = mundo('delta-time', ...tempo(3.2))
    const desenho = html(<DeltaTimeStage state={s} />)
    expect(desenho).toContain(`data-pegadas="${s.machines.fastFrames}"`)
    expect(desenho).toContain(`data-pegadas="${s.machines.slowFrames}"`)
    expect(s.machines.fastX).toBeGreaterThanOrEqual(DELTA_RACE.chegada)
    expect(desenho).toContain('chegou!')
  })
})

describe('circle-collision', () => {
  test('⭐ a fila dos raios soma os dois, e o maior caso cabe inteiro no palco', () => {
    const s = mundo(
      'circle-collision',
      { type: 'radius', which: 'a', value: 60 },
      { type: 'radius', which: 'b', value: 60 },
      { type: 'approach', distance: 200 },
    )
    const desenho = html(<CircleCollisionStage state={s} />)
    expect(desenho).toContain('data-fila="120"')
    const circulos = [
      ...desenho.matchAll(
        /<circle class="fill-scene-[ab]-wash[^"]*" cx="([\d.]+)" cy="[\d.]+" r="([\d.]+)"/g,
      ),
    ].map((m) => ({ cx: Number(m[1]), r: Number(m[2]) }))
    expect(circulos.length).toBe(2)
    for (const c of circulos) {
      expect(c.cx - c.r).toBeGreaterThanOrEqual(0)
      expect(c.cx + c.r).toBeLessThanOrEqual(560)
    }
  })
})

describe('axis-z', () => {
  const escala = (s: SceneState) =>
    Number(html(<AxisZStage state={s} />).match(/data-escala="([\d.]+)"/)?.[1])

  test('⭐⭐ o cubo ENCOLHE indo para o fundo (z negativo) e cresce vindo para a frente', () => {
    const fundo = escala(mundo('axis-z', { type: 'place3d', x: 0, y: 0, z: -100 }))
    const meio = escala(mundo('axis-z'))
    const frente = escala(mundo('axis-z', { type: 'place3d', x: 0, y: 0, z: 100 }))
    expect(fundo).toBeLessThan(meio)
    expect(meio).toBeLessThan(frente)
  })

  // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): o rótulo "fundo (z negativo)" SAIU
  // do desenho (cobria o cubo e a sombra no passo 3 do roteiro); o sentido do z mora na faixa e na bancada.
  test('⭐ a sombra está SEMPRE no chão, e o desenho não escreve o sentido do z', () => {
    const abertura = html(<AxisZStage state={mundo('axis-z')} />)
    expect(abertura).toContain('data-sombra')
    expect(abertura).not.toContain('z negativo')
    const noAr = html(
      <AxisZStage
        state={mundo(
          'axis-z',
          { type: 'place3d', x: 0, y: 0, z: -80 },
          { type: 'place3d', x: 0, y: 80, z: -80 },
        )}
      />,
    )
    expect(noAr).toContain('data-sombra')
    expect(noAr).not.toContain('z negativo')
    expect(noAr).not.toContain('data-sentido-do-z')
  })

  test('⚠️ no fundo, os eixos passam NA FRENTE do cubo; na frente, o cubo passa na frente dos eixos', () => {
    const ordem = (s: SceneState) => {
      const d = html(<AxisZStage state={s} />)
      return d.indexOf('data-cubo') < d.indexOf('data-eixo="y"') ? 'cubo-antes' : 'cubo-depois'
    }
    expect(ordem(mundo('axis-z', { type: 'place3d', x: 0, y: 0, z: -100 }))).toBe('cubo-antes')
    expect(ordem(mundo('axis-z', { type: 'place3d', x: 0, y: 0, z: 100 }))).toBe('cubo-depois')
  })
})

describe('mesh', () => {
  test('⭐⭐ "Ver os pontos" em três degraus: pele, pele transparente com os pontos, só os pontos', () => {
    const nadaDesenho = html(<MeshStage state={mundo('mesh')} />)
    expect(nadaDesenho).toContain('data-pele="nada"')
    expect(nadaDesenho).not.toContain('data-ponto')
    const metade = html(
      <MeshStage state={mundo('mesh', { type: 'see-points', level: 'metade' })} />,
    )
    expect(metade).toContain('data-pele="metade"')
    expect((metade.match(/data-ponto=/g) ?? []).length).toBe(MESH_POINTS)
    const tudo = html(<MeshStage state={mundo('mesh', { type: 'see-points', level: 'tudo' })} />)
    expect(tudo).not.toContain('data-pele')
    expect((tudo.match(/data-ponto=/g) ?? []).length).toBe(MESH_POINTS)
  })

  test('⚠️ a pele não tem bolinha: nada nela pode ser lido como um ponto aparecendo por baixo', () => {
    const desenho = html(<MeshStage state={mundo('mesh')} />)
    const pele = desenho.slice(desenho.indexOf('data-pele='))
    expect(pele).not.toContain('<circle')
    expect(pele).toContain('data-mancha')
  })
})

describe('pick-ray', () => {
  const reta = (d: string) => d.match(/data-reta="true" class="([^"]*)" d="M42 (\d+)H(\d+)"/)

  test('⭐⭐ com duas caixas no caminho, a reta de lado PARA na mais perto do olho', () => {
    const cobre = mundo('pick-ray', { type: 'point', x: 330, y: 155 })
    const desenho = html(<PickRayStage state={cobre} />)
    expect(desenho).toContain('data-vista-do-jogador')
    expect(desenho).toContain('data-vista-de-lado')
    const r = reta(desenho)
    expect(r?.[1]).toBe('stroke-scene-alert')
    // Para no começo da caixa B (a mais perto do olho, em 150 na vista de lado), antes da C e da A.
    expect(Number(r?.[3])).toBe(150)
    expect(desenho).toContain('data-caixa="B" data-acesa="true"')
  })

  test('na tela do jogador a caixa da frente é desenhada por ÚLTIMO, e sem caixa a reta vai até o fim', () => {
    const desenho = html(<PickRayStage state={mundo('pick-ray')} />)
    expect(desenho.indexOf('data-caixa="A"')).toBeLessThan(desenho.indexOf('data-caixa="B"'))
    const vazio = html(<PickRayStage state={mundo('pick-ray', { type: 'point', x: 440, y: 40 })} />)
    expect(reta(vazio)?.[1]).toBe('stroke-scene-ink')
    expect(vazio).not.toContain('data-acesa')
  })
})

describe('a bancada do motor e do 3D', () => {
  const bancada = (scene: SceneId, s: SceneState = mundo(scene)) =>
    html(<MotorSceneControls scene={scene} state={s} dispatch={nada} />)

  test('pool: a chave diz o GESTO e o estado, com aria-pressed (é liga/desliga)', () => {
    const d = bancada('pool')
    expect(d).toContain('Reciclar quem saiu')
    expect(d).toContain('aria-pressed="false"')
  })

  test('entity-state: onde o estado mora é um SELETOR (sem aria-pressed), e cada torre é uma escolha', () => {
    const d = bancada('entity-state')
    expect(d).toContain('O estado mora')
    expect(d).toContain('em cada torre')
    expect(d).not.toContain('aria-pressed')
    expect((d.match(/A \dª está/g) ?? []).length).toBe(3)
  })

  // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): "A pele: inteira · transparente · sem
  // pele" no lugar de "Ver os pontos: nada · metade · tudo", que respondia a previsão.
  test('mesh: "A pele" tem os três degraus, e o que vale é aria-current', () => {
    const d = bancada('mesh')
    expect(d).toContain('>A pele<')
    for (const nivel of ['inteira', 'transparente', 'sem pele']) expect(d).toContain(`>${nivel}<`)
    expect(d).toContain('aria-current="true"')
    expect(d).not.toContain('aria-pressed')
  })

  test('camera-3d e mesh: as voltas são contadas de 1 a 8 para quem ouve', () => {
    expect(bancada('camera-3d')).toMatch(/aria-valuetext="\d de 8"/)
    expect(bancada('mesh')).toMatch(/aria-valuetext="\d de 8"/)
  })

  test('pick-ray: os atalhos de mira existem para quem usa o teclado', () => {
    const d = bancada('pick-ray')
    for (const atalho of [
      'Mirar onde uma cobre a outra',
      'Mirar na caixa sozinha',
      'Mirar no vazio',
    ])
      expect(d).toContain(atalho)
  })

  test('delta-time e axis-z: o elenco veste o rótulo, e o sentido do z só depois de mexer nele', () => {
    const nave = html(
      <MotorSceneControls
        scene="delta-time"
        state={mundo('delta-time')}
        dispatch={nada}
        cast={NAVE}
      />,
    )
    expect(nave).toContain('A nave anda')
    // ⚠️ Mudou de propósito (consertos do review da onda B do lote 5): "negativo é o fundo".
    expect(bancada('axis-z')).not.toContain('fundo')
    expect(bancada('axis-z', mundo('axis-z', { type: 'place3d', x: 0, y: 0, z: -40 }))).toContain(
      'z (negativo é o fundo)',
    )
  })
})
