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
import { CORRIDA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_corridaProfissional'
import { gameKit3DBlocks } from '../blocks'
import { corridaInfinitaProfissionalExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Corrida Infinita Profissional" — o RUNNER infinito do
 * motor avançado: herói preso na pista (3 faixas + pulo com a física do kit),
 * spawns em cadência vindo de longe por setVelocity, reciclagem por cullFar,
 * moeda e barreira como ZONAS (onOverlap com filtro isMold) e dificuldade
 * crescente. A IR embutida em examples.ts foi GERADA pelo parser real a partir
 * do SOURCE (que mora no __gen_corridaProfissional.ts, importado aqui para que
 * fonte e teste NUNCA possam divergir — duas cópias do fonte é como um drift
 * passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Corrida Infinita Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DExamples).toContain(corridaInfinitaProfissionalExample)
    expect(corridaInfinitaProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(corridaInfinitaProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('exercita o esqueleto do runner: moldes, spawn contínuo e reciclagem', () => {
    const types = collectTypes(behaviorStatements(corridaInfinitaProfissionalExample.ir))
    for (const t of [
      'g3k:defineMold', // herói/barreira/moeda/árvore/pista, tudo de peças
      'g3k:part',
      'g3k:spawn', // o nascimento LONGE à frente, em cadência por dt
      'g3k:setVelocity', // o spawn vem até o herói
      'g3k:cullFar', // recicla o que passou (o pool nunca lota)
      'g3k:recycle', // a moeda coletada devolve ao pool
      'g3k:setSeed', // sorteio determinístico
      'g3k:randomBetween', // a faixa sorteada passa pelo acaso DO KIT
      'g3k:randomChance',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('o herói NÃO anda livre: física do kit (jump/onGround) + place nas faixas', () => {
    const types = collectTypes(behaviorStatements(corridaInfinitaProfissionalExample.ir))
    for (const t of ['g3k:setPhysics', 'g3k:jump', 'g3k:onGround', 'g3k:place', 'g3k:posOf']) {
      expect(types.has(t)).toBe(true)
    }
    // Sem controle livre: nem WASD pronto, nem plataforma pronta, nem seek.
    expect(types.has('g3k:moveWithKeys')).toBe(false)
    expect(types.has('g3k:platformerKeys')).toBe(false)
    expect(types.has('g3k:seek')).toBe(false)
  })

  it('moeda E barreira são zonas: onOverlap dos DOIS moldes com filtro isMold', () => {
    const statements = behaviorStatements(corridaInfinitaProfissionalExample.ir)
    const raw = JSON.stringify(statements)
    const types = collectTypes(statements)
    expect(types.has('g3k:makeTrigger')).toBe(true)
    expect(types.has('g3k:onOverlap')).toBe(true)
    expect(types.has('g3k:isMold')).toBe(true)
    // Um onOverlap POR molde (a moeda premia, a barreira derruba).
    const overlaps = raw.match(/"g3k:onOverlap"/g) ?? []
    expect(overlaps.length).toBe(2)
    for (const mold of ['"moeda"', '"obstaculo"']) {
      expect(raw).toContain(mold)
    }
    // A moeda estoura faíscas e toca som; a batida treme a câmera e encerra.
    expect(types.has('g3k:defineEffect')).toBe(true)
    expect(types.has('g3k:burstOn')).toBe(true)
    expect(types.has('g3k:playEffect')).toBe(true)
    expect(types.has('g3k:cameraShake')).toBe(true)
    expect(types.has('g3k:endGame')).toBe(true)
  })

  it('telas e HUD: menu e fim com textos + placar/tempo nos cantos', () => {
    const statements = behaviorStatements(corridaInfinitaProfissionalExample.ir)
    const types = collectTypes(statements)
    expect(types.has('g3k:setScreenText')).toBe(true)
    expect(types.has('g3k:hudText')).toBe(true)
    const raw = JSON.stringify(statements)
    for (const screen of ['"menu"', '"fim"']) {
      expect(raw).toContain(screen)
    }
  })

  it('clima e determinismo: névoa, luz, ambiente e semente', () => {
    const types = collectTypes(behaviorStatements(corridaInfinitaProfissionalExample.ir))
    for (const t of ['g3k:setFog', 'g3k:addLight', 'g3k:setAmbient', 'g3k:setSeed']) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ o acaso do exemplo passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(corridaInfinitaProfissionalExample.ir))
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(corridaInfinitaProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(corridaInfinitaProfissionalExample.ir))
    // Nenhuma peça com a forma "modelo importado"…
    expect(raw).not.toContain('"shape":"modelo"')
    // …e o campo model de TODA peça está vazio (o part sempre serializa o campo).
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(corridaInfinitaProfissionalExample.ir)).not.toContain('—')
    expect(corridaInfinitaProfissionalExample.name).not.toContain('—')
    expect(corridaInfinitaProfissionalExample.description ?? '').not.toContain('—')
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(corridaInfinitaProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      corridaInfinitaProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(corridaInfinitaProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
