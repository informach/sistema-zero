import { describe, expect, it } from 'bun:test'
import { reunirRebanhoNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Reunir o Rebanho (na mão)": o Entity Management
 * recriado SÓ com blocos do núcleo Canvas 3D (three.js CRU), a prova de que
 * "gerenciar muitas entidades" é construível na unha. Câmera OrthographicCamera
 * aérea; o pastor anda com as setas/WASD (flags de keydown/keyup); os bichinhos
 * vivem num InstancedMesh (um só desenho pra placa de vídeo) posicionados por
 * setMatrixAt a partir de ARRAYS DE ESTADO PARALELOS (x/z/ativo/segue) — o estado
 * por-entidade do curso. Quem está perto do pastor passa a segui-lo (lerp) e
 * quem chega no curral é entregue. 0 rawJS, fixpoint textual, e o drift da IR
 * embutida em `examples/core.ts` é guardado contra o parser vivo. ⚠️ recursos
 * criados UMA vez (fora dos laços): o contrato do Canvas 3D recusa `new` dentro
 * de laço — o rebanho é um pool instanciado.
 */

const HTML = '<canvas id="jogo" width="900" height="600"></canvas>'

const CSS = [
  'body { margin: 0; overflow: hidden; background: #0b1220; }',
  '#jogo { display: block; width: 100%; height: 100vh; }',
].join('\n')

const JS = `import * as THREE from 'three';
const canvas = document.getElementById("jogo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(900, 600);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
const corCeu = new THREE.Color("#7dd3fc");
const corVitoria = new THREE.Color("#22c55e");
scene.background = corCeu;
const camera = new THREE.OrthographicCamera(-24, 24, 18, -18, 1, 200);
camera.up.set(0, 0, 1);
camera.position.set(0, -30, 34);
camera.lookAt(0, 0, 0);
const sol = new THREE.DirectionalLight(16777215, 1.1);
sol.position.set(-10, -12, 24);
sol.castShadow = true;
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.6);
scene.add(ambiente);
const chaoGeo = new THREE.PlaneGeometry(52, 52);
const chaoMat = new THREE.MeshStandardMaterial({ color: 1467700 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, 0, -0.3);
chao.receiveShadow = true;
scene.add(chao);
const curralGeo = new THREE.BoxGeometry(6, 0.3, 6);
const curralMat = new THREE.MeshStandardMaterial({ color: 16498468 });
const curral = new THREE.Mesh(curralGeo, curralMat);
curral.position.set(12, 0.15, 12);
scene.add(curral);
const heroiGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const heroiMat = new THREE.MeshStandardMaterial({ color: 3718648 });
const heroi = new THREE.Mesh(heroiGeo, heroiMat);
heroi.position.set(0, 0.7, 0);
heroi.castShadow = true;
scene.add(heroi);
const totalBichos = 20;
const bichoGeo = new THREE.BoxGeometry(1, 1, 1);
const bichoMat = new THREE.MeshStandardMaterial({ color: 16317180 });
const bichos = new THREE.InstancedMesh(bichoGeo, bichoMat, totalBichos);
bichos.castShadow = true;
scene.add(bichos);
const molde = new THREE.Object3D();
const bichoX = [];
const bichoZ = [];
const bichoAtivo = [];
const bichoSegue = [];
for (let i = 0; i < totalBichos; i = i + 1) {
  bichoX.push(0);
  bichoZ.push(0);
  bichoAtivo.push(false);
  bichoSegue.push(false);
  molde.position.set(1000, 1000, 0.5);
  molde.updateMatrix();
  bichos.setMatrixAt(i, molde.matrix);
}
bichos.instanceMatrix.needsUpdate = true;
const relogio = new THREE.Clock();
let pontos = 0;
let tempoSpawn = 0.5;
let heroiX = 0;
let heroiZ = 0;
let rodando = true;
let frente = false;
let tras = false;
let esquerda = false;
let direita = false;
document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    frente = true;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    tras = true;
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    esquerda = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    direita = true;
  }
  if (rodando === false) {
    for (let i = 0; i < totalBichos; i = i + 1) {
      bichoAtivo[i] = false;
      bichoSegue[i] = false;
    }
    pontos = 0;
    tempoSpawn = 0.5;
    heroiX = 0;
    heroiZ = 0;
    rodando = true;
    scene.background = corCeu;
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    frente = false;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    tras = false;
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    esquerda = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    direita = false;
  }
});
function passo() {
  const dt = relogio.getDelta();
  if (rodando === true) {
    if (esquerda === true) {
      heroiX = heroiX - 12 * dt;
    }
    if (direita === true) {
      heroiX = heroiX + 12 * dt;
    }
    if (frente === true) {
      heroiZ = heroiZ - 12 * dt;
    }
    if (tras === true) {
      heroiZ = heroiZ + 12 * dt;
    }
    if (heroiX < -18) {
      heroiX = -18;
    }
    if (heroiX > 18) {
      heroiX = 18;
    }
    if (heroiZ < -18) {
      heroiZ = -18;
    }
    if (heroiZ > 18) {
      heroiZ = 18;
    }
    heroi.position.set(heroiX, 0.7, heroiZ);
    tempoSpawn = tempoSpawn - dt;
    if (tempoSpawn <= 0) {
      tempoSpawn = 1.3;
      let livre = -1;
      for (let i = 0; i < totalBichos; i = i + 1) {
        if (bichoAtivo[i] === false && livre === -1) {
          livre = i;
        }
      }
      if (livre >= 0) {
        const angulo = Math.random() * 6.283;
        bichoX[livre] = Math.cos(angulo) * 14;
        bichoZ[livre] = Math.sin(angulo) * 14;
        bichoAtivo[livre] = true;
        bichoSegue[livre] = false;
      }
    }
    for (let i = 0; i < totalBichos; i = i + 1) {
      if (bichoAtivo[i] === true) {
        if (bichoSegue[i] === true) {
          bichoX[i] = bichoX[i] + (heroiX - bichoX[i]) * 2.5 * dt;
          bichoZ[i] = bichoZ[i] + (heroiZ - bichoZ[i]) * 2.5 * dt;
          if (bichoX[i] < 14.5 && bichoX[i] > 9.5 && bichoZ[i] < 14.5 && bichoZ[i] > 9.5) {
            bichoAtivo[i] = false;
            pontos = pontos + 1;
          }
        } else {
          if (bichoX[i] < heroiX + 2 && bichoX[i] > heroiX - 2 && bichoZ[i] < heroiZ + 2 && bichoZ[i] > heroiZ - 2) {
            bichoSegue[i] = true;
          }
        }
        molde.position.set(bichoX[i], 0.5, bichoZ[i]);
      } else {
        molde.position.set(1000, 1000, 0.5);
      }
      molde.updateMatrix();
      bichos.setMatrixAt(i, molde.matrix);
    }
    bichos.instanceMatrix.needsUpdate = true;
    if (pontos >= 10) {
      rodando = false;
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

describe('Canvas 3D — Reunir o Rebanho (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas do Entity Management (instancing, pool + estado em arrays, laço de quadro)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    expect(raw).toContain('"className":"InstancedMesh"')
    expect(raw).toContain('setMatrixAt')
    expect(types.has('importStar')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('repeat')).toBe(false)
    expect(types.has('arrayPush')).toBe(true)
    expect(types.has('animationLoop')).toBe(true)
    expect(types.has('event')).toBe(true)
    // O estado por-entidade (o coração do Entity Management) vive em arrays paralelos.
    expect(raw).toContain('"bichoAtivo"')
    expect(raw).toContain('"bichoSegue"')
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
    expect(withoutUndefined(normalizeSZIR(reunirRebanhoNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
