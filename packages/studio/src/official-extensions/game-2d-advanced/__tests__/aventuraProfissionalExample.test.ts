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
import { AVENTURA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_aventuraProfissional'
import { gameKitBlocks } from '../blocks'
import { aventuraProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Aventura do Herói Profissional" — o nível 2 da família de
 * aventura (Zelda-style) sobre as peças GERAIS do motor avançado, sem Kit RPG
 * e sem Kit Monstrinhos. A IR embutida em examples/ foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_aventuraProfissional.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Aventura do Herói Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(aventuraProfissionalExample)
    expect(aventuraProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(aventuraProfissionalExample.name).toBe('Aventura do Herói Profissional')
    expect(aventuraProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(aventuraProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('mundo maior que a tela: tilemap por código + câmera presa no mapa', () => {
    const types = collectTypes(behaviorStatements(aventuraProfissionalExample.ir))
    for (const t of [
      'gk:createEmptyTilemap',
      'gk:setTileAt', // o mato é PEÇA do mapa, colocada por laço (data-driven)
      'gk:tileAt',
      'gk:cameraFollowMap',
      'gk:keepOnScreen', // com a câmera ligada, vale o MUNDO
      'forRange', // as fileiras de mato nascem e desenham por laço do núcleo
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(aventuraProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('⭐ combate corpo-a-corpo do kit: golpe direcional com janela + i-frames + empurrão', () => {
    const types = collectTypes(behaviorStatements(aventuraProfissionalExample.ir))
    for (const t of [
      'gk:attackFacing', // a caixa de golpe NA FRENTE, pela direção que olha
      'gk:setSwingWindow', // o golpe não machuca no quadro do aperto
      'gk:didHit',
      'gk:hurt',
      'gk:isInvincible', // o gate canônico do dano no herói
      'gk:knockback', // nos DOIS sentidos: herói empurra inimigo e vice-versa
      'gk:cameraShake',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ FSM por entidade dirigida por distância, DENTRO de cada enxame', () => {
    const statements = behaviorStatements(aventuraProfissionalExample.ir)
    const loops = collectStatements(statements, 'gk:forEachActive') as Array<{
      mold: string
      body: unknown
    }>
    expect(loops.map((loop) => loop.mold).sort()).toEqual(['javali', 'lobo'])
    for (const loop of loops) {
      const inner = collectTypes(loop.body)
      // parado/patrulha -> perseguir -> golpe: ler o estado, medir a distância,
      // travar o estado novo — por ENTIDADE, não por variável global.
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

  it('2 tipos de inimigo data-driven: mesmo molde de código, números diferentes', () => {
    const statements = behaviorStatements(aventuraProfissionalExample.ir)
    const molds = collectStatements(statements, 'gk:defineMold') as Array<{
      name: string
      health: { value: number }
      speed: { value: number }
      damage: { value: number }
    }>
    const javali = molds.find((mold) => mold.name === 'javali')
    const lobo = molds.find((mold) => mold.name === 'lobo')
    expect(javali).toBeDefined()
    expect(lobo).toBeDefined()
    if (!javali || !lobo) throw new Error('moldes de inimigo ausentes')
    // O javali é tanque lento; o lobo é rápido e frágil — só os NÚMEROS mudam.
    expect(javali.health.value).toBeGreaterThan(lobo.health.value)
    expect(lobo.speed.value).toBeGreaterThan(javali.speed.value)
    expect(javali.damage.value).toBeGreaterThan(lobo.damage.value)
    // O dano do toque sai do MOLDE (propertyOf), não de um número repetido.
    expect(collectTypes(statements).has('gk:propertyOf')).toBe(true)
  })

  it('mato destrutível + faíscas, Y-sort do kit e HUD de corações', () => {
    const types = collectTypes(behaviorStatements(aventuraProfissionalExample.ir))
    for (const t of [
      'gk:breakTileAt', // cortar o mato REMOVE a peça do mapa
      'gk:defineEffect',
      'gk:burst',
      'gk:drawByDepth', // o herói passa ATRÁS das árvores (painter por Y)
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
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ não mistura kits: ZERO pkm_*, ZERO rpg_* e zero Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(aventuraProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('gk:nave')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(aventuraProfissionalExample.ir)).not.toContain('—')
    expect(aventuraProfissionalExample.description ?? '').not.toContain('—')
    expect((aventuraProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(aventuraProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      aventuraProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(aventuraProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
