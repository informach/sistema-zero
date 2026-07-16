import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRSchema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { defesaDaTorreNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * ⭐ "na mão" — a defesa de torre do Chris Courses (Downloads/Tower Defence/
 * tower-defense) reescrita 100% com blocos do NÚCLEO, sem extensão (é o mesmo
 * gênero do 🏰 Kit Defesa de Torre, mas montado na unha para ENSINAR a lógica).
 * O que ela ensina: caminho por waypoints (o inimigo anda ponto a ponto com
 * `Math.atan2`/`cos`/`sin`), a torre MIRA o inimigo mais próximo no alcance
 * (`Math.hypot`), o tiro PERSEGUE o alvo, dano/moedas/vidas, ondas que crescem, e
 * comprar torre clicando num lugar livre. Asset-free: caminho por linhas,
 * inimigos/torres/tiros por formas. Parâmetros simples, canvas dedicado por ctx.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 384;

const waypoints = [];
waypoints.push({ x: -30, y: 90 });
waypoints.push({ x: 250, y: 90 });
waypoints.push({ x: 250, y: 290 });
waypoints.push({ x: 470, y: 290 });
waypoints.push({ x: 470, y: 150 });
waypoints.push({ x: 690, y: 150 });

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

class Enemy {
  constructor(startX) {
    this.x = startX;
    this.y = 90;
    this.radius = 12;
    this.health = 60;
    this.maxHealth = 60;
    this.speed = 1.4;
    this.waypoint = 1;
    this.done = false;
  }
  update() {
    const target = waypoints[this.waypoint];
    const d = dist(this.x, this.y, target.x, target.y);
    if (d < this.speed) {
      this.x = target.x;
      this.y = target.y;
      if (this.waypoint < waypoints.length - 1) {
        this.waypoint = this.waypoint + 1;
      } else {
        this.done = true;
      }
    } else {
      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      this.x = this.x + Math.cos(angle) * this.speed;
      this.y = this.y + Math.sin(angle) * this.speed;
    }
  }
  draw() {
    ctx.fillStyle = '#e0526a';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.x - 14, this.y - 22, 28, 4);
    ctx.fillStyle = '#5fdd5f';
    ctx.fillRect(this.x - 14, this.y - 22, (28 * this.health) / this.maxHealth, 4);
  }
}

class Shot {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 6;
    this.radius = 4;
    this.dead = false;
  }
  update() {
    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    this.x = this.x + Math.cos(angle) * this.speed;
    this.y = this.y + Math.sin(angle) * this.speed;
    if (dist(this.x, this.y, this.target.x, this.target.y) < this.target.radius + this.radius) {
      this.target.health = this.target.health - 20;
      this.dead = true;
    }
  }
  draw() {
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 6.28);
    ctx.fill();
  }
}

class Tower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.range = 120;
    this.cooldown = 0;
    this.shots = [];
  }
  update() {
    if (this.cooldown > 0) this.cooldown = this.cooldown - 1;
    let target = null;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (dist(this.x, this.y, e.x, e.y) < this.range) {
        target = e;
        break;
      }
    }
    if (target && this.cooldown <= 0) {
      this.shots.push(new Shot(this.x, this.y, target));
      this.cooldown = 40;
    }
    const aliveShots = [];
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      s.update();
      if (!s.dead) {
        aliveShots.push(s);
      }
    }
    this.shots = aliveShots;
  }
  draw() {
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(this.x - 16, this.y - 16, 32, 32);
    for (let i = 0; i < this.shots.length; i++) {
      this.shots[i].draw();
    }
  }
}

const slots = [];
slots.push({ x: 130, y: 200, taken: false });
slots.push({ x: 330, y: 200, taken: false });
slots.push({ x: 380, y: 90, taken: false });
slots.push({ x: 560, y: 240, taken: false });

let enemies = [];
const towers = [];
let coins = 100;
let hearts = 10;
let wave = 3;

function spawnWave(count) {
  for (let i = 0; i < count; i++) {
    enemies.push(new Enemy(-30 - i * 60));
  }
}
spawnWave(wave);

const mouse = { x: 0, y: 0 };

function animate() {
  requestAnimationFrame(animate);
  ctx.fillStyle = '#26331f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#4a4028';
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot.taken) {
      ctx.globalAlpha = 0.15;
      if (dist(mouse.x, mouse.y, slot.x, slot.y) < 22) ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(slot.x - 20, slot.y - 20, 40, 40);
      ctx.globalAlpha = 1;
    }
  }

  const survivors = [];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    e.update();
    e.draw();
    if (e.done) {
      hearts = hearts - 1;
    } else if (e.health <= 0) {
      coins = coins + 25;
    } else {
      survivors.push(e);
    }
  }
  enemies = survivors;

  for (let i = 0; i < towers.length; i++) {
    towers[i].update();
    towers[i].draw();
  }

  if (enemies.length === 0) {
    wave = wave + 2;
    spawnWave(wave);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Moedas: ' + coins, 12, 24);
  ctx.fillText('Vidas: ' + hearts, 12, 46);
}
animate();

canvas.addEventListener('mousemove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

canvas.addEventListener('click', (event) => {
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot.taken && dist(event.clientX, event.clientY, slot.x, slot.y) < 22 && coins >= 50) {
      coins = coins - 50;
      slot.taken = true;
      towers.push(new Tower(slot.x, slot.y));
    }
  }
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Defesa da Torre</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #14140f;
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

describe('parsers — defesa da torre "na mão" (núcleo, sem extensão)', () => {
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
    expect(SZIRSchema.safeParse(ir).success).toBe(true)
    // a lógica de tower defense na unha: classes, mira por distância, o caminho
    // desenhado (moveTo/lineTo/stroke), evento de clique, e nascer inimigo/torre
    for (const t of [
      'classDecl',
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasStroke',
      'event',
      'newExpr',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(defesaDaTorreNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Defesa da Torre' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Defesa da Torre' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: a mira por distância e a perseguição do tiro sobrevivem
    expect(files1['script.js']).toContain('Math.hypot(ax - bx, ay - by)')
    expect(files1['script.js']).toContain(
      'Math.atan2(this.target.y - this.y, this.target.x - this.x)',
    )
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Defesa da Torre' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Defesa da Torre',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
