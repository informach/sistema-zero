import { describe, expect, it } from 'bun:test'
import { cacaEstelarNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Caça Estelar (na mão)": a batalha espacial do
 * SimonDev (Quick_Game2_StarWarsThing) como DOGFIGHT recriado SÓ com blocos do
 * núcleo Canvas 3D (three.js CRU). Câmera OrthographicCamera aérea; a nave voa
 * LIVRE no plano X/Z (flags de keydown/keyup), ENCARA o movimento (rotation.y via
 * Math.atan2) e DISPARA na direção atual (barra de espaço). ⭐ O que o básico não
 * consegue e aqui SIM: tiro DIRECIONAL de verdade, porque cada bala guarda a
 * própria direção num array. DOIS pools por InstancedMesh (naves inimigas + tiros)
 * com ARRAYS DE ESTADO PARALELOS — o estado por-entidade do curso. As naves
 * perseguem (lerp); o tiro que encosta numa derruba (+ponto), a nave que encosta
 * em você tira um escudo. Abata 10 e o céu fica dourado; sem escudos, vermelho.
 * 0 rawJS, fixpoint textual, e o drift da IR embutida em `examples/core.ts` é
 * guardado contra o parser vivo. ⚠️ recursos criados UMA vez (fora dos laços):
 * o contrato do Canvas 3D recusa `new` dentro de laço — cada frota é um pool.
 */

const HTML = '<canvas id="jogo" width="900" height="600"></canvas>'

const CSS = [
  'body { margin: 0; overflow: hidden; background: #050818; }',
  '#jogo { display: block; width: 100%; height: 100vh; }',
].join('\n')

const JS = `import * as THREE from 'three';
const canvas = document.getElementById("jogo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(900, 600);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
const corCeu = new THREE.Color("#050818");
const corVitoria = new THREE.Color("#fbbf24");
const corDerrota = new THREE.Color("#7f1d1d");
scene.background = corCeu;
const camera = new THREE.OrthographicCamera(-24, 24, 18, -18, 1, 200);
camera.up.set(0, 0, 1);
camera.position.set(0, -30, 34);
camera.lookAt(0, 0, 0);
const sol = new THREE.DirectionalLight(16777215, 1);
sol.position.set(-10, -12, 24);
sol.castShadow = true;
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.7);
scene.add(ambiente);
const chaoGeo = new THREE.PlaneGeometry(52, 52);
const chaoMat = new THREE.MeshStandardMaterial({ color: 988970 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, 0, -0.3);
chao.receiveShadow = true;
scene.add(chao);
const naveGeo = new THREE.BoxGeometry(1, 0.6, 1.6);
const naveMat = new THREE.MeshStandardMaterial({ color: 2282478 });
const nave = new THREE.Mesh(naveGeo, naveMat);
nave.position.set(0, 0.6, 0);
nave.castShadow = true;
scene.add(nave);
const totalCacas = 16;
const cacaGeo = new THREE.BoxGeometry(1, 0.6, 1.2);
const cacaMat = new THREE.MeshStandardMaterial({ color: 15680580 });
const cacas = new THREE.InstancedMesh(cacaGeo, cacaMat, totalCacas);
cacas.castShadow = true;
scene.add(cacas);
const totalTiros = 24;
const tiroGeo = new THREE.BoxGeometry(0.25, 0.25, 0.7);
const tiroMat = new THREE.MeshStandardMaterial({ color: 16638023 });
const tiros = new THREE.InstancedMesh(tiroGeo, tiroMat, totalTiros);
scene.add(tiros);
const molde = new THREE.Object3D();
const cacaX = [];
const cacaZ = [];
const cacaAtivo = [];
for (let i = 0; i < totalCacas; i = i + 1) {
  cacaX.push(0);
  cacaZ.push(0);
  cacaAtivo.push(false);
  molde.position.set(1000, 1000, 0.6);
  molde.updateMatrix();
  cacas.setMatrixAt(i, molde.matrix);
}
cacas.instanceMatrix.needsUpdate = true;
const tiroX = [];
const tiroZ = [];
const tiroDX = [];
const tiroDZ = [];
const tiroAtivo = [];
for (let i = 0; i < totalTiros; i = i + 1) {
  tiroX.push(0);
  tiroZ.push(0);
  tiroDX.push(0);
  tiroDZ.push(1);
  tiroAtivo.push(false);
  molde.position.set(1000, 1000, 0.6);
  molde.updateMatrix();
  tiros.setMatrixAt(i, molde.matrix);
}
tiros.instanceMatrix.needsUpdate = true;
const relogio = new THREE.Clock();
let pontos = 0;
let escudo = 3;
let tempoSpawn = 0.6;
let recarga = 0;
let naveX = 0;
let naveZ = 0;
let rumoX = 0;
let rumoZ = 1;
let rodando = true;
let atacando = false;
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
  if (event.code === "Space") {
    atacando = true;
  }
  if (rodando === false) {
    for (let i = 0; i < totalCacas; i = i + 1) {
      cacaAtivo[i] = false;
    }
    for (let i = 0; i < totalTiros; i = i + 1) {
      tiroAtivo[i] = false;
    }
    pontos = 0;
    escudo = 3;
    tempoSpawn = 0.6;
    recarga = 0;
    naveX = 0;
    naveZ = 0;
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
  if (event.code === "Space") {
    atacando = false;
  }
});
function passo() {
  const dt = relogio.getDelta();
  if (rodando === true) {
    let mx = 0;
    let mz = 0;
    if (esquerda === true) {
      mx = mx - 1;
    }
    if (direita === true) {
      mx = mx + 1;
    }
    if (frente === true) {
      mz = mz - 1;
    }
    if (tras === true) {
      mz = mz + 1;
    }
    naveX = naveX + mx * 11 * dt;
    naveZ = naveZ + mz * 11 * dt;
    const mag = mx * mx + mz * mz;
    if (mag > 0) {
      rumoX = mx;
      rumoZ = mz;
    }
    if (naveX < -16) {
      naveX = -16;
    }
    if (naveX > 16) {
      naveX = 16;
    }
    if (naveZ < -16) {
      naveZ = -16;
    }
    if (naveZ > 16) {
      naveZ = 16;
    }
    nave.position.set(naveX, 0.6, naveZ);
    nave.rotation.y = Math.atan2(rumoX, rumoZ);
    recarga = recarga - dt;
    if (atacando === true && recarga <= 0) {
      recarga = 0.25;
      let vaga = -1;
      for (let i = 0; i < totalTiros; i = i + 1) {
        if (tiroAtivo[i] === false && vaga === -1) {
          vaga = i;
        }
      }
      if (vaga >= 0) {
        const comprimento = Math.sqrt(rumoX * rumoX + rumoZ * rumoZ);
        tiroX[vaga] = naveX;
        tiroZ[vaga] = naveZ;
        tiroDX[vaga] = rumoX / comprimento;
        tiroDZ[vaga] = rumoZ / comprimento;
        tiroAtivo[vaga] = true;
      }
    }
    tempoSpawn = tempoSpawn - dt;
    if (tempoSpawn <= 0) {
      tempoSpawn = 1.4;
      let livre = -1;
      for (let i = 0; i < totalCacas; i = i + 1) {
        if (cacaAtivo[i] === false && livre === -1) {
          livre = i;
        }
      }
      if (livre >= 0) {
        const angulo = Math.random() * 6.283;
        cacaX[livre] = Math.cos(angulo) * 15;
        cacaZ[livre] = Math.sin(angulo) * 15;
        cacaAtivo[livre] = true;
      }
    }
    for (let i = 0; i < totalCacas; i = i + 1) {
      if (cacaAtivo[i] === true) {
        cacaX[i] = cacaX[i] + (naveX - cacaX[i]) * 1.3 * dt;
        cacaZ[i] = cacaZ[i] + (naveZ - cacaZ[i]) * 1.3 * dt;
        if (cacaX[i] < naveX + 1.2 && cacaX[i] > naveX - 1.2 && cacaZ[i] < naveZ + 1.2 && cacaZ[i] > naveZ - 1.2) {
          cacaAtivo[i] = false;
          escudo = escudo - 1;
        }
        molde.position.set(cacaX[i], 0.6, cacaZ[i]);
      } else {
        molde.position.set(1000, 1000, 0.6);
      }
      molde.updateMatrix();
      cacas.setMatrixAt(i, molde.matrix);
    }
    cacas.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < totalTiros; i = i + 1) {
      if (tiroAtivo[i] === true) {
        tiroX[i] = tiroX[i] + tiroDX[i] * 24 * dt;
        tiroZ[i] = tiroZ[i] + tiroDZ[i] * 24 * dt;
        if (tiroX[i] < -30 || tiroX[i] > 30 || tiroZ[i] < -30 || tiroZ[i] > 30) {
          tiroAtivo[i] = false;
        }
        for (let j = 0; j < totalCacas; j = j + 1) {
          if (cacaAtivo[j] === true && tiroAtivo[i] === true && tiroX[i] < cacaX[j] + 0.9 && tiroX[i] > cacaX[j] - 0.9 && tiroZ[i] < cacaZ[j] + 0.9 && tiroZ[i] > cacaZ[j] - 0.9) {
            cacaAtivo[j] = false;
            tiroAtivo[i] = false;
            pontos = pontos + 1;
          }
        }
        molde.position.set(tiroX[i], 0.6, tiroZ[i]);
      } else {
        molde.position.set(1000, 1000, 0.6);
      }
      molde.updateMatrix();
      tiros.setMatrixAt(i, molde.matrix);
    }
    tiros.instanceMatrix.needsUpdate = true;
    if (pontos >= 10) {
      rodando = false;
      scene.background = corVitoria;
    }
    if (escudo <= 0) {
      rodando = false;
      scene.background = corDerrota;
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

describe('Canvas 3D — Caça Estelar (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas do Entity Management (DOIS pools instanciados, estado em arrays, tiro direcional)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    // Dois InstancedMesh distintos (naves inimigas + tiros).
    expect(raw.split('"className":"InstancedMesh"').length - 1).toBe(2)
    expect(raw).toContain('setMatrixAt')
    expect(types.has('importStar')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('repeat')).toBe(false)
    expect(types.has('arrayPush')).toBe(true)
    expect(types.has('animationLoop')).toBe(true)
    expect(types.has('event')).toBe(true)
    // O estado por-entidade (o coração do Entity Management) vive em arrays paralelos.
    expect(raw).toContain('"cacaAtivo"')
    expect(raw).toContain('"tiroAtivo"')
    // ⭐ o tiro guarda a PRÓPRIA direção (o que o básico não consegue).
    expect(raw).toContain('"tiroDX"')
    expect(raw).toContain('"tiroDZ"')
    // E o combate (escudos, disparar) vive em variáveis próprias.
    expect(raw).toContain('"escudo"')
    expect(raw).toContain('"atacando"')
    expect(raw).toContain('"pontos"')
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
    expect(withoutUndefined(normalizeSZIR(cacaEstelarNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
