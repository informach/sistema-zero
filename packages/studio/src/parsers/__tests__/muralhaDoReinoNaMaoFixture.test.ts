import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { muralhaDoReinoNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: a defesa de torre do Chris Courses (Downloads/Games 2D/
 * tower-defense) recriada FIEL "na mão" — 100% blocos do NÚCLEO, SEM extensão.
 * O que ela ensina, igual ao curso: o CAMINHO por waypoints (o inimigo anda
 * ponto a ponto virando com `Math.atan2` + `Math.cos`/`Math.sin`), a torre
 * escolhe o inimigo MAIS PRÓXIMO dentro do alcance (`Math.hypot`), o tiro
 * PERSEGUE o alvo com a mesma trigonometria, dano/moedas/vidas, ondas que
 * CRESCEM (+2 a cada limpeza, como o `enemyCount += 2` do curso) e comprar
 * torre clicando num lugar livre (só se tiver 50 moedas). Ganha ao vencer 5
 * ondas; perde quando um inimigo escapa com as vidas zeradas (o `#gameOver`
 * do curso vira uma tela desenhada por código). Asset-free: o caminho é uma
 * linha grossa, inimigos são círculos com barra de vida, torres são quadrados,
 * tiros são bolinhas. O laço usa dt REAL clampado em 50ms (trocar de aba não
 * teleporta). A prova é a mesma dos outros fixtures: 0 raw + fixpoint textual +
 * round-trip por blocos + a IR embutida na vitrine bate com a que o parser gera.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 384;
ctx.font = '20px sans-serif';

const waypoints = [];
waypoints.push({ x: -40, y: 90 });
waypoints.push({ x: 250, y: 90 });
waypoints.push({ x: 250, y: 290 });
waypoints.push({ x: 470, y: 290 });
waypoints.push({ x: 470, y: 150 });
waypoints.push({ x: 690, y: 150 });

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

class Enemy {
  constructor(startX, life) {
    this.x = startX;
    this.y = 90;
    this.radius = 14;
    this.health = life;
    this.maxHealth = life;
    this.speed = 1.4;
    this.waypoint = 1;
    this.escaped = false;
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
        this.escaped = true;
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
    ctx.fillStyle = '#3a1020';
    ctx.fillRect(this.x - 16, this.y - 24, 32, 5);
    ctx.fillStyle = '#5fdd5f';
    ctx.fillRect(this.x - 16, this.y - 24, (32 * this.health) / this.maxHealth, 5);
  }
}

class Shot {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 6;
    this.radius = 5;
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
    this.range = 130;
    this.cooldown = 0;
    this.shots = [];
  }
  update() {
    if (this.cooldown > 0) {
      this.cooldown = this.cooldown - 1;
    }
    let target = null;
    let best = this.range;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    if (target && this.cooldown <= 0) {
      this.shots.push(new Shot(this.x, this.y, target));
      this.cooldown = 35;
    }
    const alive = [];
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      s.update();
      if (!s.dead) {
        alive.push(s);
      }
    }
    this.shots = alive;
  }
  draw() {
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(this.x - 17, this.y - 17, 34, 34);
    ctx.fillStyle = '#2b3a66';
    ctx.fillRect(this.x - 7, this.y - 26, 14, 14);
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
let coins = 150;
let hearts = 10;
let wave = 1;
let waveSize = 3;
let screen = 'jogando';
const mouse = { x: 0, y: 0 };

function spawnWave() {
  const life = 40 + wave * 20;
  for (let i = 0; i < waveSize; i++) {
    enemies.push(new Enemy(-40 - i * 70, life));
  }
}
spawnWave();

function restart() {
  enemies = [];
  towers.length = 0;
  for (let i = 0; i < slots.length; i++) {
    slots[i].taken = false;
  }
  coins = 150;
  hearts = 10;
  wave = 1;
  waveSize = 3;
  screen = 'jogando';
  spawnWave();
}

let lastTime = 0;
function animate(timeStamp) {
  requestAnimationFrame(animate);
  let dt = timeStamp - lastTime;
  lastTime = timeStamp;
  if (dt > 50) {
    dt = 50;
  }

  ctx.fillStyle = '#26331f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#4a4028';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(waypoints[0].x, waypoints[0].y);
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(waypoints[i].x, waypoints[i].y);
  }
  ctx.stroke();

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!slot.taken) {
      ctx.globalAlpha = 0.14;
      if (dist(mouse.x, mouse.y, slot.x, slot.y) < 24) {
        ctx.globalAlpha = 0.4;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(slot.x - 20, slot.y - 20, 40, 40);
      ctx.globalAlpha = 1;
    }
  }

  if (screen === 'jogando') {
    const survivors = [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      e.update();
      e.draw();
      if (e.escaped) {
        hearts = hearts - 1;
        if (hearts <= 0) {
          hearts = 0;
          screen = 'fim';
        }
      } else if (e.health <= 0) {
        coins = coins + 25;
      } else {
        survivors.push(e);
      }
    }
    enemies = survivors;

    for (let i = 0; i < towers.length; i++) {
      towers[i].update();
    }

    if (enemies.length === 0 && screen === 'jogando') {
      if (wave >= 5) {
        screen = 'vitoria';
      } else {
        wave = wave + 1;
        waveSize = waveSize + 2;
        spawnWave();
      }
    }
  }

  for (let i = 0; i < towers.length; i++) {
    towers[i].draw();
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Moedas: ' + coins, 14, 28);
  ctx.fillText('Vidas: ' + hearts, 14, 52);
  ctx.fillText('Onda: ' + wave, 520, 28);

  if (screen === 'fim') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('O reino caiu!', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para tentar de novo', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
  if (screen === 'vitoria') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'center';
    ctx.fillText('O reino está a salvo!', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para jogar de novo', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
}
animate(0);

canvas.addEventListener('pointermove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});

canvas.addEventListener('click', (event) => {
  if (screen === 'jogando') {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot.taken && dist(event.clientX, event.clientY, slot.x, slot.y) < 24 && coins >= 50) {
        coins = coins - 50;
        slot.taken = true;
        towers.push(new Tower(slot.x, slot.y));
      }
    }
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && screen !== 'jogando') {
    restart();
  }
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muralha do Reino</title>
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

describe('parsers — muralha do reino "na mão" (defesa de torre, núcleo)', () => {
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
    expect(normalize(muralhaDoReinoNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Muralha do Reino' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Muralha do Reino' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: a mira por distância, a perseguição do tiro e o dt clampado sobrevivem
    expect(files1['script.js']).toContain('Math.hypot(ax - bx, ay - by)')
    expect(files1['script.js']).toContain(
      'Math.atan2(this.target.y - this.y, this.target.x - this.x)',
    )
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
    expect(files1['script.js']).toContain('dt = 50;')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Muralha do Reino' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Muralha do Reino',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
