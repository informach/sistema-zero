import { describe, expect, it } from 'bun:test'
import { minaDeCristaisNaMaoExample } from '../../examples/core'
import { generateJS } from '../../generators/js'
import { behaviorStatements, normalizeSZIR } from '../../ir'
import { parseJS } from '../js'
import { parseProjectFiles } from '../project'

/**
 * Fixture-âncora do exemplo "Mina de Cristais (na mão)": o Minecraft do SimonDev
 * (Quick_MinecraftClone2) recriado SÓ com blocos do núcleo Canvas 3D (three.js
 * CRU) como uma MINA. Câmera OrthographicCamera aérea (isométrica) e mira por
 * CLIQUE: o Raycaster projeta o ponteiro do mouse (getBoundingClientRect →
 * coordenadas normalizadas) e pega o bloco sob o cursor. Os blocos vivem em DOIS
 * InstancedMesh (pools) — pedra e cristal — posicionados por setMatrixAt a partir
 * de ARRAYS DE ESTADO PARALELOS (x/z/ativo). Clicar num cristal soma ponto e o
 * apaga; clicar numa pedra só a remove. Veias novas surgem em ondas e um relógio
 * corre: junte 10 cristais e o céu fica dourado; sem tempo, vermelho. 0 rawJS,
 * fixpoint textual, e o drift da IR embutida em `examples/core.ts` é guardado
 * contra o parser vivo. ⚠️ os pools são criados UMA vez (o contrato do Canvas 3D
 * recusa `new` dentro de laço). ⭐ Distinto da trilogia "Mundo de Blocos" na unha
 * (1ª pessoa PerspectiveCamera que CONSTRÓI e sobe até a nuvem): aqui é
 * OrthographicCamera de cima, o clique só CAVA e a meta é uma quantidade a tempo.
 */

export const HTML = '<canvas id="jogo" width="900" height="600"></canvas>'

export const CSS = [
  'body { margin: 0; overflow: hidden; background: #0f0a1e; }',
  '#jogo { display: block; width: 100%; height: 100vh; }',
].join('\n')

