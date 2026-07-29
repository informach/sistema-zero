import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { sobreviventeNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: o atirador de sobrevivência (Vampire Survivor do Clear Code)
 * recriado FIEL "na mão" — 100% blocos do NÚCLEO, SEM extensão. Ensina o mesmo
 * que o curso: classes (Player/Bullet/Enemy) + pool por lista com filtro de
 * vivos, a câmera que SEGUE o herói com limite (Math.max/Math.min no scroll) via
 * save + scale + translate, inimigos que PERSEGUEM por vetor normalizado
 * (Math.sqrt) e a arma que ATIRA SOZINHA no mais perto (varre por distância e
 * lança na direção). A fidelidade é da MECÂNICA, não do pixel: herói, inimigos e
 * balas são retângulos (asset-free) e os construtores usam parâmetros simples
 * (o parser recusa `constructor({...})` desestruturado). O laço usa passo fixo
 * por quadro. A prova é a dos outros fixtures: 0 raw + fixpoint textual +
 * round-trip por blocos + a IR embutida na vitrine bate com a que o parser gera.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
ctx.font = '20px sans-serif';

const scale = 2;
const viewWidth = 320;
const viewHeight = 240;
const worldWidth = 900;
const worldHeight = 640;

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 22;
    this.height = 22;
    this.vx = 0;
    this.vy = 0;
    this.hearts = 5;
    this.invincible = 0;
    this.cooldown = 0;
  }
  move() {
    this.x = this.x + this.vx;
    this.y = this.y + this.vy;
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.x > worldWidth - this.width) {
      this.x = worldWidth - this.width;
    }
    if (this.y > worldHeight - this.height) {
      this.y = worldHeight - this.height;
    }
  }
  draw() {
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    ctx.fillStyle = '#4f8fea';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#dbe9ff';
    ctx.fillRect(this.x + 4, this.y + 5, 4, 4);
    ctx.globalAlpha = 1;
  }
}

class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dead = false;
  }
  update() {
    this.x = this.x + this.vx;
    this.y = this.y + this.vy;
    if (this.x < 0 || this.y < 0 || this.x > worldWidth || this.y > worldHeight) {
      this.dead = true;
    }
  }
  draw() {
    ctx.fillStyle = '#9cff57';
    ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.speed = 0.9;
    this.health = 2;
  }
  update(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x = this.x + dx / dist * this.speed;
      this.y = this.y + dy / dist * this.speed;
    }
  }
  draw() {
    ctx.fillStyle = '#e05a5a';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#2a0f14';
    ctx.fillRect(this.x + 4, this.y + 5, 3, 3);
    ctx.fillRect(this.x + 13, this.y + 5, 3, 3);
  }
}

const player = new Player(440, 310);
const bullets = [];
const enemies = [];
const keys = { a: false, d: false, w: false, s: false };
const camera = { x: 0, y: 0 };
let pontos = 0;
let spawnTimer = 0;
let tempoTimer = 0;
let state = 'inicio';

function updateCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - viewHeight));
}

function spawnEnemy() {
  let ex = Math.random() * worldWidth;
  let ey = 0;
  if (Math.random() < 0.5) {
    ey = worldHeight - 20;
  }
  if (Math.random() < 0.5) {
    ex = 0;
    ey = Math.random() * worldHeight;
  }
  enemies.push(new Enemy(ex, ey));
}

function hurt() {
  if (player.invincible <= 0) {
    player.hearts = player.hearts - 1;
    player.invincible = 60;
    if (player.hearts <= 0) {
      player.hearts = 0;
      state = 'fim';
    }
  }
}

function restart() {
  player.x = 440;
  player.y = 310;
  player.hearts = 5;
  player.invincible = 0;
  player.cooldown = 0;
  bullets.length = 0;
  enemies.length = 0;
  pontos = 0;
  spawnTimer = 0;
  tempoTimer = 0;
  state = 'jogando';
}

function atira() {
  let alvoX = 0;
  let alvoY = 0;
  let temAlvo = false;
  let menor = 999999;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d = dx * dx + dy * dy;
    if (d < menor) {
      menor = d;
      alvoX = e.x + e.width / 2;
      alvoY = e.y + e.height / 2;
      temAlvo = true;
    }
  }
  if (temAlvo && player.cooldown <= 0) {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const dx = alvoX - cx;
    const dy = alvoY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      bullets.push(new Bullet(cx, cy, dx / dist * 6, dy / dist * 6));
      player.cooldown = 16;
    }
  }
}

