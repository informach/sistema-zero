import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement, normalizeSZIR } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { SOBREVIVENTE_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_sobreviventeProfissional'
import { gameKitBlocks } from '../blocks'
import { sobreviventeProfissionalExample } from '../examples'
import { withIndependentPeriodicLoops } from '../examples/withIndependentPeriodicLoops'
import { gameKitManifest } from '../manifest'

/**
 * Drift do exemplo "Sobrevivente Profissional" — o nível 2 da família Vampire
 * Survivor (Clear Code) sobre o motor avançado. A IR embutida foi GERADA pelo
 * parser real a partir do SOURCE (que mora no __gen_sobreviventeProfissional.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir).
 */

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key !== '__id') out[key] = stripIds(child)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, out)
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.type === 'string') out.add(record.type)
    for (const child of Object.values(record)) collectTypes(child, out)
  }
  return out
}

function parseExampleLifecycleSource(source: string): JSStatement[] {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(source),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const lifted = withIndependentPeriodicLoops({
    name: sobreviventeProfissionalExample.name,
    experience: 'game',
    ir: normalized,
  })
  return JSON.parse(JSON.stringify(behaviorStatements(lifted.ir))) as JSStatement[]
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKitBlocks)
})

describe('Exemplo Sobrevivente Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d-advanced', () => {
    expect(gameKitManifest.examples).toContain(sobreviventeProfissionalExample)
    expect(sobreviventeProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-2d-advanced' },
    ])
    expect(sobreviventeProfissionalExample.name).toBe('Sobrevivente Profissional')
    expect(sobreviventeProfissionalExample.experience).toBe('game')
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE))
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(sobreviventeProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('mundo com câmera + horda com pool que persegue', () => {
    const types = collectTypes(behaviorStatements(sobreviventeProfissionalExample.ir))
    for (const t of [
      'gk:cameraFollow', // mundo maior que a tela, rola atrás do herói
      'gk:defineMold', // monstro e bala são DADOS
      'gk:defineLook', // visual 100% desenhado por código
      'gk:startSpawner', // horda contínua numa borda
      'gk:seek', // os monstros perseguem o herói
      'gk:forEachActive',
      'gk:cullOffscreen', // a lição de otimização (pool)
      'gk:recycle',
      'gk:overlapGroups', // bala x monstro
      'gk:spawnNamed', // const bala = spawnFromMold(...)
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(sobreviventeProfissionalExample.assets ?? []).toHaveLength(0)
  })

  it('mira contínua no MOUSE + combate P24 (o que o motor avançado traz)', () => {
    const types = collectTypes(behaviorStatements(sobreviventeProfissionalExample.ir))
    for (const t of [
      'gk:mouseX', // a arma mira no cursor...
      'gk:mouseY',
      'gk:launchToPoint', // ...e a bala vai para o ponto do mouse
      'gk:cooldownReady', // no ritmo do cooldown (auto-fire)
      'gk:touchCircle', // encostar no herói...
      'gk:isInvincible', // ...só machuca fora dos i-frames
      'gk:hurt',
      'gk:knockback',
      'gk:isDead',
      'gk:drawHealthBar',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('PROGRESSÃO: EXP por inimigo sobe de nível e acelera a arma', () => {
    const statements = behaviorStatements(sobreviventeProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:floatText', 'gk:missionKill', 'gk:setMission', 'gk:drawBar']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    // Subir de nível quando a EXP enche (exp >= nivel * 4)...
    expect(raw).toContain(
      '"op":">=","left":{"type":"var","name":"exp"},"right":{"type":"binop","op":"*","left":{"type":"var","name":"nivel"},"right":{"type":"num","value":4}}',
    )
    // ...encurta a cadência (arma mais rápida) até um piso de 0,14s.
    expect(raw).toContain(
      '"op":">","left":{"type":"var","name":"cadencia"},"right":{"type":"num","value":0.14}',
    )
    // A cadência do tiro é uma VARIÁVEL (não um número fixo).
    expect(raw).toContain(
      '"type":"gk:cooldownReady","charVar":"heroi","seconds":{"type":"var","name":"cadencia"}',
    )
  })

  it('recorde persistente + event bus da morte', () => {
    const statements = behaviorStatements(sobreviventeProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['gk:saveValue', 'gk:savedValue', 'gk:onEvent', 'gk:emit', 'gk:cameraShake']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"recorde"')
    expect(raw).toContain('heroi:morreu') // a morte é um AVISO, não código duplicado
  })

  it('não mistura kits: zero RPG/monstrinhos/luta e zero blocos do Jogo 2D básico', () => {
    const types = collectTypes(behaviorStatements(sobreviventeProfissionalExample.ir))
    for (const type of types) {
      expect(type.startsWith('gk:rpg')).toBe(false)
      expect(type.startsWith('gk:pkm')).toBe(false)
      expect(type.startsWith('gk:luta')).toBe(false)
      expect(type.startsWith('g2d:')).toBe(false)
    }
  })

  it('textos visíveis sem travessão', () => {
    expect(JSON.stringify(sobreviventeProfissionalExample.ir)).not.toContain('—')
    expect(sobreviventeProfissionalExample.description ?? '').not.toContain('—')
    expect((sobreviventeProfissionalExample.description ?? '').length).toBeLessThanOrEqual(220)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(sobreviventeProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      sobreviventeProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(sobreviventeProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
