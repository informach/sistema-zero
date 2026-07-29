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
 * Macro "Letreiro 3D" (`sz_t3d_sign` → nó `signSetup`) — o jeito FOLIO de texto no
 * mundo: desenha num canvas oculto, vira CanvasTexture num plano transparente
 * (o folio-2025 real NUNCA usa TextGeometry; todo texto 3D dele é canvas 2D).
 *
 * Três provas (espelho do canvas3dBloomFixture):
 *   (1) a CENA por código (o letreiro escrito à mão) round-trippa 0-raw + fixpoint —
 *       o idioma inteiro é buildável no núcleo, bloco a bloco;
 *   (2) o MACRO expande a grafia exata e a EXPANSÃO reparseia 0-raw (diferente da
 *       grama, aqui não há GLSL: todo o miolo volta como blocos);
 *   (3) o bloco sobrevive a block→IR→block e regenera igual ao direto.
 */

const SIGN_SCENE = `
import * as THREE from 'three';
const canvas = document.getElementById("mundo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(800, 600);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 100);
camera.position.set(0, 2, 8);
const placaTela = document.createElement("canvas");
placaTela.width = 512;
placaTela.height = 256;
const placaTinta = placaTela.getContext("2d");
placaTinta.fillStyle = "#ffffff";
placaTinta.font = "bold 120px sans-serif";
placaTinta.textAlign = "center";
placaTinta.textBaseline = "middle";
placaTinta.fillText("BEM-VINDO", 256, 128);
const placaTex = new THREE.CanvasTexture(placaTela);
const placa = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: placaTex, transparent: true }));
placa.position.set(0, 2, 0);
scene.add(placa);
renderer.render(scene, camera);
`.trim()

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

/** IR → blocos → IR → código (para provar o round-trip de blocos). */
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

describe('Canvas 3D — letreiro por código round-trip 0-raw', () => {
  it('canvas oculto → CanvasTexture → plano é 100% buildável (0 raw, fixpoints)', () => {
    const ir = parseJS(SIGN_SCENE)
    expect(collectTypes(ir).has('rawJS')).toBe(false)
    const code = generateJS({ statements: ir })
    expect(generateJS({ statements: parseJS(code) })).toBe(code) // fixpoint textual
    const { code: rebuilt, state } = fromIR(ir)
    expect(rebuilt).toBe(code) // fixpoint de blocos
    expect(state).not.toContain('sz_adv_raw_js')
    // os facilitadores 3D reconhecem as formas canônicas (gate ligado pelo import)
    expect(state).toContain('"sz_t3d_set_position"')
    expect(state).toContain('"sz_t3d_add_to"')
  })
})

describe('Canvas 3D — macro Letreiro (bloco sz_t3d_sign)', () => {
  const sign: JSStatement = {
    type: 'signSetup',
    sign: 'placa',
    scene: 'cena',
    text: 'BEM-VINDO',
    size: { type: 'num', value: 6 },
    color: { type: 'color', value: '#ffffff' },
  }

  it('expande a receita exata (canvas 512×256 + CanvasTexture + plano transparente)', () => {
    const code = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, sign],
    })
    expect(code).toContain('const placaTela = document.createElement("canvas");')
    expect(code).toContain('placaTela.width = 512;')
    expect(code).toContain('placaTela.height = 256;')
    expect(code).toContain('const placaTinta = placaTela.getContext("2d");')
    expect(code).toContain('placaTinta.fillStyle = "#ffffff";')
    expect(code).toContain('placaTinta.font = "bold 120px sans-serif";')
    expect(code).toContain('placaTinta.textAlign = "center";')
    expect(code).toContain('placaTinta.textBaseline = "middle";')
    expect(code).toContain('placaTinta.fillText("BEM-VINDO", 256, 128);')
    expect(code).toContain('const placaTextura = new THREE.CanvasTexture(placaTela);')
    expect(code).toContain(
      'const placa = new THREE.Mesh(new THREE.PlaneGeometry(placaTamanho, placaTamanho * 0.5), new THREE.MeshBasicMaterial({ map: placaTextura, transparent: true }));',
    )
    expect(code).toContain('cena.add(placa);')
  })

  it('a EXPANSÃO reparseia 0-raw (sem GLSL: o miolo inteiro volta como blocos)', () => {
    const code = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, sign],
    })
    const reparsed = parseJS(code)
    expect(collectTypes(reparsed).has('rawJS')).toBe(false)
    // e o reparse estabiliza (fixpoint textual da expansão)
    expect(generateJS({ statements: reparsed })).toBe(code)
  })

  it('block→IR→block preserva o macro (sz_t3d_sign) e regenera igual ao direto', () => {
    const direct = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, sign],
    })
    const { code, state } = fromIR([{ type: 'importStar', name: 'THREE', module: 'three' }, sign])
    expect(state).toContain('"sz_t3d_sign"')
    expect(state).toContain('BEM-VINDO')
    expect(code).toBe(direct)
  })
})
