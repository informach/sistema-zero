import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { LABIRINTO_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_labirintoProfissional'
import { gameKit3DBlocks } from '../blocks'
import { labirintoDosRobosProfissionalExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Labirinto dos Robôs Profissional" — o FPS estilo Doom do
 * motor avançado. A IR embutida em examples.ts foi GERADA pelo parser real a
 * partir do SOURCE (que mora no __gen_labirintoProfissional.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir).
 *
 * ⭐ Este teste também carimba os VEREDITOS DO SPIKE de pointer lock: sob
 * camera_fps o mouse interno CONGELA, então pick/groundPoint/pointerOver são
 * BANIDOS aqui; mousePressed (gatilho) funciona sob lock; e o projétil
 * alinhado ao olhar é spawnFrom + moveForward (o yaw do FPS gira o mesh).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Labirinto dos Robôs Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(labirintoDosRobosProfissionalExample)
    expect(labirintoDosRobosProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(labirintoDosRobosProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('⭐ veredito do spike: FPS atira por mousePressed + spawnFrom + moveForward', () => {
    const types = collectTypes(behaviorStatements(labirintoDosRobosProfissionalExample.ir))
    for (const t of [
      'g3k:cameraFps',
      'g3k:moveFps',
      'g3k:mousePressed',
      'g3k:spawnFrom',
      'g3k:moveForward',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ veredito do spike: sob pointer lock o mouse interno congela — pick/groundPoint/pointerOver BANIDOS', () => {
    const types = collectTypes(behaviorStatements(labirintoDosRobosProfissionalExample.ir))
    expect(types.has('g3k:pick')).toBe(false)
    expect(types.has('g3k:groundPoint')).toBe(false)
    expect(types.has('g3k:pointerOver')).toBe(false)
    // E o andar é o de 1ª pessoa, não os controles de 3ª:
    expect(types.has('g3k:moveWithKeys')).toBe(false)
    expect(types.has('g3k:platformerKeys')).toBe(false)
  })

  it('FSM de 3 estados POR robô: patrulhar → perseguir → atacar, nos DOIS moldes', () => {
    const statements = behaviorStatements(labirintoDosRobosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:onEnterEntityState',
      'g3k:onEntityStateUpdate',
      'g3k:setEntityState',
      'g3k:stateTimer',
      'g3k:seekPoint', // patrulha rumo a pontos sorteados
      'g3k:setEntityValue', // a gaveta por entidade guarda o waypoint
      'g3k:entityValue',
      'g3k:storeNearest', // o robô acha o herói sem variável global
      'g3k:touches',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const state of ['"patrulhar"', '"perseguir"', '"atacar"']) {
      expect(raw).toContain(state)
    }
    // Um cérebro COMPLETO por molde: cada estado citado junto de cada robô.
    for (const mold of ['"vigia"', '"tanque"']) {
      expect(raw).toContain(mold)
    }
  })

  it('data-driven: os DOIS tipos de robô diferem só nos NÚMEROS (vida e velocidade)', () => {
    const statements = behaviorStatements(labirintoDosRobosProfissionalExample.ir)
    const molds = statements.filter(
      (s) => (s as { type?: string }).type === 'g3k:defineMold',
    ) as Array<{ name: string; health: { value?: number }; speed: { value?: number } }>
    const vigia = molds.find((m) => m.name === 'vigia')
    const tanque = molds.find((m) => m.name === 'tanque')
    expect(vigia).toBeDefined()
    expect(tanque).toBeDefined()
    expect(vigia?.health.value).not.toBe(tanque?.health.value)
    expect(vigia?.speed.value).not.toBe(tanque?.speed.value)
  })

  it('labirinto SÓLIDO de moldes + tiro como zona com filtro de identidade', () => {
    const statements = behaviorStatements(labirintoDosRobosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:makeSolid',
      'g3k:makeTrigger',
      'g3k:onOverlap',
      'g3k:isMold',
      'g3k:hurt',
      'g3k:recycle',
      'g3k:cullFar',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // As 4 famílias de parede do labirinto existem e são sólidas.
    for (const mold of ['"muralha"', '"muralhaLado"', '"parede"', '"paredeLado"']) {
      expect(raw).toContain(mold)
    }
  })

  it('dano no herói: i-frames via onHurt com tremor de câmera; morte encerra', () => {
    const types = collectTypes(behaviorStatements(labirintoDosRobosProfissionalExample.ir))
    for (const t of [
      'g3k:onHurt',
      'g3k:cameraShake',
      'g3k:onEntityDeath',
      'g3k:endGame',
      'g3k:setState',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('telas, HUD, clima e semente: menu/vitória/derrota + névoa + luz + setSeed', () => {
    const statements = behaviorStatements(labirintoDosRobosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:setScreenText',
      'g3k:hudText',
      'g3k:setFog',
      'g3k:addLight',
      'g3k:setAmbient',
      'g3k:setSeed',
      'g3k:setEffects',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const screen of ['"menu"', '"vitoria"', '"fim"']) {
      expect(raw).toContain(screen)
    }
  })

  it('⭐ o acaso do exemplo passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(labirintoDosRobosProfissionalExample.ir))
    expect(types.has('g3k:randomBetween')).toBe(true)
    expect(types.has('g3k:randomChance')).toBe(true)
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(
      JSON.stringify(behaviorStatements(labirintoDosRobosProfissionalExample.ir)),
    ).not.toContain('Math.random')
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(labirintoDosRobosProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(labirintoDosRobosProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      labirintoDosRobosProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(labirintoDosRobosProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
