import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { heroiQueEvoluiNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: a aventura de espada COM EVOLUÇÃO (o Zelda + Upgrade do Clear
 * Code) recriada FIEL "na mão" — 100% blocos do NÚCLEO, SEM extensão. Reusa a
 * estrutura do "Vila Ninja (na mão)" (tilemap por texto, câmera com limite,
 * classes Player/Monstro, colisão de tile por eixo, ataque de caixa à frente,
 * corações e i-frames) e acrescenta o DIFERENCIAL que nenhum exemplo ensina: cada
 * monstro derrotado dá EXP; ao encher a barra o herói SOBE DE NÍVEL e uma TELA DE
 * MELHORIA (à mão, dirigida por 1/2/3) deixa escolher espada, velocidade ou vida.
 * Chegar ao nível 5 vence. Asset-free, passo fixo. A prova é a dos outros
 * fixtures: 0 raw + fixpoint + round-trip por blocos + a IR embutida bate.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
ctx.font = '20px sans-serif';

const tile = 32;
const scale = 2;
const viewWidth = 320;
const viewHeight = 240;
const mapa = [
  '################',
  '#..............#',
  '#..###....##...#',
  '#..............#',
  '#....##...###..#',
  '#..............#',
  '#..##....#.....#',
  '#........#..##.#',
  '#..###.........#',
  '#..............#',
  '#....##...##...#',
  '################',
];
const worldWidth = mapa[0].length * tile;
const worldHeight = mapa.length * tile;

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

const walls = [];
for (let r = 0; r < mapa.length; r++) {
  const row = mapa[r];
  for (let col = 0; col < row.length; col++) {
    if (row[col] === '#') {
      walls.push({ x: col * tile, y: r * tile, width: tile, height: tile });
    }
  }
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.vx = 0;
    this.vy = 0;
    this.facing = 'baixo';
    this.attacking = 0;
    this.hitDone = false;
    this.invincible = 0;
    this.dano = 1;
    this.velocidade = 2.4;
  }
  moveX() {
    this.x = this.x + this.vx;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (overlap(this.x, this.y, this.width, this.height, w.x, w.y, w.width, w.height)) {
        if (this.vx > 0) {
          this.x = w.x - this.width - 0.01;
        } else if (this.vx < 0) {
          this.x = w.x + w.width + 0.01;
        }
      }
    }
  }
  moveY() {
    this.y = this.y + this.vy;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (overlap(this.x, this.y, this.width, this.height, w.x, w.y, w.width, w.height)) {
        if (this.vy > 0) {
          this.y = w.y - this.height - 0.01;
        } else if (this.vy < 0) {
          this.y = w.y + w.height + 0.01;
        }
      }
    }
  }
  attackBox() {
    if (this.facing === 'direita') {
      return { x: this.x + this.width, y: this.y + 4, width: 18, height: 12 };
    }
    if (this.facing === 'esquerda') {
      return { x: this.x - 18, y: this.y + 4, width: 18, height: 12 };
    }
    if (this.facing === 'cima') {
      return { x: this.x + 4, y: this.y - 18, width: 12, height: 18 };
    }
    return { x: this.x + 4, y: this.y + this.height, width: 12, height: 18 };
  }
  draw() {
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    ctx.fillStyle = '#2f6fbf';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(this.x + 4, this.y + 5, 4, 4);
    ctx.fillRect(this.x + 12, this.y + 5, 4, 4);
    ctx.globalAlpha = 1;
    if (this.attacking > 0) {
      const box = this.attackBox();
      ctx.fillStyle = '#f7d154';
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }
  }
}

class Monstro {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.speed = 0.8;
    this.dir = Math.floor(Math.random() * 4);
    this.timer = 0;
    this.health = 2;
    this.invincible = 0;
  }
  velocity() {
    if (this.dir === 0) {
      return { x: this.speed, y: 0 };
    }
    if (this.dir === 1) {
      return { x: 0 - this.speed, y: 0 };
    }
    if (this.dir === 2) {
      return { x: 0, y: this.speed };
    }
    return { x: 0, y: 0 - this.speed };
  }
  update() {
    this.timer = this.timer + 1;
    if (this.timer > 90) {
      this.dir = Math.floor(Math.random() * 4);
      this.timer = 0;
    }
    if (this.invincible > 0) {
      this.invincible = this.invincible - 1;
    }
    const v = this.velocity();
    this.x = this.x + v.x;
    this.y = this.y + v.y;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (overlap(this.x, this.y, this.width, this.height, w.x, w.y, w.width, w.height)) {
        this.x = this.x - v.x;
        this.y = this.y - v.y;
        this.dir = Math.floor(Math.random() * 4);
        this.timer = 0;
      }
    }
  }
  draw() {
    if (this.invincible > 0 && Math.floor(this.invincible / 3) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    ctx.fillStyle = '#8d55c9';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#201030';
    ctx.fillRect(this.x + 4, this.y + 5, 3, 3);
    ctx.fillRect(this.x + 13, this.y + 5, 3, 3);
    ctx.globalAlpha = 1;
  }
}

const spawnPoints = [
  { x: 200, y: 120 },
  { x: 120, y: 300 },
  { x: 360, y: 260 },
  { x: 300, y: 80 },
  { x: 400, y: 300 },
];
const monstros = [];
const player = new Player(96, 96);
const keys = { a: false, d: false, w: false, s: false };
const camera = { x: 0, y: 0 };
let exp = 0;
let nivel = 1;
let spawnTimer = 0;
let state = 'inicio';

function spawnMonstro() {
  const p = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  monstros.push(new Monstro(p.x, p.y));
}

function updateCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - viewHeight));
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

function subirDeNivel() {
  nivel = nivel + 1;
  exp = 0;
  if (nivel >= 5) {
    state = 'vitoria';
  } else {
    state = 'melhoria';
  }
}

