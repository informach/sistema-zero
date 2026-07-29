import { describe, expect, it } from 'bun:test'
import { cercoNaBaseNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Cerco na Base (na mão)": o FPS do SimonDev
 * (Quick_FPS1) recriado SÓ com blocos do núcleo Canvas 3D (three.js CRU). Câmera
 * em PRIMEIRA PESSOA de verdade: PerspectiveCamera com rotation.order "YXZ",
 * olhar por arrasto do mouse (anguloY/anguloX) e MIRA por Raycaster no centro da
 * tela. Os aliens vivem num InstancedMesh (pool) posicionados por setMatrixAt a
 * partir de ARRAYS DE ESTADO PARALELOS (x/z/ativo) e nascem em ONDAS, avançando
 * pro centro (lerp). Segure o espaço para CARREGAR e solte para atirar (o raio
 * derruba quem está na mira; carga cheia estoura os vizinhos). A MUNIÇÃO recarrega
 * sozinha. Abata 12 e o céu fica dourado; sem vidas, vermelho. 0 rawJS, fixpoint
 * textual, e o drift da IR embutida em `examples/core.ts` é guardado contra o
 * parser vivo. ⚠️ o pool é criado UMA vez (o contrato do Canvas 3D recusa `new`
 * dentro de laço).
 */

const HTML = '<canvas id="jogo" width="900" height="600"></canvas>'

const CSS = [
  'body { margin: 0; overflow: hidden; background: #1a0f2e; }',
  '#jogo { display: block; width: 100%; height: 100vh; }',
  '#mira { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fde047; font-size: 24px; }',
].join('\n')

const JS = `import * as THREE from 'three';
const canvas = document.getElementById("jogo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(900, 600);
const scene = new THREE.Scene();
const corCeu = new THREE.Color("#1a0f2e");
const corVitoria = new THREE.Color("#fbbf24");
const corDerrota = new THREE.Color("#7f1d1d");
scene.background = corCeu;
const camera = new THREE.PerspectiveCamera(72, 1.5, 0.1, 120);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.6, 0);
const sol = new THREE.DirectionalLight(16777215, 1);
sol.position.set(6, 12, 4);
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.6);
scene.add(ambiente);
const chaoGeo = new THREE.PlaneGeometry(60, 60);
const chaoMat = new THREE.MeshStandardMaterial({ color: 2956093 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.rotation.set(-1.5708, 0, 0);
chao.position.set(0, 0, 0);
scene.add(chao);
const totalAliens = 20;
const alienGeo = new THREE.BoxGeometry(1, 1.4, 1);
const alienMat = new THREE.MeshStandardMaterial({ color: 4906624 });
const aliens = new THREE.InstancedMesh(alienGeo, alienMat, totalAliens);
scene.add(aliens);
const molde = new THREE.Object3D();
const alienX = [];
const alienZ = [];
const alienAtivo = [];
for (let i = 0; i < totalAliens; i = i + 1) {
  alienX.push(0);
  alienZ.push(0);
  alienAtivo.push(false);
  molde.position.set(1000, 1000, 0.7);
  molde.updateMatrix();
  aliens.setMatrixAt(i, molde.matrix);
}
aliens.instanceMatrix.needsUpdate = true;
const mira = new THREE.Raycaster();
const centro = new THREE.Vector2(0, 0);
const relogio = new THREE.Clock();
let pontos = 0;
let vida = 3;
let municao = 6;
let carga = 0;
let recargaMunicao = 1.2;
let tempoSpawn = 0.5;
let anguloY = 0;
let anguloX = 0;
let arrastando = false;
let ultimoX = 0;
let ultimoY = 0;
let carregando = false;
let rodando = true;
document.addEventListener("pointerdown", (event) => {
  arrastando = true;
  ultimoX = event.clientX;
  ultimoY = event.clientY;
});
document.addEventListener("pointerup", (event) => {
  arrastando = false;
});
document.addEventListener("pointermove", (event) => {
  if (arrastando === true) {
    anguloY = anguloY - (event.clientX - ultimoX) * 0.005;
    anguloX = anguloX - (event.clientY - ultimoY) * 0.005;
    if (anguloX > 0.6) {
      anguloX = 0.6;
    }
    if (anguloX < -0.6) {
      anguloX = -0.6;
    }
    ultimoX = event.clientX;
    ultimoY = event.clientY;
  }
});
document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    carregando = true;
  }
  if (rodando === false) {
    for (let i = 0; i < totalAliens; i = i + 1) {
      alienAtivo[i] = false;
    }
    pontos = 0;
    vida = 3;
    municao = 6;
    carga = 0;
    tempoSpawn = 0.5;
    rodando = true;
    scene.background = corCeu;
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    carregando = false;
    if (carga > 0 && municao >= 1) {
      mira.setFromCamera(centro, camera);
      const acertos = mira.intersectObject(aliens);
      if (acertos.length > 0) {
        const quem = acertos[0].instanceId;
        if (alienAtivo[quem] === true) {
          const bx = alienX[quem];
          const bz = alienZ[quem];
          alienAtivo[quem] = false;
          pontos = pontos + 1;
          if (carga >= 0.7) {
            for (let i = 0; i < totalAliens; i = i + 1) {
              if (alienAtivo[i] === true && alienX[i] < bx + 4 && alienX[i] > bx - 4 && alienZ[i] < bz + 4 && alienZ[i] > bz - 4) {
                alienAtivo[i] = false;
                pontos = pontos + 1;
              }
            }
          }
        }
      }
      municao = municao - 1;
    }
    carga = 0;
  }
});
function passo() {
  const dt = relogio.getDelta();
  if (rodando === true) {
    camera.rotation.set(anguloX, anguloY, 0);
    if (carregando === true) {
      carga = carga + dt * 1.5;
      if (carga > 1) {
        carga = 1;
      }
    }
    recargaMunicao = recargaMunicao - dt;
    if (recargaMunicao <= 0) {
      recargaMunicao = 1.2;
      if (municao < 6) {
        municao = municao + 1;
      }
    }
    tempoSpawn = tempoSpawn - dt;
    if (tempoSpawn <= 0) {
      tempoSpawn = 1.4;
      let livre = -1;
      for (let i = 0; i < totalAliens; i = i + 1) {
        if (alienAtivo[i] === false && livre === -1) {
          livre = i;
        }
      }
      if (livre >= 0) {
        const angulo = Math.random() * 6.283;
        alienX[livre] = Math.cos(angulo) * 22;
        alienZ[livre] = Math.sin(angulo) * 22;
        alienAtivo[livre] = true;
      }
    }
    for (let i = 0; i < totalAliens; i = i + 1) {
      if (alienAtivo[i] === true) {
        alienX[i] = alienX[i] + (0 - alienX[i]) * 0.4 * dt;
        alienZ[i] = alienZ[i] + (0 - alienZ[i]) * 0.4 * dt;
        if (alienX[i] < 1.6 && alienX[i] > -1.6 && alienZ[i] < 1.6 && alienZ[i] > -1.6) {
          alienAtivo[i] = false;
          vida = vida - 1;
          if (vida <= 0) {
            rodando = false;
            scene.background = corDerrota;
          }
        }
        molde.position.set(alienX[i], 0.7, alienZ[i]);
      } else {
        molde.position.set(1000, 1000, 0.7);
      }
      molde.updateMatrix();
      aliens.setMatrixAt(i, molde.matrix);
    }
    aliens.instanceMatrix.needsUpdate = true;
    if (pontos >= 12) {
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

describe('Canvas 3D — Cerco na Base (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas do FPS na unha (1ª pessoa, mira por Raycaster, pool de aliens em ondas)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    // Primeira pessoa DE VERDADE: PerspectiveCamera + mira por Raycaster.
    expect(raw).toContain('"className":"PerspectiveCamera"')
    expect(raw).toContain('"className":"Raycaster"')
    // O exército vive num InstancedMesh (pool) com estado em arrays paralelos.
    expect(raw).toContain('"className":"InstancedMesh"')
    expect(raw).toContain('setMatrixAt')
    expect(raw).toContain('"alienAtivo"')
    expect(types.has('importStar')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('repeat')).toBe(false)
    expect(types.has('arrayPush')).toBe(true)
    expect(types.has('animationLoop')).toBe(true)
    expect(types.has('event')).toBe(true)
    // O diferencial: munição e carga vivem em variáveis próprias.
    expect(raw).toContain('"municao"')
    expect(raw).toContain('"carga"')
    expect(raw).toContain('"vida"')
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
    expect(withoutUndefined(normalizeSZIR(cercoNaBaseNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