export const JS = `import * as THREE from 'three';
const canvas = document.getElementById("jogo");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
renderer.setSize(900, 600);
const scene = new THREE.Scene();
const corCeu = new THREE.Color("#0f0a1e");
const corVitoria = new THREE.Color("#fbbf24");
const corDerrota = new THREE.Color("#7f1d1d");
scene.background = corCeu;
const camera = new THREE.OrthographicCamera(-9, 9, 6, -6, 0.1, 100);
camera.position.set(10, 13, 10);
camera.lookAt(0, 0, 0);
const sol = new THREE.DirectionalLight(16777215, 1);
sol.position.set(6, 12, 4);
scene.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.55);
scene.add(ambiente);
const chaoGeo = new THREE.PlaneGeometry(40, 40);
const chaoMat = new THREE.MeshStandardMaterial({ color: 1708582 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.rotation.set(-1.5708, 0, 0);
chao.position.set(0, -0.05, 0);
scene.add(chao);
const totalPedras = 54;
const pedraGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const pedraMat = new THREE.MeshStandardMaterial({ color: 5722958 });
const pedras = new THREE.InstancedMesh(pedraGeo, pedraMat, totalPedras);
scene.add(pedras);
const totalCristais = 30;
const cristalGeo = new THREE.BoxGeometry(0.7, 0.9, 0.7);
const cristalMat = new THREE.MeshStandardMaterial({ color: 2282478 });
const cristais = new THREE.InstancedMesh(cristalGeo, cristalMat, totalCristais);
scene.add(cristais);
const molde = new THREE.Object3D();
const pedraX = [];
const pedraZ = [];
const pedraAtivo = [];
const cristalX = [];
const cristalZ = [];
const cristalAtivo = [];
for (let i = 0; i < totalPedras; i = i + 1) {
  pedraX.push(0);
  pedraZ.push(0);
  pedraAtivo.push(false);
  molde.position.set(1000, 1000, 0);
  molde.updateMatrix();
  pedras.setMatrixAt(i, molde.matrix);
}
pedras.instanceMatrix.needsUpdate = true;
for (let i = 0; i < totalCristais; i = i + 1) {
  cristalX.push(0);
  cristalZ.push(0);
  cristalAtivo.push(false);
  molde.position.set(1000, 1000, 0);
  molde.updateMatrix();
  cristais.setMatrixAt(i, molde.matrix);
}
cristais.instanceMatrix.needsUpdate = true;
const mira = new THREE.Raycaster();
const ponteiro = new THREE.Vector2(0, 0);
const relogio = new THREE.Clock();
let pontos = 0;
let tempo = 45;
let tempoSpawn = 1.4;
let rodando = true;
function ativarPedra(px, pz) {
  let livre = -1;
  for (let i = 0; i < totalPedras; i = i + 1) {
    if (pedraAtivo[i] === false && livre === -1) {
      livre = i;
    }
  }
  if (livre >= 0) {
    pedraX[livre] = px;
    pedraZ[livre] = pz;
    pedraAtivo[livre] = true;
  }
}
function ativarCristal(px, pz) {
  let livre = -1;
  for (let i = 0; i < totalCristais; i = i + 1) {
    if (cristalAtivo[i] === false && livre === -1) {
      livre = i;
    }
  }
  if (livre >= 0) {
    cristalX[livre] = px;
    cristalZ[livre] = pz;
    cristalAtivo[livre] = true;
  }
}
function encherMina() {
  for (let i = 0; i < totalPedras; i = i + 1) {
    pedraAtivo[i] = false;
  }
  for (let i = 0; i < totalCristais; i = i + 1) {
    cristalAtivo[i] = false;
  }
  for (let linha = -3; linha < 4; linha = linha + 1) {
    for (let coluna = -3; coluna < 4; coluna = coluna + 1) {
      if (Math.random() < 0.28) {
        ativarCristal(coluna, linha);
      } else {
        ativarPedra(coluna, linha);
      }
    }
  }
}
encherMina();
document.addEventListener("pointerdown", (event) => {
  if (rodando === true) {
    const caixa = canvas.getBoundingClientRect();
    ponteiro.x = ((event.clientX - caixa.left) / caixa.width) * 2 - 1;
    ponteiro.y = -((event.clientY - caixa.top) / caixa.height) * 2 + 1;
    mira.setFromCamera(ponteiro, camera);
    const nosCristais = mira.intersectObject(cristais);
    if (nosCristais.length > 0) {
      const quem = nosCristais[0].instanceId;
      if (cristalAtivo[quem] === true) {
        cristalAtivo[quem] = false;
        pontos = pontos + 1;
      }
    } else {
      const nasPedras = mira.intersectObject(pedras);
      if (nasPedras.length > 0) {
        const qual = nasPedras[0].instanceId;
        pedraAtivo[qual] = false;
      }
    }
  }
});
document.addEventListener("keydown", (event) => {
  if (rodando === false) {
    encherMina();
    pontos = 0;
    tempo = 45;
    tempoSpawn = 1.4;
    rodando = true;
    scene.background = corCeu;
  }
});
function passo() {
  const dt = relogio.getDelta();
  if (rodando === true) {
    tempo = tempo - dt;
    tempoSpawn = tempoSpawn - dt;
    if (tempoSpawn <= 0) {
      tempoSpawn = 1.4;
      const cx = Math.floor(Math.random() * 9) - 4;
      const cz = Math.floor(Math.random() * 9) - 4;
      if (Math.random() < 0.35) {
        ativarCristal(cx, cz);
      } else {
        ativarPedra(cx, cz);
      }
    }
    for (let i = 0; i < totalPedras; i = i + 1) {
      if (pedraAtivo[i] === true) {
        molde.position.set(pedraX[i], 0.45, pedraZ[i]);
      } else {
        molde.position.set(1000, 1000, 0);
      }
      molde.updateMatrix();
      pedras.setMatrixAt(i, molde.matrix);
    }
    pedras.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < totalCristais; i = i + 1) {
      if (cristalAtivo[i] === true) {
        molde.position.set(cristalX[i], 0.45, cristalZ[i]);
      } else {
        molde.position.set(1000, 1000, 0);
      }
      molde.updateMatrix();
      cristais.setMatrixAt(i, molde.matrix);
    }
    cristais.instanceMatrix.needsUpdate = true;
    if (tempo <= 0) {
      rodando = false;
      scene.background = corDerrota;
    }
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

describe('Canvas 3D — Mina de Cristais (na mão) fixture', () => {
  it('parseia SEM rawJS/rawHTML/rawCSS', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
  })

  it('usa as técnicas da mina na unha (iso, mira por clique, dois pools em ondas)', () => {
    const ir = parseProjectFiles({ 'index.html': HTML, 'style.css': CSS, 'script.js': JS })
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    // Câmera de cima (isométrica), NÃO primeira pessoa.
    expect(raw).toContain('"className":"OrthographicCamera"')
    expect(raw).not.toContain('"className":"PerspectiveCamera"')
    // Mira por CLIQUE: Raycaster + o ponteiro do mouse projetado na tela.
    expect(raw).toContain('"className":"Raycaster"')
    expect(raw).toContain('setFromCamera')
    expect(raw).toContain('intersectObject')
    expect(raw).toContain('getBoundingClientRect')
    // DOIS pools em InstancedMesh, com estado em arrays paralelos.
    expect(raw).toContain('"className":"InstancedMesh"')
    expect(raw).toContain('setMatrixAt')
    expect(raw).toContain('"pedraAtivo"')
    expect(raw).toContain('"cristalAtivo"')
    expect(types.has('importStar')).toBe(true)
    expect(types.has('forRange')).toBe(true)
    expect(types.has('repeat')).toBe(false)
    expect(types.has('arrayPush')).toBe(true)
    expect(types.has('animationLoop')).toBe(true)
    expect(types.has('event')).toBe(true)
    // O diferencial da mina: placar e um RELÓGIO próprio (o Mundo de Blocos na
    // unha sobe uma torre e não tem cronômetro).
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"tempo"')
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
    expect(withoutUndefined(normalizeSZIR(minaDeCristaisNaMaoExample.ir))).toEqual(
      withoutUndefined(live),
    )
  })
})
