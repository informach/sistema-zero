import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { dinoNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: o Dino runner do curso Clear Code recriado FIEL "na mão" —
 * classes de verdade (Player/Obstacle/Cloud/Game), laço de animação com TEMPO
 * (timestamp + deltaTime, velocidades por milissegundo), timer de spawn por
 * ACUMULAÇÃO com intervalo sorteado, gravidade + pulo com impulso (sem pulo
 * duplo), colisão por CÍRCULO perdoadora (centros + raios reduzidos), nuvens
 * de fundo mais lentas (parallax), culling por filter, placar por tempo de
 * sobrevivência, dino DESENHADO POR CÓDIGO (2 poses de corrida + pose de pulo)
 * e fim de jogo com Enter para recomeçar. O contrato: o jogo INTEIRO vira
 * blocos do NÚCLEO (0 rawJS/rawCSS/rawHTML, sem extensão) e o round-trip é um
 * FIXPOINT estável, textual e de blocos. Normalizações comportamentalmente
 * idênticas são aceitas no 1º ciclo (e→event, composta expandida, -x → 0 - x).
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 300;
ctx.font = '20px sans-serif';

class Player {
    constructor(game){
        this.game = game;
        this.width = 40;
        this.height = 48;
        this.x = 70;
        this.y = this.game.height - this.height - this.game.groundHeight;
        this.vy = 0;
        this.gravity = 0.0015;
        this.jumpPower = 0.62;
        this.radius = this.height * 0.5 * 0.6;
        this.runTimer = 0;
        this.runInterval = 120;
        this.pose = 0;
    }
    onGround(){
        return this.y >= this.game.height - this.height - this.game.groundHeight;
    }
    update(deltaTime){
        this.y = this.y + this.vy * deltaTime;
        if (this.onGround()){
            this.y = this.game.height - this.height - this.game.groundHeight;
            this.vy = 0;
        } else {
            this.vy = this.vy + this.gravity * deltaTime;
        }
        this.runTimer = this.runTimer + deltaTime;
        if (this.runTimer > this.runInterval){
            this.runTimer = 0;
            this.pose = 1 - this.pose;
        }
    }
    jump(){
        if (this.onGround()){
            this.vy = 0 - this.jumpPower;
        }
    }
    draw(){
        ctx.fillStyle = '#535353';
        ctx.fillRect(this.x, this.y + 12, this.width - 12, this.height - 22);
        ctx.fillRect(this.x + 14, this.y, 24, 20);
        ctx.fillRect(this.x - 8, this.y + 16, 10, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 30, this.y + 5, 5, 5);
        ctx.fillStyle = '#535353';
        if (this.onGround()){
            if (this.pose === 0){
                ctx.fillRect(this.x + 4, this.y + this.height - 12, 7, 12);
                ctx.fillRect(this.x + 18, this.y + this.height - 7, 7, 7);
            } else {
                ctx.fillRect(this.x + 4, this.y + this.height - 7, 7, 7);
                ctx.fillRect(this.x + 18, this.y + this.height - 12, 7, 12);
            }
        } else {
            ctx.fillRect(this.x + 4, this.y + this.height - 9, 7, 7);
            ctx.fillRect(this.x + 18, this.y + this.height - 9, 7, 7);
        }
    }
}

class Obstacle {
    constructor(game){
        this.game = game;
        this.width = 16 + Math.random() * 18;
        this.height = 30 + Math.random() * 26;
        this.x = this.game.width;
        this.y = this.game.height - this.height - this.game.groundHeight;
        this.radius = this.height * 0.5 * 0.6;
        this.markedForDeletion = false;
    }
    update(deltaTime){
        this.x = this.x - this.game.speed * deltaTime;
        if (this.x < 0 - this.width){
            this.markedForDeletion = true;
        }
    }
    draw(){
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(this.x + this.width * 0.5 - 4, this.y, 8, this.height);
        ctx.fillRect(this.x, this.y + 8, this.width, 5);
        ctx.fillRect(this.x, this.y + 2, 5, 11);
        ctx.fillRect(this.x + this.width - 5, this.y + 2, 5, 11);
    }
}

class Cloud {
    constructor(game){
        this.game = game;
        this.width = 66;
        this.height = 30;
        this.x = this.game.width;
        this.y = 30 + Math.random() * 80;
        this.speed = this.game.speed * (0.2 + Math.random() * 0.3);
        this.markedForDeletion = false;
    }
    update(deltaTime){
        this.x = this.x - this.speed * deltaTime;
        if (this.x < 0 - this.width){
            this.markedForDeletion = true;
        }
    }
    draw(){
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + 16, this.y + 14, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 34, this.y + 8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 52, this.y + 14, 13, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Game {
    constructor(canvas){
        this.canvas = canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.groundHeight = 30;
        this.speed = 0.3;
        this.player = new Player(this);
        this.obstacles = [];
        this.clouds = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 1400;
        this.cloudTimer = 0;
        this.cloudInterval = 1000;
        this.score = 0;
        this.gameOver = false;
        document.addEventListener('keydown', e => {
            if (e.key === ' ' || e.key === 'ArrowUp'){
                this.player.jump();
            }
            if (e.key === 'Enter' && this.gameOver){
                this.restart();
            }
        });
    }
    update(deltaTime){
        if (!this.gameOver){
            this.score = this.score + deltaTime;
            this.obstacleTimer = this.obstacleTimer + deltaTime;
            if (this.obstacleTimer > this.obstacleInterval){
                this.obstacleTimer = 0;
                this.obstacles.push(new Obstacle(this));
                this.obstacleInterval = 900 + Math.random() * 1100;
            }
            this.cloudTimer = this.cloudTimer + deltaTime;
            if (this.cloudTimer > this.cloudInterval){
                this.cloudTimer = 0;
                this.clouds.push(new Cloud(this));
                this.cloudInterval = 1500 + Math.random() * 3000;
            }
            this.player.update(deltaTime);
            this.clouds.forEach(cloud => {
                cloud.update(deltaTime);
            });
            this.obstacles.forEach(obstacle => {
                obstacle.update(deltaTime);
                if (this.checkCollision(this.player, obstacle)){
                    this.gameOver = true;
                }
            });
            this.obstacles = this.obstacles.filter(obstacle => !obstacle.markedForDeletion);
            this.clouds = this.clouds.filter(cloud => !cloud.markedForDeletion);
        }
    }
    draw(){
        this.clouds.forEach(cloud => {
            cloud.draw();
        });
        ctx.fillStyle = '#9a8f80';
        ctx.fillRect(0, this.height - this.groundHeight, this.width, this.groundHeight);
        this.obstacles.forEach(obstacle => {
            obstacle.draw();
        });
        this.player.draw();
        ctx.fillStyle = '#535353';
        ctx.fillText('Pontos: ' + Math.floor(this.score * 0.01), 20, 36);
        if (this.gameOver){
            ctx.textAlign = 'center';
            ctx.fillText('Fim de jogo!', this.width * 0.5, this.height * 0.5 - 12);
            ctx.fillText('Aperte Enter para recomeçar', this.width * 0.5, this.height * 0.5 + 20);
            ctx.textAlign = 'left';
        }
    }
    checkCollision(a, b){
        const dx = a.x + a.width * 0.5 - b.x - b.width * 0.5;
        const dy = a.y + a.height * 0.5 - b.y - b.height * 0.5;
        const distance = Math.hypot(dx, dy);
        return distance < a.radius + b.radius;
    }
    restart(){
        this.obstacles = [];
        this.clouds = [];
        this.obstacleTimer = 0;
        this.cloudTimer = 0;
        this.score = 0;
        this.gameOver = false;
        this.player.y = this.height - this.player.height - this.groundHeight;
        this.player.vy = 0;
    }
}

const game = new Game(canvas);

let lastTime = 0;
function animate(timeStamp){
    requestAnimationFrame(animate);
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.update(deltaTime);
    game.draw();
}
animate(0);`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dino Corredor</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #cde9f5;
}
#canvas1 {
    background: #fef9ef;
    border: 4px solid #535353;
    border-radius: 10px;
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

describe('Dino Corredor (Clear Code) — 100% blocos do núcleo', () => {
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

  it('o exemplo do núcleo "Dino Corredor (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    // Round-trip por JSON dos DOIS lados: chaves `undefined` explícitas do parse
    // fresco (ex.: `else: undefined`) equivalem a chave ausente no embutido.
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(dinoNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Dino Corredor' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Dino Corredor' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // As 4 classes do curso preservadas.
    for (const cls of ['class Player', 'class Obstacle', 'class Cloud', 'class Game']) {
      expect(js).toContain(cls)
    }
    // Laço com TEMPO de verdade: timestamp + deltaTime (velocidade por ms × dt).
    expect(js).toContain('const deltaTime = timeStamp - lastTime;')
    expect(js).toContain('lastTime = timeStamp;')
    expect(js).toContain('requestAnimationFrame(animate)')
    // Timer de spawn por ACUMULAÇÃO + intervalo sorteado.
    expect(js).toContain('this.obstacleTimer = this.obstacleTimer + deltaTime;')
    expect(js).toContain('Math.random()')
    // Colisão por círculo perdoadora (centros + raios reduzidos).
    expect(js).toContain('Math.hypot(dx, dy)')
    expect(js).toContain('this.radius = this.height * 0.5 * 0.6;')
    // Sem pulo duplo: o impulso só sai no chão.
    expect(js).toContain('this.onGround()')
    expect(js).toContain('this.vy = 0 - this.jumpPower;')
    // Culling manual por filter (a lista em soquete).
    expect(js).toContain(
      'this.obstacles = this.obstacles.filter((obstacle) => !obstacle.markedForDeletion);',
    )
    expect(js).toContain('this.clouds = this.clouds.filter((cloud) => !cloud.markedForDeletion);')
    // e→event no listener do construtor (normalização aceita).
    expect(js).toContain('event.key')
    expect(js).not.toMatch(/\be\.key\b/)
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Dino Corredor' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')
    // O vocabulário de classes do núcleo aparece de fato.
    expect(stateJson).toContain('"sz_val_new"')
    expect(stateJson).toContain('"sz_val_array_filter"')

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
      // Os blocos não representam a CASCA do documento — o app preserva
      // `htmlShell` do IR vigente em TODO regenerate (ver
      // BlocklyPanel.regenerateFromBlocks). O teste espelha o produto.
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Dino Corredor',
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
