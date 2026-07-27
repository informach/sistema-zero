import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { escaladaDoGuerreiroNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: a plataforma vertical do Chris Courses (Downloads/Games 2D/
 * vertical-platformer) recriada FIEL "na mão" — 100% blocos do NÚCLEO, SEM
 * extensão. Ensina, igual ao curso: gravidade, colisão de caixa (AABB)
 * resolvida SEPARADAMENTE em x e em y (empurra pelo eixo do movimento), a
 * plataforma de UMA via (só segura o herói quando ele vem CAINDO de cima) e a
 * câmera que ACOMPANHA o herói subindo e descendo com `save` + `scale` +
 * `translate`. A fidelidade é da MECÂNICA, não do pixel: o herói e os blocos
 * são retângulos (asset-free) e os construtores usam parâmetros simples (o
 * parser recusa `constructor({...})` desestruturado). O objetivo é ALCANÇAR o
 * topo (encostar na bandeira) e uma tela de vitória aparece; A/D andam, W pula.
 * O laço usa passo fixo por quadro. A prova é a mesma dos outros fixtures:
 * 0 raw + fixpoint textual + round-trip por blocos + a IR embutida bate.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 1024;
canvas.height = 576;
ctx.font = '18px sans-serif';

const scale = 4;
const viewWidth = 256;
const viewHeight = 144;
const worldWidth = 256;
const worldHeight = 320;
const gravity = 0.4;

class Block {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  draw() {
    ctx.fillStyle = '#3a5a40';
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
    ctx.fillStyle = '#a68a64';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 14;
    this.height = 27;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }
  draw() {
    ctx.fillStyle = '#e07a3f';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(this.x + 3, this.y + 5, 3, 3);
    ctx.fillRect(this.x + 8, this.y + 5, 3, 3);
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

const blocks = [];
blocks.push(new Block(0, 304, 256, 16));
blocks.push(new Block(0, 0, 16, 320));
blocks.push(new Block(240, 0, 16, 320));

const platforms = [];
platforms.push(new Platform(40, 254, 70));
platforms.push(new Platform(150, 208, 70));
platforms.push(new Platform(40, 162, 70));
platforms.push(new Platform(150, 116, 70));
platforms.push(new Platform(40, 70, 70));

const goal = { x: 60, y: 36, width: 30, height: 30 };

const player = new Player(120, 270);
const keys = { a: false, d: false };
const camera = { x: 0, y: 0 };
let won = false;

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

function animate() {
  requestAnimationFrame(animate);
  ctx.fillStyle = '#171f2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!won) {
    player.vx = 0;
    if (keys.d) {
      player.vx = 2;
    }
    if (keys.a) {
      player.vx = -2;
    }
    player.moveX(blocks);
    player.moveY(blocks, platforms);
    if (overlap(player.x, player.y, player.width, player.height, goal.x, goal.y, goal.width, goal.height)) {
      won = true;
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
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
  player.draw();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.fillText('Suba até a bandeira!', 20, 30);
  if (won) {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'center';
    ctx.fillText('Você chegou ao topo!', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  }
}
animate();

window.addEventListener('keydown', (event) => {
  if (event.key === 'a') {
    keys.a = true;
  }
  if (event.key === 'd') {
    keys.d = true;
  }
  if (event.key === 'w' && player.onGround) {
    player.vy = -8;
    player.onGround = false;
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
    <title>Escalada do Guerreiro</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #171f2b;
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

describe('parsers — escalada do guerreiro "na mão" (plataforma vertical, núcleo)', () => {
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
    // câmera é save+scale+translate; o herói e os blocos são fillRect).
    for (const t of [
      'classDecl',
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'newInstance',
      'setThisProp',
      'arrayPush',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(escaladaDoGuerreiroNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Escalada do Guerreiro' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Escalada do Guerreiro' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: a física fiel, a plataforma one-way e a câmera sobrevivem à ida e volta
    expect(files1['script.js']).toContain('this.vy = this.vy + gravity')
    expect(files1['script.js']).toContain('const prevFeet = feet - this.vy;')
    expect(files1['script.js']).toContain('ctx.scale(scale, scale)')
    expect(files1['script.js']).toContain('ctx.translate(0 - camera.x, 0 - camera.y)')
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Escalada do Guerreiro' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Escalada do Guerreiro',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
