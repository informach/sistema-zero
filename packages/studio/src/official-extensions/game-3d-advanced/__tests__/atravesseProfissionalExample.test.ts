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
import { ATRAVESSE_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_atravesseProfissional'
import { gameKit3DBlocks } from '../blocks'
import { atravesseProfissionalExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Atravesse a Rua Profissional" — o Crossy Road (hopper voxel
 * do Hunor Borbely) recriado no motor avançado: o boneco pula em grade
 * (keyPressed muda a célula-alvo + seekPoint desliza até ela) e atravessa
 * faixas onde CARROS cruzam a pista (spawnados no onUpdate com setVelocity +
 * cullFar). Cada carro é uma zona (makeTrigger); o onOverlap filtra o visitante
 * por isMold("heroi") e dá o atropelamento (hurt -> onEntityDeath -> endGame).
 * A IR embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE
 * (que mora no __gen_atravesseProfissional.ts, importado aqui para que fonte e
 * teste NUNCA possam divergir).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Atravesse a Rua Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DExamples).toContain(atravesseProfissionalExample)
    expect(atravesseProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(atravesseProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('exercita o esqueleto do hopper: moldes, pulo em grade e carros em cadência', () => {
    const types = collectTypes(behaviorStatements(atravesseProfissionalExample.ir))
    for (const t of [
      'g3k:defineMold', // heroi e carro, tudo de peças
      'g3k:part',
      'g3k:setPhysics', // heroi = personagem
      'g3k:keyPressed', // pulo em grade pelas setas/WASD
      'g3k:seekPoint', // desliza suave até a célula-alvo
      'g3k:spawnNamed', // os carros nascem em cadência (com apelido) no onUpdate
      'g3k:setVelocity', // e cruzam a pista
      'g3k:forEachAlive', // recicla o carro que saiu da faixa (por X off-lane, não pela origem)
      'g3k:posOf',
      'g3k:recycle',
      'g3k:makeTrigger', // o carro é a zona
      'g3k:onOverlap',
      'g3k:isMold', // o atropelamento filtra o visitante por heroi
      'g3k:hurt',
      'g3k:onEntityDeath',
      'g3k:endGame',
      'g3k:setState', // faixa 20 = vitória
      'g3k:setSeed', // sorteio determinístico
      'g3k:randomBetween',
      'g3k:randomChance',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('o carro é a ÚNICA zona e o atropelamento passa pelo filtro de molde', () => {
    const raw = JSON.stringify(behaviorStatements(atravesseProfissionalExample.ir))
    const overlaps = raw.match(/"g3k:onOverlap"/g) ?? []
    expect(overlaps.length).toBe(1)
    expect(raw).toContain('"heroi"')
    expect(raw).toContain('"carro"')
  })

  it('⭐ o acaso passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(atravesseProfissionalExample.ir))
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(atravesseProfissionalExample.ir)).not.toContain('Math.random')
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(atravesseProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('nenhum texto visível usa travessão e a descrição cabe no teto', () => {
    expect(JSON.stringify(atravesseProfissionalExample.ir)).not.toContain('—')
    expect(atravesseProfissionalExample.name).not.toContain('—')
    expect(atravesseProfissionalExample.description ?? '').not.toContain('—')
    expect((atravesseProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(atravesseProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      atravesseProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(atravesseProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
