import { describe, expect, it } from 'bun:test'
import 'blockly/blocks'
import * as Blockly from 'blockly/core'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { cssDeclarationsRecord, SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { ensureBlocklyInitialized } from '../../blockly/setup'

/**
 * FIXTURE REAL (ACHATADO): o "JS Game Starter Kit P9" (evolução do P6 — projeto
 * multi-arquivo com ES modules + subsistema ASSÍNCRONO de carregamento). O editor
 * de BLOCOS trabalha sobre um único script.js, então este fixture prova que o
 * MESMO jogo, achatado (classes concatenadas, sem import/export), vira 100% blocos
 * do NÚCLEO: 0 rawJS/rawCSS/rawHTML, fixpoint textual + de blocos. Construtos novos:
 * método async + await + new Promise((resolve) => {…}) + Promise.all([…]) +
 * setTimeout(fn, ms), .onclick = () => {…}, querySelectorAll().forEach(…),
 * comentários HTML (<!-- -->) e CSS (/* *\/). Normalização única no CSS: a
 * propriedade image-rendering duplicada (pixelated + crisp-edges) vira só pixelated.
 */

const SCRIPT_JS = `const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const GRID_SIZE = 40;

class ImageManager {
    constructor(){
        this.images = {};
    }

    load(name, path){
        return new Promise((resolve) => {
            const img = new Image();
            img.src = path;
    
            this.images[name] = { img, loaded:false };
    
            img.onload = () => {
                this.images[name].loaded = true;
                //console.log(\`Image loaded: \${name}\`);
                resolve();
            };
    
            img.onerror = () => {
                console.log(\`Image failed: \${name} (will use fallback)\`);
                resolve();
            }
        })
    }

    get(name){
        return this.images[name]?.loaded ? this.images[name].img : null;
    }

    async loadAll(){
        await Promise.all([
            this.load('player', './images/player.png')
        ]);
        // Testing - simulate slow loading
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

class Player {
    constructor(){
        this.width = 64;
        this.height = 64;

        this.x = (GAME_WIDTH - this.width) / 2;
        this.y = (GAME_HEIGHT - this.height) / 2;

        this.speed = 300;

        // Multipliers (for upgrades)
        this.speedMultiplier = 1;
    }
    reset(){
        this.x = (GAME_WIDTH - this.width) / 2;
        this.y = (GAME_HEIGHT - this.height) / 2;
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
        this.ctx.strokeStyle = "rgba(255,255,255,0.2)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let i = 0; i < GAME_WIDTH; i += GRID_SIZE){
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, GAME_HEIGHT);
        }
        for (let i = 0; i < GAME_HEIGHT; i += GRID_SIZE){
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(GAME_WIDTH, i);
        }
        this.ctx.stroke();
    }
}

class Game {
    constructor(){
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        this.imageManager = new ImageManager();

        this.renderSystem = new RenderSystem(this.canvas, this.imageManager);
        this.player = new Player();
        this.keys = {};
        this.lastTime = 0;
        this.state = "menu";
 
        this.init();
    }
    async init(){
        await Promise.all([
            this.imageManager.loadAll()
        ]);

        document.getElementById('loadingScreen').classList.remove('active');
        document.getElementById('mainMenu').classList.add('active');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.setupInput();
        this.setupUI();

        // start game loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    gameLoop(timestamp){
        if (this.lastTime === 0){
            this.lastTime = timestamp;
        }
        const dt = Math.min((timestamp - this.lastTime)/1000, 0.1);
        //console.log(dt);
        this.lastTime = timestamp;
        this.update(dt);
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    update(dt){
        if (this.state !== "playing") return;

        this.player.update(dt, this.keys);
    }
    render(){
        if (this.state === "menu"){
            this.ctx.fillStyle = "#0f3460";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.renderSystem.render(this.player);
        }
    }
    setupInput(){
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Esc toggles pause
            if (e.key === 'Escape'){
                if (this.state === 'playing'){
                    this.pause();
                } else if (this.state === 'paused'){
                    this.resume();
                }
            }
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
    setupUI(){
        document.getElementById("playBtn").onclick = () => this.startGame();
        document.getElementById("resumeBtn").onclick = () => this.resume();
        document.getElementById("quitBtn").onclick = () => this.returnToMenu();
    }
    hideAllPanels(){
        document.querySelectorAll(".ui-panel").forEach(p => p.classList.remove("active"));
    }
    startGame(){
        this.state = "playing";
        this.hideAllPanels();

        this.player.reset();

        this.lastTime = performance.now();
    }
    pause(){
        this.state = "paused";
        document.getElementById('pauseMenu').classList.add('active');
    }
    resume(){
        this.state = "playing";
        document.getElementById('pauseMenu').classList.remove('active');
    }
    returnToMenu(){
        this.state = "menu";
        this.hideAllPanels();
        document.getElementById('mainMenu').classList.add('active');
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


const game = new Game();`

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

        <!-- Main Menu -->
         <div id="mainMenu" class="ui-panel">
            <h1>Game Starter Kit</h1>
            <button id="playBtn">Play</button>
            <div style="margin-top: 20px; font-size: 12px;">
                <div>WASD - Move</div>
                <div>ESC - Pause</div>
            </div>
        </div>
        <!-- Pause Menu -->
        <div id="pauseMenu" class="ui-panel">
            <h2>PAUSED</h2>
            <button id="resumeBtn">RESUME</button>
            <button id="quitBtn">QUIT TO MENU</button>
        </div>
        <!-- Loading Screen -->
         <div id="loadingScreen" class="ui-panel active">
            <h2>Loading...</h2>
            <p>Sharpening the pixels...</p>
         </div>

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
}

