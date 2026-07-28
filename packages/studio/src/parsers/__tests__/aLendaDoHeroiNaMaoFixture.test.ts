import { describe, expect, it } from 'bun:test'
import { aLendaDoHeroiNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "A Lenda do Herói (na mão)": o RPG de ação do SimonDev
 * (Quick_3D_RPG) recriado SÓ com blocos do núcleo Canvas 3D (three.js CRU), a
 * prova de que "gerenciar muitos inimigos" é construível na unha. Câmera
 * OrthographicCamera aérea; o herói anda com as setas/WASD (flags de keydown/keyup)
 * e ATACA com a barra de espaço (flag `atacando`). Os monstros vivem num
 * InstancedMesh (um só desenho pra placa de vídeo) posicionados por setMatrixAt a
 * partir de ARRAYS DE ESTADO PARALELOS (x/z/ativo) — o estado por-entidade do
 * curso. Cada monstro persegue o herói (lerp); quem chega no alcance da espada e
 * está sendo atacado é derrotado, quem encosta tira um coração. Reúna 10 abates e
 * o céu fica dourado; sem corações, fica vermelho. 0 rawJS, fixpoint textual, e o
 * drift da IR embutida em `examples/core.ts` é guardado contra o parser vivo.
 * ⚠️ recursos criados UMA vez (fora dos laços): o contrato do Canvas 3D recusa
 * `new` dentro de laço, então o exército é um pool instanciado.
 */

const HTML = '<canvas id="jogo" width="900" height="600"></canvas>'

const CSS = [
  'body { margin: 0; overflow: hidden; background: #0f2417; }',
  '#jogo { display: block; width: 100%; height: 100vh; }',
].join('\n')

const JS = `import * as THREE from 'three';
const canvas = document.getElementById("jogo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(900, 600);
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
const corCeu = new THREE.Color("#0f2417");
const corVitoria = new THREE.Color("#fbbf24");
const corDerrota = new THREE.Color("#7f1d1d");
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
const chaoMat = new THREE.MeshStandardMaterial({ color: 1332013 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, 0, -0.3);
chao.receiveShadow = true;
scene.add(chao);
const heroiGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const heroiMat = new THREE.MeshStandardMaterial({ color: 2450411 });
const heroi = new THREE.Mesh(heroiGeo, heroiMat);
heroi.position.set(0, 0.7, 0);
heroi.castShadow = true;
scene.add(heroi);
const totalMonstros = 20;
const monstroGeo = new THREE.BoxGeometry(1, 1, 1);
const monstroMat = new THREE.MeshStandardMaterial({ color: 8141549 });
const monstros = new THREE.InstancedMesh(monstroGeo, monstroMat, totalMonstros);
monstros.castShadow = true;
scene.add(monstros);
const molde = new THREE.Object3D();
const monstroX = [];
const monstroZ = [];
const monstroAtivo = [];
for (let i = 0; i < totalMonstros; i = i + 1) {
  monstroX.push(0);
  monstroZ.push(0);
  monstroAtivo.push(false);
  molde.position.set(1000, 1000, 0.5);
  molde.updateMatrix();
  monstros.setMatrixAt(i, molde.matrix);
}
monstros.instanceMatrix.needsUpdate = true;
const relogio = new THREE.Clock();
let pontos = 0;
let vida = 3;
let tempoSpawn = 0.5;
let heroiX = 0;
let heroiZ = 0;
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
    for (let i = 0; i < totalMonstros; i = i + 1) {
      monstroAtivo[i] = false;
    }
    pontos = 0;
    vida = 3;
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
  if (event.code === "Space") {
    atacando = false;
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
    if (heroiX < -16) {
      heroiX = -16;
    }
    if (heroiX > 16) {
      heroiX = 16;
    }
    if (heroiZ < -16) {
      heroiZ = -16;
    }
    if (heroiZ > 16) {
      heroiZ = 16;
    }
    heroi.position.set(heroiX, 0.7, heroiZ);
    tempoSpawn = tempoSpawn - dt;
    if (tempoSpawn <= 0) {
      tempoSpawn = 1.3;
      let livre = -1;
      for (let i = 0; i < totalMonstros; i = i + 1) {
        if (monstroAtivo[i] === false && livre === -1) {
          livre = i;
        }
      }
      if (livre >= 0) {
        const angulo = Math.random() * 6.283;
        monstroX[livre] = Math.cos(angulo) * 15;
        monstroZ[livre] = Math.sin(angulo) * 15;
        monstroAtivo[livre] = true;
      }
    }
    for (let i = 0; i < totalMonstros; i = i + 1) {
      if (monstroAtivo[i] === true) {
        if (atacando === true && monstroX[i] < heroiX + 2.3 && monstroX[i] > heroiX - 2.3 && monstroZ[i] < heroiZ + 2.3 && monstroZ[i] > heroiZ - 2.3) {
          monstroAtivo[i] = false;
          pontos = pontos + 1;
        } else {
          if (monstroX[i] < heroiX + 1.2 && monstroX[i] > heroiX - 1.2 && monstroZ[i] < heroiZ + 1.2 && monstroZ[i] > heroiZ - 1.2) {
            monstroAtivo[i] = false;
            vida = vida - 1;
          } else {
            monstroX[i] = monstroX[i] + (heroiX - monstroX[i]) * 1.5 * dt;
            monstroZ[i] = monstroZ[i] + (heroiZ - monstroZ[i]) * 1.5 * dt;
          }
        }
        molde.position.set(monstroX[i], 0.5, monstroZ[i]);
      } else {
        molde.position.set(1000, 1000, 0.5);
      }
      molde.updateMatrix();
      monstros.setMatrixAt(i, molde.matrix);
    }
    monstros.instanceMatrix.needsUpdate = true;
    if (pontos >= 10) {
      rodando = false;
      scene.background = corVitoria;
    }
    if (vida <= 0) {
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

describe('Canvas 3D — A Lenda do Herói (na mão) fixture', () => {
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
    expect(raw).toContain('"monstroAtivo"')
    // E o combate (atacar, corações) vive em variáveis próprias.
    expect(raw).toContain('"atacando"')
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
    expect(withoutUndefined(normalizeSZIR(aLendaDoHeroiNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
