import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { mundoDeBlocosNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: o Minecraft do curso Clear Code recriado FIEL "na mão" em
 * three.js CRU (Canvas 3D do núcleo, sem extensão) — mundo 16×16 com blocos
 * como meshes num MAPA por chave de célula ("x,y,z" string, indexGet/indexSet)
 * e geometria/material COMPARTILHADOS por tipo, câmera em 1ª pessoa que gira
 * por ARRASTAR (pointer lock é vetado no parser) + WASD no plano + PULO com
 * gravidade e pouso sobre a COLUNA de blocos (altura do topo na célula), a
 * mecânica-assinatura de COLOCAR NA FACE (Raycaster pelo CENTRO → célula do
 * bloco atingido + face.normal → célula vizinha; alcance ~6 células), remover
 * com X, tipos por teclas 1/2/3 num HUD em DOM, GERAÇÃO procedural por loops
 * (chão 16×16 + muralha + 2 árvores com tronco e copa), contagem de blocos via
 * cena.children.length e objetivo verificável: construir até TOCAR A NUVEM.
 * O contrato: o jogo INTEIRO vira blocos do NÚCLEO (0 rawJS/rawCSS/rawHTML) e
 * o round-trip é um FIXPOINT estável, textual e de blocos.
 */

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mundo de Blocos</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="palco" width="960" height="600"></canvas>
    <div id="painel">Bloco: <span id="tipo">grama</span> Blocos na cena: <span id="blocos">0</span></div>
    <div id="ajuda">Arraste para olhar. WASD anda. Espaço pula. C coloca na face. X remove. 1 grama, 2 pedra, 3 madeira. Suba até tocar a nuvem!</div>
    <div id="mira">+</div>
    <div id="aviso">Você tocou a nuvem! Aperte Enter para continuar construindo</div>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = [
  'body { margin: 0; overflow: hidden; background: #87ceeb; color: #12325e; font-family: sans-serif; }',
  '#palco { display: block; width: 100%; height: 100vh; }',
  '#painel { position: absolute; top: 16px; left: 16px; font-size: 20px; }',
  '#ajuda { position: absolute; bottom: 16px; left: 16px; font-size: 14px; opacity: 0.8; }',
  '#mira { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 26px; pointer-events: none; }',
  '#aviso { position: absolute; top: 40%; width: 100%; text-align: center; font-size: 28px; display: none; }',
].join('\n')

const SCRIPT_JS = `import * as THREE from 'three';
const canvas = document.getElementById("palco");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, preserveDrawingBuffer: true });
renderer.setSize(960, 600);
const cena = new THREE.Scene();
cena.background = new THREE.Color("#87ceeb");
const camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 200);
camera.rotation.order = "YXZ";
camera.position.set(8, 2.6, 8);
const sol = new THREE.DirectionalLight(16777215, 1.2);
sol.position.set(20, 30, 10);
cena.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.7);
cena.add(ambiente);
const caixaGeo = new THREE.BoxGeometry(1, 1, 1);
const matGrama = new THREE.MeshStandardMaterial({ color: 5613632 });
const matPedra = new THREE.MeshStandardMaterial({ color: 10395294 });
const matMadeira = new THREE.MeshStandardMaterial({ color: 9271395 });
const matFolha = new THREE.MeshStandardMaterial({ color: 3046706 });
const nuvemGeo = new THREE.BoxGeometry(4, 1, 3);
const nuvemMat = new THREE.MeshStandardMaterial({ color: 16777215 });
const nuvem = new THREE.Mesh(nuvemGeo, nuvemMat);
nuvem.position.set(7, 11, 7);
cena.add(nuvem);
const mirador = new THREE.Raycaster();
const centro = new THREE.Vector2(0, 0);
let anguloY = 0;
let anguloX = 0;
let arrastando = false;
let ultimoX = 0;
let ultimoY = 0;
let frente = false;
let tras = false;
let esquerda = false;
let direita = false;
function chaveDe(x, y, z) {
  return x + "," + y + "," + z;
}
class World {
  constructor() {
    this.celulas = {};
  }
  colocar(tipo, x, y, z) {
    const chave = chaveDe(x, y, z);
    if (!this.celulas[chave]) {
      let material = matGrama;
      if (tipo === "pedra") {
        material = matPedra;
      }
      if (tipo === "madeira") {
        material = matMadeira;
      }
      if (tipo === "folha") {
        material = matFolha;
      }
      const bloco = new THREE.Mesh(caixaGeo, material);
      bloco.position.set(x, y, z);
      cena.add(bloco);
      this.celulas[chave] = bloco;
    }
  }
  remover(x, y, z) {
    const chave = chaveDe(x, y, z);
    const bloco = this.celulas[chave];
    if (bloco) {
      cena.remove(bloco);
      this.celulas[chave] = false;
    }
  }
  alturaDoTopo(x, z) {
    let topo = 0;
    for (let y = 0; y < 12; y++) {
      const chave = chaveDe(x, y, z);
      if (this.celulas[chave]) {
        topo = y + 1;
      }
    }
    return topo;
  }
  gerar() {
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        this.colocar("grama", x, 0, z);
      }
    }
    for (let i = 0; i < 16; i++) {
      this.colocar("pedra", i, 1, 0);
      this.colocar("pedra", i, 2, 0);
      this.colocar("pedra", i, 1, 15);
      this.colocar("pedra", i, 2, 15);
      this.colocar("pedra", 0, 1, i);
      this.colocar("pedra", 0, 2, i);
      this.colocar("pedra", 15, 1, i);
      this.colocar("pedra", 15, 2, i);
    }
    this.plantarArvore(4, 4);
    this.plantarArvore(11, 10);
  }
  plantarArvore(x, z) {
    for (let y = 1; y < 4; y++) {
      this.colocar("madeira", x, y, z);
    }
    for (let dx = 0; dx < 3; dx++) {
      for (let dz = 0; dz < 3; dz++) {
        this.colocar("folha", x + dx - 1, 4, z + dz - 1);
      }
    }
    this.colocar("folha", x, 5, z);
  }
}
class Player {
  constructor(mundo) {
    this.mundo = mundo;
    this.vy = 0;
    this.noChao = true;
  }
  pular() {
    if (this.noChao) {
      this.vy = 5.2;
      this.noChao = false;
    }
  }
  atualizar(dt) {
    let andarX = 0;
    let andarZ = 0;
    if (frente) {
      andarZ = andarZ + 1;
    }
    if (tras) {
      andarZ = andarZ - 1;
    }
    if (esquerda) {
      andarX = andarX - 1;
    }
    if (direita) {
      andarX = andarX + 1;
    }
    const antesX = camera.position.x;
    camera.position.x = camera.position.x + (Math.cos(anguloY) * andarX - Math.sin(anguloY) * andarZ) * 4 * dt;
    if (camera.position.x < 1) {
      camera.position.x = 1;
    }
    if (camera.position.x > 14) {
      camera.position.x = 14;
    }
    let topoAli = this.mundo.alturaDoTopo(Math.round(camera.position.x), Math.round(camera.position.z));
    if (topoAli > camera.position.y - 1.5) {
      camera.position.x = antesX;
    }
    const antesZ = camera.position.z;
    camera.position.z = camera.position.z + (0 - Math.sin(anguloY) * andarX - Math.cos(anguloY) * andarZ) * 4 * dt;
    if (camera.position.z < 1) {
      camera.position.z = 1;
    }
    if (camera.position.z > 14) {
      camera.position.z = 14;
    }
    topoAli = this.mundo.alturaDoTopo(Math.round(camera.position.x), Math.round(camera.position.z));
    if (topoAli > camera.position.y - 1.5) {
      camera.position.z = antesZ;
    }
    this.vy = this.vy - 12 * dt;
    camera.position.y = camera.position.y + this.vy * dt;
    const topo = this.mundo.alturaDoTopo(Math.round(camera.position.x), Math.round(camera.position.z));
    if (this.vy <= 0 && camera.position.y < topo + 1.6) {
      camera.position.y = topo + 1.6;
      this.vy = 0;
      this.noChao = true;
    } else {
      this.noChao = false;
    }
  }
}
class Game {
  constructor(mundo) {
    this.mundo = mundo;
    this.tipo = "grama";
    this.venceu = false;
  }
  trocarTipo(nome) {
    this.tipo = nome;
    document.getElementById("tipo").textContent = nome;
  }
  colocarNaFace() {
    mirador.setFromCamera(centro, camera);
    const intersecoes = mirador.intersectObjects(cena.children, false);
    if (intersecoes.length > 0) {
      const alvo = intersecoes[0];
      if (alvo.distance < 6) {
        const x = alvo.object.position.x + alvo.face.normal.x;
        const y = alvo.object.position.y + alvo.face.normal.y;
        const z = alvo.object.position.z + alvo.face.normal.z;
        this.mundo.colocar(this.tipo, x, y, z);
        this.contar();
      }
    }
  }
  removerApontado() {
    mirador.setFromCamera(centro, camera);
    const intersecoes = mirador.intersectObjects(cena.children, false);
    if (intersecoes.length > 0) {
      const alvo = intersecoes[0];
      if (alvo.distance < 6) {
        this.mundo.remover(alvo.object.position.x, alvo.object.position.y, alvo.object.position.z);
        this.contar();
      }
    }
  }
  contar() {
    const totalDeBlocos = cena.children.length;
    document.getElementById("blocos").textContent = totalDeBlocos;
  }
  verificar() {
    if (!this.venceu && camera.position.y > 10.4) {
      this.venceu = true;
      document.getElementById("aviso").style.display = "block";
    }
  }
}
const mundo = new World();
const jogador = new Player(mundo);
const jogo = new Game(mundo);
mundo.gerar();
jogo.contar();
document.addEventListener("pointerdown", (event) => {
  arrastando = true;
  ultimoX = event.clientX;
  ultimoY = event.clientY;
});
document.addEventListener("pointerup", (event) => {
  arrastando = false;
});
document.addEventListener("pointermove", (event) => {
  if (arrastando) {
    anguloY = anguloY - (event.clientX - ultimoX) * 0.005;
    anguloX = anguloX - (event.clientY - ultimoY) * 0.005;
    if (anguloX > 1.2) {
      anguloX = 1.2;
    }
    if (anguloX < -1.2) {
      anguloX = -1.2;
    }
    ultimoX = event.clientX;
    ultimoY = event.clientY;
  }
});
document.addEventListener("keydown", (event) => {
  if (event.code === "KeyW") {
    frente = true;
  }
  if (event.code === "KeyS") {
    tras = true;
  }
  if (event.code === "KeyA") {
    esquerda = true;
  }
  if (event.code === "KeyD") {
    direita = true;
  }
  if (event.code === "Space") {
    jogador.pular();
  }
  if (event.code === "KeyC") {
    jogo.colocarNaFace();
  }
  if (event.code === "KeyX") {
    jogo.removerApontado();
  }
  if (event.code === "Digit1") {
    jogo.trocarTipo("grama");
  }
  if (event.code === "Digit2") {
    jogo.trocarTipo("pedra");
  }
  if (event.code === "Digit3") {
    jogo.trocarTipo("madeira");
  }
  if (event.code === "Enter") {
    document.getElementById("aviso").style.display = "none";
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "KeyW") {
    frente = false;
  }
  if (event.code === "KeyS") {
    tras = false;
  }
  if (event.code === "KeyA") {
    esquerda = false;
  }
  if (event.code === "KeyD") {
    direita = false;
  }
});
const relogio = new THREE.Clock();
function passo() {
  const dt = relogio.getDelta();
  camera.rotation.y = anguloY;
  camera.rotation.x = anguloX;
  jogador.atualizar(dt);
  jogo.verificar();
  renderer.render(cena, camera);
  requestAnimationFrame(passo);
}
requestAnimationFrame(passo);`

const GAME_FILES = {
  'index.html': INDEX_HTML,
  'style.css': STYLE_CSS,
  'script.js': SCRIPT_JS,
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

/** Mapa seletor→declarações (funde regras do mesmo seletor) — para comparar CSS
 * sem depender da ORDEM das declarações (reordenar é lossless). */
function cssDeclMap(css: string): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {}
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = (m[1] ?? '').trim()
    const decls: Record<string, string> = map[sel] ?? {}
    map[sel] = decls
    for (const d of (m[2] ?? '').split(';')) {
      const i = d.indexOf(':')
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim()
    }
  }
  return map
}

