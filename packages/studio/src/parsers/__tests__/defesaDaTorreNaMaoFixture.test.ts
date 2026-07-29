import { describe, expect, it } from 'bun:test'
import { defesaDaTorreNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Defesa da Torre (na mão)": o Tower Defense recriado
 * SÓ com blocos do núcleo Canvas 3D (three.js CRU), a prova de que o gênero
 * "defender" é construível na unha. Câmera OrthographicCamera aérea (com up
 * custom), o chão, o cristal e a torre que gira; os invasores num InstancedMesh
 * (um só desenho pra placa de vídeo) posicionados por setMatrixAt a partir de
 * arrays de estado; a torre zapeia sozinha o primeiro invasor no alcance com
 * recarga (cooldown) e o enxame nasce na beirada e caminha ao centro. 0 rawJS,
 * fixpoint textual, e o drift da IR embutida em `examples/core.ts` é guardado
 * contra o parser vivo. ⚠️ recursos criados UMA vez (fora dos laços): o contrato
 * do Canvas 3D recusa `new` dentro de laço — invasores são um pool instanciado.
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
const corCeu = new THREE.Color("#1a2233");
const corVitoria = new THREE.Color("#27ae60");
const corDerrota = new THREE.Color("#c0392b");
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
const chaoMat = new THREE.MeshStandardMaterial({ color: 1976635 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, 0, -0.3);
chao.receiveShadow = true;
scene.add(chao);
const cristalGeo = new THREE.BoxGeometry(2, 2, 2);
const cristalMat = new THREE.MeshStandardMaterial({ color: 3718648 });
const cristal = new THREE.Mesh(cristalGeo, cristalMat);
cristal.position.set(0, 0, 1);
cristal.castShadow = true;
scene.add(cristal);
const torre = new THREE.Group();
const baseGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const baseMat = new THREE.MeshStandardMaterial({ color: 16317180 });
const base = new THREE.Mesh(baseGeo, baseMat);
base.position.set(0, 0, 0);
torre.add(base);
const canoGeo = new THREE.BoxGeometry(0.4, 1.8, 0.4);
const canoMat = new THREE.MeshStandardMaterial({ color: 9741240 });
const cano = new THREE.Mesh(canoGeo, canoMat);
cano.position.set(0, 1, 0);
torre.add(cano);
torre.position.set(0, 0, 2.4);
scene.add(torre);
const totalInimigos = 24;
const inimigoGeo = new THREE.BoxGeometry(1, 1, 1);
const inimigoMat = new THREE.MeshStandardMaterial({ color: 15680580 });
const inimigos = new THREE.InstancedMesh(inimigoGeo, inimigoMat, totalInimigos);
inimigos.castShadow = true;
scene.add(inimigos);
const molde = new THREE.Object3D();
const inimigoX = [];
const inimigoY = [];
const inimigoAtivo = [];
for (let i = 0; i < totalInimigos; i = i + 1) {
  inimigoX.push(0);
  inimigoY.push(0);
  inimigoAtivo.push(false);
  molde.position.set(1000, 1000, 0.6);
  molde.updateMatrix();
  inimigos.setMatrixAt(i, molde.matrix);
}
inimigos.instanceMatrix.needsUpdate = true;
const relogio = new THREE.Clock();
let pontos = 0;
let recarga = 0;
let tempoSpawn = 0.6;
let giro = 0;
let rodando = true;
document.addEventListener("keydown", (event) => {
  if (rodando === false) {
    for (let i = 0; i < totalInimigos; i = i + 1) {
      inimigoAtivo[i] = false;
    }
    pontos = 0;
    recarga = 0;
    tempoSpawn = 0.6;
    rodando = true;
    scene.background = corCeu;
  }
});
function passo() {
  const dt = relogio.getDelta();
  giro = giro + dt;
  torre.rotation.z = giro * 1.6;
  cristal.rotation.z = giro * 0.7;
  if (rodando === true) {
    recarga = recarga - dt;
    tempoSpawn = tempoSpawn - dt;
    if (tempoSpawn <= 0) {
      tempoSpawn = 1.1;
      let livre = -1;
      for (let i = 0; i < totalInimigos; i = i + 1) {
        if (inimigoAtivo[i] === false && livre === -1) {
          livre = i;
        }
      }
      if (livre >= 0) {
        const angulo = Math.random() * 6.283;
        inimigoX[livre] = Math.cos(angulo) * 20;
        inimigoY[livre] = Math.sin(angulo) * 20;
        inimigoAtivo[livre] = true;
      }
    }
    if (recarga <= 0) {
      let alvo = -1;
      for (let i = 0; i < totalInimigos; i = i + 1) {
        if (inimigoAtivo[i] === true && alvo === -1) {
          if (inimigoX[i] < 6 && inimigoX[i] > -6 && inimigoY[i] < 6 && inimigoY[i] > -6) {
            alvo = i;
          }
        }
      }
      if (alvo >= 0) {
        inimigoAtivo[alvo] = false;
        pontos = pontos + 1;
        recarga = 0.35;
        if (pontos >= 20) {
          rodando = false;
          scene.background = corVitoria;
        }
      }
    }
    for (let i = 0; i < totalInimigos; i = i + 1) {
      if (inimigoAtivo[i] === true) {
        inimigoX[i] = inimigoX[i] - inimigoX[i] * 0.5 * dt;
        inimigoY[i] = inimigoY[i] - inimigoY[i] * 0.5 * dt;
        if (inimigoX[i] < 1.2 && inimigoX[i] > -1.2 && inimigoY[i] < 1.2 && inimigoY[i] > -1.2) {
          rodando = false;
          scene.background = corDerrota;
        }
        molde.position.set(inimigoX[i], inimigoY[i], 0.6);
      } else {
        molde.position.set(1000, 1000, 0.6);
      }
      molde.updateMatrix();
      inimigos.setMatrixAt(i, molde.matrix);
    }
    inimigos.instanceMatrix.needsUpdate = true;
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

describe('Canvas 3D — Defesa da Torre (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas do Tower Defense (instancing, pool em arrays, laço de quadro)', () => {
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
    expect(withoutUndefined(normalizeSZIR(defesaDaTorreNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