function restart() {
  player.x = 96;
  player.y = 96;
  player.invincible = 0;
  player.dano = 1;
  player.velocidade = 2.4;
  player.hearts = 3;
  monstros.length = 0;
  monstros.push(new Monstro(200, 120));
  exp = 0;
  nivel = 1;
  spawnTimer = 0;
  state = 'jogando';
}

player.hearts = 3;

function animate(timeStamp) {
  requestAnimationFrame(animate);

  ctx.fillStyle = '#16233a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'jogando') {
    player.vx = 0;
    player.vy = 0;
    if (player.attacking <= 0) {
      if (keys.d) {
        player.vx = player.velocidade;
        player.facing = 'direita';
      } else if (keys.a) {
        player.vx = 0 - player.velocidade;
        player.facing = 'esquerda';
      } else if (keys.w) {
        player.vy = 0 - player.velocidade;
        player.facing = 'cima';
      } else if (keys.s) {
        player.vy = player.velocidade;
        player.facing = 'baixo';
      }
    }
    player.moveX();
    player.moveY();
    if (player.attacking > 0) {
      player.attacking = player.attacking - 1;
    }
    if (player.invincible > 0) {
      player.invincible = player.invincible - 1;
    }

    spawnTimer = spawnTimer + 1;
    if (spawnTimer > 150 && monstros.length < 6) {
      spawnMonstro();
      spawnTimer = 0;
    }

    const box = player.attackBox();
    for (let i = 0; i < monstros.length; i++) {
      const m = monstros[i];
      m.update();
      if (player.attacking > 0 && !player.hitDone && m.invincible <= 0 && overlap(box.x, box.y, box.width, box.height, m.x, m.y, m.width, m.height)) {
        m.health = m.health - player.dano;
        m.invincible = 24;
        player.hitDone = true;
        if (m.health <= 0) {
          exp = exp + 1;
          if (exp >= nivel * 3) {
            subirDeNivel();
          }
        }
      }
      if (overlap(player.x, player.y, player.width, player.height, m.x, m.y, m.width, m.height)) {
        hurt();
      }
    }
    const vivos = [];
    for (let i = 0; i < monstros.length; i++) {
      if (monstros[i].health > 0) {
        vivos.push(monstros[i]);
      }
    }
    monstros.length = 0;
    for (let i = 0; i < vivos.length; i++) {
      monstros.push(vivos[i]);
    }
  }
  updateCamera();

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(0 - camera.x, 0 - camera.y);
  for (let r = 0; r < mapa.length; r++) {
    const row = mapa[r];
    for (let col = 0; col < row.length; col++) {
      if (row[col] === '#') {
        ctx.fillStyle = '#3a2f52';
        ctx.fillRect(col * tile, r * tile, tile, tile);
        ctx.fillStyle = '#4a3d68';
        ctx.fillRect(col * tile + 2, r * tile + 2, tile - 4, tile - 4);
      }
    }
  }
  for (let i = 0; i < monstros.length; i++) {
    monstros[i].draw();
  }
  player.draw();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Vida: ' + player.hearts, 20, 32);
  ctx.fillText('Nivel: ' + nivel, 20, 60);
  ctx.fillText('EXP: ' + exp, 20, 88);

  if (state === 'inicio') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Heroi que Evolui', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para comecar', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
  if (state === 'melhoria') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'center';
    ctx.fillText('Subiu para o nivel ' + nivel + '!', canvas.width / 2, canvas.height / 2 - 60);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('1 - Espada mais forte', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('2 - Passos mais rapidos', canvas.width / 2, canvas.height / 2 + 24);
    ctx.fillText('3 - Um coracao a mais', canvas.width / 2, canvas.height / 2 + 58);
    ctx.textAlign = 'left';
  }
  if (state === 'fim') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('O heroi caiu!', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para tentar de novo', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
  if (state === 'vitoria') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'center';
    ctx.fillText('Heroi lendario!', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para jogar de novo', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
}
animate(0);

window.addEventListener('keydown', (event) => {
  if (event.key === 'a') {
    keys.a = true;
  }
  if (event.key === 'd') {
    keys.d = true;
  }
  if (event.key === 'w') {
    keys.w = true;
  }
  if (event.key === 's') {
    keys.s = true;
  }
  if (event.key === ' ' && player.attacking <= 0 && state === 'jogando') {
    player.attacking = 16;
    player.hitDone = false;
  }
  if (state === 'melhoria') {
    if (event.key === '1') {
      player.dano = player.dano + 1;
      state = 'jogando';
    }
    if (event.key === '2') {
      player.velocidade = player.velocidade + 0.5;
      state = 'jogando';
    }
    if (event.key === '3') {
      player.hearts = player.hearts + 1;
      state = 'jogando';
    }
  }
  if (event.key === 'Enter' && (state === 'inicio' || state === 'fim' || state === 'vitoria')) {
    restart();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a') {
    keys.a = false;
  }
  if (event.key === 'd') {
    keys.d = false;
  }
  if (event.key === 'w') {
    keys.w = false;
  }
  if (event.key === 's') {
    keys.s = false;
  }
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Herói que Evolui</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #0b1220;
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

describe('parsers — herói que evolui "na mão" (Zelda + upgrade, núcleo)', () => {
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
    expect(normalize(heroiQueEvoluiNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Heroi que Evolui' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Heroi que Evolui' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files1['script.js']).toContain('Math.max(0, Math.min(camera.x, worldWidth - viewWidth))')
    expect(files1['script.js']).toContain('ctx.scale(scale, scale)')
    expect(files1['script.js']).toContain('if (exp >= nivel * 3) {')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Heroi que Evolui' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Heroi que Evolui',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
