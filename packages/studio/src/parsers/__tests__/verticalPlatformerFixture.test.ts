import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRSchema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { plataformaVerticalNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * ⭐ "na mão" — a plataforma vertical do Chris Courses (Downloads/Platformer/
 * vertical-platformer) reescrita para ser 100% montável com os blocos do NÚCLEO,
 * SEM extensão. É o material de ensino: gravidade, colisão de caixa (AABB)
 * resolvida em x e em y, plataforma de UMA via (só pega vindo de cima) e a câmera
 * que acompanha o herói (save + scale + translate) — tudo na unha.
 *
 * A fidelidade é da MECÂNICA, não do pixel: o herói e os blocos são retângulos
 * (asset-free), e os construtores usam parâmetros simples (o parser recusa
 * `constructor({...})` desestruturado — cai a classe inteira em raw). O contexto
 * do canvas vem por `getElementById(...).getContext('2d')` no nome `ctx`, que é o
 * que faz os blocos de Canvas dedicados aparecerem. A prova é a mesma dos outros
 * fixtures: 0 raw + fixpoint textual + round-trip por blocos.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 1024;
canvas.height = 576;

const scale = 4;
const viewWidth = 256;
const viewHeight = 144;
const worldWidth = 256;
const worldHeight = 316;
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
      if (this.vy > 0 && feet >= p.y && feet <= p.y + p.height + this.vy && this.x + this.width > p.x && this.x < p.x + p.width) {
        this.y = p.y - this.height - 0.01;
        this.vy = 0;
        this.onGround = true;
      }
    }
  }
}

const blocks = [];
blocks.push(new Block(0, 300, 256, 16));
blocks.push(new Block(0, 0, 16, 316));
blocks.push(new Block(240, 0, 16, 316));

const platforms = [];
platforms.push(new Platform(40, 250, 60));
platforms.push(new Platform(150, 200, 60));
platforms.push(new Platform(40, 150, 60));
platforms.push(new Platform(150, 100, 60));
platforms.push(new Platform(40, 50, 60));

const player = new Player(120, 260);
const keys = { a: false, d: false };
const camera = { x: 0, y: 0 };

function updateCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  if (camera.x < 0) camera.x = 0;
  if (camera.x > worldWidth - viewWidth) camera.x = worldWidth - viewWidth;
  if (camera.y > worldHeight - viewHeight) camera.y = worldHeight - viewHeight;
}

function animate() {
  requestAnimationFrame(animate);
  ctx.fillStyle = '#171f2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  player.vx = 0;
  if (keys.d) player.vx = 2;
  if (keys.a) player.vx = -2;
  player.moveX(blocks);
  player.moveY(blocks, platforms);
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
  player.draw();
  ctx.restore();
}
animate();

window.addEventListener('keydown', (event) => {
  if (event.key === 'a') keys.a = true;
  if (event.key === 'd') keys.d = true;
  if (event.key === 'w' && player.onGround) {
    player.vy = -8;
    player.onGround = false;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a') keys.a = false;
  if (event.key === 'd') keys.d = false;
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plataforma Vertical</title>
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

describe('parsers — plataforma vertical "na mão" (núcleo, sem extensão)', () => {
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
    expect(normalize(plataformaVerticalNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Plataforma Vertical' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Plataforma Vertical' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: a física fiel e a câmera sobrevivem à ida e volta
    expect(files1['script.js']).toContain('this.vy = this.vy + gravity')
    expect(files1['script.js']).toContain('ctx.scale(scale, scale)')
    expect(files1['script.js']).toContain('ctx.translate(0 - camera.x, 0 - camera.y)')
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Plataforma Vertical' })
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
        projectName: 'Plataforma Vertical',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