function animate(timeStamp) {
  requestAnimationFrame(animate);

  ctx.fillStyle = '#140f24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'jogando') {
    player.vx = 0;
    player.vy = 0;
    if (keys.d) {
      player.vx = 3;
    }
    if (keys.a) {
      player.vx = 0 - 3;
    }
    if (keys.w) {
      player.vy = 0 - 3;
    }
    if (keys.s) {
      player.vy = 3;
    }
    player.move();
    if (player.invincible > 0) {
      player.invincible = player.invincible - 1;
    }
    if (player.cooldown > 0) {
      player.cooldown = player.cooldown - 1;
    }

    spawnTimer = spawnTimer + 1;
    if (spawnTimer > 48) {
      spawnEnemy();
      spawnTimer = 0;
    }
    tempoTimer = tempoTimer + 1;
    if (tempoTimer > 60) {
      pontos = pontos + 1;
      tempoTimer = 0;
    }

    atira();

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      e.update(player.x, player.y);
      if (overlap(player.x, player.y, player.width, player.height, e.x, e.y, e.width, e.height)) {
        hurt();
      }
    }
    for (let i = 0; i < bullets.length; i++) {
      bullets[i].update();
    }
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!b.dead && overlap(b.x - 3, b.y - 3, 6, 6, e.x, e.y, e.width, e.height)) {
          e.health = e.health - 1;
          b.dead = true;
          if (e.health <= 0) {
            pontos = pontos + 3;
          }
        }
      }
    }
    const vivos = [];
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].health > 0) {
        vivos.push(enemies[i]);
      }
    }
    enemies.length = 0;
    for (let i = 0; i < vivos.length; i++) {
      enemies.push(vivos[i]);
    }
    const ativos = [];
    for (let i = 0; i < bullets.length; i++) {
      if (!bullets[i].dead) {
        ativos.push(bullets[i]);
      }
    }
    bullets.length = 0;
    for (let i = 0; i < ativos.length; i++) {
      bullets.push(ativos[i]);
    }
  }
  updateCamera();

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(0 - camera.x, 0 - camera.y);
  ctx.fillStyle = '#241a33';
  ctx.fillRect(0, 0, worldWidth, worldHeight);
  ctx.fillStyle = '#3a2b52';
  ctx.fillRect(4, 4, worldWidth - 8, worldHeight - 8);
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].draw();
  }
  for (let i = 0; i < bullets.length; i++) {
    bullets[i].draw();
  }
  player.draw();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Vida: ' + player.hearts, 20, 32);
  ctx.fillText('Pontos: ' + pontos, 20, 60);

  if (state === 'inicio') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Sobrevivente', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para comecar', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
  if (state === 'fim') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Os monstrinhos te alcancaram!', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para tentar de novo', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
}
animate(0);

window.addEventListener('keydown', (event) => {
  if (event.key === 'a' || event.key === 'ArrowLeft') {
    keys.a = true;
  }
  if (event.key === 'd' || event.key === 'ArrowRight') {
    keys.d = true;
  }
  if (event.key === 'w' || event.key === 'ArrowUp') {
    keys.w = true;
  }
  if (event.key === 's' || event.key === 'ArrowDown') {
    keys.s = true;
  }
  if (event.key === 'Enter' && state !== 'jogando') {
    restart();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a' || event.key === 'ArrowLeft') {
    keys.a = false;
  }
  if (event.key === 'd' || event.key === 'ArrowRight') {
    keys.d = false;
  }
  if (event.key === 'w' || event.key === 'ArrowUp') {
    keys.w = false;
  }
  if (event.key === 's' || event.key === 'ArrowDown') {
    keys.s = false;
  }
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sobrevivente</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #0a0713;
}

canvas {
    display: block;
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

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id' || k === '__declIds') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

describe('parsers — sobrevivente "na mão" (atirador top-down, núcleo)', () => {
  it('parseia os 3 arquivos SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(ir.extensions).toEqual([])
    expect(
      [...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:') || t.startsWith('gk:')),
    ).toBe(false)
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
    for (const t of [
      'classDecl',
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasSave',
      'canvasScale',
      'canvasTranslate',
      'canvasRestore',
      'newInstance',
      'setThisProp',
      'arrayPush',
      'mathBinary',
      'mathUnary',
      'randomFloat',
      'event',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(sobreviventeNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Sobrevivente' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Sobrevivente' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files1['script.js']).toContain('Math.max(0, Math.min(camera.x, worldWidth - viewWidth))')
    expect(files1['script.js']).toContain('ctx.scale(scale, scale)')
    expect(files1['script.js']).toContain('ctx.translate(0 - camera.x, 0 - camera.y)')
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Sobrevivente' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Sobrevivente',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
