import { describe, expect, test } from 'bun:test'
import {
  openScene,
  type SceneAction,
  type SceneCast,
  type SceneId,
  type SceneSetup,
  type SceneState,
  sceneAreaWidth,
  sceneJumpLeftView,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { renderToStaticMarkup } from 'react-dom/server'
import { ExperienceScene } from '../src/components/experience-scene'
import { CoreSceneControls } from '../src/components/scene-core-controls'
import { VelocityStage } from '../src/components/scene-core-stages'
import { DinoSceneControls } from '../src/components/scene-dino-controls'
import { DinoNumbersControls } from '../src/components/scene-dino-numbers-controls'
import {
  AccelerationStage,
  RandomStage,
  RestartStage,
  ScoreStage,
} from '../src/components/scene-dino-numbers-stages'
import { GameStateStage, LayersStage } from '../src/components/scene-dino-stages'
import { DrawLoopStage } from '../src/components/scene-stages'
import { WorldStage } from '../src/components/scene-world-stage'

/**
 * Os consertos do review da onda A do lote 5 do Raio-X (16/09/2026) nos PALCOS e nas BANCADAS.
 *
 * Relatório: `community-kids/tmp/storyboard/implementacao/consertos-lote5-ondaA.md`. Cada teste reprova
 * sem o conserto dele (conferido desfazendo o conserto). O player (Conferir, "Agora é sua vez", foco,
 * voz) é conferido no kids, em `lesson-experimentation.test.tsx`.
 */

type Mundo = { scene: SceneId; setup?: SceneSetup }
const mundo = (start: Mundo, ...acoes: SceneAction[]): SceneState => {
  let s = openScene(start)
  for (const a of acoes) s = stepScene(start, s, a)
  return s
}
const tempo = (segundos: number, fatia = 0.05): SceneAction[] =>
  Array.from({ length: Math.round(segundos / fatia) }, () => ({ type: 'advance', seconds: fatia }))
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const nada = () => {}
const CACTO: SceneCast = { hero: { name: 'cacto', gender: 'm' } }
const PEDRA: SceneCast = { hero: { name: 'pedra', gender: 'f', plural: 'pedras' } }

describe('velocity: o rastro que se vê (ALTO)', () => {
  /** O caso das Aulas 5 e 12: o cacto na direita da tela, parado. */
  const AULA: Mundo = {
    scene: 'velocity',
    setup: {
      actions: [
        { type: 'velocity', vx: 10, vy: 5 },
        { type: 'advance', seconds: 3.8 },
        { type: 'velocity', vx: 10, vy: 0 },
        { type: 'advance', seconds: 3 },
        { type: 'velocity', vx: 0, vy: 0 },
      ],
    },
  }

  test('⚠️⚠️ Aula 12: a régua de passos embaixo da tela, antes e agora, e a lista em duas colunas', () => {
    const s = mundo(
      AULA,
      { type: 'velocity', vx: -5, vy: 0 },
      ...tempo(1.2, 0.2),
      { type: 'velocity', vx: -6, vy: 0 },
      ...tempo(1.2, 0.2),
    )
    const desenho = html(<VelocityStage state={s} cast={CACTO} />)
    expect(desenho).toContain('data-regua-de-passos="antes"')
    expect(desenho).toContain('data-regua-de-passos="agora"')
    expect(desenho).toContain('data-coluna="antes"')
    expect(desenho).toContain('data-coluna="agora"')
    // O rastro vem DEPOIS do personagem: desenhado antes, o cacto o cobria.
    const figura = desenho.indexOf('data-figure=')
    const pontinho = desenho.indexOf('fill-scene-a stroke-scene-card')
    expect(figura).toBeGreaterThan(-1)
    expect(pontinho).toBeGreaterThan(figura)
  })

  test('⚠️ velocidade ZERO também soma: a conta "+ 0" aparece com o cacto parado', () => {
    const s = mundo(
      AULA,
      { type: 'velocity', vx: -5, vy: 0 },
      ...tempo(1, 0.2),
      { type: 'velocity', vx: 0, vy: 0 },
      ...tempo(0.6, 0.2),
    )
    expect(html(<VelocityStage state={s} cast={CACTO} />)).toMatch(/x: [\d−]+ \+ 0 = [\d−]+/)
  })

  test('⚠️ Dia 3: parada depois de descer, a lista continua no y', () => {
    const DIA3: Mundo = {
      scene: 'velocity',
      setup: {
        actions: [
          { type: 'velocity', vx: 10, vy: -5 },
          { type: 'advance', seconds: 3.6 },
          { type: 'velocity', vx: 0, vy: -5 },
          { type: 'advance', seconds: 3.4 },
          { type: 'velocity', vx: 0, vy: 0 },
        ],
      },
    }
    const s = mundo(
      DIA3,
      { type: 'velocity', vx: 0, vy: 3 },
      ...tempo(3, 0.2),
      { type: 'velocity', vx: 0, vy: 0 },
      ...tempo(1, 0.2),
    )
    const desenho = html(<VelocityStage state={s} cast={PEDRA} />)
    expect(desenho).toMatch(/>y [\d−]+</)
    expect(desenho).not.toMatch(/>x [\d−]+</)
    // E o leitor ouve os mesmos nomes do deslizante.
    expect(desenho).toContain('Velocidade para o lado 0 e para baixo 0.')
  })
})

describe('random e acceleration (MÉDIOS)', () => {
  test('⚠️ random: só a última raia de cada velocidade, e a largada sem número', () => {
    const lugar = (unit: number): SceneAction => ({
      type: 'sample',
      kind: 'position',
      unit,
      guided: false,
    })
    const vel = (unit: number): SceneAction => ({
      type: 'sample',
      kind: 'velocity',
      unit,
      guided: false,
    })
    const s = mundo(
      { scene: 'random' },
      lugar(0.5),
      lugar(0.5),
      vel(0.1),
      vel(0.9),
      vel(0.1),
      vel(0.9),
    )
    expect(s.crowd.cacti.length).toBeGreaterThanOrEqual(4)
    const desenho = html(<RandomStage state={s} />)
    expect((desenho.match(/aria-label="Cacto /g) ?? []).length).toBe(2)
    expect(desenho).toContain('>largada<')
    expect(desenho).not.toContain('largada 500')
  })

  test('⚠️⚠️ acceleration: o −10 do passo em que a base CHEGA a −9 não ganha destaque; o rótulo sai UMA vez', () => {
    const passo: SceneAction = { type: 'sample', kind: 'velocity', unit: 0.9, guided: false }
    const start = { scene: 'acceleration' as const }
    let s = openScene(start)
    for (let i = 0; i < 20 && s.speed.base > -9; i++) s = stepScene(start, s, passo)
    expect(s.speed.base).toBe(-9)
    expect(s.crowd.cacti.at(-1)?.velocity).toBe(-10)
    const chegou = html(<AccelerationStage state={s} />)
    expect(chegou).not.toContain('base −9, sorteio −1')
    expect(chegou).toContain('base: velocidade dos novos')
    s = stepScene(start, s, passo)
    s = stepScene(start, s, passo)
    const parada = html(<AccelerationStage state={s} />)
    expect((parada.match(/base −9, sorteio −1/g) ?? []).length).toBe(1)
    // O "sorteio −1" miúdo embaixo de cada cacto saiu.
    expect(parada).not.toContain('>sorteio −1<')
  })

  test('⚠️⚠️ acceleration (A1): a chave fica FECHADA com a condição ligada até as duas metas; sem a condição, aberta', () => {
    const goals = [
      { id: 'base-limit', complete: false },
      { id: 'variation-limit', complete: false },
      { id: 'past-limit', complete: false },
    ]
    const bancada = (state: SceneState) =>
      html(
        <DinoNumbersControls
          scene="acceleration"
          state={state}
          dispatch={nada}
          goals={goals}
          onRunning={nada}
        />,
      )
    expect(bancada(mundo({ scene: 'acceleration' }))).toContain(
      'Abre depois de passar 5 segundos mais algumas vezes com a base parada.',
    )
    const semCondicao = mundo(
      { scene: 'acceleration' },
      { type: 'connect', port: 'limit', enabled: false },
    )
    expect(bancada(semCondicao)).not.toContain('Abre depois de passar 5 segundos')
  })
})

describe('hitbox e lives: as bancadas com saída (MÉDIO A4 e ALTO do "Agora é sua vez")', () => {
  test('⚠️⚠️ hitbox: com a área abaixo de 100% e sem BATEU, a área abre e diz o gesto', () => {
    const bancada = (state: SceneState) =>
      html(
        <DinoNumbersControls
          scene="hitbox"
          state={state}
          dispatch={nada}
          goals={[]}
          onRunning={nada}
        />,
      )
    const presa = mundo({ scene: 'hitbox' }, { type: 'resize', width: sceneAreaWidth(75) })
    expect(bancada(presa)).toContain('Aumente a área e aproxime o cacto de novo.')
    expect(bancada(mundo({ scene: 'hitbox' }))).toContain(
      'Abre depois que você aproximar o cacto um toque de cada vez.',
    )
  })

  test('⚠️⚠️ hitbox: a cena abre em 149, e o − de 10 em 10 mostra o BATEU com vão à vista', () => {
    expect(openScene({ scene: 'hitbox' }).contact.distance).toBe(149)
  })

  test('⚠️⚠️ lives com ponto por acerto: tem TIRO, e sem vidas "Bater" fica fechado (no Tab), não disabled', () => {
    const bancada = (state: SceneState) =>
      html(
        <DinoNumbersControls
          scene="lives"
          state={state}
          dispatch={nada}
          goals={[]}
          onRunning={nada}
          pontoPorAcerto
        />,
      )
    expect(bancada(mundo({ scene: 'lives' }))).toContain('Atirar no cacto')
    const semVidas = mundo(
      { scene: 'lives' },
      { type: 'connect', port: 'life', enabled: true },
      { type: 'collide' },
      { type: 'collide' },
      { type: 'collide' },
    )
    expect(semVidas.lifeline.lives).toBe(0)
    const fechado = bancada(semVidas)
    expect(fechado).toContain('Sem vidas. Use Recomeçar para jogar de novo.')
    expect(fechado).not.toMatch(/<button[^>]*disabled=""[^>]*>Bater no cacto/)
    expect(fechado).toMatch(/<button[^>]*aria-disabled="true"[^>]*>Bater no cacto/)
  })
})

describe('variable, spawn, score, restart e game-state', () => {
  test('⚠️ variable: a bancada fala a língua dos blocos, sem "Somar 5"', () => {
    const bancada = html(
      <CoreSceneControls scene="variable" state={mundo({ scene: 'variable' })} dispatch={nada} />,
    )
    expect(bancada).toContain('Somar 1 em pontos')
    expect(bancada).toContain('Mostrar placar: desligado')
    expect(bancada).not.toContain('Somar 5')
    expect(bancada).not.toContain('Mostrar na tela')
  })

  test('⚠️ spawn: o intervalo fica fechado com a peça fora do relógio, com o motivo', () => {
    const bancada = (state: SceneState) =>
      html(
        <DinoSceneControls
          activity={{ type: 'experimentation', scene: 'spawn' }}
          state={state}
          dispatch={nada}
          more={false}
        />,
      )
    expect(bancada(mundo({ scene: 'spawn' }))).toContain(
      'Abre quando Criar cacto estiver no relógio.',
    )
    const noRelogio = mundo({ scene: 'spawn' }, { type: 'connect', port: 'timer', enabled: true })
    expect(bancada(noRelogio)).not.toContain('Abre quando Criar cacto estiver no relógio.')
  })

  test('⚠️⚠️ score: "Toque para começar" é um BOTÃO na bancada, e o placar com a peça no Se diz "esperando"', () => {
    const inicio = mundo({ scene: 'score' })
    expect(html(<ScoreStage state={inicio} dispatch={nada} />)).toMatch(
      /<button[^>]*>Toque para começar<\/button>/,
    )
    const noSe = mundo({ scene: 'score' }, { type: 'connect', port: 'condition', enabled: true })
    expect(html(<ScoreStage state={noSe} dispatch={nada} />)).toContain('SEU PLACAR · esperando')
  })

  test('restart: o palco se chama "Tocar na tela do jogo" e convida na pista vazia', () => {
    const desenho = html(<RestartStage state={mundo({ scene: 'restart' })} dispatch={nada} />)
    expect(desenho).toContain('aria-label="Tocar na tela do jogo"')
    expect(desenho).toContain('Toque para começar')
  })

  test('⚠️ game-state: "esperando" só DEPOIS de o tempo passar com a peça no Se', () => {
    const noSe = mundo(
      { scene: 'game-state' },
      { type: 'connect', port: 'condition', enabled: true },
    )
    expect(html(<GameStateStage state={noSe} />)).not.toContain('>esperando<')
    const esperou = mundo(
      { scene: 'game-state' },
      { type: 'connect', port: 'condition', enabled: true },
      ...tempo(1),
    )
    expect(html(<GameStateStage state={esperou} />)).toContain('>esperando<')
  })
})

describe('as cenas da tela e do salto (MÉDIOS)', () => {
  test('⚠️ world: o desenho na tela ganha o aro e a etiqueta do mesmo lugar da ficha', () => {
    const nave: SceneCast = { hero: { name: 'nave', gender: 'f' } }
    const desenhado = mundo(
      { scene: 'world' },
      { type: 'create' },
      { type: 'connect', port: 'draw', enabled: true },
    )
    const desenho = html(<WorldStage state={desenhado} cast={nave} />)
    expect(desenho).toContain('data-aro-do-desenho')
    expect(desenho).toContain('x 400 · y 410')
    expect(
      html(<WorldStage state={mundo({ scene: 'world' }, { type: 'create' })} />),
    ).not.toContain('data-aro-do-desenho')
  })

  test('⚠️ draw-loop: desenhando só no começo, a silhueta tracejada marca onde o Dino ESTÁ', () => {
    const s = mundo({ scene: 'draw-loop' }, ...tempo(0.75, 0.25))
    const desenho = html(<DrawLoopStage state={s} />)
    expect(desenho).toContain(`data-bastidor="${s.render.x}"`)
    expect(desenho).toContain(`O x do Dino já está em ${s.render.x}`)
    // Desenhando a cada quadro, o desenho está onde o Dino está: sem silhueta.
    const cadaQuadro = mundo(
      { scene: 'draw-loop' },
      { type: 'loop', on: true },
      ...tempo(0.75, 0.25),
    )
    expect(html(<DrawLoopStage state={cadaQuadro} />)).not.toContain('data-bastidor')
  })

  test('⚠️ layers: a frase de quem não enxerga concorda com o elenco (sem "A pedra aparece inteiro")', () => {
    const pedra: SceneCast = {
      hero: { name: 'pedra', gender: 'f' },
      scenery: { name: 'chama', gender: 'f' },
    }
    const frente = mundo({ scene: 'layers' }, { type: 'layer', front: true })
    const desenho = html(<LayersStage state={frente} cast={pedra} />)
    expect(desenho).toContain('Nada fica na frente da pedra, e a chama fica atrás.')
    expect(desenho).not.toContain('inteiro')
  })

  test('⚠️⚠️ gravity: parado na altura de parada sem gravidade, a seta diz que o Dino segue subindo', () => {
    const start = { scene: 'gravity' as const }
    let s = stepScene(start, openScene(start), { type: 'jump', input: 'tap' })
    for (let i = 0; i < 400; i++) {
      const depois = stepScene(start, s, { type: 'advance', seconds: 0.05 })
      const parou = sceneJumpLeftView('gravity', s, depois)
      s = depois
      if (parou) break
    }
    const desenho = html(
      <ExperienceScene activity={{ type: 'experimentation', scene: 'gravity' }} state={s} />,
    )
    expect(desenho).toContain('data-segue-subindo')
    // No chão, sem seta.
    expect(
      html(
        <ExperienceScene
          activity={{ type: 'experimentation', scene: 'gravity' }}
          state={openScene(start)}
        />,
      ),
    ).not.toContain('data-segue-subindo')
  })
})
