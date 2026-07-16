import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import type { SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * ⭐ FIXTURE-ÂNCORA da categoria Canvas 3D — o projeto 04-05 (grade espacial) do
 * curso SimonDev, ACHATADO e em three.js MODERNO, buildável 100% com blocos do
 * NÚCLEO. Prova o contrato "o código real por trás de cada bloco" nos dois
 * sentidos:
 *   · 0 rawJS (todo idioma three.js vira bloco — `new THREE.X()`, cadeias de
 *     método, member-set aninhado);
 *   · fixpoint TEXTUAL (gerar→parsear→gerar byte-idêntico);
 *   · fixpoint de BLOCOS (IR→workspace→IR idêntico).
 *
 * O que ele exercita: import da lib, WebGLRenderer no canvas (objeto literal),
 * Scene/PerspectiveCamera, DirectionalLight com sombra, plano+esferas com
 * material, a classe SpatialHashGrid (JS puro do núcleo — o algoritmo do 04-05),
 * o overlay de linhas (BufferGeometry + LineSegments) e o laço de render. Sem
 * addons (OrbitControls/loaders são Fase 2) e sem o pós-processamento (Bucket C):
 * render direto, como o plano previu.
 */

const SOURCE = `
import * as THREE from 'three';
class SpatialHashGrid {
  constructor(size, cells) {
    this.size = size;
    this.cells = cells;
    this.buckets = new Map();
  }
  key(x, z) {
    const gx = Math.floor((x + this.size / 2) / this.size * this.cells);
    const gz = Math.floor((z + this.size / 2) / this.size * this.cells);
    return gx + "," + gz;
  }
  add(x, z, item) {
    const k = this.key(x, z);
    if (!this.buckets.has(k)) {
      this.buckets.set(k, []);
    }
    this.buckets.get(k).push(item);
  }
}
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(960, 600);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 1000);
camera.position.set(0, 30, 40);
camera.lookAt(0, 0, 0);
const light = new THREE.DirectionalLight(16777215, 2);
light.position.set(20, 40, 20);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
scene.add(light);
const ambient = new THREE.AmbientLight(4491519, 1);
scene.add(ambient);
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 3355443 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -1.5707963267948966;
ground.receiveShadow = true;
scene.add(ground);
const grid = new SpatialHashGrid(100, 16);
const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
for (let i = 0; i < 40; i++) {
  const mat = new THREE.MeshStandardMaterial({ color: 16755200 });
  const sphere = new THREE.Mesh(sphereGeo, mat);
  const x = i * 2 - 40;
  const z = i - 20;
  sphere.position.set(x, 1, z);
  sphere.castShadow = true;
  scene.add(sphere);
  grid.add(x, z, sphere);
}
const linePositions = [];
for (let i = 0; i < 11; i++) {
  const g = i * 10 - 50;
  linePositions.push(g);
  linePositions.push(0);
  linePositions.push(-50);
  linePositions.push(g);
  linePositions.push(0);
  linePositions.push(50);
}
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
const lineMat = new THREE.LineBasicMaterial({ color: 8947848 });
const overlay = new THREE.LineSegments(lineGeo, lineMat);
scene.add(overlay);
function frame() {
  overlay.rotation.y = overlay.rotation.y + 0.002;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
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

describe('Canvas 3D — fixture 04-05 (grade espacial) round-trip 0-raw', () => {
  it('parseia SEM rawJS e sem cair em memberCall opaco de construtor', () => {
    const ir = parseJS(SOURCE)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    // O import e o new com namespace viraram nós dedicados.
    expect(types.has('importStar')).toBe(true)
    expect(types.has('newInstance')).toBe(true) // const x = new THREE.X()
    expect(types.has('newExpr')).toBe(true) // new THREE.Mesh(...) como valor
  })

  it('fixpoint TEXTUAL: gerar → parsear → gerar é byte-estável', () => {
    const code1 = generateJS({ statements: parseJS(SOURCE) })
    const code2 = generateJS({ statements: parseJS(code1) })
    expect(code2).toBe(code1)
  })

  it('o import fica no TOPO e o código usa three.js de verdade', () => {
    const code = generateJS({ statements: parseJS(SOURCE) })
    expect(code.startsWith("import * as THREE from 'three';")).toBe(true)
    expect(code).toContain('new THREE.WebGLRenderer({ antialias: true, canvas: canvas })')
    expect(code).toContain('renderer.shadowMap.enabled = true;')
    expect(code).toContain('const scene = new THREE.Scene();')
    expect(code).toContain('const overlay = new THREE.LineSegments(lineGeo, lineMat);')
  })

  it('fixpoint de BLOCOS: IR → workspace → blocos → IR gera o MESMO código', () => {
    // Contrato dos outros fixtures: o código gerado a partir dos blocos
    // reconstruídos é byte-idêntico ao original (diferenças inócuas de IR —
    // `else: undefined` vs ausente — geram o mesmo código, então é o código que
    // vale como medida de fidelidade).
    ensureBlocklyInitialized()
    const ir = parseJS(SOURCE)
    const code = generateJS({ statements: ir })
    const irObj: SZIR = { html: [], css: [], js: ir, extensions: [] }
    const state = buildWorkspaceStateFromIR(irObj)
    // Nenhum bloco "código avançado" (rawJS) na saída — tudo virou bloco de verdade.
    expect(JSON.stringify(state)).not.toContain('sz_adv_raw_js')
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuiltCode = generateJS({ statements: buildIRFromWorkspace(ws).js })
      expect(rebuiltCode).toBe(code)
    } finally {
      ws.dispose()
    }
  })
})
