import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import type { SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * Fixture "FOLIO INTEGRAL na unha" — o CONTRATO da Parte 1 v2: os idiomas que
 * faltavam do folio-2025 provados 0-raw + fixpoint, todos juntos numa cena:
 *
 *   · SOM POSICIONAL (AudioListener na câmera + PositionalAudio no carrinho +
 *     AudioLoader×2 servidos pela ponte de assets) + buzina na tecla H;
 *   · LETREIRO canvas 2D → CanvasTexture (o jeito folio de texto — os primitivos
 *     que o macro sz_t3d_sign expande);
 *   · RELÂMPAGO em Line2/LineGeometry/LineMaterial (linhas GROSSAS de
 *     three/addons/lines — importNamed ×3);
 *   · CONFETE via BufferGeometry().setFromPoints (o 2º caminho de Points, sem
 *     repetir o macro de partículas já provado no canvas3dParticlesFixture);
 *   · BULLET-TIME (câmera lenta): dt escalado por um fator com lerp de volta.
 *
 * Se algum idioma cair em rawJS aqui, é lacuna REAL descoberta cedo — a regra da
 * rodada é ajustar a FIXTURE para a forma canônica, não afrouxar a prova.
 */

const FOLIO_INTEGRAL = `
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
const canvas = document.getElementById("mundo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(960, 600);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b1026");
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 500);
camera.position.set(0, 6, 14);
const luz = new THREE.DirectionalLight(16777215, 1.1);
luz.position.set(20, 40, 10);
scene.add(luz);
const carrinho = new THREE.Group();
const corpo = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 3.4), new THREE.MeshStandardMaterial({ color: 15746890 }));
carrinho.add(corpo);
scene.add(carrinho);
const listener = new THREE.AudioListener();
camera.add(listener);
const somMotor = new THREE.PositionalAudio(listener);
carrinho.add(somMotor);
const somBuzina = new THREE.Audio(listener);
const carregadorSom = new THREE.AudioLoader();
carregadorSom.load('motor', (buffer) => {
  somMotor.setBuffer(buffer);
  somMotor.setLoop(true);
  somMotor.setRefDistance(6);
});
carregadorSom.load('buzina', (buffer) => {
  somBuzina.setBuffer(buffer);
});
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
placa.position.set(0, 4, -10);
scene.add(placa);
const raioPontos = [];
let raioX = 6;
let raioY = 22;
for (let i = 0; i < 8; i++) {
  raioPontos.push(raioX);
  raioPontos.push(raioY);
  raioPontos.push(-12);
  raioX = raioX + (Math.random() - 0.5) * 3;
  raioY = raioY - 2.6;
}
const raioGeo = new LineGeometry();
raioGeo.setPositions(raioPontos);
const raioMat = new LineMaterial({ color: 16777130, linewidth: 4 });
raioMat.resolution.set(960, 600);
const raio = new Line2(raioGeo, raioMat);
raio.visible = false;
scene.add(raio);
const confetePontos = [];
for (let i = 0; i < 150; i++) {
  confetePontos.push(new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 10, (Math.random() - 0.5) * 12));
}
const confeteGeo = new THREE.BufferGeometry().setFromPoints(confetePontos);
const confete = new THREE.Points(confeteGeo, new THREE.PointsMaterial({ color: 16755370, size: 0.15 }));
scene.add(confete);
const teclas = {};
document.addEventListener("keydown", (event) => {
  teclas[event.code] = true;
  if (event.code === "KeyH") {
    somBuzina.play();
  }
  if (event.code === "KeyW") {
    if (!somMotor.isPlaying) {
      somMotor.play();
    }
  }
});
document.addEventListener("keyup", (event) => {
  teclas[event.code] = false;
});
const relogio = new THREE.Clock();
let velocidade = 0;
let escalaTempo = 1;
function passo() {
  const dt = relogio.getDelta();
  if (teclas["KeyF"]) {
    escalaTempo = escalaTempo + (0.2 - escalaTempo) * 0.2;
  } else {
    escalaTempo = escalaTempo + (1 - escalaTempo) * 0.08;
  }
  const dtJogo = dt * escalaTempo;
  if (teclas["KeyW"]) {
    velocidade = velocidade + 12 * dtJogo;
  }
  velocidade = velocidade * 0.96;
  carrinho.position.z = carrinho.position.z - velocidade * dtJogo;
  if (Math.random() > 0.96) {
    raio.visible = true;
  } else {
    raio.visible = false;
  }
  confete.rotation.y = confete.rotation.y + 0.3 * dtJogo;
  renderer.render(scene, camera);
  requestAnimationFrame(passo);
}
requestAnimationFrame(passo);
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

function roundtripBlocks(code: string): { rebuiltCode: string; stateJson: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js: parseJS(code), extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      rebuiltCode: generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) }),
      stateJson: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

describe('Canvas 3D — folio INTEGRAL na unha (som + letreiro + relâmpago + bullet-time)', () => {
  it('a cena inteira parseia com 0 rawJS e os nós esperados', () => {
    const ir = parseJS(FOLIO_INTEGRAL)
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('importNamed')).toBe(true) // Line2/LineGeometry/LineMaterial
    expect(types.has('loaderLoad')).toBe(true) // AudioLoader.load ×2
    expect(types.has('createElement')).toBe(true) // canvas do letreiro
    expect(types.has('animationLoop')).toBe(true) // passo() + requestAnimationFrame
  })

  it('fixpoint textual: gerar → parsear → gerar estabiliza byte a byte', () => {
    const code = generateJS({ statements: parseJS(FOLIO_INTEGRAL) })
    expect(generateJS({ statements: parseJS(code) })).toBe(code)
  })

  it('fixpoint de blocos: canonicaliza as áreas uma vez e então fica estável', () => {
    const code = generateJS({ statements: parseJS(FOLIO_INTEGRAL) })
    const { rebuiltCode, stateJson } = roundtripBlocks(code)
    expect(roundtripBlocks(rebuiltCode).rebuiltCode).toBe(rebuiltCode)
    expect(stateJson).not.toContain('sz_adv_raw_js')
    // o discriminador em ação: há AudioLoader declarado → bloco de SOM
    expect(stateJson).toContain('"sz_t3d_load_sound"')
    // imports nomeados dos addons de linha viram o bloco de import
    expect(stateJson).toContain('"sz_t3d_import_named"')
    // facilitadores 3D reconhecidos (gate ligado pelo import de three)
    expect(stateJson).toContain('"sz_t3d_add_to"')
    expect(stateJson).toContain('"sz_t3d_set_position"')
    expect(stateJson).toContain('"sz_t3d_set_visible"')
  })
})
