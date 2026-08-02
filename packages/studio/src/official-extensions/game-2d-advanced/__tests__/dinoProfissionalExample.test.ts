import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import { collectTypes, parseExampleLifecycleSource, stripIds } from './exampleContractHarness'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { DINO_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_dinoProfissional'
import { gameKitBlocks } from '../blocks'
import { dinoProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Dino Corredor Profissional" — o nível 2 da família Dino
 * sobre o motor avançado. A IR embutida em examples/ foi GERADA pelo parser
 * real a partir do SOURCE (que mora no __gen_dinoProfissional.ts, importado
 * aqui para que fonte e teste NUNCA possam divergir — duas cópias do fonte é
 * como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Dino Corredor Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(dinoProfissionalExample)
    expect(dinoProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(dinoProfissionalExample.name).toBe('Dino Corredor Profissional')
    expect(dinoProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(dinoProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('usa a arquitetura do runner: molde + nascedouro + reciclagem + limpeza', () => {
    const types = collectTypes(behaviorStatements(dinoProfissionalExample.ir))
    for (const t of [
      'gk:defineMold', // cacto/passaro/chao são DADOS, não personagens à mão
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:everySeconds', // o nascedouro contínuo (startSpawner nasce em borda sorteada)
      'gk:spawnFromMold',
      'gk:forEachActive',
      'gk:recycle', // devolve ao pool o obstáculo saltado (com bônus)
      'gk:cullOffscreen', // a lição de otimização: SEMPRE pareado com o nascedouro
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(dinoProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('física do kit + hitbox perdoadora + animação por estado', () => {
    const types = collectTypes(behaviorStatements(dinoProfissionalExample.ir))
    for (const t of [
      'gk:applyGravity', // ordem canônica: gravidade → mover → colidir
      'gk:moveByVelocity',
      'gk:collideGroup', // o chão é um molde sólido, não um y mágico
      'gk:jump',
      'gk:isOnGround',
      'gk:setHitbox', // a colisão perdoadora: caixa MENOR que o desenho
      'gk:setEntityState', // correndo no chão…
      'gk:stateLook', // …e visual por estado (correndo/pulando)
      'gk:autoAnimate',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('recorde persistente + event bus + dificuldade progressiva', () => {
    const statements = behaviorStatements(dinoProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:saveValue', 'gk:savedValue', 'gk:onEvent', 'gk:emit', 'gk:playEffect']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"recorde"') // o valor salvo tem nome estável
    expect(raw).toContain('dino:bateu') // a colisão é um AVISO, não código duplicado
    expect(raw).toContain('"velocidade"') // a velocidade é variável e cresce no update
  })

  it('não mistura kits: zero RPG/monstrinhos e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(dinoProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(dinoProfissionalExample.ir)).not.toContain('—')
    expect(dinoProfissionalExample.description ?? '').not.toContain('—')
    expect((dinoProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(dinoProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      dinoProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(dinoProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
