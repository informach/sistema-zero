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
import { CERCO_NA_BASE_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_cercoNaBaseProfissional'
import { gameKit3DBlocks } from '../blocks'
import { cercoNaBaseProfissionalExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Cerco na Base Profissional" — o FPS do SimonDev (Quick_FPS1 /
 * SimonDoom) recriado no motor avançado como DEFESA DE ARENA em primeira pessoa:
 * cameraFps + moveFps, tiro CARREGADO (segurar o espaço enche a `carga`, soltar
 * dispara o molde forte ou fraco) e MUNIÇÃO limitada que recarrega. Os aliens
 * avançam em ondas (FSM parado → avancando por seekPoint no herói). A IR embutida
 * em examples.ts foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_cercoNaBaseProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir). ⭐ Distinto do "Labirinto dos Robôs" (também 1ª pessoa): lá é
 * um LABIRINTO de paredes sólidas (makeSolid) com tiro à vontade; aqui é ARENA
 * ABERTA (sem makeSolid) com MUNIÇÃO + tiro CARREGADO e ondas.
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Cerco na Base Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(cercoNaBaseProfissionalExample)
    expect(cercoNaBaseProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(types.has('memberCallExpr')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(cercoNaBaseProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(cercoNaBaseProfissionalExample.name).toBe('Cerco na Base Profissional')
    expect(cercoNaBaseProfissionalExample.name).not.toContain('—')
    expect(cercoNaBaseProfissionalExample.description ?? '').not.toContain('—')
    expect((cercoNaBaseProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(cercoNaBaseProfissionalExample.ir)).not.toContain('—')
  })

  it('⭐ FPS em 1ª pessoa: cameraFps + moveFps (não é 3ª pessoa)', () => {
    const types = collectTypes(behaviorStatements(cercoNaBaseProfissionalExample.ir))
    expect(types.has('g3k:cameraFps')).toBe(true)
    expect(types.has('g3k:moveFps')).toBe(true)
    // Não é a câmera de perseguição das outras trilogias 3ª pessoa.
    expect(types.has('g3k:cameraFollow')).toBe(false)
  })

  it('⭐ o DIFERENCIAL: tiro CARREGADO (2 moldes de bolt) + MUNIÇÃO', () => {
    const statements = behaviorStatements(cercoNaBaseProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:keyDown',
      'g3k:mouseDown',
      'g3k:spawnFrom',
      'g3k:moveForward',
      'g3k:cullFar',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // A carga e a munição vivem em variáveis próprias (o Labirinto não tem nenhuma).
    expect(raw).toContain('"carga"')
    expect(raw).toContain('"municao"')
    // Dois moldes de tiro: fraco (tap) e forte (carregado).
    for (const mold of ['"tiroFraco"', '"tiroForte"']) {
      expect(raw).toContain(mold)
    }
  })

  it('⭐ aliens em ONDAS com FSM parado → avancando (rush por nearest + seekPoint)', () => {
    const statements = behaviorStatements(cercoNaBaseProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:stateTimer',
      'g3k:onEntityStateUpdate',
      'g3k:seekPoint',
      'g3k:storeNearest',
      'g3k:touches',
      'g3k:faceVelocity',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"avancando"')
    for (const mold of ['"alien"', '"heroi"']) {
      expect(raw).toContain(mold)
    }
  })

  it('⭐ combate: makeTrigger + onOverlap + hurt derrubam; a morte conta ponto', () => {
    const types = collectTypes(behaviorStatements(cercoNaBaseProfissionalExample.ir))
    for (const t of [
      'g3k:makeTrigger',
      'g3k:onOverlap',
      'g3k:isMold',
      'g3k:hurt',
      'g3k:onEntityDeath',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ DISTINTO do Labirinto dos Robôs: ARENA ABERTA (sem makeSolid) + munição', () => {
    const types = collectTypes(behaviorStatements(cercoNaBaseProfissionalExample.ir))
    // O Labirinto cerca o mapa com paredes sólidas (makeSolid); aqui a arena é aberta.
    expect(types.has('g3k:makeSolid')).toBe(false)
    // E o Labirinto atira à vontade; aqui a munição é uma variável limitada.
    expect(JSON.stringify(behaviorStatements(cercoNaBaseProfissionalExample.ir))).toContain(
      '"municao"',
    )
  })

  it('vitória por meta e derrota por vida: setState menu/vitória/fim + countAlive', () => {
    const statements = behaviorStatements(cercoNaBaseProfissionalExample.ir)
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

  it('⭐ o acaso passa pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(cercoNaBaseProfissionalExample.ir))
    expect(types.has('g3k:randomBetween')).toBe(true)
    expect(types.has('g3k:setSeed')).toBe(true)
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(cercoNaBaseProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(cercoNaBaseProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(cercoNaBaseProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      cercoNaBaseProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(cercoNaBaseProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
