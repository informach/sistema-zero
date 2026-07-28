import { describe, expect, it } from 'bun:test'
import { crossyRoadNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Atravesse a Rua (na mão)": o Crossy Road (hopper
 * voxel do Hunor Borbely) recriado SÓ com blocos do núcleo Canvas 3D (three.js
 * CRU), a prova de que o gênero atravessia é construível na unha — câmera
 * OrthographicCamera isométrica (com up custom), o chão e as faixas em
 * InstancedMesh (o instancing profissional, um só desenho pra placa de vídeo),
 * a galinha que pula em grade pelas setas e os carros (também instanciados)
 * movidos por THREE.Clock com colisão AABB na mão. 0 rawJS, fixpoint textual, e
 * o drift da IR embutida em `examples/core.ts` é guardado contra o parser vivo
 * (mudou o parser → re-embutir). ⚠️ recursos criados UMA vez (fora dos laços):
 * o contrato do Canvas 3D recusa `new` dentro de laço.
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
scene.background = new THREE.Color("#7ec0ee");
const corDerrota = new THREE.Color("#c0392b");
const corVitoria = new THREE.Color("#27ae60");
const camera = new THREE.OrthographicCamera(-16, 16, 11, -11, 1, 200);
camera.up.set(0, 0, 1);
camera.position.set(20, -20, 20);
camera.lookAt(0, 0, 0);
const sol = new THREE.DirectionalLight(16777215, 1.1);
sol.position.set(-12, -8, 20);
sol.castShadow = true;
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.6);
scene.add(ambiente);
const tile = 2;
const linhas = 20;
const molde = new THREE.Object3D();
const chaoGeo = new THREE.PlaneGeometry(60, 60);
const chaoMat = new THREE.MeshStandardMaterial({ color: 9159498 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, 18, -0.3);
chao.receiveShadow = true;
scene.add(chao);
const estradaGeo = new THREE.BoxGeometry(44, tile, 0.4);
const estradaMat = new THREE.MeshStandardMaterial({ color: 4540505 });
const estradas = new THREE.InstancedMesh(estradaGeo, estradaMat, 10);
estradas.receiveShadow = true;
scene.add(estradas);
for (let i = 0; i < 10; i = i + 1) {
  const linha = 2 + i * 2;
  molde.position.set(0, linha * tile, -0.2);
  molde.updateMatrix();
  estradas.setMatrixAt(i, molde.matrix);
}
estradas.instanceMatrix.needsUpdate = true;
const jogador = new THREE.Group();
const corpoGeo = new THREE.BoxGeometry(1, 1, 1.2);
const corpoMat = new THREE.MeshStandardMaterial({ color: 16777215 });
const corpo = new THREE.Mesh(corpoGeo, corpoMat);
corpo.position.set(0, 0, 0.6);
corpo.castShadow = true;
jogador.add(corpo);
const bicoGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const bicoMat = new THREE.MeshStandardMaterial({ color: 15770970 });
const bico = new THREE.Mesh(bicoGeo, bicoMat);
bico.position.set(0, 0.55, 1.1);
jogador.add(bico);
scene.add(jogador);
const totalCarros = 30;
const carroGeo = new THREE.BoxGeometry(2.6, 1.3, 0.7);
const carroMat = new THREE.MeshStandardMaterial({ color: 15219770 });
const carros = new THREE.InstancedMesh(carroGeo, carroMat, totalCarros);
carros.castShadow = true;
scene.add(carros);
const carroX = [];
const carroY = [];
const carroDir = [];
const carroVel = [];
for (let i = 0; i < totalCarros; i = i + 1) {
  const faixaNum = i % 10;
  const linha = 2 + faixaNum * 2;
  const posNaFaixa = Math.floor(i / 10);
  let dir = 1;
  if (linha % 4 === 0) {
    dir = -1;
  }
  carroX.push(-20 + posNaFaixa * 15);
  carroY.push(linha * tile);
  carroDir.push(dir);
  carroVel.push(4 + linha * 0.15);
}
const relogio = new THREE.Clock();
let linhaAtual = 0;
let coluna = 0;
let vivo = true;
let venceu = false;
document.addEventListener("keydown", (event) => {
  if (vivo && !venceu) {
    if (event.code === "ArrowUp") {
      linhaAtual = linhaAtual + 1;
      jogador.position.y = linhaAtual * tile;
    }
    if (event.code === "ArrowDown") {
      if (linhaAtual > 0) {
        linhaAtual = linhaAtual - 1;
        jogador.position.y = linhaAtual * tile;
      }
    }
    if (event.code === "ArrowLeft") {
      if (coluna > -8) {
        coluna = coluna - 1;
        jogador.position.x = coluna * tile;
      }
    }
    if (event.code === "ArrowRight") {
      if (coluna < 8) {
        coluna = coluna + 1;
        jogador.position.x = coluna * tile;
      }
    }
  }
});
function passo() {
  const dt = relogio.getDelta();
  if (vivo && !venceu) {
    for (let i = 0; i < totalCarros; i = i + 1) {
      carroX[i] = carroX[i] + carroDir[i] * carroVel[i] * dt;
      if (carroX[i] > 24) {
        carroX[i] = -24;
      }
      if (carroX[i] < -24) {
        carroX[i] = 24;
      }
      molde.position.set(carroX[i], carroY[i], 0.5);
      molde.updateMatrix();
      carros.setMatrixAt(i, molde.matrix);
      const dx = jogador.position.x - carroX[i];
      const dy = jogador.position.y - carroY[i];
      if (dx < 1.7 && dx > -1.7 && dy < 1 && dy > -1) {
        vivo = false;
        scene.background = corDerrota;
      }
    }
    carros.instanceMatrix.needsUpdate = true;
    if (linhaAtual >= linhas) {
      venceu = true;
      scene.background = corVitoria;
    }
  }
  camera.position.set(jogador.position.x + 20, jogador.position.y - 20, 20);
  camera.lookAt(jogador.position.x, jogador.position.y, 0);
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

describe('Canvas 3D — Atravesse a Rua (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas do Crossy Road (câmera iso, instancing, pool em arrays)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    // A câmera ORTOGRÁFICA isométrica é a assinatura do Crossy Road.
    expect(raw).toContain('"className":"OrthographicCamera"')
    // As faixas e os carros são InstancedMesh (o instancing do folio), com
    // setMatrixAt no laço (recurso criado UMA vez, fora dele — o contrato do
    // Canvas 3D recusa `new` dentro de laço).
    expect(raw).toContain('"className":"InstancedMesh"')
    expect(raw).toContain('setMatrixAt')
    // importStar (a lib), a grade e o pool por forRange PRESERVANDO o índice
    // (não repeat), o estado dos carros em arrays (arrayPush) e o laço de quadro.
    expect(types.has('importStar')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('repeat')).toBe(false)
    expect(types.has('arrayPush')).toBe(true)
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
    expect(withoutUndefined(normalizeSZIR(crossyRoadNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
