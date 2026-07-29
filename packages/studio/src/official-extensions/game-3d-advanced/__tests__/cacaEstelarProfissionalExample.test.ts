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
import { CACA_ESTELAR_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_cacaEstelarProfissional'
import { gameKit3DBlocks } from '../blocks'
import { cacaEstelarProfissionalExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Caça Estelar Profissional" — a batalha espacial do SimonDev
 * (Quick_Game2_StarWarsThing) como DOGFIGHT no motor avançado: uma nave em VOO
 * LIVRE (moveWithKeys + faceVelocity + cameraFollow) que atira pra frente
 * (spawnFrom + moveForward) e caça naves inimigas com FSM POR-ENTIDADE (vagando →
 * perseguindo → fugindo). A IR embutida em examples.ts foi GERADA pelo parser real
 * a partir do SOURCE (que mora no __gen_cacaEstelarProfissional.ts, importado aqui
 * para que fonte e teste NUNCA possam divergir). ⭐ Distinto da "Patrulha Espacial"
 * (nave presa no eixo X via place + meteoros stateless por setVelocity): aqui o voo
 * é LIVRE e o inimigo é uma NAVE com IA que persegue (seekPoint) e evade (fugindo).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Caça Estelar Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(cacaEstelarProfissionalExample)
    expect(cacaEstelarProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(cacaEstelarProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(cacaEstelarProfissionalExample.name).toBe('Caça Estelar Profissional')
    expect(cacaEstelarProfissionalExample.name).not.toContain('—')
    expect(cacaEstelarProfissionalExample.description ?? '').not.toContain('—')
    expect((cacaEstelarProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(cacaEstelarProfissionalExample.ir)).not.toContain('—')
  })

  it('⭐ FSM POR-ENTIDADE da nave inimiga: vagando → perseguindo → fugindo', () => {
    const statements = behaviorStatements(cacaEstelarProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:onEnterEntityState',
      'g3k:onEntityStateUpdate',
      'g3k:setEntityState',
      'g3k:stateTimer',
      'g3k:seekPoint',
      'g3k:setEntityValue',
      'g3k:entityValue',
      'g3k:faceVelocity',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const state of ['"vagando"', '"perseguindo"', '"fugindo"']) {
      expect(raw).toContain(state)
    }
    for (const mold of ['"nave"', '"caca"', '"tiro"']) {
      expect(raw).toContain(mold)
    }
  })

  it('⭐ voo livre + tiro pra frente: moveWithKeys + faceVelocity + cameraFollow + spawnFrom + moveForward', () => {
    const types = collectTypes(behaviorStatements(cacaEstelarProfissionalExample.ir))
    for (const t of [
      'g3k:moveWithKeys', // voo livre no plano
      'g3k:faceVelocity', // a nave encara o movimento
      'g3k:cameraFollow', // câmera 3ª pessoa atrás
      'g3k:cameraSmooth',
      'g3k:spawnFrom', // o tiro nasce da nave
      'g3k:moveForward', // e voa pra frente
      'g3k:cullFar', // tiro que sai do mundo é recolhido
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ caça pela VIZINHANÇA: nearest("nave") + touches muda o estado', () => {
    const types = collectTypes(behaviorStatements(cacaEstelarProfissionalExample.ir))
    for (const t of ['g3k:storeNearest', 'g3k:touches', 'g3k:exists']) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ combate: makeTrigger + onOverlap + hurt derrubam; barras de vida, morte e recuo no dano', () => {
    const types = collectTypes(behaviorStatements(cacaEstelarProfissionalExample.ir))
    for (const t of [
      'g3k:makeTrigger', // a caca é uma zona de acerto
      'g3k:onOverlap', // colisão sem laço aninhado
      'g3k:isMold', // filtra tiro vs nave
      'g3k:hurt',
      'g3k:onEntityDeath', // a queda conta ponto
      'g3k:showHealthBar',
      'g3k:onHurt', // ao levar dano, a caca foge
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ DISTINTO da Patrulha Espacial: a caca NAVEGA com seekPoint (não é 1ª pessoa nem meteoro burro)', () => {
    const types = collectTypes(behaviorStatements(cacaEstelarProfissionalExample.ir))
    // A caca tem cérebro que persegue (seekPoint) e evade (estado "fugindo"): a
    // Patrulha move meteoros por setVelocity em linha reta, sem seekPoint.
    expect(types.has('g3k:seekPoint')).toBe(true)
    expect(types.has('g3k:setVelocity')).toBe(false)
    // E o voo é 3ª pessoa livre, não 1ª pessoa.
    expect(types.has('g3k:cameraFps')).toBe(false)
    expect(types.has('g3k:moveFps')).toBe(false)
  })

  it('vitória por meta e derrota por escudos: setState menu/vitória/fim + countAlive', () => {
    const statements = behaviorStatements(cacaEstelarProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:setScreenText',
      'g3k:setState',
      'g3k:countAlive',
      'g3k:hudText',
      'g3k:onUpdate',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const screen of ['"menu"', '"vitoria"', '"fim"']) {
      expect(raw).toContain(screen)
    }
    expect(raw).toContain('"pontos"')
  })

  it('⭐ o acaso passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(cacaEstelarProfissionalExample.ir))
    expect(types.has('g3k:randomBetween')).toBe(true)
    expect(types.has('g3k:randomChance')).toBe(true)
    expect(types.has('g3k:setSeed')).toBe(true)
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(cacaEstelarProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(cacaEstelarProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(cacaEstelarProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      cacaEstelarProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(cacaEstelarProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
