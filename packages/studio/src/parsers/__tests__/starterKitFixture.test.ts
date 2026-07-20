import { describe, expect, it } from 'bun:test'
import 'blockly/blocks'
import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { cssDeclarationsRecord, SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { ensureBlocklyInitialized } from '../../blockly/setup'

/**
 * FIXTURE REAL (ACHATADO): o "JS Game Starter Kit P6" (projeto multi-arquivo com
 * ES modules — 6 .js em core/entities/managers/systems). O editor de BLOCOS
 * trabalha sobre um único script.js, então este fixture prova que o MESMO jogo,
 * achatado num arquivo (classes concatenadas, sem import/export — comportamento
 * idêntico), vira 100% blocos do NÚCLEO: 0 rawJS/rawCSS/rawHTML, fixpoint textual
 * + de blocos. Construtos exercitados: template literals \`\${}\`, optional
 * chaining ?., img.onerror, requestAnimationFrame((t) => {…}), console.log de
 * qualquer valor, eventos contextmenu/blur. Normalização única no CSS: a
 * propriedade image-rendering duplicada (pixelated + crisp-edges) vira só
 * pixelated (o IR de CSS é um Record; mesma intenção de pixel nítido).
 */

const SCRIPT_JS = `const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const GRID_SIZE = 40;

class ImageManager {
    constructor(){
        this.images = {};
    }

    load(name, path){
        const img = new Image();
        img.src = path;

        this.images[name] = { img, loaded:false };

        img.onload = () => {
            this.images[name].loaded = true;
            console.log(\`Image loaded: \${name}\`);
        };

        img.onerror = () => {
            console.log(\`Image failes: \${name} (will use fallback)\`);
        }
    }

    get(name){
        return this.images[name]?.loaded ? this.images[name].img : null;
    }

    loadAll(){
        this.load('player', './images/player.png');
    }
}

class Player {
    constructor(){
        this.width = 128;
        this.height = 128;

        this.x = (GAME_WIDTH - this.width) / 2;
        this.y = (GAME_HEIGHT - this.height) / 2;

        this.speed = 300;

        // Multipliers (for upgrades)
        this.speedMultiplier = 1;
    }
    update(dt, keys){
        let dx = 0, dy = 0;

        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        // Normalize diagonal movement
        if (dx || dy){
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;

            this.x += dx * this.speed * this.speedMultiplier * dt;
            this.y += dy * this.speed * this.speedMultiplier * dt;
        }
        // Keep player in bounds
        this.x = Math.max(0, Math.min(GAME_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(GAME_HEIGHT - this.height, this.y));

    }
}

class RenderSystem {
    constructor(canvas, imageManager){
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.imageManager = imageManager;
    }
    render(player){
        // Background
        this.ctx.fillStyle = "#0f3460";
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        this.renderGrid();
        this.renderPlayer(player);
    }
    renderPlayer(player){
        const playerImage = this.imageManager.get('player');

        if (playerImage){
            this.ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
        } else {
            // fallback
            this.ctx.fillStyle = "#1a1a2e";
            this.ctx.fillRect(player.x, player.y, player.width, player.height);
            this.ctx.strokeStyle = "white";
            this.ctx.strokeRect(player.x, player.y, player.width, player.height);
        }
    }
    renderGrid(){
        this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
        this.ctx.lineWidth = 6;

        for (let i = 0; i < GAME_WIDTH; i += GRID_SIZE){
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, GAME_HEIGHT);
            this.ctx.stroke();
        }
        for (let i = 0; i < GAME_HEIGHT; i += GRID_SIZE){
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(GAME_WIDTH, i);
            this.ctx.stroke();
        }
    }
}

class Game {
    constructor(){
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        this.imageManager = new ImageManager();
        this.imageManager.loadAll();

        this.renderSystem = new RenderSystem(this.canvas, this.imageManager);
        this.player = new Player();
        this.keys = {};
        this.lastTime;

        this.init();
    }
    init(){
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupInput();

        // start game loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    gameLoop(timestamp){
        const dt = Math.min((timestamp - this.lastTime)/1000, 0.1);
        //console.log(dt);
        this.lastTime = timestamp;
        this.update(dt);
        this.renderSystem.render(this.player);
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    update(dt){
        this.player.update(dt, this.keys);
    }
    setupInput(){
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        // Clear all keys when context menu opens
        window.addEventListener('contextmenu', () => {
            this.keys = {};
        });
        // Clear all keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }
    resizeCanvas(){
        const ratio = 16/9;
        let w, h;
        const margin = 15;

        const availableWidth = window.innerWidth - margin * 2;
        const availableHeight = window.innerHeight - margin * 2;

        if (availableWidth/availableHeight > ratio){
            h = availableHeight;
            w = h * ratio;
        } else {
            w = availableWidth;
            h = w / ratio;
        }

        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;

        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.canvas.style.margin = \`\${margin}px\`;
    }
}


const game = new Game();
console.log(game);

console.log("Game starter kit LOADED!");`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JavaScript Game Starter Kit</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div id="gameContainer">
        <canvas id="gameCanvas"></canvas>
    </div>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #1a1a2e;
    overflow: hidden;
    font-family: 'Courier New', monospace;
    color: #eee;
}

