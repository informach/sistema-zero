import { describe, expect, it } from 'bun:test'
import { SZIRSchema, SZIRV2Schema } from '#ir'

const project = (js: unknown[]) => ({
  html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
  css: [],
  js,
  extensions: [{ extensionId: 'game-3d' }],
})

describe('game-3d — contrato de ciclo de vida', () => {
  it('recusa criação de recursos dentro de “a cada quadro 3D”', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:createBox',
              varName: 'caixa',
              worldVar: 'cena',
              size: 1,
              color: '#22d3ee',
            },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('fora do laço'))).toBe(true)
    }
  })

  it('recusa materiais e texturas recriados a cada quadro', () => {
    for (const statement of [
      { type: 'g3d:setMaterial', objVar: 'cubo', kind: 'metal' },
      { type: 'g3d:setTexture', objVar: 'cubo', asset: 'parede' },
    ]) {
      const result = SZIRSchema.safeParse(
        project([
          { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
          {
            type: 'g3d:createBox',
            varName: 'cubo',
            worldVar: 'cena',
            size: 1,
            color: '#22d3ee',
          },
          { type: 'g3d:animate', worldVar: 'cena', body: [statement] },
        ]),
      )
      expect(result.success).toBe(false)
    }
  })

  it('aceita criar cópias e tocar sons em resposta ao jogo dentro de cada quadro', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        {
          type: 'g3d:createBox',
          varName: 'modelo',
          worldVar: 'cena',
          size: 1,
          color: '#22d3ee',
        },
        { type: 'g3d:createSwarm', varName: 'enxame', worldVar: 'cena' },
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:spawnInSwarm',
              swarmVar: 'enxame',
              originalVar: 'modelo',
              x: 0,
              y: 0,
              z: 0,
            },
            { type: 'g3d:playNote', freq: 440, ms: 100 },
            { type: 'g3d:playEffect', kind: 'coin' },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })

  it('aceita criação antes do loop e movimento dentro dele', () => {
    const parsed = SZIRSchema.safeParse(
      project([
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        {
          type: 'g3d:createBox',
          varName: 'caixa',
          worldVar: 'cena',
          size: 1,
          color: '#22d3ee',
        },
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [
            {
              type: 'g3d:rotateBy',
              objVar: 'caixa',
              axis: 'y',
              amount: { type: 'num', value: 0.03 },
            },
          ],
        },
      ]),
    )

    expect(parsed.success).toBe(true)
  })

  it('recusa parar antes do jogo rodar e aceita a parada durante o loop', () => {
    const rootStop = SZIRSchema.safeParse(
      project([
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        { type: 'g3d:stop', worldVar: 'cena' },
      ]),
    )
    const runningStop = SZIRSchema.safeParse(
      project([
        { type: 'g3d:createScene', canvasId: 'tela', varName: 'cena' },
        {
          type: 'g3d:animate',
          worldVar: 'cena',
          body: [{ type: 'g3d:stop', worldVar: 'cena' }],
        },
      ]),
    )

    expect(rootStop.success).toBe(false)
    expect(runningStop.success).toBe(true)
  })

  it('recusa parar diretamente no construtor nas duas versões da IR', () => {
    const scene = { type: 'g3d:createScene' as const, canvasId: 'tela', varName: 'cena' }
    const classWithStop = {
      type: 'classDecl' as const,
      name: 'Jogo',
      ctorBody: [{ type: 'g3d:stop' as const, worldVar: 'cena' }],
      methods: [],
    }

    const legacy = SZIRSchema.safeParse(project([scene, classWithStop]))
    const current = SZIRV2Schema.safeParse({
      version: 2,
      html: [],
      css: [],
      behavior: { start: [scene, classWithStop], events: [], loops: [] },
      extensions: [{ extensionId: 'game-3d' }],
    })

    expect(legacy.success).toBe(false)
    expect(current.success).toBe(false)
    for (const result of [legacy, current]) {
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.message.includes('jogo estiver rodando')),
        ).toBe(true)
      }
    }
  })

  it('só aceita soltar a torre em evento, função ou método', () => {
    const drop = { type: 'g3d:stackDrop' as const, worldVar: 'torre' }
    const scene = {
      type: 'g3d:createStackScene' as const,
      canvasId: 'tela',
      varName: 'torre',
    }
    const rootDrop = SZIRSchema.safeParse(project([scene, drop]))
    const loopDrop = SZIRSchema.safeParse(
      project([scene, { type: 'g3d:animate', worldVar: 'torre', body: [drop] }]),
    )
    const eventDrop = SZIRSchema.safeParse(
      project([scene, { type: 'event', target: 'botao', event: 'click', body: [drop] }]),
    )
    const functionDrop = SZIRSchema.safeParse(
      project([scene, { type: 'funcDecl', name: 'soltar', params: [], body: [drop] }]),
    )

    expect(rootDrop.success).toBe(false)
    expect(loopDrop.success).toBe(false)
    expect(eventDrop.success).toBe(true)
    expect(functionDrop.success).toBe(true)

    const currentProject = (behavior: { start: unknown[]; events: unknown[]; loops: unknown[] }) =>
      SZIRV2Schema.safeParse({
        version: 2,
        html: [{ type: 'canvas', id: 'tela', width: 480, height: 360 }],
        css: [],
        behavior,
        extensions: [{ extensionId: 'game-3d' }],
      })
    const currentRoot = currentProject({ start: [scene, drop], events: [], loops: [] })
    const currentLoop = currentProject({
      start: [scene],
      events: [],
      loops: [{ type: 'g3d:animate', worldVar: 'torre', body: [drop] }],
    })
    const currentEvent = currentProject({
      start: [scene],
      events: [{ type: 'event', target: 'window', event: 'keydown', body: [drop] }],
      loops: [],
    })

    expect(currentRoot.success).toBe(false)
    expect(currentLoop.success).toBe(false)
    expect(currentEvent.success).toBe(true)
  })
})