/** Remove chaves internas de identidade (variam por parse) p/ comparar IRs. */
function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id' || k === '__declIds') continue
      out[k] = stripIds(v)
    }
    return out
  }
  return value
}

describe('Mundo de Blocos (Clear Code 3D) — 100% blocos do núcleo', () => {
  it('parseia os 3 arquivos SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    // Núcleo puro: nenhuma extensão.
    expect(ir.extensions).toEqual([])
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
    // O IR inteiro valida contra o schema (importável/persistível).
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
  })

  it('o exemplo do núcleo "Mundo de Blocos (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    // Round-trip por JSON dos DOIS lados: chaves `undefined` explícitas do parse
    // fresco (ex.: `else: undefined`) equivalem a chave ausente no embutido.
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(mundoDeBlocosNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Mundo de Blocos' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Mundo de Blocos' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // three.js CRU: o motor à mostra.
    expect(js).toContain("import * as THREE from 'three'")
    // Câmera FPS: ordem de rotação YXZ + giro por ARRASTAR.
    expect(js).toContain('camera.rotation.order = "YXZ";')
    expect(js).toContain('(event.clientX - ultimoX) * 0.005')
    // O MAPA por chave de célula: "x,y,z" string (indexGet/indexSet).
    expect(js).toContain('return x + "," + y + "," + z;')
    expect(js).toContain('this.celulas[chave] = bloco;')
    // A mecânica-assinatura: COLOCAR NA FACE (célula atingida + face.normal).
    expect(js).toContain('mirador.setFromCamera(centro, camera);')
    expect(js).toContain('alvo.object.position.x + alvo.face.normal.x')
    // Alcance limitado do ray, como no jogo real.
    expect(js).toContain('alvo.distance < 6')
    // Pulo com gravidade + pouso sobre a COLUNA de blocos da célula.
    expect(js).toContain('this.vy = this.vy - 12 * dt;')
    expect(js).toContain('camera.position.y = topo + 1.6;')
    // GERAÇÃO procedural por loops: chão, muralha e árvores.
    expect(js).toContain('this.colocar("grama", x, 0, z);')
    expect(js).toContain('this.colocar("pedra", i, 1, 0);')
    expect(js).toContain('this.plantarArvore(4, 4);')
    // Toque didático: contar os blocos da cena no HUD.
    expect(js).toContain('cena.children.length')
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Mundo de Blocos' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')
    // Facilitadores 3D amigáveis aparecem de fato (a Ponte mostra o amigável).
    expect(stateJson).toContain('"sz_t3d_set_position"')
    expect(stateJson).toContain('"sz_t3d_add_to"')
    expect(stateJson).toContain('"sz_t3d_render"')
    expect(stateJson).toContain('"sz_t3d_object_count"')

    // Carrega num workspace HEADLESS e reconstrói a IR pelos BLOCOS: o código
    // regenerado tem que ser o MESMO (blocos⇄código sem perda).
    const Blockly = require('blockly/core') as typeof import('blockly/core')
    const { ensureBlocklyInitialized } = require('../../blockly/setup') as {
      ensureBlocklyInitialized: () => void
    }
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Mundo de Blocos',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
      // CSS: comparação SEMÂNTICA (mapa seletor→declarações) — blocos dedicados
      // podem REORDENAR declarações (lossless). JS e HTML seguem byte-a-byte.
      expect(cssDeclMap(filesFromBlocks['style.css'])).toEqual(cssDeclMap(files1['style.css']))
      expect(filesFromBlocks['index.html']).toBe(files1['index.html'])
    } finally {
      ws.dispose()
    }
  })
})
