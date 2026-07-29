import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { valeEnsolaradoNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: a plataforma de coleta do sunnyland-platformer (Downloads/
 * Games 2D/sunnyland-platformer) recriada FIEL "na mão" — 100% blocos do
 * NÚCLEO, SEM extensão. Ensina, igual ao curso: gravidade, colisão de caixa
 * (AABB) resolvida SEPARADAMENTE em x e em y (empurra pelo eixo do movimento),
 * a plataforma de UMA via (só segura o herói vindo CAINDO de cima), gemas e
 * corações para coletar, um GAMBÁ que patrulha e vira ao andar uma distância
 * (como o Oposum) e uma ÁGUIA que voa em vaivém sem gravidade (como o Eagle),
 * pular EM CIMA do inimigo para derrotá-lo (o herói quica) e a câmera que segue
 * o herói com `save` + `scale` + `translate`. A fidelidade é da MECÂNICA, não
 * do pixel: herói, inimigos, gemas e blocos são retângulos e círculos
 * (asset-free) e os construtores usam parâmetros simples (o parser recusa
 * `constructor({...})` desestruturado). O objetivo é pegar todas as gemas sem
 * perder os corações. O laço usa passo fixo por quadro. A prova é a mesma dos
 * outros fixtures: 0 raw + fixpoint textual + round-trip por blocos + a IR
 * embutida na vitrine bate com a que o parser gera.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 960;
canvas.height = 540;
ctx.font = '20px sans-serif';

const scale = 3;
const viewWidth = 320;
const viewHeight = 180;
const worldWidth = 720;
const worldHeight = 360;
const gravity = 0.5;

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Block {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  draw() {
    ctx.fillStyle = '#4a6b3a';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Platform {
  constructor(x, y, width) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = 4;
  }
  draw() {
    ctx.fillStyle = '#b08a4a';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Gem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 12;
    this.height = 12;
    this.taken = false;
  }
  draw() {
    ctx.fillStyle = '#43c5e0';
    ctx.beginPath();
    ctx.arc(this.x + 6, this.y + 6, 7, 0, 6.28);
    ctx.fill();
  }
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 18;
    this.height = 22;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.invincible = 0;
  }
  draw() {
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    ctx.fillStyle = '#e0a84a';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(this.x + 4, this.y + 5, 3, 3);
    ctx.fillRect(this.x + 11, this.y + 5, 3, 3);
    ctx.globalAlpha = 1;
  }
  moveX(blocks) {
    this.x = this.x + this.vx;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (overlap(this.x, this.y, this.width, this.height, b.x, b.y, b.width, b.height)) {
        if (this.vx > 0) {
          this.x = b.x - this.width - 0.01;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.x = b.x + b.width + 0.01;
          this.vx = 0;
        }
      }
    }
  }
  moveY(blocks, platforms) {
    this.vy = this.vy + gravity;
    this.y = this.y + this.vy;
    this.onGround = false;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (overlap(this.x, this.y, this.width, this.height, b.x, b.y, b.width, b.height)) {
        if (this.vy > 0) {
          this.y = b.y - this.height - 0.01;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = b.y + b.height + 0.01;
          this.vy = 0;
        }
      }
    }
    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      const feet = this.y + this.height;
      const prevFeet = feet - this.vy;
      if (this.vy > 0 && prevFeet <= p.y && feet >= p.y && this.x + this.width > p.x && this.x < p.x + p.width) {
        this.y = p.y - this.height - 0.01;
        this.vy = 0;
        this.onGround = true;
      }
    }
  }
}

class Gamba {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 22;
    this.height = 16;
    this.vx = 0 - 0.8;
    this.walked = 0;
    this.range = 80;
  }
  update() {
    this.walked = this.walked + Math.abs(this.vx);
    if (this.walked > this.range) {
      this.vx = 0 - this.vx;
      this.walked = 0;
    }
    this.x = this.x + this.vx;
  }
  draw() {
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(this.x + 4, this.y + 4, 3, 3);
    ctx.fillRect(this.x + 15, this.y + 4, 3, 3);
  }
}

class Aguia {
  constructor(x, y) {
    this.startX = x;
    this.y = y;
    this.x = x;
    this.width = 24;
    this.height = 18;
    this.angle = 0;
    this.span = 90;
  }
  update() {
    this.angle = this.angle + 0.03;
    this.x = this.startX + Math.sin(this.angle) * this.span;
  }
  draw() {
    ctx.fillStyle = '#7a6a9a';
    ctx.beginPath();
    ctx.arc(this.x + 12, this.y + 9, 11, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = '#241a34';
    ctx.fillRect(this.x + 6, this.y + 5, 3, 3);
    ctx.fillRect(this.x + 15, this.y + 5, 3, 3);
  }
}

const blocks = [];
blocks.push(new Block(0, 336, 720, 24));
blocks.push(new Block(0, 0, 16, 360));
blocks.push(new Block(704, 0, 16, 360));
blocks.push(new Block(300, 260, 90, 24));

const platforms = [];
platforms.push(new Platform(120, 270, 90));
platforms.push(new Platform(430, 220, 90));
platforms.push(new Platform(560, 150, 100));

const gems = [];
gems.push(new Gem(150, 244));
gems.push(new Gem(330, 232));
gems.push(new Gem(470, 194));
gems.push(new Gem(600, 124));
gems.push(new Gem(660, 300));

const gambas = [];
gambas.push(new Gamba(240, 320));
gambas.push(new Gamba(520, 320));

const aguias = [];
aguias.push(new Aguia(420, 90));

const player = new Player(60, 300);
const keys = { a: false, d: false };
const camera = { x: 0, y: 0 };
let hearts = 3;
let score = 0;
let state = 'jogando';

function updateCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  if (camera.x < 0) {
    camera.x = 0;
  }
  if (camera.x > worldWidth - viewWidth) {
    camera.x = worldWidth - viewWidth;
  }
  if (camera.y < 0) {
    camera.y = 0;
  }
  if (camera.y > worldHeight - viewHeight) {
    camera.y = worldHeight - viewHeight;
  }
}

