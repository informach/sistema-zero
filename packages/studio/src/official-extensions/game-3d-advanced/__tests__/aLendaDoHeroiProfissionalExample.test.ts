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
import { A_LENDA_DO_HEROI_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_aLendaDoHeroiProfissional'
import { gameKit3DBlocks } from '../blocks'
import { aLendaDoHeroiProfissionalExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "A Lenda do Herói Profissional" — o RPG de ação do SimonDev
 * (Quick_3D_RPG) no motor avançado: herói em TERCEIRA PESSOA com espada (melee)
 * e monstros com FSM POR-ENTIDADE (vagando → perseguindo) que o caçam pela
 * vizinhança do motor (nearest("heroi") + touches). A IR embutida em examples.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_aLendaDoHeroiProfissional.ts, importado aqui para que fonte e teste
 * NUNCA possam divergir). ⭐ Distinto do "Labirinto dos Robôs" (1ª pessoa + tiro):
 * aqui é 3ª pessoa + espada de perto (forEachNear + hurt).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo A Lenda do Herói Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DExamples).toContain(aLendaDoHeroiProfissionalExample)
    expect(aLendaDoHeroiProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(aLendaDoHeroiProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(aLendaDoHeroiProfissionalExample.name).toBe('A Lenda do Herói Profissional')
    expect(aLendaDoHeroiProfissionalExample.name).not.toContain('—')
    expect(aLendaDoHeroiProfissionalExample.description ?? '').not.toContain('—')
    expect((aLendaDoHeroiProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(aLendaDoHeroiProfissionalExample.ir)).not.toContain('—')
  })

  it('⭐ FSM POR-ENTIDADE do monstro: vagando → perseguindo', () => {
    const statements = behaviorStatements(aLendaDoHeroiProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:onEnterEntityState',
      'g3k:onEntityStateUpdate',
      'g3k:setEntityState',
      'g3k:stateTimer',
      'g3k:seekPoint', // vaga rumo a pontos sorteados e persegue o herói
      'g3k:setEntityValue', // a gaveta por entidade guarda o waypoint
      'g3k:entityValue',
      'g3k:faceVelocity',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const state of ['"vagando"', '"perseguindo"']) {
      expect(raw).toContain(state)
    }
    for (const mold of ['"heroi"', '"monstro"']) {
      expect(raw).toContain(mold)
    }
  })

  it('⭐ combate CORPO A CORPO: forEachNear + hurt derrotam; barras de vida e morte contam', () => {
    const statements = behaviorStatements(aLendaDoHeroiProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:forEachNear', // a espada varre os monstros por perto
      'g3k:hurt', // e machuca cada um
      'g3k:showHealthBar', // herói e monstro têm barra de vida
      'g3k:onEntityDeath', // a morte do monstro conta ponto
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ os monstros caçam pela VIZINHANÇA: nearest("heroi") + touches muda o estado', () => {
    const types = collectTypes(behaviorStatements(aLendaDoHeroiProfissionalExample.ir))
    for (const t of [
      'g3k:storeNearest', // o monstro acha o herói sem variável global
      'g3k:touches', // e checa a proximidade (perseguir e atacar)
      'g3k:exists',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ herói em 3ª pessoa com ESPADA: moveWithKeys + cameraFollow (não é 1ª pessoa nem tiro)', () => {
    const types = collectTypes(behaviorStatements(aLendaDoHeroiProfissionalExample.ir))
    for (const t of [
      'g3k:moveWithKeys',
      'g3k:keyDown',
      'g3k:mousePressed',
      'g3k:cameraFollow',
      'g3k:cameraSmooth',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Distinto do "Labirinto dos Robôs": nada de 1ª pessoa nem de projétil.
    expect(types.has('g3k:cameraFps')).toBe(false)
    expect(types.has('g3k:moveFps')).toBe(false)
    expect(types.has('g3k:spawnFrom')).toBe(false)
  })

  it('vitória por meta e derrota por corações: setState menu/vitória/fim + countAlive', () => {
    const statements = behaviorStatements(aLendaDoHeroiProfissionalExample.ir)
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
    expect(raw).toContain('"derrotados"')
  })

  it('⭐ o acaso passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(aLendaDoHeroiProfissionalExample.ir))
    expect(types.has('g3k:randomBetween')).toBe(true)
    expect(types.has('g3k:randomChance')).toBe(true)
    expect(types.has('g3k:setSeed')).toBe(true)
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(aLendaDoHeroiProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(aLendaDoHeroiProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(aLendaDoHeroiProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      aLendaDoHeroiProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(aLendaDoHeroiProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
