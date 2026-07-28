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
import { REUNIR_REBANHO_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_reunirRebanhoProfissional'
import { gameKit3DBlocks } from '../blocks'
import { reunirRebanhoProfissionalExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Reunir o Rebanho Profissional" — o Entity Management do curso
 * SimonDev no motor avançado: muitas entidades autônomas com FSM POR-ENTIDADE
 * (vagando → seguindo) gerenciadas pela vizinhança do motor (nearest + touches).
 * A IR embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE
 * (que mora no __gen_reunirRebanhoProfissional.ts, importado aqui para que fonte
 * e teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Reunir o Rebanho Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(reunirRebanhoProfissionalExample)
    expect(reunirRebanhoProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(reunirRebanhoProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(reunirRebanhoProfissionalExample.name).toBe('Reunir o Rebanho Profissional')
    expect(reunirRebanhoProfissionalExample.name).not.toContain('—')
    expect(reunirRebanhoProfissionalExample.description ?? '').not.toContain('—')
    expect((reunirRebanhoProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(reunirRebanhoProfissionalExample.ir)).not.toContain('—')
  })

  it('⭐ FSM POR-ENTIDADE do bichinho: vagando → seguindo', () => {
    const statements = behaviorStatements(reunirRebanhoProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:onEnterEntityState',
      'g3k:onEntityStateUpdate',
      'g3k:setEntityState',
      'g3k:stateTimer',
      'g3k:seekPoint', // vaga rumo a pontos sorteados e segue o pastor
      'g3k:setEntityValue', // a gaveta por entidade guarda o waypoint
      'g3k:entityValue',
      'g3k:faceVelocity',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const state of ['"vagando"', '"seguindo"']) {
      expect(raw).toContain(state)
    }
    for (const mold of ['"pastor"', '"bicho"', '"curral"']) {
      expect(raw).toContain(mold)
    }
  })

  it('⭐ gestão do rebanho pela VIZINHANÇA: nearest(pastor) + touches muda o estado', () => {
    const types = collectTypes(behaviorStatements(reunirRebanhoProfissionalExample.ir))
    for (const t of [
      'g3k:storeNearest', // o bichinho acha o pastor sem variável global
      'g3k:touches', // e checa a proximidade
      'g3k:exists',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ o curral é a ÚNICA zona e SÓ entrega quem está "seguindo" (filtro de estado)', () => {
    const statements = behaviorStatements(reunirRebanhoProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:makeTrigger', 'g3k:onOverlap', 'g3k:isMold', 'g3k:entityStateIs', 'g3k:recycle']) {
      expect(types.has(t)).toBe(true)
    }
    // O gancho da zona filtra por molde "bicho" E por estado "seguindo": o pastor
    // e os que só vagam nunca contam ponto.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('g3k:entityStateIs')
    expect(raw).toContain('"seguindo"')
  })

  it('pastor em 3ª pessoa: WASD/setas via place + cameraFollow (não é 1ª pessoa)', () => {
    const types = collectTypes(behaviorStatements(reunirRebanhoProfissionalExample.ir))
    for (const t of ['g3k:keyDown', 'g3k:place', 'g3k:cameraFollow', 'g3k:cameraSmooth']) {
      expect(types.has(t)).toBe(true)
    }
    expect(types.has('g3k:cameraFps')).toBe(false)
    expect(types.has('g3k:moveFps')).toBe(false)
  })

  it('vitória por meta e derrota por tempo: setState menu/vitória/fim + countAlive', () => {
    const statements = behaviorStatements(reunirRebanhoProfissionalExample.ir)
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
    expect(raw).toContain('"tempoRestante"')
  })

  it('⭐ o acaso passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(reunirRebanhoProfissionalExample.ir))
    expect(types.has('g3k:randomBetween')).toBe(true)
    expect(types.has('g3k:setSeed')).toBe(true)
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(reunirRebanhoProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(reunirRebanhoProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(reunirRebanhoProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      reunirRebanhoProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(reunirRebanhoProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
