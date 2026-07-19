import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import type { JSStatement, SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * Rodada 2 do Canvas 3D — 3º macro de efeito: ÁGUA 🌊. UM bloco cria um plano
 * d'água que REFLETE a cena (o addon `Water` do three.js) — SEM depender de um
 * arquivo de textura externo: o normal map das ondinhas é gerado na hora
 * (DataTexture 16×16 procedural). O import de `Water` entra sozinho (hoist), como
 * no Brilho. Um 2º bloco ("fazer a água ondular") anima o uniform `time` no laço.
 *
 * Provas: o código gerado é 100% buildável (0 rawJS); o macro expande a receita
 * certa + injeta o import; block→IR→block preserva os blocos.
 */

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

function fromIR(js: JSStatement[]): { code: string; state: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      code: generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) }),
      state: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

const water: JSStatement[] = [
  { type: 'importStar', name: 'THREE', module: 'three' },
  {
    type: 'waterSetup',
    water: 'agua',
    scene: 'scene',
    size: { type: 'num', value: 2000 },
    color: { type: 'color', value: '#0a3d5c' },
  },
  { type: 'waterTime', water: 'agua', dt: { type: 'num', value: 1 / 60 } },
]

describe('Canvas 3D — macro Água 🌊 (bloco sz_t3d_water)', () => {
  it('expande a receita do Water + normal map procedural + injeta o import de Water', () => {
    const code = generateJS({ statements: water })
    // o import do addon entra sozinho
    expect(code).toContain("import { Water } from 'three/addons/objects/Water.js';")
    // normal map procedural (sem arquivo externo)
    expect(code).toContain('const aguaDados = new Uint8Array(1024);')
    expect(code).toContain('const aguaNormais = new THREE.DataTexture(aguaDados, 16, 16);')
    expect(code).toContain('aguaNormais.wrapS = THREE.RepeatWrapping;')
    // o Water na grafia atual
    expect(code).toContain(
      'const agua = new Water(new THREE.PlaneGeometry(aguaTamanho, aguaTamanho), {',
    )
    expect(code).toContain('waterColor: "#0a3d5c"')
    expect(code).toContain('agua.rotation.x = -Math.PI / 2;')
    expect(code).toContain('scene.add(agua);')
    // a animação das ondas
    expect(code).toContain('agua.material.uniforms.time.value += Math.max(0, Math.min(0.1')
  })

  it('o código gerado é 100% buildável (0 rawJS no reverse)', () => {
    expect(collectTypes(parseJS(generateJS({ statements: water }))).has('rawJS')).toBe(false)
  })

  it('block→IR→block preserva os macros (sz_t3d_water + sz_t3d_water_wave) e regenera igual', () => {
    const direct = generateJS({ statements: water })
    const { code, state } = fromIR(water)
    expect(state).toContain('"sz_t3d_water"')
    expect(state).toContain('"sz_t3d_water_wave"')
    expect(code).toBe(direct)
  })
})
