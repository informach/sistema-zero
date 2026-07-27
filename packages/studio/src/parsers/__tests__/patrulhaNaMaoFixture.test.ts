import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { patrulhaEspacialNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: o Space Shooter 3D do curso Clear Code (raylib) recriado FIEL
 * "na mão" em three.js CRU (Canvas 3D do núcleo, sem extensão) — nave de
 * caixas (grupo) andando SÓ no X com clamp, INCLINAÇÃO ao virar (rotation.z
 * persegue o alvo proporcional à direção, clamp ±0.26 rad) e BOBBING senoidal
 * (Math.sin(tempoTotal*5) com o tempo acumulado por dt), câmera fixa
 * atrás/acima, laser como caixa fina EMISSIVA, meteoros como esferas
 * sorteadas (raio 0.6..1.5, cores variadas, SEM textura) nascendo em z=-20
 * vindo para +z com rotação nos 3 eixos, FLASH sem shader (material.emissive
 * vira branco por ~0,1s) + MORTE DRAMÁTICA (para de mover e some após 0,25s)
 * — e o material é POR METEORO de propósito: compartilhado, o flash acenderia
 * TODOS de uma vez. SOMBRAS FAKE do curso (cilindros achatados
 * semi-transparentes seguindo x/z do dono a cada quadro; a da nave cresce com
 * a altura do bobbing) sobre um chão escuro, colisões à mão (laser
 * AABB×esfera via clamp por eixo; nave×meteoro por esferas com raio da nave
 * reduzido), spawn por FUNÇÃO chamada pelo laço (nunca newInstance em laço —
 * contrato do Canvas 3D), culling além de z>8/z<-40, placar + "Objetos na
 * cena" em DOM (cena.children.length), laço com THREE.Clock e telas de
 * início/fim com Enter ou clique. O contrato: o jogo INTEIRO vira blocos do
 * NÚCLEO (0 rawJS/rawCSS/rawHTML) e o round-trip é um FIXPOINT estável,
 * textual e de blocos.
 */

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Patrulha Espacial</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="palco" width="960" height="600"></canvas>
    <div id="painel">Pontos: <span id="pontos">0</span> Objetos na cena: <span id="objetos">0</span></div>
    <div id="aviso">Patrulha Espacial: setas movem, espaço atira. Aperte Enter ou clique para começar</div>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = [
  'body { margin: 0; overflow: hidden; background: #050510; color: white; font-family: sans-serif; }',
  '#palco { display: block; width: 100%; height: 100vh; }',
  '#painel { position: absolute; top: 16px; left: 16px; font-size: 20px; }',
  '#aviso { position: absolute; top: 40%; width: 100%; text-align: center; font-size: 28px; }',
].join('\n')

const SCRIPT_JS = `import * as THREE from 'three';
const canvas = document.getElementById("palco");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, preserveDrawingBuffer: true });
renderer.setSize(960, 600);
const cena = new THREE.Scene();
cena.background = new THREE.Color("#050510");
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 200);
camera.position.set(0, 5, 9);
camera.lookAt(0, 0, -10);
const sol = new THREE.DirectionalLight(16777215, 1.4);
sol.position.set(6, 12, 4);
cena.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.5);
cena.add(ambiente);
const chaoGeo = new THREE.BoxGeometry(26, 1, 80);
const chaoMat = new THREE.MeshStandardMaterial({ color: 1183262 });
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, -2, -20);
cena.add(chao);
const nave = new THREE.Group();
const corpoGeo = new THREE.BoxGeometry(0.9, 0.5, 2.2);
const corpoMat = new THREE.MeshStandardMaterial({ color: 5025616 });
const corpo = new THREE.Mesh(corpoGeo, corpoMat);
corpo.position.set(0, 0.25, 0);
nave.add(corpo);
const asaGeo = new THREE.BoxGeometry(2.8, 0.15, 0.9);
const asaMat = new THREE.MeshStandardMaterial({ color: 3031392 });
const asa = new THREE.Mesh(asaGeo, asaMat);
asa.position.set(0, 0.2, 0.4);
nave.add(asa);
const cabineGeo = new THREE.BoxGeometry(0.5, 0.35, 0.7);
const cabineMat = new THREE.MeshStandardMaterial({ color: 10146815 });
const cabine = new THREE.Mesh(cabineGeo, cabineMat);
cabine.position.set(0, 0.55, -0.3);
nave.add(cabine);
cena.add(nave);
const sombraGeo = new THREE.CylinderGeometry(1, 1, 0.1, 20);
const sombraMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3 });
const sombraDaNave = new THREE.Mesh(sombraGeo, sombraMat);
sombraDaNave.position.set(0, -1.45, 0);
cena.add(sombraDaNave);
const laserGeo = new THREE.BoxGeometry(0.12, 0.12, 1.6);
const laserMat = new THREE.MeshStandardMaterial({ color: 16724016, emissive: 16724016 });
const CORES_DO_METEORO = [13382451, 10066329, 12345678, 9127187];
class Laser {
  constructor(x, z) {
    this.mesh = new THREE.Mesh(laserGeo, laserMat);
    this.mesh.position.set(x, 0.25, z);
    cena.add(this.mesh);
    this.fora = false;
  }
  atualizar(dt) {
    this.mesh.position.z = this.mesh.position.z - 30 * dt;
    if (this.mesh.position.z < -40) {
      cena.remove(this.mesh);
      this.fora = true;
    }
  }
}
class Meteoro {
  constructor() {
    this.raio = 0.6 + Math.random() * 0.9;
    const cor = CORES_DO_METEORO[Math.floor(Math.random() * CORES_DO_METEORO.length)];
    const material = new THREE.MeshStandardMaterial({ color: cor });
    this.material = material;
    const geometria = new THREE.SphereGeometry(this.raio, 10, 10);
    this.mesh = new THREE.Mesh(geometria, material);
    this.mesh.position.set(Math.random() * 12 - 6, 0, -20);
    cena.add(this.mesh);
    this.sombra = new THREE.Mesh(sombraGeo, sombraMat);
    this.sombra.scale.set(this.raio * 0.8, 1, this.raio * 0.8);
    this.sombra.position.set(this.mesh.position.x, -1.45, -20);
    cena.add(this.sombra);
    this.velocidade = 3 + Math.random() * 2;
    this.giroX = Math.random() * 2 - 1;
    this.giroY = Math.random() * 2 - 1;
    this.giroZ = Math.random() * 2 - 1;
    this.atingido = false;
    this.brilhando = false;
    this.morte = 0;
    this.fora = false;
  }
  acender() {
    this.material.emissive = new THREE.Color(16777215);
    this.atingido = true;
    this.brilhando = true;
    this.morte = 0.25;
  }
  sumir() {
    cena.remove(this.mesh);
    cena.remove(this.sombra);
    this.fora = true;
  }
  atualizar(dt) {
    if (this.atingido) {
      this.morte = this.morte - dt;
      if (this.brilhando && this.morte < 0.15) {
        this.brilhando = false;
        this.material.emissive = new THREE.Color(0);
      }
      if (this.morte <= 0) {
        this.sumir();
      }
    } else {
      this.mesh.position.z = this.mesh.position.z + this.velocidade * dt;
      this.mesh.rotation.x = this.mesh.rotation.x + this.giroX * dt;
      this.mesh.rotation.y = this.mesh.rotation.y + this.giroY * dt;
      this.mesh.rotation.z = this.mesh.rotation.z + this.giroZ * dt;
      this.sombra.position.set(this.mesh.position.x, -1.45, this.mesh.position.z);
      if (this.mesh.position.z > 8) {
        this.sumir();
      }
    }
  }
}
let lasers = [];
let meteoros = [];
let esquerda = false;
let direita = false;
let tempoDeMeteoro = 0;
let tempoTotal = 0;
let pontos = 0;
let tela = "inicio";
function atirar() {
  lasers.push(new Laser(nave.position.x, nave.position.z - 1.6));
}
function criarMeteoro() {
  meteoros.push(new Meteoro());
}
function contarObjetos() {
  const totalDeObjetos = cena.children.length;
  document.getElementById("objetos").textContent = totalDeObjetos;
}
function acertou(laser, meteoro) {
  const mx = meteoro.mesh.position.x;
  const my = meteoro.mesh.position.y;
  const mz = meteoro.mesh.position.z;
  const cx = Math.max(laser.mesh.position.x - 0.06, Math.min(mx, laser.mesh.position.x + 0.06));
  const cy = Math.max(laser.mesh.position.y - 0.06, Math.min(my, laser.mesh.position.y + 0.06));
  const cz = Math.max(laser.mesh.position.z - 0.8, Math.min(mz, laser.mesh.position.z + 0.8));
  const dx = mx - cx;
  const dy = my - cy;
  const dz = mz - cz;
  return dx * dx + dy * dy + dz * dz < meteoro.raio * meteoro.raio;
}
function bateuNaNave(meteoro) {
  const dx = nave.position.x - meteoro.mesh.position.x;
  const dy = nave.position.y - meteoro.mesh.position.y;
  const dz = nave.position.z - meteoro.mesh.position.z;
  const alcance = meteoro.raio + 0.6;
  return dx * dx + dy * dy + dz * dz < alcance * alcance;
}
function reiniciar() {
  lasers.forEach((laser) => {
    cena.remove(laser.mesh);
  });
  meteoros.forEach((meteoro) => {
    meteoro.sumir();
  });
  lasers = [];
  meteoros = [];
  nave.position.set(0, 0, 0);
  nave.rotation.z = 0;
  tempoDeMeteoro = 0;
  tempoTotal = 0;
  pontos = 0;
  tela = "jogando";
  document.getElementById("aviso").style.display = "none";
  contarObjetos();
}
document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft") {
    esquerda = true;
  }
  if (event.code === "ArrowRight") {
    direita = true;
  }
  if (event.code === "Space" && tela === "jogando") {
    atirar();
  }
  if (event.code === "Enter" && tela !== "jogando") {
    reiniciar();
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft") {
    esquerda = false;
  }
  if (event.code === "ArrowRight") {
    direita = false;
  }
});
canvas.addEventListener("pointerdown", () => {
  if (tela !== "jogando") {
    reiniciar();
  }
});
window.addEventListener("blur", () => {
  esquerda = false;
  direita = false;
});
const relogio = new THREE.Clock();
function passo() {
  const dt = relogio.getDelta();
  if (tela === "jogando") {
    tempoTotal = tempoTotal + dt;
    pontos = pontos + dt * 2;
    let direcao = 0;
    if (direita) {
      direcao = direcao + 1;
    }
    if (esquerda) {
      direcao = direcao - 1;
    }
    nave.position.x = nave.position.x + direcao * 10 * dt;
    if (nave.position.x > 6) {
      nave.position.x = 6;
    }
    if (nave.position.x < -6) {
      nave.position.x = -6;
    }
    nave.rotation.z = nave.rotation.z + (0 - direcao * 0.26 - nave.rotation.z) * 8 * dt;
    if (nave.rotation.z > 0.26) {
      nave.rotation.z = 0.26;
    }
    if (nave.rotation.z < -0.26) {
      nave.rotation.z = -0.26;
    }
    nave.position.y = Math.sin(tempoTotal * 5) * 0.15;
    const tamanhoDaSombra = 1 + nave.position.y;
    sombraDaNave.scale.set(tamanhoDaSombra, 1, tamanhoDaSombra);
    sombraDaNave.position.set(nave.position.x, -1.45, nave.position.z);
    tempoDeMeteoro = tempoDeMeteoro + dt;
    if (tempoDeMeteoro > 0.7) {
      tempoDeMeteoro = 0;
      criarMeteoro();
    }
    lasers.forEach((laser) => {
      laser.atualizar(dt);
    });
    meteoros.forEach((meteoro) => {
      meteoro.atualizar(dt);
    });
    lasers.forEach((laser) => {
      meteoros.forEach((meteoro) => {
        if (!laser.fora && !meteoro.atingido && !meteoro.fora && acertou(laser, meteoro)) {
          laser.fora = true;
          cena.remove(laser.mesh);
          meteoro.acender();
          pontos = pontos + 5;
        }
      });
    });
    meteoros.forEach((meteoro) => {
      if (!meteoro.atingido && !meteoro.fora && bateuNaNave(meteoro)) {
        tela = "fim";
        document.getElementById("aviso").textContent = "Fim de jogo! Aperte Enter ou clique para reiniciar";
        document.getElementById("aviso").style.display = "block";
      }
    });
    lasers = lasers.filter((laser) => !laser.fora);
    meteoros = meteoros.filter((meteoro) => !meteoro.fora);
    document.getElementById("pontos").textContent = Math.floor(pontos);
    contarObjetos();
  }
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

describe('Patrulha Espacial (Clear Code raylib 3D) — 100% blocos do núcleo', () => {
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

  it('o exemplo do núcleo "Patrulha Espacial (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    // Round-trip por JSON dos DOIS lados: chaves `undefined` explícitas do parse
    // fresco (ex.: `else: undefined`) equivalem a chave ausente no embutido.
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(patrulhaEspacialNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Patrulha Espacial' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Patrulha Espacial' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // three.js CRU: o motor à mostra.
    expect(js).toContain("import * as THREE from 'three'")
    // A nave é um GRUPO de caixas que INCLINA ao virar (clamp ±0.26 rad).
    expect(js).toContain('const nave = new THREE.Group();')
    expect(js).toContain(
      'nave.rotation.z = nave.rotation.z + (0 - direcao * 0.26 - nave.rotation.z) * 8 * dt;',
    )
    expect(js).toContain('nave.rotation.z = 0.26;')
    // BOBBING senoidal: o tempo total acumulado por dt entra no seno.
    expect(js).toContain('tempoTotal = tempoTotal + dt;')
    expect(js).toContain('nave.position.y = Math.sin(tempoTotal * 5) * 0.15;')
    // FLASH sem shader: material POR meteoro (compartilhado piscaria todos).
    expect(js).toContain('const material = new THREE.MeshStandardMaterial({ color: cor });')
    expect(js).toContain('this.material.emissive = new THREE.Color(16777215);')
    // MORTE DRAMÁTICA: para de mover + timer de 0,25s antes de sumir.
    expect(js).toContain('this.morte = 0.25;')
    expect(js).toContain('this.morte = this.morte - dt;')
    // SOMBRA FAKE do curso: cilindro achatado seguindo x/z do dono.
    expect(js).toContain('const sombraGeo = new THREE.CylinderGeometry(1, 1, 0.1, 20);')
    expect(js).toContain('sombraDaNave.position.set(nave.position.x, -1.45, nave.position.z);')
    expect(js).toContain(
      'this.sombra.position.set(this.mesh.position.x, -1.45, this.mesh.position.z);',
    )
    // Colisão laser AABB×esfera via clamp por eixo (a matemática à mão).
    expect(js).toContain(
      'Math.max(laser.mesh.position.x - 0.06, Math.min(mx, laser.mesh.position.x + 0.06))',
    )
    expect(js).toContain('dx * dx + dy * dy + dz * dz < meteoro.raio * meteoro.raio')
    // Nave×meteoro por esferas com raio da nave REDUZIDO (perdoador).
    expect(js).toContain('const alcance = meteoro.raio + 0.6;')
    // Spawn por FUNÇÃO chamada pelo laço (nunca newInstance em laço) + culling.
    expect(js).toContain('function criarMeteoro() {')
    expect(js).toContain('if (this.mesh.position.z > 8) {')
    expect(js).toContain('if (this.mesh.position.z < -40) {')
    expect(js).toContain('meteoros = meteoros.filter((meteoro) => !meteoro.fora);')
    // dt REAL com THREE.Clock.
    expect(js).toContain('const relogio = new THREE.Clock();')
    expect(js).toContain('const dt = relogio.getDelta();')
    // Placar + contagem de objetos da cena no HUD em DOM.
    expect(js).toContain('document.getElementById("pontos").textContent = Math.floor(pontos);')
    expect(js).toContain('cena.children.length')
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Patrulha Espacial' })
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
    expect(stateJson).toContain('"sz_t3d_set_scale"')
    // O laço de quadro com THREE.Clock vira o bloco amigável de animação.
    expect(stateJson).toContain('"sz_canvas_anim_loop"')

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
        projectName: 'Patrulha Espacial',
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
