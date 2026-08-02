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
import { CHUVA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_chuvaProfissional'
import { gameKitBlocks } from '../blocks'
import { chuvaProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Chuva de Meteoros Profissional" — o nível 2 da família
 * Space Shooter (raylib_intro) sobre o motor avançado. A IR embutida em
 * examples/ foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_chuvaProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Chuva de Meteoros Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(chuvaProfissionalExample)
    expect(chuvaProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(chuvaProfissionalExample.name).toBe('Chuva de Meteoros Profissional')
    expect(chuvaProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(chuvaProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('usa a arquitetura do shooter: molde + pool + nascedouro em variável + culling', () => {
    const types = collectTypes(behaviorStatements(chuvaProfissionalExample.ir))
    for (const t of [
      'gk:defineMold', // meteoro e laser são DADOS, não personagens à mão
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:everySeconds', // o nascedouro contínuo (startSpawner nasce em borda sorteada)
      'gk:spawnNamed', // const pedra/tiro = spawnFromMold(...) com apelido
      'gk:forEachActive',
      'gk:recycle', // laser × meteoro devolve os DOIS ao pool
      'gk:cullOffscreen', // o culling ±300 do original, nos dois moldes
      'gk:overlapGroups',
      'gk:setAngle', // o giro contínuo do Meteor original, por estado
      'gk:angleOf',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(chuvaProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('nave nas 4 direções + hitbox perdoadora + tiro edge-trigger com recarga', () => {
    const types = collectTypes(behaviorStatements(chuvaProfissionalExample.ir))
    for (const t of [
      'gk:moveWithKeys', // WASD+setas com diagonal normalizada (o input original)
      'gk:keepOnScreen', // o constraint() do original
      'gk:setHitbox', // a colisão perdoadora: caixa MENOR que o desenho
      'gk:leanOnMove', // a nave tomba ao voar de lado
      'gk:stateLook',
      'gk:autoAnimate',
      'gk:keyPressed', // espaço edge-trigger: 1 tiro por aperto
      'gk:cooldownReady', // recarga de 0,25s
      'gk:setVelocity', // o laser sobe (vy negativo), o meteoro cai sorteado
      'gk:moveByVelocity',
      'gk:naveStarfield', // as 30 estrelas do original
      'gk:defineEffect', // a explosão é EFEITO pooled
      'gk:burst',
      'gk:playEffect',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('dificuldade progressiva: a cadência ENCURTA e a queda CRESCE com o dt', () => {
    const statements = behaviorStatements(chuvaProfissionalExample.ir)
    const raw = JSON.stringify(statements)
    // A cadência do nascedouro é uma VARIÁVEL (não um número fixo)...
    expect(raw).toContain('"type":"gk:everySeconds","seconds":{"type":"var","name":"cadencia"}')
    // ...que encurta com o dt até um piso (0,35s)...
    expect(raw).toContain(
      '"op":">","left":{"type":"var","name":"cadencia"},"right":{"type":"num","value":0.35}',
    )
    // ...enquanto a velocidade de queda sobe até um teto (430).
    expect(raw).toContain(
      '"op":"<","left":{"type":"var","name":"queda"},"right":{"type":"num","value":430}',
    )
    // Placar POR TEMPO (o int(get_time()) do original): 1 ponto por segundo.
    const everySeconds = raw.match(/"type":"gk:everySeconds"/g) ?? []
    expect(everySeconds.length).toBe(2)
    expect(raw).toContain(
      '"name":"pontos","value":{"type":"binop","op":"+","left":{"type":"var","name":"pontos"},"right":{"type":"num","value":1}}',
    )
  })

  it('recorde persistente + event bus da batida', () => {
    const statements = behaviorStatements(chuvaProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:saveValue', 'gk:savedValue', 'gk:onEvent', 'gk:emit', 'gk:cameraShake']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"recorde"') // o valor salvo tem nome estável
    expect(raw).toContain('nave:bateu') // a colisão é um AVISO, não código duplicado
  })

  it('não mistura kits: zero RPG/monstrinhos/luta e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(chuvaProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(chuvaProfissionalExample.ir)).not.toContain('—')
    expect(chuvaProfissionalExample.description ?? '').not.toContain('—')
    expect((chuvaProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(chuvaProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      chuvaProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(chuvaProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
