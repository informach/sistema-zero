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
import { GUARDIAO_SOURCE as SOURCE } from '../__gen_guardiao'
import { gameKit3DBlocks } from '../blocks'
import { guardiaoDoPortalExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Guardião do Portal" — a vitrine dos consertos da v0.4.0: WASD
 * relativo à câmera, tipos de física por molde e quique dos dois lados. A IR
 * embutida em examples.ts foi GERADA pelo parser real a partir do SOURCE (que
 * mora no __gen_guardiao.ts, importado aqui para que fonte e teste NUNCA possam
 * divergir — duas cópias do fonte é como um drift passa despercebido).
 */

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Guardião do Portal — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(guardiaoDoPortalExample)
    expect(guardiaoDoPortalExample.ir.extensions).toEqual([{ extensionId: 'game-3d-advanced' }])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(guardiaoDoPortalExample.ir)) as JSStatement[],
    )
  })

  it('exercita o que a v0.5.0 abriu', () => {
    const types = collectTypes(behaviorStatements(guardiaoDoPortalExample.ir))
    for (const t of [
      'g3k:startTimer', // o relogio da crianca — nao existia bloco de tempo
      'g3k:onTimerEnd', // a condicao de vitoria por tempo
      'g3k:timeLeft', // ...e o HUD lendo ele
      'g3k:say', // o balao ancorado na entidade (o jogo conta historia)
      'g3k:randomBetween', // o sorteio DO KIT
      'g3k:randomChance', // ...idem
      'g3k:setSeed', // ...que so vale por causa deste
      'g3k:setPhysics',
      'g3k:cameraShake',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('⭐ o acaso do exemplo passa TODO pelo sorteio do kit (senao a semente mente)', () => {
    // O bloco "numero aleatorio" do NUCLEO emite Math.random() puro e IGNORA a
    // semente. Um so dele aqui e o "mesma semente = mesma partida" que o setSeed
    // promete deixaria de valer — e o exemplo estaria ensinando errado.
    const types = collectTypes(behaviorStatements(guardiaoDoPortalExample.ir))
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(guardiaoDoPortalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(guardiaoDoPortalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      guardiaoDoPortalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(guardiaoDoPortalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
