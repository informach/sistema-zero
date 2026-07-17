import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import type { JSStatement, SZIR } from '../../ir/schema'

/**
 * Rodada 2 do Canvas 3D — 4º macro de efeito: GRAMA 🌿. UM bloco cria um campo de
 * grama com MILHARES de folhas num único draw call (InstancedMesh) + um shader de
 * VENTO (GLSL escondido dentro do macro, como a usuária pediu). Um 2º bloco
 * ("fazer a grama balançar") avança o `time` do shader no laço.
 *
 * ⚠️ Diferente dos outros efeitos, o código gerado NÃO é 0-raw: o `ShaderMaterial`
 * com os shaders GLSL (template literals multi-linha) é opaco para o parser de
 * blocos — vira "código avançado" (rawJS) no reverse, o que é ESPERADO (GLSL não é
 * programável com blocos). O que importa: o macro expande a receita certa e
 * sobrevive block→IR→block (pelo nó dedicado, sem tocar o parser).
 */

function fromIR(js: JSStatement[]): { code: string; state: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      code: generateJS({ statements: buildIRFromWorkspace(ws).js }),
      state: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

const grass: JSStatement[] = [
  { type: 'importStar', name: 'THREE', module: 'three' },
  {
    type: 'grassSetup',
    grass: 'grama',
    scene: 'scene',
    count: { type: 'num', value: 5000 },
    size: { type: 'num', value: 1 },
    spread: { type: 'num', value: 50 },
    color: { type: 'color', value: '#4a7c2a' },
  },
  { type: 'grassTime', grass: 'grama' },
]

describe('Canvas 3D — macro Grama 🌿 (bloco sz_t3d_grass)', () => {
  it('expande a grama INSTANCIADA + shader de vento (GLSL) na grafia atual', () => {
    const code = generateJS({ statements: grass })
    // instanciação (1 draw call para milhares de folhas)
    expect(code).toContain('const grama = new THREE.InstancedMesh(gramaBlade, gramaMat, 5000);')
    expect(code).toContain('const gramaDummy = new THREE.Object3D();')
    expect(code).toContain('for (let i = 0; i < 5000; i++) {')
    expect(code).toContain('grama.setMatrixAt(i, gramaDummy.matrix);')
    expect(code).toContain('grama.instanceMatrix.needsUpdate = true;')
    // o shader de vento (GLSL escondido dentro do macro)
    expect(code).toContain('const gramaMat = new THREE.ShaderMaterial({')
    expect(code).toContain('uniform float time;')
    expect(code).toContain('gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix')
    expect(code).toContain('scene.add(grama);')
    // a animação do vento
    expect(code).toContain('grama.material.uniforms.time.value += 0.02;')
    // o JS gerado é sintaticamente válido (as crases dos shaders fecham certo)
    expect(() => new Function(code.replace(/^import .*/gm, ''))).not.toThrow()
  })

  it('block→IR→block preserva os macros (sz_t3d_grass + sz_t3d_grass_wave) e regenera igual', () => {
    const direct = generateJS({ statements: grass })
    const { code, state } = fromIR(grass)
    expect(state).toContain('"sz_t3d_grass"')
    expect(state).toContain('"sz_t3d_grass_wave"')
    expect(code).toBe(direct)
  })
})
