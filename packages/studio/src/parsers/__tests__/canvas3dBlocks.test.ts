import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { behaviorStatements } from '../../ir/behavior'
import type { SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * Round-trip de BLOCOS dos 3 blocos da Canvas 3D: código → IR → blocos → IR →
 * código, byte-estável. Prova que `sz_t3d_import`/`sz_t3d_new_var`/`sz_t3d_new`
 * (o `new THREE.X()` com namespace) sobrevivem à ida e volta pela Ponte.
 */

function stripIds<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripIds) as unknown as T
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(val)
    }
    return out as T
  }
  return v
}

const SRC = [
  "import * as THREE from 'three';",
  'const scene = new THREE.Scene();',
  'const cam = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);',
  'scene.add(new THREE.Mesh(geo, mat));',
].join('\n')

describe('Canvas 3D — round-trip de blocos', () => {
  it('IR → blocos → IR devolve a MESMA IR (0 raw)', () => {
    ensureBlocklyInitialized()
    const ir = parseJS(SRC)
    // 0 raw
    const flat = JSON.stringify(ir)
    expect(flat).not.toContain('"rawJS"')
    // usa os blocos t3d (não os genéricos)
    const irObj: SZIR = { html: [], css: [], js: ir, extensions: [] }
    const state = buildWorkspaceStateFromIR(irObj)
    const stateJson = JSON.stringify(state)
    expect(stateJson).toContain('"sz_t3d_import"')
    expect(stateJson).toContain('"sz_t3d_new_var"')
    expect(stateJson).toContain('"sz_t3d_new"') // o Mesh como VALOR em scene.add(...)

    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = behaviorStatements(buildIRFromWorkspace(ws))
      expect(stripIds(rebuilt)).toEqual(stripIds(ir))
    } finally {
      ws.dispose()
    }
  })
})
