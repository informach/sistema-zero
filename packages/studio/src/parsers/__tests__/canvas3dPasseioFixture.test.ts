import { describe, expect, it } from 'bun:test'
import { passeio3dNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Passeio 3D (na mão)": um mini-mundo dirigível em
 * three.js CRU (Canvas 3D do núcleo), a prova viva de que a essência do folio
 * do Bruno Simon é construível SÓ com blocos do núcleo — cena/câmera/renderer,
 * névoa, chão, carrinho de caixas dirigível por WASD com THREE.Clock, floresta
 * INSTANCIADA (setMatrixAt), câmera que segue por lerp e ciclo dia/noite por
 * lerpColors. 0 rawJS, fixpoint textual e de blocos, e o drift da IR embutida
 * em `examples/core.ts` é guardado contra o parser vivo (mudou o parser →
 * re-embutir).
 */

const HTML = '<canvas id="mundo" width="960" height="600"></canvas>'

const CSS = [
  'body { margin: 0; overflow: hidden; background: #10182a; }',
  '#mundo { display: block; width: 100%; height: 100vh; }',
].join('\n')

const JS = `import * as THREE from 'three';
const canvas = document.getElementById("mundo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, preserveDrawingBuffer: true });
renderer.setSize(960, 600);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#8fbcd4");
scene.fog = new THREE.Fog("#8fbcd4", 30, 120);
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 500);
camera.position.set(0, 6, 12);
const sol = new THREE.DirectionalLight(16777215, 1.2);
sol.position.set(30, 50, 20);
sol.castShadow = true;
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.6);
scene.add(ambiente);
const chaoGeo = new THREE.PlaneGeometry(300, 300);
const chaoMat = new THREE.MeshStandardMaterial({ color: 5866068 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.rotation.x = -1.5707963267948966;
chao.receiveShadow = true;
scene.add(chao);
const carrinho = new THREE.Group();
const corpoGeo = new THREE.BoxGeometry(2, 0.7, 3.4);
const corpoMat = new THREE.MeshStandardMaterial({ color: 15746890 });
const corpo = new THREE.Mesh(corpoGeo, corpoMat);
corpo.position.set(0, 0.7, 0);
corpo.castShadow = true;
carrinho.add(corpo);
const cabineGeo = new THREE.BoxGeometry(1.5, 0.6, 1.6);
const cabineMat = new THREE.MeshStandardMaterial({ color: 12639424 });
const cabine = new THREE.Mesh(cabineGeo, cabineMat);
cabine.position.set(0, 1.35, -0.2);
cabine.castShadow = true;
carrinho.add(cabine);
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
  somMotor.setRefDistance(8);
});
carregadorSom.load('buzina', (buffer) => {
  somBuzina.setBuffer(buffer);
});
const troncoGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
const troncoMat = new THREE.MeshStandardMaterial({ color: 9127187 });
const troncos = new THREE.InstancedMesh(troncoGeo, troncoMat, 60);
troncos.castShadow = true;
scene.add(troncos);
const copaGeo = new THREE.ConeGeometry(1.8, 3.5, 7);
const copaMat = new THREE.MeshStandardMaterial({ color: 3565110 });
const copas = new THREE.InstancedMesh(copaGeo, copaMat, 60);
copas.castShadow = true;
scene.add(copas);
const molde = new THREE.Object3D();
for (let i = 0; i < 60; i++) {
  const ang = i * 0.618;
  const raio = 18 + i * 0.9;
  const tx = Math.cos(ang) * raio;
  const tz = Math.sin(ang) * raio;
  molde.position.set(tx, 1, tz);
  molde.updateMatrix();
  troncos.setMatrixAt(i, molde.matrix);
  molde.position.set(tx, 3.6, tz);
  molde.updateMatrix();
  copas.setMatrixAt(i, molde.matrix);
}
troncos.instanceMatrix.needsUpdate = true;
copas.instanceMatrix.needsUpdate = true;
const teclas = {};
document.addEventListener("keydown", (event) => {
  teclas[event.code] = true;
  listener.context.resume();
  if (event.code === "KeyW") {
    if (somMotor.buffer && !somMotor.isPlaying) {
      somMotor.play();
    }
  }
  if (event.code === "KeyH") {
    if (somBuzina.buffer && !somBuzina.isPlaying) {
      somBuzina.play();
    }
  }
});
document.addEventListener("keyup", (event) => {
  teclas[event.code] = false;
});
const relogio = new THREE.Clock();
const corDia = new THREE.Color("#8fbcd4");
const corNoite = new THREE.Color("#0b1026");
const corCeu = new THREE.Color("#8fbcd4");
const atras = new THREE.Vector3();
let velocidade = 0;
let tempoDia = 0;
function passo() {
  const dt = relogio.getDelta();
  if (teclas["KeyW"]) {
    velocidade = velocidade + 12 * dt;
  }
  if (teclas["KeyS"]) {
    velocidade = velocidade - 12 * dt;
  }
  velocidade = velocidade * 0.96;
  somMotor.setPlaybackRate(0.6 + Math.abs(velocidade) * 0.05);
  if (teclas["KeyA"]) {
    carrinho.rotation.y = carrinho.rotation.y + 1.6 * dt;
  }
  if (teclas["KeyD"]) {
    carrinho.rotation.y = carrinho.rotation.y - 1.6 * dt;
  }
  carrinho.position.x = carrinho.position.x + Math.sin(carrinho.rotation.y) * velocidade * dt;
  carrinho.position.z = carrinho.position.z + Math.cos(carrinho.rotation.y) * velocidade * dt;
  atras.set(carrinho.position.x - Math.sin(carrinho.rotation.y) * 12, carrinho.position.y + 6, carrinho.position.z - Math.cos(carrinho.rotation.y) * 12);
  camera.position.lerp(atras, 0.08);
  camera.lookAt(carrinho.position.x, carrinho.position.y + 1, carrinho.position.z);
  tempoDia = tempoDia + dt * 0.1;
  const t = (Math.sin(tempoDia) + 1) / 2;
  corCeu.lerpColors(corNoite, corDia, t);
  scene.background = corCeu;
  scene.fog.color.copy(corCeu);
  sol.intensity = 0.2 + t * 1.2;
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

describe('Canvas 3D — Passeio 3D (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas do folio (fog, instancing, lerp, ciclo)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    // importStar (a lib), newInstance com namespace (new THREE.X), o loop de
    // instancing PRESERVANDO o índice (forRange, não repeat — o corpo usa `i`),
    // e o laço de quadro (animationLoop).
    expect(types.has('importStar')).toBe(true)
    expect(types.has('newInstance')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('repeat')).toBe(false)
    expect(types.has('animationLoop')).toBe(true)
  })

  it('fixpoint textual do JS (o parser é estável)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const gen1 = generateJS({ statements: ir.js })
    const gen2 = generateJS({ statements: parseJS(gen1) })
    expect(gen2).toBe(gen1)
  })

  it('a IR embutida em examples/core.ts NÃO desviou do parser (drift guard)', () => {
    const live = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    expect(passeio3dNaMaoExample.ir).toEqual(live)
  })
})