function hurt() {
  if (player.invincible <= 0) {
    hearts = hearts - 1;
    player.invincible = 90;
    if (hearts <= 0) {
      hearts = 0;
      state = 'fim';
    }
  }
}

function restart() {
  for (let i = 0; i < gems.length; i++) {
    gems[i].taken = false;
  }
  player.x = 60;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.invincible = 0;
  hearts = 3;
  score = 0;
  state = 'jogando';
}

let lastTime = 0;
function animate(timeStamp) {
  requestAnimationFrame(animate);
  let dt = timeStamp - lastTime;
  lastTime = timeStamp;
  if (dt > 50) {
    dt = 50;
  }

  ctx.fillStyle = '#8fd7e6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'jogando') {
    player.vx = 0;
    if (keys.d) {
      player.vx = 2.2;
    }
    if (keys.a) {
      player.vx = 0 - 2.2;
    }
    player.moveX(blocks);
    player.moveY(blocks, platforms);
    if (player.invincible > 0) {
      player.invincible = player.invincible - 1;
    }

    for (let i = 0; i < gambas.length; i++) {
      const g = gambas[i];
      g.update();
      if (overlap(player.x, player.y, player.width, player.height, g.x, g.y, g.width, g.height)) {
        if (player.vy > 0 && player.y + player.height - player.vy <= g.y + 6) {
          player.vy = 0 - 8;
          g.x = 0 - 999;
        } else {
          hurt();
        }
      }
    }

    for (let i = 0; i < aguias.length; i++) {
      const a = aguias[i];
      a.update();
      if (overlap(player.x, player.y, player.width, player.height, a.x, a.y, a.width, a.height)) {
        if (player.vy > 0 && player.y + player.height - player.vy <= a.y + 6) {
          player.vy = 0 - 8;
          a.y = 0 - 999;
        } else {
          hurt();
        }
      }
    }

    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i];
      if (!gem.taken && overlap(player.x, player.y, player.width, player.height, gem.x, gem.y, gem.width, gem.height)) {
        gem.taken = true;
        score = score + 1;
        if (score >= gems.length) {
          state = 'vitoria';
        }
      }
    }
  }
  updateCamera();

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(0 - camera.x, 0 - camera.y);
  for (let i = 0; i < blocks.length; i++) {
    blocks[i].draw();
  }
  for (let i = 0; i < platforms.length; i++) {
    platforms[i].draw();
  }
  for (let i = 0; i < gems.length; i++) {
    if (!gems[i].taken) {
      gems[i].draw();
    }
  }
  for (let i = 0; i < gambas.length; i++) {
    gambas[i].draw();
  }
  for (let i = 0; i < aguias.length; i++) {
    aguias[i].draw();
  }
  player.draw();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Gemas: ' + score, 20, 32);
  ctx.fillText('Vida: ' + hearts, 20, 60);

  if (state === 'fim') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Fim de jogo', canvas.width / 2, canvas.height / 2 - 14);
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
    ctx.fillText('Você pegou todas as gemas!', canvas.width / 2, canvas.height / 2 - 14);
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
  if (event.key === 'w' && player.onGround && state === 'jogando') {
    player.vy = 0 - 9;
    player.onGround = false;
  }
  if (event.key === 'Enter' && state !== 'jogando') {
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
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vale Ensolarado</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #123018;
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

describe('parsers — vale ensolarado "na mão" (plataforma de coleta, núcleo)', () => {
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
    // a mecânica de ensino aparece: classes, função de colisão AABB (overlap),
    // laços, gravidade/plataforma no "se", laço de quadro e Canvas DEDICADO (a
    // câmera é save+scale+translate; herói, gemas, gambá e águia são formas).
    for (const t of [
      'classDecl',
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasBeginPath',
      'newInstance',
      'setThisProp',
      'arrayPush',
      'event',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(valeEnsolaradoNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Vale Ensolarado' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Vale Ensolarado' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: a física AABB fiel, a plataforma one-way, o gambá que vira, a
    // águia em vaivém e a câmera sobrevivem à ida e volta
    expect(files1['script.js']).toContain('this.vy = this.vy + gravity')
    expect(files1['script.js']).toContain('const prevFeet = feet - this.vy;')
    expect(files1['script.js']).toContain('this.vx = 0 - this.vx;')
    expect(files1['script.js']).toContain(
      'this.x = this.startX + Math.sin(this.angle) * this.span;',
    )
    expect(files1['script.js']).toContain('ctx.scale(scale, scale)')
    expect(files1['script.js']).toContain('ctx.translate(0 - camera.x, 0 - camera.y)')
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
    expect(files1['script.js']).toContain('dt = 50;')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Vale Ensolarado' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Vale Ensolarado',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
