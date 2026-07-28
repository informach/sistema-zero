import { describe, expect, it } from 'bun:test'
import { trafficRunNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Corrida Maluca (na mão)": o corredor de pista do Hunor
 * Borbely recriado SÓ com blocos do núcleo Canvas 3D (three.js CRU), pela VIA B
 * — a pista é um plano com CanvasTexture desenhada por Canvas 2D (dois discos
 * beginPath+arc+fill formando o anel de asfalto), sem THREE.Shape nem
 * ExtrudeGeometry. Câmera OrthographicCamera, o carro dá voltas por ângulo
 * (acelerar/frear + trocar de faixa interna/externa), os rivais em InstancedMesh
 * e a colisão por distância. 0 rawJS, fixpoint textual, e o drift da IR embutida
 * em `examples/core.ts` é guardado contra o parser vivo. ⚠️ recursos criados
 * UMA vez (fora dos laços): o contrato do Canvas 3D recusa `new` dentro de laço.
 */

const HTML = '<canvas id="jogo" width="900" height="600"></canvas>'

const CSS = [
  'body { margin: 0; overflow: hidden; background: #10182a; }',
  '#jogo { display: block; width: 100%; height: 100vh; }',
].join('\n')

const JS = `import * as THREE from 'three';
const canvas = document.getElementById("jogo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(900, 600);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#87ceeb");
const corVitoria = new THREE.Color("#27ae60");
const corDerrota = new THREE.Color("#c0392b");
const camera = new THREE.OrthographicCamera(-22, 22, 15, -15, 1, 300);
camera.position.set(0, -34, 44);
camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);
const sol = new THREE.DirectionalLight(16777215, 1.1);
sol.position.set(-10, -20, 40);
sol.castShadow = true;
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.6);
scene.add(ambiente);
const pistaCanvas = document.createElement("canvas");
pistaCanvas.width = 256;
pistaCanvas.height = 256;
const pistaCtx = pistaCanvas.getContext("2d");
pistaCtx.fillStyle = "#5aa02a";
pistaCtx.fillRect(0, 0, 256, 256);
pistaCtx.fillStyle = "#555a66";
pistaCtx.beginPath();
pistaCtx.arc(128, 128, 64, 0, 6.283);
pistaCtx.fill();
pistaCtx.fillStyle = "#5aa02a";
pistaCtx.beginPath();
pistaCtx.arc(128, 128, 30, 0, 6.283);
pistaCtx.fill();
const pistaTex = new THREE.CanvasTexture(pistaCanvas);
const pistaGeo = new THREE.PlaneGeometry(60, 60);
const pistaMat = new THREE.MeshStandardMaterial({ map: pistaTex });
const pista = new THREE.Mesh(pistaGeo, pistaMat);
pista.receiveShadow = true;
scene.add(pista);
const molde = new THREE.Object3D();
const jogador = new THREE.Group();
const corpoGeo = new THREE.BoxGeometry(2.2, 1.1, 0.7);
const corpoMat = new THREE.MeshStandardMaterial({ color: 15219770 });
const corpo = new THREE.Mesh(corpoGeo, corpoMat);
corpo.position.set(0, 0, 0.5);
corpo.castShadow = true;
jogador.add(corpo);
const cabineGeo = new THREE.BoxGeometry(1.1, 0.9, 0.6);
const cabineMat = new THREE.MeshStandardMaterial({ color: 14411006 });
const cabine = new THREE.Mesh(cabineGeo, cabineMat);
cabine.position.set(-0.2, 0, 1);
jogador.add(cabine);
scene.add(jogador);
const totalRivais = 6;
const rivalGeo = new THREE.BoxGeometry(2.2, 1.1, 0.7);
const rivalMat = new THREE.MeshStandardMaterial({ color: 3831528 });
const rivais = new THREE.InstancedMesh(rivalGeo, rivalMat, totalRivais);
rivais.castShadow = true;
scene.add(rivais);
const rivalAng = [];
const rivalVel = [];
const rivalLane = [];
for (let i = 0; i < totalRivais; i = i + 1) {
  rivalAng.push(i * 1.05);
  rivalVel.push(0.32 + i * 0.03);
  let lane = 0;
  if (i % 2 === 0) {
    lane = 1;
  }
  rivalLane.push(lane);
}
let anguloJogador = 0;
let velocidade = 0.6;
let acelera = false;
let freia = false;
let lane = 0;
let voltas = 0;
let vivo = true;
let venceu = false;
const relogio = new THREE.Clock();
document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowUp") {
    acelera = true;
  }
  if (event.code === "ArrowDown") {
    freia = true;
  }
  if (event.code === "ArrowLeft") {
    lane = 0;
  }
  if (event.code === "ArrowRight") {
    lane = 1;
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowUp") {
    acelera = false;
  }
  if (event.code === "ArrowDown") {
    freia = false;
  }
});
function passo() {
  const dt = relogio.getDelta();
  if (vivo && !venceu) {
    let passoAng = velocidade;
    if (acelera) {
      passoAng = velocidade * 2;
    }
    if (freia) {
      passoAng = velocidade * 0.35;
    }
    anguloJogador = anguloJogador + passoAng * dt;
    voltas = Math.floor(anguloJogador / 6.283);
    let raioJogador = 9.5;
    if (lane === 1) {
      raioJogador = 12.5;
    }
    const jx = Math.cos(anguloJogador) * raioJogador;
    const jy = Math.sin(anguloJogador) * raioJogador;
    jogador.position.x = jx;
    jogador.position.y = jy;
    jogador.rotation.z = anguloJogador + 1.5708;
    for (let i = 0; i < totalRivais; i = i + 1) {
      rivalAng[i] = rivalAng[i] + rivalVel[i] * dt;
      let raioRival = 9.5;
      if (rivalLane[i] === 1) {
        raioRival = 12.5;
      }
      const rx = Math.cos(rivalAng[i]) * raioRival;
      const ry = Math.sin(rivalAng[i]) * raioRival;
      molde.position.set(rx, ry, 0.4);
      molde.rotation.z = rivalAng[i] + 1.5708;
      molde.updateMatrix();
      rivais.setMatrixAt(i, molde.matrix);
      const dx = jx - rx;
      const dy = jy - ry;
      if (dx * dx + dy * dy < 2.6) {
        vivo = false;
        scene.background = corDerrota;
      }
    }
    rivais.instanceMatrix.needsUpdate = true;
    if (voltas >= 3) {
      venceu = true;
      scene.background = corVitoria;
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(passo);
}
requestAnimationFrame(passo);`

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('Canvas 3D — Corrida Maluca (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa a VIA B (CanvasTexture na pista) + câmera iso + rivais instanciados', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    // Câmera ORTOGRÁFICA aérea (o visual do Traffic Run).
    expect(raw).toContain('"className":"OrthographicCamera"')
    // A pista é uma CanvasTexture desenhada num <canvas> criado por código —
    // a VIA B (sem THREE.Shape nem ExtrudeGeometry, que gerariam rawJS).
    expect(raw).toContain('"className":"CanvasTexture"')
    expect(types.has('createElement')).toBe(true)
    expect(raw).not.toContain('"className":"Shape"')
    expect(raw).not.toContain('ExtrudeGeometry')
    // Rivais em InstancedMesh (recurso criado UMA vez; setMatrixAt no laço).
    expect(raw).toContain('"className":"InstancedMesh"')
    expect(raw).toContain('setMatrixAt')
    // importStar, o estado dos rivais em arrays (arrayPush), forRange e o quadro.
    expect(types.has('importStar')).toBe(true)
    expect(types.has('arrayPush')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('animationLoop')).toBe(true)
  })

  it('fixpoint textual do JS (o parser é estável)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const gen1 = generateJS({ statements: behaviorStatements(ir) })
    const gen2 = generateJS({ statements: parseJS(gen1) })
    expect(gen2).toBe(gen1)
  })

  it('a IR embutida em examples/core.ts NÃO desviou do parser (drift guard)', () => {
    const live = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const withoutUndefined = (value: unknown) => JSON.parse(JSON.stringify(value))
    expect(withoutUndefined(normalizeSZIR(trafficRunNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