/* UI Panels */
.ui-panel {
    position: absolute;
    background: rgba(0,0,0,0.1);
    backdrop-filter: blur(10px);
    border: 3px solid #4a9eff;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    box-shadow: 0 0 30px rgba(74,158,255,0.3);
    z-index: 1000;
    display: none;
}
#loadingScreen {
    padding: 50px;
}
.ui-panel.active {
    display: block;
}
.ui-panel h1 {
    color: #4a9eff;
    margin-bottom: 20px;
    font-size: 40px;
    text-shadow: 0 0 20px rgba(74,157,255,0.5);
}
.ui-panel h2 {
    color: #4a9eff;
    margin-bottom: 20px;
    font-size: 35px;
    text-shadow: 0 0 20px rgba(74,157,255,0.5);
}

/* Buttons */
button {
    background: #3a7ed8;
    color: white;
    border: 2px solid #4a9eff;
    padding: 12px 24px;
    margin: 8px;
    font-size: 16px;
    cursor: pointer;
    font-family: 'Courier New', monospace;
    border-radius: 8px;
    transition: all 0.3s;
    box-shadow: 0 0 15px rgba(74,157,255,0.2);
}

button:hover {
    background: #4a9eff;
    box-shadow: 0 0 25px rgba(74,157,255,0.5);
    transform: translateY(-2px);
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
 * tolerando só a reordenação dentro da regra que os blocos de CSS dedicados
 * (flex/justify/align…) introduzem ("forward-only", mesma renderização).
 */
function cssDeclMap(cssText: string): Record<string, Record<string, string>> {
  const { ir } = parseProjectFilesWithDiagnostics({ ...GAME_FILES, 'style.css': cssText })
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

describe('JS Game Starter Kit P9 (achatado) — 100% blocos do núcleo', () => {
  it('parseia com 0 rawJS/rawCSS/rawHTML e a IR é válida no schema', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    // Sem blocos de extensão (Jogo 2D/3D).
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
    // Os construtos assíncronos/DOM novos aparecem de fato.
    for (const t of [
      'newPromise',
      'promiseAll',
      'awaitStmt',
      'setTimeoutCall',
      'onClickAssign',
      'querySelectorValue',
      'comment',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
  })

  it('fixpoint TEXTUAL: gen(parse(src)) é estável e mantém os construtos', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'P9' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'P9' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const jsOut = files1['script.js']
    expect(jsOut).toContain('async init()')
    expect(jsOut).toContain('await Promise.all(')
    expect(jsOut).toContain('return new Promise((resolve) => {')
    expect(jsOut).toContain('setTimeout(resolve, 2000)')
    expect(jsOut).toContain('.onclick = (event) => {')
    expect(jsOut).toContain('.forEach((p) => {')
    expect(files1['index.html']).toContain('<!-- Main Menu -->')
    expect(files1['style.css']).toContain('/* UI Panels */')
  })

  it('IR→blocos: 0 blocos avançados e round-trip por BLOCOS regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'P9' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('sz_adv_raw_js')
    expect(stateJson).not.toContain('sz_adv_raw_css')
    expect(stateJson).not.toContain('sz_adv_raw_html')
    for (const t of [
      'sz_val_new_promise',
      'sz_val_promise_all',
      'sz_js_await',
      'sz_js_set_timeout_call',
      'sz_js_element_onclick',
      'sz_val_query_select',
      'sz_html_comment',
      'sz_css_comment',
    ]) {
      expect(stateJson).toContain(t)
    }
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const filesFromBlocks = generateProjectFiles({
        ir: { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell },
        projectName: 'P9',
      })
      // JS (a lógica do jogo) e HTML voltam BYTE-EXATOS.
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
      expect(filesFromBlocks['index.html']).toBe(files1['index.html'])
      // CSS: os blocos de flex (justify/align) reordenam as declarações dentro da
      // regra (normalização "forward-only", lossless) — comparamos o mapa
      // seletor→declarações para provar que NADA se perde nem muda de valor.
      expect(cssDeclMap(filesFromBlocks['style.css'])).toEqual(cssDeclMap(files1['style.css']))
    } finally {
      ws.dispose()
    }
  })
})
