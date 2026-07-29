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
import { MINA_DE_CRISTAIS_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_minaDeCristaisProfissional'
import { gameKit3DBlocks } from '../blocks'
import { minaDeCristaisProfissionalExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Mina de Cristais Profissional" — o Minecraft do SimonDev
 * (Quick_MinecraftClone2) recriado no motor avançado como uma MINA: em vez de
 * CONSTRUIR, você CAVA. Ande em 3ª pessoa (moveWithKeys + cameraFollow) e clique
 * nos blocos para minerar (pick + recycle): a pedra some, os cristais valem
 * ponto. Colete 10 cristais antes que o tempo acabe; veias novas surgem sozinhas.
 * A IR embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE
 * (que mora no __gen_minaDeCristaisProfissional.ts, importado aqui para que fonte
 * e teste NUNCA possam divergir). ⭐ Distinto da trilogia "Mundo de Blocos"
 * (também blocos estilo Minecraft): lá você CONSTRÓI — groundPoint fixa a célula,
 * makeSolid deixa tudo sólido, platformerKeys pula e a vitória é chegar ao TOPO.
 * Aqui NÃO há groundPoint/makeSolid/platformerKeys/onGround: o clique só REMOVE,
 * a meta é uma QUANTIDADE de cristais e há um TEMPO correndo.
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Mina de Cristais Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(minaDeCristaisProfissionalExample)
    expect(minaDeCristaisProfissionalExample.ir.extensions).toEqual([
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
      stripIds(behaviorStatements(minaDeCristaisProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('nenhum texto visível usa travessão', () => {
    expect(minaDeCristaisProfissionalExample.name).toBe('Mina de Cristais Profissional')
    expect(minaDeCristaisProfissionalExample.name).not.toContain('—')
    expect(minaDeCristaisProfissionalExample.description ?? '').not.toContain('—')
    expect((minaDeCristaisProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(minaDeCristaisProfissionalExample.ir)).not.toContain('—')
  })

  it('⭐ minerar em 3ª pessoa: moveWithKeys + cameraFollow (não é 1ª pessoa)', () => {
    const types = collectTypes(behaviorStatements(minaDeCristaisProfissionalExample.ir))
    expect(types.has('g3k:moveWithKeys')).toBe(true)
    expect(types.has('g3k:faceVelocity')).toBe(true)
    expect(types.has('g3k:cameraFollow')).toBe(true)
    // Não é o FPS do Cerco na Base.
    expect(types.has('g3k:cameraFps')).toBe(false)
    expect(types.has('g3k:moveFps')).toBe(false)
  })

  it('⭐ o DIFERENCIAL: CAVAR = clique (pick) + recycle, com cristais e tempo', () => {
    const statements = behaviorStatements(minaDeCristaisProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:mousePressed', 'g3k:pick', 'g3k:exists', 'g3k:isMold', 'g3k:recycle']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // A pontuação e o cronômetro vivem em variáveis próprias.
    expect(raw).toContain('"cristais"')
    expect(raw).toContain('"tempo"')
    // Dois tipos de bloco na mina: pedra (entulho) e cristal (ponto).
    for (const mold of ['"pedra"', '"cristal"', '"mineiro"']) {
      expect(raw).toContain(mold)
    }
  })

  it('⭐ veias novas surgem sozinhas: spawn semeado com teto por countAlive', () => {
    const statements = behaviorStatements(minaDeCristaisProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:spawn', 'g3k:countAlive', 'g3k:randomChance', 'g3k:randomBetween']) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ DISTINTO da trilogia Mundo de Blocos: CAVAR, não CONSTRUIR', () => {
    const types = collectTypes(behaviorStatements(minaDeCristaisProfissionalExample.ir))
    // O Mundo de Blocos PLANTA blocos na célula do chão sob o mouse (groundPoint),
    // deixa tudo SÓLIDO (makeSolid), PULA (platformerKeys) e vence no TOPO (onGround).
    // Nada disso existe na mina: o clique só REMOVE e a meta é uma contagem + tempo.
    expect(types.has('g3k:groundPoint')).toBe(false)
    expect(types.has('g3k:makeSolid')).toBe(false)
    expect(types.has('g3k:platformerKeys')).toBe(false)
    expect(types.has('g3k:onGround')).toBe(false)
    // A prova positiva de que a meta é uma quantidade correndo contra o relógio.
    const raw = JSON.stringify(behaviorStatements(minaDeCristaisProfissionalExample.ir))
    expect(raw).toContain('"cristais"')
    expect(raw).toContain('"tempo"')
  })

  it('vitória por meta e derrota por tempo: setState menu/vitória/fim + onUpdate', () => {
    const statements = behaviorStatements(minaDeCristaisProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:setScreenText', 'g3k:setState', 'g3k:hudText', 'g3k:onUpdate']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const screen of ['"menu"', '"vitoria"', '"fim"']) {
      expect(raw).toContain(screen)
    }
  })

  it('⭐ o acaso passa pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(minaDeCristaisProfissionalExample.ir))
    expect(types.has('g3k:randomBetween')).toBe(true)
    expect(types.has('g3k:setSeed')).toBe(true)
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(minaDeCristaisProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(minaDeCristaisProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(minaDeCristaisProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      minaDeCristaisProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(minaDeCristaisProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
