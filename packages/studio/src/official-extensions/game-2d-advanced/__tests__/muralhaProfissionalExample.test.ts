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
import { MURALHA_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_muralhaProfissional'
import { gameKitBlocks } from '../blocks'
import { muralhaProfissionalExample } from '../examples'

/**
 * Drift do exemplo "Muralha do Reino Profissional" — o tower-defense do Chris
 * Courses sobre o 🏰 Kit Defesa de Torre do motor avançado. A IR embutida em
 * examples/ foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_muralhaProfissional.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir — duas cópias do fonte é como um drift passa despercebido).
 *
 * O jogo NÃO tem "A cada N segundos", então não passa pelo
 * withIndependentPeriodicLoops (as ondas vêm por tdWave/onda:limpa).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Muralha do Reino Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitExamples).toContain(muralhaProfissionalExample)
    expect(muralhaProfissionalExample.ir.extensions).toEqual([{ extensionId: 'game-2d-advanced' }])
    expect(muralhaProfissionalExample.name).toBe('Muralha do Reino Profissional')
    expect(muralhaProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE, true))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(muralhaProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('usa a arquitetura do Kit Defesa de Torre: caminho, lugares, ondas e mira', () => {
    const types = collectTypes(behaviorStatements(muralhaProfissionalExample.ir))
    for (const t of [
      'gk:definePath', // o caminho por waypoints do original
      'gk:pathPoint',
      'gk:tdSlot', // os placement tiles: os lugares de comprar torre
      'gk:tdOnBuy', // comprar por 50 moedas (o coins - 50 >= 0 do original)
      'gk:tdWave', // as ondas de orcs
      'gk:tdSetCoins',
      'gk:tdAddCoins', // +25 por orc derrotado (o coins += 25 do original)
      'gk:tdCoins',
      'gk:pickActive', // a torre mira o invasor MAIS avançado (validEnemies[0])
      'gk:distanceBetween', // ...dentro do alcance (o radius do original)
      'gk:launchTowards', // ...e atira nele
      'gk:cooldownReady', // recarga da torre
      'gk:defineMold', // orc/torre/tiro são DADOS, não personagens à mão
      'gk:defineLook', // visual 100% desenhado por código, sem assets
      'gk:tdDrawSlots',
      'gk:tdDrawRange',
      'gk:drawHearts', // os corações (hearts) do original
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(muralhaProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('projétil pooled + dano + recompensa: hurt, isDead, recycle, burst', () => {
    const types = collectTypes(behaviorStatements(muralhaProfissionalExample.ir))
    for (const t of [
      'gk:spawnNamed', // o tiro nasce com apelido p/ mirar
      'gk:forEachActive',
      'gk:moveByVelocity',
      'gk:cullOffscreen', // o tiro fora da tela volta ao pool
      'gk:overlapGroups', // tiro × invasor
      'gk:hurt', // tira 20 de vida (enemy.health -= 20)
      'gk:isDead',
      'gk:recycle', // devolve tiro e orc ao pool
      'gk:burst', // explosão por EFEITO pooled
      'gk:defineEffect',
      'gk:floatText', // o "+25" que sobe
      'gk:drawHealthBar', // a barra de vida do orc
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('economia + fim de jogo pelo event bus (compra, vazamento, onda limpa)', () => {
    const statements = behaviorStatements(muralhaProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:onEvent', 'gk:endGame', 'gk:cameraShake']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // Coração a menos quando um orc passa (o hearts -= 1 do original).
    expect(raw).toContain('invasor:passou')
    expect(raw).toContain(
      '"name":"vidas","value":{"type":"binop","op":"-","left":{"type":"var","name":"vidas"},"right":{"type":"num","value":1}}',
    )
    // A onda cresce +2 a cada onda limpa (o enemyCount += 2 do original).
    expect(raw).toContain('onda:limpa')
    expect(raw).toContain(
      '"name":"leva","value":{"type":"binop","op":"+","left":{"type":"var","name":"leva"},"right":{"type":"num","value":2}}',
    )
    // Compra negada quando falta moeda: o kit avisa (o coins - 50 >= 0 do original).
    expect(raw).toContain('compra:negada')
  })

  it('não mistura kits: zero RPG/monstrinhos/luta e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(muralhaProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(muralhaProfissionalExample.ir)).not.toContain('—')
    expect(muralhaProfissionalExample.description ?? '').not.toContain('—')
    expect((muralhaProfissionalExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(muralhaProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      muralhaProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(muralhaProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKitExamples } from '../exampleCatalog'