#gameContainer {
    display: flex;
    height: 100vh;
    position: relative;
    justify-content: center;
    align-items: center;
}

#gameCanvas {
    border: 4px solid #2e2e3e;
    image-rendering: pixelated;
    background: #1a1a2e;
}`

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

/**
 * Mapa seletor→declarações (mescladas) de uma folha CSS, INDEPENDENTE de ordem.
 * Prova que o round-trip por blocos não PERDE nem ALTERA nenhuma declaração,
 * tolerando apenas a reordenação dentro da regra que os blocos de CSS dedicados
 * (flex/justify/align…) introduzem ("forward-only", mesma renderização).
 */
function cssDeclMap(css: string): Record<string, Record<string, string>> {
  const { ir } = parseProjectFilesWithDiagnostics({ ...GAME_FILES, 'style.css': css })
  const map: Record<string, Record<string, string>> = {}
  for (const entry of ir.css) {
    if (!('selector' in entry) || !('declarations' in entry)) continue
    map[entry.selector] = {
      ...(map[entry.selector] ?? {}),
      ...cssDeclarationsRecord(entry.declarations),
    }
  }
  return map
}

describe('JS Game Starter Kit P6 (achatado) — 100% blocos do núcleo', () => {
  it('parseia SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(ir.extensions).toEqual([])
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
    for (const expected of ['imageOnError', 'requestFrameDo', 'concat']) {
      expect(types.has(expected)).toBe(true)
    }
  })

  it('round-trip textual é FIXPOINT com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'StarterKit' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'StarterKit' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const jsOut = files1['script.js']
    expect(jsOut).toContain('class RenderSystem')
    expect(jsOut).toContain('.onerror = () => {')
    expect(jsOut).toContain('requestAnimationFrame((t) => {')
    expect(jsOut).toContain('?.loaded')
    expect(jsOut).toContain('event.key')
    // template literal preservado
    expect(jsOut).toMatch(/`Image loaded: \${/)
    expect(files1['index.html']).toContain('id="gameCanvas"')
    expect(files1['style.css']).toContain('image-rendering: pixelated')
  })

  it('IR→blocos: 0 blocos avançados e round-trip por BLOCOS regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'StarterKit' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('sz_adv_raw_js')
    expect(stateJson).not.toContain('sz_adv_raw_css')
    expect(stateJson).not.toContain('sz_adv_raw_html')
    for (const t of [
      'sz_js_image_onerror',
      'sz_canvas_request_frame_do',
      'sz_val_member_get_optional',
      'sz_js_console_log_value',
      'sz_js_on_context_menu',
      'sz_js_on_blur',
    ]) {
      expect(stateJson).toContain(t)
    }
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const filesFromBlocks = generateProjectFiles({
        ir: { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell },
        projectName: 'StarterKit',
      })
      // JS (a lógica do jogo) e HTML voltam BYTE-EXATOS.
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
      expect(filesFromBlocks['index.html']).toBe(files1['index.html'])
      // CSS: `justify-content: center`/`align-items: center` viram blocos
      // dedicados (flex) — normalização "forward-only" documentada que pode
      // REORDENAR as declarações dentro da regra (dedicados antes dos genéricos).
      // É lossless (mesma renderização): provamos que NENHUMA declaração some
      // nem muda de valor comparando o mapa seletor→declarações dos dois lados.
      expect(cssDeclMap(filesFromBlocks['style.css'])).toEqual(cssDeclMap(files1['style.css']))
    } finally {
      ws.dispose()
    }
  })
})
