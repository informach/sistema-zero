import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { TIRO_SOURCE } from '../__gen_tiro'
import { gameKit3DBlocks } from '../blocks'
import { tiroAoAlvoExample } from '../examples'
import { gameKit3DManifest } from '../manifest'

/**
 * Drift do exemplo "Tiro ao Alvo" (point-and-click, v0.7.0). Prova as famílias
 * que os outros 5 exemplos NÃO exercitavam: mira & clique (mousePressed +
 * pick), avisos (on/emit), tela própria (createScreen/addButton/showScreen/
 * hideScreens), gaveta da entidade (setEntityValue/entityValue), keyPressed,
 * setSky em runtime e cameraAngle/cameraLens. A IR embutida em examples.ts foi
 * GERADA pelo parser real a partir do SOURCE em __gen_tiro.ts.
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

describe('Exemplo Tiro ao Alvo — drift contra o parser real', () => {
  it('está registrado no manifest', () => {
    expect(gameKit3DManifest.examples).toContain(tiroAoAlvoExample)
    expect(tiroAoAlvoExample.ir.extensions).toEqual([{ extensionId: 'game-3d-advanced' }])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseJS(TIRO_SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(stripIds(tiroAoAlvoExample.ir.js) as JSStatement[])
  })

  it('exercita as famílias que os outros exemplos não cobrem', () => {
    const types = collectTypes(stripIds(tiroAoAlvoExample.ir.js))
    for (const t of [
      'g3k:mousePressed',
      'g3k:pick',
      'g3k:onEvent',
      'g3k:emit',
      'g3k:createScreen',
      'g3k:addButton',
      'g3k:showScreen',
      'g3k:hideScreens',
      'g3k:setEntityValue',
      'g3k:entityValue',
      'g3k:keyPressed',
      'g3k:setSky',
      'g3k:cameraAngle',
      'g3k:cameraLens',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(stripIds(tiroAoAlvoExample.ir.js) as JSStatement[], 0)
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      tiroAoAlvoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(buildIRFromWorkspace(ws).js)
      expect(rebuilt).toEqual(stripIds(tiroAoAlvoExample.ir.js))
    } finally {
      ws.dispose()
    }
  })
})
