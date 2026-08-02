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
import { PATRULHA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_patrulhaProfissional'
import { gameKit3DBlocks } from '../blocks'
import { patrulhaEspacialProfissionalExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Patrulha Espacial Profissional" — o Space Shooter do curso
 * raylib no motor avançado: nave presa no eixo X (keyDown + clamp + place) com
 * balanço senoidal, tiro por keyPressed + spawnFrom + moveForward com COOLDOWN
 * de 0,4 s, e a ⭐ MORTE DRAMÁTICA do manifest (meteoro atingido congela no
 * estado "morrendo" e só explode 0,25 s depois). A IR embutida em examples.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_patrulhaProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Patrulha Espacial Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DExamples).toContain(patrulhaEspacialProfissionalExample)
    expect(patrulhaEspacialProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(patrulhaEspacialProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('exercita o esqueleto do shooter: moldes, spawn em cadência e reciclagem', () => {
    const types = collectTypes(behaviorStatements(patrulhaEspacialProfissionalExample.ir))
    for (const t of [
      'g3k:defineMold', // nave/laser/meteoro, tudo de peças
      'g3k:part',
      'g3k:spawnNamed', // o meteoro nasce LONGE à frente (com apelido), em cadência por dt
      'g3k:setVelocity', // velocidade sorteada somada à base crescente
      'g3k:cullFar', // recicla o que passou (o pool nunca lota)
      'g3k:recycle',
      'g3k:setSeed', // sorteio determinístico
      'g3k:randomBetween',
      'g3k:setEntityValue', // o giro do meteoro vive numa gaveta por entidade
      'g3k:entityValue',
      'g3k:setYaw',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('a nave NÃO anda livre: keyDown + clamp em gaveta + place, tiro por keyPressed', () => {
    const statements = behaviorStatements(patrulhaEspacialProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:keyDown',
      'g3k:keyPressed',
      'g3k:place',
      'g3k:setPhysics',
      'g3k:spawnFrom', // o tiro nasce no lugar da nave, virado igual
      'g3k:moveForward', // e voa pela frente +Z do kit
      'mathUnary', // o balanço senoidal (Math.sin sobre o relógio somado)
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Sem controle pronto: nem WASD, nem plataforma, nem 1a pessoa, nem seek.
    expect(types.has('g3k:moveWithKeys')).toBe(false)
    expect(types.has('g3k:platformerKeys')).toBe(false)
    expect(types.has('g3k:moveFps')).toBe(false)
    expect(types.has('g3k:seek')).toBe(false)
    // ⭐ O cooldown de 0,4 s existe DESDE O INÍCIO (lição do review do Lote C).
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"proximoTiro"')
    expect(raw).toContain('0.4')
  })

  it('⭐ morte dramática: o meteoro atingido congela em "morrendo" e só some depois', () => {
    const statements = behaviorStatements(patrulhaEspacialProfissionalExample.ir)
    const types = collectTypes(statements)
    const raw = JSON.stringify(statements)
    // A FSM da morte: estado próprio + transição por tempo + reciclagem na saída.
    expect(types.has('g3k:setEntityState')).toBe(true)
    expect(types.has('g3k:stateTimer')).toBe(true)
    expect(types.has('g3k:onEnterEntityState')).toBe(true)
    expect(types.has('g3k:entityStateIs')).toBe(true)
    expect(raw).toContain('"morrendo"')
    expect(raw).toContain('"acabou"')
    expect(raw).toContain('0.25')
    // A zona é UMA só (o meteoro): laser e nave são visitantes do mesmo gancho,
    // filtrados por isMold + entityStateIs (morrendo não machuca nem conta duplo).
    expect(types.has('g3k:makeTrigger')).toBe(true)
    expect(types.has('g3k:isMold')).toBe(true)
    const overlaps = raw.match(/"g3k:onOverlap"/g) ?? []
    expect(overlaps.length).toBe(1)
    // O clarão da morte + a explosão atrasada.
    expect(types.has('g3k:defineEffect')).toBe(true)
    expect(types.has('g3k:burstOn')).toBe(true)
  })

  it('combate e clima: vidas com tremor, turbina, telas e HUD', () => {
    const statements = behaviorStatements(patrulhaEspacialProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:hurt', // a batida tira 1 das 3 vidas (i-frames do motor)
      'g3k:onHurt',
      'g3k:cameraShake',
      'g3k:onEntityDeath',
      'g3k:endGame',
      'g3k:cameraFollow', // a câmera fixa atrás/acima da nave
      'g3k:cameraSmooth',
      'g3k:defineEmitter', // a turbina jorra atrás da nave
      'g3k:emitterOn',
      'g3k:setFog',
      'g3k:addLight',
      'g3k:setAmbient',
      'g3k:setScreenText',
      'g3k:hudText',
      'g3k:setState', // 20 destruídos = vitória
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const screen of ['"menu"', '"fim"', '"vitoria"']) {
      expect(raw).toContain(screen)
    }
  })

  it('⭐ o acaso do exemplo passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(patrulhaEspacialProfissionalExample.ir))
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(
      JSON.stringify(behaviorStatements(patrulhaEspacialProfissionalExample.ir)),
    ).not.toContain('Math.random')
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(patrulhaEspacialProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(patrulhaEspacialProfissionalExample.ir)).not.toContain('—')
    expect(patrulhaEspacialProfissionalExample.name).not.toContain('—')
    expect(patrulhaEspacialProfissionalExample.description ?? '').not.toContain('—')
    expect((patrulhaEspacialProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(patrulhaEspacialProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      patrulhaEspacialProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(patrulhaEspacialProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
