import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import {
  collectStatements,
  collectTypes,
  parseExampleLifecycleSource,
  stripIds,
} from './exampleContractHarness'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { VILA_NINJA_SOURCE as SOURCE } from '../__gen_vilaNinja'
import { gameKitBlocks } from '../blocks'
import { vilaNinjaExample } from '../examples'

/**
 * Drift do exemplo "Vila Ninja Profissional" — o ninja-adventure (aventura
 * top-down) sobre as peças do 🧙 Kit RPG do motor avançado (mundo maior que a
 * tela + câmera + FSM de inimigos por distância). A IR embutida em examples/ foi
 * GERADA pelo parser real a partir do SOURCE (que mora no __gen_vilaNinja.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Vila Ninja Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(vilaNinjaExample)
    expect(vilaNinjaExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(vilaNinjaExample.name).toBe('Vila Ninja Profissional')
    expect(vilaNinjaExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(vilaNinjaExample.ir)) as JSStatement[])
  })

  it('mundo maior que a tela: tilemap por código + câmera presa no mapa', () => {
    const types = collectTypes(behaviorStatements(vilaNinjaExample.ir))
    for (const t of [
      'gk:createEmptyTilemap',
      'gk:cameraFollowMap',
      'gk:keepOnScreen', // com a câmera ligada, vale o MUNDO
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(vilaNinjaExample.assets ?? []).toHaveLength(0)
  })

  it('⭐ combate corpo-a-corpo do kit: lançada direcional com janela + i-frames + empurrão', () => {
    const types = collectTypes(behaviorStatements(vilaNinjaExample.ir))
    for (const t of [
      'gk:attackFacing', // a caixa de golpe NA FRENTE, pela direção que olha
      'gk:setSwingWindow', // o golpe não machuca no quadro do aperto
      'gk:didHit',
      'gk:hurt',
      'gk:isInvincible', // o gate canônico do dano no ninja
      'gk:knockback', // nos DOIS sentidos: ninja empurra monstro e vice-versa
      'gk:cameraShake',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ FSM por entidade dirigida por distância, DENTRO de cada enxame', () => {
    const statements = behaviorStatements(vilaNinjaExample.ir)
    const loops = collectStatements(statements, 'gk:forEachActive') as Array<{
      mold: string
      body: unknown
    }>
    expect(loops.map((loop) => loop.mold).sort()).toEqual(['bambu', 'dragao'])
    for (const loop of loops) {
      const inner = collectTypes(loop.body)
      // parado -> perseguir -> golpe: ler o estado, medir a distância, travar o
      // estado novo — por ENTIDADE, não por variável global.
      for (const t of [
        'gk:entityState',
        'gk:setEntityState',
        'gk:distanceBetween',
        'gk:seek',
        'gk:patrolAround',
        'gk:didHit',
        'gk:knockback',
        'gk:isDead',
        'gk:recycle',
      ]) {
        expect(inner.has(t)).toBe(true)
      }
    }
  })

  it('2 tipos de monstro data-driven: mesmo molde de código, números diferentes', () => {
    const statements = behaviorStatements(vilaNinjaExample.ir)
    const molds = collectStatements(statements, 'gk:defineMold') as Array<{
      name: string
      health: { value: number }
      speed: { value: number }
      damage: { value: number }
    }>
    const bambu = molds.find((mold) => mold.name === 'bambu')
    const dragao = molds.find((mold) => mold.name === 'dragao')
    expect(bambu).toBeDefined()
    expect(dragao).toBeDefined()
    if (!bambu || !dragao) throw new Error('moldes de monstro ausentes')
    // O dragão é mais rápido e bate mais forte; o bambu é mais lento — só os
    // NÚMEROS mudam, o molde de código é o mesmo.
    expect(dragao.speed.value).toBeGreaterThan(bambu.speed.value)
    expect(dragao.damage.value).toBeGreaterThan(bambu.damage.value)
    // O dano do toque sai do MOLDE (propertyOf), não de um número repetido.
    expect(collectTypes(statements).has('gk:propertyOf')).toBe(true)
  })

  it('Y-sort do kit, HUD de corações e missão de derrotar todos', () => {
    const types = collectTypes(behaviorStatements(vilaNinjaExample.ir))
    for (const t of [
      'gk:defineEffect',
      'gk:burst',
      'gk:drawByDepth', // o ninja passa ATRÁS das casas/árvores (painter por Y)
      'gk:drawShadow',
      'gk:drawHearts',
      'gk:healthOf',
      'gk:stateLook', // visual 100% defineLook, animação por estado
      'gk:autoAnimate',
      'gk:setMission', // derrotar todos -> tela "vitoria" pronta
      'gk:missionKill',
      'gk:onEnterState',
      'gk:endGame',
      'gk:setScreenText',
      'gk:defineLook',
      'gk:collideGroup', // colisão contra casas e árvores
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ não mistura kits: ZERO pkm_*, ZERO rpg_* e zero Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(vilaNinjaExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:nave')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(vilaNinjaExample.ir)).not.toContain('—')
    expect(vilaNinjaExample.description ?? '').not.toContain('—')
    expect((vilaNinjaExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(vilaNinjaExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      vilaNinjaExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(vilaNinjaExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
