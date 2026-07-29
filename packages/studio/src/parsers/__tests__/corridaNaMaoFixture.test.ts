import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { corridaInfinitaNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: a Corrida Infinita 3D do curso Clear Code recriada FIEL "na
 * mão" em three.js CRU (Canvas 3D do núcleo, sem extensão) — cena/câmera
 * atrás e acima do herói/renderer/luz + NÉVOA que esconde o nascimento dos
 * objetos ao longe, herói de caixas em 3 pistas (setas trocam de pista, espaço
 * pula com gravidade + impulso, sem pulo duplo), CHÃO INFINITO ENCADEADO (2
 * segmentos em esteira que se reposicionam ao passar da câmera), obstáculos em
 * POOL MANUAL (criados uma vez e RECICLADOS, nunca criar/destruir em loop),
 * colisão CAIXA×ESFERA literal do curso (meias-dimensões da caixa × esfera de
 * raio REDUZIDO, perdoadora), placar por tempo de sobrevivência num HUD em
 * DOM, velocidade que cresce com o tempo e fim de jogo com Enter ou clique.
 * O contrato: o jogo INTEIRO vira blocos do NÚCLEO (0 rawJS/rawCSS/rawHTML) e
 * o round-trip é um FIXPOINT estável, textual e de blocos.
 */

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Corrida Infinita</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="palco" width="960" height="600"></canvas>
    <div id="painel">Tempo: <span id="tempo">0</span> Objetos na cena: <span id="objetos">0</span></div>
    <div id="aviso">Fim de jogo! Aperte Enter ou clique para reiniciar</div>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = [
  'body { margin: 0; overflow: hidden; background: #0b1026; color: white; font-family: sans-serif; }',
  '#palco { display: block; width: 100%; height: 100vh; }',
  '#painel { position: absolute; top: 16px; left: 16px; font-size: 20px; }',
  '#aviso { position: absolute; top: 40%; width: 100%; text-align: center; font-size: 28px; display: none; }',
].join('\n')

const SCRIPT_JS = `import * as THREE from 'three';
const canvas = document.getElementById("palco");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, preserveDrawingBuffer: true });
renderer.setSize(960, 600);
const cena = new THREE.Scene();
cena.background = new THREE.Color("#0b1026");
cena.fog = new THREE.Fog("#0b1026", 25, 80);
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 200);
camera.position.set(0, 4, 9);
camera.lookAt(0, 1, -12);
const sol = new THREE.DirectionalLight(16777215, 1.4);
sol.position.set(6, 10, 4);
cena.add(sol);
const ambiente = new THREE.AmbientLight(16777215, 0.5);
cena.add(ambiente);
const chaoGeo = new THREE.BoxGeometry(8, 1, 60);
const chaoMat1 = new THREE.MeshStandardMaterial({ color: 2372685 });
const chao1 = new THREE.Mesh(chaoGeo, chaoMat1);
chao1.position.set(0, -0.5, -20);
cena.add(chao1);
const chaoMat2 = new THREE.MeshStandardMaterial({ color: 3031392 });
const chao2 = new THREE.Mesh(chaoGeo, chaoMat2);
chao2.position.set(0, -0.5, -80);
cena.add(chao2);
const heroi = new THREE.Group();
const corpoGeo = new THREE.BoxGeometry(0.9, 1.1, 0.9);
const corpoMat = new THREE.MeshStandardMaterial({ color: 5025616 });
const corpo = new THREE.Mesh(corpoGeo, corpoMat);
corpo.position.set(0, 0.55, 0);
heroi.add(corpo);
const cabecaGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
const cabecaMat = new THREE.MeshStandardMaterial({ color: 16764330 });
const cabeca = new THREE.Mesh(cabecaGeo, cabecaMat);
cabeca.position.set(0, 1.35, 0);
heroi.add(cabeca);
cena.add(heroi);
const obstaculoGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
const obstaculoMat = new THREE.MeshStandardMaterial({ color: 15741250 });
const obstaculo1 = new THREE.Mesh(obstaculoGeo, obstaculoMat);
const obstaculo2 = new THREE.Mesh(obstaculoGeo, obstaculoMat);
const obstaculo3 = new THREE.Mesh(obstaculoGeo, obstaculoMat);
const obstaculo4 = new THREE.Mesh(obstaculoGeo, obstaculoMat);
const obstaculo5 = new THREE.Mesh(obstaculoGeo, obstaculoMat);
const obstaculo6 = new THREE.Mesh(obstaculoGeo, obstaculoMat);
const obstaculos = [obstaculo1, obstaculo2, obstaculo3, obstaculo4, obstaculo5, obstaculo6];
for (let i = 0; i < obstaculos.length; i++) {
  const obstaculo = obstaculos[i];
  obstaculo.position.set((Math.floor(Math.random() * 3) - 1) * 2, 0.8, -30 - i * 14);
  cena.add(obstaculo);
}
const totalDeObjetos = cena.children.length;
document.getElementById("objetos").textContent = totalDeObjetos;
let pista = 0;
let vy = 0;
let tempo = 0;
let velocidade = 0;
let fimDeJogo = false;
const raioHeroi = 0.6;
function bateu(obstaculo) {
  const px = heroi.position.x;
  const py = heroi.position.y + 0.9;
  const pz = heroi.position.z;
  const cx = Math.max(obstaculo.position.x - 0.8, Math.min(px, obstaculo.position.x + 0.8));
  const cy = Math.max(obstaculo.position.y - 0.8, Math.min(py, obstaculo.position.y + 0.8));
  const cz = Math.max(obstaculo.position.z - 0.8, Math.min(pz, obstaculo.position.z + 0.8));
  const dx = px - cx;
  const dy = py - cy;
  const dz = pz - cz;
  return dx * dx + dy * dy + dz * dz < raioHeroi * raioHeroi;
}
function reiniciar() {
  fimDeJogo = false;
  tempo = 0;
  pista = 0;
  vy = 0;
  heroi.position.set(0, 0, 0);
  for (let i = 0; i < obstaculos.length; i++) {
    const obstaculo = obstaculos[i];
    obstaculo.position.set((Math.floor(Math.random() * 3) - 1) * 2, 0.8, -30 - i * 14);
  }
  document.getElementById("aviso").style.display = "none";
}
document.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft") {
    if (pista > -1) {
      pista = pista - 1;
    }
  }
  if (event.code === "ArrowRight") {
    if (pista < 1) {
      pista = pista + 1;
    }
  }
  if (event.code === "Space") {
    if (heroi.position.y === 0 && !fimDeJogo) {
      vy = 9;
    }
  }
  if (event.code === "Enter" && fimDeJogo) {
    reiniciar();
  }
});
canvas.addEventListener("pointerdown", () => {
  if (fimDeJogo) {
    reiniciar();
  }
});
const relogio = new THREE.Clock();
function passo() {
  const dt = relogio.getDelta();
  if (!fimDeJogo) {
    tempo = tempo + dt;
    velocidade = 12 + tempo * 0.5;
    heroi.position.x = heroi.position.x + (pista * 2 - heroi.position.x) * 12 * dt;
    heroi.position.y = heroi.position.y + vy * dt;
    if (heroi.position.y > 0) {
      vy = vy - 24 * dt;
    } else {
      heroi.position.y = 0;
      vy = 0;
    }
    chao1.position.z = chao1.position.z + velocidade * dt;
    if (chao1.position.z > 40) {
      chao1.position.z = chao1.position.z - 120;
    }
    chao2.position.z = chao2.position.z + velocidade * dt;
    if (chao2.position.z > 40) {
      chao2.position.z = chao2.position.z - 120;
    }
    obstaculos.forEach((obstaculo) => {
      obstaculo.position.z = obstaculo.position.z + velocidade * dt;
      if (obstaculo.position.z > 10) {
        obstaculo.position.z = obstaculo.position.z - 84;
        obstaculo.position.x = (Math.floor(Math.random() * 3) - 1) * 2;
      }
      if (bateu(obstaculo)) {
        fimDeJogo = true;
        document.getElementById("aviso").style.display = "block";
      }
    });
    document.getElementById("tempo").textContent = Math.floor(tempo);
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

describe('Corrida Infinita (Clear Code 3D) — 100% blocos do núcleo', () => {
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

  it('o exemplo do núcleo "Corrida Infinita (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    // Round-trip por JSON dos DOIS lados: chaves `undefined` explícitas do parse
    // fresco (ex.: `else: undefined`) equivalem a chave ausente no embutido.
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(corridaInfinitaNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Corrida Infinita' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Corrida Infinita' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // three.js CRU: o motor à mostra.
    expect(js).toContain("import * as THREE from 'three'")
    // A névoa que esconde o nascimento dos obstáculos ao longe.
    expect(js).toContain('new THREE.Fog')
    // Chão infinito ENCADEADO: 2 segmentos em esteira reposicionados.
    expect(js).toContain('chao1.position.z = chao1.position.z - 120;')
    expect(js).toContain('chao2.position.z = chao2.position.z - 120;')
    // POOL manual: reciclar (nunca criar/destruir em loop).
    expect(js).toContain('obstaculo.position.z = obstaculo.position.z - 84;')
    expect(js).toContain('Math.floor(Math.random() * 3)')
    // Colisão caixa×esfera literal do curso (clamp por meias-dimensões).
    expect(js).toContain(
      'Math.max(obstaculo.position.x - 0.8, Math.min(px, obstaculo.position.x + 0.8))',
    )
    expect(js).toContain('dx * dx + dy * dy + dz * dz < raioHeroi * raioHeroi')
    // Pulo com gravidade + impulso, sem pulo duplo (só no chão).
    expect(js).toContain('vy = vy - 24 * dt;')
    expect(js).toContain('heroi.position.y === 0')
    // Velocidade cresce com o tempo + HUD por DOM.
    expect(js).toContain('velocidade = 12 + tempo * 0.5;')
    expect(js).toContain('document.getElementById("tempo").textContent = Math.floor(tempo);')
    // Toque didático: contar os objetos da cena.
    expect(js).toContain('cena.children.length')
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Corrida Infinita' })
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
        projectName: 'Corrida Infinita',
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
