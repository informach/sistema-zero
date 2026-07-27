import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { labirintoDosRobosNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: o labirinto de tiro estilo Doom do curso Clear Code recriado
 * FIEL "na mão" em three.js CRU (Canvas 3D do núcleo, sem extensão) — câmera em
 * 1ª PESSOA com rotation.order "YXZ" que gira por ARRASTAR o mouse (pointerdown/
 * pointermove/pointerup com clamp do pitch; pointer lock é vetado no parser), WASD
 * movendo NO PLANO pela base vetorial do yaw (sin/cos de anguloY × dt), paredes
 * BoxGeometry nascidas de um MAPA EM STRINGS (data-driven), colisão jogador×
 * parede por AABB eixo a eixo (wall-slide, compartilhada com os robôs), ROBÔS
 * em classe (grupo de caixas) com FSM por distância (parado/perseguir) que
 * encaram com lookAt, dano por toque com i-frames + flash vermelho em DOM, TIRO
 * por ESPAÇO (sem conflito com o arrastar) via Raycaster pelo CENTRO da tela,
 * vida/pontos num HUD em DOM, vitória ao derrotar todos, derrota com vida 0 e
 * reinício por Enter ou clique. Névoa para o clima. O contrato: o jogo INTEIRO
 * vira blocos do NÚCLEO (0 rawJS/rawCSS/rawHTML) e o round-trip é um FIXPOINT
 * estável, textual e de blocos.
 */

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Labirinto dos Robôs</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="palco" width="960" height="600"></canvas>
    <div id="painel">Vida: <span id="vida">100</span> Pontos: <span id="pontos">0</span></div>
    <div id="ajuda">Arraste para olhar. WASD anda. Espaço atira. Enter reinicia.</div>
    <div id="mira">+</div>
    <div id="dano"></div>
    <div id="aviso">Fim de jogo! Aperte Enter ou clique para tentar de novo</div>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = [
  'body { margin: 0; overflow: hidden; background: #0a0a14; color: white; font-family: sans-serif; }',
  '#palco { display: block; width: 100%; height: 100vh; }',
  '#painel { position: absolute; top: 16px; left: 16px; font-size: 20px; }',
  '#ajuda { position: absolute; bottom: 16px; left: 16px; font-size: 14px; opacity: 0.8; }',
  '#mira { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 26px; pointer-events: none; }',
  '#dano { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(198, 40, 40, 0.3); display: none; pointer-events: none; }',
  '#aviso { position: absolute; top: 40%; width: 100%; text-align: center; font-size: 28px; display: none; }',
].join('\n')

const SCRIPT_JS = `import * as THREE from 'three';
const canvas = document.getElementById("palco");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, preserveDrawingBuffer: true });
renderer.setSize(960, 600);
const cena = new THREE.Scene();
cena.background = new THREE.Color("#0a0a14");
cena.fog = new THREE.Fog("#0a0a14", 6, 26);
const camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 100);
camera.rotation.order = "YXZ";
camera.position.set(2, 1.6, 2);
const sol = new THREE.DirectionalLight(16777215, 1.2);
sol.position.set(8, 12, 6);
cena.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.6);
cena.add(ambiente);
const chaoGeo = new THREE.BoxGeometry(26, 1, 26);
const chaoMat = new THREE.MeshStandardMaterial({ color: 3881807 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(11, -0.5, 11);
cena.add(chao);
const mapa = ["PPPPPPPPPPPP", "P..........P", "P.PP.PP.PP.P", "P..........P", "P.PP.PP.PP.P", "P..........P", "P.PP.PP.PP.P", "P..........P", "P.PP.PP.PP.P", "P..........P", "P..........P", "PPPPPPPPPPPP"];
const paredeGeo = new THREE.BoxGeometry(2, 3, 2);
const paredeMat = new THREE.MeshStandardMaterial({ color: 7166607 });
const paredes = [];
function criarParede(coluna, linha) {
  const parede = new THREE.Mesh(paredeGeo, paredeMat);
  parede.position.set(coluna * 2, 1.5, linha * 2);
  cena.add(parede);
  paredes.push(parede);
}
for (let linha = 0; linha < mapa.length; linha++) {
  for (let coluna = 0; coluna < 12; coluna++) {
    const letra = mapa[linha].charAt(coluna);
    if (letra === "P") {
      criarParede(coluna, linha);
    }
  }
}
const mirador = new THREE.Raycaster();
const centro = new THREE.Vector2(0, 0);
const POSTOS = [[20, 4], [8, 10], [14, 12], [2, 16], [20, 18]];
let anguloY = 3.14;
let anguloX = 0;
let arrastando = false;
let ultimoX = 0;
let ultimoY = 0;
let frente = false;
let tras = false;
let esquerda = false;
let direita = false;
function resolverX(objeto, raio) {
  paredes.forEach((parede) => {
    if (objeto.position.x + raio > parede.position.x - 1 && objeto.position.x - raio < parede.position.x + 1 && objeto.position.z + raio > parede.position.z - 1 && objeto.position.z - raio < parede.position.z + 1) {
      if (objeto.position.x < parede.position.x) {
        objeto.position.x = parede.position.x - 1 - raio;
      } else {
        objeto.position.x = parede.position.x + 1 + raio;
      }
    }
  });
}
function resolverZ(objeto, raio) {
  paredes.forEach((parede) => {
    if (objeto.position.x + raio > parede.position.x - 1 && objeto.position.x - raio < parede.position.x + 1 && objeto.position.z + raio > parede.position.z - 1 && objeto.position.z - raio < parede.position.z + 1) {
      if (objeto.position.z < parede.position.z) {
        objeto.position.z = parede.position.z - 1 - raio;
      } else {
        objeto.position.z = parede.position.z + 1 + raio;
      }
    }
  });
}
class Robot {
  constructor(dono, x, z) {
    this.dono = dono;
    this.vivo = true;
    this.estado = "parado";
    this.grupo = new THREE.Group();
    this.corpo = new THREE.Mesh(corpoGeo, corpoMat);
    this.corpo.position.set(0, 0.9, 0);
    this.grupo.add(this.corpo);
    this.cabeca = new THREE.Mesh(cabecaGeo, cabecaMat);
    this.cabeca.position.set(0, 2, 0);
    this.grupo.add(this.cabeca);
    this.grupo.position.set(x, 0, z);
    cena.add(this.grupo);
  }
  atualizar(dt) {
    const dx = camera.position.x - this.grupo.position.x;
    const dz = camera.position.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);
    if (distancia < 9) {
      this.estado = "perseguir";
    } else {
      this.estado = "parado";
    }
    if (this.estado === "perseguir") {
      this.grupo.lookAt(camera.position.x, 0, camera.position.z);
      this.grupo.position.x = this.grupo.position.x + dx / distancia * 2.4 * dt;
      resolverX(this.grupo, 0.7);
      this.grupo.position.z = this.grupo.position.z + dz / distancia * 2.4 * dt;
      resolverZ(this.grupo, 0.7);
    }
    if (distancia < 1.4) {
      this.dono.machucar();
    }
  }
}
const corpoGeo = new THREE.BoxGeometry(1.1, 1.8, 0.7);
const corpoMat = new THREE.MeshStandardMaterial({ color: 12986408 });
const cabecaGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
const cabecaMat = new THREE.MeshStandardMaterial({ color: 16757504 });
class Game {
  constructor() {
    this.vida = 100;
    this.pontos = 0;
    this.invencivel = 0;
    this.fim = false;
    this.robos = [];
  }
  comecar() {
    this.robos.forEach((robo) => {
      cena.remove(robo.grupo);
    });
    this.robos = [];
    POSTOS.forEach((posto) => {
      this.robos.push(new Robot(this, posto[0], posto[1]));
    });
    this.vida = 100;
    this.pontos = 0;
    this.invencivel = 0;
    this.fim = false;
    camera.position.set(2, 1.6, 2);
    anguloY = 3.14;
    anguloX = 0;
    document.getElementById("vida").textContent = this.vida;
    document.getElementById("pontos").textContent = this.pontos;
    document.getElementById("aviso").style.display = "none";
  }
  machucar() {
    if (this.invencivel <= 0 && !this.fim) {
      this.vida = this.vida - 10;
      this.invencivel = 1.5;
      document.getElementById("vida").textContent = this.vida;
      if (this.vida <= 0) {
        this.fim = true;
        document.getElementById("aviso").textContent = "Fim de jogo! Aperte Enter ou clique para tentar de novo";
        document.getElementById("aviso").style.display = "block";
      }
    }
  }
  atirar() {
    if (!this.fim) {
      mirador.setFromCamera(centro, camera);
      const intersecoes = mirador.intersectObjects(cena.children, true);
      if (intersecoes.length > 0) {
        const alvo = intersecoes[0];
        if (alvo.distance < 30) {
          this.robos.forEach((robo) => {
            if (robo.vivo && alvo.object.parent === robo.grupo) {
              robo.vivo = false;
              cena.remove(robo.grupo);
              this.pontos = this.pontos + 1;
              document.getElementById("pontos").textContent = this.pontos;
            }
          });
          this.robos = this.robos.filter((robo) => robo.vivo);
          if (this.robos.length === 0) {
            this.fim = true;
            document.getElementById("aviso").textContent = "Você venceu! Aperte Enter ou clique para jogar de novo";
            document.getElementById("aviso").style.display = "block";
          }
        }
      }
    }
  }
  atualizar(dt) {
    if (!this.fim) {
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
      camera.position.x = camera.position.x + (Math.cos(anguloY) * andarX - Math.sin(anguloY) * andarZ) * 6 * dt;
      resolverX(camera, 0.5);
      camera.position.z = camera.position.z + (0 - Math.sin(anguloY) * andarX - Math.cos(anguloY) * andarZ) * 6 * dt;
      resolverZ(camera, 0.5);
      this.robos.forEach((robo) => {
        robo.atualizar(dt);
      });
      if (this.invencivel > 0) {
        this.invencivel = this.invencivel - dt;
        document.getElementById("dano").style.display = "block";
      } else {
        document.getElementById("dano").style.display = "none";
      }
    }
  }
}
const jogo = new Game();
jogo.comecar();
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
    jogo.atirar();
  }
  if (event.code === "Enter" && jogo.fim) {
    jogo.comecar();
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
canvas.addEventListener("pointerdown", () => {
  if (jogo.fim) {
    jogo.comecar();
  }
});
const relogio = new THREE.Clock();
function passo() {
  const dt = relogio.getDelta();
  camera.rotation.y = anguloY;
  camera.rotation.x = anguloX;
  jogo.atualizar(dt);
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

describe('Labirinto dos Robôs (Clear Code 3D) — 100% blocos do núcleo', () => {
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

  it('o exemplo do núcleo "Labirinto dos Robôs (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    // Round-trip por JSON dos DOIS lados: chaves `undefined` explícitas do parse
    // fresco (ex.: `else: undefined`) equivalem a chave ausente no embutido.
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(labirintoDosRobosNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Labirinto dos Robôs' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Labirinto dos Robôs' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // three.js CRU: o motor à mostra.
    expect(js).toContain("import * as THREE from 'three'")
    // Câmera FPS: ordem de rotação YXZ + yaw/pitch aplicados no quadro.
    expect(js).toContain('camera.rotation.order = "YXZ";')
    expect(js).toContain('camera.rotation.y = anguloY;')
    // A câmera gira por ARRASTAR (pointer lock é vetado no parser).
    expect(js).toContain('(event.clientX - ultimoX) * 0.005')
    // A lição da base vetorial: andar NO PLANO pelo yaw.
    expect(js).toContain('Math.sin(anguloY)')
    expect(js).toContain('Math.cos(anguloY)')
    // Labirinto DATA-DRIVEN: paredes nascem de um mapa em strings.
    expect(js).toContain('if (letra === "P")')
    // Colisão AABB com wall-slide: empurra de volta pelo eixo.
    expect(js).toContain('objeto.position.x = parede.position.x - 1 - raio;')
    // TIRO pelo CENTRO da tela: Raycaster + mira fixa.
    expect(js).toContain('mirador.setFromCamera(centro, camera);')
    expect(js).toContain('mirador.intersectObjects(cena.children, true)')
    expect(js).toContain('alvo.object.parent === robo.grupo')
    // Culling dos derrotados: filter mantém só os vivos.
    expect(js).toContain('.filter((robo) => robo.vivo)')
    // FSM por distância + encarar o jogador.
    expect(js).toContain('this.estado = "perseguir";')
    expect(js).toContain('.lookAt(camera.position.x, 0, camera.position.z)')
    // Dano por toque com i-frames + HUD em DOM.
    expect(js).toContain('this.vida = this.vida - 10;')
    expect(js).toContain('document.getElementById("vida").textContent = this.vida;')
    // Névoa para o clima do labirinto.
    expect(js).toContain('new THREE.Fog')
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Labirinto dos Robôs' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')
    // Facilitadores 3D amigáveis aparecem de fato (a Ponte mostra o amigável).
    expect(stateJson).toContain('"sz_t3d_set_position"')
    expect(stateJson).toContain('"sz_t3d_add_to"')
    expect(stateJson).toContain('"sz_t3d_render"')
    expect(stateJson).toContain('"sz_t3d_set_fog"')

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
        projectName: 'Labirinto dos Robôs',
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
